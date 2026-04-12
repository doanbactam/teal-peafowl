import { DiplomacySubsystem } from '../subsystems/conflict/diplomacySubsystem.js';
import { WarSubsystem } from '../subsystems/conflict/warSubsystem.js';

export class ConflictLayer {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;

    this.diplomacySubsystem = new DiplomacySubsystem(game, state, selectors);
    this.warSubsystem = new WarSubsystem(game, state, selectors);
    this.subsystems = [this.diplomacySubsystem, this.warSubsystem];
  }

  update(dt) {
    if (this.game.godManager) {
      this.game.godManager.update(dt);
    }

    this.diplomacySubsystem.update(dt);
    this.warSubsystem.update(dt);
  }

  ensureDiplomacyMaps() {
    if (!this.game.godManager) {
      return false;
    }

    if (!this.game.godManager.diplomacy) {
      this.game.godManager.diplomacy = {};
      this.game.godManager.warTimers = {};
      for (let i = 0; i <= 4; i++) {
        this.game.godManager.diplomacy[i] = {};
        this.game.godManager.warTimers[i] = {};
        for (let j = 0; j <= 4; j++) {
          this.game.godManager.diplomacy[i][j] = 'peace';
          this.game.godManager.warTimers[i][j] = 0;
        }
      }
    }

    return true;
  }

  declareWar({ attackerFaction, defenderFaction, attackerName, defenderName }) {
    if (!this.ensureDiplomacyMaps()) {
      return false;
    }

    this.game.godManager.diplomacy[attackerFaction][defenderFaction] = 'war';
    this.game.godManager.diplomacy[defenderFaction][attackerFaction] = 'war';
    this.game.godManager.warTimers[attackerFaction][defenderFaction] = 0;
    this.game.godManager.warTimers[defenderFaction][attackerFaction] = 0;

    // Relations drop on war declaration
    this.diplomacySubsystem.adjustRelations(attackerFaction, defenderFaction, -30);

    this.game.eventSystem?.showNotification({
      type: 'alert',
      icon: '⚔️',
      message: `<b>${attackerName}</b> declared WAR on <b>${defenderName}</b>!`,
    });

    return true;
  }

  makePeace({ factionA, factionB, sourceName, targetName }) {
    if (!this.ensureDiplomacyMaps()) {
      return false;
    }

    this.game.godManager.diplomacy[factionA][factionB] = 'peace';
    this.game.godManager.diplomacy[factionB][factionA] = 'peace';
    this.game.godManager.warTimers[factionA][factionB] = 0;
    this.game.godManager.warTimers[factionB][factionA] = 0;

    // Relations boost on peace
    this.diplomacySubsystem.adjustRelations(factionA, factionB, 15);

    // War subsystem cleanup
    this.warSubsystem.onPeace(factionA, factionB);

    this.game.eventSystem?.showNotification({
      type: 'success',
      icon: '🕊️',
      message: `<b>${sourceName}</b> signed a peace treaty with <b>${targetName}</b>.`,
    });

    return true;
  }

  spawnBanditRaid() {
    const halfSize = this.game.terrain.size / 2;
    let spawned = 0;
    const angle = Math.random() * Math.PI * 2;
    const dist = this.game.terrain.size * 0.4;
    const wx = Math.cos(angle) * dist;
    const wz = Math.sin(angle) * dist;
    const banditCount = 3 + Math.floor(this.game.day / 10);

    for (let i = 0; i < Math.min(banditCount, 8); i++) {
      const tx = Math.floor(wx + halfSize + (Math.random() - 0.5) * 4);
      const tz = Math.floor(wz + halfSize + (Math.random() - 0.5) * 4);
      if (!this.game.terrain.isWalkable(tx, tz)) {
        continue;
      }

      const bandit = this.game.creatureManager.spawnHuman(tx, tz, 99);
      if (!bandit) {
        continue;
      }

      bandit.name = 'Bandit';
      bandit.attack += 5;
      bandit.speed *= 1.2;
      spawned++;
    }

    return spawned > 0;
  }

  spawnRaidParty({ tileX, tileZ, faction, count = 1, raceId }) {
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const rx = tileX + Math.floor(Math.random() * 3 - 1);
      const rz = tileZ + Math.floor(Math.random() * 3 - 1);
      if (!this.game.terrain.isWalkable(rx, rz)) {
        continue;
      }

      const raider = this.game.creatureManager.spawnHuman(rx, rz, faction, raceId);
      if (raider) {
        raider.attack += 5;
        raider.speed *= 1.15;
        spawned++;
      }
    }
    return spawned > 0;
  }

  handleCommand(command) {
    // Try own commands first
    if (command.type === 'conflict.declareWar') return this.declareWar(command);
    if (command.type === 'conflict.makePeace') return this.makePeace(command);
    if (command.type === 'conflict.banditRaid') return this.spawnBanditRaid();
    if (command.type === 'conflict.spawnRaidParty') return this.spawnRaidParty(command);

    // Delegate to subsystems
    for (const subsystem of this.subsystems) {
      if (subsystem.handleCommand(command)) {
        return true;
      }
    }

    return false;
  }
}
