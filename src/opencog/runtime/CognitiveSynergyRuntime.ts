import {EventEmitter} from "events";
import {AtomSpace} from "../atomspace/AtomSpace.js";
import {AgenticAtom, CognitiveCapability, type AgentMessage} from "../agents/AgenticAtom.js";
import {HyperthreadChannel, type ChannelStatistics} from "../channels/HyperthreadChannel.js";
import {Atom, AtomType, TruthValue, AttentionValue, CognitiveSynergyLink} from "../atoms/Atom.js";
import type {LlamaOptions} from "../../index.js";

/**
 * Runtime configuration for the cognitive synergy system
 */
export interface CognitiveSynergyConfig {
    maxAgents?: number;
    loadBalancingEnabled?: boolean;
    distributedProcessingEnabled?: boolean;
    gpuAccelerationEnabled?: boolean;
    networkingEnabled?: boolean;
    persistenceEnabled?: boolean;
    attentionBroadcasting?: boolean;
    cognitiveSynergyThreshold?: number;
}

/**
 * Runtime statistics and metrics
 */
export interface RuntimeStatistics {
    totalAgents: number;
    activeAgents: number;
    totalMessages: number;
    messagesPerSecond: number;
    averageResponseTime: number;
    cognitiveLoad: number;
    synergyScore: number;
    networkNodes: number;
    uptime: number;
}

/**
 * Cognitive synergy event for emergent behaviors
 */
export interface CognitiveSynergyEvent {
    id: string;
    type: 'emergence' | 'convergence' | 'divergence' | 'synchronization';
    participantIds: string[];
    synergyScore: number;
    description: string;
    timestamp: number;
    duration?: number;
}

/**
 * Network node information for distributed runtime
 */
export interface NetworkNode {
    id: string;
    address: string;
    port: number;
    capabilities: CognitiveCapability[];
    load: number;
    latency: number;
    isActive: boolean;
}

/**
 * CognitiveSynergyRuntime - Federated runtime accelerator for distributed cognitive processing
 * Manages the distributed execution of agentic atoms across multiple nodes with GPU acceleration
 */
export class CognitiveSynergyRuntime extends EventEmitter {
    private _atomSpace: AtomSpace;
    private _config: Required<CognitiveSynergyConfig>;
    private _agents: Map<string, AgenticAtom> = new Map();
    private _channels: Map<string, HyperthreadChannel> = new Map();
    private _networkNodes: Map<string, NetworkNode> = new Map();
    private _isActive: boolean = false;
    private _startTime: number = 0;
    private _messageCount: number = 0;
    private _responseTimeSum: number = 0;
    private _synergyEvents: CognitiveSynergyEvent[] = [];
    private _cognitiveLoadHistory: number[] = [];
    private _masterChannel: HyperthreadChannel;

    constructor(atomSpace: AtomSpace, config: CognitiveSynergyConfig = {}) {
        super();
        
        this._atomSpace = atomSpace;
        this._config = {
            maxAgents: 1000,
            loadBalancingEnabled: true,
            distributedProcessingEnabled: true,
            gpuAccelerationEnabled: true,
            networkingEnabled: false,
            persistenceEnabled: false,
            attentionBroadcasting: true,
            cognitiveSynergyThreshold: 0.8,
            ...config
        };

        this._masterChannel = new HyperthreadChannel('master-runtime');
        this.initializeRuntime();
    }

    /**
     * Initialize the cognitive synergy runtime
     */
    private initializeRuntime(): void {
        this._startTime = Date.now();
        this._isActive = true;
        
        // Start monitoring processes
        this.startRuntimeMonitoring();
        
        // Start synergy detection
        this.startSynergyDetection();
        
        // Initialize networking if enabled
        if (this._config.networkingEnabled) {
            this.initializeNetworking();
        }
        
        console.log("CognitiveSynergyRuntime initialized with configuration:", this._config);
    }

    /**
     * Register an agentic atom with the runtime
     */
    async registerAgent(
        agent: AgenticAtom, 
        llamaOptions?: LlamaOptions
    ): Promise<void> {
        if (this._agents.size >= this._config.maxAgents) {
            throw new Error("Maximum agent capacity reached");
        }

        // Initialize the agent's inference engine
        if (!agent.isActive) {
            await agent.initialize(llamaOptions);
        }

        // Set the runtime reference
        agent.setRuntime(this);

        // Register agent and create channel
        this._agents.set(agent.id, agent);
        
        const channel = new HyperthreadChannel(agent.id);
        this._channels.set(agent.id, channel);
        
        // Connect agent channel to master channel
        this._masterChannel.connectToChannel(channel);
        
        // Add agent to atomspace if not already present
        await this._atomSpace.addAtom(agent);
        
        this.emit('agentRegistered', agent);
        console.log(`Agent ${agent.name} registered with runtime`);
    }

    /**
     * Unregister an agentic atom from the runtime
     */
    async unregisterAgent(agentId: string): Promise<boolean> {
        const agent = this._agents.get(agentId);
        if (!agent) {
            return false;
        }

        // Dispose agent resources
        await agent.dispose();
        
        // Clean up channel
        const channel = this._channels.get(agentId);
        if (channel) {
            this._masterChannel.disconnectFromChannel(agentId);
            await channel.dispose();
            this._channels.delete(agentId);
        }
        
        // Remove from collections
        this._agents.delete(agentId);
        
        this.emit('agentUnregistered', agent);
        console.log(`Agent ${agent.name} unregistered from runtime`);
        
        return true;
    }

    /**
     * Orchestrate cognitive processing across multiple agents
     */
    async orchestrateCognition(
        input: string,
        requiredCapabilities: CognitiveCapability[],
        context?: Record<string, any>
    ): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        const startTime = Date.now();

        // Find suitable agents for each capability
        const agentAssignments = this.assignAgentsToCapabilities(requiredCapabilities);
        
        if (agentAssignments.size === 0) {
            throw new Error("No suitable agents found for required capabilities");
        }

        // Execute cognitive processing in parallel
        const processingPromises: Promise<void>[] = [];
        
        for (const [capability, agents] of agentAssignments) {
            const promise = this.executeCapabilityProcessing(
                capability, 
                agents, 
                input, 
                context
            ).then(result => {
                results.set(capability, result);
            });
            
            processingPromises.push(promise);
        }

        // Wait for all processing to complete
        await Promise.all(processingPromises);
        
        // Record performance metrics
        const responseTime = Date.now() - startTime;
        this._responseTimeSum += responseTime;
        this._messageCount++;
        
        // Detect cognitive synergy
        await this.detectCognitiveSynergy(Array.from(agentAssignments.values()).flat());
        
        this.emit('cognitionOrchestrated', {
            input,
            capabilities: requiredCapabilities,
            results: Object.fromEntries(results),
            responseTime
        });

        return results;
    }

    /**
     * Assign agents to cognitive capabilities based on load balancing
     */
    private assignAgentsToCapabilities(
        capabilities: CognitiveCapability[]
    ): Map<CognitiveCapability, AgenticAtom[]> {
        const assignments = new Map<CognitiveCapability, AgenticAtom[]>();
        
        for (const capability of capabilities) {
            const suitableAgents = Array.from(this._agents.values())
                .filter(agent => agent.hasCapability(capability))
                .sort((a, b) => a.cognitiveLoad - b.cognitiveLoad); // Load balancing
            
            if (suitableAgents.length > 0) {
                // Assign multiple agents for redundancy and parallel processing
                const numAgents = Math.min(3, suitableAgents.length);
                assignments.set(capability, suitableAgents.slice(0, numAgents));
            }
        }
        
        return assignments;
    }

    /**
     * Execute cognitive processing for a specific capability
     */
    private async executeCapabilityProcessing(
        capability: CognitiveCapability,
        agents: AgenticAtom[],
        input: string,
        context?: Record<string, any>
    ): Promise<string> {
        // Process with multiple agents in parallel for redundancy
        const processingPromises = agents.map(agent => 
            agent.processCognition(input, capability, context).catch(error => {
                console.error(`Agent ${agent.name} failed processing:`, error);
                return `Error: ${error.message}`;
            })
        );
        
        const results = await Promise.all(processingPromises);
        
        // Combine results or select best one based on confidence
        return this.combineAgentResults(results, capability);
    }

    /**
     * Combine results from multiple agents for the same capability
     */
    private combineAgentResults(
        results: string[], 
        capability: CognitiveCapability
    ): string {
        // Filter out error results
        const validResults = results.filter(result => !result.startsWith('Error:'));
        
        if (validResults.length === 0) {
            return "Processing failed across all agents";
        }
        
        if (validResults.length === 1) {
            return validResults[0] || "";
        }
        
        // For multiple valid results, combine them based on capability type
        switch (capability) {
            case CognitiveCapability.Reasoning:
                return `Combined reasoning:\n${validResults.map((r, i) => `Agent ${i + 1}: ${r}`).join('\n\n')}`;
                
            case CognitiveCapability.Planning:
                return `Synthesized plan:\n${validResults.join('\n\n')}`;
                
            default:
                // Simple concatenation for other capabilities
                return validResults.join('\n\n');
        }
    }

    /**
     * Detect cognitive synergy between agents
     */
    private async detectCognitiveSynergy(participantAgents: AgenticAtom[]): Promise<void> {
        if (participantAgents.length < 2) return;

        // Calculate synergy score based on agent interactions and results
        const synergyScore = this.calculateSynergyScore(participantAgents);
        
        if (synergyScore >= this._config.cognitiveSynergyThreshold) {
            const synergyEvent: CognitiveSynergyEvent = {
                id: `synergy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'emergence',
                participantIds: participantAgents.map(a => a.id),
                synergyScore,
                description: `Cognitive synergy emerged between ${participantAgents.length} agents`,
                timestamp: Date.now()
            };
            
            this._synergyEvents.push(synergyEvent);
            
            // Create cognitive synergy link in atomspace
            await this.createCognitiveSynergyLink(participantAgents, synergyScore);
            
            this.emit('cognitiveSynergy', synergyEvent);
            console.log(`Cognitive synergy detected: score ${synergyScore.toFixed(3)}`);
        }
    }

    /**
     * Calculate synergy score between agents
     */
    private calculateSynergyScore(agents: AgenticAtom[]): number {
        if (agents.length < 2) return 0;

        let totalSynergy = 0;
        let comparisons = 0;

        // Calculate pairwise synergy scores
        for (let i = 0; i < agents.length - 1; i++) {
            for (let j = i + 1; j < agents.length; j++) {
                const agent1 = agents[i];
                const agent2 = agents[j];
                
                if (!agent1 || !agent2) continue;
                
                // Synergy based on complementary capabilities
                const capabilityOverlap = this.calculateCapabilityOverlap(agent1, agent2);
                const loadBalance = 1 - Math.abs(agent1.cognitiveLoad - agent2.cognitiveLoad);
                const attentionAlignment = this.calculateAttentionAlignment(agent1, agent2);
                
                const pairSynergy = (capabilityOverlap * 0.4) + (loadBalance * 0.3) + (attentionAlignment * 0.3);
                totalSynergy += pairSynergy;
                comparisons++;
            }
        }

        return comparisons > 0 ? totalSynergy / comparisons : 0;
    }

    /**
     * Calculate capability overlap between two agents
     */
    private calculateCapabilityOverlap(agent1: AgenticAtom, agent2: AgenticAtom): number {
        const caps1 = new Set(agent1.capabilities);
        const caps2 = new Set(agent2.capabilities);
        
        const intersection = new Set([...caps1].filter(x => caps2.has(x)));
        const union = new Set([...caps1, ...caps2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Calculate attention alignment between two agents
     */
    private calculateAttentionAlignment(agent1: AgenticAtom, agent2: AgenticAtom): number {
        const sti1 = agent1.attentionValue.sti;
        const sti2 = agent2.attentionValue.sti;
        
        const maxSTI = Math.max(Math.abs(sti1), Math.abs(sti2));
        return maxSTI > 0 ? 1 - Math.abs(sti1 - sti2) / (2 * maxSTI) : 1;
    }

    /**
     * Create a cognitive synergy link in the atomspace
     */
    private async createCognitiveSynergyLink(
        agents: AgenticAtom[], 
        synergyScore: number
    ): Promise<void> {
        const synergyLink = new CognitiveSynergyLink(
            agents,
            undefined,
            new TruthValue(synergyScore, 0.9),
            new AttentionValue(100, 50, 25)
        );
        
        await this._atomSpace.addAtom(synergyLink);
    }

    /**
     * Handle coordination messages between agents
     */
    async handleCoordinationMessage(
        sender: AgenticAtom, 
        message: AgentMessage
    ): Promise<void> {
        // Broadcast coordination message to relevant agents
        const relevantAgents = Array.from(this._agents.values()).filter(agent => 
            agent.id !== sender.id && 
            message.metadata?.targetCapabilities?.some((cap: CognitiveCapability) => 
                agent.hasCapability(cap)
            )
        );
        
        for (const agent of relevantAgents) {
            await agent.channel.receiveMessage({
                ...message,
                receiver: agent.id
            });
        }
    }

    /**
     * Get runtime statistics
     */
    getStatistics(): RuntimeStatistics {
        const totalAgents = this._agents.size;
        const activeAgents = Array.from(this._agents.values()).filter(a => a.isActive).length;
        
        const avgCognitiveLoad = totalAgents > 0 ? 
            Array.from(this._agents.values()).reduce((sum, a) => sum + a.cognitiveLoad, 0) / totalAgents : 0;
        
        const avgResponseTime = this._messageCount > 0 ? this._responseTimeSum / this._messageCount : 0;
        
        const recentSynergy = this._synergyEvents
            .filter(e => Date.now() - e.timestamp < 60000) // Last minute
            .reduce((sum, e) => sum + e.synergyScore, 0);
        
        return {
            totalAgents,
            activeAgents,
            totalMessages: this._messageCount,
            messagesPerSecond: this.calculateMessagesPerSecond(),
            averageResponseTime: avgResponseTime,
            cognitiveLoad: avgCognitiveLoad,
            synergyScore: recentSynergy,
            networkNodes: this._networkNodes.size,
            uptime: Date.now() - this._startTime
        };
    }

    /**
     * Calculate messages per second
     */
    private calculateMessagesPerSecond(): number {
        const uptime = Date.now() - this._startTime;
        return uptime > 0 ? (this._messageCount * 1000) / uptime : 0;
    }

    /**
     * Start runtime monitoring
     */
    private startRuntimeMonitoring(): void {
        setInterval(() => {
            this.updateRuntimeMetrics();
        }, 5000); // Every 5 seconds
    }

    /**
     * Update runtime metrics
     */
    private updateRuntimeMetrics(): void {
        const stats = this.getStatistics();
        this._cognitiveLoadHistory.push(stats.cognitiveLoad);
        
        // Keep only recent history
        if (this._cognitiveLoadHistory.length > 100) {
            this._cognitiveLoadHistory = this._cognitiveLoadHistory.slice(-50);
        }
        
        this.emit('metricsUpdated', stats);
    }

    /**
     * Start cognitive synergy detection process
     */
    private startSynergyDetection(): void {
        setInterval(() => {
            this.runSynergyDetection();
        }, 10000); // Every 10 seconds
    }

    /**
     * Run periodic synergy detection across all agents
     */
    private async runSynergyDetection(): Promise<void> {
        const agents = Array.from(this._agents.values());
        
        if (agents.length >= 2) {
            await this.detectCognitiveSynergy(agents);
        }
    }

    /**
     * Initialize networking for distributed processing
     */
    private initializeNetworking(): void {
        // Placeholder for network initialization
        console.log("Networking initialized for distributed processing");
    }

    /**
     * Add a network node for distributed processing
     */
    addNetworkNode(node: NetworkNode): void {
        this._networkNodes.set(node.id, node);
        this.emit('networkNodeAdded', node);
        console.log(`Network node ${node.id} added at ${node.address}:${node.port}`);
    }

    /**
     * Remove a network node
     */
    removeNetworkNode(nodeId: string): boolean {
        const removed = this._networkNodes.delete(nodeId);
        if (removed) {
            this.emit('networkNodeRemoved', nodeId);
            console.log(`Network node ${nodeId} removed`);
        }
        return removed;
    }

    /**
     * Dispose of the runtime and clean up resources
     */
    async dispose(): Promise<void> {
        this._isActive = false;
        
        // Unregister all agents
        const agentIds = Array.from(this._agents.keys());
        for (const agentId of agentIds) {
            await this.unregisterAgent(agentId);
        }
        
        // Dispose master channel
        await this._masterChannel.dispose();
        
        // Clear collections
        this._agents.clear();
        this._channels.clear();
        this._networkNodes.clear();
        this._synergyEvents = [];
        
        this.removeAllListeners();
        console.log("CognitiveSynergyRuntime disposed");
    }
}