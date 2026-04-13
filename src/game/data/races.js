/**
 * Race definitions — 6 playable civilizations, each with unique stats,
 * traits, and behavior modifiers.
 */
export const RACES = {
    HUMAN: {
        id: 'human',
        name: 'Human',
        icon: '👤',
        color: 0x5b9bd5,
        buildingColor: 0xa0785a,
        flagColor: '#5b9bd5',
        stats: {
            hp: 100, attack: 10, defense: 8, speed: 1.0,
            birthRate: 0.08, gatherRate: 1.0, buildRate: 1.0,
            combatBonus: 1.0,
            dodge: 6, accuracy: 93, attackSpeed: 1.0, critChance: 5, critMultiplier: 1.5,
            mana: 20, maxMana: 40, stamina: 100, maxStamina: 100
        },
        traits: ['adaptable', 'diplomatic', 'builder'],
        hostileTo: ['orc'],
        preferredBiomes: ['grass', 'forest', 'hill'],
        description: 'Balanced and adaptable — masters of diplomacy and construction.'
    },
    ELF: {
        id: 'elf',
        name: 'Elf',
        icon: '🧝',
        color: 0x2ecc71,
        buildingColor: 0x27ae60,
        flagColor: '#2ecc71',
        stats: {
            hp: 75, attack: 14, defense: 6, speed: 1.4,
            birthRate: 0.04, gatherRate: 0.8, buildRate: 0.9,
            combatBonus: 1.2,
            dodge: 16, accuracy: 96, attackSpeed: 1.2, critChance: 8, critMultiplier: 1.6,
            mana: 50, maxMana: 80, stamina: 80, maxStamina: 80
        },
        traits: ['nature_affinity', 'archer', 'swift'],
        hostileTo: ['orc'],
        preferredBiomes: ['forest', 'grass'],
        description: 'Fast and deadly archers who thrive in forests.'
    },
    ORC: {
        id: 'orc',
        name: 'Orc',
        icon: '👹',
        color: 0xe74c3c,
        buildingColor: 0x8b1a1a,
        flagColor: '#e74c3c',
        stats: {
            hp: 150, attack: 18, defense: 12, speed: 0.85,
            birthRate: 0.12, gatherRate: 1.3, buildRate: 0.65,
            combatBonus: 1.4,
            dodge: 1, accuracy: 91, attackSpeed: 0.8, critChance: 10, critMultiplier: 2.0,
            mana: 0, maxMana: 0, stamina: 150, maxStamina: 150
        },
        traits: ['warrior', 'raider', 'bloodthirsty'],
        hostileTo: ['human', 'elf', 'dwarf'],
        preferredBiomes: ['hill', 'desert', 'swamp'],
        description: 'Brutal warriors who breed fast and crush enemies.'
    },
    DWARF: {
        id: 'dwarf',
        name: 'Dwarf',
        icon: '⛏️',
        color: 0xf39c12,
        buildingColor: 0x8b8682,
        flagColor: '#f39c12',
        stats: {
            hp: 130, attack: 11, defense: 16, speed: 0.7,
            birthRate: 0.05, gatherRate: 1.6, buildRate: 1.5,
            combatBonus: 1.1,
            dodge: 1, accuracy: 91, attackSpeed: 0.9, critChance: 3, critMultiplier: 1.3,
            mana: 10, maxMana: 20, stamina: 130, maxStamina: 130
        },
        traits: ['miner', 'builder', 'resilient'],
        hostileTo: ['elf', 'orc'],
        preferredBiomes: ['mountain', 'hill', 'snow'],
        description: 'Master miners and builders with exceptional defense.'
    },
    DEMON: {
        id: 'demon',
        name: 'Demon',
        icon: '😈',
        color: 0x9b59b6,
        buildingColor: 0x4a1a6e,
        flagColor: '#9b59b6',
        stats: {
            hp: 180, attack: 22, defense: 10, speed: 1.1,
            birthRate: 0.06, gatherRate: 1.0, buildRate: 0.8,
            combatBonus: 1.6,
            dodge: 8, accuracy: 90, attackSpeed: 1.1, critChance: 12, critMultiplier: 1.8,
            mana: 80, maxMana: 120, stamina: 90, maxStamina: 90
        },
        traits: ['demonic', 'aggressive', 'corruptor'],
        hostileTo: ['human', 'elf', 'dwarf', 'orc'],
        preferredBiomes: ['lava', 'desert', 'snow'],
        description: 'Otherworldly destroyers hostile to all races.'
    },
    UNDEAD: {
        id: 'undead',
        name: 'Undead',
        icon: '💀',
        color: 0x8e9191,
        buildingColor: 0x2c3e50,
        flagColor: '#8e9191',
        stats: {
            hp: 80, attack: 9, defense: 7, speed: 0.9,
            birthRate: 0.0, gatherRate: 0.6, buildRate: 0.5,
            // Undead spawn from killed enemies
            combatBonus: 0.9,
            dodge: 0, accuracy: 85, attackSpeed: 0.7, critChance: 5, critMultiplier: 1.4,
            mana: 30, maxMana: 50, stamina: 999, maxStamina: 999
        },
        traits: ['undead', 'necrotic', 'resurrection'],
        hostileTo: ['human', 'elf', 'dwarf', 'orc', 'demon'],
        preferredBiomes: ['swamp', 'snow', 'dirt'],
        description: 'Risen dead — grow by resurrecting fallen enemies.'
    }
};

export function getRace(id) {
    return Object.values(RACES).find(r => r.id === id) || RACES.HUMAN;
}

export function areHostile(raceA, raceB) {
    if (raceA.id === raceB.id) return false;
    return raceA.hostileTo.includes(raceB.id) || raceB.hostileTo.includes(raceA.id);
}

export function getAllRaces() {
    return Object.values(RACES);
}

/**
 * Subspecies — genetic variations within each race.
 * Each subspecies has a colorMod (visual tint shift) and statMods.
 */
export const SUBSPECIES = {
    human: [
        { id: 'human_northern', name: 'Bắc Phương', colorMod: 0.1, statMods: { defense: 2, speed: -0.5 }, traits: ['tough'] },
        { id: 'human_southern', name: 'Nam Phương', colorMod: -0.05, statMods: { attack: 1, speed: 0.3 }, traits: ['fast'] },
        { id: 'human_plains', name: 'Đồng Bằng', colorMod: 0, statMods: {}, traits: [] }
    ],
    elf: [
        { id: 'elf_high', name: 'Cao Tiên', colorMod: 0.15, statMods: { mana: 20, attack: -2 }, traits: ['mage_affinity'] },
        { id: 'elf_wood', name: 'Lâm Tiên', colorMod: -0.1, statMods: { speed: 0.5, dodge: 5 }, traits: ['fast'] },
        { id: 'elf_dark', name: 'Hắc Tiên', colorMod: -0.2, statMods: { attack: 3, defense: -1 }, traits: ['bloodlust'] }
    ],
    orc: [
        { id: 'orc_green', name: 'Lục Quỷ', colorMod: 0, statMods: {}, traits: [] },
        { id: 'orc_black', name: 'Hắc Quỷ', colorMod: -0.15, statMods: { hp: 20, speed: -0.5 }, traits: ['tough'] },
        { id: 'orc_berserker', name: 'Cuồng Quỷ', colorMod: -0.1, statMods: { attack: 5, defense: -3 }, traits: ['bloodlust'] }
    ],
    dwarf: [
        { id: 'dwarf_mountain', name: 'Sơn Cu', colorMod: 0.05, statMods: { defense: 3 }, traits: ['miner'] },
        { id: 'dwarf_hill', name: 'Khưu Cu', colorMod: -0.05, statMods: { speed: 0.3 }, traits: [] },
        { id: 'dwarf_deep', name: 'Thâm Cu', colorMod: -0.15, statMods: { attack: 3, hp: 10 }, traits: ['tough'] }
    ],
    demon: [
        { id: 'demon_fire', name: 'Hỏa Ma', colorMod: 0.2, statMods: { attack: 5 }, traits: ['pyromaniac'] },
        { id: 'demon_shadow', name: 'Ảnh Ma', colorMod: -0.2, statMods: { dodge: 8, speed: 0.5 }, traits: ['fast'] },
        { id: 'demon_fel', name: 'Tà Ma', colorMod: 0, statMods: { mana: 30 }, traits: [] }
    ],
    undead: [
        { id: 'undead_skeleton', name: 'Bạch Cốt', colorMod: 0.1, statMods: { speed: 0.3 }, traits: [] },
        { id: 'undead_ghoul', name: 'Thực Thi', colorMod: -0.1, statMods: { attack: 3, hp: 10 }, traits: ['bloodlust'] },
        { id: 'undead_wraith', name: 'U Linh', colorMod: -0.2, statMods: { mana: 20, dodge: 5 }, traits: [] }
    ]
};

/**
 * Pick a random subspecies for the given race.
 * Returns null if race has no subspecies defined.
 */
export function getRandomSubspecies(raceId) {
    const subs = SUBSPECIES[raceId] || [];
    if (subs.length === 0) return null;
    return subs[Math.floor(Math.random() * subs.length)];
}

/**
 * Look up a specific subspecies by its id.
 */
export function getSubspeciesById(subspeciesId) {
    for (const raceSubs of Object.values(SUBSPECIES)) {
        const found = raceSubs.find(s => s.id === subspeciesId);
        if (found) return found;
    }
    return null;
}
