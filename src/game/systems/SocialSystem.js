/**
 * SocialSystem — handles interpersonal relationships, marriage, social events,
 * colony stability, and emergent social dynamics between units.
 *
 * Relationships form organically through proximity and shared experiences.
 * They feed into mood, faith, productivity, and colony stability.
 *
 * Architecture ownership:
 * - relationship bonds (friendship, romance, rivalry)
 * - marriage & coupled reproduction
 * - social events (festivals, arguments, prayers, inspirations)
 * - colony stability aggregation
 * - social gathering behavior at social buildings
 */

import { moveEntityTo } from './MovementSystem.js';

// ─── RELATIONSHIP TYPES ────────────────────────────────────────
export const REL = {
    STRANGER: 0,
    ACQUAINTANCE: 1,
    FRIEND: 2,
    CLOSE_FRIEND: 3,
    LOVER: 4,
    SPOUSE: 5,
    RIVAL: -1,
    ENEMY: -2
};

const REL_NAMES = {
    [REL.STRANGER]: 'Xa Lạ',
    [REL.ACQUAINTANCE]: 'Quen Biết',
    [REL.FRIEND]: 'Bạn Bè',
    [REL.CLOSE_FRIEND]: 'Thân Thiết',
    [REL.LOVER]: 'Yêu Đương',
    [REL.SPOUSE]: 'Vợ/Chồng',
    [REL.RIVAL]: 'Đối Thủ',
    [REL.ENEMY]: 'Kẻ Thù'
};

// ─── SOCIAL TRAITS ─────────────────────────────────────────────
export const SOCIAL_TRAITS = {
    extrovert:    { id: 'extrovert',    name: 'Hướng Ngoại',    description: 'Dễ kết bạn, cần giao tiếp', socialGain: 1.5, lonelinessPenalty: -8 },
    introvert:    { id: 'introvert',    name: 'Hướng Nội',      description: 'Thích một mình, ít kết bạn', socialGain: 0.5, lonelinessPenalty: 0 },
    charismatic:  { id: 'charismatic',  name: 'Lôi Cuốn',       description: 'Thu hút người khác, tăng loyalty', socialGain: 2.0, leaderBonus: 10 },
    jealous:      { id: 'jealous',      name: 'Ghen Tị',        description: 'Dễ sinh thù hằn', rivalryChance: 0.3, socialGain: 0.8 },
    loyal:        { id: 'loyal',        name: 'Trung Thành',    description: 'Tăng quan hệ mạnh, khó phản bội', socialGain: 1.2, loyaltyBonus: 15 },
    romantic:     { id: 'romantic',     name: 'Lãng Mạn',       description: 'Dễ yêu, hạnh phúc khi có đôi', romanceChance: 0.3, coupledBonus: 15 },
    loner:        { id: 'loner',        name: 'Cô Độc',         description: 'Không cần quan hệ, ít bị ảnh hưởng', socialGain: 0.2, lonelinessPenalty: 5 },
    gossipy:      { id: 'gossipy',      name: 'Buôn Chuyện',    description: 'Lan truyền tin đồn, ảnh hưởng mood tập thể', socialGain: 1.3, gossipRadius: 3 },
    compassionate:{ id: 'compassionate',name: 'Từ Bi',          description: 'Giúp đỡ người yếu, tăng stability', socialGain: 1.1, healBoost: 2 },
    aggressive:   { id: 'aggressive',   name: 'Hung Hãn',       description: 'Dễ gây sự, giảm stability', socialGain: 0.6, rivalryChance: 0.25 }
};

export const SOCIAL_TRAIT_IDS = Object.keys(SOCIAL_TRAITS);

// ─── SOCIAL EVENT TYPES ────────────────────────────────────────
const SOCIAL_EVENTS = {
    FESTIVAL:      { id: 'festival',      name: 'Lễ Hội',         moodBoost: 15, stabilityBoost: 5,  faithBoost: 3, minPop: 10, cooldown: 500, icon: '🎉' },
    WEDDING:       { id: 'wedding',       name: 'Đám Cưới',       moodBoost: 20, stabilityBoost: 8,  faithBoost: 5, minPop: 5,  cooldown: 200, icon: '💒' },
    ARGUMENT:      { id: 'argument',       name: 'Tranh Cãi',      moodBoost: -10, stabilityBoost: -3, faithBoost: 0, minPop: 3,  cooldown: 50,  icon: '💢' },
    PRAYER:        { id: 'prayer',         name: 'Cầu Nguyện',     moodBoost: 8,  stabilityBoost: 3,  faithBoost: 8, minPop: 5,  cooldown: 100, icon: '🙏' },
    INSPIRATION:   { id: 'inspiration',    name: 'Cảm Hứng',       moodBoost: 12, stabilityBoost: 2,  faithBoost: 1, minPop: 3,  cooldown: 150, icon: '💡' },
    MOURNING:      { id: 'mourning',       name: 'Tang Lễ',        moodBoost: -8, stabilityBoost: 2,  faithBoost: 4, minPop: 3,  cooldown: 100, icon: '⚰️' },
    RIOT:          { id: 'riot',           name: 'Bạo Loạn',       moodBoost: -25,stabilityBoost: -15, faithBoost: -5,minPop: 15, cooldown: 300, icon: '🔥' },
    MARKETPLACE:   { id: 'marketplace',    name: 'Phiên Chợ',      moodBoost: 10, stabilityBoost: 4,  faithBoost: 0, minPop: 8,  cooldown: 150, icon: '🏪' },
    COUNCIL:       { id: 'council',        name: 'Hội Đồng',       moodBoost: 5,  stabilityBoost: 8,  faithBoost: 2, minPop: 20, cooldown: 200, icon: '🏛️' },
    BIRTH_CELEBRATION: { id: 'birth_celebration', name: 'Mừng Sinh', moodBoost: 10, stabilityBoost: 3, faithBoost: 2, minPop: 5, cooldown: 50, icon: '🍼' }
};

export class SocialSystem {
    constructor() {
        /**
         * Relationship map: Map<entityId, Map<entityId, { level, score, history }>>
         * level: REL enum value
         * score: numeric affection/hostility accumulator (-100..100)
         * history: array of interaction tags for storytelling
         */
        this.relationships = new Map();

        /**
         * Married couples: Map<coupleKey, { a: id, b: id, tick: number }>
         */
        this.marriages = new Map();

        /**
         * Settlement social state: Map<settlementId, { stability, recentEvents, cooldowns, socialMood }>
         */
        this.settlementSocial = new Map();

        /**
         * Pending social gatherings for visualization
         */
        this.pendingEvents = [];
    }

    update(gameState, tick) {
        const { entityManager, settlementManager } = gameState;

        // === RELATIONSHIP BUILDING (every 10 ticks) ===
        if (tick % 10 === 0) {
            this.updateRelationships(entityManager, settlementManager, tick);
        }

        // === SOCIAL EVENTS (every 25 ticks) ===
        if (tick % 25 === 0) {
            this.processSocialEvents(gameState, tick);
        }

        // === MARRIAGE & COURTSHIP (every 30 ticks) ===
        if (tick % 30 === 0) {
            this.processCourtship(entityManager, settlementManager, tick);
        }

        // === COLONY STABILITY AGGREGATION (every 20 ticks) ===
        if (tick % 20 === 0) {
            this.updateColonyStability(gameState, tick);
        }

        // === SOCIAL MOOD EFFECTS (every 15 ticks) ===
        if (tick % 15 === 0) {
            this.applySocialMoodEffects(entityManager, settlementManager, tick);
        }

        // === SOCIAL GATHERING BEHAVIOR (every 20 ticks) ===
        if (tick % 20 === 0) {
            this.processSocialGathering(entityManager, settlementManager, gameState);
        }

        // === CLEANUP DEAD RELATIONSHIPS (every 100 ticks) ===
        if (tick % 100 === 0) {
            this.cleanupDeadRelationships(entityManager);
        }
    }

    // ─── RELATIONSHIP BUILDING ─────────────────────────────────────
    updateRelationships(entityManager, settlementManager, tick) {
        for (const settlement of settlementManager.getAll()) {
            const units = entityManager.getBySettlement(settlement.id);
            if (units.length < 2) continue;

            // For each unit, check nearby units and build/decay relationships
            for (const unit of units) {
                const socialTrait = this._getSocialTrait(unit);
                const socialGainMod = socialTrait ? (socialTrait.socialGain || 1.0) : 1.0;

                for (const other of units) {
                    if (unit.id === other.id) continue;

                    // Proximity check — only interact within 5 tiles
                    const dist = Math.abs(unit.tileX - other.tileX) + Math.abs(unit.tileY - other.tileY);
                    if (dist > 5) continue;

                    const rel = this._getOrCreateRel(unit.id, other.id);

                    // Base interaction score change
                    let scoreChange = 0;

                    // Proximity bonus — closer = more interaction
                    if (dist <= 1) scoreChange += 2 * socialGainMod;
                    else if (dist <= 3) scoreChange += 1 * socialGainMod;
                    else scoreChange += 0.3 * socialGainMod;

                    // Same family bonus
                    if (unit.familyId && unit.familyId === other.familyId) {
                        scoreChange += 1.5;
                    }

                    // Parent-child bond
                    if (unit.parentIds && unit.parentIds.includes(other.id)) {
                        scoreChange += 2;
                    }
                    if (unit.children && unit.children.includes(other.id)) {
                        scoreChange += 2;
                    }

                    // Shared work state bonus
                    if (unit.state === other.state && unit.state !== 'idle') {
                        scoreChange += 0.5;
                    }

                    // Personality clashes
                    if (this._hasTraitId(unit, 'aggressive') && this._hasTraitId(other, 'aggressive')) {
                        scoreChange -= 1.5; // Two hotheads clash
                    }
                    if (this._hasTraitId(unit, 'jealous') && other.isLeader) {
                        scoreChange -= 1.0; // Jealous of leaders
                    }
                    if (this._hasTraitId(unit, 'compassionate') && other.hp < other.maxHp * 0.3) {
                        scoreChange += 2; // Compassion for the wounded
                    }

                    // Combat brotherhood — fighting side by side
                    if (unit.state === 'fighting' && other.state === 'fighting') {
                        scoreChange += 3; // Bonds forged in battle
                    }

                    // Update relationship score
                    rel.score = Math.max(-100, Math.min(100, rel.score + scoreChange));

                    // Classify relationship level
                    this._classifyRelationship(rel, unit, other);
                }
            }
        }
    }

    _classifyRelationship(rel, unitA, unitB) {
        const score = rel.score;

        // Don't downgrade from spouse
        if (rel.level === REL.SPOUSE) return;

        if (score >= 80) {
            // Check if romantic potential
            if (this._canRomance(unitA, unitB) && rel.level < REL.LOVER) {
                const romanceChance = this._getRomanceChance(unitA, unitB);
                if (Math.random() < romanceChance) {
                    rel.level = REL.LOVER;
                    return;
                }
            }
            rel.level = Math.max(rel.level, REL.CLOSE_FRIEND);
        } else if (score >= 50) {
            if (rel.level < REL.FRIEND) rel.level = REL.FRIEND;
        } else if (score >= 20) {
            if (rel.level < REL.ACQUAINTANCE) rel.level = REL.ACQUAINTANCE;
        } else if (score <= -50) {
            rel.level = REL.ENEMY;
        } else if (score <= -20) {
            rel.level = REL.RIVAL;
        } else {
            if (rel.level < 0) {
                // Slowly recover from rivalry
                if (score > 0) rel.level = REL.STRANGER;
            }
        }
    }

    _canRomance(a, b) {
        // Both must be adults (age > 15) and same settlement
        if (a.age < 15 || b.age < 15) return false;
        if (a.settlementId !== b.settlementId) return false;
        // Can't romance family
        if (a.familyId && a.familyId === b.familyId) return false;
        if (a.parentIds && a.parentIds.includes(b.id)) return false;
        if (b.parentIds && b.parentIds.includes(a.id)) return false;
        // Check if either already has a spouse
        if (this._hasSpouse(a.id) || this._hasSpouse(b.id)) return false;
        return true;
    }

    _getRomanceChance(a, b) {
        let chance = 0.05; // Base 5%
        if (this._hasTraitId(a, 'romantic') || this._hasTraitId(b, 'romantic')) chance += 0.15;
        if (this._hasTraitId(a, 'charismatic') || this._hasTraitId(b, 'charismatic')) chance += 0.1;
        if (this._hasTraitId(a, 'loner') || this._hasTraitId(b, 'loner')) chance -= 0.03;
        return Math.max(0.01, Math.min(0.4, chance));
    }

    _hasSpouse(entityId) {
        for (const [, couple] of this.marriages) {
            if (couple.a === entityId || couple.b === entityId) return true;
        }
        return false;
    }

    // ─── COURTSHIP & MARRIAGE ──────────────────────────────────────
    processCourtship(entityManager, settlementManager, tick) {
        // Look for lovers who could become spouses
        for (const [key, rel] of this._allRelationships()) {
            if (rel.level !== REL.LOVER) continue;

            const [idA, idB] = key.split(':').map(Number);
            const a = entityManager.get(idA);
            const b = entityManager.get(idB);
            if (!a || !b || !a.alive || !b.alive) continue;

            // Marriage chance — score must be very high
            if (rel.score >= 90 && Math.random() < 0.1) {
                this._marry(a, b, tick, settlementManager);
            }
        }
    }

    _marry(a, b, tick, settlementManager) {
        const coupleKey = `${Math.min(a.id, b.id)}:${Math.max(a.id, b.id)}`;
        if (this.marriages.has(coupleKey)) return;

        // Set relationship to spouse
        const rel = this._getOrCreateRel(a.id, b.id);
        rel.level = REL.SPOUSE;
        rel.history.push('married');

        this.marriages.set(coupleKey, {
            a: a.id,
            b: b.id,
            tick,
            children: []
        });

        // Link partner references
        a.spouseId = b.id;
        b.spouseId = a.id;

        // Mood boost for both and settlement
        a.happiness = Math.min(100, (a.happiness || 50) + 25);
        b.happiness = Math.min(100, (b.happiness || 50) + 25);

        // Create wedding event
        const settlement = settlementManager.get(a.settlementId);
        if (settlement) {
            this.pendingEvents.push({
                type: 'wedding',
                settlementId: settlement.id,
                unitA: a.id,
                unitB: b.id,
                tick,
                icon: '💒',
                message: `${a.name} và ${b.name} kết hôn tại ${settlement.name}`
            });
            this._applyEventToSettlement(settlement, SOCIAL_EVENTS.WEDDING, tick);
        }
    }

    // ─── SOCIAL EVENTS ─────────────────────────────────────────────
    processSocialEvents(gameState, tick) {
        const { settlementManager, entityManager } = gameState;

        for (const settlement of settlementManager.getAll()) {
            const social = this._getOrCreateSettlementSocial(settlement.id);
            const units = entityManager.getBySettlement(settlement.id);
            if (units.length < 3) continue;

            const avgHappiness = units.reduce((s, u) => s + (u.happiness || 50), 0) / units.length;
            const avgHealth = units.reduce((s, u) => s + (u.hp / u.maxHp), 0) / units.length;

            // === FESTIVAL — happy, stable settlement with temple ===
            if (avgHappiness > 60 && settlement.population >= 10 &&
                settlement.buildings.some(b => b.type === 'temple') &&
                this._canTriggerEvent(social, 'festival', tick)) {
                if (Math.random() < 0.15) {
                    this._triggerSocialEvent(settlement, units, SOCIAL_EVENTS.FESTIVAL, tick, gameState);
                }
            }

            // === PRAYER — has temple ===
            if (settlement.buildings.some(b => b.type === 'temple') &&
                this._canTriggerEvent(social, 'prayer', tick)) {
                if (Math.random() < 0.2) {
                    this._triggerSocialEvent(settlement, units, SOCIAL_EVENTS.PRAYER, tick, gameState);
                }
            }

            // === MARKETPLACE — has market ===
            if (settlement.buildings.some(b => b.type === 'market') &&
                settlement.population >= 8 &&
                this._canTriggerEvent(social, 'marketplace', tick)) {
                if (Math.random() < 0.15) {
                    this._triggerSocialEvent(settlement, units, SOCIAL_EVENTS.MARKETPLACE, tick, gameState);
                }
            }

            // === COUNCIL — has town_hall, large settlement ===
            if (settlement.buildings.some(b => b.type === 'town_hall') &&
                settlement.population >= 20 &&
                this._canTriggerEvent(social, 'council', tick)) {
                if (Math.random() < 0.1) {
                    this._triggerSocialEvent(settlement, units, SOCIAL_EVENTS.COUNCIL, tick, gameState);
                }
            }

            // === ARGUMENT — unhappy units with rivals ===
            if (avgHappiness < 30 && this._canTriggerEvent(social, 'argument', tick)) {
                if (Math.random() < 0.25) {
                    this._triggerSocialEvent(settlement, units, SOCIAL_EVENTS.ARGUMENT, tick, gameState);
                }
            }

            // === INSPIRATION — random among skilled units ===
            if (this._canTriggerEvent(social, 'inspiration', tick)) {
                const inspired = units.find(u => u.age > 20 && Math.random() < 0.03);
                if (inspired) {
                    this._triggerSocialEvent(settlement, units, SOCIAL_EVENTS.INSPIRATION, tick, gameState);
                    inspired.happiness = Math.min(100, (inspired.happiness || 50) + 20);
                }
            }

            // === RIOT — very low stability, overcrowded ===
            if (social.stability < 15 && settlement.population >= 15 &&
                avgHappiness < 10 &&
                this._canTriggerEvent(social, 'riot', tick)) {
                if (Math.random() < 0.1) {
                    this._triggerSocialEvent(settlement, units, SOCIAL_EVENTS.RIOT, tick, gameState);
                    // Riots cause damage
                    for (const u of units) {
                        if (Math.random() < 0.3) {
                            u.hp = Math.max(1, u.hp - 10);
                        }
                    }
                    // Lose resources
                    settlement.food = Math.max(0, settlement.food - 20);
                    settlement.gold = Math.max(0, settlement.gold - 10);
                }
            }
        }
    }

    _triggerSocialEvent(settlement, units, eventDef, tick, gameState) {
        const social = this._getOrCreateSettlementSocial(settlement.id);

        // Apply effects
        this._applyEventToSettlement(settlement, eventDef, tick);

        // Mood effect on units
        for (const u of units) {
            u.happiness = Math.max(-100, Math.min(100, (u.happiness || 50) + eventDef.moodBoost));
        }

        // Record cooldown
        social.cooldowns[eventDef.id] = tick;
        social.recentEvents.push({ type: eventDef.id, tick, name: eventDef.name });

        // Keep recent events trimmed
        if (social.recentEvents.length > 20) {
            social.recentEvents = social.recentEvents.slice(-20);
        }

        // Push to pending for HUD/visual
        this.pendingEvents.push({
            type: eventDef.id,
            settlementId: settlement.id,
            tick,
            icon: eventDef.icon,
            message: `${eventDef.icon} ${eventDef.name} tại ${settlement.name}`
        });

        // Log to history
        if (gameState.historySystem) {
            gameState.historySystem.logEvent(
                'social_event',
                `${eventDef.name} tại ${settlement.name}`,
                { type: eventDef.id, settlementId: settlement.id }
            );
        }
    }

    _applyEventToSettlement(settlement, eventDef, tick) {
        const social = this._getOrCreateSettlementSocial(settlement.id);
        social.stability = Math.max(0, Math.min(100, social.stability + eventDef.stabilityBoost));
        // Faith boost through settlement's cultural level proxy
        settlement.culturalLevel = Math.max(0, (settlement.culturalLevel || 0) + eventDef.faithBoost * 0.1);
    }

    _canTriggerEvent(social, eventId, tick) {
        const def = Object.values(SOCIAL_EVENTS).find(e => e.id === eventId);
        if (!def) return false;
        const lastTick = social.cooldowns[eventId] || 0;
        return (tick - lastTick) >= def.cooldown;
    }

    // ─── COLONY STABILITY ──────────────────────────────────────────
    updateColonyStability(gameState, tick) {
        const { entityManager, settlementManager } = gameState;

        for (const settlement of settlementManager.getAll()) {
            const social = this._getOrCreateSettlementSocial(settlement.id);
            const units = entityManager.getBySettlement(settlement.id);
            if (units.length === 0) continue;

            // Base stability factors
            let stabilityDelta = 0;

            // 1. Average happiness contribution
            const avgHappiness = units.reduce((s, u) => s + (u.happiness || 50), 0) / units.length;
            if (avgHappiness > 60) stabilityDelta += 2;
            else if (avgHappiness > 40) stabilityDelta += 0.5;
            else if (avgHappiness < 20) stabilityDelta -= 3;
            else if (avgHappiness < 35) stabilityDelta -= 1;

            // 2. Food security
            const foodPerCapita = settlement.food / Math.max(1, settlement.population);
            if (foodPerCapita > 5) stabilityDelta += 1;
            else if (foodPerCapita < 1) stabilityDelta -= 3;
            else if (foodPerCapita < 2) stabilityDelta -= 1;

            // 3. Housing pressure
            const housingRatio = settlement.population / Math.max(1, settlement.maxPopulation);
            if (housingRatio < 0.7) stabilityDelta += 1;
            else if (housingRatio > 1.0) stabilityDelta -= 3;
            else if (housingRatio > 0.9) stabilityDelta -= 1;

            // 4. Social cohesion — ratio of friends vs rivals
            let friendCount = 0;
            let rivalCount = 0;
            for (const u of units) {
                const rels = this.relationships.get(u.id);
                if (!rels) continue;
                for (const [, rel] of rels) {
                    if (rel.level >= REL.FRIEND) friendCount++;
                    if (rel.level <= REL.RIVAL) rivalCount++;
                }
            }
            const totalRels = friendCount + rivalCount;
            if (totalRels > 0) {
                const cohesionRatio = (friendCount - rivalCount) / totalRels;
                stabilityDelta += cohesionRatio * 3;
            }

            // 5. At war penalty
            const kingdom = gameState.kingdomManager ? gameState.kingdomManager.get(settlement.kingdomId) : null;
            if (kingdom && kingdom.enemies && kingdom.enemies.size > 0) {
                stabilityDelta -= kingdom.enemies.size * 1.5;
            }

            // 6. Temple/statue bonus
            if (settlement.buildings.some(b => b.type === 'temple')) stabilityDelta += 1;
            stabilityDelta += settlement.buildings.filter(b => b.type === 'statue').length * 0.5;

            // 7. Leadership bonus
            const hasLeader = units.some(u => u.isLeader);
            if (hasLeader) stabilityDelta += 1;

            // 8. Recent deaths grief
            const deadRecently = units.filter(u => !u.alive).length; // Won't trigger since we filtered alive, but check family
            for (const u of units) {
                if (u.spouseId) {
                    const spouse = gameState.entityManager.get(u.spouseId);
                    if (!spouse || !spouse.alive) {
                        stabilityDelta -= 1; // Grieving widow/widower
                        u.happiness = Math.max(-100, (u.happiness || 50) - 5);
                    }
                }
            }

            // Apply delta
            social.stability = Math.max(0, Math.min(100, social.stability + stabilityDelta * 0.1));

            // Cache social mood for other systems to read
            social.socialMood = avgHappiness;
            social.cohesion = totalRels > 0 ? (friendCount - rivalCount) / totalRels : 0;
            social.friendships = friendCount;
            social.rivalries = rivalCount;
            social.marriageCount = this._countMarriages(settlement.id, gameState.entityManager);

            // Store on settlement for easy access
            settlement.socialStability = social.stability;
            settlement.socialCohesion = social.cohesion;
        }
    }

    _countMarriages(settlementId, entityManager) {
        let count = 0;
        for (const [, couple] of this.marriages) {
            const a = entityManager.get(couple.a);
            if (a && a.alive && a.settlementId === settlementId) count++;
        }
        return count;
    }

    // ─── SOCIAL MOOD EFFECTS ───────────────────────────────────────
    applySocialMoodEffects(entityManager, settlementManager, tick) {
        for (const settlement of settlementManager.getAll()) {
            const social = this._getOrCreateSettlementSocial(settlement.id);
            const units = entityManager.getBySettlement(settlement.id);

            for (const unit of units) {
                let socialBonus = 0;

                // Loneliness penalty for extroverts
                const socialTrait = this._getSocialTrait(unit);
                if (socialTrait) {
                    const friends = this._countFriends(unit.id);
                    if (friends === 0 && socialTrait.lonelinessPenalty) {
                        socialBonus += socialTrait.lonelinessPenalty;
                    }
                }

                // Spouse happiness bonus
                if (unit.spouseId) {
                    const spouse = entityManager.get(unit.spouseId);
                    if (spouse && spouse.alive && spouse.settlementId === unit.settlementId) {
                        socialBonus += 8; // Happily married and together
                        if (this._hasTraitId(unit, 'romantic')) socialBonus += 7;
                    } else if (!spouse || !spouse.alive) {
                        socialBonus -= 15; // Grieving
                        // Clear dead spouse reference after some time
                    } else {
                        socialBonus -= 3; // Separated from spouse
                    }
                }

                // Close friend bonus
                const closeFriends = this._countRelOfLevel(unit.id, REL.CLOSE_FRIEND);
                socialBonus += Math.min(10, closeFriends * 3);

                // Rival penalty
                const rivals = this._countRelOfLevel(unit.id, REL.RIVAL);
                socialBonus -= rivals * 2;

                const enemies = this._countRelOfLevel(unit.id, REL.ENEMY);
                socialBonus -= enemies * 4;

                // Colony stability effect
                if (social.stability > 70) socialBonus += 3;
                else if (social.stability < 30) socialBonus -= 5;
                else if (social.stability < 50) socialBonus -= 2;

                // Apply social mood modifier to happiness
                unit.happiness = Math.max(-100, Math.min(100, (unit.happiness || 50) + socialBonus * 0.1));

                // Store social state on unit for tooltip/inspect
                unit.socialFriends = this._countFriends(unit.id);
                unit.socialRivals = rivals + enemies;
                unit.socialLevel = unit.spouseId ? 'Có gia đình' :
                    closeFriends > 0 ? 'Hòa đồng' :
                    rivals > 0 ? 'Cô lập' : 'Bình thường';
            }
        }
    }

    // ─── SOCIAL GATHERING ──────────────────────────────────────────
    processSocialGathering(entityManager, settlementManager, gameState) {
        for (const settlement of settlementManager.getAll()) {
            const units = entityManager.getBySettlement(settlement.id);
            if (units.length < 4) continue;

            // Find social buildings (gathering spots)
            const gatherSpots = settlement.buildings.filter(b =>
                ['temple', 'market', 'town_hall', 'statue'].includes(b.type) &&
                b.x !== undefined && b.y !== undefined
            );
            if (gatherSpots.length === 0) continue;

            // Some idle units occasionally walk to social spots
            for (const unit of units) {
                if (unit.state !== 'idle') continue;
                if (Math.random() > 0.08) continue; // 8% chance per idle tick

                // Extroverts gather more
                if (this._hasTraitId(unit, 'extrovert') && Math.random() < 0.15) {
                    // Extra chance
                } else if (this._hasTraitId(unit, 'loner') || this._hasTraitId(unit, 'introvert')) {
                    if (Math.random() > 0.3) continue; // Much less likely to gather
                }

                // Pick a random gathering spot
                const spot = gatherSpots[Math.floor(Math.random() * gatherSpots.length)];
                moveEntityTo(unit, spot.x, spot.y);
                unit.task = { type: 'socializing', target: spot };
            }
        }
    }

    // ─── CLEANUP ───────────────────────────────────────────────────
    cleanupDeadRelationships(entityManager) {
        for (const [entityId, rels] of this.relationships) {
            const entity = entityManager.get(entityId);
            if (!entity || !entity.alive) {
                this.relationships.delete(entityId);
                continue;
            }
            for (const [otherId] of rels) {
                const other = entityManager.get(otherId);
                if (!other || !other.alive) {
                    rels.delete(otherId);
                }
            }
        }

        // Cleanup dead marriages
        for (const [key, couple] of this.marriages) {
            const a = entityManager.get(couple.a);
            const b = entityManager.get(couple.b);
            if (!a || !a.alive || !b || !b.alive) {
                // One partner died — clear spouse references
                if (a && a.alive) a.spouseId = null;
                if (b && b.alive) b.spouseId = null;
                this.marriages.delete(key);
            }
        }
    }

    // ─── INTERNAL HELPERS ──────────────────────────────────────────
    _getOrCreateRel(idA, idB) {
        // Normalize key so A < B
        const keyA = Math.min(idA, idB);
        const keyB = Math.max(idA, idB);

        if (!this.relationships.has(keyA)) {
            this.relationships.set(keyA, new Map());
        }
        const rels = this.relationships.get(keyA);
        if (!rels.has(keyB)) {
            rels.set(keyB, { level: REL.STRANGER, score: 0, history: [] });
        }
        return rels.get(keyB);
    }

    *_allRelationships() {
        for (const [idA, rels] of this.relationships) {
            for (const [idB, rel] of rels) {
                yield [`${idA}:${idB}`, rel];
            }
        }
    }

    _getSocialTrait(unit) {
        if (!unit.traits) return null;
        for (const t of unit.traits) {
            if (SOCIAL_TRAITS[t]) return SOCIAL_TRAITS[t];
        }
        return null;
    }

    _hasTraitId(unit, traitId) {
        return unit.traits && unit.traits.includes(traitId);
    }

    _countFriends(entityId) {
        let count = 0;
        // Check as keyA
        const relsA = this.relationships.get(entityId);
        if (relsA) {
            for (const [, rel] of relsA) {
                if (rel.level >= REL.FRIEND) count++;
            }
        }
        // Check as keyB
        for (const [keyA, rels] of this.relationships) {
            if (keyA === entityId) continue;
            const rel = rels.get(entityId);
            if (rel && rel.level >= REL.FRIEND) count++;
        }
        return count;
    }

    _countRelOfLevel(entityId, level) {
        let count = 0;
        const relsA = this.relationships.get(entityId);
        if (relsA) {
            for (const [, rel] of relsA) {
                if (rel.level === level) count++;
            }
        }
        for (const [keyA, rels] of this.relationships) {
            if (keyA === entityId) continue;
            const rel = rels.get(entityId);
            if (rel && rel.level === level) count++;
        }
        return count;
    }

    _getOrCreateSettlementSocial(settlementId) {
        if (!this.settlementSocial.has(settlementId)) {
            this.settlementSocial.set(settlementId, {
                stability: 50,
                recentEvents: [],
                cooldowns: {},
                socialMood: 50,
                cohesion: 0,
                friendships: 0,
                rivalries: 0,
                marriageCount: 0
            });
        }
        return this.settlementSocial.get(settlementId);
    }

    // ─── PUBLIC API ────────────────────────────────────────────────
    /**
     * Get social data for a specific entity (for UI/tooltip)
     */
    getEntitySocial(entityId, entityManager) {
        const friends = [];
        const rivals = [];
        let spouse = null;

        const relsA = this.relationships.get(entityId);
        if (relsA) {
            for (const [otherId, rel] of relsA) {
                const other = entityManager.get(otherId);
                if (!other || !other.alive) continue;
                if (rel.level >= REL.FRIEND) friends.push({ id: otherId, name: other.name, level: REL_NAMES[rel.level] });
                if (rel.level <= REL.RIVAL) rivals.push({ id: otherId, name: other.name, level: REL_NAMES[rel.level] });
                if (rel.level === REL.SPOUSE) spouse = { id: otherId, name: other.name };
            }
        }

        for (const [keyA, rels] of this.relationships) {
            if (keyA === entityId) continue;
            const rel = rels.get(entityId);
            if (!rel) continue;
            const other = entityManager.get(keyA);
            if (!other || !other.alive) continue;
            if (rel.level >= REL.FRIEND) friends.push({ id: keyA, name: other.name, level: REL_NAMES[rel.level] });
            if (rel.level <= REL.RIVAL) rivals.push({ id: keyA, name: other.name, level: REL_NAMES[rel.level] });
            if (rel.level === REL.SPOUSE) spouse = { id: keyA, name: other.name };
        }

        return { friends, rivals, spouse };
    }

    /**
     * Get social data for a settlement (for HUD panel)
     */
    getSettlementSocial(settlementId) {
        return this._getOrCreateSettlementSocial(settlementId);
    }

    /**
     * Get all recent social events
     */
    getRecentEvents(count = 10) {
        return this.pendingEvents.slice(-count);
    }

    /**
     * Consume pending events (for HUD notification system)
     */
    consumePendingEvents() {
        const events = [...this.pendingEvents];
        this.pendingEvents = [];
        return events;
    }

    /**
     * Get relationship name for UI
     */
    static getRelationshipName(level) {
        return REL_NAMES[level] || 'Xa Lạ';
    }

    // ─── SAVE / LOAD ───────────────────────────────────────────────
    getSaveData() {
        const rels = [];
        for (const [idA, relMap] of this.relationships) {
            for (const [idB, rel] of relMap) {
                rels.push({ a: idA, b: idB, level: rel.level, score: rel.score, history: rel.history.slice(-5) });
            }
        }
        const marriages = [];
        for (const [, couple] of this.marriages) {
            marriages.push({ ...couple });
        }
        const settlements = {};
        for (const [id, social] of this.settlementSocial) {
            settlements[id] = {
                stability: social.stability,
                recentEvents: social.recentEvents.slice(-10),
                cooldowns: social.cooldowns
            };
        }
        return { relationships: rels, marriages, settlements };
    }

    restoreSaveData(data) {
        if (!data) return;
        this.relationships.clear();
        this.marriages.clear();
        this.settlementSocial.clear();

        if (data.relationships) {
            for (const r of data.relationships) {
                const keyA = Math.min(r.a, r.b);
                const keyB = Math.max(r.a, r.b);
                if (!this.relationships.has(keyA)) this.relationships.set(keyA, new Map());
                this.relationships.get(keyA).set(keyB, { level: r.level, score: r.score, history: r.history || [] });
            }
        }
        if (data.marriages) {
            for (const m of data.marriages) {
                const key = `${Math.min(m.a, m.b)}:${Math.max(m.a, m.b)}`;
                this.marriages.set(key, m);
            }
        }
        if (data.settlements) {
            for (const [id, s] of Object.entries(data.settlements)) {
                this.settlementSocial.set(Number(id), {
                    stability: s.stability || 50,
                    recentEvents: s.recentEvents || [],
                    cooldowns: s.cooldowns || {},
                    socialMood: 50,
                    cohesion: 0,
                    friendships: 0,
                    rivalries: 0,
                    marriageCount: 0
                });
            }
        }
    }
}
