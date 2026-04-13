/**
 * Technology era definitions — settlements progress through eras
 * as their techLevel increases, unlocking buildings, equipment, and bonuses.
 */

export const TECH_ERAS = {
    stone_age: {
        id: 'stone_age', name: 'Thời Đồ Đá', nameEn: 'Stone Age',
        icon: '🪨', minTechLevel: 0,
        unlocks: {
            buildings: ['house', 'farm'],
            equipment: ['wooden_sword', 'dagger', 'leather_armor', 'shield']
        },
        bonuses: { attackMult: 1.0, defenseMult: 1.0, gatherMult: 1.0, buildMult: 1.0 }
    },
    bronze_age: {
        id: 'bronze_age', name: 'Thời Đồng Thau', nameEn: 'Bronze Age',
        icon: '⚒️', minTechLevel: 10,
        unlocks: {
            buildings: ['barracks', 'wall', 'mine'],
            equipment: ['spear', 'axe', 'bow']
        },
        bonuses: { attackMult: 1.1, defenseMult: 1.1, gatherMult: 1.2, buildMult: 1.1 }
    },
    iron_age: {
        id: 'iron_age', name: 'Thời Sắt', nameEn: 'Iron Age',
        icon: '⚔️', minTechLevel: 30,
        unlocks: {
            buildings: ['market', 'forge', 'port'],
            equipment: ['iron_sword', 'iron_armor', 'crossbow']
        },
        bonuses: { attackMult: 1.2, defenseMult: 1.2, gatherMult: 1.4, buildMult: 1.3 }
    },
    medieval: {
        id: 'medieval', name: 'Trung Cổ', nameEn: 'Medieval',
        icon: '🏰', minTechLevel: 60,
        unlocks: {
            buildings: ['temple', 'academy'],
            equipment: ['steel_sword', 'steel_armor']
        },
        bonuses: { attackMult: 1.4, defenseMult: 1.4, gatherMult: 1.6, buildMult: 1.5 }
    },
    renaissance: {
        id: 'renaissance', name: 'Phục Hưng', nameEn: 'Renaissance',
        icon: '🎨', minTechLevel: 100,
        unlocks: {
            buildings: [],
            equipment: ['golden_sword', 'golden_armor', 'ring_hp', 'ring_speed']
        },
        bonuses: { attackMult: 1.6, defenseMult: 1.6, gatherMult: 1.8, buildMult: 1.7 }
    },
    industrial: {
        id: 'industrial', name: 'Công Nghiệp', nameEn: 'Industrial',
        icon: '🏭', minTechLevel: 150,
        unlocks: {
            buildings: [],
            equipment: ['amulet_regen']
        },
        bonuses: { attackMult: 2.0, defenseMult: 2.0, gatherMult: 2.5, buildMult: 2.0 }
    }
};

// Ordered by minTechLevel ascending
const ERA_ORDER = [
    TECH_ERAS.stone_age,
    TECH_ERAS.bronze_age,
    TECH_ERAS.iron_age,
    TECH_ERAS.medieval,
    TECH_ERAS.renaissance,
    TECH_ERAS.industrial
];

/**
 * Get the era object for a given tech level.
 * Returns the highest era whose minTechLevel <= techLevel.
 */
export function getCurrentEra(techLevel) {
    let result = ERA_ORDER[0];
    for (const era of ERA_ORDER) {
        if (techLevel >= era.minTechLevel) {
            result = era;
        } else {
            break;
        }
    }
    return result;
}

/**
 * Shortcut: get era for a settlement object.
 */
export function getEraForSettlement(settlement) {
    return getCurrentEra(settlement.techLevel || 0);
}

/**
 * Returns ordered array of all eras.
 */
export function getAllEras() {
    return [...ERA_ORDER];
}

/**
 * Check if a given building type is unlocked at the settlement's tech level.
 */
export function isBuildingUnlocked(buildingType, techLevel) {
    const era = getCurrentEra(techLevel);
    // Check all eras up to and including current
    for (const e of ERA_ORDER) {
        if (e.minTechLevel > techLevel) break;
        if (e.unlocks.buildings.includes(buildingType)) return true;
    }
    return false;
}

/**
 * Check if a given equipment id is unlocked at the settlement's tech level.
 */
export function isEquipmentUnlocked(equipmentId, techLevel) {
    for (const e of ERA_ORDER) {
        if (e.minTechLevel > techLevel) break;
        if (e.unlocks.equipment.includes(equipmentId)) return true;
    }
    return false;
}
