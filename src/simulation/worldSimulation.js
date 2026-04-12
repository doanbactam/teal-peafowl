import { createWorldState, syncGameFromState, syncStateFromGame } from './state.js';
import { SimulationSelectors } from './selectors.js';
import { GodLayer } from './layers/godLayer.js';
import { WorldLayer } from './layers/worldLayer.js';
import { RaceLayer } from './layers/raceLayer.js';
import { CivilizationLayer } from './layers/civilizationLayer.js';
import { ConflictLayer } from './layers/conflictLayer.js';

export class WorldSimulation {
  constructor(game) {
    this.game = game;
    this.state = createWorldState(game);
    if (game.eventSystem) {
      this.state.story.eventHistory = game.eventSystem.eventHistory;
    }

    this.selectors = new SimulationSelectors(game, this.state);
    this.godLayer = new GodLayer(game, this.state, this.selectors);
    this.worldLayer = new WorldLayer(game, this.state, this.selectors);
    this.raceLayer = new RaceLayer(game, this.state, this.selectors);
    this.civilizationLayer = new CivilizationLayer(game, this.state, this.selectors);
    this.conflictLayer = new ConflictLayer(game, this.state, this.selectors);
  }

  syncStateFromGame() {
    syncStateFromGame(this.game, this.state);
  }

  syncGameFromState() {
    syncGameFromState(this.game, this.state);
  }

  select(name, payload = {}) {
    switch (name) {
      case 'factionGod':
        return this.selectors.getFactionGod(payload.faction);
      case 'factionRaceId':
        return this.selectors.getFactionRaceId(payload.faction);
      case 'factionDomainId':
        return this.selectors.getFactionDomainId(payload.faction);
      case 'factionPassiveEffects':
        return this.selectors.getFactionPassiveEffects(payload.faction);
      case 'factionPopulation':
        return this.selectors.getFactionPopulation(payload.faction);
      case 'playerHumans':
        return this.selectors.getPlayerHumans(payload.faction);
      case 'settlementMetrics':
        return this.selectors.getSettlementMetrics(payload.faction);
      case 'socialMetrics':
        return this.selectors.getSocialMetrics(payload.faction);
      case 'faithEconomy':
        return this.selectors.getFaithEconomy(payload.faction);
      case 'colonyDiagnostics':
        return this.selectors.getColonyDiagnostics(payload.faction);
      case 'storytellerState':
        return this.selectors.buildStorytellerState(payload.faction);
      case 'domainPowerDisposition':
        return this.selectors.getDomainPowerDisposition(payload.powerId, payload.domainId);
      case 'productionMetrics':
        return this.selectors.getProductionMetrics(payload.faction);
      case 'diplomacyState':
        return this.selectors.getDiplomacyState(payload.factionA, payload.factionB);
      case 'heroes':
        return this.selectors.getHeroes(payload.faction);
      case 'satisfaction':
        return this.selectors.getFactionSatisfaction(payload.faction);
      case 'ideology':
        return this.selectors.getFactionIdeology(payload.faction);
      case 'warState':
        return this.selectors.getWarState(payload.factionA, payload.factionB);
      default:
        return null;
    }
  }

  dispatch(command) {
    if (!command?.type) {
      return false;
    }

    this.state.pendingCommands.push(command);
    let lastResult = false;

    while (this.state.pendingCommands.length > 0) {
      const next = this.state.pendingCommands.shift();
      lastResult = this.processCommand(next);
    }

    return lastResult;
  }

  processCommand(command) {
    if (this.godLayer.handleCommand(command)) return true;
    if (this.worldLayer.handleCommand(command)) return true;
    if (this.raceLayer.handleCommand(command)) return true;
    if (this.civilizationLayer.handleCommand(command)) return true;
    if (this.conflictLayer.handleCommand(command)) return true;

    if (command.type === 'story.runEvent') {
      return this.runStoryEvent(command.eventId);
    }

    if (command.type === 'story.notify') {
      this.game.eventSystem?.showNotification(command.notification);
      return true;
    }

    return false;
  }

  runStoryEvent(eventId) {
    const center = Math.round(this.game.terrain.size / 2);

    switch (eventId) {
      case 'plague':
        return this.dispatch({ type: 'civ.plague' });
      case 'famine':
        return this.dispatch({ type: 'civ.famine' });
      case 'wildfire':
        return this.dispatch({ type: 'world.wildfire' });
      case 'bandit_raid':
        return this.dispatch({ type: 'conflict.banditRaid' });
      case 'earthquake_event':
        return this.dispatch({ type: 'world.earthquakeEvent' });
      case 'gold_rush':
        return this.dispatch({ type: 'civ.goldRush' });
      case 'bountiful_harvest':
        return this.dispatch({ type: 'civ.bountifulHarvest' });
      case 'wanderers':
        return this.dispatch({
          type: 'race.spawnHumans',
          count: 3,
          faction: 0,
          raceId: this.selectors.getFactionRaceId(0),
          tileX: center,
          tileZ: center,
          spread: 20,
        });
      case 'trade_caravan':
        return this.dispatch({ type: 'civ.tradeCaravan' });
      case 'animal_migration':
        return this.dispatch({ type: 'race.spawnAnimals', count: 5, range: 30 });
      case 'divine_favor':
        return this.dispatch({ type: 'civ.divineFavor' });
      case 'storm':
        return this.dispatch({ type: 'world.storm' });
      case 'meteor_shower':
        return this.dispatch({ type: 'world.meteorShower' });
      case 'mass_madness':
        return this.dispatch({ type: 'civ.massMadness' });
      case 'solar_eclipse':
        return this.dispatch({ type: 'civ.solarEclipse' });
      case 'refugee_crisis':
        return this.dispatch({
          type: 'race.spawnHumans',
          count: 5,
          faction: 0,
          raceId: this.selectors.getFactionRaceId(0),
          tileX: center,
          tileZ: center,
          spread: 20,
          unitFactory(creature) {
            creature.health = creature.maxHealth * 0.4;
            creature.hunger = 60;
            if (creature.addMoodModifier) {
              creature.addMoodModifier('Displaced', -12, 40);
            }
          },
        });
      case 'volcanic_eruption':
        return this.dispatch({ type: 'world.volcanicEruption' });
      default:
        return false;
    }
  }

  update(rawDt) {
    this.syncStateFromGame();

    const clampedDt = Math.min(rawDt, 0.1);
    const dt = this.game.paused ? 0 : clampedDt * this.game.gameSpeed;

    this.godLayer.update(dt);
    this.worldLayer.update(rawDt, dt);

    if (!this.game.paused) {
      this.raceLayer.update(dt);
      this.civilizationLayer.update(dt);
      this.conflictLayer.update(dt);
      this.game.eventSystem?.update(rawDt);
    }

    this.syncGameFromState();
  }
}
