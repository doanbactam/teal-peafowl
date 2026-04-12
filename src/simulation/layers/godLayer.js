export class GodLayer {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
  }

  syncPlayerFaction() {
    this.state.factions.player.raceId = this.game.playerRace;
    this.state.factions.player.domainId = this.game.playerDomain;
    this.state.factions.player.resources = this.game.resources;
    this.state.factions.player.socialClimate = this.game.socialClimate;
  }

  update() {
    this.syncPlayerFaction();
  }

  registerDivineIntervention(powerId, success = true) {
    if (!success || !powerId || powerId === 'select') {
      return false;
    }

    const social = this.state.factions.player.socialClimate;
    const disposition = this.selectors.getDomainPowerDisposition(powerId);
    const deltas = {
      trust: 0,
      fear: 0,
      strain: 0,
    };

    if (disposition.category === 'benevolent') {
      deltas.trust += 4;
      deltas.fear -= 2;
      deltas.strain += 4;
    } else if (disposition.category === 'creation') {
      deltas.trust += 2;
      deltas.strain += 3;
    } else if (disposition.category === 'destructive') {
      deltas.trust -= 1;
      deltas.fear += 6;
      deltas.strain += 8;
    } else if (disposition.category === 'corruptive') {
      deltas.trust -= 3;
      deltas.fear += 8;
      deltas.strain += 9;
    } else {
      deltas.strain += 2;
    }

    if (disposition.alignment === 'aligned') {
      deltas.trust += 2;
      deltas.fear -= 1;
    } else if (disposition.alignment === 'misaligned') {
      deltas.trust -= 3;
      deltas.fear += 2;
    }

    social.trust = Math.max(-40, Math.min(60, social.trust + deltas.trust));
    social.fear = Math.max(0, Math.min(80, social.fear + deltas.fear));
    social.strain = Math.max(0, Math.min(100, social.strain + deltas.strain));
    social.lastPower = powerId;

    return true;
  }

  handleCommand(command) {
    if (command.type === 'god.intervention') {
      return this.registerDivineIntervention(command.powerId, command.success);
    }

    if (command.type === 'god.castPower') {
      return this.game.godPowers.applyPower(command.powerId, command.worldX, command.worldZ, {
        chargeFaith: command.chargeFaith !== false,
        trackIntervention: command.trackIntervention !== false,
      });
    }

    if (command.type === 'god.notifyBlessing') {
      this.game.eventSystem?.showNotification({
        type: 'info',
        icon: '✨',
        message: `<b>${command.godName}</b> acquired blessing: <b>${command.blessingName}</b>`,
      });
      return true;
    }

    return false;
  }
}
