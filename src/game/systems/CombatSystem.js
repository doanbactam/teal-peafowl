/**
 * CombatSystem — handles melee/ranged combat, targeting, death,
 * undead resurrection, elf ranged attacks, demon corruption.
 */
import { getRace, areHostile } from '../data/races.js';
import { moveEntityTo } from './MovementSystem.js';
import { getRaceSpells, selectSpell, SPELL_CHANCE } from '../data/spells.js';

export class CombatSystem {
    update(gameState, tick) {
        const { entityManager, worldMap } = gameState;
        const laws = gameState.worldLawsSystem;

        // Run every 2 ticks
        if (tick % 2 !== 0) return;

        for (const entity of entityManager.getAllAlive()) {
            if (entity.state === 'dead') continue;

            const race = getRace(entity.raceId);

            // Check for nearby enemies
            if (entity.state !== 'fighting') {
                const enemy = entityManager.findNearestHostile(entity, race.hostileTo, gameState, 10);
                if (enemy) {
                    // Skip inter-kingdom combat if wars law is disabled
                    if (!laws.isEnabled('wars')) {
                        const eSettlement = gameState.settlementManager ? gameState.settlementManager.get(entity.settlementId) : null;
                        const tSettlement = gameState.settlementManager ? gameState.settlementManager.get(enemy.settlementId) : null;
                        if (eSettlement && tSettlement && eSettlement.kingdomId !== tSettlement.kingdomId) {
                            continue; // Skip: inter-kingdom war disabled
                        }
                    }
                    entity.targetEntityId = enemy.id;
                    entity.state = 'fighting';
                    moveEntityTo(entity, enemy.tileX, enemy.tileY);
                }
            }

            // Process combat
            if (entity.state === 'fighting') {
                const target = entityManager.get(entity.targetEntityId);

                if (!target || !target.alive) {
                    entity.state = 'idle';
                    entity.targetEntityId = -1;
                    continue;
                }

                const dx = entity.tileX - target.tileX;
                const dy = entity.tileY - target.tileY;
                const dist = Math.abs(dx) + Math.abs(dy);

                // Elves attack at range
                const isRanged = race.traits.includes('archer');
                const attackRange = isRanged ? 4 : 1;

                if (dist <= attackRange) {
                    if (entity.attackCooldown <= 0) {
                        this.attack(entity, target, entityManager, worldMap, gameState, isRanged);
                        // Cooldown inversely proportional to attackSpeed (faster = lower cooldown)
                        const baseCooldown = isRanged ? 4 : 3;
                        entity.attackCooldown = Math.max(1, Math.floor(baseCooldown / (entity.attackSpeed || 1.0)));
                    } else {
                        entity.attackCooldown--;
                    }
                } else if (dist > 15) {
                    // Too far, give up
                    entity.state = 'idle';
                    entity.targetEntityId = -1;
                } else {
                    // Chase (but ranged units keep distance)
                    if (isRanged && dist <= 2) {
                        // Back away
                        const fleeX = entity.tileX + Math.sign(dx) * 3;
                        const fleeY = entity.tileY + Math.sign(dy) * 3;
                        const fx = Math.max(0, Math.min(worldMap.width - 1, fleeX));
                        const fy = Math.max(0, Math.min(worldMap.height - 1, fleeY));
                        if (worldMap.isWalkable(fx, fy)) {
                            moveEntityTo(entity, fx, fy);
                        }
                    } else {
                        moveEntityTo(entity, target.tileX, target.tileY);
                    }
                }
            }
        }

        // === SIEGE: Attack buildings near combat ===
        if (tick % 5 !== 0) return;
        const { settlementManager } = gameState;
        if (!settlementManager) return;

        for (const entity of entityManager.getAllAlive()) {
            if (entity.state !== 'fighting') continue;

            // Check if there's a village_center building nearby (within 2 tiles)
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const bx = entity.tileX + dx;
                    const by = entity.tileY + dy;
                    const building = worldMap.getBuilding(bx, by);
                    if (!building || building.type !== 'village_center') continue;

                    // Don't attack own kingdom's buildings
                    const buildingSettlement = settlementManager.get(building.settlementId);
                    if (!buildingSettlement) continue;
                    const entitySettlement = settlementManager.get(entity.settlementId);
                    if (!entitySettlement) continue;
                    if (buildingSettlement.kingdomId === entitySettlement.kingdomId) continue;

                    // Apply siege damage
                    if (building.hp !== undefined) {
                        const siegeDamage = Math.max(1, Math.floor(entity.attack * 0.3));
                        building.hp -= siegeDamage;
                        building._underSiege = true;

                        // Visual event
                        if (gameState.visualEvents) {
                            gameState.visualEvents.push({ type: 'blood', x: bx, y: by, radius: 1 });
                        }

                        // Check if building is captured
                        if (building.hp <= 0) {
                            this.captureSettlement(buildingSettlement, entitySettlement, building, gameState);
                        }
                    }
                    break; // Only siege one building at a time
                }
            }
        }

        // === WATCH TOWER: Defensive fire ===
        if (tick % 3 === 0) {
            for (const [key, building] of worldMap.buildingGrid) {
                if (building.type !== 'watch_tower' || building.hp <= 0) continue;
                if (building.attackCooldown > 0) { building.attackCooldown--; continue; }

                const [bx, by] = key.split(',').map(Number);
                const range = building.range || 8;

                // Find nearest enemy entity
                let nearestEnemy = null;
                let nearestDist = Infinity;
                for (const ent of entityManager.getAllAlive()) {
                    const dist = Math.abs(ent.tileX - bx) + Math.abs(ent.tileY - by);
                    if (dist > range) continue;

                    // Check if enemy (different kingdom)
                    const entitySettlement = settlementManager.get(ent.settlementId);
                    const towerSettlement = settlementManager.get(building.settlementId);
                    if (!entitySettlement || !towerSettlement) continue;
                    if (entitySettlement.kingdomId === towerSettlement.kingdomId) continue;

                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestEnemy = ent;
                    }
                }

                if (nearestEnemy) {
                    // Arrow visual
                    if (gameState.visualEvents) {
                        gameState.visualEvents.push({
                            type: 'arrow',
                            x: bx, y: by,
                            tx: nearestEnemy.tileX, ty: nearestEnemy.tileY
                        });
                    }
                    // Damage
                    nearestEnemy.hp -= (building.damage || 5);
                    if (nearestEnemy.hp <= 0) {
                        nearestEnemy.alive = false;
                        nearestEnemy.state = 'dead';
                        worldMap.removeEntityAt(nearestEnemy.tileX, nearestEnemy.tileY, nearestEnemy.id);
                    }
                    building.attackCooldown = 3;
                }
            }
        }

        // Stamina regeneration for idle entities
        if (tick % 10 === 0) {
            for (const entity of entityManager.getAllAlive()) {
                if (entity.state === 'idle' && entity.stamina < (entity.maxStamina || 100)) {
                    entity.stamina = Math.min(entity.maxStamina || 100, entity.stamina + 2);
                }
            }
        }

        // Mana regeneration
        if (tick % 15 === 0) {
            for (const entity of entityManager.getAllAlive()) {
                if (entity.mana !== undefined && entity.mana < (entity.maxMana || 0)) {
                    entity.mana = Math.min(entity.maxMana || 0, entity.mana + 1);
                }
            }
        }

        // Shield duration ticking
        if (tick % 2 === 0) {
            for (const entity of entityManager.getAllAlive()) {
                if (entity.shieldActive) {
                    entity.shieldDuration = (entity.shieldDuration || 0) - 1;
                    if (entity.shieldDuration <= 0) {
                        entity.shieldActive = false;
                        entity.shieldReduction = 0;
                    }
                }
            }
        }
    }

    attack(attacker, defender, entityManager, worldMap, gameState, isRanged) {
        const attackerRace = getRace(attacker.raceId);

        // Fetch settlement tech levels
        let attackerTechLevel = 0;
        let defenderTechLevel = 0;
        if (gameState.settlementManager) {
            const attSettlement = gameState.settlementManager.get(attacker.settlementId);
            if (attSettlement) attackerTechLevel = attSettlement.techLevel || 0;
            const defSettlement = gameState.settlementManager.get(defender.settlementId);
            if (defSettlement) defenderTechLevel = defSettlement.techLevel || 0;
        }

        // Tech Level grants a minor flat bonus and a 5% multiplier per 10 points
        const attTechMod = 1 + Math.floor(attackerTechLevel / 10) * 0.05;
        const defTechMod = 1 + Math.floor(defenderTechLevel / 10) * 0.05;

        // === HIT RESOLUTION ===
        // Accuracy vs Dodge
        const hitRoll = (attacker.accuracy || 80) + Math.floor(Math.random() * 20) - 10;
        const dodgeRoll = (defender.dodge || 0) + Math.floor(Math.random() * 10) - 5;
        const isHit = hitRoll >= dodgeRoll;

        if (!isHit) {
            // Miss! Visual event
            if (gameState.visualEvents) {
                gameState.visualEvents.push({
                    type: 'miss', x: defender.tileX, y: defender.tileY
                });
            }
            return; // Attack missed
        }

        // === SPELL CASTING (33% chance) ===
        const availableSpells = getRaceSpells(attacker.raceId);
        if (availableSpells.length > 0 && Math.random() < SPELL_CHANCE && (attacker.mana || 0) > 0) {
            const spell = selectSpell(attacker, defender, availableSpells);
            if (spell) {
                this.castSpell(attacker, defender, spell, entityManager, worldMap, gameState);
                return; // Spell replaces normal attack
            }
        }

        // === DAMAGE CALCULATION ===
        // Base damage: attack * combat bonus * tech modifier
        let rawDamage = (attacker.attack * (attackerRace.stats.combatBonus || 1) * attTechMod);

        // Subtract defense (half effectiveness)
        rawDamage -= (defender.defense * defTechMod) / 2;

        // Random variance ±3
        rawDamage += Math.floor(Math.random() * 7) - 3;

        // Ranged penalty
        if (isRanged) rawDamage *= 0.85;

        // === CRITICAL HIT ===
        let isCrit = false;
        const critRoll = Math.random() * 100;
        if (critRoll < (attacker.critChance || 5)) {
            isCrit = true;
            rawDamage *= (attacker.critMultiplier || 1.5);
        }

        // Minimum damage is 1
        const damage = Math.max(1, Math.floor(rawDamage));
        const finalDamage = damage;
        
        if (isRanged && gameState.visualEvents) {
            gameState.visualEvents.push({ 
                type: 'arrow', 
                x: attacker.tileX, y: attacker.tileY, 
                tx: defender.tileX, ty: defender.tileY,
                color: attackerRace.color 
            });
        }

        // Critical hit visual
        if (isCrit && gameState.visualEvents) {
            gameState.visualEvents.push({
                type: 'crit', x: defender.tileX, y: defender.tileY
            });
        }

        // Apply shield damage reduction
        let appliedDamage = finalDamage;
        if (defender.shieldActive && defender.shieldReduction) {
            appliedDamage = Math.floor(finalDamage * (1 - defender.shieldReduction));
        }
        defender.hp -= appliedDamage;

        // Stamina cost for attacking
        attacker.stamina = Math.max(0, (attacker.stamina || 100) - 3);

        if (defender.hp <= 0) {
            this.handleDeath(defender, attacker, entityManager, worldMap, gameState);
        } else {
            // Defender fights back (if not already fighting and in melee range)
            if (defender.state !== 'fighting') {
                defender.state = 'fighting';
                defender.targetEntityId = attacker.id;
            }
        }
    }

    castSpell(caster, target, spell, entityManager, worldMap, gameState) {
        // Consume mana
        caster.mana = Math.max(0, (caster.mana || 0) - spell.manaCost);

        // Apply spell effects based on type
        switch (spell.type) {
            case 'offensive': {
                // Direct damage + AoE
                const spellDamage = spell.damage + Math.floor(Math.random() * 5);
                target.hp -= spellDamage;

                // AoE damage
                if (spell.aoeRadius > 0) {
                    for (const entity of entityManager.getAllAlive()) {
                        if (entity.id === target.id || entity.id === caster.id) continue;
                        const dist = Math.abs(entity.tileX - target.tileX) + Math.abs(entity.tileY - target.tileY);
                        if (dist <= spell.aoeRadius) {
                            entity.hp -= Math.floor(spellDamage * 0.5);
                        }
                    }
                }

                // Knockback
                if (spell.knockback) {
                    const dx = target.tileX - caster.tileX;
                    const dy = target.tileY - caster.tileY;
                    const dist = Math.max(1, Math.abs(dx) + Math.abs(dy));
                    const newX = Math.max(0, Math.min(worldMap.width - 1, target.tileX + Math.round(dx / dist * spell.knockback)));
                    const newY = Math.max(0, Math.min(worldMap.height - 1, target.tileY + Math.round(dy / dist * spell.knockback)));
                    if (worldMap.isWalkable(newX, newY)) {
                        worldMap.removeEntityAt(target.tileX, target.tileY, target.id);
                        target.tileX = newX;
                        target.tileY = newY;
                        const px = worldMap.tileToPixel(newX, newY);
                        target.x = px.x;
                        target.y = px.y;
                        worldMap.addEntityAt(newX, newY, target.id);
                    }
                }

                // Check death
                if (target.hp <= 0) {
                    this.handleDeath(target, caster, entityManager, worldMap, gameState);
                }
                break;
            }
            case 'defensive': {
                // Apply buff to self
                if (spell.effect === 'damage_reduction') {
                    caster.shieldActive = true;
                    caster.shieldReduction = spell.effectValue;
                    caster.shieldDuration = spell.duration || 10;
                }
                break;
            }
            case 'utility': {
                // Teleport to safe position
                if (spell.teleportRange) {
                    const safePos = worldMap.findNearestWalkable(
                        caster.tileX + Math.floor(Math.random() * spell.teleportRange * 2) - spell.teleportRange,
                        caster.tileY + Math.floor(Math.random() * spell.teleportRange * 2) - spell.teleportRange,
                        spell.teleportRange
                    );
                    if (safePos) {
                        worldMap.removeEntityAt(caster.tileX, caster.tileY, caster.id);
                        caster.tileX = safePos.x;
                        caster.tileY = safePos.y;
                        const px = worldMap.tileToPixel(safePos.x, safePos.y);
                        caster.x = px.x;
                        caster.y = px.y;
                        worldMap.addEntityAt(safePos.x, safePos.y, caster.id);
                        caster.state = 'idle';
                        caster.targetEntityId = -1;
                    }
                }
                break;
            }
            case 'support': {
                // Heal nearest ally
                if (spell.damage < 0) { // negative damage = healing
                    const healAmount = Math.abs(spell.damage);
                    // Find nearest damaged ally in range
                    const allies = entityManager.getBySettlement(caster.settlementId);
                    let healTarget = null;
                    let minDist = spell.range || 3;
                    for (const ally of allies) {
                        if (ally.id === caster.id || !ally.alive || ally.hp >= ally.maxHp) continue;
                        const dist = Math.abs(ally.tileX - caster.tileX) + Math.abs(ally.tileY - caster.tileY);
                        if (dist <= minDist) {
                            minDist = dist;
                            healTarget = ally;
                        }
                    }
                    if (healTarget) {
                        healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healAmount);
                    } else {
                        // Heal self if no ally needs healing
                        caster.hp = Math.min(caster.maxHp, caster.hp + Math.floor(healAmount * 0.5));
                    }
                }
                break;
            }
        }

        // VFX
        if (gameState.visualEvents) {
            gameState.visualEvents.push({
                type: 'spell',
                spellId: spell.id,
                x: caster.tileX, y: caster.tileY,
                tx: target.tileX, ty: target.tileY,
                color: spell.vfx.color,
                vfxType: spell.vfx.type,
                element: spell.element
            });
        }
    }

    handleDeath(victim, killer, entityManager, worldMap, gameState) {
        // Log king death
        if (victim.isKing && gameState.historySystem) {
            const victimRace = getRace(victim.raceId);
            const killerRace = getRace(killer.raceId);
            gameState.historySystem.logEvent(
                'leader_died',
                `Vua ${victimRace ? victimRace.name : 'unknown'} tử trận`,
                { killerRace: killer.raceId, victimRace: victim.raceId }
            );
        }

        victim.alive = false;
        victim.state = 'dead';
        worldMap.removeEntityAt(victim.tileX, victim.tileY, victim.id);

        // Killer returns to idle
        killer.state = 'idle';
        killer.targetEntityId = -1;

        // === UNDEAD RESURRECTION ===
        // Undead can raise fallen enemies
        if (killer.raceId === 'undead' && gameState.worldLawsSystem.isEnabled('resurrection')) {
            if (Math.random() < 0.5) {
                // Resurrect victim as undead
                const undeadRace = getRace('undead');
                const unit = entityManager.create({
                    tileX: victim.tileX,
                    tileY: victim.tileY,
                    x: victim.x,
                    y: victim.y,
                    raceId: 'undead',
                    settlementId: killer.settlementId,
                    hp: Math.floor(undeadRace.stats.hp * 0.7),
                    maxHp: undeadRace.stats.hp,
                    attack: undeadRace.stats.attack,
                    defense: undeadRace.stats.defense,
                    speed: undeadRace.stats.speed,
                    maxAge: 999, // undead don't age
                    color: undeadRace.color
                });
                worldMap.addEntityAt(victim.tileX, victim.tileY, unit.id);
            }
        }

        // === DEMON CORRUPTION ===
        // Demons corrupt the land where they kill
        if (killer.raceId === 'demon' && gameState.worldLawsSystem.isEnabled('corruption')) {
            const tile = worldMap.getTile(victim.tileX, victim.tileY);
            if (tile === 'grass' || tile === 'forest') {
                worldMap.setTile(victim.tileX, victim.tileY, 'burned');
                if (gameState.dirtyTiles) {
                    gameState.dirtyTiles.push({ x: victim.tileX, y: victim.tileY });
                }
            }
        }

        // === BATTLE EXPERIENCE ===
        // Killer gets a small stat boost from combat
        killer.attack += 0.1;
        killer.hp = Math.min(killer.maxHp, killer.hp + 5); // heal slightly from victory

        // === EXPERIENCE & LEVEL UP ===
        killer.experience = (killer.experience || 0) + 10; // 10 XP per kill
        if (killer.experience >= 50) {
            killer.experience -= 50;
            killer.level = (killer.level || 1) + 1;
            // Level up: small stat boost
            killer.maxHp += 5;
            killer.hp = Math.min(killer.maxHp, killer.hp + 5);
            killer.attack += 0.5;
            killer.defense += 0.3;
            if (killer.level % 3 === 0) {
                killer.critChance = Math.min(30, (killer.critChance || 5) + 1);
            }
        }
    }

    captureSettlement(targetSettlement, attackerSettlement, building, gameState) {
        const { kingdomManager, settlementManager, entityManager, visualEvents, worldMap } = gameState;

        const oldKingdomId = targetSettlement.kingdomId;
        const newKingdomId = attackerSettlement.kingdomId;
        const newKingdom = kingdomManager.get(newKingdomId);
        const race = getRace(attackerSettlement.raceId);

        // Transfer settlement to attacker's kingdom
        targetSettlement.kingdomId = newKingdomId;
        targetSettlement.loyalty = 50; // Low loyalty after capture
        building.hp = Math.floor(building.maxHp * 0.5); // Repair to 50%
        building._underSiege = false;
        building.raceId = attackerSettlement.raceId;
        building.color = race.buildingColor;

        // Kill remaining defenders (50% chance each)
        const defenders = entityManager.getBySettlement(targetSettlement.id);
        for (const d of defenders) {
            if (Math.random() < 0.5) {
                d.alive = false;
                d.state = 'dead';
                worldMap.removeEntityAt(d.tileX, d.tileY, d.id);
            } else {
                // Survivors transfer to new kingdom
                d.settlementId = attackerSettlement.id;
            }
        }

        // Update population
        targetSettlement.population = entityManager.getBySettlement(targetSettlement.id).length;

        // Visual event
        if (visualEvents) {
            visualEvents.push({
                type: 'settlement_captured',
                x: targetSettlement.tileX,
                y: targetSettlement.tileY,
                color: newKingdom ? newKingdom.color : 0xff0000
            });
        }

        // Log history
        if (gameState.historySystem) {
            gameState.historySystem.logEvent(
                'settlement_destroyed',
                `${targetSettlement.name} bị chiếm bởi ${newKingdom ? newKingdom.name : 'unknown'}`,
                { settlementId: targetSettlement.id, kingdomId: newKingdomId }
            );
        }

        // Check if old kingdom is destroyed (no settlements left)
        const remainingSettlements = settlementManager.getAll().filter(s => s.kingdomId === oldKingdomId && s.alive);
        if (remainingSettlements.length === 0) {
            const oldKingdom = kingdomManager.get(oldKingdomId);
            if (oldKingdom) oldKingdom.alive = false;

            if (visualEvents) {
                visualEvents.push({
                    type: 'kingdom_destroyed',
                    x: targetSettlement.tileX,
                    y: targetSettlement.tileY
                });
            }

            if (gameState.historySystem) {
                gameState.historySystem.logEvent(
                    'kingdom_destroyed',
                    `Vương quốc ${oldKingdom ? oldKingdom.name : 'unknown'} bị tiêu diệt`,
                    { kingdomId: oldKingdomId }
                );
            }
        }
    }
}
