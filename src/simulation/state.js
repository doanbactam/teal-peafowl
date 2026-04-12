export function createWorldState(game) {
  // Ensure new resource types exist
  if (game.resources) {
    if (game.resources.iron === undefined) game.resources.iron = 0;
    if (game.resources.goods === undefined) game.resources.goods = 0;
  }

  return {
    clock: {
      gameTime: game.gameTime,
      day: game.day,
      gameSpeed: game.gameSpeed,
      paused: game.paused,
    },
    world: {
      season: game.season,
      seasonDuration: game.seasonDuration,
      seasonEffects: { ...game.seasonEffects },
    },
    factions: {
      player: {
        raceId: game.playerRace,
        domainId: game.playerDomain,
        resources: game.resources,
        socialClimate: game.socialClimate,
        satisfaction: game.factionSatisfaction ?? 60,
        ideology: game.factionIdeology ?? { militarism: 0, piety: 0, prosperity: 0 },
      },
    },
    economy: {
      tradeRoutes: [],          // [{ factionA, factionB, goldPerTick }]
      productionHistory: [],    // rolling window for HUD
    },
    conflict: {
      relations: {},            // { factionId: { factionId: score } }
      alliances: [],            // [{ factionA, factionB }]
      warScores: {},            // { `${a}-${b}`: { a: score, b: score } }
      warWeariness: {},         // { factionId: ticksAtWar }
    },
    heroes: [],                 // [{ creatureId, faction, profession, ability }]
    story: {
      eventHistory: [],
    },
    pendingCommands: [],
  };
}

export function syncStateFromGame(game, state) {
  state.clock.gameTime = game.gameTime;
  state.clock.day = game.day;
  state.clock.gameSpeed = game.gameSpeed;
  state.clock.paused = game.paused;

  state.world.season = game.season;
  state.world.seasonDuration = game.seasonDuration;
  state.world.seasonEffects = { ...game.seasonEffects };

  // Ensure new resource types exist
  if (game.resources) {
    if (game.resources.iron === undefined) game.resources.iron = 0;
    if (game.resources.goods === undefined) game.resources.goods = 0;
  }

  state.factions.player.raceId = game.playerRace;
  state.factions.player.domainId = game.playerDomain;
  state.factions.player.resources = game.resources;
  state.factions.player.socialClimate = game.socialClimate;
  state.factions.player.satisfaction = game.factionSatisfaction ?? state.factions.player.satisfaction;
  state.factions.player.ideology = game.factionIdeology ?? state.factions.player.ideology;

  return state;
}

export function syncGameFromState(game, state) {
  game.gameTime = state.clock.gameTime;
  game.day = state.clock.day;
  game.season = state.world.season;
  game.seasonDuration = state.world.seasonDuration;
  game.seasonEffects = { ...state.world.seasonEffects };
  game.playerRace = state.factions.player.raceId;
  game.playerDomain = state.factions.player.domainId;
  game.socialClimate = state.factions.player.socialClimate;
  game.factionSatisfaction = state.factions.player.satisfaction;
  game.factionIdeology = state.factions.player.ideology;

  return game;
}
