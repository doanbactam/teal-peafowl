/**
 * ResourceSystem — handles resource gathering, food consumption,
 * farming, forge conversion, and resource delivery to settlements.
 */
import { moveEntityTo } from './MovementSystem.js';

// ─── Gathering rates ───────────────────────────────────────────
const GATHER_RATES = {
    food:   { base: 3, farmBonus: 2, windmillBonus: 3 },
    wood:   { base: 2 },
    stone:  { base: 2, mineBonus: 3 },
    copper: { base: 0, mineBonus: 1 },
    iron:   { base: 0, mineBonus: 0.5 },
    gems:   { base: 0, mineBonus: 0.1 },
    fish:   { base: 0, waterBonus: 2 }
};

// ─── Crop growth system ────────────────────────────────────────
const CROP_STAGES = ['planted', 'sprouting', 'growing', 'mature', 'harvestable'];
const CROP_GROWTH_TICKS = {
    planted: 20,
    sprouting: 15,
    growing: 15,
    mature: 10
};

export class ResourceSystem {
    update(gameState, tick) {
        const { entityManager, settlementManager, worldMap } = gameState;

        // Run every 3 ticks
        if (tick % 3 !== 0) return;

        for (const entity of entityManager.getAllAlive()) {
            const settlement = settlementManager.get(entity.settlementId);
            if (!settlement) continue;

            switch (entity.state) {
                case 'idle':
                    this.assignTask(entity, settlement, worldMap);
                    break;

                case 'moving':
                    // Check if arrived at resource target
                    if (entity.task && entity.task.target && !entity.path) {
                        const target = entity.task.target;
                        const dist = Math.abs(entity.tileX - target.x) + Math.abs(entity.tileY - target.y);
                        if (dist <= 1) {
                            entity.state = 'gathering';
                            entity.taskTimer = 0;
                        }
                    }
                    break;

                case 'gathering':
                    this.processGathering(entity, settlement, worldMap, gameState);
                    break;

                case 'returning':
                    this.processReturning(entity, settlement, worldMap);
                    break;
            }
        }

        // Settlement food consumption each tick
        if (tick % 10 === 0 && gameState.worldLawsSystem.isEnabled('hunger')) {
            for (const settlement of settlementManager.getAll()) {
                const consumed = Math.ceil(settlement.population * 0.3);
                settlement.food = Math.max(0, settlement.food - consumed);

                // Natural food production from farms/fertility
                let nearbyFertility = this.calculateFertility(worldMap, settlement.tileX, settlement.tileY);

                // AGE Impacts on Passive farming
                if (gameState.currentAgeId === 'ice') nearbyFertility = 0; // Frozen wasteland
                else if (gameState.currentAgeId === 'sun') nearbyFertility /= 2; // Drought
                else if (gameState.currentAgeId === 'dark') nearbyFertility *= 0.8; // Bad crops

                settlement.food += Math.floor(nearbyFertility * 2);

                // Farm buildings produce bread with windmill bonus
                const farmCount = settlement.buildings.filter(b => b.type === 'farm').length;
                if (farmCount > 0) {
                    let breadOutput = farmCount * (GATHER_RATES.food.farmBonus || 2);
                    if (settlement.buildings.some(b => b.type === 'windmill')) {
                        breadOutput += farmCount * (GATHER_RATES.food.windmillBonus || 3);
                    }
                    settlement.bread += breadOutput;
                }

                // Forge conversions
                this.runForgeConversions(settlement);

                // Crop growth
                this.updateFarmPlots(settlement, tick);

                // Cap resources
                settlement.food = Math.min(settlement.food, 500);
                settlement.wood = Math.min(settlement.wood, 300);
                settlement.stone = Math.min(settlement.stone, 200);
                settlement.copper = Math.min(settlement.copper, 200);
                settlement.iron = Math.min(settlement.iron, 200);
                settlement.gems = Math.min(settlement.gems, 100);
                settlement.bread = Math.min(settlement.bread, 300);
                settlement.fish = Math.min(settlement.fish, 200);
            }
        }
    }

    assignTask(entity, settlement, worldMap) {
        // Priority: food > wood > stone > copper/iron (mine) > fish

        if (settlement.food < settlement.population * 3) {
            const bestTile = this.findResourceTile(worldMap, entity.tileX, entity.tileY, ['forest', 'grass']);
            if (bestTile) {
                entity.task = { type: 'gather_food', target: bestTile };
                entity.state = 'moving';
                moveEntityTo(entity, bestTile.x, bestTile.y);
                return;
            }
        }

        if (settlement.wood < 50) {
            const forestTile = this.findResourceTile(worldMap, entity.tileX, entity.tileY, ['forest']);
            if (forestTile) {
                entity.task = { type: 'gather_wood', target: forestTile };
                entity.state = 'moving';
                moveEntityTo(entity, forestTile.x, forestTile.y);
                return;
            }
        }

        if (settlement.stone < 30) {
            const stoneTile = this.findResourceTile(worldMap, entity.tileX, entity.tileY, ['hill', 'mountain']);
            if (stoneTile) {
                entity.task = { type: 'gather_stone', target: stoneTile };
                entity.state = 'moving';
                moveEntityTo(entity, stoneTile.x, stoneTile.y);
                return;
            }
        }

        // Mining: produce copper (common), iron (uncommon), gems (rare)
        if (settlement.tier >= 1) {
            const mineTile = this.findResourceTile(worldMap, entity.tileX, entity.tileY, ['mountain']);
            if (mineTile && settlement.buildings.some(b => b.type === 'mine')) {
                entity.task = { type: 'gather_copper', target: mineTile };
                entity.state = 'moving';
                moveEntityTo(entity, mineTile.x, mineTile.y);
                return;
            }
        }

        // Fishing: near water tiles
        const waterTile = this.findResourceTile(worldMap, entity.tileX, entity.tileY, ['water', 'deep_water']);
        if (waterTile) {
            entity.task = { type: 'gather_fish', target: waterTile };
            entity.state = 'moving';
            moveEntityTo(entity, waterTile.x, waterTile.y);
            return;
        }

        // If nothing to do, wander
        this.wander(entity, worldMap);
    }

    processGathering(entity, settlement, worldMap, gameState) {
        entity.taskTimer++;

        // Age of Dark slows down work globally
        const workGoal = gameState.currentAgeId === 'dark' ? 8 : 5;

        if (entity.taskTimer >= workGoal) {
            // Gather complete
            const task = entity.task;
            if (task) {
                // Base gathering amount
                let baseAmount = 3 + Math.floor(Math.random() * 3);

                // Tech level bonus: +1 yield per 5 tech points
                let techBonus = Math.floor((settlement.techLevel || 0) / 5);
                let amount = baseAmount + techBonus;

                // Happiness affects productivity
                const settlementUnits = gameState.entityManager.getBySettlement(settlement.id);
                const avgHappiness = settlementUnits.reduce((sum, u) => sum + (u.happiness || 50), 0) / Math.max(1, settlementUnits.length);
                const productivityMod = avgHappiness > 50 ? 1 + (avgHappiness - 50) / 200 : 0.5 + avgHappiness / 100;
                amount = Math.max(1, Math.round(amount * productivityMod));

                // AGE Impacts on active foraging/gathering
                if (gameState.currentAgeId === 'ice' && task.type === 'gather_food') amount = 0;
                else if (gameState.currentAgeId === 'sun' && task.type === 'gather_food') amount = Math.floor(amount / 2);
                else if (gameState.currentAgeId === 'dark') amount = Math.max(1, amount - 1);

                const rawType = task.type.replace('gather_', '');

                // Mining: copper common, iron uncommon, gems rare
                if (rawType === 'copper') {
                    const roll = Math.random();
                    if (roll < 0.05) {
                        entity.carrying = { type: 'gems', amount: 1 };
                    } else if (roll < 0.25) {
                        entity.carrying = { type: 'iron', amount: Math.max(1, Math.floor(amount * 0.5)) };
                    } else {
                        entity.carrying = { type: 'copper', amount };
                    }
                } else if (rawType === 'fish') {
                    entity.carrying = { type: 'fish', amount };
                } else {
                    entity.carrying = { type: rawType, amount };
                }

                // Mine bonus: stone gathering near mine buildings yields more
                if (rawType === 'stone' && settlement.buildings.some(b => b.type === 'mine')) {
                    entity.carrying.amount += Math.floor(Math.random() * 3) + 1;
                }
            }
            entity.taskTimer = 0;
            entity.state = 'returning';
            moveEntityTo(entity, settlement.tileX, settlement.tileY);
        }
    }

    processReturning(entity, settlement, worldMap) {
        // Check if we've arrived at settlement
        const dist = Math.abs(entity.tileX - settlement.tileX) + Math.abs(entity.tileY - settlement.tileY);
        if (dist <= 2 && entity.carrying) {
            // Deliver resources
            const res = entity.carrying;
            switch (res.type) {
                case 'food':   settlement.food += res.amount; break;
                case 'wood':   settlement.wood += res.amount; break;
                case 'stone':  settlement.stone += res.amount; break;
                case 'copper': settlement.copper += res.amount; break;
                case 'iron':   settlement.iron += res.amount; break;
                case 'gems':   settlement.gems += res.amount; break;
                case 'fish':   settlement.fish += res.amount; break;
            }
            entity.carrying = null;
            entity.task = null;
            entity.state = 'idle';
        }
    }

    findResourceTile(worldMap, cx, cy, types) {
        for (const type of types) {
            const tiles = worldMap.findTilesOfType(cx, cy, type, 15);
            if (tiles.length > 0) {
                // Pick from the first few closest
                const idx = Math.floor(Math.random() * Math.min(3, tiles.length));
                return tiles[idx];
            }
        }
        return null;
    }

    calculateFertility(worldMap, cx, cy) {
        let fertility = 0;
        const radius = 5;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const info = worldMap.getTileInfo(cx + dx, cy + dy);
                fertility += info.fertility;
            }
        }
        return fertility / ((radius * 2 + 1) ** 2);
    }

    /**
     * Advance crop growth and auto-harvest mature plots.
     */
    updateFarmPlots(settlement, tick) {
        if (!settlement.farmPlots) settlement.farmPlots = [];

        for (const plot of settlement.farmPlots) {
            if (plot.stage === 'harvestable') {
                // Auto-harvest: convert to food + bread
                settlement.food += 5;
                settlement.bread += 2;
                plot.stage = 'planted';
                plot.growthTimer = 0;
                continue;
            }

            plot.growthTimer = (plot.growthTimer || 0) + 1;
            const stageIndex = CROP_STAGES.indexOf(plot.stage);
            const requiredTicks = CROP_GROWTH_TICKS[plot.stage] || 20;

            if (plot.growthTimer >= requiredTicks) {
                plot.growthTimer = 0;
                plot.stage = CROP_STAGES[stageIndex + 1] || 'harvestable';
            }
        }

        // Windmill bonus: mark nearby tiles as arable every 50 ticks
        if (tick % 50 === 0) {
            const hasWindmill = settlement.buildings.some(b => b.type === 'windmill');
            if (hasWindmill && !settlement.arableTiles) {
                settlement.arableTiles = new Set();
            }
            // Actual tile conversion is handled in CivilizationSystem
        }
    }

    /**
     * Forge conversions — upgrade metals based on tech level.
     * Requires a 'forge' building.
     */
    runForgeConversions(settlement) {
        const hasForge = settlement.buildings.some(b => b.type === 'forge');
        if (!hasForge) return;

        const tech = settlement.techLevel || 0;

        // Bronze: copper + iron → bronze (tech 2+)
        if (tech >= 2 && settlement.copper >= 3 && settlement.iron >= 1) {
            settlement.copper -= 3;
            settlement.iron -= 1;
            settlement.bronze += 1;
        }

        // Steel: iron → steel (tech 5+)
        if (tech >= 5 && settlement.iron >= 2) {
            settlement.iron -= 2;
            settlement.steel += 1;
        }
    }

    wander(entity, worldMap) {
        const dx = Math.floor(Math.random() * 11) - 5;
        const dy = Math.floor(Math.random() * 11) - 5;
        const tx = Math.max(0, Math.min(worldMap.width - 1, entity.tileX + dx));
        const ty = Math.max(0, Math.min(worldMap.height - 1, entity.tileY + dy));
        if (worldMap.isWalkable(tx, ty)) {
            moveEntityTo(entity, tx, ty);
        }
    }
}
