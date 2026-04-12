/**
 * WarSubsystem — owns war state tracking, war score, weariness, and victory conditions.
 *
 * War score: +1 per kill, +5 per building destroyed, +10 per hero kill.
 * War weariness: mood penalty that grows with war duration.
 * Victory: war score diff > 30 → loser auto-proposes peace.
 */
export class WarSubsystem {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
    this.wearinessTimer = 0;
  }

  update(dt) {
    const godManager = this.game.godManager;
    if (!godManager || !godManager.diplomacy) return;

    this.wearinessTimer += dt;

    // Track war weariness per faction
    for (let faction = 0; faction <= 4; faction++) {
      let atWar = false;
      for (let j = 0; j <= 4; j++) {
        if (faction !== j && godManager.isAtWar(faction, j)) {
          atWar = true;
          break;
        }
      }

      if (!this.state.conflict.warWeariness) {
        this.state.conflict.warWeariness = {};
      }

      if (atWar) {
        this.state.conflict.warWeariness[faction] =
          (this.state.conflict.warWeariness[faction] || 0) + dt;
      } else {
        // Weariness recovers after peace
        this.state.conflict.warWeariness[faction] = Math.max(
          0,
          (this.state.conflict.warWeariness[faction] || 0) - dt * 2,
        );
      }
    }

    // Apply war weariness mood to player faction every 5 seconds
    if (this.wearinessTimer >= 5) {
      this.wearinessTimer = 0;
      this.applyWarWearinessMood();
    }
  }

  /**
   * Apply mood modifier based on war weariness duration.
   */
  applyWarWearinessMood() {
    const weariness = this.state.conflict.warWeariness?.[0] || 0;
    if (weariness <= 0) return;

    // Mood penalty scales with war duration: -5 at 30s, -15 at 120s
    const penalty = Math.min(15, Math.floor(weariness / 30) * 3 + 2);

    const citizens = this.selectors.getPlayerHumans(0);
    for (const c of citizens) {
      if (c.alive) {
        c.addMoodModifier('War Weariness', -penalty, 10);
      }
    }
  }

  /**
   * Record a kill in war score.
   */
  recordKill(killerFaction, victimFaction) {
    if (!this.game.godManager?.isAtWar(killerFaction, victimFaction)) return;
    this.addWarScore(killerFaction, victimFaction, 1);
  }

  /**
   * Record a building destruction in war score.
   */
  recordBuildingDestroyed(attackerFaction, defenderFaction) {
    if (!this.game.godManager?.isAtWar(attackerFaction, defenderFaction)) return;
    this.addWarScore(attackerFaction, defenderFaction, 5);

    // Relations penalty
    this.game.simulation?.dispatch({
      type: 'conflict.adjustRelations',
      factionA: attackerFaction,
      factionB: defenderFaction,
      delta: -8,
    });
  }

  /**
   * Record a hero kill in war score.
   */
  recordHeroKill(killerFaction, victimFaction) {
    if (!this.game.godManager?.isAtWar(killerFaction, victimFaction)) return;
    this.addWarScore(killerFaction, victimFaction, 10);
  }

  addWarScore(factionA, factionB, points) {
    if (!this.state.conflict.warScores) {
      this.state.conflict.warScores = {};
    }

    const key = factionA < factionB ? `${factionA}-${factionB}` : `${factionB}-${factionA}`;
    if (!this.state.conflict.warScores[key]) {
      this.state.conflict.warScores[key] = {};
    }

    this.state.conflict.warScores[key][factionA] =
      (this.state.conflict.warScores[key][factionA] || 0) + points;
  }

  getWarScore(factionA, factionB) {
    const key = factionA < factionB ? `${factionA}-${factionB}` : `${factionB}-${factionA}`;
    const scores = this.state.conflict.warScores?.[key];
    if (!scores) return { a: 0, b: 0 };
    return {
      a: scores[factionA] || 0,
      b: scores[factionB] || 0,
    };
  }

  /**
   * Reset war score when peace is made.
   */
  onPeace(factionA, factionB) {
    const key = factionA < factionB ? `${factionA}-${factionB}` : `${factionB}-${factionA}`;
    if (this.state.conflict.warScores) {
      delete this.state.conflict.warScores[key];
    }

    // Peace relief mood
    const citizens = this.selectors.getPlayerHumans(0);
    if (factionA === 0 || factionB === 0) {
      for (const c of citizens) {
        if (c.alive) {
          c.addMoodModifier('Peace at Last', 12, 45);
        }
      }
    }
  }

  getWarState(factionA, factionB) {
    const godManager = this.game.godManager;
    const atWar = godManager?.isAtWar(factionA, factionB) || false;
    const score = this.getWarScore(factionA, factionB);
    const wearinessA = this.state.conflict.warWeariness?.[factionA] || 0;
    const wearinessB = this.state.conflict.warWeariness?.[factionB] || 0;

    return {
      atWar,
      scoreA: score.a,
      scoreB: score.b,
      wearinessA,
      wearinessB,
      winner: score.a > score.b + 10 ? factionA : score.b > score.a + 10 ? factionB : null,
    };
  }

  handleCommand(command) {
    if (command.type === 'war.recordKill') {
      this.recordKill(command.killerFaction, command.victimFaction);
      return true;
    }
    if (command.type === 'war.recordBuildingDestroyed') {
      this.recordBuildingDestroyed(command.attackerFaction, command.defenderFaction);
      return true;
    }
    if (command.type === 'war.recordHeroKill') {
      this.recordHeroKill(command.killerFaction, command.victimFaction);
      return true;
    }
    if (command.type === 'war.onPeace') {
      this.onPeace(command.factionA, command.factionB);
      return true;
    }
    return false;
  }
}
