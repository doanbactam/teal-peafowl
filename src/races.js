// races.js - Pure data definitions for 6 fantasy races
// Inspired by "Nền Văn Minh Nebula" civilization system
// BIOME enum: DEEP_WATER:0, SHALLOW_WATER:1, BEACH:2, GRASSLAND:3, FOREST:4,
//   DENSE_FOREST:5, MOUNTAIN:6, SNOW:7, DESERT:8, SAVANNA:9, TUNDRA:10,
//   TROPICAL_FOREST:11, SNOW_PEAK:12

export const RACE_IDS = {
  HUMAN: 'human',
  LIZARDMAN: 'lizardman',
  NYX: 'nyx',
  FROGMAN: 'frogman',
  GNOLL: 'gnoll',
  ORC: 'orc',
};

export const RACES = {
  [RACE_IDS.HUMAN]: {
    id: 'human',
    name: 'Human',
    icon: '👤',
    description: 'Versatile and adaptive. Humans thrive in temperate lands and learn faster than other races.',
    baseStats: { health: 100, attack: 12, defense: 5, speed: 1.8 },
    bodyColor: 0x42a5f5,
    headColor: 0x90caf9,
    bodyScale: { x: 1.0, y: 1.0, z: 1.0 },
    biomePreference: [3, 4], // GRASSLAND, FOREST
    abilities: ['Adaptive Learning', 'Basic Crafting', 'Farming', 'Trading'],
    passiveAbility: {
      id: 'adaptability',
      name: 'Adaptability',
      description: 'Gains 20% more experience from all sources.',
    },
    factionAffinity: 0,
    namePool: [
      'Aelin', 'Brom', 'Cira', 'Dax', 'Elara',
      'Finn', 'Gwen', 'Holt', 'Iris', 'Joss',
    ],
  },

  [RACE_IDS.LIZARDMAN]: {
    id: 'lizardman',
    name: 'Lizardman',
    icon: '🦎',
    description: 'Hardy reptilian warriors with natural scale armor. Flourish in warm, humid environments.',
    baseStats: { health: 130, attack: 14, defense: 8, speed: 1.5 },
    bodyColor: 0x2e7d32,
    headColor: 0x1b5e20,
    bodyScale: { x: 1.15, y: 1.0, z: 1.0 },
    biomePreference: [11, 9, 2], // TROPICAL_FOREST, SAVANNA, BEACH
    abilities: ['Scale Armor', 'Aquatic Movement', 'Tail Whip', 'Heat Resistance'],
    passiveAbility: {
      id: 'scale_armor',
      name: 'Scale Armor',
      description: 'Takes 15% less physical damage from all sources.',
    },
    factionAffinity: 1,
    namePool: [
      'Sszark', 'Krazil', 'Tixan', 'Vressh', 'Zkalon',
      'Hesskar', 'Ixzin', 'Drassil', 'Kryvax', 'Tzonar',
    ],
  },

  [RACE_IDS.NYX]: {
    id: 'nyx',
    name: 'Nyx',
    icon: '🌙',
    description: 'Mysterious dark elves attuned to shadow. Fragile but deadly, they strike from the darkness.',
    baseStats: { health: 80, attack: 16, defense: 3, speed: 2.0 },
    bodyColor: 0x4a148c,
    headColor: 0xce93d8,
    bodyScale: { x: 0.85, y: 1.05, z: 0.85 },
    biomePreference: [4, 5, 10], // FOREST, DENSE_FOREST, TUNDRA
    abilities: ['Shadow Step', 'Dark Vision', 'Arcane Bolt', 'Evasion'],
    passiveAbility: {
      id: 'shadow_step',
      name: 'Shadow Step',
      description: '25% chance to completely dodge incoming attacks.',
    },
    factionAffinity: 4,
    namePool: [
      'Vyranth', 'Xilantha', 'Dravoss', 'Melissae', 'Nyxara',
      'Phaelan', 'Shyrrin', 'Thessaly', 'Umbrix', 'Zyranna',
    ],
  },

  [RACE_IDS.FROGMAN]: {
    id: 'frogman',
    name: 'Frogman',
    icon: '🐸',
    description: 'Agile amphibious creatures at home in swamps and shores. Quick and resilient near water.',
    baseStats: { health: 90, attack: 10, defense: 6, speed: 2.2 },
    bodyColor: 0x1b5e20,
    headColor: 0x4caf50,
    bodyScale: { x: 1.1, y: 0.85, z: 1.1 },
    biomePreference: [11, 9, 2], // TROPICAL_FOREST, SAVANNA, BEACH
    abilities: ['Amphibious', 'Tongue Lash', 'Poison Skin', 'Leap'],
    passiveAbility: {
      id: 'amphibious',
      name: 'Amphibious',
      description: 'Moves 30% faster when near water tiles.',
    },
    factionAffinity: 2,
    namePool: [
      'Keroak', 'Ribbix', 'Gloop', 'Muddok', 'Wartok',
      'Croakus', 'Tadrius', 'Swampkin', 'Puddle', 'Bogdan',
    ],
  },

  [RACE_IDS.GNOLL]: {
    id: 'gnoll',
    name: 'Gnoll',
    icon: '🐺',
    description: 'Fierce hyena-like pack hunters. Stronger together, they dominate open plains and deserts.',
    baseStats: { health: 110, attack: 18, defense: 4, speed: 1.7 },
    bodyColor: 0x8d6e63,
    headColor: 0xa1887f,
    bodyScale: { x: 1.0, y: 1.15, z: 1.0 },
    biomePreference: [9, 8, 3], // SAVANNA, DESERT, GRASSLAND
    abilities: ['Pack Tactics', 'Savage Bite', 'Intimidate', 'Scavenge'],
    passiveAbility: {
      id: 'pack_tactics',
      name: 'Pack Tactics',
      description: '+5 attack for each nearby ally (max +15).',
    },
    factionAffinity: 3,
    namePool: [
      'Gnashrak', 'Vorrak', 'Skraal', 'Hrakkor', 'Zevrish',
      'Bruxa', 'Krazgul', 'Yennik', 'Drothar', 'Murgash',
    ],
  },

  [RACE_IDS.ORC]: {
    id: 'orc',
    name: 'Orc',
    icon: '👹',
    description: 'Massive brutal warriors bred for conquest. High endurance and raw destructive power.',
    baseStats: { health: 150, attack: 15, defense: 7, speed: 1.4 },
    bodyColor: 0x33691e,
    headColor: 0x558b2f,
    bodyScale: { x: 1.2, y: 1.2, z: 1.2 },
    biomePreference: [6, 9, 8], // MOUNTAIN, SAVANNA, DESERT
    abilities: ['Brutal Force', 'War Cry', 'Heavy Strike', 'Iron Skin'],
    passiveAbility: {
      id: 'brutal_force',
      name: 'Brutal Force',
      description: '20% chance to deal double damage on each attack.',
    },
    factionAffinity: 1,
    namePool: [
      'Grommash', 'Tharok', 'Durgash', 'Kargan', 'Uzgrel',
      'Morbosh', 'Shagrath', 'Ruzgoth', 'Azkhar', 'Bolgash',
    ],
  },
};

/**
 * Get race data by ID. Falls back to human if ID is invalid.
 * @param {string} raceId
 * @returns {object}
 */
export function getRace(raceId) {
  return RACES[raceId] || RACES[RACE_IDS.HUMAN];
}

/**
 * Get a specific base stat for a race.
 * @param {string} raceId
 * @param {string} stat - 'health' | 'attack' | 'defense' | 'speed'
 * @returns {number}
 */
export function getRaceStat(raceId, stat) {
  const race = getRace(raceId);
  return race.baseStats[stat] ?? 0;
}
