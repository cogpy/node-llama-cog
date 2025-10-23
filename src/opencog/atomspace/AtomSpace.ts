import {Atom, AtomType, TruthValue, AttentionValue} from "../atoms/Atom.js";
import {AgenticAtom, CognitiveCapability} from "../agents/AgenticAtom.js";
import {EventEmitter} from "events";

/**
 * Query interface for searching atoms in the atomspace
 */
export interface AtomQuery {
    type?: AtomType | AtomType[];
    name?: string | RegExp;
    truthValueThreshold?: number;
    attentionValueThreshold?: number;
    hasIncoming?: boolean;
    hasOutgoing?: boolean;
    arityEquals?: number;
    arityGreaterThan?: number;
    arityLessThan?: number;
    includeCognitive?: boolean;
}

/**
 * Statistics about the atomspace
 */
export interface AtomSpaceStatistics {
    totalAtoms: number;
    nodeCount: number;
    linkCount: number;
    agenticAtomCount: number;
    averageAttention: number;
    averageTruthValue: number;
    memoryUsageBytes: number;
}

/**
 * Configuration for atomspace behavior
 */
export interface AtomSpaceConfig {
    maxAtoms?: number;
    enableGarbageCollection?: boolean;
    attentionDecayRate?: number;
    truthValueDecayRate?: number;
    indexingEnabled?: boolean;
    persistenceEnabled?: boolean;
}

/**
 * AtomSpace - The main hypergraph container for all atoms
 * Provides thread-safe operations and efficient indexing for distributed cognition
 */
export class AtomSpace extends EventEmitter {
    private _atoms: Map<string, Atom> = new Map();
    private _atomsByType: Map<AtomType, Set<string>> = new Map();
    private _atomsByName: Map<string, Set<string>> = new Map();
    private _incomingIndex: Map<string, Set<string>> = new Map();
    private _outgoingIndex: Map<string, Set<string>> = new Map();
    private _agenticAtoms: Map<string, AgenticAtom> = new Map();
    private _config: Required<AtomSpaceConfig>;
    private _isActive: boolean = true;
    private _attentionalFocus: Set<string> = new Set();
    private readonly _lock = new Map<string, Promise<void>>();

    constructor(config: AtomSpaceConfig = {}) {
        super();
        
        this._config = {
            maxAtoms: 1000000, // 1M atoms max
            enableGarbageCollection: true,
            attentionDecayRate: 0.01,
            truthValueDecayRate: 0.001,
            indexingEnabled: true,
            persistenceEnabled: false,
            ...config
        };

        this.initializeAtomSpace();
    }

    /**
     * Initialize the atomspace and start background processes
     */
    private initializeAtomSpace(): void {
        // Initialize type indexes
        for (const atomType of Object.values(AtomType)) {
            this._atomsByType.set(atomType, new Set());
        }

        // Start background processes
        if (this._config.enableGarbageCollection) {
            this.startGarbageCollection();
        }

        this.startAttentionDecay();
        
        console.log("AtomSpace initialized with configuration:", this._config);
    }

    /**
     * Add an atom to the atomspace
     */
    async addAtom<T extends Atom>(atom: T): Promise<T> {
        // Check capacity
        if (this._atoms.size >= this._config.maxAtoms) {
            throw new Error("AtomSpace capacity exceeded");
        }

        // Check if equivalent atom already exists
        const existingAtom = await this.findEquivalentAtom(atom);
        if (existingAtom) {
            // Merge truth values and return existing atom
            existingAtom.truthValue = existingAtom.truthValue.merge(atom.truthValue);
            this.emit('atomUpdated', existingAtom);
            return existingAtom as T;
        }

        // Acquire lock for this atom
        await this.acquireLock(atom.id);

        try {
            // Add to main collection
            this._atoms.set(atom.id, atom);

            // Update indexes
            if (this._config.indexingEnabled) {
                this.updateIndexes(atom, 'add');
            }

            // Handle agentic atoms specially
            if (atom instanceof AgenticAtom) {
                this._agenticAtoms.set(atom.id, atom);
            }

            // Add to attentional focus if high attention
            if (atom.attentionValue.sti > 100) {
                this._attentionalFocus.add(atom.id);
            }

            this.emit('atomAdded', atom);
            console.log(`Added atom ${atom.id} (${atom.type}) to atomspace`);
            
            return atom;
        } finally {
            this.releaseLock(atom.id);
        }
    }

    /**
     * Remove an atom from the atomspace
     */
    async removeAtom(atomId: string): Promise<boolean> {
        await this.acquireLock(atomId);

        try {
            const atom = this._atoms.get(atomId);
            if (!atom) {
                return false;
            }

            // Remove from indexes
            if (this._config.indexingEnabled) {
                this.updateIndexes(atom, 'remove');
            }

            // Clean up incoming/outgoing references
            this.cleanupAtomReferences(atom);

            // Remove from collections
            this._atoms.delete(atomId);
            this._agenticAtoms.delete(atomId);
            this._attentionalFocus.delete(atomId);

            this.emit('atomRemoved', atom);
            console.log(`Removed atom ${atomId} from atomspace`);
            
            return true;
        } finally {
            this.releaseLock(atomId);
        }
    }

    /**
     * Get an atom by ID
     */
    getAtom(atomId: string): Atom | undefined {
        return this._atoms.get(atomId);
    }

    /**
     * Get an agentic atom by ID
     */
    getAgenticAtom(atomId: string): AgenticAtom | undefined {
        return this._agenticAtoms.get(atomId);
    }

    /**
     * Query atoms based on criteria
     */
    queryAtoms(query: AtomQuery): Atom[] {
        let candidates = new Set<string>();

        // Start with type filtering if specified
        if (query.type) {
            const types = Array.isArray(query.type) ? query.type : [query.type];
            for (const type of types) {
                const atomsOfType = this._atomsByType.get(type) || new Set();
                if (candidates.size === 0) {
                    candidates = new Set(atomsOfType);
                } else {
                    candidates = new Set([...candidates].filter(id => atomsOfType.has(id)));
                }
            }
        } else {
            candidates = new Set(this._atoms.keys());
        }

        // Apply other filters
        const results: Atom[] = [];
        for (const atomId of candidates) {
            const atom = this._atoms.get(atomId);
            if (!atom) continue;

            // Name filter
            if (query.name) {
                if (typeof query.name === 'string') {
                    if (atom.name !== query.name) continue;
                } else {
                    if (!atom.name || !query.name.test(atom.name)) continue;
                }
            }

            // Truth value threshold
            if (query.truthValueThreshold !== undefined) {
                if (atom.truthValue.strength < query.truthValueThreshold) continue;
            }

            // Attention value threshold
            if (query.attentionValueThreshold !== undefined) {
                if (atom.attentionValue.sti < query.attentionValueThreshold) continue;
            }

            // Incoming/outgoing checks
            if (query.hasIncoming !== undefined) {
                const hasIncoming = atom.incomingSet.size > 0;
                if (query.hasIncoming !== hasIncoming) continue;
            }

            if (query.hasOutgoing !== undefined) {
                const hasOutgoing = atom.outgoingSet.length > 0;
                if (query.hasOutgoing !== hasOutgoing) continue;
            }

            // Arity checks
            if (query.arityEquals !== undefined) {
                if (atom.arity !== query.arityEquals) continue;
            }

            if (query.arityGreaterThan !== undefined) {
                if (atom.arity <= query.arityGreaterThan) continue;
            }

            if (query.arityLessThan !== undefined) {
                if (atom.arity >= query.arityLessThan) continue;
            }

            // Cognitive filter
            if (query.includeCognitive !== undefined) {
                const isCognitive = atom instanceof AgenticAtom;
                if (query.includeCognitive !== isCognitive) continue;
            }

            results.push(atom);
        }

        return results;
    }

    /**
     * Get all agentic atoms with specific capabilities
     */
    getAgenticAtomsByCapability(capability: CognitiveCapability): AgenticAtom[] {
        const results: AgenticAtom[] = [];
        for (const agenticAtom of this._agenticAtoms.values()) {
            if (agenticAtom.hasCapability(capability)) {
                results.push(agenticAtom);
            }
        }
        return results;
    }

    /**
     * Get atoms currently in attentional focus
     */
    getAttentionalFocus(): Atom[] {
        const results: Atom[] = [];
        for (const atomId of this._attentionalFocus) {
            const atom = this._atoms.get(atomId);
            if (atom) {
                results.push(atom);
            }
        }
        return results.sort((a, b) => b.attentionValue.sti - a.attentionValue.sti);
    }

    /**
     * Update attentional focus based on current attention values
     */
    updateAttentionalFocus(): void {
        this._attentionalFocus.clear();
        
        // Add atoms with high attention to focus
        for (const atom of this._atoms.values()) {
            if (atom.attentionValue.sti > 100) {
                this._attentionalFocus.add(atom.id);
            }
        }
        
        this.emit('attentionalFocusUpdated', this._attentionalFocus.size);
    }

    /**
     * Get statistics about the atomspace
     */
    getStatistics(): AtomSpaceStatistics {
        let nodeCount = 0;
        let linkCount = 0;
        let totalAttention = 0;
        let totalTruthValue = 0;

        for (const atom of this._atoms.values()) {
            if (atom.isNode) nodeCount++;
            if (atom.isLink) linkCount++;
            totalAttention += atom.attentionValue.sti;
            totalTruthValue += atom.truthValue.strength;
        }

        const totalAtoms = this._atoms.size;
        
        return {
            totalAtoms,
            nodeCount,
            linkCount,
            agenticAtomCount: this._agenticAtoms.size,
            averageAttention: totalAtoms > 0 ? totalAttention / totalAtoms : 0,
            averageTruthValue: totalAtoms > 0 ? totalTruthValue / totalAtoms : 0,
            memoryUsageBytes: this.estimateMemoryUsage()
        };
    }

    /**
     * Find an equivalent atom (same structure, different instance)
     */
    private async findEquivalentAtom(newAtom: Atom): Promise<Atom | null> {
        const hashCode = newAtom.hashCode();
        
        // Check atoms of the same type and name first
        const atomsOfType = this._atomsByType.get(newAtom.type) || new Set();
        
        for (const atomId of atomsOfType) {
            const atom = this._atoms.get(atomId);
            if (atom && atom.hashCode() === hashCode && atom.equals(newAtom)) {
                return atom;
            }
        }
        
        return null;
    }

    /**
     * Update indexes when adding or removing atoms
     */
    private updateIndexes(atom: Atom, operation: 'add' | 'remove'): void {
        if (operation === 'add') {
            // Type index
            let typeSet = this._atomsByType.get(atom.type);
            if (!typeSet) {
                typeSet = new Set();
                this._atomsByType.set(atom.type, typeSet);
            }
            typeSet.add(atom.id);

            // Name index
            if (atom.name) {
                let nameSet = this._atomsByName.get(atom.name);
                if (!nameSet) {
                    nameSet = new Set();
                    this._atomsByName.set(atom.name, nameSet);
                }
                nameSet.add(atom.id);
            }

            // Incoming/outgoing indexes
            for (const incomingAtom of atom.incomingSet) {
                let incomingSet = this._incomingIndex.get(incomingAtom.id);
                if (!incomingSet) {
                    incomingSet = new Set();
                    this._incomingIndex.set(incomingAtom.id, incomingSet);
                }
                incomingSet.add(atom.id);
            }

            for (const outgoingAtom of atom.outgoingSet) {
                let outgoingSet = this._outgoingIndex.get(atom.id);
                if (!outgoingSet) {
                    outgoingSet = new Set();
                    this._outgoingIndex.set(atom.id, outgoingSet);
                }
                outgoingSet.add(outgoingAtom.id);
            }
        } else {
            // Remove from indexes
            this._atomsByType.get(atom.type)?.delete(atom.id);
            
            if (atom.name) {
                this._atomsByName.get(atom.name)?.delete(atom.id);
            }
            
            this._incomingIndex.delete(atom.id);
            this._outgoingIndex.delete(atom.id);
        }
    }

    /**
     * Clean up references when removing an atom
     */
    private cleanupAtomReferences(atom: Atom): void {
        // Remove from incoming sets of outgoing atoms
        for (const outgoingAtom of atom.outgoingSet) {
            outgoingAtom.removeIncoming(atom);
        }

        // Remove from outgoing sets of incoming atoms
        for (const incomingAtom of atom.incomingSet) {
            // This requires access to the Link's setOutgoing method
            // In a full implementation, you'd need proper reference tracking
        }
    }

    /**
     * Start garbage collection process
     */
    private startGarbageCollection(): void {
        setInterval(() => {
            this.runGarbageCollection();
        }, 60000); // Every minute
    }

    /**
     * Run garbage collection to remove low-attention atoms
     */
    private runGarbageCollection(): void {
        const lowAttentionThreshold = -100;
        const atomsToRemove: string[] = [];

        for (const [atomId, atom] of this._atoms) {
            if (atom.attentionValue.sti < lowAttentionThreshold && 
                atom.incomingSet.size === 0) {
                atomsToRemove.push(atomId);
            }
        }

        for (const atomId of atomsToRemove) {
            this.removeAtom(atomId);
        }

        if (atomsToRemove.length > 0) {
            console.log(`Garbage collection removed ${atomsToRemove.length} atoms`);
        }
    }

    /**
     * Start attention decay process
     */
    private startAttentionDecay(): void {
        setInterval(() => {
            this.decayAttentionValues();
        }, 10000); // Every 10 seconds
    }

    /**
     * Decay attention values over time
     */
    private decayAttentionValues(): void {
        for (const atom of this._atoms.values()) {
            const currentAV = atom.attentionValue;
            const newSTI = currentAV.sti * (1 - this._config.attentionDecayRate);
            
            atom.attentionValue = new AttentionValue(
                Math.max(-1000, newSTI), // Minimum STI
                currentAV.lti,
                currentAV.vlti
            );
        }

        this.updateAttentionalFocus();
    }

    /**
     * Acquire a lock for thread-safe operations
     */
    private async acquireLock(atomId: string): Promise<void> {
        while (this._lock.has(atomId)) {
            await this._lock.get(atomId);
        }

        let resolveLock: () => void;
        const lockPromise = new Promise<void>(resolve => {
            resolveLock = resolve;
        });

        this._lock.set(atomId, lockPromise);
        
        // Store the resolve function for later use
        (lockPromise as any)._resolve = resolveLock!;
    }

    /**
     * Release a lock for thread-safe operations
     */
    private releaseLock(atomId: string): void {
        const lockPromise = this._lock.get(atomId);
        if (lockPromise) {
            this._lock.delete(atomId);
            (lockPromise as any)._resolve();
        }
    }

    /**
     * Estimate memory usage of the atomspace
     */
    private estimateMemoryUsage(): number {
        // Rough estimation based on atom count and structure
        const avgAtomSize = 1024; // bytes per atom (rough estimate)
        return this._atoms.size * avgAtomSize;
    }

    /**
     * Clear all atoms from the atomspace
     */
    async clear(): Promise<void> {
        // Dispose all agentic atoms
        for (const agenticAtom of this._agenticAtoms.values()) {
            await agenticAtom.dispose();
        }

        // Clear all collections
        this._atoms.clear();
        this._agenticAtoms.clear();
        this._atomsByType.clear();
        this._atomsByName.clear();
        this._incomingIndex.clear();
        this._outgoingIndex.clear();
        this._attentionalFocus.clear();

        // Reinitialize type indexes
        for (const atomType of Object.values(AtomType)) {
            this._atomsByType.set(atomType, new Set());
        }

        this.emit('atomSpaceCleared');
        console.log("AtomSpace cleared");
    }

    /**
     * Dispose of the atomspace and clean up resources
     */
    async dispose(): Promise<void> {
        this._isActive = false;
        await this.clear();
        this.removeAllListeners();
        console.log("AtomSpace disposed");
    }
}