import {nanoid} from "nanoid";
import type {LlamaModel, LlamaContext} from "../../index.js";

/**
 * AtomType enumeration defining different types of atoms in the atomspace
 */
export enum AtomType {
    // Nodes
    ConceptNode = "ConceptNode",
    PredicateNode = "PredicateNode", 
    VariableNode = "VariableNode",
    NumberNode = "NumberNode",
    AgenticNode = "AgenticNode", // New: Agent-enabled atoms with inference
    
    // Links  
    ListLink = "ListLink",
    SetLink = "SetLink",
    InheritanceLink = "InheritanceLink",
    SimilarityLink = "SimilarityLink",
    EvaluationLink = "EvaluationLink",
    ExecutionLink = "ExecutionLink",
    CognitiveSynergyLink = "CognitiveSynergyLink" // New: For distributed cognition
}

/**
 * TruthValue represents the confidence and strength of an atom
 */
export class TruthValue {
    constructor(
        public readonly strength: number = 0.5,
        public readonly confidence: number = 0.0
    ) {
        if (strength < 0 || strength > 1) {
            throw new Error("Strength must be between 0 and 1");
        }
        if (confidence < 0 || confidence > 1) {
            throw new Error("Confidence must be between 0 and 1");
        }
    }

    toString(): string {
        return `TV(${this.strength.toFixed(3)}, ${this.confidence.toFixed(3)})`;
    }

    merge(other: TruthValue): TruthValue {
        // Simple merge formula - can be enhanced with more sophisticated PLN logic
        const newStrength = (this.strength * this.confidence + other.strength * other.confidence) / 
                           (this.confidence + other.confidence);
        const newConfidence = Math.min(1.0, this.confidence + other.confidence);
        return new TruthValue(newStrength, newConfidence);
    }
}

/**
 * AttentionValue represents the importance and urgency of an atom in the system
 */
export class AttentionValue {
    constructor(
        public readonly sti: number = 0, // Short-term importance
        public readonly lti: number = 0, // Long-term importance  
        public readonly vlti: number = 0 // Very long-term importance
    ) {}

    toString(): string {
        return `AV(${this.sti}, ${this.lti}, ${this.vlti})`;
    }
}

/**
 * Base Atom class - fundamental unit of the atomspace hypergraph
 */
export abstract class Atom {
    public readonly id: string;
    public readonly type: AtomType;
    public readonly name?: string;
    private _truthValue: TruthValue;
    private _attentionValue: AttentionValue;
    private _incomingSet: Set<Atom> = new Set();
    private _outgoingSet: Atom[] = [];
    
    constructor(
        type: AtomType,
        name?: string,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        this.id = nanoid();
        this.type = type;
        this.name = name;
        this._truthValue = truthValue;
        this._attentionValue = attentionValue;
    }

    get truthValue(): TruthValue {
        return this._truthValue;
    }

    set truthValue(tv: TruthValue) {
        this._truthValue = tv;
    }

    get attentionValue(): AttentionValue {
        return this._attentionValue;
    }

    set attentionValue(av: AttentionValue) {
        this._attentionValue = av;
    }

    get incomingSet(): ReadonlySet<Atom> {
        return this._incomingSet;
    }

    get outgoingSet(): ReadonlyArray<Atom> {
        return [...this._outgoingSet];
    }

    /**
     * Add an atom to the incoming set (atoms that reference this atom)
     */
    addIncoming(atom: Atom): void {
        this._incomingSet.add(atom);
    }

    /**
     * Remove an atom from the incoming set
     */
    removeIncoming(atom: Atom): void {
        this._incomingSet.delete(atom);
    }

    /**
     * Set the outgoing set (atoms this atom references)
     */
    protected setOutgoing(atoms: Atom[]): void {
        // Remove this atom from old outgoing atoms' incoming sets
        for (const atom of this._outgoingSet) {
            atom.removeIncoming(this);
        }
        
        this._outgoingSet = [...atoms];
        
        // Add this atom to new outgoing atoms' incoming sets
        for (const atom of this._outgoingSet) {
            atom.addIncoming(this);
        }
    }

    /**
     * Get the arity (number of outgoing atoms) of this atom
     */
    get arity(): number {
        return this._outgoingSet.length;
    }

    /**
     * Check if this atom is a node (has no outgoing set)
     */
    get isNode(): boolean {
        return this._outgoingSet.length === 0;
    }

    /**
     * Check if this atom is a link (has outgoing set)
     */
    get isLink(): boolean {
        return this._outgoingSet.length > 0;
    }

    /**
     * Generate a string representation of this atom
     */
    toString(): string {
        const nameStr = this.name ? ` "${this.name}"` : "";
        const tvStr = this._truthValue.confidence > 0 ? ` ${this._truthValue}` : "";
        
        if (this.isNode) {
            return `(${this.type}${nameStr}${tvStr})`;
        } else {
            const outgoingStr = this._outgoingSet.map(a => a.toString()).join(" ");
            return `(${this.type}${nameStr} ${outgoingStr}${tvStr})`;
        }
    }

    /**
     * Check if this atom equals another atom (by structure, not by reference)
     */
    equals(other: Atom): boolean {
        if (this.type !== other.type || this.name !== other.name) {
            return false;
        }
        
        if (this._outgoingSet.length !== other._outgoingSet.length) {
            return false;
        }
        
        for (let i = 0; i < this._outgoingSet.length; i++) {
            const thisAtom = this._outgoingSet[i];
            const otherAtom = other._outgoingSet[i];
            if (!thisAtom || !otherAtom || !thisAtom.equals(otherAtom)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get a hash code for this atom based on its structure
     */
    hashCode(): string {
        let hash = `${this.type}:${this.name || ""}`;
        if (this._outgoingSet.length > 0) {
            hash += ":" + this._outgoingSet.map(a => a.hashCode()).join(",");
        }
        return hash;
    }
}

/**
 * Node - an atom with no outgoing connections
 */
export abstract class Node extends Atom {
    constructor(
        type: AtomType,
        name?: string,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(type, name, truthValue, attentionValue);
    }
}

/**
 * Link - an atom that connects other atoms
 */
export abstract class Link extends Atom {
    constructor(
        type: AtomType,
        outgoing: Atom[] = [],
        name?: string,
        truthValue: TruthValue = new TruthValue(), 
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(type, name, truthValue, attentionValue);
        this.setOutgoing(outgoing);
    }

    /**
     * Get the nth outgoing atom
     */
    getOutgoing(n: number): Atom | undefined {
        return this.outgoingSet[n];
    }
}

/**
 * ConceptNode - represents a concept or entity
 */
export class ConceptNode extends Node {
    constructor(
        name?: string,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.ConceptNode, name, truthValue, attentionValue);
    }
}

/**
 * PredicateNode - represents a predicate or relation
 */
export class PredicateNode extends Node {
    constructor(
        name?: string,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.PredicateNode, name, truthValue, attentionValue);
    }
}

/**
 * VariableNode - represents a variable in logical expressions
 */
export class VariableNode extends Node {
    constructor(
        name?: string,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.VariableNode, name, truthValue, attentionValue);
    }
}

/**
 * NumberNode - represents a numeric value
 */
export class NumberNode extends Node {
    constructor(
        public readonly value: number,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.NumberNode, value.toString(), truthValue, attentionValue);
    }
}

/**
 * ListLink - ordered collection of atoms
 */
export class ListLink extends Link {
    constructor(
        outgoing: Atom[] = [],
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.ListLink, outgoing, undefined, truthValue, attentionValue);
    }
}

/**
 * SetLink - unordered collection of atoms
 */
export class SetLink extends Link {
    constructor(
        outgoing: Atom[] = [],
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.SetLink, outgoing, undefined, truthValue, attentionValue);
    }
}

/**
 * InheritanceLink - represents inheritance relationship A inherits from B
 */
export class InheritanceLink extends Link {
    constructor(
        child: Atom,
        parent: Atom,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.InheritanceLink, [child, parent], undefined, truthValue, attentionValue);
    }

    get child(): Atom {
        return this.getOutgoing(0)!;
    }

    get parent(): Atom {
        return this.getOutgoing(1)!;
    }
}

/**
 * SimilarityLink - represents similarity relationship between atoms
 */
export class SimilarityLink extends Link {
    constructor(
        first: Atom,
        second: Atom,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.SimilarityLink, [first, second], undefined, truthValue, attentionValue);
    }

    get first(): Atom {
        return this.getOutgoing(0)!;
    }

    get second(): Atom {
        return this.getOutgoing(1)!;
    }
}

/**
 * EvaluationLink - represents evaluation of a predicate with arguments
 */
export class EvaluationLink extends Link {
    constructor(
        predicate: Atom,
        arguments_: Atom,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.EvaluationLink, [predicate, arguments_], undefined, truthValue, attentionValue);
    }

    get predicate(): Atom {
        return this.getOutgoing(0)!;
    }

    get arguments(): Atom {
        return this.getOutgoing(1)!;
    }
}

/**
 * ExecutionLink - represents execution of a procedure with arguments
 */
export class ExecutionLink extends Link {
    constructor(
        procedure: Atom,
        arguments_: Atom,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.ExecutionLink, [procedure, arguments_], undefined, truthValue, attentionValue);
    }

    get procedure(): Atom {
        return this.getOutgoing(0)!;
    }

    get arguments(): Atom {
        return this.getOutgoing(1)!;
    }
}

/**
 * CognitiveSynergyLink - represents emergent cognitive synergy between agentic atoms
 */
export class CognitiveSynergyLink extends Link {
    constructor(
        participants: Atom[],
        name?: string,
        truthValue: TruthValue = new TruthValue(),
        attentionValue: AttentionValue = new AttentionValue()
    ) {
        super(AtomType.CognitiveSynergyLink, participants, name, truthValue, attentionValue);
    }

    get participants(): ReadonlyArray<Atom> {
        return this.outgoingSet;
    }

    get synergyStrength(): number {
        return this.truthValue.strength;
    }
}