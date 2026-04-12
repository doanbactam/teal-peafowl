import { EconomySubsystem } from '../subsystems/civilization/economySubsystem.js';
import { MoodStabilitySubsystem } from '../subsystems/civilization/moodStabilitySubsystem.js';
import { FaithEconomySubsystem } from '../subsystems/civilization/faithEconomySubsystem.js';
import { ProductionSubsystem } from '../subsystems/civilization/productionSubsystem.js';
import { FactionPoliticsSubsystem } from '../subsystems/civilization/factionPoliticsSubsystem.js';
import { HeroSubsystem } from '../subsystems/civilization/heroSubsystem.js';

export class CivilizationLayer {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;

    this.economySubsystem = new EconomySubsystem(game, state, selectors);
    this.moodStabilitySubsystem = new MoodStabilitySubsystem(game, state, selectors);
    this.faithEconomySubsystem = new FaithEconomySubsystem(game, state, selectors);
    this.productionSubsystem = new ProductionSubsystem(game, state, selectors);
    this.factionPoliticsSubsystem = new FactionPoliticsSubsystem(game, state, selectors);
    this.heroSubsystem = new HeroSubsystem(game, state, selectors);
    this.subsystems = [
      this.economySubsystem,
      this.moodStabilitySubsystem,
      this.faithEconomySubsystem,
      this.productionSubsystem,
      this.factionPoliticsSubsystem,
      this.heroSubsystem,
    ];
  }

  update(dt) {
    this.economySubsystem.update(dt);
    this.moodStabilitySubsystem.update(dt);
    this.productionSubsystem.update(dt);
    this.factionPoliticsSubsystem.update(dt);
    this.heroSubsystem.update(dt);
    return this.faithEconomySubsystem.update(dt);
  }

  updateSocialClimate(dt) {
    return this.moodStabilitySubsystem.updateSocialClimate(dt);
  }

  handleCommand(command) {
    for (const subsystem of this.subsystems) {
      if (subsystem.handleCommand(command)) {
        return true;
      }
    }

    return false;
  }
}
