// domains.js — Divine domains & blessings for the god-simulator
// Pure data module, no imports

export const DOMAIN_IDS = {
  FIRE: 'fire',
  WATER: 'water',
  EARTH: 'earth',
  BEAST: 'beast',
  SHADOW: 'shadow',
  LIGHT: 'light',
  DEATH: 'death',
  NATURE: 'nature',
};

export const DOMAINS = {
  [DOMAIN_IDS.FIRE]: {
    id: 'fire',
    name: 'Fire',
    icon: '🔥',
    description: 'Domain of flame and forge. Your people wield fire as both weapon and tool, forging superior arms and molten fortresses.',
    color: '#ff4400',
    themeColor: 0xff4400,
    passiveBonus: {
      name: 'Forge Master',
      description: 'Buildings produce 30% more resources.',
      effect: { buildingOutputMultiplier: 0.3 },
    },
    powers: ['fire_blessing', 'volcanic_blessing'],
  },

  [DOMAIN_IDS.WATER]: {
    id: 'water',
    name: 'Water',
    icon: '💧',
    description: 'Domain of tides and healing. Oceans and rivers bend to your will, mending wounds and crushing foes with tidal force.',
    color: '#2196f3',
    themeColor: 0x2196f3,
    passiveBonus: {
      name: 'Tidal Heal',
      description: 'Creatures heal 20% faster.',
      effect: { healMultiplier: 0.2 },
    },
    powers: ['healing_rain', 'tidal_wave'],
  },

  [DOMAIN_IDS.EARTH]: {
    id: 'earth',
    name: 'Earth',
    icon: '🏔️',
    description: 'Domain of stone and endurance. Mountains are your fortresses, the ground itself shields your faithful from harm.',
    color: '#795548',
    themeColor: 0x795548,
    passiveBonus: {
      name: 'Stone Skin',
      description: 'All units gain +3 defense.',
      effect: { defense: 3 },
    },
    powers: ['earthquake_blessing', 'stone_wall'],
  },

  [DOMAIN_IDS.BEAST]: {
    id: 'beast',
    name: 'Beast',
    icon: '🐺',
    description: 'Domain of wild instinct and the hunt. Creatures of the wild answer your call, and your people move with predatory grace.',
    color: '#4caf50',
    themeColor: 0x4caf50,
    passiveBonus: {
      name: 'Wild Hunt',
      description: 'Hunting yields 50% more food.',
      effect: { huntFoodMultiplier: 0.5 },
    },
    powers: ['summon_pack', 'beast_frenzy'],
  },

  [DOMAIN_IDS.SHADOW]: {
    id: 'shadow',
    name: 'Shadow',
    icon: '🌑',
    description: 'Domain of darkness and stealth. Under cover of night your people move unseen, striking where the enemy is weakest.',
    color: '#9c27b0',
    themeColor: 0x9c27b0,
    passiveBonus: {
      name: 'Night Stalker',
      description: 'Units gain +30% speed at night.',
      effect: { nightSpeedMultiplier: 0.3 },
    },
    powers: ['shadow_strike', 'veil_of_darkness'],
  },

  [DOMAIN_IDS.LIGHT]: {
    id: 'light',
    name: 'Light',
    icon: '✨',
    description: 'Domain of radiance and faith. Your divine brilliance inspires unwavering devotion, flooding your coffers with belief.',
    color: '#ffd700',
    themeColor: 0xffd700,
    passiveBonus: {
      name: 'Divine Radiance',
      description: 'Faith generation increased by 25%.',
      effect: { faithMultiplier: 0.25 },
    },
    powers: ['divine_light_blessing', 'solar_flare'],
  },

  [DOMAIN_IDS.DEATH]: {
    id: 'death',
    name: 'Death',
    icon: '💀',
    description: 'Domain of the grave and undying resolve. Your warriors refuse to fall, fighting with terrible fury beyond the point of death.',
    color: '#424242',
    themeColor: 0x424242,
    passiveBonus: {
      name: 'Undying Will',
      description: 'Units fight at full strength until 10% HP instead of fleeing.',
      effect: { fleeThreshold: 0.1 },
    },
    powers: ['death_touch', 'raise_dead'],
  },

  [DOMAIN_IDS.NATURE]: {
    id: 'nature',
    name: 'Nature',
    icon: '🌿',
    description: 'Domain of growth and harvest. The land itself blesses your people, yielding abundance and rising to devour those who threaten the balance.',
    color: '#2e7d32',
    themeColor: 0x2e7d32,
    passiveBonus: {
      name: 'Bountiful Harvest',
      description: 'Farms produce 40% more food.',
      effect: { farmFoodMultiplier: 0.4 },
    },
    powers: ['rapid_growth', 'nature_wrath'],
  },
};

// --- Blessings (3 per domain × 8 domains = 24) ---

export const BLESSINGS = [
  // ═══════ FIRE ═══════
  {
    id: 'fire_ember',
    name: 'Ember Heart',
    icon: '🜂',
    domainId: 'fire',
    tier: 1,
    cost: 15,
    description: 'A spark of divine flame kindles within your warriors, granting them burning resolve.',
    effect: { attack: 3, specialAbility: 'flame_body' },
    requires: [],
  },
  {
    id: 'fire_inferno',
    name: 'Inferno Soul',
    icon: '🔥',
    domainId: 'fire',
    tier: 2,
    cost: 25,
    description: 'Your people are wreathed in living flame. Melee attacks scorch enemies, dealing persistent burn damage.',
    effect: { attack: 6, defense: 2, specialAbility: 'burning_strike' },
    requires: ['fire_ember'],
  },
  {
    id: 'fire_phoenix',
    name: 'Phoenix Rebirth',
    icon: '🐣',
    domainId: 'fire',
    tier: 3,
    cost: 40,
    description: 'The immortal phoenix bestows its gift — fallen warriors rise once from ash, restored to half strength.',
    effect: { attack: 10, defense: 4, speed: 0.1, specialAbility: 'phoenix_revive' },
    requires: ['fire_inferno'],
  },

  // ═══════ WATER ═══════
  {
    id: 'water_spring',
    name: 'Healing Spring',
    icon: '⛲',
    domainId: 'water',
    tier: 1,
    cost: 15,
    description: 'A sacred spring blesses your settlements, gently mending wounds of all who rest nearby.',
    effect: { defense: 2, specialAbility: 'regen_aura' },
    requires: [],
  },
  {
    id: 'water_tide',
    name: 'Tidal Aegis',
    icon: '🌊',
    domainId: 'water',
    tier: 2,
    cost: 25,
    description: 'Flowing water forms a protective barrier around your units, deflecting incoming blows.',
    effect: { defense: 6, attack: 2, specialAbility: 'water_shield' },
    requires: ['water_spring'],
  },
  {
    id: 'water_tsunami',
    name: 'Tsunami Wrath',
    icon: '🌀',
    domainId: 'water',
    tier: 3,
    cost: 40,
    description: 'Command the fury of the deep. Once per battle, summon a devastating wave that sweeps enemy formations.',
    effect: { attack: 10, defense: 5, speed: 0.15, specialAbility: 'tsunami_strike' },
    requires: ['water_tide'],
  },

  // ═══════ EARTH ═══════
  {
    id: 'earth_pebble',
    name: 'Pebble Guard',
    icon: '🪨',
    domainId: 'earth',
    tier: 1,
    cost: 15,
    description: 'Small stones align to shield your warriors, hardening their skin against blades.',
    effect: { defense: 4, specialAbility: 'stone_skin' },
    requires: [],
  },
  {
    id: 'earth_boulder',
    name: 'Boulder Bash',
    icon: '⛰️',
    domainId: 'earth',
    tier: 2,
    cost: 25,
    description: 'Your warriors wield the weight of mountains. Each strike lands with crushing, bone-breaking force.',
    effect: { attack: 5, defense: 5, specialAbility: 'crushing_blow' },
    requires: ['earth_pebble'],
  },
  {
    id: 'earth_titan',
    name: 'Titan Form',
    icon: '🗿',
    domainId: 'earth',
    tier: 3,
    cost: 40,
    description: 'Chosen warriors transform into towering stone titans — nearly unstoppable on the battlefield.',
    effect: { attack: 8, defense: 10, speed: -0.05, specialAbility: 'titan_transform' },
    requires: ['earth_boulder'],
  },

  // ═══════ BEAST ═══════
  {
    id: 'beast_claw',
    name: 'Feral Claws',
    icon: '🐾',
    domainId: 'beast',
    tier: 1,
    cost: 15,
    description: 'Your people grow bestial claws, tearing through flesh and armor with primal fury.',
    effect: { attack: 4, speed: 0.05, specialAbility: 'rending_claws' },
    requires: [],
  },
  {
    id: 'beast_howl',
    name: 'Pack Howl',
    icon: '🐺',
    domainId: 'beast',
    tier: 2,
    cost: 25,
    description: 'A haunting howl rallies nearby allies into a frenzy, boosting attack speed and ferocity.',
    effect: { attack: 5, speed: 0.1, specialAbility: 'pack_frenzy' },
    requires: ['beast_claw'],
  },
  {
    id: 'beast_apex',
    name: 'Apex Predator',
    icon: '🦁',
    domainId: 'beast',
    tier: 3,
    cost: 40,
    description: 'Your mightiest warriors become apex predators — sensing weakness, they strike with lethal precision.',
    effect: { attack: 12, speed: 0.15, defense: 3, specialAbility: 'execute_predator' },
    requires: ['beast_howl'],
  },

  // ═══════ SHADOW ═══════
  {
    id: 'shadow_shade',
    name: 'Shade Step',
    icon: '👤',
    domainId: 'shadow',
    tier: 1,
    cost: 15,
    description: 'Your warriors learn to slip between shadows, becoming briefly invisible when standing still.',
    effect: { speed: 0.1, specialAbility: 'stealth_cloak' },
    requires: [],
  },
  {
    id: 'shadow_veil',
    name: 'Veil of Dusk',
    icon: '🌑',
    domainId: 'shadow',
    tier: 2,
    cost: 25,
    description: 'A shroud of living darkness follows your army, clouding enemy vision and slowing their reactions.',
    effect: { speed: 0.15, attack: 4, specialAbility: 'blind_aura' },
    requires: ['shadow_shade'],
  },
  {
    id: 'shadow_reaper',
    name: 'Soul Reaper',
    icon: '⚰️',
    domainId: 'shadow',
    tier: 3,
    cost: 40,
    description: 'Your assassins harvest souls from the shadows. Each kill restores health and briefly empowers the killer.',
    effect: { attack: 10, speed: 0.2, defense: 2, specialAbility: 'soul_harvest' },
    requires: ['shadow_veil'],
  },

  // ═══════ LIGHT ═══════
  {
    id: 'light_spark',
    name: 'Holy Spark',
    icon: '💡',
    domainId: 'light',
    tier: 1,
    cost: 15,
    description: 'A fragment of divine radiance lodges in your people, strengthening their faith and resolve.',
    effect: { defense: 2, attack: 2, specialAbility: 'faith_armor' },
    requires: [],
  },
  {
    id: 'light_halo',
    name: 'Angelic Halo',
    icon: '😇',
    domainId: 'light',
    tier: 2,
    cost: 25,
    description: 'Champions are crowned with halos of pure light, inspiring allies and terrifying the unholy.',
    effect: { attack: 5, defense: 5, specialAbility: 'radiant_aura' },
    requires: ['light_spark'],
  },
  {
    id: 'light_solar',
    name: 'Solar Ascension',
    icon: '☀️',
    domainId: 'light',
    tier: 3,
    cost: 40,
    description: 'Your mightiest hero ascends into a being of pure light — dealing area damage and healing all nearby allies each turn.',
    effect: { attack: 12, defense: 6, speed: 0.1, specialAbility: 'solar_ascension' },
    requires: ['light_halo'],
  },

  // ═══════ DEATH ═══════
  {
    id: 'death_chill',
    name: 'Grave Chill',
    icon: '❄️',
    domainId: 'death',
    tier: 1,
    cost: 15,
    description: 'An unnatural cold radiates from your warriors, slowing enemies who dare approach.',
    effect: { attack: 3, defense: 1, specialAbility: 'death_chill' },
    requires: [],
  },
  {
    id: 'death_siphon',
    name: 'Life Siphon',
    icon: '🩸',
    domainId: 'death',
    tier: 2,
    cost: 25,
    description: 'Your warriors drain life from the wounds they inflict, healing themselves with each strike.',
    effect: { attack: 6, defense: 3, specialAbility: 'life_steal' },
    requires: ['death_chill'],
  },
  {
    id: 'death_lich',
    name: 'Lich Dominion',
    icon: '☠️',
    domainId: 'death',
    tier: 3,
    cost: 40,
    description: 'Your greatest leader becomes a Lich — slain enemies rise as undead servants under your control.',
    effect: { attack: 10, defense: 6, speed: 0.05, specialAbility: 'lich_domination' },
    requires: ['death_siphon'],
  },

  // ═══════ NATURE ═══════
  {
    id: 'nature_sprout',
    name: 'Verdant Sprout',
    icon: '🌱',
    domainId: 'nature',
    tier: 1,
    cost: 15,
    description: 'Lush greenery follows your people, improving terrain and slowly regenerating health.',
    effect: { defense: 2, specialAbility: 'regrowth' },
    requires: [],
  },
  {
    id: 'nature_thorns',
    name: 'Iron Thorns',
    icon: '🌹',
    domainId: 'nature',
    tier: 2,
    cost: 25,
    description: 'Thorny vines entangle attackers, dealing damage to any who strike your warriors in melee.',
    effect: { defense: 6, attack: 3, specialAbility: 'thorny_carapace' },
    requires: ['nature_sprout'],
  },
  {
    id: 'nature_overgrowth',
    name: 'World Tree',
    icon: '🌳',
    domainId: 'nature',
    tier: 3,
    cost: 40,
    description: 'A colossal World Tree takes root, granting immense vitality to all your units and entangling enemy armies in its roots.',
    effect: { attack: 8, defense: 8, speed: 0.1, specialAbility: 'worldtree_blessing' },
    requires: ['nature_thorns'],
  },
];

// --- Helper functions ---

export function getDomain(domainId) {
  return DOMAINS[domainId] ?? null;
}

export function getBlessingsForDomain(domainId) {
  return BLESSINGS.filter((b) => b.domainId === domainId);
}

export function getBlessing(blessingId) {
  return BLESSINGS.find((b) => b.id === blessingId) ?? null;
}

export function canPurchaseBlessing(blessingId, purchasedBlessings) {
  const blessing = getBlessing(blessingId);
  if (!blessing) return false;
  return blessing.requires.every((reqId) => purchasedBlessings.includes(reqId));
}
