/**
 * Equipment data — material tiers, weapon types, equipment slots,
 * modifiers, and item generation.
 */

// ─── Material hierarchy (10 tiers) ─────────────────────────────
export const MATERIALS = {
    wood:       { tier: 1,  attackBonus: 1,  defenseBonus: 0,  color: 0x8B4513 },
    bone:       { tier: 2,  attackBonus: 2,  defenseBonus: 1,  color: 0xFFFACD },
    stone:      { tier: 3,  attackBonus: 3,  defenseBonus: 2,  color: 0x808080 },
    leather:    { tier: 2,  attackBonus: 0,  defenseBonus: 2,  color: 0x8B6914 },
    copper:     { tier: 4,  attackBonus: 5,  defenseBonus: 3,  color: 0xB87333 },
    bronze:     { tier: 5,  attackBonus: 7,  defenseBonus: 5,  color: 0xCD7F32 },
    iron:       { tier: 6,  attackBonus: 10, defenseBonus: 7,  color: 0xAAAAAA },
    steel:      { tier: 7,  attackBonus: 14, defenseBonus: 10, color: 0xCCCCCC },
    silver:     { tier: 8,  attackBonus: 12, defenseBonus: 8,  color: 0xC0C0C0 },
    gold:       { tier: 8,  attackBonus: 10, defenseBonus: 6,  color: 0xFFD700 },
    mythril:    { tier: 9,  attackBonus: 18, defenseBonus: 15, color: 0x7B68EE },
    adamantine: { tier: 10, attackBonus: 25, defenseBonus: 20, color: 0x2F4F4F },
    crystal:    { tier: 7,  attackBonus: 8,  defenseBonus: 4,  color: 0xE0E0FF }
};

/**
 * Get material definition by name.
 */
export function getMaterial(name) {
    return MATERIALS[name] || MATERIALS.wood;
}

// ─── Weapon types ──────────────────────────────────────────────
export const WEAPON_TYPES = {
    sword: { name: 'Kiếm', damageRange: 0.8, speedMod: 0, range: 1, icon: '⚔️' },
    axe: { name: 'Rìu', damageRange: 0.6, speedMod: -0.1, range: 1, icon: '🪓' },
    hammer: { name: 'Búa', damageRange: 0.1, speedMod: -0.2, range: 1, structureBonus: 2, icon: '🔨' },
    spear: { name: 'Giáo', damageRange: 0.7, speedMod: 0, range: 2, icon: '🔱' },
    bow: { name: 'Cung', damageRange: 0.6, speedMod: 0.1, range: 4, icon: '🏹' }
};

// ─── Equipment slots ───────────────────────────────────────────
export const EQUIPMENT_SLOTS = ['weapon', 'helmet', 'armor', 'boots', 'ring', 'amulet'];

// Slot → material mapping (what materials each slot can use)
export const SLOT_MATERIALS = {
    weapon: ['wood', 'bone', 'stone', 'copper', 'bronze', 'iron', 'steel', 'mythril', 'adamantine'],
    helmet: ['bone', 'copper', 'bronze', 'iron', 'steel', 'mythril', 'adamantine'],
    armor: ['leather', 'copper', 'bronze', 'iron', 'steel', 'mythril', 'adamantine'],
    boots: ['leather', 'copper', 'bronze', 'iron', 'steel'],
    ring: ['gold', 'mythril'],
    amulet: ['gold', 'silver', 'crystal']
};

// ─── Modifier definitions ──────────────────────────────────────
export const MODIFIERS = {
    damage: { name: 'Sát Thương', icon: '⚔️', levels: [1, 2, 3, 4, 5], color: '#ff6b6b' },
    armor: { name: 'Giáp', icon: '🛡️', levels: [1, 2, 3, 4, 5], color: '#74b9ff' },
    crit: { name: 'Chí Mạng', icon: '💥', levels: [1, 2, 3, 4, 5], color: '#fdcb6e' },
    speed: { name: 'Tốc Độ', icon: '💨', levels: [0.05, 0.1, 0.15, 0.2, 0.25], color: '#55efc4' },
    attackSpeed: { name: 'Tốc Đánh', icon: '⚡', levels: [0.05, 0.1, 0.15, 0.2, 0.25], color: '#ffeaa7' },
    dodge: { name: 'Né Tránh', icon: '🌀', levels: [1, 2, 3, 4, 5], color: '#81ecec' },
    accuracy: { name: 'Chính Xác', icon: '🎯', levels: [1, 2, 3, 4, 5], color: '#dfe6e9' }
};

// ─── Rarity ────────────────────────────────────────────────────
const RARITY_COLORS = {
    common:    '#aaaaaa',
    uncommon:  '#55ff55',
    rare:      '#5555ff',
    epic:      '#aa55ff',
    legendary: '#ffaa00'
};

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/**
 * Get hex color for a rarity string.
 */
export function getRarityColor(rarity) {
    return RARITY_COLORS[rarity] || RARITY_COLORS.common;
}

// ─── Item generation ───────────────────────────────────────────

/**
 * Generate a random equipment item for the given slot and tier.
 * @param {string} slot - One of EQUIPMENT_SLOTS
 * @param {number} tier - Settlement tier (0-based, higher = better materials)
 * @returns {object} Full item object with id, name, stats, durability, etc.
 */
export function generateItem(slot, tier = 1) {
    const materials = SLOT_MATERIALS[slot];
    if (!materials) return null;

    const materialName = materials[Math.min(Math.floor(Math.random() * tier), materials.length - 1)];
    const material = getMaterial(materialName);

    // Determine weapon subtype
    let weaponType = null;
    if (slot === 'weapon') {
        const types = Object.entries(WEAPON_TYPES);
        weaponType = types[Math.floor(Math.random() * types.length)];
    }

    // Random modifier (higher tiers = more likely)
    const modifierChance = 0.3 + tier * 0.1;
    let modifier = null;
    if (Math.random() < modifierChance) {
        const modKeys = Object.keys(MODIFIERS);
        const modKey = modKeys[Math.floor(Math.random() * modKeys.length)];
        const maxLevel = Math.min(5, Math.ceil(tier / 2));
        const level = Math.floor(Math.random() * maxLevel);
        modifier = { key: modKey, level };
    }

    // Calculate stats
    const stats = {};
    const baseAttack = (material.attackBonus || 1) * (weaponType ? (1 + weaponType[1].damageRange) : 0.5);
    const baseDefense = (material.defenseBonus || 0) * (slot === 'weapon' ? 0.2 : 1);

    if (baseAttack > 0) stats.attack = Math.max(1, Math.floor(baseAttack));
    if (baseDefense > 0) stats.defense = Math.floor(baseDefense);
    if (weaponType) {
        stats.range = weaponType[1].range;
        stats.attackSpeed = 1.0 + (weaponType[1].speedMod || 0);
    }

    // Apply modifier
    if (modifier) {
        const mod = MODIFIERS[modifier.key];
        const value = mod.levels[modifier.level];
        stats[modifier.key] = (stats[modifier.key] || 0) + value;
    }

    // Rarity based on material tier + modifier
    let rarity = 'common';
    if (material.tier >= 9) rarity = 'legendary';
    else if (material.tier >= 7) rarity = 'epic';
    else if (material.tier >= 5) rarity = 'rare';
    else if (material.tier >= 3 || modifier) rarity = 'uncommon';

    // Durability based on material
    const baseDurability = {
        wood: 50, bone: 60, stone: 80, leather: 70,
        copper: 100, bronze: 120, iron: 150, steel: 200,
        silver: 100, gold: 80, mythril: 250, adamantine: 400, crystal: 60
    };

    const name = generateItemName(slot, materialName, weaponType, modifier);

    return {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name,
        slot,
        material: materialName,
        weaponType: weaponType ? weaponType[0] : null,
        rarity,
        stats,
        modifier,
        durability: baseDurability[materialName] || 100,
        maxDurability: baseDurability[materialName] || 100,
        color: material.color,
        tier: material.tier
    };
}

/**
 * Build a human-readable item name.
 */
function generateItemName(slot, material, weaponType, modifier) {
    const slotNames = {
        weapon: weaponType ? WEAPON_TYPES[weaponType[0]].name : 'Vũ khí',
        helmet: 'Mũ', armor: 'Giáp', boots: 'Giày',
        ring: 'Nhẫn', amulet: 'Bùa'
    };
    const matNames = {
        wood: 'Gỗ', bone: 'Xương', stone: 'Đá', leather: 'Da',
        copper: 'Đồng', bronze: 'Đồng Thiếc', iron: 'Sắt', steel: 'Thép',
        silver: 'Bạc', gold: 'Vàng', mythril: 'Mithril', adamantine: 'Adamantine',
        crystal: 'Pha Lê'
    };

    let name = `${matNames[material] || material} ${slotNames[slot] || slot}`;
    if (modifier) {
        const prefixes = {
            damage: 'Sắc', armor: 'Bền', crit: 'Sát',
            speed: 'Khinh', attackSpeed: 'Nhanh',
            dodge: 'Lanh', accuracy: 'Chính'
        };
        name = `${prefixes[modifier.key] || '+'} ${name}`;
    }
    return name;
}

// ─── Backward compatibility ────────────────────────────────────
// These are kept for any legacy code paths but are no longer the primary system.

const LEGACY_EQUIPMENT = {
    wooden_sword: { id: 'wooden_sword', name: 'Kiếm Gỗ', type: 'weapon', rarity: 'common', stats: { attack: 3 }, color: '#8B6914' },
    iron_sword: { id: 'iron_sword', name: 'Kiếm Sắt', type: 'weapon', rarity: 'uncommon', stats: { attack: 7 }, color: '#b0b0b0' },
    leather_armor: { id: 'leather_armor', name: 'Giáp Da', type: 'armor', rarity: 'common', stats: { defense: 3 }, color: '#8B4513' },
    ring_hp: { id: 'ring_hp', name: 'Nhẫn Máu', type: 'accessory', rarity: 'uncommon', stats: { maxHp: 20 }, color: '#ff4444' }
};

/**
 * Get legacy equipment definition by id.
 * @deprecated Use generateItem() instead.
 */
export function getEquipment(id) {
    return LEGACY_EQUIPMENT[id] || null;
}

/**
 * Generate a random item for legacy auto-equip.
 * @deprecated Use generateItem(slot, tier) instead.
 */
export function getRandomEquipment(tier) {
    const slot = ['weapon', 'armor', 'accessory'][Math.floor(Math.random() * 3)];
    const item = generateItem(slot === 'accessory' ? 'ring' : slot, tier);
    return item;
}
