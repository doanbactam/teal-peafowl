// gods.js — God system with player God and 4 AI Gods for a god-simulator game
// Inspired by Nebula Civilization, WorldBox, and RimWorld

// ===== AI Personality Definitions =====
export const AI_PERSONALITIES = {
  aggressive: {
    name: 'Aggressive',
    raceId: 'gnoll',
    domainId: 'death',
    godName: 'Tael',
    weights: { military: 0.5, economy: 0.15, faith: 0.15, bless: 0.2 },
    preferredBuildings: ['barracks', 'house', 'barracks', 'house', 'barracks'],
    description: 'Warlike conqueror. Spawns many warriors, attacks other factions relentlessly.',
  },
  builder: {
    name: 'Builder',
    raceId: 'orc',
    domainId: 'earth',
    godName: 'Hegemonia',
    weights: { military: 0.2, economy: 0.4, faith: 0.15, bless: 0.25 },
    preferredBuildings: ['house', 'farm', 'mine', 'storage', 'house', 'farm'],
    description: 'Master architect. Builds infrastructure rapidly, expands territory steadily.',
  },
  mystic: {
    name: 'Mystic',
    raceId: 'nyx',
    domainId: 'shadow',
    godName: 'Salkait',
    weights: { military: 0.15, economy: 0.15, faith: 0.3, bless: 0.4 },
    preferredBuildings: ['temple', 'house', 'temple', 'house'],
    description: 'Arcane scholar. Focuses on blessings, faith generation, and magical power.',
  },
  diplomat: {
    name: 'Diplomat',
    raceId: 'frogman',
    domainId: 'nature',
    godName: 'Jangwan',
    weights: { military: 0.15, economy: 0.35, faith: 0.25, bless: 0.25 },
    preferredBuildings: ['farm', 'house', 'storage', 'farm', 'house', 'mine'],
    description: 'Balanced diplomat. Steady growth through economy and careful expansion.',
  },
};

// ===== Blessing Definitions (tiered) =====
const BLESSINGS = [
  // Tier 1 — basic blessings, no prerequisites
  { id: 'war_fervor', name: 'War Fervor', cost: 100, tier: 1, requires: null, desc: '+20% attack for faction units' },
  { id: 'harvest_blessing', name: 'Harvest Blessing', cost: 100, tier: 1, requires: null, desc: '+30% food production' },
  { id: 'stone_skin', name: 'Stone Skin', cost: 100, tier: 1, requires: null, desc: '+20% defense for faction units' },
  { id: 'rapid_growth', name: 'Rapid Growth', cost: 120, tier: 1, requires: null, desc: '+25% population growth rate' },
  // Tier 2 — requires a tier 1 blessing
  { id: 'divine_wrath', name: 'Divine Wrath', cost: 250, tier: 2, requires: 'war_fervor', desc: 'Periodic lightning strikes near enemies' },
  { id: 'abundance', name: 'Abundance', cost: 250, tier: 2, requires: 'harvest_blessing', desc: 'Farms produce double resources' },
  { id: 'fortification', name: 'Fortification', cost: 250, tier: 2, requires: 'stone_skin', desc: 'Buildings gain +50% health' },
  { id: 'bloom', name: 'Bloom', cost: 300, tier: 2, requires: 'rapid_growth', desc: 'Spawns trees near faction territory' },
  // Tier 3 — ultimate blessings
  { id: 'apocalypse', name: 'Apocalypse', cost: 500, tier: 3, requires: 'divine_wrath', desc: 'Meteor strikes enemy territory periodically' },
  { id: 'eden', name: 'Eden', cost: 500, tier: 3, requires: 'abundance', desc: 'All faction units slowly regenerate health' },
];

// ===== AI Building Costs (faith-based, derived from buildings.js resource costs) =====
const AI_BUILDING_COSTS = {
  house: 10,
  farm: 5,
  mine: 10,
  barracks: 25,
  storage: 15,
  temple: 35,
  wall: 5,
  tower: 20,
  road: 3,
};

// ===== God Class (base for both player and AI) =====
export class God {
  constructor(id, name, raceId, domainId, isPlayer = false) {
    this.id = id;
    this.name = name;
    this.raceId = raceId;
    this.domainId = domainId;
    this.isPlayer = isPlayer;
    this.faith = 100;
    this.maxFaith = 1000;
    this.purchasedBlessings = [];
    this.faction = id; // faction 0-4 maps to god 0-4
    this.stats = { totalKills: 0, totalBuilt: 0, territory: 0 };
  }

  addFaith(amount) {
    this.faith = Math.min(this.maxFaith, this.faith + amount);
  }

  spendFaith(amount) {
    if (this.faith >= amount) {
      this.faith -= amount;
      return true;
    }
    return false;
  }

  hasBlessing(blessingId) {
    return this.purchasedBlessings.includes(blessingId);
  }

  purchaseBlessing(blessingId, cost) {
    if (this.spendFaith(cost)) {
      this.purchasedBlessings.push(blessingId);
      return true;
    }
    return false;
  }
}

// ===== AIGod Class (extends God with AI decision-making) =====
export class AIGod extends God {
  constructor(id, name, raceId, domainId, personality) {
    super(id, name, raceId, domainId, false);
    this.personality = personality;
    this.decisionTimer = 0;
    this.decisionInterval = 8; // seconds between decisions
    this.priorityWeights = this.buildPriorityWeights();
    this.spawnTimer = 0;
    this.buildTimer = 0;
    this.blessTimer = 0;
    this.buildingCount = 0;
    this.startX = 0;
    this.startZ = 0;
    this.lastAction = null;
  }

  buildPriorityWeights() {
    const data = AI_PERSONALITIES[this.personality];
    return data ? { ...data.weights } : { military: 0.25, economy: 0.25, faith: 0.25, bless: 0.25 };
  }

  setStartPosition(x, z) {
    this.startX = x;
    this.startZ = z;
  }

  /**
   * Called every frame from game loop via GodManager.
   * Accumulates timers, generates faith, and periodically makes decisions.
   * @param {number} dt - Delta time in seconds (already scaled by gameSpeed)
   * @param {object} game - The Game instance
   * @returns {Array} Array of action objects for the game loop to execute
   */
  update(dt, game) {
    const actions = [];

    // Count faction population
    const myPop = this.countMyPopulation(game);

    // Faith generation: AI gets slightly less than player (0.12 vs 0.15)
    this.addFaith(dt * myPop * 0.12);

    // Scale difficulty with day count — interval shrinks, AI acts faster
    const dayScale = Math.max(0.35, 1 - game.day * 0.012);
    const adjustedInterval = this.decisionInterval * dayScale;

    this.decisionTimer += dt;

    if (this.decisionTimer >= adjustedInterval) {
      this.decisionTimer = 0;
      const action = this.makeDecision(game, myPop);
      if (action) {
        this.lastAction = action;
        actions.push(action);
      }
    }

    return actions;
  }

  countMyPopulation(game) {
    let count = 0;
    const creatures = game.creatureManager.creatures;
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (c.alive && c.type === 'human' && c.faction === this.faction) {
        count++;
      }
    }
    return count;
  }

  makeDecision(game, myPop) {
    const roll = Math.random();
    const w = this.priorityWeights;
    let cumulative = 0;

    cumulative += w.military;
    if (roll < cumulative) return this.decideSpawn(game, myPop);

    cumulative += w.economy;
    if (roll < cumulative) return this.decideBuild(game, myPop);

    cumulative += w.faith;
    if (roll < cumulative) return this.decideExpand(game, myPop);

    return this.decideBless(game, myPop);
  }

  // ---- Action: Spawn units ----
  decideSpawn(game, myPop) {
    const maxPop = 15 + Math.floor(game.day / 5) * 2;
    if (myPop >= maxPop) return null;

    const cost = 25;
    if (!this.spendFaith(cost)) return null;

    const pos = this.findPositionNearFaction(game, 6);
    if (!pos) return null;

    // Aggressive AI spawns more units at once
    const count = this.personality === 'aggressive'
      ? Math.min(3, 1 + Math.floor(game.day / 10))
      : Math.min(2, 1 + Math.floor(game.day / 15));

    return { type: 'spawn', tileX: pos.x, tileZ: pos.z, faction: this.faction, count };
  }

  // ---- Action: Build a structure ----
  decideBuild(game, myPop) {
    const maxBuildings = 10 + Math.floor(game.day / 10) * 2;
    if (this.buildingCount >= maxBuildings) return null;

    // Need at least 1 unit to justify building
    if (myPop < 1) return null;

    const personalityData = AI_PERSONALITIES[this.personality];
    const buildingType = personalityData.preferredBuildings[
      Math.floor(Math.random() * personalityData.preferredBuildings.length)
    ];

    const cost = AI_BUILDING_COSTS[buildingType] || 10;
    if (!this.spendFaith(cost)) return null;

    const pos = this.findPositionNearFaction(game, 5);
    if (!pos) return null;

    this.buildingCount++;

    return { type: 'build', tileX: pos.x, tileZ: pos.z, buildingType, faction: this.faction };
  }

  // ---- Action: Purchase a blessing ----
  decideBless(game, myPop) {
    const available = [];
    for (let i = 0; i < BLESSINGS.length; i++) {
      const b = BLESSINGS[i];
      if (this.hasBlessing(b.id)) continue;
      if (this.faith < b.cost) continue;
      if (b.requires && !this.hasBlessing(b.requires)) continue;
      available.push(b);
    }

    if (available.length === 0) return null;

    // Mystic personality prefers blessings — picks cheapest available to cycle through faster
    let blessing;
    if (this.personality === 'mystic') {
      available.sort((a, b) => a.cost - b.cost);
      blessing = available[0];
    } else {
      blessing = available[Math.floor(Math.random() * available.length)];
    }

    if (this.purchaseBlessing(blessing.id, blessing.cost)) {
      return { type: 'bless', blessingId: blessing.id, godId: this.id, blessingName: blessing.name };
    }
    return null;
  }

  // ---- Action: Expand territory ----
  decideExpand(game, myPop) {
    if (myPop < 3) return null; // Need minimum population to expand

    const cost = 20;
    if (!this.spendFaith(cost)) return null;

    const pos = this.findExpansionPosition(game);
    if (!pos) return null;

    return { type: 'expand', tileX: pos.x, tileZ: pos.z, faction: this.faction, count: 1 };
  }

  // ---- Position helpers ----

  findPositionNearFaction(game, searchRadius) {
    // Collect faction unit positions
    const myCreatures = [];
    const creatures = game.creatureManager.creatures;
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (c.alive && c.type === 'human' && c.faction === this.faction) {
        myCreatures.push(c);
      }
    }

    let baseX, baseZ;
    if (myCreatures.length > 0) {
      const base = myCreatures[Math.floor(Math.random() * myCreatures.length)];
      baseX = base.tileX;
      baseZ = base.tileZ;
    } else {
      baseX = this.startX;
      baseZ = this.startZ;
    }

    // Spiral outward to find a walkable tile
    for (let attempts = 0; attempts < 20; attempts++) {
      const tx = baseX + Math.floor(Math.random() * searchRadius * 2 - searchRadius);
      const tz = baseZ + Math.floor(Math.random() * searchRadius * 2 - searchRadius);
      if (game.terrain.isWalkable(tx, tz)) {
        return { x: tx, z: tz };
      }
    }
    return null;
  }

  findExpansionPosition(game) {
    const center = game.terrain.size / 2;

    const myCreatures = [];
    const creatures = game.creatureManager.creatures;
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (c.alive && c.type === 'human' && c.faction === this.faction) {
        myCreatures.push(c);
      }
    }

    // If no units, expand from start toward center
    if (myCreatures.length === 0) {
      return this.findPositionToward(game, this.startX, this.startZ, center, center, 20);
    }

    // Find frontier unit (farthest from start position)
    let frontier = myCreatures[0];
    let maxDist = 0;
    for (let i = 0; i < myCreatures.length; i++) {
      const c = myCreatures[i];
      const d = Math.abs(c.tileX - this.startX) + Math.abs(c.tileZ - this.startZ);
      if (d > maxDist) {
        maxDist = d;
        frontier = c;
      }
    }

    // Expand from frontier toward map center
    return this.findPositionToward(game, frontier.tileX, frontier.tileZ, center, center, 10);
  }

  findPositionToward(game, fromX, fromZ, toX, toZ, maxDist) {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const stepX = (dx / dist) * maxDist;
    const stepZ = (dz / dist) * maxDist;

    for (let attempts = 0; attempts < 15; attempts++) {
      const spread = 4;
      const tx = Math.round(fromX + stepX + (Math.random() - 0.5) * spread);
      const tz = Math.round(fromZ + stepZ + (Math.random() - 0.5) * spread);
      if (game.terrain.isWalkable(tx, tz)) {
        return { x: tx, z: tz };
      }
    }
    return null;
  }
}

// ===== AI God Definitions (4 AI gods, one per personality) =====
const AI_GOD_DEFINITIONS = [
  { id: 1, name: 'Tael', raceId: 'gnoll', domainId: 'death', personality: 'aggressive' },
  { id: 2, name: 'Hegemonia', raceId: 'orc', domainId: 'earth', personality: 'builder' },
  { id: 3, name: 'Salkait', raceId: 'nyx', domainId: 'shadow', personality: 'mystic' },
  { id: 4, name: 'Jangwan', raceId: 'frogman', domainId: 'nature', personality: 'diplomat' },
];

// Starting quadrant offsets relative to map center
// God 1 = NE, God 2 = NW, God 3 = SE, God 4 = SW
const AI_START_QUADRANTS = [
  { xOff: 60, zOff: -60 },  // NE — God 1 (Tael)
  { xOff: -60, zOff: -60 }, // NW — God 2 (Hegemonia)
  { xOff: 60, zOff: 60 },   // SE — God 3 (Salkait)
  { xOff: -60, zOff: 60 },  // SW — God 4 (Jangwan)
];

// ===== GodManager Class =====
export class GodManager {
  constructor(game) {
    this.game = game;
    this.gods = [];        // Array of God instances (index 0 = player)
    this.playerGod = null; // Reference to player's God
    this.initialized = false;
  }

  /**
   * Initialize the god system. Creates player god and 4 AI gods.
   * @param {string} playerRaceId - Player's chosen race
   * @param {string} playerDomainId - Player's chosen domain
   * @returns {Array} List of all gods
   */
  init(playerRaceId, playerDomainId) {
    // Create player god (index 0, faction 0)
    this.playerGod = new God(0, 'Player', playerRaceId, playerDomainId, true);
    this.gods.push(this.playerGod);

    // Create 4 AI gods with assigned races/domains/personalities
    const halfSize = this.game.terrain.size / 2;

    for (let i = 0; i < AI_GOD_DEFINITIONS.length; i++) {
      const def = AI_GOD_DEFINITIONS[i];
      const aiGod = new AIGod(def.id, def.name, def.raceId, def.domainId, def.personality);

      // Compute starting position in the assigned quadrant
      const quad = AI_START_QUADRANTS[i];
      const targetX = halfSize + quad.xOff;
      const targetZ = halfSize + quad.zOff;

      // Find a walkable tile near the target quadrant center
      const startPos = this.findWalkableNear(this.game, targetX, targetZ, 25);
      if (startPos) {
        aiGod.setStartPosition(startPos.x, startPos.z);
      } else {
        // Fallback: use the raw quadrant position
        aiGod.setStartPosition(targetX, targetZ);
      }

      this.gods.push(aiGod);
    }

    // Spawn initial units and buildings for each AI god
    this.spawnInitialAIUnits();

    this.initialized = true;
    return this.gods;
  }

  /**
   * Find a walkable tile near a given center point.
   */
  findWalkableNear(game, cx, cz, range) {
    for (let attempts = 0; attempts < 40; attempts++) {
      const tx = cx + Math.floor(Math.random() * range * 2 - range);
      const tz = cz + Math.floor(Math.random() * range * 2 - range);
      if (game.terrain.isWalkable(tx, tz)) {
        return { x: tx, z: tz };
      }
    }
    return null;
  }

  /**
   * Spawn initial units and buildings for all AI gods at game start.
   * Uses the same pattern as the player's spawnInitialCreatures().
   */
  spawnInitialAIUnits() {
    for (const god of this.gods) {
      if (god.isPlayer) continue;
      const aiGod = god;

      // Spawn 6 humans in a circle around start position
      let spawned = 0;
      for (let i = 0; i < 8 && spawned < 6; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 3 + Math.random() * 5;
        const tx = Math.round(aiGod.startX + Math.cos(angle) * dist);
        const tz = Math.round(aiGod.startZ + Math.sin(angle) * dist);

        if (this.game.terrain.isWalkable(tx, tz)) {
          this.game.creatureManager.spawnHuman(tx, tz, aiGod.faction);
          spawned++;
        }
      }

      // Place 2 initial buildings near start position
      const initialBuildings = ['house', 'farm'];
      for (const bType of initialBuildings) {
        const pos = this.findWalkableNear(this.game, aiGod.startX, aiGod.startZ, 5);
        if (pos && this.game.buildingManager.canBuild(pos.x, pos.z, bType)) {
          // AI pays with faith, not player resources — use dummy resources
          const aiResources = { wood: 9999, food: 9999, stone: 9999, gold: 9999, faith: 9999 };
          this.game.buildingManager.build(pos.x, pos.z, bType, aiResources);
          aiGod.buildingCount++;
        }
      }
    }
  }

  /**
   * Main update loop. Called every frame from the game loop.
   * Updates AI god timers, generates faith, and executes decided actions.
   * @param {number} dt - Delta time in seconds (already scaled by gameSpeed)
   */
  update(dt) {
    if (!this.initialized) return;

    const allActions = [];

    // Sync player god's faith from game resources
    if (this.playerGod) {
      this.playerGod.faith = this.game.resources.faith;
    }

    // Update each AI god and collect their actions
    for (let i = 0; i < this.gods.length; i++) {
      const god = this.gods[i];
      if (god.isPlayer) continue;

      const actions = god.update(dt, this.game);
      if (actions && actions.length > 0) {
        for (let j = 0; j < actions.length; j++) {
          allActions.push(actions[j]);
        }
      }
    }

    // Execute all collected actions through existing game systems
    this.executeActions(allActions);

    // Update player god stats
    if (this.playerGod) {
      this.playerGod.stats.totalBuilt = this.game.buildingManager.getCount();
      this.playerGod.stats.territory = this.game.creatureManager.getPopulationCount();
      // Sync faith back to game resources (player god's faith is game.resources.faith)
      this.game.resources.faith = this.playerGod.faith;
    }
  }

  /**
   * Execute AI action objects through existing game systems.
   */
  executeActions(actions) {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      switch (action.type) {
        case 'spawn': {
          const count = action.count || 1;
          for (let j = 0; j < count; j++) {
            // Add slight randomness so units don't stack on same tile
            const ox = action.tileX + Math.floor(Math.random() * 3 - 1);
            const oz = action.tileZ + Math.floor(Math.random() * 3 - 1);
            if (this.game.terrain.isWalkable(ox, oz)) {
              this.game.creatureManager.spawnHuman(ox, oz, action.faction);
            }
          }
          break;
        }

        case 'build': {
          if (this.game.buildingManager.canBuild(action.tileX, action.tileZ, action.buildingType)) {
            // AI uses its own economy (faith-based), not player resources
            const aiResources = { wood: 9999, food: 9999, stone: 9999, gold: 9999, faith: 9999 };
            const success = this.game.buildingManager.build(action.tileX, action.tileZ, action.buildingType, aiResources);
            if (success) {
              const god = this.getGod(action.faction);
              if (god) god.stats.totalBuilt++;
            }
          } else {
            // Build failed — refund faith to the AI god
            const god = this.getGodByFaction(action.faction);
            if (god && !god.isPlayer) {
              const refund = AI_BUILDING_COSTS[action.buildingType] || 10;
              god.addFaith(refund);
              if (god.buildingCount > 0) god.buildingCount--;
            }
          }
          break;
        }

        case 'bless': {
          // Blessing is already applied by the AI god's purchaseBlessing()
          // This is a notification point for the game loop / event system
          if (this.game.eventSystem) {
            const god = this.getGod(action.godId);
            if (god) {
              this.game.eventSystem.showNotification({
                type: 'info',
                icon: '✨',
                message: `<b>${god.name}</b> acquired blessing: <b>${action.blessingName}</b>`,
              });
            }
          }
          break;
        }

        case 'expand': {
          // Expand is effectively a strategic spawn at the frontier
          const count = action.count || 1;
          for (let j = 0; j < count; j++) {
            if (this.game.terrain.isWalkable(action.tileX, action.tileZ)) {
              this.game.creatureManager.spawnHuman(action.tileX, action.tileZ, action.faction);
            }
          }
          break;
        }
      }
    }
  }

  // ===== Query Methods =====

  getGod(id) {
    for (let i = 0; i < this.gods.length; i++) {
      if (this.gods[i].id === id) return this.gods[i];
    }
    return null;
  }

  getPlayerGod() {
    return this.playerGod;
  }

  getAIGods() {
    const result = [];
    for (let i = 0; i < this.gods.length; i++) {
      if (!this.gods[i].isPlayer) result.push(this.gods[i]);
    }
    return result;
  }

  getGodByFaction(faction) {
    for (let i = 0; i < this.gods.length; i++) {
      if (this.gods[i].faction === faction) return this.gods[i];
    }
    return null;
  }

  /**
   * Get god rankings sorted by power score: faith + population*5 + buildings*10.
   * @returns {Array} Gods sorted from strongest to weakest
   */
  getGodRankings() {
    const ranked = this.gods.slice();
    const self = this;

    ranked.sort(function (a, b) {
      const scoreA = a.faith + self.getFactionPopulation(a.faction) * 5 + self.getFactionBuildings(a.faction) * 10;
      const scoreB = b.faith + self.getFactionPopulation(b.faction) * 5 + self.getFactionBuildings(b.faction) * 10;
      return scoreB - scoreA;
    });

    return ranked;
  }

  /**
   * Count living human population for a given faction.
   */
  getFactionPopulation(faction) {
    if (!this.game.creatureManager) return 0;
    let count = 0;
    const creatures = this.game.creatureManager.creatures;
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (c.alive && c.type === 'human' && c.faction === faction) {
        count++;
      }
    }
    return count;
  }

  /**
   * Count buildings for a given faction.
   * AI gods track their own building count; player uses buildingManager total.
   */
  getFactionBuildings(faction) {
    const god = this.getGodByFaction(faction);
    if (god && !god.isPlayer && god.buildingCount !== undefined) {
      return god.buildingCount;
    }
    // Player faction — use building manager count (approximate)
    if (this.game.buildingManager) {
      return this.game.buildingManager.getCount();
    }
    return 0;
  }

  /**
   * Get a summary of all gods for the HUD.
   * @returns {Array} Array of god summary objects
   */
  getGodSummaries() {
    const summaries = [];
    for (let i = 0; i < this.gods.length; i++) {
      const god = this.gods[i];
      summaries.push({
        id: god.id,
        name: god.name,
        faction: god.faction,
        faith: Math.floor(god.faith),
        population: this.getFactionPopulation(god.faction),
        buildings: this.getFactionBuildings(god.faction),
        blessings: god.purchasedBlessings.length,
        personality: god.isPlayer ? null : god.personality,
        isPlayer: god.isPlayer,
        raceId: god.raceId,
        domainId: god.domainId,
      });
    }
    return summaries;
  }
}
