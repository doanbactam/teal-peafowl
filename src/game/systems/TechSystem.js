/**
 * TechSystem — handles technology progression for settlements.
 * Gains tech points based on buildings, population, and culture,
 * then applies era bonuses to unit stats when eras change.
 */
import { TECH_ERAS, getCurrentEra, getEraForSettlement } from '../data/techs.js';

export class TechSystem {
    constructor() {
        // Track last applied era per settlement to avoid re-applying every tick
        // Map<settlementId, eraId>
        this.lastAppliedEra = new Map();
    }

    update(gameState, tick) {
        // Run every 30 ticks
        if (tick % 30 !== 0) return;

        const { settlementManager, entityManager } = gameState;

        for (const settlement of settlementManager.getAll()) {
            // Skip dead settlements
            if (settlement.alive === false) continue;

            // 1. Gain tech points
            const points = this.gainTechPoints(settlement, gameState);
            settlement.techLevel += points;

            // 2. Check if era changed
            const currentEra = this.getSettlementEra(settlement);
            const lastEraId = this.lastAppliedEra.get(settlement.id);

            if (currentEra.id !== lastEraId) {
                // 3. Apply new era bonuses
                this.applyEraBonuses(settlement, currentEra, entityManager);
                this.lastAppliedEra.set(settlement.id, currentEra.id);
            }
        }
    }

    /**
     * Get the current era for a settlement.
     */
    getSettlementEra(settlement) {
        return getEraForSettlement(settlement);
    }

    /**
     * Calculate and return tech points gained this cycle.
     * Formula:
     *   base = 0.1
     *   + academy_count * 0.5
     *   + market_count * 0.2  (library/knowledge bonus)
     *   + population / 100
     *   + culturalLevel * 0.05
     */
    gainTechPoints(settlement, gameState) {
        const academyCount = settlement.buildings.filter(b => b.type === 'academy').length;
        const marketCount = settlement.buildings.filter(b => b.type === 'market').length;
        const population = settlement.population || 0;
        const culturalLevel = settlement.culturalLevel || 0;

        const base = 0.1;
        const academyBonus = academyCount * 0.5;
        const marketBonus = marketCount * 0.2;
        const popBonus = population / 100;
        const cultureBonus = culturalLevel * 0.05;

        return base + academyBonus + marketBonus + popBonus + cultureBonus;
    }

    /**
     * Apply era stat multipliers to all units in a settlement.
     * Only called when era changes — removes previous era bonuses first,
     * then applies new ones.
     */
    applyEraBonuses(settlement, newEra, entityManager) {
        const units = entityManager.getBySettlement(settlement.id);
        if (units.length === 0) return;

        // Get previous era to remove its bonuses
        const prevEraId = this.lastAppliedEra.get(settlement.id);
        let prevBonuses = { attackMult: 1.0, defenseMult: 1.0, gatherMult: 1.0, buildMult: 1.0 };

        if (prevEraId) {
            const prevEra = this.findEraById(prevEraId);
            if (prevEra) {
                prevBonuses = prevEra.bonuses;
            }
        }

        const newBonuses = newEra.bonuses;

        for (const unit of units) {
            if (!unit.alive) continue;

            // Remove previous era multipliers by dividing them out
            // (undo: stat / oldMult * base, then apply new)
            // Since we store multiplied values, we reverse by dividing
            if (prevBonuses.attackMult !== 1.0) {
                unit.attack = Math.round(unit.attack / prevBonuses.attackMult);
            }
            if (prevBonuses.defenseMult !== 1.0) {
                unit.defense = Math.round(unit.defense / prevBonuses.defenseMult);
            }

            // Apply new era multipliers
            if (newBonuses.attackMult !== 1.0) {
                unit.attack = Math.round(unit.attack * newBonuses.attackMult);
            }
            if (newBonuses.defenseMult !== 1.0) {
                unit.defense = Math.round(unit.defense * newBonuses.defenseMult);
            }

            // Clamp
            unit.attack = Math.max(1, unit.attack);
            unit.defense = Math.max(0, unit.defense);
        }
    }

    /**
     * Find era by id from the TECH_ERAS object.
     */
    findEraById(eraId) {
        return TECH_ERAS[eraId] || null;
    }

    /**
     * Get save data.
     */
    getSaveData() {
        const data = {};
        for (const [id, eraId] of this.lastAppliedEra) {
            data[id] = eraId;
        }
        return data;
    }

    /**
     * Restore from save data.
     */
    restoreSaveData(data) {
        this.lastAppliedEra.clear();
        if (!data) return;
        for (const [id, eraId] of Object.entries(data)) {
            this.lastAppliedEra.set(Number(id), eraId);
        }
    }
}
