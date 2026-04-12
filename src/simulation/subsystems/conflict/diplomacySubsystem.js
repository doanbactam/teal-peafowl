import { getRace } from '../../../races.js';
/**
 * DiplomacySubsystem — owns inter-faction relations, alliances, war/peace transitions.
 *
 * Relations score: -100 (hostile) → 0 (neutral) → +100 (allied).
 * Thresholds: <-40 war tension, >60 alliance eligible.
 */
export class DiplomacySubsystem {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
    this.initialized = false;
  }

  ensureInitialized() {
    if (this.initialized) return;
    const conflict = this.state.conflict;

    // Initialize relation maps for factions 0–4
    if (!conflict.relations || Object.keys(conflict.relations).length === 0) {
      conflict.relations = {};
      for (let i = 0; i <= 4; i++) {
        conflict.relations[i] = {};
        for (let j = 0; j <= 4; j++) {
          if (i === j) {
            conflict.relations[i][j] = 100;
          } else {
            const raceI = getRace(this.game.getFactionRaceId(i));
            const raceJ = getRace(this.game.getFactionRaceId(j));
            const baseRel = (raceI.societal.diplomacy.baseRelations + raceJ.societal.diplomacy.baseRelations) / 2;
            conflict.relations[i][j] = baseRel;
          }
        }
      }
    }

    if (!conflict.alliances) conflict.alliances = [];
    this.initialized = true;
  }

  update(dt) {
    this.ensureInitialized();
    this.decayRelations(dt);
    this.evaluateAllianceBreaks();
  }

  /**
   * Relations slowly drift toward 0 (neutral) over time when nothing happens.
   */
  decayRelations(dt) {
    const relations = this.state.conflict.relations;
    for (let i = 0; i <= 4; i++) {
      for (let j = i + 1; j <= 4; j++) {
        if (!relations[i] || relations[i][j] === undefined) continue;
        const current = relations[i][j];
        if (Math.abs(current) < 1) continue;

        // Decay toward 0 at 0.3 per second, modified by racial traits
        const raceI = getRace(this.game.getFactionRaceId(i));
        const raceJ = getRace(this.game.getFactionRaceId(j));
        const decayMult = (raceI.societal.diplomacy.decayMult + raceJ.societal.diplomacy.decayMult) / 2;
        const decayAmount = dt * 0.3 * decayMult;
        const decay = current > 0 ? -decayAmount : decayAmount;
        const newVal = current + decay;

        // Don't cross zero from decay alone
        if ((current > 0 && newVal < 0) || (current < 0 && newVal > 0)) {
          relations[i][j] = 0;
          relations[j][i] = 0;
        } else {
          relations[i][j] = Math.max(-100, Math.min(100, newVal));
          relations[j][i] = relations[i][j];
        }
      }
    }
  }

  /**
   * Break alliances if relations drop below 20.
   */
  evaluateAllianceBreaks() {
    const alliances = this.state.conflict.alliances;
    const toRemove = [];

    for (let i = 0; i < alliances.length; i++) {
      const rel = this.getRelations(alliances[i].factionA, alliances[i].factionB);
      if (rel < 20) {
        toRemove.push(i);

        this.game.eventSystem?.showNotification({
          type: 'warning',
          icon: '💔',
          message: `Alliance between factions ${alliances[i].factionA} and ${alliances[i].factionB} has <b>broken</b>!`,
        });
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      alliances.splice(toRemove[i], 1);
    }
  }

  getRelations(factionA, factionB) {
    this.ensureInitialized();
    return this.state.conflict.relations[factionA]?.[factionB] ?? 0;
  }

  /**
   * Adjust relations between two factions.
   * @param {number} factionA
   * @param {number} factionB
   * @param {number} delta - positive or negative change
   */
  adjustRelations(factionA, factionB, delta) {
    this.ensureInitialized();
    const relations = this.state.conflict.relations;
    if (!relations[factionA]) relations[factionA] = {};
    if (!relations[factionB]) relations[factionB] = {};

    const current = relations[factionA][factionB] || 0;
    const newVal = Math.max(-100, Math.min(100, current + delta));
    relations[factionA][factionB] = newVal;
    relations[factionB][factionA] = newVal;

    return newVal;
  }

  isAllied(factionA, factionB) {
    return this.state.conflict.alliances.some(
      (a) => (a.factionA === factionA && a.factionB === factionB) ||
             (a.factionA === factionB && a.factionB === factionA),
    );
  }

  formAlliance(factionA, factionB) {
    if (this.isAllied(factionA, factionB)) return false;
    if (this.getRelations(factionA, factionB) < 60) return false;

    this.state.conflict.alliances.push({ factionA, factionB });

    this.game.eventSystem?.showNotification({
      type: 'success',
      icon: '🤝',
      message: `Factions ${factionA} and ${factionB} formed an <b>Alliance</b>!`,
    });

    return true;
  }

  handleCommand(command) {
    if (command.type === 'conflict.adjustRelations') {
      this.adjustRelations(command.factionA, command.factionB, command.delta);
      return true;
    }
    if (command.type === 'conflict.formAlliance') {
      return this.formAlliance(command.factionA, command.factionB);
    }
    if (command.type === 'conflict.breakAlliance') {
      const idx = this.state.conflict.alliances.findIndex(
        (a) => (a.factionA === command.factionA && a.factionB === command.factionB) ||
               (a.factionA === command.factionB && a.factionB === command.factionA),
      );
      if (idx >= 0) {
        this.state.conflict.alliances.splice(idx, 1);
        return true;
      }
      return false;
    }
    return false;
  }
}
