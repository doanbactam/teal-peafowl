/**
 * PopulationSystem — handles birth, death, aging, immigration,
 * leader election, and settlement viability checks.
 */
import { getRace, SUBSPECIES, getRandomSubspecies } from '../data/races.js';

import { inheritTraits } from '../data/Traits.js';

export class PopulationSystem {
    constructor() {
        /** @type {Set<string>} races that were alive last tick */
        this._aliveRaces = new Set();
    }

    update(gameState, tick) {
        const { entityManager, settlementManager, worldMap } = gameState;
        const laws = gameState.worldLawsSystem;

        // Process every 5 ticks
        if (tick % 5 !== 0) return;

        for (const settlement of settlementManager.getAll()) {
            if (!settlement.alive) continue;

            const race = getRace(settlement.raceId);
            const units = entityManager.getBySettlement(settlement.id);
            settlement.population = units.length;

            // === AGING & PLAGUE ===
            for (const unit of units) {
                // Age progression
                if (laws.isEnabled('aging')) {
                    unit.age += 0.1;

                    // Old age slows units
                    if (unit.age > unit.maxAge * 0.8 && !unit.traits.includes('immortal')) {
                        unit.speed = Math.max(0.3, unit.speed * 0.998);
                    }
                }

                // Plague logic
                if (unit.traits && unit.traits.includes('infected')) {
                    unit.hp -= 2; // DOT
                    
                    // Spread infection to nearby units (small chance)
                    if (laws.isEnabled('plague_spread') && Math.random() < 0.1) {
                        for (const neighbor of units) {
                            if (neighbor.id !== unit.id && !neighbor.traits.includes('infected') && !neighbor.traits.includes('immune')) {
                                const dist = Math.abs(neighbor.tileX - unit.tileX) + Math.abs(neighbor.tileY - unit.tileY);
                                if (dist <= 2) {
                                    neighbor.traits.push('infected');
                                    break; // infect one at a time
                                }
                            }
                        }
                    }
                }

                // Death Condition (Old Age or Plague)
                const diesOfOldAge = laws.isEnabled('aging') && unit.age >= unit.maxAge && !unit.traits.includes('immortal');
                if (unit.hp <= 0 || diesOfOldAge) {
                    const wasInfected = unit.traits && unit.traits.includes('infected');
                    this.killUnit(unit, entityManager, worldMap);

                    if (wasInfected && gameState.animalSystem) {
                        // Rise from the dead
                        gameState.animalSystem.spawn(worldMap, 'zombie', unit.tileX, unit.tileY);
                    }
                }
            }

            // === BIRTH ===
            if (settlement.population < settlement.maxPopulation && settlement.food >= 5) {
                // Birth rate scales with food abundance and race trait
                const foodRatio = Math.min(1, settlement.food / 50);
                let birthChance = race.stats.birthRate * foodRatio;

                // Social stability bonus — stable settlements reproduce more
                if (settlement.socialStability !== undefined) {
                    if (settlement.socialStability > 70) birthChance *= 1.3;
                    else if (settlement.socialStability < 30) birthChance *= 0.6;
                }

                if (Math.random() < birthChance) {
                    // Prioritize married couples as parents
                    let parentA = null;
                    let parentB = null;
                    let parentTraits = [];
                    let parentSubspecies = null;
                    let parentRef = null;

                    const socialSystem = gameState.socialSystem;
                    if (socialSystem) {
                        // Find a married couple in this settlement
                        for (const [, couple] of socialSystem.marriages) {
                            const a = gameState.entityManager.get(couple.a);
                            const b = gameState.entityManager.get(couple.b);
                            if (a && b && a.alive && b.alive &&
                                a.settlementId === settlement.id && b.settlementId === settlement.id &&
                                a.age >= 15 && b.age >= 15) {
                                parentA = a;
                                parentB = b;
                                break;
                            }
                        }
                    }

                    if (parentA && parentB) {
                        // Two-parent inheritance — merge traits from both parents
                        const mergedTraits = [...new Set([...(parentA.traits || []), ...(parentB.traits || [])])];
                        parentTraits = mergedTraits;
                        parentSubspecies = Math.random() < 0.5 ? parentA.subspecies : parentB.subspecies;
                        parentRef = Math.random() < 0.5 ? parentA : parentB;
                    } else if (units.length > 0) {
                        // Fallback: single parent (the old way)
                        const parent = units[Math.floor(Math.random() * units.length)];
                        parentTraits = parent.traits;
                        parentSubspecies = parent.subspecies;
                        parentRef = parent;
                    }

                    const subspeciesTraits = parentSubspecies ? (parentSubspecies.traits || []) : [];
                    const babyTraits = inheritTraits(parentTraits, subspeciesTraits);

                    const baby = this.spawnUnit(gameState, settlement, race, babyTraits, parentSubspecies, parentRef);
                    if (baby) {
                        settlement.food -= 3;

                        // Link baby to both parents if married couple
                        if (parentA && parentB) {
                            baby.familyId = parentA.familyId || parentB.familyId || `fam_${parentA.id}`;
                            baby.parentIds = [parentA.id, parentB.id];
                            if (!parentA.familyId) parentA.familyId = baby.familyId;
                            if (!parentB.familyId) parentB.familyId = baby.familyId;
                            if (!parentA.children) parentA.children = [];
                            if (!parentB.children) parentB.children = [];
                            parentA.children.push(baby.id);
                            parentB.children.push(baby.id);
                            baby.generation = Math.max((parentA.generation || 1), (parentB.generation || 1)) + 1;

                            // Birth celebration — married couple bonus
                            parentA.happiness = Math.min(100, (parentA.happiness || 50) + 10);
                            parentB.happiness = Math.min(100, (parentB.happiness || 50) + 10);
                        }
                    }
                }
            }

            // === STARVATION ===
            if (laws.isEnabled('hunger') && settlement.food <= 0 && units.length > 0) {
                // Weakest unit dies, not random
                const weakest = units.reduce((min, u) => u.hp < min.hp ? u : min, units[0]);
                this.killUnit(weakest, entityManager, worldMap);
                settlement.food = 0;
            }

            // === LEADER ELECTION ===
            if (tick % 50 === 0) {
                this.electLeader(units);
            }

            // === MORALE / BONUSES ===
            // Well-fed settlement gets health regen
            if (settlement.food > settlement.population * 3 && tick % 15 === 0) {
                for (const unit of units) {
                    if (unit.hp < unit.maxHp) {
                        unit.hp = Math.min(unit.maxHp, unit.hp + 1);
                    }
                }
            }

            // === HAPPINESS UPDATE ===
            for (const unit of units) {
                let happiness = 50; // Base neutral

                // Food surplus = happy (+20)
                if (settlement.food > settlement.population * 5) happiness += 20;
                // Starvation = unhappy (-30)
                if (settlement.food <= 0) happiness -= 30;
                // At war = slightly unhappy (-10)
                if (gameState.kingdomManager) {
                    const kH = gameState.kingdomManager.get(settlement.kingdomId);
                    if (kH && kH.enemies && kH.enemies.size > 0) happiness -= 10;
                }
                // Good housing = happy (+10)
                const housingCap = settlement.getHousingCapacity ? settlement.getHousingCapacity() : settlement.maxPopulation;
                if (settlement.population < housingCap * 0.7) happiness += 10;
                // Overcrowded = unhappy (-15)
                if (settlement.population > housingCap) happiness -= 15;
                // Health = happy (+5)
                if (unit.hp > unit.maxHp * 0.8) happiness += 5;
                // Injured = unhappy (-10)
                if (unit.hp < unit.maxHp * 0.3) happiness -= 10;
                // Age = slightly unhappy when old (-5)
                if (unit.age > unit.maxAge * 0.7) happiness -= 5;
                // Temple bonus
                if (settlement.buildings.some(b => b.type === 'temple')) happiness += 5;
                // Statue bonus
                happiness += settlement.buildings.filter(b => b.type === 'statue').length * 3;
                // Culture trait bonus
                const kingdom = gameState.kingdomManager ? gameState.kingdomManager.get(settlement.kingdomId) : null;
                if (kingdom && kingdom.culture && kingdom.culture.happinessBonus) {
                    happiness += kingdom.culture.happinessBonus;
                }
                // Flower meadow / celestial biome bonus
                if (gameState.worldMap) {
                    const tile = gameState.worldMap.getTile(unit.tileX, unit.tileY);
                    if (tile === 'flower_meadow' || tile === 'celestial') happiness += 5;
                }

                // === SOCIAL MODIFIERS ===
                // Colony social stability
                if (settlement.socialStability !== undefined) {
                    if (settlement.socialStability > 70) happiness += 8;
                    else if (settlement.socialStability > 50) happiness += 3;
                    else if (settlement.socialStability < 20) happiness -= 10;
                    else if (settlement.socialStability < 35) happiness -= 5;
                }
                // Spouse bonus
                if (unit.spouseId) {
                    const spouse = gameState.entityManager.get(unit.spouseId);
                    if (spouse && spouse.alive && spouse.settlementId === unit.settlementId) {
                        happiness += 10;
                    } else if (!spouse || !spouse.alive) {
                        happiness -= 15; // Grief
                    }
                }
                // Social friends/rivals (cached by SocialSystem)
                if (unit.socialFriends > 0) happiness += Math.min(8, unit.socialFriends * 2);
                if (unit.socialRivals > 0) happiness -= Math.min(10, unit.socialRivals * 3);

                // Clamp and assign
                unit.happiness = Math.max(-100, Math.min(100, happiness));
            }

            // === HAPPINESS EFFECTS ON BIRTH RATE ===
            if (settlement.population < settlement.maxPopulation && settlement.food >= 5) {
                const avgHappiness = units.reduce((sum, u) => sum + (u.happiness || 50), 0) / Math.max(1, units.length);
                // Very unhappy settlements have reduced birth rate (already handled by birth chance above)
                // Happiness is factored into productivity via ResourceSystem
            }

            // === UNHAPPY UNITS MAY EMIGRATE ===
            if (tick % 100 === 0) {
                for (const unit of units) {
                    if ((unit.happiness || 50) < -30 && Math.random() < 0.05) {
                        const otherSettlements = gameState.settlementManager.getAll().filter(
                            s => s.alive && s.kingdomId === settlement.kingdomId && s.id !== settlement.id
                        );
                        if (otherSettlements.length > 0) {
                            const target = otherSettlements[Math.floor(Math.random() * otherSettlements.length)];
                            // Update bySettlement index
                            const oldSet = entityManager.bySettlement.get(settlement.id);
                            if (oldSet) oldSet.delete(unit.id);
                            if (!entityManager.bySettlement.has(target.id)) {
                                entityManager.bySettlement.set(target.id, new Set());
                            }
                            entityManager.bySettlement.get(target.id).add(unit.id);
                            unit.settlementId = target.id;
                        }
                    }
                }
            }

            // Update population count
            settlement.population = entityManager.getBySettlement(settlement.id).length;
            settlementManager.checkUpgrade(settlement);
        }

        // Track race extinction
        if (tick % 20 === 0) {
            const currentAliveRaces = new Set();
            for (const entity of entityManager.getAllAlive()) {
                currentAliveRaces.add(entity.raceId);
            }
            for (const raceId of this._aliveRaces) {
                if (!currentAliveRaces.has(raceId)) {
                    if (gameState.historySystem) {
                        const race = getRace(raceId);
                        gameState.historySystem.logEvent(
                            'race_extinct',
                            `Chủng tộc ${race ? race.name : raceId} đã tuyệt chủng`,
                            { raceId }
                        );
                    }
                }
            }
            this._aliveRaces = currentAliveRaces;
        }

        // Clean up dead entities periodically
        if (tick % 20 === 0) {
            const toRemove = [];
            for (const entity of entityManager.entities.values()) {
                if (!entity.alive) {
                    toRemove.push(entity.id);
                }
            }
            for (const id of toRemove) {
                entityManager.remove(id);
            }
        }
    }

    spawnUnit(gameState, settlement, race, traits, parentSubspecies, parentRef) {
        const { entityManager, worldMap } = gameState;

        const spawnPos = worldMap.findNearestWalkable(settlement.tileX, settlement.tileY, 5);
        if (!spawnPos) return null;

        const pixel = worldMap.tileToPixel(spawnPos.x, spawnPos.y);

        // === SUBSPECIES INHERITANCE ===
        let babySubspecies = null;
        if (parentSubspecies) {
            const roll = Math.random();
            if (roll < 0.70) {
                // 70% same as parent
                babySubspecies = parentSubspecies;
            } else if (roll < 0.95) {
                // 25% random variant of same race
                const variants = SUBSPECIES[race.id] || [];
                babySubspecies = variants[Math.floor(Math.random() * variants.length)] || null;
            } else {
                // 5% random mutation
                babySubspecies = getRandomSubspecies(race.id);
            }
        } else {
            babySubspecies = getRandomSubspecies(race.id);
        }

        // Apply subspecies stat mods
        let hpMod = 0, atkMod = 0, defMod = 0, spdMod = 0, manaMod = 0, dodgeMod = 0;
        if (babySubspecies && babySubspecies.statMods) {
            hpMod = babySubspecies.statMods.hp || 0;
            atkMod = babySubspecies.statMods.attack || 0;
            defMod = babySubspecies.statMods.defense || 0;
            spdMod = babySubspecies.statMods.speed || 0;
            manaMod = babySubspecies.statMods.mana || 0;
            dodgeMod = babySubspecies.statMods.dodge || 0;
        }

        // Slight stat variance for each unit
        const hpVariance = Math.floor(Math.random() * 10) - 5;
        const atkVariance = Math.floor(Math.random() * 3);
        const defVariance = Math.floor(Math.random() * 3);
        const dodgeVariance = Math.floor(Math.random() * 4) - 2;
        const accuracyVariance = Math.floor(Math.random() * 5) - 2;
        const critVariance = Math.floor(Math.random() * 3);

        const unit = entityManager.create({
            tileX: spawnPos.x,
            tileY: spawnPos.y,
            x: pixel.x,
            y: pixel.y,
            raceId: settlement.raceId,
            settlementId: settlement.id,
            hp: race.stats.hp + hpVariance + hpMod,
            maxHp: race.stats.hp + hpVariance + hpMod,
            attack: race.stats.attack + atkVariance + atkMod,
            defense: race.stats.defense + defVariance + defMod,
            speed: race.stats.speed + (Math.random() * 0.2 - 0.1) + spdMod,
            maxAge: 60 + Math.floor(Math.random() * 50),
            dodge: race.stats.dodge + dodgeVariance + dodgeMod,
            accuracy: race.stats.accuracy + accuracyVariance,
            attackSpeed: race.stats.attackSpeed,
            critChance: race.stats.critChance + critVariance,
            critMultiplier: race.stats.critMultiplier,
            mana: race.stats.mana + manaMod,
            maxMana: race.stats.maxMana + manaMod,
            stamina: race.stats.stamina,
            maxStamina: race.stats.maxStamina,
            color: race.color,
            traits: traits,
            subspecies: babySubspecies,
            subspeciesId: babySubspecies ? babySubspecies.id : null
        });

        // Family creation — link baby to parent
        if (parentRef) {
            const familyId = parentRef.familyId || `fam_${parentRef.id}`;
            const generation = (parentRef.generation || 1) + 1;
            unit.familyId = familyId;
            unit.parentIds = [parentRef.id];
            unit.generation = generation;
            // Ensure parent has family data
            if (!parentRef.familyId) parentRef.familyId = familyId;
            if (!parentRef.children) parentRef.children = [];
            parentRef.children.push(unit.id);
        }

        worldMap.addEntityAt(spawnPos.x, spawnPos.y, unit.id);
        return unit;
    }

    killUnit(unit, entityManager, worldMap) {
        unit.alive = false;
        unit.state = 'dead';
        worldMap.removeEntityAt(unit.tileX, unit.tileY, unit.id);
    }

    electLeader(units) {
        if (units.length === 0) return;

        // Remove old leader flag
        for (const u of units) u.isLeader = false;

        // Elect strongest unit as leader — highest (attack + defense + remaining hp)
        let best = units[0];
        let bestScore = 0;
        for (const u of units) {
            const score = u.attack + u.defense + (u.hp / u.maxHp) * 10;
            if (score > bestScore) {
                bestScore = score;
                best = u;
            }
        }
        best.isLeader = true;
    }
}
