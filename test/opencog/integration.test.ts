import {describe, it, expect, beforeAll, afterAll, vi} from "vitest";
import {
    createDistributedAtomSpace,
    CognitiveCapability,
    AtomSpace,
    CognitiveSynergyRuntime,
    AgenticAtom,
    ConceptNode
} from "../../src/opencog/index.js";

describe("OpenCog Integration", () => {
    let atomSpace: AtomSpace;
    let runtime: CognitiveSynergyRuntime;
    let createAgent: (name: string, capabilities?: CognitiveCapability[]) => Promise<AgenticAtom>;

    beforeAll(async () => {
        // Mock the llama initialization to avoid requiring actual model files
        vi.mock("../../src/index.js", () => ({
            getLlama: vi.fn().mockResolvedValue({
                loadModel: vi.fn().mockResolvedValue({
                    createContext: vi.fn().mockResolvedValue({
                        getSequence: vi.fn().mockReturnValue({}),
                        dispose: vi.fn()
                    }),
                    dispose: vi.fn()
                })
            }),
            LlamaChatSession: vi.fn().mockImplementation(() => ({
                prompt: vi.fn().mockResolvedValue("Mocked AI response")
            }))
        }));

        // Create distributed atomspace system
        const system = await createDistributedAtomSpace({
            atomSpace: {
                maxAtoms: 1000,
                enableGarbageCollection: false,
                indexingEnabled: true
            },
            runtime: {
                maxAgents: 10,
                loadBalancingEnabled: true,
                cognitiveSynergyThreshold: 0.5
            },
            defaultAgentCapabilities: [CognitiveCapability.Reasoning]
        });

        atomSpace = system.atomSpace;
        runtime = system.runtime;
        createAgent = system.createAgent;
    });

    afterAll(async () => {
        await runtime.dispose();
        await atomSpace.dispose();
    });

    describe("Distributed AtomSpace Creation", () => {
        it("should create atomspace and runtime successfully", () => {
            expect(atomSpace).toBeInstanceOf(AtomSpace);
            expect(runtime).toBeInstanceOf(CognitiveSynergyRuntime);
            expect(typeof createAgent).toBe("function");
        });
    });

    describe("Agent Management", () => {
        it("should create and register agents", async () => {
            const agent = await createAgent("TestAgent", [CognitiveCapability.Reasoning]);
            
            expect(agent).toBeInstanceOf(AgenticAtom);
            expect(agent.name).toBe("TestAgent");
            expect(agent.hasCapability(CognitiveCapability.Reasoning)).toBe(true);
            
            const stats = runtime.getStatistics();
            expect(stats.totalAgents).toBeGreaterThanOrEqual(1);
        });

        it("should create agents with different capabilities", async () => {
            const reasoningAgent = await createAgent("ReasoningAgent", [CognitiveCapability.Reasoning]);
            const planningAgent = await createAgent("PlanningAgent", [CognitiveCapability.Planning]);
            const learningAgent = await createAgent("LearningAgent", [CognitiveCapability.Learning]);
            
            expect(reasoningAgent.hasCapability(CognitiveCapability.Reasoning)).toBe(true);
            expect(planningAgent.hasCapability(CognitiveCapability.Planning)).toBe(true);
            expect(learningAgent.hasCapability(CognitiveCapability.Learning)).toBe(true);
            
            const stats = runtime.getStatistics();
            expect(stats.totalAgents).toBeGreaterThanOrEqual(3);
        });
    });

    describe("AtomSpace Integration", () => {
        it("should add agents to atomspace", async () => {
            const agent = await createAgent("AtomSpaceAgent");
            
            // Check that agent is in atomspace
            const agentFromAtomSpace = atomSpace.getAgenticAtom(agent.id);
            expect(agentFromAtomSpace).toBe(agent);
        });

        it("should add regular atoms alongside agents", async () => {
            const concept = new ConceptNode("test-concept");
            await atomSpace.addAtom(concept);
            
            const retrievedConcept = atomSpace.getAtom(concept.id);
            expect(retrievedConcept).toBe(concept);
            
            const stats = atomSpace.getStatistics();
            expect(stats.totalAtoms).toBeGreaterThan(0);
        });
    });

    describe("Cognitive Processing", () => {
        it("should orchestrate cognitive processing across agents", async () => {
            // Create agents with different capabilities
            await createAgent("ReasoningAgent1", [CognitiveCapability.Reasoning]);
            await createAgent("PlanningAgent1", [CognitiveCapability.Planning]);
            
            // Test cognitive orchestration
            const results = await runtime.orchestrateCognition(
                "What is the best approach to solve complex problems?",
                [CognitiveCapability.Reasoning, CognitiveCapability.Planning]
            );
            
            expect(results).toBeInstanceOf(Map);
            expect(results.size).toBeGreaterThan(0);
            
            // Check that we get results for the requested capabilities
            if (results.has(CognitiveCapability.Reasoning)) {
                expect(typeof results.get(CognitiveCapability.Reasoning)).toBe("string");
            }
        });

        it("should handle requests for unavailable capabilities gracefully", async () => {
            // Try to orchestrate with a capability that no agent has
            await expect(runtime.orchestrateCognition(
                "Test input",
                [CognitiveCapability.ConceptualBlending] // Assuming no agent has this
            )).rejects.toThrow("No suitable agents found for required capabilities");
        });
    });

    describe("Runtime Statistics", () => {
        it("should provide accurate runtime statistics", async () => {
            const stats = runtime.getStatistics();
            
            expect(typeof stats.totalAgents).toBe("number");
            expect(typeof stats.activeAgents).toBe("number");
            expect(typeof stats.totalMessages).toBe("number");
            expect(typeof stats.cognitiveLoad).toBe("number");
            expect(typeof stats.uptime).toBe("number");
            
            expect(stats.totalAgents).toBeGreaterThanOrEqual(0);
            expect(stats.activeAgents).toBeGreaterThanOrEqual(0);
            expect(stats.cognitiveLoad).toBeGreaterThanOrEqual(0);
            expect(stats.cognitiveLoad).toBeLessThanOrEqual(1);
        });
    });

    describe("Channel Communication", () => {
        it("should enable inter-agent communication", async () => {
            const agent1 = await createAgent("CommunicatorAgent1", [CognitiveCapability.Reasoning]);
            const agent2 = await createAgent("CommunicatorAgent2", [CognitiveCapability.Learning]);
            
            // Test that agents have channels
            expect(agent1.channel).toBeDefined();
            expect(agent2.channel).toBeDefined();
            expect(agent1.channel.id).toBe(agent1.id);
            expect(agent2.channel.id).toBe(agent2.id);
        });
    });

    describe("System Lifecycle", () => {
        it("should handle agent registration and unregistration", async () => {
            const agent = await createAgent("TempAgent");
            const initialAgentCount = runtime.getStatistics().totalAgents;
            
            // Unregister the agent
            const unregistered = await runtime.unregisterAgent(agent.id);
            expect(unregistered).toBe(true);
            
            const finalAgentCount = runtime.getStatistics().totalAgents;
            expect(finalAgentCount).toBe(initialAgentCount - 1);
        });

        it("should handle system disposal gracefully", async () => {
            // Create a separate system for disposal testing
            const testSystem = await createDistributedAtomSpace({
                atomSpace: {maxAtoms: 100},
                runtime: {maxAgents: 5}
            });
            
            await testSystem.createAgent("TestAgent");
            
            // Should not throw errors
            await expect(testSystem.runtime.dispose()).resolves.not.toThrow();
            await expect(testSystem.atomSpace.dispose()).resolves.not.toThrow();
        });
    });
});