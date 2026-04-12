import { getRace } from '../../../races.js';
/**
 * FactionPoliticsSubsystem — owns internal faction satisfaction, ideology, and rebellion.
 *
 * Satisfaction computed from: food security, shelter, mood, war casualties, divine trust.
 * Low satisfaction → rebel citizens who stop working and sabotage buildings.
 */
export class FactionPoliticsSubsystem {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
    this.rebelCheckTimer = 0;
  }

  update(dt) {
    this.updateSatisfaction(dt);
    this.rebelCheckTimer += dt;

    // Check for rebellion every 30 seconds
    if (this.rebelCheckTimer >= 30) {
      this.rebelCheckTimer = 0;
      this.checkRebellion();
    }
  }

  /**
   * Compute faction satisfaction from colony pressures.
   * Range: 0–100. Starts at 60 (neutral).
   */
  updateSatisfaction(dt) {
    const socialMetrics = this.selectors.getSocialMetrics(0);
    const metrics = this.selectors.getSettlementMetrics(0);
    const climate = this.selectors.getSocialClimate(0);
    const pop = socialMetrics.pop;

    if (pop === 0) {
      this.state.factions.player.satisfaction = 60;
      return;
    }

    // Positive factors
    const foodSecurity = Math.min(1, metrics.foodPerCitizen / 10); // 0–1
    const shelterSecurity = metrics.spareBeds >= 0 ? 1 : Math.max(0, 1 + metrics.spareBeds / pop);
    const moodFactor = socialMetrics.avgMood / 100;
    const trustFactor = Math.max(0, (climate.trust + 40) / 100); // trust ranges -40 to 60

    // Negative factors
    const raceId = this.game.getFactionRaceId(0);
    const raceData = getRace(raceId);
    const soc = raceData.societal.satisfaction;

    // Negative factors
    const warPenalty = this.getWarPenalty(soc.warPenaltyMult);
    const sickPenalty = pop > 0 ? (socialMetrics.sick / pop) * 20 : 0;
    const breakingPenalty = pop > 0 ? (socialMetrics.breaking / pop) * 30 : 0;
    const fearPenalty = Math.min(15, climate.fear * 0.2);

    const targetSatisfaction = Math.max(0, Math.min(100,
      (foodSecurity * 25) +
      (shelterSecurity * 20) +
      (moodFactor * 30) +
      (trustFactor * 15) +
      10 + soc.baseBonus - // base + race modifier
      warPenalty -
      sickPenalty -
      breakingPenalty -
      fearPenalty
    ));

    // Smooth approach
    const current = this.state.factions.player.satisfaction;
    this.state.factions.player.satisfaction = current + (targetSatisfaction - current) * dt * 0.1;

    // Update ideology based on colony behavior
    this.updateIdeology(metrics, pop);
  }

  getWarPenalty(mult = 1.0) {
    const godManager = this.game.godManager;
    if (!godManager || !godManager.diplomacy) return 0;

    let penalty = 0;
    for (let i = 1; i <= 4; i++) {
      if (godManager.isAtWar(0, i)) {
        const duration = godManager.warTimers?.[0]?.[i] || 0;
        penalty += 5 + Math.min(15, duration * 0.1); // 5–20 per active war
      }
    }
    return Math.min(30 * mult, penalty * mult);
  }

  /**
   * Ideology tracks what kind of civilization the player is building.
   * 3 axes: militarism (barracks/warriors), piety (temples/priests), prosperity (farms/markets/goods).
   */
  updateIdeology(metrics, pop) {
    if (pop === 0) return;

    const ideology = this.state.factions.player.ideology;
    const buildings = metrics;

    // Compute raw ideology scores from building ratios
    const totalBuildings = (buildings.houses || 0) + (buildings.farms || 0) + (buildings.temples || 0) +
      (buildings.barracks || 0) + (buildings.mines || 0) + (buildings.storage || 0) + 1;

    const raceId = this.game.getFactionRaceId(0);
    const raceData = getRace(raceId);
    const baseIdeology = raceData.societal.ideologyBase;

    const baseWeight = 0.4;
    const bMilitarism = ((buildings.barracks || 0) / totalBuildings) * 100;
    const bPiety = ((buildings.temples || 0) / totalBuildings) * 100;
    const bProsperity = (((buildings.farms || 0) + (buildings.mines || 0) + (buildings.storage || 0)) / totalBuildings) * 100;

    const targetMilitarism = bMilitarism * (1 - baseWeight) + baseIdeology.militarism * baseWeight;
    const targetPiety = bPiety * (1 - baseWeight) + baseIdeology.piety * baseWeight;
    const targetProsperity = bProsperity * (1 - baseWeight) + baseIdeology.prosperity * baseWeight;

    // Smooth approach
    ideology.militarism += (targetMilitarism - ideology.militarism) * 0.01;
    ideology.piety += (targetPiety - ideology.piety) * 0.01;
    ideology.prosperity += (targetProsperity - ideology.prosperity) * 0.01;
  }

  /**
   * When satisfaction stays very low, citizens may rebel:
   * - Stop working (mental break 'hide')
   * - Sabotage a building (reduce HP)
   */
  checkRebellion() {
    const satisfaction = this.state.factions.player.satisfaction;
    const raceId = this.game.getFactionRaceId(0);
    const raceData = getRace(raceId);
    const threshold = raceData.societal.satisfaction.rebelThreshold;
    if (satisfaction >= threshold) return; // No rebellion above racial threshold

    const citizens = this.selectors.getPlayerHumans(0);
    if (citizens.length < 5) return; // Too small to rebel

    // 15% chance per check when satisfaction < 25
    const rebelChance = Math.max(0.05, (threshold - satisfaction) / 100);

    for (const citizen of citizens) {
      if (citizen.mentalBreak || citizen.isHero) continue;
      if (Math.random() < rebelChance * 0.3) {
        // Rebel: refuse to work
        citizen.addMoodModifier('Rebellious', -15, 60);

        // Small chance to sabotage a building
        if (Math.random() < 0.2) {
          this.sabotageNearby(citizen);
        }
        break; // Only one rebel per check cycle
      }
    }
  }

  sabotageNearby(creature) {
    for (const building of this.game.buildingManager.buildings.values()) {
      if (building.faction !== creature.faction) continue;
      const dx = Math.abs(building.x - creature.tileX);
      const dz = Math.abs(building.z - creature.tileZ);
      if (dx + dz <= 5) {
        building.health -= building.maxHealth * 0.15;
        this.game.eventSystem?.showNotification({
          type: 'danger',
          icon: '🔥',
          message: `<b>${creature.name}</b> sabotaged a <b>${building.name}</b>!`,
        });
        return;
      }
    }
  }

  handleCommand(command) {
    return false;
  }
}
