import { applyTraits, generateRandomTraits } from '../data/Traits.js';
import { generateUnitName } from '../data/names.js';

let nextEntityId = 1;

export function setNextEntityId(id) { if (id >= nextEntityId) nextEntityId = id + 1; }
export function getNextEntityId() { return nextEntityId; }

export class EntityManager {
    constructor() {
        /** @type {Map<number, object>} */
        this.entities = new Map();

        /** @type {Map<string, Set<number>>} entity IDs grouped by race */
        this.byRace = new Map();

        /** @type {Map<number, Set<number>>} entity IDs grouped by settlement ID */
        this.bySettlement = new Map();
    }

    /**
     * Create a new entity with the given properties
     * @param {object} props
     * @returns {object} The created entity
     */
    create(props) {
        const id = nextEntityId++;
        const entity = {
            id,
            // Position (tile coords)
            tileX: 0,
            tileY: 0,
            // Pixel position (for smooth movement)
            x: 0,
            y: 0,
            // Movement target
            targetX: -1,
            targetY: -1,
            path: null,
            pathIndex: 0,

            // Identity
            raceId: 'human',
            settlementId: -1,
            name: '',
            traits: props.hasOwnProperty('traits') ? props.traits : generateRandomTraits(),

            // Stats
            hp: 100,
            maxHp: 100,
            attack: 10,
            defense: 8,
            speed: 1.0,
            age: 0,
            maxAge: 80,
            dodge: 0,
            accuracy: 90,
            attackSpeed: 1.0,
            critChance: 5,
            critMultiplier: 1.5,
            mana: 0,
            maxMana: 0,
            stamina: 100,
            maxStamina: 100,

            // State
            state: 'idle', // idle, moving, gathering, building, fighting, fleeing, dead
            task: null,
            taskTimer: 0,

            // Inventory
            carrying: null, // { type: 'wood', amount: 5 }
            carryCapacity: 10,

            // Combat
            attackCooldown: 0,
            targetEntityId: -1,

            // Visual
            color: 0xffffff,
            alive: true,

            // Happiness (-100 to 100)
            happiness: 50,

            // Flags
            isLeader: false,

            // Subspecies & Genes
            subspecies: null, // { id, name, colorMod, statMods, traits }
            subspeciesId: null, // string id for save/load lookup

            // Family system
            familyId: null,       // Family group ID
            parentIds: [],        // [parentId1, parentId2]
            children: [],         // [childId1, childId2, ...]
            generation: 1,        // Generation number

            ...props,

            // Non-overridable
            _id: id
        };

        applyTraits(entity);

        // Auto-generate name if empty
        if (!entity.name || entity.name === '') {
            entity.name = generateUnitName(entity.raceId);
        }

        this.entities.set(id, entity);

        // Index by race
        if (!this.byRace.has(entity.raceId)) {
            this.byRace.set(entity.raceId, new Set());
        }
        this.byRace.get(entity.raceId).add(id);

        // Index by settlement
        if (entity.settlementId >= 0) {
            if (!this.bySettlement.has(entity.settlementId)) {
                this.bySettlement.set(entity.settlementId, new Set());
            }
            this.bySettlement.get(entity.settlementId).add(id);
        }

        return entity;
    }

    /**
     * Remove an entity
     */
    remove(id) {
        const entity = this.entities.get(id);
        if (!entity) return;

        // Remove from indices
        const raceSet = this.byRace.get(entity.raceId);
        if (raceSet) raceSet.delete(id);

        const settlementSet = this.bySettlement.get(entity.settlementId);
        if (settlementSet) settlementSet.delete(id);

        this.entities.delete(id);
    }

    /**
     * Get entity by ID
     */
    get(id) {
        return this.entities.get(id) || null;
    }

    /**
     * Get all living entities
     */
    getAllAlive() {
        const result = [];
        for (const e of this.entities.values()) {
            if (e.alive) result.push(e);
        }
        return result;
    }

    /**
     * Get entities of a specific race
     */
    getByRace(raceId) {
        const ids = this.byRace.get(raceId);
        if (!ids) return [];
        const result = [];
        for (const id of ids) {
            const e = this.entities.get(id);
            if (e && e.alive) result.push(e);
        }
        return result;
    }

    /**
     * Get entities belonging to a settlement
     */
    getBySettlement(settlementId) {
        const ids = this.bySettlement.get(settlementId);
        if (!ids) return [];
        const result = [];
        for (const id of ids) {
            const e = this.entities.get(id);
            if (e && e.alive) result.push(e);
        }
        return result;
    }

    /**
     * Find nearest entity of a race within range
     */
    findNearest(x, y, raceId, maxDist = 20) {
        let nearest = null;
        let nearestDist = maxDist * maxDist;

        const candidates = raceId ? this.getByRace(raceId) : this.getAllAlive();

        for (const e of candidates) {
            const dx = e.tileX - x;
            const dy = e.tileY - y;
            const dist = dx * dx + dy * dy;
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = e;
            }
        }

        return nearest;
    }

    /**
     * Find nearest hostile entity (accounting for race hostilities, kingdom wars, and bloodlust)
     */
    findNearestHostile(entity, hostileRaces, gameState, maxDist = 12) {
        let nearest = null;
        let nearestDist = maxDist * maxDist;
        
        const isBloodlust = entity.traits && entity.traits.includes('bloodlust');
        const entitySettlement = gameState.settlementManager ? gameState.settlementManager.get(entity.settlementId) : null;
        const entityKingdom = entitySettlement ? gameState.kingdomManager.get(entitySettlement.kingdomId) : null;

        for (const e of this.getAllAlive()) {
            if (e.id === entity.id) continue;
            
            const dx = e.tileX - entity.tileX;
            const dy = e.tileY - entity.tileY;
            const dist = dx * dx + dy * dy;
            
            if (dist >= nearestDist) continue;

            let isEnemy = false;

            // 1. Bloodlust targets anyone
            if (isBloodlust) {
                isEnemy = true;
            } 
            // 2. Base race hostility
            else if (hostileRaces.includes(e.raceId)) {
                isEnemy = true;
            }
            // 3. Kingdom Wars
            else if (entityKingdom && e.settlementId !== -1) {
                const targetSettlement = gameState.settlementManager.get(e.settlementId);
                const targetKingdom = targetSettlement ? gameState.kingdomManager.get(targetSettlement.kingdomId) : null;
                
                if (targetKingdom && entityKingdom.enemies.has(targetKingdom.id)) {
                    isEnemy = true;
                }
            }

            if (isEnemy) {
                nearestDist = dist;
                nearest = e;
            }
        }

        return nearest;
    }

    /**
     * Count alive entities
     */
    countAlive() {
        let count = 0;
        for (const e of this.entities.values()) {
            if (e.alive) count++;
        }
        return count;
    }

    /**
     * Count entities for a race
     */
    countByRace(raceId) {
        const ids = this.byRace.get(raceId);
        if (!ids) return 0;
        let count = 0;
        for (const id of ids) {
            const e = this.entities.get(id);
            if (e && e.alive) count++;
        }
        return count;
    }
}
