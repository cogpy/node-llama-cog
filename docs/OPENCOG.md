# OpenCog Distributed Agentic Atomspace

This implementation transforms the node-llama-cpp library into a distributed agentic atomspace where each atom can be a hyperthread channel multiplexer with its own unique node-llama-cpp inference engine, deployed to a cognitive synergy federated runtime accelerator.

## Overview

The OpenCog system provides:

- **Distributed Atomspace**: A hypergraph-based knowledge representation where atoms can be nodes or links
- **Agentic Atoms**: Autonomous agents with cognitive capabilities and dedicated inference engines
- **Hyperthread Channel Multiplexing**: High-performance inter-agent communication system
- **Cognitive Synergy Runtime**: Federated execution environment for distributed cognitive processing
- **GPU Acceleration**: Leverages node-llama-cpp's GPU capabilities across multiple agents

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Cognitive Synergy Runtime                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Agentic     │  │ Agentic     │  │ Agentic     │   ...   │
│  │ Atom 1      │  │ Atom 2      │  │ Atom N      │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │ LLM     │ │  │ │ LLM     │ │  │ │ LLM     │ │         │
│  │ │ Engine  │ │  │ │ Engine  │ │  │ │ Engine  │ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │Hyper-   │ │  │ │Hyper-   │ │  │ │Hyper-   │ │         │
│  │ │thread   │ │  │ │thread   │ │  │ │thread   │ │         │
│  │ │Channel  │ │  │ │Channel  │ │  │ │Channel  │ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    AtomSpace Container                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        Hypergraph Knowledge Representation          │   │
│  │   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐       │   │
│  │   │Concept│   │Pred. │   │Link  │   │Agent │       │   │
│  │   │ Node │◄──┤ Node ├──►│ Node │◄──┤ Node │       │   │
│  │   └──────┘   └──────┘   └──────┘   └──────┘       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Atoms (Base Knowledge Units)

#### Traditional Atoms
- **ConceptNode**: Represents concepts or entities
- **PredicateNode**: Represents predicates or relations  
- **VariableNode**: Represents variables in logical expressions
- **NumberNode**: Represents numeric values
- **InheritanceLink**: Represents inheritance relationships
- **SimilarityLink**: Represents similarity relationships
- **EvaluationLink**: Represents predicate evaluations

#### Agentic Atoms
- **AgenticAtom**: Autonomous agents with cognitive capabilities and inference engines
- **CognitiveSynergyLink**: Represents emergent cognitive synergy between agents

### 2. AtomSpace

The distributed hypergraph container that manages all atoms with:

- **Thread-safe operations** for concurrent access
- **Efficient indexing** by type, name, and relationships
- **Attention allocation** for focus management
- **Truth value propagation** with Probabilistic Logic Networks
- **Garbage collection** for memory management

### 3. HyperthreadChannel

High-performance message multiplexer providing:

- **Load balancing** across multiple channels
- **Message routing** with priority and retry logic
- **Compression and encryption** capabilities
- **Real-time statistics** and monitoring

### 4. CognitiveSynergyRuntime

Federated runtime environment that:

- **Orchestrates cognitive processing** across multiple agents
- **Detects cognitive synergy** between collaborating agents
- **Manages distributed execution** with GPU acceleration
- **Provides load balancing** and resource optimization

## Cognitive Capabilities

Agentic atoms can possess various cognitive capabilities:

- **Reasoning**: Logical analysis and inference
- **Planning**: Strategic thinking and goal decomposition
- **Learning**: Pattern recognition and knowledge acquisition
- **Memory Recall**: Information retrieval and association
- **Attention Allocation**: Resource management and focus
- **Goal Pursuit**: Objective-driven behavior
- **Conceptual Blending**: Creative combination of concepts
- **Pattern Recognition**: Structure and trend identification

## Usage Examples

### Basic Setup

```javascript
import { OpenCog } from 'node-llama-cpp';

// Create distributed atomspace system
const system = await OpenCog.createDistributedAtomSpace({
    atomSpace: {
        maxAtoms: 10000,
        enableGarbageCollection: true,
        attentionDecayRate: 0.01
    },
    runtime: {
        maxAgents: 50,
        loadBalancingEnabled: true,
        gpuAccelerationEnabled: true
    }
});

const { atomSpace, runtime, createAgent } = system;
```

### Creating Agentic Atoms

```javascript
// Create specialized reasoning agent
const reasoningAgent = await createAgent("Einstein", [
    OpenCog.CognitiveCapability.Reasoning,
    OpenCog.CognitiveCapability.PatternRecognition
], {
    modelPath: "./models/reasoning-model.gguf",
    contextSize: 4096,
    temperature: 0.7
});

// Create planning agent
const planningAgent = await createAgent("Strategist", [
    OpenCog.CognitiveCapability.Planning,
    OpenCog.CognitiveCapability.GoalPursual
], {
    modelPath: "./models/planning-model.gguf",
    contextSize: 8192,
    temperature: 0.6
});
```

### Cognitive Processing

```javascript
// Orchestrate cognitive processing across multiple agents
const results = await runtime.orchestrateCognition(
    "How can we solve climate change using AI?",
    [
        OpenCog.CognitiveCapability.Reasoning,
        OpenCog.CognitiveCapability.Planning,
        OpenCog.CognitiveCapability.Learning
    ]
);

// Results contain responses from different cognitive capabilities
for (const [capability, response] of results) {
    console.log(`${capability}: ${response}`);
}
```

### Inter-Agent Communication

```javascript
// Send message between agents
await reasoningAgent.sendMessage(
    planningAgent.id,
    "What are the key factors to consider in AI planning?",
    'query',
    { priority: 'high', domain: 'artificial_intelligence' }
);
```

### AtomSpace Operations

```javascript
// Add traditional atoms
const concept = new OpenCog.ConceptNode("Artificial Intelligence", 
    new OpenCog.TruthValue(0.9, 0.95));
await atomSpace.addAtom(concept);

// Query atoms
const aiConcepts = atomSpace.queryAtoms({
    type: OpenCog.AtomType.ConceptNode,
    name: /.*intelligence.*/i,
    truthValueThreshold: 0.8
});

// Get attentional focus
const focusAtoms = atomSpace.getAttentionalFocus();
```

## Configuration Options

### AtomSpace Configuration

```javascript
{
    maxAtoms: 1000000,              // Maximum atoms in atomspace
    enableGarbageCollection: true,   // Auto-cleanup low attention atoms
    attentionDecayRate: 0.01,       // Rate of attention decay
    truthValueDecayRate: 0.001,     // Rate of truth value decay  
    indexingEnabled: true,          // Enable fast indexing
    persistenceEnabled: false       // Enable persistence to disk
}
```

### Runtime Configuration

```javascript
{
    maxAgents: 1000,                    // Maximum concurrent agents
    loadBalancingEnabled: true,         // Enable load balancing
    distributedProcessingEnabled: true, // Enable distributed processing
    gpuAccelerationEnabled: true,       // Enable GPU acceleration
    networkingEnabled: false,           // Enable network distribution
    attentionBroadcasting: true,        // Broadcast attention events
    cognitiveSynergyThreshold: 0.7      // Threshold for synergy detection
}
```

### Inference Engine Configuration

```javascript
{
    modelPath: "./models/model.gguf",   // Path to LLM model
    contextSize: 4096,                  // Context window size
    gpuLayers: 35,                      // Number of GPU layers
    batchSize: 512,                     // Batch size for processing
    temperature: 0.7,                   // Sampling temperature
    topP: 0.9,                         // Nucleus sampling parameter
    topK: 40                           // Top-k sampling parameter
}
```

## Performance Considerations

### GPU Utilization
- Each agentic atom can use GPU layers independently
- Runtime balances GPU memory across agents
- Supports CUDA, Metal, and Vulkan backends

### Memory Management
- Automatic attention-based garbage collection
- Truth value and attention decay over time
- Configurable capacity limits and thresholds

### Scalability
- Horizontal scaling across network nodes
- Load balancing based on cognitive load
- Efficient message routing and compression

## Advanced Features

### Cognitive Synergy Detection
The system automatically detects when agents are working together effectively:

```javascript
runtime.on('cognitiveSynergy', (event) => {
    console.log(`Synergy detected between ${event.participantIds.length} agents`);
    console.log(`Synergy score: ${event.synergyScore}`);
});
```

### Attention Dynamics
Atoms compete for attention resources:

```javascript
// Monitor attentional focus changes
atomSpace.on('attentionalFocusUpdated', (focusSize) => {
    console.log(`${focusSize} atoms in focus`);
});
```

### Network Distribution
Scale across multiple machines:

```javascript
// Add network nodes for distributed processing
runtime.addNetworkNode({
    id: 'node-1',
    address: '192.168.1.100',
    port: 8080,
    capabilities: [CognitiveCapability.Reasoning],
    load: 0.3,
    latency: 50
});
```

## Factory Functions

### Multi-Agent Cognitive System

```javascript
const system = await OpenCog.createMultiAgentCognitiveSystem({
    modelPath: "./models/model.gguf",
    numReasoningAgents: 3,
    numPlanningAgents: 2,
    numLearningAgents: 1,
    systemConfig: {
        runtime: { gpuAccelerationEnabled: true }
    }
});

// Process complex requests
const results = await system.processRequest(
    "Design an AI system for autonomous vehicles"
);
```

### Specialized Agents

```javascript
// Create reasoning agent
const { agent, initialize } = await OpenCog.createReasoningAgent(
    "LogicMaster",
    "./models/reasoning-model.gguf"
);
await initialize();

// Create planning agent
const { agent: planner } = await OpenCog.createPlanningAgent(
    "Strategist", 
    "./models/planning-model.gguf"
);
```

## Testing

Run the OpenCog test suite:

```bash
npm test test/opencog/
```

Test files include:
- `atom.test.ts` - Core atom functionality
- `atomspace.test.ts` - AtomSpace operations
- `integration.test.ts` - Full system integration

## Examples

See `examples/opencog-example.js` for a comprehensive demonstration of the system's capabilities.

## Implementation Notes

### Thread Safety
All operations are designed to be thread-safe using:
- Atomic operations for critical sections
- Lock-free data structures where possible
- Message passing for inter-agent communication

### Error Handling
Robust error handling includes:
- Graceful degradation when agents fail
- Automatic retry mechanisms for transient failures
- Comprehensive logging and monitoring

### Security
Security features include:
- Message encryption for sensitive data
- Capability-based access control
- Resource isolation between agents

## Future Enhancements

Planned improvements include:
- **Persistent AtomSpace**: Save/load atomspace state to disk
- **Advanced PLN**: More sophisticated probabilistic logic networks
- **Neural-Symbolic Integration**: Hybrid symbolic-neural processing
- **Quantum Computing Support**: Quantum-enhanced cognitive processing
- **Blockchain Integration**: Distributed consensus for truth values

## Contributing

When contributing to the OpenCog implementation:
1. Follow the existing architecture patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure thread safety in all operations
5. Maintain backward compatibility where possible

The OpenCog implementation transforms node-llama-cpp into a powerful distributed cognitive computing platform, enabling sophisticated AI applications with autonomous agents, cognitive synergy, and federated processing capabilities.