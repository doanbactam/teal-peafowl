import { adjustResources, applyMoodToFaction } from './sharedCivilizationEffects.js';

export class FaithEconomySubsystem {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
  }

  update(dt) {
    const faithEconomy = this.selectors.getFaithEconomy(0);
    this.game.resources.faith = Math.min(1000, this.game.resources.faith + (dt * faithEconomy.rate));
    return faithEconomy;
  }

  triggerDivineFavor() {
    adjustResources(this.game.resources, { faith: 30 });
    return applyMoodToFaction(this.game.creatureManager.creatures, {
      name: 'Divine Favor',
      amount: 8,
      duration: 30,
    });
  }

  handleCommand(command) {
    if (command.type === 'civ.divineFavor') return this.triggerDivineFavor();
    return false;
  }
}
