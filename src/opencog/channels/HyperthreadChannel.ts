import {EventEmitter} from "events";
import type {AgentMessage} from "../agents/AgenticAtom.js";

/**
 * Channel statistics for monitoring and load balancing
 */
export interface ChannelStatistics {
    messagesTransmitted: number;
    messagesReceived: number;
    averageLatency: number;
    currentLoad: number;
    errorCount: number;
    uptime: number;
}

/**
 * Message routing information
 */
interface MessageRoute {
    destinationId: string;
    priority: number;
    timestamp: number;
    retryCount: number;
}

/**
 * Channel configuration options
 */
export interface ChannelConfig {
    maxQueueSize?: number;
    messageTimeout?: number;
    maxRetries?: number;
    loadBalancingEnabled?: boolean;
    compressionEnabled?: boolean;
    encryptionEnabled?: boolean;
}

/**
 * HyperthreadChannel - A high-performance message multiplexer for inter-agent communication
 * Manages multiple hyperthread channels for parallel processing and load distribution
 */
export class HyperthreadChannel extends EventEmitter {
    private readonly _channelId: string;
    private readonly _config: Required<ChannelConfig>;
    private _isActive: boolean = false;
    private _messageQueue: Map<string, AgentMessage[]> = new Map();
    private _routingTable: Map<string, MessageRoute[]> = new Map();
    private _statistics: ChannelStatistics;
    private _connectedChannels: Map<string, HyperthreadChannel> = new Map();
    private _messageHandlers: Map<string, (message: AgentMessage) => void> = new Map();
    private _latencyMeasurements: number[] = [];
    private _startTime: number;
    private _hyperthreads: Map<string, any> = new Map();

    constructor(channelId: string, config: ChannelConfig = {}) {
        super();
        this._channelId = channelId;
        this._config = {
            maxQueueSize: 1000,
            messageTimeout: 30000, // 30 seconds
            maxRetries: 3,
            loadBalancingEnabled: true,
            compressionEnabled: false,
            encryptionEnabled: false,
            ...config
        };
        
        this._startTime = Date.now();
        this._statistics = {
            messagesTransmitted: 0,
            messagesReceived: 0,
            averageLatency: 0,
            currentLoad: 0,
            errorCount: 0,
            uptime: 0
        };

        this.initializeChannel();
    }

    /**
     * Initialize the channel and start processing
     */
    private initializeChannel(): void {
        this._isActive = true;
        this.startMessageProcessing();
        
        // Set up periodic statistics updates
        setInterval(() => {
            this.updateStatistics();
        }, 1000);
        
        console.log(`HyperthreadChannel ${this._channelId} initialized`);
    }

    /**
     * Get the channel ID
     */
    get id(): string {
        return this._channelId;
    }

    /**
     * Get channel statistics
     */
    get statistics(): ChannelStatistics {
        return { ...this._statistics };
    }

    /**
     * Check if the channel is active
     */
    get isActive(): boolean {
        return this._isActive;
    }

    /**
     * Connect to another channel for direct communication
     */
    connectToChannel(channel: HyperthreadChannel): void {
        this._connectedChannels.set(channel.id, channel);
        channel._connectedChannels.set(this._channelId, this);
        
        console.log(`Channel ${this._channelId} connected to ${channel.id}`);
    }

    /**
     * Disconnect from a channel
     */
    disconnectFromChannel(channelId: string): void {
        const channel = this._connectedChannels.get(channelId);
        if (channel) {
            this._connectedChannels.delete(channelId);
            channel._connectedChannels.delete(this._channelId);
            console.log(`Channel ${this._channelId} disconnected from ${channelId}`);
        }
    }

    /**
     * Register a message handler for incoming messages
     */
    onMessage(handler: (message: AgentMessage) => void): void {
        this.on('message', handler);
    }

    /**
     * Send a message to a specific destination
     */
    async sendMessage(destinationId: string, message: AgentMessage): Promise<boolean> {
        if (!this._isActive) {
            throw new Error(`Channel ${this._channelId} is not active`);
        }

        const startTime = Date.now();
        
        try {
            // Find the best route to the destination
            const route = await this.findOptimalRoute(destinationId, message);
            
            if (!route) {
                console.warn(`No route found to destination ${destinationId}`);
                return false;
            }

            // Queue the message for processing
            await this.queueMessage(route.destinationId, message);
            
            // Update statistics
            this._statistics.messagesTransmitted++;
            this.recordLatency(Date.now() - startTime);
            
            return true;
        } catch (error) {
            this._statistics.errorCount++;
            console.error(`Failed to send message from ${this._channelId} to ${destinationId}:`, error);
            return false;
        }
    }

    /**
     * Broadcast a message to all connected channels
     */
    async broadcastMessage(message: AgentMessage): Promise<number> {
        let successCount = 0;
        
        for (const [channelId, channel] of this._connectedChannels) {
            try {
                const success = await channel.receiveMessage({
                    ...message,
                    sender: this._channelId
                });
                if (success) successCount++;
            } catch (error) {
                console.error(`Failed to broadcast to channel ${channelId}:`, error);
            }
        }
        
        return successCount;
    }

    /**
     * Receive a message from another channel
     */
    async receiveMessage(message: AgentMessage): Promise<boolean> {
        if (!this._isActive) {
            return false;
        }

        try {
            // Check queue capacity
            const destinationQueue = this._messageQueue.get(message.receiver) || [];
            if (destinationQueue.length >= this._config.maxQueueSize) {
                console.warn(`Queue full for receiver ${message.receiver}`);
                return false;
            }

            // Add message to queue
            destinationQueue.push(message);
            this._messageQueue.set(message.receiver, destinationQueue);
            
            // Update statistics
            this._statistics.messagesReceived++;
            
            // Emit message event
            this.emit('message', message);
            
            return true;
        } catch (error) {
            this._statistics.errorCount++;
            console.error(`Failed to receive message:`, error);
            return false;
        }
    }

    /**
     * Find optimal route to destination considering load balancing
     */
    private async findOptimalRoute(destinationId: string, message: AgentMessage): Promise<MessageRoute | null> {
        // Check if destination is directly connected
        if (this._connectedChannels.has(destinationId)) {
            return {
                destinationId,
                priority: this.calculateRoutePriority(destinationId, message),
                timestamp: Date.now(),
                retryCount: 0
            };
        }

        // Find indirect routes through connected channels
        const routes: MessageRoute[] = [];
        
        for (const [channelId, channel] of this._connectedChannels) {
            if (channel._connectedChannels.has(destinationId)) {
                routes.push({
                    destinationId: channelId,
                    priority: this.calculateRoutePriority(channelId, message),
                    timestamp: Date.now(),
                    retryCount: 0
                });
            }
        }

        // Sort routes by priority (lower number = higher priority)
        routes.sort((a, b) => a.priority - b.priority);
        
        return routes.length > 0 ? (routes[0] || null) : null;
    }

    /**
     * Calculate routing priority based on load balancing metrics
     */
    private calculateRoutePriority(channelId: string, message: AgentMessage): number {
        const channel = this._connectedChannels.get(channelId);
        if (!channel) return Infinity;

        let priority = 1;
        
        // Factor in current load
        priority += channel.statistics.currentLoad * 10;
        
        // Factor in queue length
        const queueLength = this._messageQueue.get(message.receiver)?.length || 0;
        priority += queueLength;
        
        // Factor in message urgency (based on type)
        switch (message.type) {
            case 'attention':
                priority -= 5; // Higher priority
                break;
            case 'coordination':
                priority -= 3;
                break;
            case 'reasoning':
                priority -= 1;
                break;
            default:
                // Normal priority
                break;
        }
        
        return priority;
    }

    /**
     * Queue a message for processing
     */
    private async queueMessage(destinationId: string, message: AgentMessage): Promise<void> {
        // Apply compression if enabled
        if (this._config.compressionEnabled) {
            message = await this.compressMessage(message);
        }
        
        // Apply encryption if enabled
        if (this._config.encryptionEnabled) {
            message = await this.encryptMessage(message);
        }
        
        // Route the message
        if (destinationId === this._channelId) {
            // Local delivery
            await this.receiveMessage(message);
        } else {
            // Remote delivery
            const destinationChannel = this._connectedChannels.get(destinationId);
            if (destinationChannel) {
                await destinationChannel.receiveMessage(message);
            }
        }
    }

    /**
     * Start the message processing loop
     */
    private startMessageProcessing(): void {
        const processMessages = async () => {
            if (!this._isActive) return;

            try {
                // Process queued messages
                for (const [receiverId, messages] of this._messageQueue) {
                    if (messages.length > 0) {
                        const message = messages.shift()!;
                        
                        // Check message timeout
                        const messageAge = Date.now() - message.timestamp;
                        if (messageAge > this._config.messageTimeout) {
                            console.warn(`Message timeout for ${message.id}`);
                            continue;
                        }
                        
                        // Deliver message locally if receiver is this channel
                        if (receiverId === this._channelId) {
                            this.emit('message', message);
                        }
                    }
                }
                
                // Update current load
                this.updateCurrentLoad();
                
            } catch (error) {
                console.error(`Error processing messages in channel ${this._channelId}:`, error);
                this._statistics.errorCount++;
            }
            
            // Continue processing
            setTimeout(processMessages, 10); // 10ms processing interval
        };
        
        processMessages();
    }

    /**
     * Update channel statistics
     */
    private updateStatistics(): void {
        this._statistics.uptime = Date.now() - this._startTime;
        
        // Calculate average latency
        if (this._latencyMeasurements.length > 0) {
            const sum = this._latencyMeasurements.reduce((a, b) => a + b, 0);
            this._statistics.averageLatency = sum / this._latencyMeasurements.length;
            
            // Keep only recent measurements
            if (this._latencyMeasurements.length > 100) {
                this._latencyMeasurements = this._latencyMeasurements.slice(-50);
            }
        }
    }

    /**
     * Update current load based on queue sizes and processing
     */
    private updateCurrentLoad(): void {
        let totalQueueSize = 0;
        for (const messages of this._messageQueue.values()) {
            totalQueueSize += messages.length;
        }
        
        this._statistics.currentLoad = Math.min(1.0, totalQueueSize / this._config.maxQueueSize);
    }

    /**
     * Record latency measurement
     */
    private recordLatency(latency: number): void {
        this._latencyMeasurements.push(latency);
    }

    /**
     * Compress message content (placeholder implementation)
     */
    private async compressMessage(message: AgentMessage): Promise<AgentMessage> {
        // Simple compression simulation - in reality would use gzip or similar
        return {
            ...message,
            content: message.content.length > 100 ? 
                `[COMPRESSED:${message.content.length}]${message.content.substring(0, 100)}...` :
                message.content
        };
    }

    /**
     * Encrypt message content (placeholder implementation)
     */
    private async encryptMessage(message: AgentMessage): Promise<AgentMessage> {
        // Simple encryption simulation - in reality would use proper encryption
        return {
            ...message,
            content: `[ENCRYPTED]${Buffer.from(message.content).toString('base64')}`
        };
    }

    /**
     * Get load balancing recommendations
     */
    getLoadBalancingInfo(): {
        currentLoad: number;
        recommendedAction: 'scale_up' | 'scale_down' | 'maintain';
        connectedChannels: number;
        queueUtilization: number;
    } {
        const queueUtilization = this._statistics.currentLoad;
        let recommendedAction: 'scale_up' | 'scale_down' | 'maintain' = 'maintain';
        
        if (queueUtilization > 0.8) {
            recommendedAction = 'scale_up';
        } else if (queueUtilization < 0.2 && this._connectedChannels.size > 1) {
            recommendedAction = 'scale_down';
        }
        
        return {
            currentLoad: this._statistics.currentLoad,
            recommendedAction,
            connectedChannels: this._connectedChannels.size,
            queueUtilization
        };
    }

    /**
     * Dispose of the channel and clean up resources
     */
    async dispose(): Promise<void> {
        this._isActive = false;
        
        // Disconnect from all channels
        for (const channelId of this._connectedChannels.keys()) {
            this.disconnectFromChannel(channelId);
        }
        
        // Clear message queues
        this._messageQueue.clear();
        this._routingTable.clear();
        
        // Clean up hyperthreads
        for (const [threadId, worker] of this._hyperthreads) {
            if (worker && typeof worker.terminate === 'function') {
                worker.terminate();
            }
        }
        this._hyperthreads.clear();
        
        console.log(`HyperthreadChannel ${this._channelId} disposed`);
    }
}