/**
 * CivilizationSystem — handles settlement building, territory expansion,
 * building types (house, farm, barracks, mine, temple, wall, academy, market, forge),
 * tiered buildings, resource costs, and tech/culture progression.
 */
import { getRace } from '../data/races.js';

// ─── BUILDING DEFINITIONS ────────────────────────────────────────────
const BUILDING_DEFS = {
    house:          { maxPerSettlement: -1, baseCost: { wood: 5 },  popReq: 3,  tierReq: 0, color: null,     description: 'Nhà ở' },
    farm:           { maxPerSettlement: -1, baseCost: { wood: 3 },  popReq: 5,  tierReq: 0, color: 0x8B7355, description: 'Trang trại' },
    mine:           { maxPerSettlement: 2,  baseCost: { wood: 5 },  popReq: 8,  tierReq: 1, color: 0x555555, description: 'Mỏ' },
    barracks:       { maxPerSettlement: 1,  baseCost: { stone: 10, gold: 5 },   popReq: 10, tierReq: 1, color: 0x6B3A3A, description: 'Doanh trại' },
    market:         { maxPerSettlement: 3,  baseCost: { wood: 10, stone: 5, gold: 10 }, popReq: 20, tierReq: 1, color: 0xD4AF37, description: 'Chợ' },
    forge:          { maxPerSettlement: 2,  baseCost: { stone: 8, wood: 3 },    popReq: 25, tierReq: 2, color: 0x4A4A4A, description: 'Lò rèn' },
    temple:         { maxPerSettlement: 1,  baseCost: { stone: 10, gold: 30 },  popReq: 20, tierReq: 2, color: 0xCCA43B, description: 'Đền thờ (+2 max houses, religion boost)' },
    academy:        { maxPerSettlement: 1,  baseCost: { stone: 8, gold: 15 },   popReq: 40, tierReq: 3, color: 0x4169E1, description: 'Học viện' },
    port:           { maxPerSettlement: 1,  baseCost: { wood: 10, stone: 5 },   popReq: 20, tierReq: 2, color: 0x8B4513, description: 'Cảng' },
    watch_tower:    { maxPerSettlement: 2,  baseCost: { stone: 20, gold: 5 },   popReq: 12, tierReq: 1, color: 0x888888, description: 'Tháp canh (bắn arrow)' },
    library:        { maxPerSettlement: 1,  baseCost: { stone: 10, gold: 30 },  popReq: 30, tierReq: 2, color: 0x6A5ACD, description: 'Thư viện (knowledge boost)' },
    windmill:       { maxPerSettlement: 1,  baseCost: { stone: 8, gold: 10 },   popReq: 15, tierReq: 1, color: 0xDEB887, description: 'Cối xay gió (tạo arable land)' },
    training_dummy: { maxPerSettlement: 1,  baseCost: { stone: 5, wood: 5 },    popReq: 10, tierReq: 1, color: 0xA0522D, description: 'Bục luyện tập (combat XP)' },
    statue:         { maxPerSettlement: 3,  baseCost: { stone: 5, gold: 25 },   popReq: 15, tierReq: 2, color: 0xC0C0C0, description: 'Tượng (happiness boost)' },
    stockpile:      { maxPerSettlement: 1,  baseCost: {},                      popReq: 5,  tierReq: 0, color: 0x8B6914, description: 'Kho chứa (miễn phí)' },
    town_hall:      { maxPerSettlement: 1,  baseCost: { wood: 10, stone: 5 },   popReq: 10, tierReq: 1, color: null,     description: 'Tòa thị chính' },
    village_center: { maxPerSettlement: 1,  baseCost: {},                      popReq: 0,  tierReq: 0, color: null,     description: 'Trung tâm làng' },
    wall:           { maxPerSettlement: -1, baseCost: { wood: 5, stone: 15 },   popReq: 15, tierReq: 1, color: 0x888888, description: 'Tường thành' }
};

// Legacy alias for backward compatibility
const BUILDING_TYPES = BUILDING_DEFS;

// ─── TIER DEFINITIONS ────────────────────────────────────────────────
const TIER_MAX = { house: 7, town_hall: 3, port: 2 };

const HOUSE_CAPS = [0, 2, 4, 6, 10, 15, 20, 30]; // index = tier
const HOUSE_TIER_COST = [
    null,
    { wood: 5 },
    { wood: 8, stone: 3 },
    { wood: 10, stone: 5 },
    { wood: 15, stone: 10, gold: 5 },
    { wood: 20, stone: 15, gold: 15 },
    { stone: 25, gold: 20, metal: 5 },
    { stone: 30, gold: 30, metal: 10 }
];

const TOWN_HALL_TIER_COST = [
    null,
    { wood: 10, stone: 5 },
    { stone: 15, gold: 20 },
    { stone: 20, gold: 30, metal: 10 }
];

const PORT_TIER_COST = [
    null,
    { stone: 10 },
    { stone: 10, gold: 6 }
];

export class CivilizationSystem {
    update(gameState, tick) {
        const { settlementManager, worldMap, entityManager } = gameState;

        // Run every 15 ticks
        if (tick % 15 !== 0) return;

        for (const settlement of settlementManager.getAll()) {
            const race = getRace(settlement.raceId);

            // Check if settlement is dead (no units)
            const aliveUnits = entityManager.getBySettlement(settlement.id);
            if (aliveUnits.length === 0 && settlement.age > 10) {
                settlement.alive = false;
                continue;
            }

            // === BUILD PRIORITY ===
            const housingCap = this.getHousingCapacity(settlement);

            // 1. Houses (when population approaches housing capacity)
            if (settlement.population >= housingCap - 2 &&
                this.canAffordDef(settlement, 'house') &&
                this.withinMaxLimit(settlement, 'house')) {
                this.buildStructure(gameState, worldMap, settlement, 'house', race);
            }

            // 2. Stockpile (free, build early for +50 storage)
            if (settlement.tier >= 0 &&
                this.countBuildings(settlement, 'stockpile') < 1) {
                this.buildStructure(gameState, worldMap, settlement, 'stockpile', race);
            }

            // 3. Farms (food production boost)
            if (settlement.tier >= 0 && settlement.food < settlement.population * 5 &&
                this.countBuildings(settlement, 'farm') < settlement.tier + 3 &&
                this.canAffordDef(settlement, 'farm') &&
                this.withinMaxLimit(settlement, 'farm')) {
                this.buildStructure(gameState, worldMap, settlement, 'farm', race);
            }

            // 4. Mine (stone/metal production)
            if (settlement.tier >= 1 && settlement.stone < 50 &&
                this.countBuildings(settlement, 'mine') < settlement.tier + 1 &&
                this.canAffordDef(settlement, 'mine') &&
                this.withinMaxLimit(settlement, 'mine')) {
                this.buildStructure(gameState, worldMap, settlement, 'mine', race);
            }

            // 5. Barracks (military)
            if (settlement.tier >= 1 &&
                this.countBuildings(settlement, 'barracks') < settlement.tier &&
                this.canAffordDef(settlement, 'barracks') &&
                this.withinMaxLimit(settlement, 'barracks')) {
                this.buildStructure(gameState, worldMap, settlement, 'barracks', race);
            }

            // 6. Market (resource exchange / wealth)
            if (settlement.tier >= 1 &&
                this.countBuildings(settlement, 'market') < Math.floor(settlement.tier / 2) + 1 &&
                this.canAffordDef(settlement, 'market') &&
                this.withinMaxLimit(settlement, 'market')) {
                this.buildStructure(gameState, worldMap, settlement, 'market', race);
            }

            // 7. Watch Tower (defense)
            if (settlement.tier >= 1 &&
                this.countBuildings(settlement, 'watch_tower') < 2 &&
                this.canAffordDef(settlement, 'watch_tower')) {
                this.buildStructure(gameState, worldMap, settlement, 'watch_tower', race);
            }

            // 8. Windmill (arable land creation)
            if (settlement.tier >= 1 &&
                this.countBuildings(settlement, 'windmill') < 1 &&
                this.canAffordDef(settlement, 'windmill')) {
                this.buildStructure(gameState, worldMap, settlement, 'windmill', race);
            }

            // 9. Training Dummy (combat XP)
            if (settlement.tier >= 1 &&
                this.countBuildings(settlement, 'training_dummy') < 1 &&
                this.canAffordDef(settlement, 'training_dummy')) {
                this.buildStructure(gameState, worldMap, settlement, 'training_dummy', race);
            }

            // 10. Town Hall (governance)
            if (settlement.tier >= 1 &&
                this.countBuildings(settlement, 'town_hall') < 1 &&
                this.canAffordDef(settlement, 'town_hall')) {
                this.buildStructure(gameState, worldMap, settlement, 'town_hall', race);
            }

            // 11. Temple (culture boost)
            if (settlement.tier >= 2 &&
                this.countBuildings(settlement, 'temple') < 1 + (settlement.tier >= 4 ? 1 : 0) &&
                this.canAffordDef(settlement, 'temple') &&
                this.withinMaxLimit(settlement, 'temple')) {
                this.buildStructure(gameState, worldMap, settlement, 'temple', race);
            }

            // 12. Forge (weaponry / metal)
            if (settlement.tier >= 2 &&
                this.countBuildings(settlement, 'forge') < settlement.tier - 1 &&
                this.canAffordDef(settlement, 'forge') &&
                this.withinMaxLimit(settlement, 'forge')) {
                this.buildStructure(gameState, worldMap, settlement, 'forge', race);
            }

            // 13. Library (knowledge boost)
            if (settlement.tier >= 2 &&
                this.countBuildings(settlement, 'library') < 1 &&
                this.canAffordDef(settlement, 'library')) {
                this.buildStructure(gameState, worldMap, settlement, 'library', race);
            }

            // 14. Statue (happiness boost)
            if (settlement.tier >= 2 &&
                this.countBuildings(settlement, 'statue') < 3 &&
                this.canAffordDef(settlement, 'statue')) {
                this.buildStructure(gameState, worldMap, settlement, 'statue', race);
            }

            // 15. Academy (tech level boost)
            if (settlement.tier >= 3 &&
                this.countBuildings(settlement, 'academy') < 1 &&
                this.canAffordDef(settlement, 'academy')) {
                this.buildStructure(gameState, worldMap, settlement, 'academy', race);
            }

            // 16. Port (boats and sea trade)
            if (settlement.tier >= 2 &&
                this.countBuildings(settlement, 'port') < 1 + (settlement.tier >= 4 ? 1 : 0) &&
                this.canAffordDef(settlement, 'port')) {
                this.buildPort(gameState, worldMap, settlement, race);
            }

            // === TERRITORY EXPANSION ===
            if (tick % 50 === 0) {
                this.expandTerritory(settlement, worldMap);
            }

            // === RESOURCE BONUS FROM BUILDINGS ===
            if (tick % 30 === 0) {
                const farms = this.countBuildings(settlement, 'farm');
                settlement.food += farms * 4;

                const mines = this.countBuildings(settlement, 'mine');
                settlement.stone += mines * 3;
                if (settlement.tier >= 2) settlement.metal += mines * 1;

                const markets = this.countBuildings(settlement, 'market');
                settlement.gold += markets * 2;
                
                const forges = this.countBuildings(settlement, 'forge');
                if (settlement.metal >= forges) {
                    settlement.metal -= forges;
                    settlement.gold += forges * 3;
                }

                const tmpls = this.countBuildings(settlement, 'temple');
                settlement.culturalLevel += tmpls * 0.5 + (markets * 0.1);

                const academies = this.countBuildings(settlement, 'academy');
                settlement.techLevel += academies * 1.0;
            }

            // === NEW BUILDING EFFECTS ===
            this.applyBuildingEffects(gameState, settlement, tick);

            // === AGE ===
            settlement.age++;

            // === BUILDING TIER UPGRADES (every 200 ticks) ===
            if (tick % 200 === 0 && settlement.tier >= 1) {
                this.upgradeBuildings(gameState, settlement);
            }

            // === UPDATE HOUSING CAPACITY ===
            settlement.maxPopulation = this.getHousingCapacity(settlement);

            // === MIGRATION (every 150 ticks) ===
            if (tick % 150 === 0) {
                this.migratePopulation(gameState, settlement);
            }

            // === COLONIZATION ===
            if (gameState.worldLawsSystem.isEnabled('diplomacy') && settlement.tier >= 1 && settlement.population >= 30 && settlement.food >= 100 && tick % 200 === 0) {
                this.foundColony(gameState, settlement, race);
            }
        }
    }

    foundColony(gameState, parentSettlement, race) {
        const { worldMap, settlementManager, entityManager } = gameState;

        // Base distance grows with tier
        const baseDist = 20 + (parentSettlement.tier * 10);
        let colonyPos = null;
        for(let i = 0; i < 30; i++) { // try 30 times
            const angle = Math.random() * Math.PI * 2;
            const dist = baseDist + Math.random() * 20;
            const tx = Math.floor(parentSettlement.tileX + Math.cos(angle) * dist);
            const ty = Math.floor(parentSettlement.tileY + Math.sin(angle) * dist);
            
            if (worldMap.isBuildable(tx, ty)) {
                // Ensure it's not in someone else's territory
                let valid = true;
                for (const other of settlementManager.getAll()) {
                    if (other.territory.has(`${tx},${ty}`)) {
                        valid = false;
                        break;
                    }
                }
                if (valid) {
                    colonyPos = {x: tx, y: ty};
                    break;
                }
            }
        }

        if (colonyPos) {
            parentSettlement.food -= 50;
            parentSettlement.population -= 10;
            
            // Create settlement in the SAME kingdom!
            const colony = settlementManager.create({
                raceId: parentSettlement.raceId,
                kingdomId: parentSettlement.kingdomId,
                tileX: colonyPos.x,
                tileY: colonyPos.y,
            });

            if (gameState.historySystem) {
                gameState.historySystem.logEvent(
                    'settlement_founded',
                    `Khu định cư ${colony.name} được thành lập`,
                    { settlementId: colony.id, parentSettlementId: parentSettlement.id }
                );
            }

            worldMap.placeBuilding(colonyPos.x, colonyPos.y, {
                type: 'village_center',
                raceId: parentSettlement.raceId,
                settlementId: colony.id,
                color: race.buildingColor
            });

            // Move 5 units to the colony
            const units = entityManager.getBySettlement(parentSettlement.id);
            for(let i=0; i<5 && i<units.length; i++) {
                const u = units[i];
                // Update bySettlement index
                const oldSet = entityManager.bySettlement.get(parentSettlement.id);
                if (oldSet) oldSet.delete(u.id);
                if (!entityManager.bySettlement.has(colony.id)) {
                    entityManager.bySettlement.set(colony.id, new Set());
                }
                entityManager.bySettlement.get(colony.id).add(u.id);
                u.settlementId = colony.id;
                u.tileX = colonyPos.x;
                u.tileY = colonyPos.y;
                const px = worldMap.tileToPixel(colonyPos.x, colonyPos.y);
                u.x = px.x;
                u.y = px.y;
            }
        }
    }

    canAfford(settlement, buildingType) {
        return (settlement.wood >= (buildingType.cost || buildingType.baseCost || {}).wood || 0) &&
               (settlement.stone >= (buildingType.cost || buildingType.baseCost || {}).stone || 0) &&
               (settlement.gold >= (buildingType.cost || buildingType.baseCost || {}).gold || 0) &&
               (settlement.metal >= (buildingType.cost || buildingType.baseCost || {}).metal || 0) &&
               settlement.population >= buildingType.popReq &&
               settlement.tier >= buildingType.tierReq;
    }

    /** Check if settlement can afford a building by type name */
    canAffordDef(settlement, type) {
        const def = BUILDING_DEFS[type];
        if (!def) return false;
        const cost = def.baseCost || {};
        return (settlement.wood >= (cost.wood || 0)) &&
               (settlement.stone >= (cost.stone || 0)) &&
               (settlement.gold >= (cost.gold || 0)) &&
               (settlement.metal >= (cost.metal || 0)) &&
               settlement.population >= def.popReq &&
               settlement.tier >= def.tierReq;
    }

    /** Check if a building type hasn't exceeded maxPerSettlement */
    withinMaxLimit(settlement, type) {
        const def = BUILDING_DEFS[type];
        if (!def) return false;
        if (def.maxPerSettlement === -1) return true;
        return this.countBuildings(settlement, type) < def.maxPerSettlement;
    }

    /** Calculate total housing capacity from house tiers + temple bonuses */
    getHousingCapacity(settlement) {
        let cap = 2; // base
        for (const b of settlement.buildings) {
            if (b.type === 'house') {
                const tier = b.tier || 1;
                cap += HOUSE_CAPS[tier] || 2;
            }
            if (b.type === 'temple') {
                cap += 2;
            }
        }
        // Town hall tier bonus: extra capacity
        const townHall = settlement.buildings.find(b => b.type === 'town_hall');
        if (townHall) {
            const thTier = townHall.tier || 1;
            cap += (thTier - 1) * 5;
        }
        return cap;
    }

    countBuildings(settlement, type) {
        return settlement.buildings.filter(b => b.type === type).length;
    }

    /** Deduct resource cost from settlement */
    deductCost(settlement, cost) {
        settlement.wood -= cost.wood || 0;
        settlement.stone -= cost.stone || 0;
        settlement.gold -= cost.gold || 0;
        settlement.metal -= cost.metal || 0;
    }

    buildStructure(gameState, worldMap, settlement, type, race) {
        const buildPos = this.findBuildSpot(worldMap, settlement);
        if (!buildPos) return;

        const bt = BUILDING_DEFS[type];
        if (!bt) return;

        // Deduct cost
        this.deductCost(settlement, bt.baseCost || {});

        const buildingColor = bt.color || race.buildingColor;

        // Determine initial tier and capacity
        let tier = 1;
        let capacity = 2;
        if (type === 'house') {
            tier = 1;
            capacity = HOUSE_CAPS[1];
        } else if (type === 'town_hall') {
            tier = 1;
        } else if (type === 'port') {
            tier = 1;
        }

        worldMap.placeBuilding(buildPos.x, buildPos.y, {
            type,
            raceId: settlement.raceId,
            settlementId: settlement.id,
            color: buildingColor,
            tier
        });

        settlement.buildings.push({ ...buildPos, type, tier, capacity });

        if (gameState.historySystem) {
            gameState.historySystem.logEvent(
                'building_built',
                `${type} (T${tier}) xây tại ${settlement.name}`,
                { type, tier, settlementId: settlement.id }
            );
        }

        // Update housing capacity
        if (type === 'house') {
            settlement.houses++;
        }
        settlement.maxPopulation = this.getHousingCapacity(settlement);

        // Stockpile: immediate +50 max storage for all resources
        if (type === 'stockpile') {
            settlement._stockpileBonus = (settlement._stockpileBonus || 0) + 50;
        }
    }

    findBuildSpot(worldMap, settlement) {
        // Spiral outward from settlement center, further based on tier
        const maxRadius = Math.min(10 + settlement.tier * 2, 20);
        for (let r = 1; r <= maxRadius; r++) {
            // Shuffle the shell to avoid directional bias
            const candidates = [];
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    candidates.push({ x: settlement.tileX + dx, y: settlement.tileY + dy });
                }
            }
            // Shuffle
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
            for (const pos of candidates) {
                if (worldMap.isBuildable(pos.x, pos.y)) {
                    return pos;
                }
            }
        }
        return null;
    }

    buildPort(gameState, worldMap, settlement, race) {
        // Need to find shallow water adjacent to land
        const buildPos = this.findPortSpot(worldMap, settlement);
        if (!buildPos) return; // No coastal access

        const bt = BUILDING_DEFS.port;

        // Deduct cost
        this.deductCost(settlement, bt.baseCost || {});

        worldMap.placeBuilding(buildPos.x, buildPos.y, {
            type: 'port',
            raceId: settlement.raceId,
            settlementId: settlement.id,
            color: bt.color,
            tier: 1
        });

        // Add 5 trade range!
        settlement.techLevel += 5;
        settlement.buildings.push({ ...buildPos, type: 'port', tier: 1, capacity: 1 });
    }

    findPortSpot(worldMap, settlement) {
        const maxRadius = Math.min(10 + settlement.tier * 2, 25);
        for (let r = 1; r <= maxRadius; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    const x = settlement.tileX + dx;
                    const y = settlement.tileY + dy;
                    
                    if (worldMap.getTile(x, y) === 'shallow_water' && !worldMap.getBuilding(x, y)) {
                        // Ensure there is at least one adjacent deep_water tile and one adjacent buildable tile
                        let hasDeepWater = false;
                        let hasLand = false;
                        
                        const DIRS = [[0,1],[1,0],[0,-1],[-1,0]];
                        for (const dir of DIRS) {
                            const nx = x + dir[0];
                            const ny = y + dir[1];
                            const tile = worldMap.getTile(nx, ny);
                            if (tile === 'deep_water') hasDeepWater = true;
                            if (worldMap.getTileInfo(nx, ny).buildable) hasLand = true;
                        }
                        
                        if (hasDeepWater && hasLand) {
                            return { x, y };
                        }
                    }
                }
            }
        }
        return null;
    }

    expandTerritory(settlement, worldMap) {
        // Territory expansion scales with population, tier, and cultural level
        const bonusRadius = Math.floor(settlement.culturalLevel / 10);
        const radius = 3 + settlement.tier * 3 + Math.floor(settlement.population / 10) + bonusRadius;
        const maxRadius = Math.min(radius, 25);
        for (let dy = -maxRadius; dy <= maxRadius; dy++) {
            for (let dx = -maxRadius; dx <= maxRadius; dx++) {
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist <= maxRadius) {
                    const x = settlement.tileX + dx;
                    const y = settlement.tileY + dy;
                    if (x >= 0 && x < worldMap.width && y >= 0 && y < worldMap.height) {
                        settlement.territory.add(`${x},${y}`);
                    }
                }
            }
        }
    }

    // ─── BUILDING UPGRADES (TIER SYSTEM) ───────────────────────────
    upgradeBuildings(gameState, settlement) {
        for (const b of settlement.buildings) {
            const maxTier = TIER_MAX[b.type] || 1;
            if (!b.tier) b.tier = 1;
            if (b.tier >= maxTier) continue;

            // Only upgrade with some probability
            if (Math.random() > 0.3) continue;

            if (this.upgradeBuilding(gameState, settlement, b)) {
                break; // one upgrade per cycle
            }
        }
    }

    /** Upgrade a single building to the next tier */
    upgradeBuilding(gameState, settlement, building) {
        const maxTier = TIER_MAX[building.type] || 1;
        if (!building.tier) building.tier = 1;
        if (building.tier >= maxTier) return false;

        // Get upgrade cost
        let cost = null;
        if (building.type === 'house') {
            cost = HOUSE_TIER_COST[building.tier + 1];
        } else if (building.type === 'town_hall') {
            cost = TOWN_HALL_TIER_COST[building.tier + 1];
        } else if (building.type === 'port') {
            cost = PORT_TIER_COST[building.tier + 1];
        }

        if (!cost) return false;

        // Check if settlement can afford
        if ((settlement.wood < (cost.wood || 0)) ||
            (settlement.stone < (cost.stone || 0)) ||
            (settlement.gold < (cost.gold || 0)) ||
            (settlement.metal < (cost.metal || 0))) {
            return false;
        }

        // Deduct and upgrade
        this.deductCost(settlement, cost);
        building.tier++;

        // Apply tier bonuses
        if (building.type === 'house') {
            building.capacity = HOUSE_CAPS[building.tier] || 2;
        } else if (building.type === 'town_hall') {
            // Town hall tier bonus applied via getHousingCapacity
        } else if (building.type === 'port') {
            building.capacity = building.tier === 2 ? 3 : 1;
        }

        // Update world map building data
        if (building.x !== undefined && building.y !== undefined) {
            const existing = this._getWorldMapBuilding(gameState, building.x, building.y);
            if (existing) {
                existing.tier = building.tier;
            }
        }

        return true;
    }

    /** Helper to get building from world map (lazy, uses closure) */
    _getWorldMapBuilding(gameState, x, y) {
        return gameState.worldMap.getBuilding(x, y);
    }

    /** Apply periodic effects from special buildings */
    applyBuildingEffects(gameState, settlement, tick) {
        // Temple: +2 max houses capacity (handled in getHousingCapacity)

        // Library: +20% tech point generation (every 30 ticks)
        if (tick % 30 === 0) {
            const libraries = this.countBuildings(settlement, 'library');
            if (libraries > 0) {
                settlement.techLevel += libraries * 0.2; // 20% boost
            }
        }

        // Windmill: every 30 ticks, convert adjacent dirt/burned tiles to grass (arable land), range 3
        if (tick % 30 === 0 && gameState.worldMap) {
            const windmills = settlement.buildings.filter(b => b.type === 'windmill');
            for (const wm of windmills) {
                if (wm.x === undefined || wm.y === undefined) continue;
                const range = 3;
                for (let dy = -range; dy <= range; dy++) {
                    for (let dx = -range; dx <= range; dx++) {
                        const tx = wm.x + dx;
                        const ty = wm.y + dy;
                        const tile = gameState.worldMap.getTile(tx, ty);
                        if (tile === 'dirt' || tile === 'burned' || tile === 'sand') {
                            if (Math.random() < 0.15) {
                                gameState.worldMap.setTile(tx, ty, 'grass');
                                gameState.dirtyTiles.push({ x: tx, y: ty });
                                // Track as arable
                                if (!settlement.arableTiles) settlement.arableTiles = new Set();
                                settlement.arableTiles.add(`${tx},${ty}`);
                            }
                        }
                    }
                }
            }
        }

        // Training Dummy: every 20 ticks, give +1 XP to idle units in settlement
        if (tick % 20 === 0 && gameState.entityManager) {
            const dummies = this.countBuildings(settlement, 'training_dummy');
            if (dummies > 0) {
                const units = gameState.entityManager.getBySettlement(settlement.id);
                for (const u of units) {
                    if (u.state === 'idle' && u.xp !== undefined) {
                        u.xp += 1;
                    }
                }
            }
        }

        // Statue: +2 loyalty every 50 ticks
        if (tick % 50 === 0) {
            const statues = this.countBuildings(settlement, 'statue');
            if (statues > 0) {
                settlement.loyalty = Math.min(100, (settlement.loyalty || 100) + statues * 2);
            }
        }

        // Stockpile: +50 max storage (applied on build, stored in _stockpileBonus)
        // Effect is passive — just increase resource caps if used elsewhere
    }

    // ─── MIGRATION ────────────────────────────────────────────────
    migratePopulation(gameState, sourceSettlement) {
        const { settlementManager, entityManager } = gameState;

        // Only migrate if source is overcrowded
        if (sourceSettlement.population < sourceSettlement.maxPopulation * 0.8) return;

        // Find same-kingdom settlements that are underpopulated
        for (const target of settlementManager.getAll()) {
            if (target.id === sourceSettlement.id) continue;
            if (target.kingdomId !== sourceSettlement.kingdomId) continue;
            if (target.population >= target.maxPopulation * 0.4) continue;

            // Check distance
            const dist = Math.abs(target.tileX - sourceSettlement.tileX) + Math.abs(target.tileY - sourceSettlement.tileY);
            if (dist > 30) continue;

            // Move 1-2 units
            const units = entityManager.getBySettlement(sourceSettlement.id);
            const moveCount = Math.min(2, units.length);
            for (let i = 0; i < moveCount; i++) {
                const u = units[i];
                u.settlementId = target.id;
                // Update indices
                const oldSet = entityManager.bySettlement.get(sourceSettlement.id);
                if (oldSet) oldSet.delete(u.id);
                if (!entityManager.bySettlement.has(target.id)) {
                    entityManager.bySettlement.set(target.id, new Set());
                }
                entityManager.bySettlement.get(target.id).add(u.id);
            }
            break; // Only migrate to one target per tick
        }
    }
}
