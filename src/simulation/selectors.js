import { getDomain, DOMAIN_IDS } from '../domains.js';
import { RACE_IDS } from '../races.js';

export class SimulationSelectors {
  constructor(game, state) {
    this.game = game;
    this.state = state;
  }

  getSocialClimate(faction = 0) {
    if (faction === 0) {
      return this.state.factions.player.socialClimate;
    }

    return {
      trust: 0,
      fear: 0,
      strain: 0,
      lastPower: null,
    };
  }

  getFactionGod(faction = 0) {
    if (this.game.godManager) {
      return this.game.godManager.getGodByFaction(faction);
    }

    if (faction === 0) {
      return {
        faction: 0,
        raceId: this.state.factions.player.raceId,
        domainId: this.state.factions.player.domainId,
      };
    }

    return null;
  }

  getFactionRaceId(faction = 0) {
    return this.getFactionGod(faction)?.raceId || (faction === 0 ? this.state.factions.player.raceId : RACE_IDS.HUMAN);
  }

  getFactionDomainId(faction = 0) {
    return this.getFactionGod(faction)?.domainId || (faction === 0 ? this.state.factions.player.domainId : DOMAIN_IDS.LIGHT);
  }

  getFactionPassiveEffects(faction = 0) {
    return getDomain(this.getFactionDomainId(faction))?.passiveBonus?.effect || {};
  }

  getFactionPopulation(faction = 0) {
    return this.game.creatureManager.creatures.filter(
      (creature) => creature.alive && creature.type === 'human' && creature.faction === faction,
    ).length;
  }

  getPlayerHumans(faction = 0) {
    return this.game.creatureManager.creatures.filter(
      (creature) => creature.alive && creature.type === 'human' && creature.faction === faction,
    );
  }

  countBurningTiles() {
    let count = 0;
    for (const tile of this.game.terrain.tiles.values()) {
      if (tile.onFire) {
        count++;
      }
    }
    return count;
  }

  getSettlementMetrics(faction = 0) {
    const resources = faction === 0 ? this.game.resources : this.state.factions.player.resources;
    const metrics = {
      pop: this.getFactionPopulation(faction),
      houses: 0,
      farms: 0,
      temples: 0,
      storage: 0,
      barracks: 0,
      mines: 0,
      smithies: 0,
      markets: 0,
      housingCap: 0,
      storageCap: 0,
      fireTiles: this.countBurningTiles(),
    };

    for (const building of this.game.buildingManager.buildings.values()) {
      if (building.faction !== faction) {
        continue;
      }

      if (building.type === 'house') {
        metrics.houses++;
        metrics.housingCap += 4;
      } else if (building.type === 'farm') {
        metrics.farms++;
      } else if (building.type === 'temple') {
        metrics.temples++;
      } else if (building.type === 'storage') {
        metrics.storage++;
        metrics.storageCap += 50;
      } else if (building.type === 'barracks') {
        metrics.barracks++;
      } else if (building.type === 'mine') {
        metrics.mines++;
      } else if (building.type === 'smithy') {
        metrics.smithies++;
      } else if (building.type === 'market') {
        metrics.markets++;
      }
    }

    metrics.spareBeds = metrics.housingCap - metrics.pop;
    metrics.foodPerCitizen = metrics.pop > 0 ? resources.food / metrics.pop : resources.food;
    metrics.wealth = resources.wood + resources.stone + (resources.gold * 2) + (resources.food * 0.5) + ((resources.iron || 0) * 3) + ((resources.goods || 0) * 5);

    return metrics;
  }

  getSocialMetrics(faction = 0) {
    const citizens = this.getPlayerHumans(faction);
    const pop = citizens.length;

    if (pop === 0) {
      return {
        pop: 0,
        avgMood: 50,
        hungry: 0,
        starving: 0,
        tired: 0,
        exhausted: 0,
        lowMood: 0,
        breaking: 0,
        sick: 0,
      };
    }

    return {
      pop,
      avgMood: citizens.reduce((sum, creature) => sum + creature.mood, 0) / pop,
      hungry: citizens.filter((creature) => creature.hunger >= 45).length,
      starving: citizens.filter((creature) => creature.hunger >= 70).length,
      tired: citizens.filter((creature) => creature.restLevel <= 40).length,
      exhausted: citizens.filter((creature) => creature.restLevel <= 20).length,
      lowMood: citizens.filter((creature) => creature.mood <= 40).length,
      breaking: citizens.filter((creature) => creature.mentalBreak).length,
      sick: citizens.filter((creature) => creature.plagued || creature.cursed || creature.madness).length,
    };
  }

  getDomainPowerDisposition(powerId, domainId = this.getFactionDomainId(0)) {
    const groups = {
      benevolent: ['rain', 'divine_light'],
      creation: ['spawn_human', 'spawn_animal', 'spawn_tree'],
      destructive: ['fire', 'meteor', 'earthquake', 'tornado', 'lightning'],
      corruptive: ['plague', 'madness'],
    };

    let category = 'neutral';
    for (const [group, powers] of Object.entries(groups)) {
      if (powers.includes(powerId)) {
        category = group;
        break;
      }
    }

    const domainAffinity = {
      light: { liked: ['benevolent'], disliked: ['corruptive', 'destructive'] },
      nature: { liked: ['benevolent', 'creation'], disliked: ['corruptive'] },
      water: { liked: ['benevolent'], disliked: ['corruptive'] },
      earth: { liked: ['creation'], disliked: [] },
      beast: { liked: ['creation'], disliked: [] },
      fire: { liked: ['destructive'], disliked: ['benevolent'] },
      shadow: { liked: ['corruptive'], disliked: ['benevolent'] },
      death: { liked: ['corruptive'], disliked: [] },
    };

    const affinity = domainAffinity[domainId] || { liked: [], disliked: [] };
    const alignment = affinity.liked.includes(category) ? 'aligned' : affinity.disliked.includes(category) ? 'misaligned' : 'neutral';

    return { category, alignment };
  }

  getFaithEconomy(faction = 0) {
    const metrics = this.getSettlementMetrics(faction);
    const socialMetrics = this.getSocialMetrics(faction);
    const passive = this.getFactionPassiveEffects(faction);
    const socialClimate = this.getSocialClimate(faction);
    const pop = socialMetrics.pop;

    if (pop === 0) {
      return {
        rate: 0,
        moodFactor: 1,
        stabilityFactor: 1,
        climateFactor: 1,
        metrics,
        socialMetrics,
      };
    }

    const homeless = Math.max(0, pop - metrics.housingCap);
    const stabilityPenalty = (
      (socialMetrics.breaking / pop) * 0.45 +
      (socialMetrics.sick / pop) * 0.25 +
      (socialMetrics.starving / pop) * 0.25 +
      (homeless > 0 ? Math.min(0.25, homeless / pop) : 0)
    );

    const base = (pop * 0.12) + (metrics.temples * 0.28);
    const moodFactor = Math.max(0.35, Math.min(1.55, 0.55 + (socialMetrics.avgMood / 100)));
    const stabilityFactor = Math.max(0.25, 1 - stabilityPenalty);
    const climateFactor = Math.max(
      0.2,
      1 + (socialClimate.trust / 100) - (socialClimate.fear / 110) - (socialClimate.strain / 180),
    );
    const passiveFactor = passive.faithMultiplier ? 1 + passive.faithMultiplier : 1;

    return {
      rate: base * moodFactor * stabilityFactor * climateFactor * passiveFactor,
      moodFactor,
      stabilityFactor,
      climateFactor,
      metrics,
      socialMetrics,
    };
  }

  getPressureLevel(score) {
    if (score >= 85) return 'crisis';
    if (score >= 60) return 'danger';
    if (score >= 30) return 'watch';
    return 'calm';
  }

  getPressureLabel(level) {
    if (level === 'crisis') return 'Crisis';
    if (level === 'danger') return 'Danger';
    if (level === 'watch') return 'Watch';
    return 'Stable';
  }

  getOverviewLabel(level) {
    if (level === 'crisis') return 'Critical';
    if (level === 'danger') return 'Unstable';
    if (level === 'watch') return 'Strained';
    return 'Calm';
  }

  getColonyDiagnostics(faction = 0) {
    const metrics = this.getSettlementMetrics(faction);
    const socialMetrics = this.getSocialMetrics(faction);
    const pop = socialMetrics.pop;
    const socialClimate = this.getSocialClimate(faction);

    if (pop === 0) {
      return {
        overview: {
          level: 'watch',
          label: 'Founding',
          summary: 'Choose a domain and found a settlement to start the simulation loop.',
        },
        food: { level: 'watch', label: 'Watch', detail: 'No colony yet. Food pressure starts once citizens arrive.' },
        shelter: { level: 'watch', label: 'Watch', detail: 'No housing pressure until your first settlers appear.' },
        stability: { level: 'watch', label: 'Watch', detail: 'Stability will form from mood, illness, and divine choices.' },
      };
    }

    const { hungry, starving, tired, exhausted, lowMood, breaking, sick, avgMood } = socialMetrics;
    const homeless = Math.max(0, pop - metrics.housingCap);
    const faithPressure = this.game.resources.faith < Math.max(30, pop * 4) ? 1 : 0;
    const winterPenalty = this.state.world.season === 'winter' ? 14 : 0;

    const foodScore = Math.min(
      100,
      (metrics.foodPerCitizen < 4 ? 45 : 0) +
      (metrics.foodPerCitizen < 2 ? 25 : 0) +
      (hungry / pop) * 35 +
      (starving / pop) * 35 +
      winterPenalty,
    );
    const shelterScore = Math.min(
      100,
      (homeless > 0 ? Math.min(40, homeless * 12) : 0) +
      (tired / pop) * 28 +
      (exhausted / pop) * 34 +
      (metrics.houses === 0 ? 30 : 0),
    );
    const stabilityScore = Math.min(
      100,
      Math.max(0, 62 - avgMood) +
      (lowMood / pop) * 30 +
      (breaking / pop) * 40 +
      (sick / pop) * 28 +
      Math.min(18, metrics.fireTiles * 3) +
      Math.min(20, socialClimate.fear * 0.25) +
      Math.min(18, socialClimate.strain * 0.18) +
      (faithPressure ? 12 : 0),
    );

    const foodLevel = this.getPressureLevel(foodScore);
    const shelterLevel = this.getPressureLevel(shelterScore);
    const stabilityLevel = this.getPressureLevel(stabilityScore);

    let summary = 'Stores, beds, and morale are holding. This is the moment to prepare for the next spike.';
    const strongest = [
      { key: 'food', score: foodScore, level: foodLevel },
      { key: 'shelter', score: shelterScore, level: shelterLevel },
      { key: 'stability', score: stabilityScore, level: stabilityLevel },
    ].sort((a, b) => b.score - a.score)[0];

    if (strongest.key === 'food' && strongest.level !== 'calm') {
      summary = starving > 0
        ? `Food is the immediate risk: ${starving} colonists are starving. Stabilize supply before growth or winter punishes you.`
        : `Food is tightening. ${hungry} colonists are already hungry, so expansion will turn into a crisis if farms do not catch up.`;
    } else if (strongest.key === 'shelter' && strongest.level !== 'calm') {
      summary = homeless > 0
        ? `Shelter is falling behind. ${homeless} colonists have no bed space, which is dragging rest and future stability down.`
        : 'Rest is slipping. Your colony can still function, but fatigue is building faster than recovery.';
    } else if (strongest.key === 'stability' && strongest.level !== 'calm') {
      if (breaking > 0) {
        summary = `Stability is breaking. ${breaking} colonists are already in mental crisis, so the next bad event will hit much harder.`;
      } else if (sick > 0) {
        summary = 'Stability is under pressure from sickness and fear. Clean recovery tools matter more than raw expansion right now.';
      } else {
        summary = 'Morale is slipping. The colony still works, but faith and productivity will soften if this state lingers.';
      }
    }

    return {
      overview: {
        level: this.getPressureLevel(Math.max(foodScore, shelterScore, stabilityScore)),
        label: this.getOverviewLabel(this.getPressureLevel(Math.max(foodScore, shelterScore, stabilityScore))),
        summary,
      },
      food: {
        level: foodLevel,
        label: this.getPressureLabel(foodLevel),
        detail: starving > 0
          ? `${starving}/${pop} starving, ${Math.floor(this.game.resources.food)} food in storage.`
          : `${hungry}/${pop} hungry, ${metrics.farms} farms supporting ${pop} people.`,
      },
      shelter: {
        level: shelterLevel,
        label: this.getPressureLabel(shelterLevel),
        detail: homeless > 0
          ? `${homeless} without beds. Capacity ${metrics.housingCap} for ${pop} people.`
          : `${metrics.housingCap - pop} spare beds, but ${tired}/${pop} are tired or worse.`,
      },
      stability: {
        level: stabilityLevel,
        label: this.getPressureLabel(stabilityLevel),
        detail: `${Math.round(avgMood)} avg mood, ${sick} afflicted, ${breaking} breaking, fear ${Math.round(socialClimate.fear)}.`,
      },
    };
  }

  buildStorytellerState(faction = 0) {
    const metrics = this.getSettlementMetrics(faction);
    const playerHumans = this.getPlayerHumans(faction);

    return {
      ...metrics,
      faith: this.game.resources.faith,
      gold: this.game.resources.gold,
      food: this.game.resources.food,
      iron: this.game.resources.iron || 0,
      goods: this.game.resources.goods || 0,
      day: this.state.clock.day,
      isNight: this.state.clock.gameTime >= 20 || this.state.clock.gameTime < 6,
      plaguedCount: playerHumans.filter((creature) => creature.plagued).length,
      injuredCount: playerHumans.filter((creature) => creature.health < creature.maxHealth * 0.65).length,
      averageMood: playerHumans.length > 0
        ? playerHumans.reduce((sum, creature) => sum + creature.mood, 0) / playerHumans.length
        : 50,
      animalCount: this.game.creatureManager.getAnimalCount(),
      heroCount: (this.state.heroes || []).filter((h) => h.faction === faction).length,
      satisfaction: this.state.factions.player.satisfaction,
      tradeRoutes: (this.state.economy.tradeRoutes || []).length,
    };
  }

  // ===== NEW SELECTORS =====

  getProductionMetrics(faction = 0) {
    return {
      iron: this.game.resources.iron || 0,
      goods: this.game.resources.goods || 0,
      smithies: this.getSettlementMetrics(faction).smithies,
      markets: this.getSettlementMetrics(faction).markets,
      tradeRoutes: (this.state.economy.tradeRoutes || []).filter(
        (r) => r.factionA === faction || r.factionB === faction,
      ),
    };
  }

  getDiplomacyState(factionA, factionB) {
    const relations = this.state.conflict.relations?.[factionA]?.[factionB] ?? 0;
    const alliances = this.state.conflict.alliances || [];
    const isAllied = alliances.some(
      (a) => (a.factionA === factionA && a.factionB === factionB) ||
             (a.factionA === factionB && a.factionB === factionA),
    );
    const atWar = this.game.godManager?.isAtWar(factionA, factionB) || false;

    let status = 'neutral';
    if (atWar) status = 'war';
    else if (isAllied) status = 'allied';
    else if (relations > 40) status = 'friendly';
    else if (relations < -40) status = 'hostile';

    return { relations, status, isAllied, atWar };
  }

  getHeroes(faction = null) {
    const heroes = this.state.heroes || [];
    if (faction === null) return heroes;
    return heroes.filter((h) => h.faction === faction);
  }

  getFactionSatisfaction(faction = 0) {
    return this.state.factions.player.satisfaction;
  }

  getFactionIdeology(faction = 0) {
    return this.state.factions.player.ideology;
  }

  getWarState(factionA, factionB) {
    const warScores = this.state.conflict.warScores || {};
    const key = factionA < factionB ? `${factionA}-${factionB}` : `${factionB}-${factionA}`;
    const scores = warScores[key] || {};
    const atWar = this.game.godManager?.isAtWar(factionA, factionB) || false;

    return {
      atWar,
      scoreA: scores[factionA] || 0,
      scoreB: scores[factionB] || 0,
      wearinessA: this.state.conflict.warWeariness?.[factionA] || 0,
      wearinessB: this.state.conflict.warWeariness?.[factionB] || 0,
    };
  }
}
