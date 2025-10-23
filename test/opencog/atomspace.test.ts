import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {AtomSpace, type AtomQuery} from "../../src/opencog/atomspace/AtomSpace.js";
import {
    ConceptNode,
    PredicateNode,
    InheritanceLink,
    AtomType,
    TruthValue,
    AttentionValue
} from "../../src/opencog/atoms/Atom.js";

describe("AtomSpace", () => {
    let atomSpace: AtomSpace;

    beforeEach(() => {
        atomSpace = new AtomSpace({
            maxAtoms: 1000,
            enableGarbageCollection: false, // Disable for testing
            indexingEnabled: true
        });
    });

    afterEach(async () => {
        await atomSpace.dispose();
    });

    describe("Basic Operations", () => {
        it("should add atoms to atomspace", async () => {
            const concept = new ConceptNode("test-concept");
            const addedAtom = await atomSpace.addAtom(concept);
            
            expect(addedAtom).toBe(concept);
            expect(atomSpace.getAtom(concept.id)).toBe(concept);
        });

        it("should merge equivalent atoms", async () => {
            const concept1 = new ConceptNode("test", new TruthValue(0.7, 0.8));
            const concept2 = new ConceptNode("test", new TruthValue(0.9, 0.6));
            
            const added1 = await atomSpace.addAtom(concept1);
            const added2 = await atomSpace.addAtom(concept2);
            
            // Should return the same atom instance (merged)
            expect(added1).toBe(added2);
            // Truth values should be merged
            expect(added1.truthValue.strength).toBeCloseTo(0.785, 2);
        });

        it("should remove atoms from atomspace", async () => {
            const concept = new ConceptNode("test-concept");
            await atomSpace.addAtom(concept);
            
            const removed = await atomSpace.removeAtom(concept.id);
            
            expect(removed).toBe(true);
            expect(atomSpace.getAtom(concept.id)).toBeUndefined();
        });

        it("should handle capacity limits", async () => {
            const smallAtomSpace = new AtomSpace({maxAtoms: 2});
            
            await smallAtomSpace.addAtom(new ConceptNode("concept1"));
            await smallAtomSpace.addAtom(new ConceptNode("concept2"));
            
            await expect(smallAtomSpace.addAtom(new ConceptNode("concept3")))
                .rejects.toThrow("AtomSpace capacity exceeded");
                
            await smallAtomSpace.dispose();
        });
    });

    describe("Querying", () => {
        beforeEach(async () => {
            // Add test atoms
            await atomSpace.addAtom(new ConceptNode("cat", new TruthValue(0.9, 0.8)));
            await atomSpace.addAtom(new ConceptNode("dog", new TruthValue(0.8, 0.9)));
            await atomSpace.addAtom(new PredicateNode("loves"));
            
            const cat = atomSpace.queryAtoms({type: AtomType.ConceptNode, name: "cat"})[0];
            const dog = atomSpace.queryAtoms({type: AtomType.ConceptNode, name: "dog"})[0];
            const animal = new ConceptNode("animal");
            
            await atomSpace.addAtom(animal);
            await atomSpace.addAtom(new InheritanceLink(cat, animal));
            await atomSpace.addAtom(new InheritanceLink(dog, animal));
        });

        it("should query atoms by type", () => {
            const concepts = atomSpace.queryAtoms({type: AtomType.ConceptNode});
            expect(concepts.length).toBe(3); // cat, dog, animal
            
            const predicates = atomSpace.queryAtoms({type: AtomType.PredicateNode});
            expect(predicates.length).toBe(1);
        });

        it("should query atoms by name", () => {
            const catAtoms = atomSpace.queryAtoms({name: "cat"});
            expect(catAtoms.length).toBe(1);
            expect(catAtoms[0].name).toBe("cat");
        });

        it("should query atoms by name pattern", () => {
            const animalPattern = atomSpace.queryAtoms({name: /^(cat|dog)$/});
            expect(animalPattern.length).toBe(2);
        });

        it("should query atoms by truth value threshold", () => {
            const highTruth = atomSpace.queryAtoms({truthValueThreshold: 0.85});
            expect(highTruth.length).toBe(1); // Only cat with 0.9 strength
            expect(highTruth[0].name).toBe("cat");
        });

        it("should query atoms with incoming links", () => {
            const atomsWithIncoming = atomSpace.queryAtoms({hasIncoming: true});
            expect(atomsWithIncoming.length).toBe(3); // cat, dog, animal (all have incoming inheritance links)
        });

        it("should query atoms with outgoing links", () => {
            const atomsWithOutgoing = atomSpace.queryAtoms({hasOutgoing: true});
            expect(atomsWithOutgoing.length).toBe(2); // The two inheritance links
        });

        it("should query by arity", () => {
            const binaryLinks = atomSpace.queryAtoms({arityEquals: 2});
            expect(binaryLinks.length).toBe(2); // The two inheritance links
        });

        it("should combine multiple query criteria", () => {
            const query: AtomQuery = {
                type: AtomType.ConceptNode,
                truthValueThreshold: 0.75,
                hasIncoming: true
            };
            
            const results = atomSpace.queryAtoms(query);
            expect(results.length).toBeGreaterThanOrEqual(2); // At least cat and dog meet criteria
        });
    });

    describe("Attentional Focus", () => {
        it("should manage attentional focus based on attention values", async () => {
            const highAttention = new ConceptNode("important", 
                new TruthValue(), 
                new AttentionValue(150, 50, 25)
            );
            const lowAttention = new ConceptNode("unimportant", 
                new TruthValue(), 
                new AttentionValue(50, 25, 10)
            );
            
            await atomSpace.addAtom(highAttention);
            await atomSpace.addAtom(lowAttention);
            
            const focusAtoms = atomSpace.getAttentionalFocus();
            expect(focusAtoms.length).toBe(1);
            expect(focusAtoms[0]).toBe(highAttention);
        });

        it("should sort attentional focus by STI", async () => {
            const atom1 = new ConceptNode("first", new TruthValue(), new AttentionValue(120));
            const atom2 = new ConceptNode("second", new TruthValue(), new AttentionValue(150));
            const atom3 = new ConceptNode("third", new TruthValue(), new AttentionValue(110));
            
            await atomSpace.addAtom(atom1);
            await atomSpace.addAtom(atom2);
            await atomSpace.addAtom(atom3);
            
            const focusAtoms = atomSpace.getAttentionalFocus();
            expect(focusAtoms.length).toBe(3);
            expect(focusAtoms[0]).toBe(atom2); // Highest STI first
            expect(focusAtoms[1]).toBe(atom1);
            expect(focusAtoms[2]).toBe(atom3);
        });
    });

    describe("Statistics", () => {
        it("should provide accurate statistics", async () => {
            // Add various types of atoms
            await atomSpace.addAtom(new ConceptNode("concept1"));
            await atomSpace.addAtom(new ConceptNode("concept2"));
            await atomSpace.addAtom(new PredicateNode("predicate1"));
            
            const concept1 = atomSpace.queryAtoms({name: "concept1"})[0];
            const concept2 = atomSpace.queryAtoms({name: "concept2"})[0];
            await atomSpace.addAtom(new InheritanceLink(concept1, concept2));
            
            const stats = atomSpace.getStatistics();
            
            expect(stats.totalAtoms).toBe(4);
            expect(stats.nodeCount).toBe(3);
            expect(stats.linkCount).toBe(1);
            expect(stats.agenticAtomCount).toBe(0);
        });

        it("should calculate average values correctly", async () => {
            await atomSpace.addAtom(new ConceptNode("test1", 
                new TruthValue(0.8, 0.9), 
                new AttentionValue(100)
            ));
            await atomSpace.addAtom(new ConceptNode("test2", 
                new TruthValue(0.6, 0.7), 
                new AttentionValue(200)
            ));
            
            const stats = atomSpace.getStatistics();
            
            expect(stats.averageTruthValue).toBe(0.7);
            expect(stats.averageAttention).toBe(150);
        });
    });

    describe("Clear and Dispose", () => {
        it("should clear all atoms", async () => {
            await atomSpace.addAtom(new ConceptNode("test1"));
            await atomSpace.addAtom(new ConceptNode("test2"));
            
            expect(atomSpace.getStatistics().totalAtoms).toBe(2);
            
            await atomSpace.clear();
            
            expect(atomSpace.getStatistics().totalAtoms).toBe(0);
        });

        it("should dispose properly", async () => {
            await atomSpace.addAtom(new ConceptNode("test"));
            
            await atomSpace.dispose();
            
            expect(atomSpace.getStatistics().totalAtoms).toBe(0);
        });
    });
});