import {describe, it, expect} from "vitest";
import {
    Atom,
    AtomType, 
    TruthValue,
    AttentionValue,
    ConceptNode,
    PredicateNode,
    InheritanceLink,
    CognitiveSynergyLink
} from "../../src/opencog/atoms/Atom.js";

describe("Atom System", () => {
    describe("TruthValue", () => {
        it("should create truth value with valid strength and confidence", () => {
            const tv = new TruthValue(0.8, 0.9);
            expect(tv.strength).toBe(0.8);
            expect(tv.confidence).toBe(0.9);
        });

        it("should throw error for invalid strength", () => {
            expect(() => new TruthValue(-0.1, 0.5)).toThrow("Strength must be between 0 and 1");
            expect(() => new TruthValue(1.1, 0.5)).toThrow("Strength must be between 0 and 1");
        });

        it("should throw error for invalid confidence", () => {
            expect(() => new TruthValue(0.5, -0.1)).toThrow("Confidence must be between 0 and 1");
            expect(() => new TruthValue(0.5, 1.1)).toThrow("Confidence must be between 0 and 1");
        });

        it("should merge truth values correctly", () => {
            const tv1 = new TruthValue(0.7, 0.8);
            const tv2 = new TruthValue(0.9, 0.6);
            const merged = tv1.merge(tv2);
            
            expect(merged.strength).toBeCloseTo(0.785, 2);
            expect(merged.confidence).toBe(1.0); // Clamped to maximum
        });
    });

    describe("AttentionValue", () => {
        it("should create attention value with STI, LTI, and VLTI", () => {
            const av = new AttentionValue(100, 50, 25);
            expect(av.sti).toBe(100);
            expect(av.lti).toBe(50);
            expect(av.vlti).toBe(25);
        });

        it("should have string representation", () => {
            const av = new AttentionValue(100, 50, 25);
            expect(av.toString()).toBe("AV(100, 50, 25)");
        });
    });

    describe("ConceptNode", () => {
        it("should create concept node with name", () => {
            const concept = new ConceptNode("test-concept");
            expect(concept.name).toBe("test-concept");
            expect(concept.type).toBe(AtomType.ConceptNode);
            expect(concept.isNode).toBe(true);
            expect(concept.isLink).toBe(false);
            expect(concept.arity).toBe(0);
        });

        it("should have unique ID", () => {
            const concept1 = new ConceptNode("test");
            const concept2 = new ConceptNode("test");
            expect(concept1.id).not.toBe(concept2.id);
        });
    });

    describe("InheritanceLink", () => {
        it("should create inheritance link between atoms", () => {
            const child = new ConceptNode("cat");
            const parent = new ConceptNode("animal");
            const inheritance = new InheritanceLink(child, parent);
            
            expect(inheritance.type).toBe(AtomType.InheritanceLink);
            expect(inheritance.isLink).toBe(true);
            expect(inheritance.arity).toBe(2);
            expect(inheritance.child).toBe(child);
            expect(inheritance.parent).toBe(parent);
        });

        it("should update incoming sets correctly", () => {
            const child = new ConceptNode("cat");
            const parent = new ConceptNode("animal");
            const inheritance = new InheritanceLink(child, parent);
            
            expect(child.incomingSet.has(inheritance)).toBe(true);
            expect(parent.incomingSet.has(inheritance)).toBe(true);
        });
    });

    describe("CognitiveSynergyLink", () => {
        it("should create cognitive synergy link with participants", () => {
            const agent1 = new ConceptNode("agent1");
            const agent2 = new ConceptNode("agent2");
            const synergyLink = new CognitiveSynergyLink(
                [agent1, agent2],
                "synergy-1",
                new TruthValue(0.9, 0.8)
            );
            
            expect(synergyLink.type).toBe(AtomType.CognitiveSynergyLink);
            expect(synergyLink.participants.length).toBe(2);
            expect(synergyLink.synergyStrength).toBe(0.9);
        });
    });

    describe("Atom Equality", () => {
        it("should correctly identify equal atoms", () => {
            const concept1 = new ConceptNode("test");
            const concept2 = new ConceptNode("test");
            expect(concept1.equals(concept2)).toBe(true);
        });

        it("should correctly identify different atoms", () => {
            const concept1 = new ConceptNode("test1");
            const concept2 = new ConceptNode("test2");
            expect(concept1.equals(concept2)).toBe(false);
        });

        it("should generate consistent hash codes", () => {
            const concept1 = new ConceptNode("test");
            const concept2 = new ConceptNode("test");
            expect(concept1.hashCode()).toBe(concept2.hashCode());
        });
    });

    describe("Atom String Representation", () => {
        it("should generate correct string for nodes", () => {
            const concept = new ConceptNode("test");
            expect(concept.toString()).toBe('(ConceptNode "test")');
        });

        it("should generate correct string for links", () => {
            const child = new ConceptNode("cat");
            const parent = new ConceptNode("animal");
            const inheritance = new InheritanceLink(child, parent);
            
            const expectedString = '(InheritanceLink (ConceptNode "cat") (ConceptNode "animal"))';
            expect(inheritance.toString()).toBe(expectedString);
        });

        it("should include truth value in string when confidence > 0", () => {
            const concept = new ConceptNode("test", new TruthValue(0.8, 0.9));
            expect(concept.toString()).toBe('(ConceptNode "test" TV(0.800, 0.900))');
        });
    });
});