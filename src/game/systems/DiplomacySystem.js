/**
 * DiplomacySystem — handles inter-race relationships, war declarations,
 * territory conflicts, alliances between same-race settlements,
 * and trade between friendly settlements.
 */
import { getRace, areHostile } from '../data/races.js';
import { getReligionRelation } from '../data/religions.js';
import { moveEntityTo } from './MovementSystem.js';
import { addTrait, removeTrait } from '../data/Traits.js';
import { CULTURE_TRAITS } from '../entities/KingdomManager.js';

export class DiplomacySystem {
    constructor() {
        /** @type {Map<string, object>} active wars keyed by "idA-idB" */
        this.wars = new Map();
        /** @type {Map<string, number>} alliance strengths between same-race settlements */
        this.alliances = new Map();
    }

    update(gameState, tick) {
        const { settlementManager, entityManager, worldMap, kingdomManager, visualEvents } = gameState;
        const laws = gameState.worldLawsSystem;

        // Run every 50 ticks (~10 seconds)
        if (tick % 50 !== 0) return;

        const settlements = settlementManager.getAll();
        if (settlements.length < 2) return;

        for (let i = 0; i < settlements.length; i++) {
            for (let j = i + 1; j < settlements.length; j++) {
                const a = settlements[i];
                const b = settlements[j];

                if (a.kingdomId === b.kingdomId && a.kingdomId !== -1) {
                    // Same kingdom — trade resources
                    if (laws.isEnabled('trade')) {
                        this.tradeResources(a, b);
                    }
                    continue;
                }

                const raceA = getRace(a.raceId);
                const raceB = getRace(b.raceId);

                const kA = kingdomManager.get(a.kingdomId);
                const kB = kingdomManager.get(b.kingdomId);
                const isHostileRace = areHostile(raceA, raceB);
                let isAtWar = false;
                if (kA && kB) {
                    isAtWar = kA.enemies.has(kB.id);
                }

                const dist = Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY);

                if (!isHostileRace && !isAtWar) {
                    // Chance to declare war if close and different kingdoms
                    // Culture modifies war chance
                    let warChance = 0.2;
                    if (kA && kA.culture) {
                        warChance += (kA.culture.warChanceMod || 0);
                        // Isolationist and cultural kingdoms declare war less often
                        if (kA.culture.id === 'isolationist' || kA.culture.id === 'cultural') {
                            warChance -= 0.1;
                        }
                    }
                    if (kB && kB.culture) {
                        warChance += (kB.culture.warChanceMod || 0);
                    }
                    // Religion modifies war chance — hostile religions more likely to fight
                    if (kA && kB && kA.religion && kB.religion) {
                        const religionMod = getReligionRelation(kA.religion, kB.religion);
                        // Negative relation = more warlike; positive = less
                        warChance -= religionMod * 0.005;
                    }
                    warChance = Math.max(0, Math.min(0.8, warChance));

                    if (laws.isEnabled('wars') && laws.isEnabled('diplomacy') && dist < 30 && tick % 500 === 0 && Math.random() < warChance) {
                        if (kA && kB) {
                            kingdomManager.declareWar(kA.id, kB.id);
                            // Visual Event: War Declaration!
                            visualEvents.push({ type: 'curse', x: a.tileX, y: a.tileY, radius: 4 });
                            visualEvents.push({ type: 'curse', x: b.tileX, y: b.tileY, radius: 4 });
                            if (gameState.historySystem) {
                                gameState.historySystem.logEvent(
                                    'war_declared',
                                    `${kA.name} tuyên chiến ${kB.name}`,
                                    { kingdomA: kA.id, kingdomB: kB.id }
                                );
                            }
                        }
                    } else {
                        // If they didn't go to war, they can engage in International Trade!
                        if (laws.isEnabled('trade')) {
                            this.tradeResources(a, b);
                        }
                    }
                    continue; // Not hostile, not at war yet
                }

                // --- AT WAR OR HOSTILE RACE ---
                // Expand engage distance enormously if they have ports (sea invasions)
                let engageDist = 40;
                if (a.buildings && a.buildings.some(bldg => bldg.type === 'port')) engageDist = 150;
                if (b.buildings && b.buildings.some(bldg => bldg.type === 'port')) engageDist = 150;

                // Only engage if close enough
                if (dist > engageDist) continue;

                // Check territory overlap
                const overlap = this.checkTerritoryOverlap(a, b);
                if (overlap > 0 || dist < 20) {
                    this.escalateConflict(a, b, entityManager, worldMap);
                }
            }
        }

        // Settlement merging — same kingdom, very close
        if (tick % 200 === 0) {
            this.checkMergers(settlements, settlementManager, entityManager);
        }

        // Kings, Loyalty, and Rebellions
        if (tick % 100 === 0) {
            this.updateKingsAndLoyalty(gameState);
        }

        // Religious conversion — dominant kingdoms may convert weaker ones
        if (tick % 500 === 0) {
            this.checkReligiousConversion(gameState, settlements);
        }
    }

    checkTerritoryOverlap(settlementA, settlementB) {
        let overlap = 0;
        for (const key of settlementA.territory) {
            if (settlementB.territory.has(key)) {
                overlap++;
            }
        }
        return overlap;
    }

    escalateConflict(settlementA, settlementB, entityManager, worldMap) {
        const unitsA = entityManager.getBySettlement(settlementA.id)
            .filter(u => u.state === 'idle' || u.state === 'moving');
        const unitsB = entityManager.getBySettlement(settlementB.id)
            .filter(u => u.state === 'idle' || u.state === 'moving');

        // Send a portion to attack — more aggressive if territorial overlap is high
        const aggressionA = Math.min(0.5, 0.2 + this.checkTerritoryOverlap(settlementA, settlementB) * 0.02);
        const aggressionB = Math.min(0.5, 0.2 + this.checkTerritoryOverlap(settlementA, settlementB) * 0.02);

        const attackersA = unitsA.slice(0, Math.ceil(unitsA.length * aggressionA));
        const attackersB = unitsB.slice(0, Math.ceil(unitsB.length * aggressionB));

        for (const unit of attackersA) {
            if (unitsB.length > 0) {
                const target = unitsB[Math.floor(Math.random() * unitsB.length)];
                unit.targetEntityId = target.id;
                unit.state = 'fighting';
                moveEntityTo(unit, target.tileX, target.tileY);
            }
        }

        for (const unit of attackersB) {
            if (unitsA.length > 0) {
                const target = unitsA[Math.floor(Math.random() * unitsA.length)];
                unit.targetEntityId = target.id;
                unit.state = 'fighting';
                moveEntityTo(unit, target.tileX, target.tileY);
            }
        }
    }

    /**
     * Transfer resources and perform advanced trade
     */
    tradeResources(a, b) {
        // (law check is done by callers, but guard here too for safety)
        // No additional check needed — callers already gate on laws.isEnabled('trade')

        // Determine distance
        const dist = Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY);

        // Trade radius expands natively with Tech Level. Markets further push this.
        const maxTradeRadius = 20 + Math.floor(Math.max(a.techLevel, b.techLevel) / 2);
        
        let hasMarket = false;
        if (a.buildings.some(bldg => bldg.type === 'market') || b.buildings.some(bldg => bldg.type === 'market')) {
            hasMarket = true;
        }

        const effectiveRadius = hasMarket ? maxTradeRadius * 2 : maxTradeRadius;
        
        if (dist > effectiveRadius) return;

        // 1. Equalize Basic Resources (food, wood, stone) via Caravans/Logistics
        // Only transfer 10% of the difference
        const transferRates = hasMarket ? 0.2 : 0.05; // Markets dramatically speed up logistics
        
        const resources = ['food', 'wood', 'stone'];
        for (const res of resources) {
            if (a[res] > b[res] + 20) {
                const transfer = Math.floor((a[res] - b[res]) * transferRates);
                a[res] -= transfer;
                b[res] += transfer;
            } else if (b[res] > a[res] + 20) {
                const transfer = Math.floor((b[res] - a[res]) * transferRates);
                b[res] -= transfer;
                a[res] += transfer;
            }
        }

        // 2. Advanced Gold-based Trading (Supply & Demand)
        // If they have markets, they can sell basic excesses for gold.
        if (hasMarket) {
            const sellThreshold = 150; // The threshold considered an "excess"
            
            for (const res of resources) {
                // A sells to B
                if (a[res] > sellThreshold && b[res] < 50 && b.gold > 5) {
                    const amountToSell = 30; // Batch trade
                    const price = 5;
                    a[res] -= amountToSell;
                    b[res] += amountToSell;
                    b.gold -= price;
                    a.gold += price + 1; // Slight profit creation from trade
                }
                // B sells to A
                else if (b[res] > sellThreshold && a[res] < 50 && a.gold > 5) {
                    const amountToSell = 30;
                    const price = 5;
                    b[res] -= amountToSell;
                    a[res] += amountToSell;
                    a.gold -= price;
                    b.gold += price + 1;
                }
            }

            // Exchanging Metal for Gold (Metal is more valuable)
            if (a.metal > 10 && b.gold > 10) {
                a.metal -= 5;
                b.metal = (b.metal || 0) + 5;
                b.gold -= 10;
                a.gold += 12; 
            } else if (b.metal > 10 && a.gold > 10) {
                b.metal -= 5;
                a.metal = (a.metal || 0) + 5;
                a.gold -= 10;
                b.gold += 12;
            }
        }
    }

    /**
     * Merge very close same-kingdom settlements that are small
     */
    checkMergers(settlements, settlementManager, entityManager) {
        for (let i = 0; i < settlements.length; i++) {
            for (let j = i + 1; j < settlements.length; j++) {
                const a = settlements[i];
                const b = settlements[j];
                if (!a.alive || !b.alive) continue;
                if (a.kingdomId !== b.kingdomId || a.kingdomId === -1) continue;

                const dist = Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY);
                if (dist > 8) continue;

                // Merge smaller into larger
                const [bigger, smaller] = a.population >= b.population ? [a, b] : [b, a];

                // Transfer units
                const units = entityManager.getBySettlement(smaller.id);
                for (const unit of units) {
                    unit.settlementId = bigger.id;
                    // Update settlement index
                    const oldSet = entityManager.bySettlement.get(smaller.id);
                    if (oldSet) oldSet.delete(unit.id);
                    if (!entityManager.bySettlement.has(bigger.id)) {
                        entityManager.bySettlement.set(bigger.id, new Set());
                    }
                    entityManager.bySettlement.get(bigger.id).add(unit.id);
                }

                // Transfer resources
                bigger.food += smaller.food;
                bigger.wood += smaller.wood;
                bigger.stone += smaller.stone;

                // Merge territory
                for (const key of smaller.territory) {
                    bigger.territory.add(key);
                }

                // Kill smaller settlement
                smaller.alive = false;
            }
        }
    }

    /**
     * Manage Kings, Capital allocation, and Loyalty/Rebellions
     */
    updateKingsAndLoyalty(gameState) {
        const { kingdomManager, settlementManager, entityManager, visualEvents } = gameState;

        const kingdoms = kingdomManager.getAll();
        
        for (const k of kingdoms) {
            const settlements = settlementManager.getAll().filter(s => s.kingdomId === k.id);
            if (settlements.length === 0) {
                k.alive = false;
                continue;
            }

            // Elect capital if none
            let capital = settlementManager.get(k.capitalId);
            if (!capital || !capital.alive || capital.kingdomId !== k.id) {
                // Elect highest tier/population settlement
                const sorted = [...settlements].sort((a, b) => (b.tier * 1000 + b.population) - (a.tier * 1000 + a.population));
                capital = sorted[0];
                k.capitalId = capital.id;
            }

            // Elect king if none or dead
            let king = entityManager.get(k.kingId);
            if (!king || !king.alive || king.settlementId !== capital.id) {
                if (king) {
                    king.isKing = false; // old king dead or exiled
                    removeTrait(king, 'king');
                }

                // Find a new king in the capital
                const candidates = entityManager.getBySettlement(capital.id);
                if (candidates.length > 0) {
                    const sortedCand = [...candidates].sort((a, b) => b.hp - a.hp); // strongest becomes king
                    king = sortedCand[0];
                    king.isKing = true;
                    addTrait(king, 'king');
                    k.kingId = king.id;

                    // Visual Event: Coronation!
                    visualEvents.push({ type: 'blessing', x: king.tileX, y: king.tileY, radius: 4 });

                    if (gameState.historySystem) {
                        gameState.historySystem.logEvent(
                            'leader_died',
                            `Vua mới đăng quang tại ${k.name}`,
                            { kingdomId: k.id }
                        );
                    }
                }
            }

            // Process Loyalty and Taxation for other settlements
            for (const s of settlements) {
                if (s.id === capital.id) {
                    s.loyalty = 100;
                    continue;
                }

                // 1. Taxation 
                // Settlements pay a percentage of their gold to the capital.
                // Higher tax during wartime!
                const taxRate = k.enemies.size > 0 ? 0.3 : 0.1;
                const taxAmount = Math.floor(s.gold * taxRate);
                
                let loyaltyChange = 0;

                if (taxAmount > 0) {
                    s.gold -= taxAmount;
                    capital.gold += taxAmount;
                } else if (s.gold < 5) {
                    // High poverty lowers loyalty
                    loyaltyChange -= 5;
                }

                // 2. Distance and Ambition
                const dist = Math.abs(s.tileX - capital.tileX) + Math.abs(s.tileY - capital.tileY);
                const ambition = s.population > 50 ? 5 : 0;
                
                if (dist > 30) loyaltyChange -= 2;
                if (dist > 50) loyaltyChange -= 3;
                loyaltyChange -= ambition;

                // Positive modifiers
                if (s.gold > 50) loyaltyChange += 2; // rich citizens are happy
                if (k.enemies.size > 0) loyaltyChange += 1; // external threat unites the people slightly

                s.loyalty = Math.max(0, Math.min(100, (s.loyalty || 100) + loyaltyChange));

                // 3. Rebellion Check! (now factors in average happiness)
                const settlementUnits = entityManager.getBySettlement(s.id);
                const avgHappiness = settlementUnits.reduce((sum, u) => sum + (u.happiness || 50), 0) / Math.max(1, settlementUnits.length);
                if (gameState.worldLawsSystem.isEnabled('rebellions') && s.loyalty <= 0 && avgHappiness < 20 && Math.random() < 0.2) {
                    // Start Rebellion
                    const race = getRace(s.raceId);
                    const newKingdom = kingdomManager.create({
                        raceId: s.raceId,
                        color: race.color !== k.color ? race.color : (Math.random() * 0xffffff)
                    });

                    s.kingdomId = newKingdom.id;
                    s.loyalty = 100;
                    
                    // The new kingdom declares war on the old one
                    kingdomManager.declareWar(newKingdom.id, k.id);

                    visualEvents.push({ type: 'curse', x: s.tileX, y: s.tileY, radius: 5 }); // Signal rebellion

                    if (gameState.historySystem) {
                        gameState.historySystem.logEvent(
                            'war_declared',
                            `${s.name} nổi loạn chống ${k.name}`,
                            { settlementId: s.id, kingdomId: k.id }
                        );
                    }
                }
            }

            // 4. War Exhaustion & Peace Treaties
            // If at war for a long time, there's a small chance to make peace with ONE enemy.
            if (gameState.worldLawsSystem.isEnabled('diplomacy') && k.enemies.size > 0 && Math.random() < 0.02) {
                const enemyArr = Array.from(k.enemies);
                const enemyId = enemyArr[Math.floor(Math.random() * enemyArr.length)];
                kingdomManager.makePeace(k.id, enemyId);
                visualEvents.push({ type: 'blessing', x: capital.tileX, y: capital.tileY, radius: 6 });
                if (gameState.historySystem) {
                    const enemyK = kingdomManager.get(enemyId);
                    gameState.historySystem.logEvent(
                        'peace_made',
                        `${k.name} hòa bình với ${enemyK ? enemyK.name : 'unknown'}`,
                        { kingdomA: k.id, kingdomB: enemyId }
                    );
                }
            }
        }
    }

    /**
     * Religious conversion — if one kingdom is 3x larger, weaker may convert faith
     */
    checkReligiousConversion(gameState, settlements) {
        const { kingdomManager } = gameState;
        const kingdoms = kingdomManager.getAll();

        for (let i = 0; i < kingdoms.length; i++) {
            for (let j = i + 1; j < kingdoms.length; j++) {
                const kA = kingdoms[i];
                const kB = kingdoms[j];
                if (!kA.religion || !kB.religion || kA.religion.id === kB.religion.id) continue;

                const popA = settlements.filter(s => s.kingdomId === kA.id).reduce((sum, s) => sum + s.population, 0);
                const popB = settlements.filter(s => s.kingdomId === kB.id).reduce((sum, s) => sum + s.population, 0);

                // If one is 3x larger, smaller has 5% chance to convert
                if (popA > popB * 3 && Math.random() < 0.05) {
                    const oldName = kB.religion.name;
                    kB.religion = kA.religion;
                    if (gameState.historySystem) {
                        gameState.historySystem.logEvent(
                            'peace_made',
                            `${kB.name} chuyển từ ${oldName} sang ${kA.religion.name}`,
                            { kingdomId: kB.id }
                        );
                    }
                } else if (popB > popA * 3 && Math.random() < 0.05) {
                    const oldName = kA.religion.name;
                    kA.religion = kB.religion;
                    if (gameState.historySystem) {
                        gameState.historySystem.logEvent(
                            'peace_made',
                            `${kA.name} chuyển từ ${oldName} sang ${kB.religion.name}`,
                            { kingdomId: kA.id }
                        );
                    }
                }
            }
        }
    }
}
