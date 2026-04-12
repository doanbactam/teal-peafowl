import { adjustResources, applyMoodToFaction } from './sharedCivilizationEffects.js';

export class EconomySubsystem {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
  }

  update(dt) {
    this.game.creatureManager.update(dt, this.game.buildingManager, this.game.resources, this.game.gameTime);
    this.game.buildingManager.update(dt, this.game.resources, this.game.gameTime);
    this.game.techTree.update(dt);
    return true;
  }

  adjustResources(deltas = {}) {
    return adjustResources(this.game.resources, deltas);
  }

  build(tileX, tileZ, buildingType, resources = this.game.resources, faction = 0) {
    return this.game.buildingManager.build(tileX, tileZ, buildingType, resources, faction);
  }

  triggerGoldRush() {
    return this.adjustResources({ gold: 50 });
  }

  triggerBountifulHarvest() {
    this.adjustResources({ food: 40 });
    return applyMoodToFaction(this.game.creatureManager.creatures, {
      name: 'Good harvest',
      amount: 5,
      duration: 20,
    });
  }

  triggerTradeCaravan() {
    return this.adjustResources({ wood: 15, stone: 15, gold: 5, food: 10 });
  }

  handleCommand(command) {
    if (command.type === 'civ.adjustResources') return this.adjustResources(command.deltas);
    if (command.type === 'civ.build') {
      return this.build(
        command.tileX,
        command.tileZ,
        command.buildingType,
        command.resources || this.game.resources,
        command.faction || 0,
      );
    }
    if (command.type === 'civ.goldRush') return this.triggerGoldRush();
    if (command.type === 'civ.bountifulHarvest') return this.triggerBountifulHarvest();
    if (command.type === 'civ.tradeCaravan') return this.triggerTradeCaravan();
    return false;
  }
}
