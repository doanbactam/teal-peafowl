/**
 * Settlement — represents a village/town/city belonging to a race.
 * Manages population, resources, buildings, and territory.
 */

let nextSettlementId = 1;

export function setNextSettlementId(id) { if (id >= nextSettlementId) nextSettlementId = id + 1; }
export function getNextSettlementId() { return nextSettlementId; }

export class SettlementManager {
    constructor() {
        /** @type {Map<number, object>} */
        this.settlements = new Map();
    }

    /**
     * Create a new settlement
     */
    create(props) {
        const id = nextSettlementId++;
        const settlement = {
            id,
            name: props.name || `Village ${id}`,
            raceId: props.raceId || 'human',
            kingdomId: props.kingdomId || -1,
            tileX: props.tileX || 0,
            tileY: props.tileY || 0,

            // Resources
            food: 50,
            wood: 30,
            stone: 10,
            metal: 0,
            gold: 0,

            // New resource types
            copper: 0,
            bronze: 0,
            iron: 0,
            steel: 0,
            mythril: 0,
            adamantine: 0,
            gems: 0,

            // Food types
            bread: 0,
            meat: 0,
            fish: 0,

            // Farming
            farmPlots: [],   // [{ x, y, stage, crop, growthTimer }]
            arableTiles: null, // Set — deserialized on load

            // Population tracking
            population: 0,
            maxPopulation: 10,
            houses: 1,

            // Growth
            tier: 0, // 0=village, 1=town, 2=city, 3=capital
            techLevel: 0,
            culturalLevel: 0,
            loyalty: 100, // Loyalty to kingdom

            // Territory — tiles claimed by this settlement
            territory: new Set(),
            buildings: [],

            // State
            alive: true,
            age: 0,
            lastBirthTick: 0,
            lastBuildTick: 0,

            ...props,
            _id: id
        };

        this.settlements.set(id, settlement);
        return settlement;
    }

    get(id) {
        return this.settlements.get(id) || null;
    }

    remove(id) {
        this.settlements.delete(id);
    }

    getAll() {
        return Array.from(this.settlements.values()).filter(s => s.alive);
    }

    getByRace(raceId) {
        return this.getAll().filter(s => s.raceId === raceId);
    }

    /**
     * Upgrade settlement tier based on population and culture thresholds
     */
    checkUpgrade(settlement) {
        const pop = settlement.population;
        const culture = settlement.culturalLevel;
        let newTier = 0;
        
        // Tier 4: Empire (Pop 150+, Culture 50+)
        if (pop >= 150 && culture >= 50) newTier = 4;
        // Tier 3: Capital / Medieval (Pop 50+, Culture 20+)
        else if (pop >= 50 && culture >= 15) newTier = 3;
        // Tier 2: City / Iron Age (Pop 25+, Culture 5+)
        else if (pop >= 25 && culture >= 5) newTier = 2;
        // Tier 1: Town / Bronze Age (Pop 10+)
        else if (pop >= 10) newTier = 1;

        if (newTier > settlement.tier) {
            settlement.tier = newTier;
            // Increase max population exponentially based on tier
            settlement.maxPopulation = [10, 30, 80, 200, 500][newTier];
            return true;
        }
        return false;
    }

    /**
     * Get settlement tier name
     */
    static getTierName(tier) {
        return ['Làng mạc (Đồ Đá)', 'Thị trấn (Đồ Đồng)', 'Thành phố (Đồ Sắt)', 'Thủ đô (Phong Kiến)', 'Đế Quốc (Hoàng Kim)'][tier] || 'Làng mạc';
    }

    /**
     * Serialize a settlement for save data.
     */
    getSaveData(settlement) {
        return {
            ...settlement,
            // Convert non-serializable types
            territory: Array.from(settlement.territory || []),
            arableTiles: settlement.arableTiles ? Array.from(settlement.arableTiles) : [],
            // Strip internal fields
            _id: undefined
        };
    }

    /**
     * Restore a settlement from save data.
     */
    restoreSaveData(data) {
        // Ensure new resource fields exist for backwards compatibility
        const settlement = {
            copper: 0, bronze: 0, iron: 0, steel: 0,
            mythril: 0, adamantine: 0, gems: 0,
            bread: 0, meat: 0, fish: 0,
            farmPlots: [],
            ...data
        };

        // Restore Set types
        settlement.territory = new Set(settlement.territory || []);
        settlement.arableTiles = new Set(settlement.arableTiles || []);

        // Restore tier on buildings (backwards compatibility — default tier 1)
        if (settlement.buildings) {
            for (const b of settlement.buildings) {
                if (!b.tier) b.tier = 1;
                if (b.type === 'house' && !b.capacity) b.capacity = 2;
            }
        }

        // Restore stockpile bonus
        if (!settlement._stockpileBonus) settlement._stockpileBonus = 0;

        this.settlements.set(settlement.id, settlement);
        return settlement;
    }
}
