/**
 * EquipmentSystem — handles 6-slot equipment, durability decay,
 * forge-based repair, auto-equip from settlements, and modifier effects.
 */
import { generateItem, EQUIPMENT_SLOTS, MODIFIERS, getMaterial } from '../data/equipment.js';

// Durability lost per combat action
const COMBAT_DURABILITY_COST = 1;
// Durability lost per gathering/building action
const WORK_DURABILITY_COST = 0.5;
// Durability repaired per forge per tick cycle
const FORGE_REPAIR_RATE = 5;

/**
 * Create a fresh 6-slot equipment map.
 */
function freshSlots() {
    return {
        weapon: null,
        helmet: null,
        armor: null,
        boots: null,
        ring: null,
        amulet: null
    };
}

export class EquipmentSystem {
    constructor() {
        // Map<entityId, { weapon: item|null, helmet: item|null, armor: item|null,
        //                   boots: item|null, ring: item|null, amulet: item|null }>
        // Each item is the full generated object from generateItem().
        this.equipment = new Map();
    }

    update(gameState, tick) {
        // Auto-equip every 100 ticks
        if (tick % 100 === 0) {
            this.autoEquip(gameState);
        }

        // Forge repair every 100 ticks (same cycle, after auto-equip)
        if (tick % 100 === 0) {
            this.processForgeRepair(gameState);
        }

        // Durability decay for fighting entities every 20 ticks
        if (tick % 20 === 0) {
            this.processDurabilityDecay(gameState);
        }
    }

    // ─── Equipment management ──────────────────────────────────

    /**
     * Equip an item object onto an entity. Replaces existing item in that slot.
     * @param {number} entityId
     * @param {object} item - Full item object from generateItem()
     * @returns {object|null} The equipped item, or null if invalid.
     */
    equipItem(entityId, item) {
        if (!item || !item.slot) return null;

        if (!this.equipment.has(entityId)) {
            this.equipment.set(entityId, freshSlots());
        }

        const slots = this.equipment.get(entityId);
        const slot = item.slot;

        if (!EQUIPMENT_SLOTS.includes(slot)) return null;

        // Unequip existing item in that slot first
        if (slots[slot]) {
            this.unequipItem(entityId, slot);
        }

        slots[slot] = item;
        return item;
    }

    /**
     * Remove equipment from a slot.
     * @returns {object|null} The removed item, or null.
     */
    unequipItem(entityId, slot) {
        const slots = this.equipment.get(entityId);
        if (!slots || !slots[slot]) return null;

        const item = slots[slot];
        slots[slot] = null;
        return item;
    }

    /**
     * Returns the 6-slot equipment map for an entity.
     * Old 3-slot saves are migrated on-the-fly.
     */
    getEntityEquipment(entityId) {
        const slots = this.equipment.get(entityId);
        if (!slots) return freshSlots();
        // Ensure all 6 keys exist (handles migrated saves with missing keys)
        return {
            weapon: slots.weapon || null,
            helmet: slots.helmet || null,
            armor: slots.armor || null,
            boots: slots.boots || null,
            ring: slots.ring || null,
            amulet: slots.amulet || null
        };
    }

    /**
     * Check if entity has all 6 slots filled.
     */
    isFullyEquipped(entityId) {
        const eq = this.getEntityEquipment(entityId);
        return EQUIPMENT_SLOTS.every(slot => eq[slot] != null);
    }

    // ─── Stat application ──────────────────────────────────────

    /**
     * Add equipment stats to entity. Respects durability:
     * items at 0 durability contribute only half stats.
     */
    applyStatBonuses(entity, equipmentSlots) {
        for (const slot of EQUIPMENT_SLOTS) {
            const item = equipmentSlots[slot];
            if (!item) continue;

            const s = item.stats;
            if (!s) continue;

            // Durability multiplier: halved at 0 durability
            const durMult = item.durability <= 0 ? 0.5 : 1;

            if (s.attack)      entity.attack  += Math.floor(s.attack * durMult);
            if (s.defense)     entity.defense += Math.floor(s.defense * durMult);
            if (s.attackSpeed) entity.attackSpeed = (entity.attackSpeed || 1.0) + (s.attackSpeed - 1.0) * durMult;
            if (s.speed)       entity.speed   += s.speed * durMult;
            if (s.range)       entity.range   = Math.max(entity.range || 1, s.range);
            if (s.damage)      entity.attack  += Math.floor(s.damage * durMult);
            if (s.armor)       entity.defense += Math.floor(s.armor * durMult);
            if (s.crit)        entity.crit    = (entity.crit || 0) + Math.floor(s.crit * durMult);
            if (s.dodge)       entity.dodge   = (entity.dodge || 0) + Math.floor(s.dodge * durMult);
            if (s.accuracy)    entity.accuracy = (entity.accuracy || 0) + Math.floor(s.accuracy * durMult);
        }

        this.clampStats(entity);
    }

    /**
     * Remove equipment stats from entity.
     */
    removeStatBonuses(entity, equipmentSlots) {
        for (const slot of EQUIPMENT_SLOTS) {
            const item = equipmentSlots[slot];
            if (!item) continue;

            const s = item.stats;
            if (!s) continue;

            const durMult = item.durability <= 0 ? 0.5 : 1;

            if (s.attack)      entity.attack  -= Math.floor(s.attack * durMult);
            if (s.defense)     entity.defense -= Math.floor(s.defense * durMult);
            if (s.attackSpeed) entity.attackSpeed = (entity.attackSpeed || 1.0) - (s.attackSpeed - 1.0) * durMult;
            if (s.speed)       entity.speed   -= s.speed * durMult;
            if (s.range)       entity.range   = Math.max(1, (entity.range || 1) - (s.range || 0));
            if (s.damage)      entity.attack  -= Math.floor(s.damage * durMult);
            if (s.armor)       entity.defense -= Math.floor(s.armor * durMult);
            if (s.crit)        entity.crit    = (entity.crit || 0) - Math.floor(s.crit * durMult);
            if (s.dodge)       entity.dodge   = (entity.dodge || 0) - Math.floor(s.dodge * durMult);
            if (s.accuracy)    entity.accuracy = (entity.accuracy || 0) - Math.floor(s.accuracy * durMult);
        }

        this.clampStats(entity);
    }

    // ─── Auto-equip from settlements with forges ───────────────

    autoEquip(gameState) {
        const { settlementManager, entityManager } = gameState;
        if (!settlementManager || !entityManager) return;

        for (const settlement of settlementManager.getAll()) {
            const forgeCount = settlement.buildings.filter(b => b.type === 'forge').length;
            if (forgeCount === 0) continue;

            const units = entityManager.getBySettlement(settlement.id);
            const equippedPerForge = 2;
            let equipped = 0;

            for (const unit of units) {
                if (equipped >= forgeCount * equippedPerForge) break;
                if (!unit.alive) continue;
                if (this.isFullyEquipped(unit.id)) continue;

                const tier = settlement.tier || 0;
                const eq = this.getEntityEquipment(unit.id);

                // Equip empty slots in priority order
                const slotPriority = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet'];
                for (const slot of slotPriority) {
                    if (equipped >= forgeCount * equippedPerForge) break;
                    if (eq[slot]) continue;

                    const item = generateItem(slot, tier);
                    if (item) {
                        // Remove old stats if re-equipping
                        this.equipItem(unit.id, item);
                        this.applyStatBonuses(unit, this.getEntityEquipment(unit.id));
                        equipped++;
                    }
                }
            }
        }
    }

    // ─── Durability ────────────────────────────────────────────

    /**
     * Process durability decay for entities currently in combat.
     */
    processDurabilityDecay(gameState) {
        const { entityManager } = gameState;
        if (!entityManager) return;

        for (const [entityId, slots] of this.equipment) {
            const entity = entityManager.get(entityId);
            if (!entity || !entity.alive) continue;

            // Only decay durability for entities actively fighting or working
            const isFighting = entity.state === 'fighting';
            const isWorking = entity.state === 'gathering' || entity.state === 'building';
            if (!isFighting && !isWorking) continue;

            const cost = isFighting ? COMBAT_DURABILITY_COST : WORK_DURABILITY_COST;

            for (const slot of EQUIPMENT_SLOTS) {
                const item = slots[slot];
                if (!item || item.durability <= 0) continue;

                item.durability = Math.max(0, item.durability - cost);

                // If just broke, recalculate stats
                if (item.durability <= 0) {
                    this.removeStatBonuses(entity, { [slot]: item });
                    // Re-apply with halved stats
                    this.applyStatBonuses(entity, { [slot]: item });
                }
            }
        }
    }

    /**
     * Repair equipment for entities in settlements that have forges.
     */
    processForgeRepair(gameState) {
        const { settlementManager, entityManager } = gameState;
        if (!settlementManager || !entityManager) return;

        for (const settlement of settlementManager.getAll()) {
            const forgeCount = settlement.buildings.filter(b => b.type === 'forge').length;
            if (forgeCount === 0) continue;

            const units = entityManager.getBySettlement(settlement.id);
            const repairAmount = forgeCount * FORGE_REPAIR_RATE;

            for (const unit of units) {
                if (!unit.alive) continue;
                const eq = this.getEntityEquipment(unit.id);

                for (const slot of EQUIPMENT_SLOTS) {
                    const item = eq[slot];
                    if (!item) continue;
                    if (item.durability >= item.maxDurability) continue;

                    const wasBroken = item.durability <= 0;
                    item.durability = Math.min(item.maxDurability, item.durability + repairAmount);

                    // If repaired from broken, recalculate stats
                    if (wasBroken && item.durability > 0) {
                        this.removeStatBonuses(unit, { [slot]: item });
                        this.applyStatBonuses(unit, { [slot]: item });
                    }
                }
            }
        }
    }

    /**
     * Manually damage an item (e.g., from combat system).
     * @returns {boolean} Whether the item just broke (went to 0).
     */
    damageItem(entityId, slot, amount = COMBAT_DURABILITY_COST) {
        const eq = this.getEntityEquipment(entityId);
        const item = eq[slot];
        if (!item) return false;

        item.durability = Math.max(0, item.durability - amount);
        return item.durability <= 0;
    }

    /**
     * Get total stats from all equipment for an entity.
     * Useful for external systems that need to query equipment power.
     */
    getTotalStats(entityId) {
        const eq = this.getEntityEquipment(entityId);
        const total = { attack: 0, defense: 0, speed: 0 };
        for (const slot of EQUIPMENT_SLOTS) {
            const item = eq[slot];
            if (!item || !item.stats) continue;
            const durMult = item.durability <= 0 ? 0.5 : 1;
            const s = item.stats;
            if (s.attack) total.attack += Math.floor(s.attack * durMult);
            if (s.defense) total.defense += Math.floor(s.defense * durMult);
            if (s.speed) total.speed += s.speed * durMult;
        }
        return total;
    }

    // ─── Entity lifecycle ──────────────────────────────────────

    /**
     * Remove all equipment for a dead entity.
     */
    clearEntity(entityId) {
        this.equipment.delete(entityId);
    }

    // ─── Save / Load ──────────────────────────────────────────

    /**
     * Serialize for save system.
     */
    getSaveData() {
        const data = {};
        for (const [entityId, slots] of this.equipment) {
            const serialized = {};
            for (const slot of EQUIPMENT_SLOTS) {
                if (slots[slot]) {
                    serialized[slot] = { ...slots[slot] };
                } else {
                    serialized[slot] = null;
                }
            }
            data[entityId] = serialized;
        }
        return data;
    }

    /**
     * Restore from save data.
     * Handles backward compatibility: old 3-slot saves (weapon, armor, accessory)
     * are migrated to the new 6-slot format.
     */
    restoreSaveData(data) {
        this.equipment.clear();
        if (!data) return;

        for (const [entityId, slots] of Object.entries(data)) {
            const migrated = freshSlots();

            // New 6-slot format
            for (const slot of EQUIPMENT_SLOTS) {
                if (slots[slot]) {
                    migrated[slot] = slots[slot];
                }
            }

            // Backward compatibility: old 3-slot format
            // weapon → weapon (already handled)
            // armor → armor (already handled)
            // accessory → ring (migrate)
            if (slots.accessory && !slots.ring && !migrated.ring) {
                // Old accessory becomes a ring
                migrated.ring = slots.accessory;
            }

            this.equipment.set(Number(entityId), migrated);
        }
    }

    // ─── Helpers ───────────────────────────────────────────────

    clampStats(entity) {
        entity.attack  = Math.max(1, entity.attack || 1);
        entity.defense = Math.max(0, entity.defense || 0);
        entity.speed   = Math.max(0.1, entity.speed || 0.1);
        entity.attackSpeed = Math.max(0.5, entity.attackSpeed || 1.0);
        entity.maxHp   = Math.max(1, entity.maxHp || 1);
        entity.hp      = Math.min(entity.maxHp, entity.hp || 1);
    }
}
