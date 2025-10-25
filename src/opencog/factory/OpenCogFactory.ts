import {AtomSpace, type AtomSpaceConfig} from "../atomspace/AtomSpace.js";
import {AgenticAtom, CognitiveCapability, type InferenceEngineConfig} from "../agents/AgenticAtom.js";
import {CognitiveSynergyRuntime, type CognitiveSynergyConfig} from "../runtime/CognitiveSynergyRuntime.js";
import {TruthValue, AttentionValue} from "../atoms/Atom.js";
import type {LlamaOptions} from "../../index.js";

/**
 * Configuration for creating a distributed atomspace system
 */
export interface DistributedAtomSpaceConfig {
    atomSpace?: AtomSpaceConfig;
    runtime?: CognitiveSynergyConfig;
    defaultAgentCapabilities?: CognitiveCapability[];
    defaultInferenceConfig?: InferenceEngineConfig;
    llamaOptions?: LlamaOptions;
}

/**
 * Factory function to create a complete distributed atomspace system
 */
export async function createDistributedAtomSpace(
    config: DistributedAtomSpaceConfig = {}
): Promise<{
    atomSpace: AtomSpace;
    runtime: CognitiveSynergyRuntime;
    createAgent: (name: string, capabilities?: CognitiveCapability[], inferenceConfig?: InferenceEngineConfig) => Promise<AgenticAtom>;
}> {
    // Create AtomSpace
    const atomSpace = new AtomSpace(config.atomSpace);
    
    // Create Cognitive Synergy Runtime
    const runtime = new CognitiveSynergyRuntime(atomSpace, config.runtime);
    
    // Factory function for creating agents
    const createAgent = async (
        name: string,
        capabilities: CognitiveCapability[] = config.defaultAgentCapabilities || [CognitiveCapability.Reasoning],
        inferenceConfig: InferenceEngineConfig = config.defaultInferenceConfig || {}
    ): Promise<AgenticAtom> => {
        const agent = createAgenticAtom(name, capabilities, inferenceConfig);
        await runtime.registerAgent(agent, config.llamaOptions);
        return agent;
    };
    
    console.log("Distributed AtomSpace system created successfully");
    
    return {
        atomSpace,
        runtime,
        createAgent
    };
}

/**
 * Factory function to create an agentic atom with default configuration
 */
export function createAgenticAtom(
    name: string,
    capabilities: CognitiveCapability[] = [CognitiveCapability.Reasoning],
    inferenceConfig: InferenceEngineConfig = {},
    truthValue?: TruthValue,
    attentionValue?: AttentionValue
): AgenticAtom {
    const defaultTruthValue = truthValue || new TruthValue(0.8, 0.9);
    const defaultAttentionValue = attentionValue || new AttentionValue(100, 50, 25);
    
    return new AgenticAtom(
        name,
        capabilities,
        inferenceConfig,
        defaultTruthValue,
        defaultAttentionValue
    );
}

/**
 * Factory function to create a cognitive synergy runtime with default configuration
 */
export function createCognitiveSynergyRuntime(
    atomSpace: AtomSpace,
    config: CognitiveSynergyConfig = {}
): CognitiveSynergyRuntime {
    const defaultConfig: CognitiveSynergyConfig = {
        maxAgents: 100,
        loadBalancingEnabled: true,
        distributedProcessingEnabled: true,
        gpuAccelerationEnabled: true,
        attentionBroadcasting: true,
        cognitiveSynergyThreshold: 0.7,
        ...config
    };
    
    return new CognitiveSynergyRuntime(atomSpace, defaultConfig);
}

/**
 * Create a simple reasoning agent with standard capabilities
 */
export async function createReasoningAgent(
    name: string,
    modelPath: string,
    llamaOptions?: LlamaOptions
): Promise<{agent: AgenticAtom; initialize: () => Promise<void>}> {
    const agent = createAgenticAtom(
        name,
        [
            CognitiveCapability.Reasoning,
            CognitiveCapability.PatternRecognition,
            CognitiveCapability.MemoryRecall
        ],
        {
            modelPath,
            contextSize: 4096,
            temperature: 0.7,
            topP: 0.9
        }
    );
    
    return {
        agent,
        initialize: () => agent.initialize(llamaOptions)
    };
}

/**
 * Create a planning agent with strategic capabilities
 */
export async function createPlanningAgent(
    name: string,
    modelPath: string,
    llamaOptions?: LlamaOptions
): Promise<{agent: AgenticAtom; initialize: () => Promise<void>}> {
    const agent = createAgenticAtom(
        name,
        [
            CognitiveCapability.Planning,
            CognitiveCapability.GoalPursual,
            CognitiveCapability.Reasoning
        ],
        {
            modelPath,
            contextSize: 8192,
            temperature: 0.6,
            topP: 0.85
        }
    );
    
    return {
        agent,
        initialize: () => agent.initialize(llamaOptions)
    };
}

/**
 * Create a learning agent with adaptive capabilities
 */
export async function createLearningAgent(
    name: string,
    modelPath: string,
    llamaOptions?: LlamaOptions
): Promise<{agent: AgenticAtom; initialize: () => Promise<void>}> {
    const agent = createAgenticAtom(
        name,
        [
            CognitiveCapability.Learning,
            CognitiveCapability.PatternRecognition,
            CognitiveCapability.ConceptualBlending
        ],
        {
            modelPath,
            contextSize: 6144,
            temperature: 0.8,
            topP: 0.95
        }
    );
    
    return {
        agent,
        initialize: () => agent.initialize(llamaOptions)
    };
}

/**
 * Create a complete multi-agent cognitive system
 */
export async function createMultiAgentCognitiveSystem(
    config: {
        modelPath: string;
        numReasoningAgents?: number;
        numPlanningAgents?: number;
        numLearningAgents?: number;
        llamaOptions?: LlamaOptions;
        systemConfig?: DistributedAtomSpaceConfig;
    }
): Promise<{
    atomSpace: AtomSpace;
    runtime: CognitiveSynergyRuntime;
    agents: {
        reasoning: AgenticAtom[];
        planning: AgenticAtom[];
        learning: AgenticAtom[];
    };
    processRequest: (input: string) => Promise<Map<string, string>>;
}> {
    const {
        modelPath,
        numReasoningAgents = 2,
        numPlanningAgents = 1,
        numLearningAgents = 1,
        llamaOptions,
        systemConfig = {}
    } = config;
    
    // Create distributed atomspace system
    const {atomSpace, runtime, createAgent} = await createDistributedAtomSpace({
        ...systemConfig,
        defaultInferenceConfig: {modelPath},
        llamaOptions
    });
    
    // Create agents
    const reasoningAgents: AgenticAtom[] = [];
    const planningAgents: AgenticAtom[] = [];
    const learningAgents: AgenticAtom[] = [];
    
    // Create reasoning agents
    for (let i = 0; i < numReasoningAgents; i++) {
        const agent = await createAgent(
            `ReasoningAgent-${i + 1}`,
            [CognitiveCapability.Reasoning, CognitiveCapability.PatternRecognition]
        );
        reasoningAgents.push(agent);
    }
    
    // Create planning agents
    for (let i = 0; i < numPlanningAgents; i++) {
        const agent = await createAgent(
            `PlanningAgent-${i + 1}`,
            [CognitiveCapability.Planning, CognitiveCapability.GoalPursual]
        );
        planningAgents.push(agent);
    }
    
    // Create learning agents
    for (let i = 0; i < numLearningAgents; i++) {
        const agent = await createAgent(
            `LearningAgent-${i + 1}`,
            [CognitiveCapability.Learning, CognitiveCapability.ConceptualBlending]
        );
        learningAgents.push(agent);
    }
    
    // Process request function
    const processRequest = async (input: string): Promise<Map<string, string>> => {
        return await runtime.orchestrateCognition(
            input,
            [
                CognitiveCapability.Reasoning,
                CognitiveCapability.Planning,
                CognitiveCapability.Learning
            ]
        );
    };
    
    console.log(`Multi-agent cognitive system created with ${reasoningAgents.length + planningAgents.length + learningAgents.length} agents`);
    
    return {
        atomSpace,
        runtime,
        agents: {
            reasoning: reasoningAgents,
            planning: planningAgents,
            learning: learningAgents
        },
        processRequest
    };
}