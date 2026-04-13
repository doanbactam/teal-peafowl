/**
 * SaveManager — handles saving and loading game state to/from localStorage.
 * Saves: world tiles, entities, settlements, kingdoms, animals, ships, age, buildings, fire/plague tiles.
 */

const SAVE_KEY = 'deusbox_save';
const SAVE_VERSION = 2;

export class SaveManager {
    /**
     * Save the current game state
     * @param {object} gameState
     * @param {number} tickCount
     * @param {object} extra - { worldAge, ageSystem }
     */
    static save(gameState, tickCount, extra = {}) {
        const { worldMap, entityManager, settlementManager, kingdomManager, animalSystem, navalSystem, ageSystem } = gameState;

        const saveData = {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            tick: tickCount,
            worldAge: extra.worldAge || 0,

            // World
            world: {
                width: worldMap.width,
                height: worldMap.height,
                tileSize: worldMap.tileSize,
                tiles: worldMap.tiles,
                seed: worldMap.seed || 0,
                fireTiles: Array.from(worldMap.fireTiles || []),
                plagueTiles: Array.from(worldMap.plagueTiles || []),
                radiationTiles: Array.from(worldMap.radiationTiles || []),
                buildingGrid: Array.from((worldMap.buildingGrid || new Map()).entries()).map(([key, val]) => [key, val])
            },

            // Entities
            entities: [],

            // Settlements
            settlements: [],

            // Kingdoms
            kingdoms: [],

            // Animals
            animals: [],

            // Ships
            ships: [],

            // Age system
            ageState: null,

            // ID counters for safe restoration
            maxEntityId: 0,
            maxSettlementId: 0,
            maxKingdomId: 0,

            // Roads
            roads: null
        };

        // Track max IDs
        for (const entity of entityManager.getAllAlive()) {
            if (entity.id > saveData.maxEntityId) saveData.maxEntityId = entity.id;
        }
        for (const settlement of settlementManager.getAll()) {
            if (settlement.id > saveData.maxSettlementId) saveData.maxSettlementId = settlement.id;
        }
        if (kingdomManager) {
            for (const kingdom of kingdomManager.getAll()) {
                if (kingdom.id > saveData.maxKingdomId) saveData.maxKingdomId = kingdom.id;
            }
        }

        // Serialize entities
        for (const entity of entityManager.getAllAlive()) {
            saveData.entities.push({
                id: entity.id,
                tileX: entity.tileX,
                tileY: entity.tileY,
                x: entity.x,
                y: entity.y,
                raceId: entity.raceId,
                settlementId: entity.settlementId,
                kingdomId: entity.kingdomId,
                hp: entity.hp,
                maxHp: entity.maxHp,
                attack: entity.attack,
                defense: entity.defense,
                speed: entity.speed,
                age: entity.age,
                maxAge: entity.maxAge,
                color: entity.color,
                state: entity.state === 'fighting' ? 'idle' : entity.state,
                isLeader: entity.isLeader || false,
                isKing: entity.isKing || false,
                traits: entity.traits || [],
                hunger: entity.hunger,
                subspeciesId: entity.subspeciesId || null,
                happiness: entity.happiness !== undefined ? entity.happiness : 50
            });
        }

        // Serialize settlements
        for (const settlement of settlementManager.getAll()) {
            saveData.settlements.push({
                id: settlement.id,
                name: settlement.name,
                raceId: settlement.raceId,
                kingdomId: settlement.kingdomId,
                tileX: settlement.tileX,
                tileY: settlement.tileY,
                food: settlement.food,
                wood: settlement.wood,
                stone: settlement.stone,
                metal: settlement.metal,
                gold: settlement.gold,
                population: settlement.population,
                maxPopulation: settlement.maxPopulation,
                houses: settlement.houses,
                tier: settlement.tier,
                techLevel: settlement.techLevel,
                culturalLevel: settlement.culturalLevel,
                territory: Array.from(settlement.territory),
                buildings: settlement.buildings,
                age: settlement.age,
                loyalty: settlement.loyalty
            });
        }

        // Serialize kingdoms
        if (kingdomManager) {
            for (const kingdom of kingdomManager.getAll()) {
                saveData.kingdoms.push({
                    id: kingdom.id,
                    name: kingdom.name,
                    raceId: kingdom.raceId,
                    color: kingdom.color,
                    kingId: kingdom.kingId,
                    capitalId: kingdom.capitalId,
                    age: kingdom.age,
                    alive: kingdom.alive,
                    enemies: Array.from(kingdom.enemies || []),
                    allies: Array.from(kingdom.allies || []),
                    culture: kingdom.culture ? kingdom.culture.id : null,
                    cultureLevel: kingdom.cultureLevel || 1
                });
            }
        }

        // Serialize animals
        if (animalSystem) {
            for (const animal of animalSystem.getAllAlive()) {
                saveData.animals.push({
                    id: animal.id,
                    type: animal.type,
                    tileX: animal.tileX,
                    tileY: animal.tileY,
                    x: animal.x,
                    y: animal.y,
                    hp: animal.hp,
                    maxHp: animal.maxHp,
                    attack: animal.attack,
                    defense: animal.defense,
                    speed: animal.speed,
                    color: animal.color,
                    hunger: animal.hunger,
                    traits: animal.traits || []
                });
            }
        }

        // Serialize ships
        if (navalSystem && navalSystem.getAllShips) {
            for (const ship of navalSystem.getAllShips()) {
                saveData.ships.push({
                    id: ship.id,
                    type: ship.type,
                    x: ship.x,
                    y: ship.y,
                    tileX: ship.tileX,
                    tileY: ship.tileY,
                    color: ship.color,
                    fromSettlementId: ship.fromSettlementId,
                    toSettlementId: ship.toSettlementId
                });
            }
        }

        // Serialize age system
        if (ageSystem) {
            saveData.ageState = ageSystem.getState ? ageSystem.getState() : {
                currentAgeIndex: ageSystem.currentAgeIndex || 0,
                ageTick: ageSystem.ageTick || 0
            };
        }

            // Serialize roads
        const { roadSystem } = gameState;
        if (roadSystem && roadSystem.getState) {
            saveData.roads = roadSystem.getState();
        }

        // Serialize equipment system
        const { equipmentSystem } = gameState;
        if (equipmentSystem && equipmentSystem.getSaveData) {
            saveData.equipment = equipmentSystem.getSaveData();
        }

        // Serialize world laws
        const { worldLawsSystem } = gameState;
        if (worldLawsSystem && worldLawsSystem.getSaveData) {
            saveData.worldLaws = worldLawsSystem.getSaveData();
        }

        // Serialize history
        const { historySystem } = gameState;
        if (historySystem && historySystem.getSaveData) {
            saveData.history = historySystem.getSaveData();
        }

        try {
            const json = JSON.stringify(saveData);
            localStorage.setItem(SAVE_KEY, json);
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    }

    /**
     * Load game state from localStorage
     * @returns {object|null} Save data or null if no save exists
     */
    static load() {
        try {
            const json = localStorage.getItem(SAVE_KEY);
            if (!json) return null;

            const saveData = JSON.parse(json);

            // Version check - support v1 and v2
            if (saveData.version > SAVE_VERSION) {
                console.warn('Incompatible save version');
                return null;
            }

            return saveData;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    }

    /**
     * Check if a save exists
     */
    static hasSave() {
        return localStorage.getItem(SAVE_KEY) !== null;
    }

    /**
     * Delete the save
     */
    static deleteSave() {
        localStorage.removeItem(SAVE_KEY);
    }

    /**
     * Get save info without full deserialization
     */
    static getSaveInfo() {
        try {
            const json = localStorage.getItem(SAVE_KEY);
            if (!json) return null;

            const data = JSON.parse(json);
            return {
                timestamp: data.timestamp,
                tick: data.tick,
                mapSize: `${data.world.width}x${data.world.height}`,
                entities: data.entities.length,
                settlements: data.settlements.length,
                formattedDate: new Date(data.timestamp).toLocaleString()
            };
        } catch (e) {
            return null;
        }
    }
}
