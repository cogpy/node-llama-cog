import {AtomType, Node, TruthValue, AttentionValue} from "../atoms/Atom.js";
import {LlamaModel, LlamaContext, LlamaChatSession, getLlama, type LlamaOptions} from "../../index.js";
import {HyperthreadChannel} from "../channels/HyperthreadChannel.js";
import {CognitiveSynergyRuntime} from "../runtime/CognitiveSynergyRuntime.js";

/**
 * Message interface for inter-agent communication
 */
export interface AgentMessage {
    id: string;
    sender: string;
    receiver: string;
    content: string;
    timestamp: number;
    type: 'reasoning' | 'query' | 'response' | 'coordination' | 'attention';
    metadata?: Record<string, any>;
}

/**
 * Cognitive capabilities that an agentic atom can perform
 */
export enum CognitiveCapability {
    Reasoning = "reasoning",
    Planning = "planning", 
    Learning = "learning",
    MemoryRecall = "memory_recall",
    AttentionAllocation = "attention_allocation",
    GoalPursual = "goal_pursual",
    ConceptualBlending = "conceptual_blending",
    PatternRecognition = "pattern_recognition"
}

/**
 * Configuration for the inference engine of an agentic atom
 */
export interface InferenceEngineConfig {
    modelPath?: string;
    contextSize?: number;
    gpuLayers?: number;
    batchSize?: number;
    seed?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    repeatPenalty?: number;
}

/**
 * AgenticAtom - An atom with autonomous cognitive capabilities and LLM inference
 * Each AgenticAtom runs its own dedicated node-llama-cpp inference engine
 */
export class AgenticAtom extends Node {
    private _model?: LlamaModel;
    private _context?: LlamaContext;
    private _chatSession?: LlamaChatSession;
    private _channel: HyperthreadChannel;
    private _capabilities: Set<CognitiveCapability> = new Set();
    private _isActive: boolean = false;
    private _cognitiveLoad: number = 0;
    private _messageQueue: AgentMessage[] = [];
    private _inferenceEngineConfig: InferenceEngineConfig;
    private _runtime?: CognitiveSynergyRuntime;

    constructor(
        name: string,
        capabilities: CognitiveCapability[] = [],
        inferenceConfig: InferenceEngineConfig = {},
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.AgenticNode, name, truthValue, attentionValue);
        
        this._capabilities = new Set(capabilities);
        this._inferenceEngineConfig = {
            contextSize: 2048,
            gpuLayers: 35,
            batchSize: 512,
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            repeatPenalty: 1.1,
            ...inferenceConfig
        };
        
        this._channel = new HyperthreadChannel(this.id);
        this._channel.onMessage((message) => this.handleMessage(message));
    }

    /**
     * Initialize the inference engine for this agent
     */
    async initialize(llamaOptions?: LlamaOptions): Promise<void> {
        try {
            const llama = await getLlama(llamaOptions);
            
            if (this._inferenceEngineConfig.modelPath) {
                this._model = await llama.loadModel({
                    modelPath: this._inferenceEngineConfig.modelPath,
                    gpuLayers: this._inferenceEngineConfig.gpuLayers
                });
                
                this._context = await this._model.createContext({
                    contextSize: this._inferenceEngineConfig.contextSize,
                    batchSize: this._inferenceEngineConfig.batchSize
                });
                
                this._chatSession = new LlamaChatSession({
                    contextSequence: this._context.getSequence()
                });
                
                this._isActive = true;
                console.log(`AgenticAtom ${this.name} initialized with inference engine`);
            } else {
                console.warn(`AgenticAtom ${this.name} initialized without model path`);
            }
        } catch (error) {
            console.error(`Failed to initialize AgenticAtom ${this.name}:`, error);
            throw error;
        }
    }

    /**
     * Set the cognitive synergy runtime this agent operates in
     */
    setRuntime(runtime: CognitiveSynergyRuntime): void {
        this._runtime = runtime;
    }

    /**
     * Check if this agent has a specific cognitive capability
     */
    hasCapability(capability: CognitiveCapability): boolean {
        return this._capabilities.has(capability);
    }

    /**
     * Add a new cognitive capability to this agent
     */
    addCapability(capability: CognitiveCapability): void {
        this._capabilities.add(capability);
    }

    /**
     * Get all cognitive capabilities of this agent
     */
    get capabilities(): ReadonlySet<CognitiveCapability> {
        return this._capabilities;
    }

    /**
     * Get the hyperthread channel for this agent
     */
    get channel(): HyperthreadChannel {
        return this._channel;
    }

    /**
     * Check if the inference engine is active
     */
    get isActive(): boolean {
        return this._isActive;
    }

    /**
     * Get current cognitive load (0-1 scale)
     */
    get cognitiveLoad(): number {
        return this._cognitiveLoad;
    }

    /**
     * Process cognitive input and generate response using LLM inference
     */
    async processCognition(
        input: string,
        capability: CognitiveCapability,
        context?: Record<string, any>
    ): Promise<string> {
        if (!this._chatSession) {
            throw new Error(`AgenticAtom ${this.name} not initialized with inference engine`);
        }

        if (!this.hasCapability(capability)) {
            throw new Error(`AgenticAtom ${this.name} does not have capability: ${capability}`);
        }

        const startTime = Date.now();
        this._cognitiveLoad = Math.min(1.0, this._cognitiveLoad + 0.1);

        try {
            // Build capability-specific prompt
            const capabilityPrompt = this.buildCapabilityPrompt(capability, input, context);
            
            // Generate response using LLM
            const response = await this._chatSession.prompt(capabilityPrompt, {
                temperature: this._inferenceEngineConfig.temperature,
                topP: this._inferenceEngineConfig.topP,
                topK: this._inferenceEngineConfig.topK
            });

            // Update attention value based on processing time and complexity
            const processingTime = Date.now() - startTime;
            const attentionBoost = Math.min(50, processingTime / 100);
            this.attentionValue = new AttentionValue(
                this.attentionValue.sti + attentionBoost,
                this.attentionValue.lti,
                this.attentionValue.vlti
            );

            return response;
        } finally {
            this._cognitiveLoad = Math.max(0.0, this._cognitiveLoad - 0.1);
        }
    }

    /**
     * Build capability-specific prompts for different cognitive functions
     */
    private buildCapabilityPrompt(
        capability: CognitiveCapability, 
        input: string, 
        context?: Record<string, any>
    ): string {
        const contextStr = context ? `Context: ${JSON.stringify(context)}\n\n` : "";
        
        switch (capability) {
            case CognitiveCapability.Reasoning:
                return `${contextStr}As an AI agent specialized in reasoning, analyze the following problem and provide logical conclusions:\n\n${input}\n\nProvide your reasoning step by step:`;
                
            case CognitiveCapability.Planning:
                return `${contextStr}As an AI agent specialized in planning, create a detailed plan for the following goal:\n\n${input}\n\nProvide a structured plan with steps and considerations:`;
                
            case CognitiveCapability.Learning:
                return `${contextStr}As an AI agent specialized in learning, extract key insights and patterns from the following information:\n\n${input}\n\nWhat can be learned and how can this knowledge be applied:`;
                
            case CognitiveCapability.MemoryRecall:
                return `${contextStr}As an AI agent with memory capabilities, recall relevant information related to:\n\n${input}\n\nProvide relevant memories and associations:`;
                
            case CognitiveCapability.AttentionAllocation:
                return `${contextStr}As an AI agent managing attention, prioritize the following items and allocate attention resources:\n\n${input}\n\nProvide attention priorities and reasoning:`;
                
            case CognitiveCapability.GoalPursual:
                return `${contextStr}As an AI agent pursuing goals, evaluate progress and determine next actions for:\n\n${input}\n\nAnalyze goal progress and recommend actions:`;
                
            case CognitiveCapability.ConceptualBlending:
                return `${contextStr}As an AI agent specialized in conceptual blending, combine and synthesize the following concepts:\n\n${input}\n\nCreate novel combinations and explain the blended concepts:`;
                
            case CognitiveCapability.PatternRecognition:
                return `${contextStr}As an AI agent specialized in pattern recognition, identify patterns in:\n\n${input}\n\nDescribe the patterns found and their significance:`;
                
            default:
                return `${contextStr}Process the following request:\n\n${input}\n\nProvide a thoughtful response:`;
        }
    }

    /**
     * Send a message to another agent via the channel multiplexer
     */
    async sendMessage(
        receiverId: string, 
        content: string, 
        type: AgentMessage['type'] = 'query',
        metadata?: Record<string, any>
    ): Promise<void> {
        const message: AgentMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sender: this.id,
            receiver: receiverId,
            content,
            timestamp: Date.now(),
            type,
            metadata
        };

        await this._channel.sendMessage(receiverId, message);
    }

    /**
     * Handle incoming messages from other agents
     */
    private async handleMessage(message: AgentMessage): Promise<void> {
        this._messageQueue.push(message);
        
        // Process message based on type
        try {
            let response: string;
            
            switch (message.type) {
                case 'reasoning':
                    if (this.hasCapability(CognitiveCapability.Reasoning)) {
                        response = await this.processCognition(
                            message.content, 
                            CognitiveCapability.Reasoning, 
                            message.metadata
                        );
                        await this.sendMessage(message.sender, response, 'response');
                    }
                    break;
                    
                case 'query':
                    // Determine best capability to handle query
                    const capability = this.selectBestCapability(message.content);
                    if (capability) {
                        response = await this.processCognition(
                            message.content, 
                            capability, 
                            message.metadata
                        );
                        await this.sendMessage(message.sender, response, 'response');
                    }
                    break;
                    
                case 'coordination':
                    // Handle coordination with runtime
                    if (this._runtime) {
                        await this._runtime.handleCoordinationMessage(this, message);
                    }
                    break;
                    
                case 'attention':
                    // Handle attention allocation requests
                    if (this.hasCapability(CognitiveCapability.AttentionAllocation)) {
                        response = await this.processCognition(
                            message.content, 
                            CognitiveCapability.AttentionAllocation, 
                            message.metadata
                        );
                        await this.sendMessage(message.sender, response, 'response');
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error processing message in AgenticAtom ${this.name}:`, error);
        }
    }

    /**
     * Select the best cognitive capability to handle a given input
     */
    private selectBestCapability(input: string): CognitiveCapability | null {
        const lowercaseInput = input.toLowerCase();
        
        // Simple keyword-based capability selection
        if (lowercaseInput.includes('plan') || lowercaseInput.includes('strategy')) {
            return this.hasCapability(CognitiveCapability.Planning) ? CognitiveCapability.Planning : null;
        }
        
        if (lowercaseInput.includes('learn') || lowercaseInput.includes('pattern')) {
            return this.hasCapability(CognitiveCapability.PatternRecognition) ? CognitiveCapability.PatternRecognition : null;
        }
        
        if (lowercaseInput.includes('remember') || lowercaseInput.includes('recall')) {
            return this.hasCapability(CognitiveCapability.MemoryRecall) ? CognitiveCapability.MemoryRecall : null;
        }
        
        if (lowercaseInput.includes('reason') || lowercaseInput.includes('analyze')) {
            return this.hasCapability(CognitiveCapability.Reasoning) ? CognitiveCapability.Reasoning : null;
        }
        
        // Default to reasoning if available, otherwise first capability
        if (this.hasCapability(CognitiveCapability.Reasoning)) {
            return CognitiveCapability.Reasoning;
        }
        
        return this._capabilities.size > 0 ? Array.from(this._capabilities)[0] || null : null;
    }

    /**
     * Get statistics about this agent's performance
     */
    getStatistics(): {
        messagesProcessed: number;
        cognitiveLoad: number;
        capabilities: string[];
        isActive: boolean;
        attentionValue: string;
        truthValue: string;
    } {
        return {
            messagesProcessed: this._messageQueue.length,
            cognitiveLoad: this._cognitiveLoad,
            capabilities: Array.from(this._capabilities),
            isActive: this._isActive,
            attentionValue: this.attentionValue.toString(),
            truthValue: this.truthValue.toString()
        };
    }

    /**
     * Dispose of resources when agent is no longer needed
     */
    async dispose(): Promise<void> {
        this._isActive = false;
        await this._channel.dispose();
        
        if (this._context) {
            this._context.dispose();
        }
        
        if (this._model) {
            this._model.dispose();
        }
        
        console.log(`AgenticAtom ${this.name} disposed`);
    }
}