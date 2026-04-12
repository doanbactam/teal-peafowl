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
    const maxPop = 15 + Math.floor(game.day / 5) * 4;
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
          const success = this.game.simulation
            ? this.game.simulation.dispatch({
                type: 'race.spawnHumans',
                tileX: tx,
                tileZ: tz,
                faction: aiGod.faction,
                count: 1,
                raceId: aiGod.raceId,
                randomOffset: false,
              })
            : this.game.creatureManager.spawnHuman(tx, tz, aiGod.faction, aiGod.raceId);
          if (success) {
            spawned++;
          }
        }
      }

      // Place 2 initial buildings near start position
      const initialBuildings = ['house', 'farm'];
      for (const bType of initialBuildings) {
        let pos = null;
        for (let attempts = 0; attempts < 20; attempts++) {
          const candidate = this.findWalkableNear(this.game, aiGod.startX, aiGod.startZ, 7);
          if (candidate && this.game.buildingManager.canBuild(candidate.x, candidate.z, bType)) {
            pos = candidate;
            break;
          }
        }
        if (pos) {
          const success = this.game.simulation
            ? this.game.simulation.dispatch({
                type: 'civ.build',
                tileX: pos.x,
                tileZ: pos.z,
                buildingType: bType,
                faction: aiGod.faction,
                resources: { wood: 9999, food: 9999, stone: 9999, gold: 9999, faith: 9999 },
              })
            : this.game.buildingManager.build(
                pos.x,
                pos.z,
                bType,
                { wood: 9999, food: 9999, stone: 9999, gold: 9999, faith: 9999 },
                aiGod.faction,
              );
          if (success) {
            aiGod.buildingCount++;
          }
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
      this.playerGod.stats.totalBuilt = this.game.buildingManager.getCountByType('house', 0)
        + this.game.buildingManager.getCountByType('farm', 0)
        + this.game.buildingManager.getCountByType('storage', 0)
        + this.game.buildingManager.getCountByType('temple', 0)
        + this.game.buildingManager.getCountByType('mine', 0)
        + this.game.buildingManager.getCountByType('barracks', 0)
        + this.game.buildingManager.getCountByType('tower', 0)
        + this.game.buildingManager.getCountByType('wall', 0)
        + this.game.buildingManager.getCountByType('road', 0)
        + this.game.buildingManager.getCountByType('smithy', 0)
        + this.game.buildingManager.getCountByType('market', 0);
      this.playerGod.stats.territory = this.getFactionPopulation(0);
      // Sync faith back to game resources (player god's faith is game.resources.faith)
      this.game.resources.faith = this.playerGod.faith;
    }

    // Diplomacy & War evaluations
    if (!this.diplomacy) {
      this.diplomacy = {};
      this.warTimers = {};
      for (let i = 0; i <= 4; i++) {
        this.diplomacy[i] = {};
        this.warTimers[i] = {};
        for (let j = 0; j <= 4; j++) {
          this.diplomacy[i][j] = 'peace';
          this.warTimers[i][j] = 0;
        }
      }
    }

    // Tick war timers
    for (let i = 0; i <= 4; i++) {
      for (let j = i + 1; j <= 4; j++) {
        if (this.diplomacy[i][j] === 'war') {
          this.warTimers[i][j] = (this.warTimers[i][j] || 0) + dt;
          this.warTimers[j][i] = this.warTimers[i][j];
        }
      }
    }

    // Periodic diplomacy evaluation
    if (Math.random() < dt * 0.08) {
      for (const god of this.gods) {
        if (god.isPlayer) continue;
        if (god.personality === 'diplomat') continue; // Diplomats don't start wars

        const myPop = this.getFactionPopulation(god.faction);
        const warLikelihood = god.personality === 'aggressive' ? 0.4 : 0.12;
        const dayFactor = Math.min(2, 1 + this.game.day * 0.015);

        if (Math.random() < warLikelihood * dayFactor) {
          // Pick a rival — use relations score + power ratio
          const rivals = this.gods.filter(g => g.id !== god.id);
          let target = null;
          let bestScore = -Infinity;

          for (const rival of rivals) {
            if (this.diplomacy[god.faction][rival.faction] === 'war') continue;
            const rivalPop = this.getFactionPopulation(rival.faction);
            const powerRatio = myPop / Math.max(1, rivalPop);

            // Relations-based: lower relations → more likely to declare war
            const relations = this.game.simulation?.select('diplomacyState', { factionA: god.faction, factionB: rival.faction })?.relations ?? 0;
            const relPenalty = Math.max(0, relations + 40) * 0.02; // >-40 relations = penalty to war
            const score = powerRatio + Math.random() * 0.5 - relPenalty;

            if (score > bestScore && myPop >= 4 && relations < -20) {
              bestScore = score;
              target = rival;
            }
          }

          if (target && bestScore > 1.0) {
            if (this.game.simulation) {
              this.game.simulation.dispatch({
                type: 'conflict.declareWar',
                attackerFaction: god.faction,
                defenderFaction: target.faction,
                attackerName: god.name,
                defenderName: target.name,
              });
            } else {
              this.diplomacy[god.faction][target.faction] = 'war';
              this.diplomacy[target.faction][god.faction] = 'war';
              this.warTimers[god.faction][target.faction] = 0;
              this.warTimers[target.faction][god.faction] = 0;
            }
          }
        }

        // Peace treaty: after 60+ seconds of war, weaker side may sue for peace
        for (const rival of this.gods) {
          if (rival.id === god.id) continue;
          if (this.diplomacy[god.faction][rival.faction] !== 'war') continue;
          const warDuration = this.warTimers[god.faction][rival.faction] || 0;
          if (warDuration > 60 && Math.random() < dt * 0.03) {
            const myPow = this.getFactionPopulation(god.faction);
            const rivalPow = this.getFactionPopulation(rival.faction);
            // Use war score + population for peace decision
            const warState = this.game.simulation?.select('warState', { factionA: god.faction, factionB: rival.faction });
            const myScore = warState?.scoreA ?? 0;
            const rivalScore = warState?.scoreB ?? 0;
            const isLosing = myPow < rivalPow * 0.7 || rivalScore > myScore + 15;
            if (isLosing) {
              if (this.game.simulation) {
                this.game.simulation.dispatch({
                  type: 'conflict.makePeace',
                  factionA: god.faction,
                  factionB: rival.faction,
                  sourceName: god.name,
                  targetName: rival.name,
                });
              } else {
                this.diplomacy[god.faction][rival.faction] = 'peace';
                this.diplomacy[rival.faction][god.faction] = 'peace';
                this.warTimers[god.faction][rival.faction] = 0;
                this.warTimers[rival.faction][god.faction] = 0;
              }
            }
          }
        }
      }
    }

    // Trade relations: peace factions with shared trade routes gain relations
    if (Math.random() < dt * 0.03) {
      for (const god of this.gods) {
        if (god.isPlayer) continue;
        if (!this.diplomacy || this.diplomacy[god.faction]?.[0] === 'war') continue;
        // If both have markets, relations improve
        const myMarkets = this.game.buildingManager.getCountByType('market', god.faction);
        const playerMarkets = this.game.buildingManager.getCountByType('market', 0);
        if (myMarkets > 0 && playerMarkets > 0) {
          this.game.simulation?.dispatch({
            type: 'conflict.adjustRelations',
            factionA: god.faction,
            factionB: 0,
            delta: 2,
          });
        }
      }
    }

    // War actions: during war, AI sends raid parties toward enemy buildings
    for (const god of this.gods) {
      if (god.isPlayer) continue;
      for (const rival of this.gods) {
        if (rival.id === god.id) continue;
        if (this.diplomacy[god.faction][rival.faction] !== 'war') continue;
        
        // Periodically spawn raiding units toward enemy territory
        if (Math.random() < dt * 0.04) {
          const enemyBuildings = [];
          for (const b of this.game.buildingManager.buildings.values()) {
            if (b.faction === rival.faction) enemyBuildings.push(b);
          }
          if (enemyBuildings.length > 0 && god.faith >= 15) {
            god.spendFaith(15);
            const target = enemyBuildings[Math.floor(Math.random() * enemyBuildings.length)];
            // Spawn raiders near the target building
            const raidCount = god.personality === 'aggressive' ? 3 : 2;
            for (let i = 0; i < raidCount; i++) {
              const rx = target.x + Math.floor(Math.random() * 6 - 3);
              const rz = target.z + Math.floor(Math.random() * 6 - 3);
              if (this.game.terrain.isWalkable(rx, rz)) {
                if (this.game.simulation) {
                  this.game.simulation.dispatch({
                    type: 'conflict.spawnRaidParty',
                    tileX: rx,
                    tileZ: rz,
                    faction: god.faction,
                    count: 1,
                    raceId: god.raceId,
                  });
                } else {
                  const raider = this.game.creatureManager.spawnHuman(rx, rz, god.faction, god.raceId);
                  if (raider) {
                    raider.attack += 5;
                    raider.speed *= 1.15;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  getFactionPopulation(faction) {
    let count = 0;
    for (const c of this.game.creatureManager.creatures) {
      if (c.alive && c.type === 'human' && c.faction === faction) count++;
    }
    return count;
  }

  isAtWar(factionA, factionB) {
    if (!this.diplomacy || !this.diplomacy[factionA]) return false;
    return this.diplomacy[factionA][factionB] === 'war';
  }

  /**
   * Execute AI action objects through existing game systems.
   */
  executeActions(actions) {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      switch (action.type) {
        case 'spawn': {
          if (this.game.simulation) {
            const god = this.getGodByFaction(action.faction);
            this.game.simulation.dispatch({
              type: 'race.spawnHumans',
              tileX: action.tileX,
              tileZ: action.tileZ,
              faction: action.faction,
              count: action.count || 1,
              raceId: god?.raceId,
            });
          } else {
            const count = action.count || 1;
            for (let j = 0; j < count; j++) {
              const ox = action.tileX + Math.floor(Math.random() * 3 - 1);
              const oz = action.tileZ + Math.floor(Math.random() * 3 - 1);
              if (this.game.terrain.isWalkable(ox, oz)) {
                const god = this.getGodByFaction(action.faction);
                this.game.creatureManager.spawnHuman(ox, oz, action.faction, god?.raceId);
              }
            }
          }
          break;
        }

        case 'build': {
          if (this.game.buildingManager.canBuild(action.tileX, action.tileZ, action.buildingType)) {
            const aiResources = { wood: 9999, food: 9999, stone: 9999, gold: 9999, faith: 9999 };
            const success = this.game.simulation
              ? this.game.simulation.dispatch({
                  type: 'civ.build',
                  tileX: action.tileX,
                  tileZ: action.tileZ,
                  buildingType: action.buildingType,
                  faction: action.faction,
                  resources: aiResources,
                })
              : this.game.buildingManager.build(action.tileX, action.tileZ, action.buildingType, aiResources, action.faction);
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
          const god = this.getGod(action.godId);
          if (god && this.game.simulation) {
            this.game.simulation.dispatch({
              type: 'god.notifyBlessing',
              godName: god.name,
              blessingName: action.blessingName,
            });
          } else if (god && this.game.eventSystem) {
            this.game.eventSystem.showNotification({
              type: 'info',
              icon: '✨',
              message: `<b>${god.name}</b> acquired blessing: <b>${action.blessingName}</b>`,
            });
          }
          break;
        }

        case 'expand': {
          if (this.game.simulation) {
            const god = this.getGodByFaction(action.faction);
            this.game.simulation.dispatch({
              type: 'race.spawnHumans',
              tileX: action.tileX,
              tileZ: action.tileZ,
              faction: action.faction,
              count: action.count || 1,
              raceId: god?.raceId,
              randomOffset: false,
            });
          } else {
            const count = action.count || 1;
            for (let j = 0; j < count; j++) {
              if (this.game.terrain.isWalkable(action.tileX, action.tileZ)) {
                const god = this.getGodByFaction(action.faction);
                this.game.creatureManager.spawnHuman(action.tileX, action.tileZ, action.faction, god?.raceId);
              }
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
    // Player faction - use the actual faction-tagged buildings.
    if (this.game.buildingManager) {
      let count = 0;
      for (const building of this.game.buildingManager.buildings.values()) {
        if (building.faction === faction) {
          count++;
        }
      }
      return count;
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
