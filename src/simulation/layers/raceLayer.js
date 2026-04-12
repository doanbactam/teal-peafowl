export class RaceLayer {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
  }

  update() {}

  spawnHumans({ tileX, tileZ, faction = 0, count = 1, raceId, unitFactory, randomOffset = true, spread = 1 }) {
    let spawned = 0;

    for (let i = 0; i < count; i++) {
      const ox = randomOffset ? tileX + Math.floor(Math.random() * (spread * 2 + 1)) - spread : tileX;
      const oz = randomOffset ? tileZ + Math.floor(Math.random() * (spread * 2 + 1)) - spread : tileZ;

      if (!this.game.terrain.isWalkable(ox, oz)) {
        continue;
      }

      const creature = this.game.creatureManager.spawnHuman(
        ox,
        oz,
        faction,
        raceId || this.selectors.getFactionRaceId(faction),
      );

      if (!creature) {
        continue;
      }

      if (typeof unitFactory === 'function') {
        unitFactory(creature, spawned);
      }

      spawned++;
    }

    return spawned > 0;
  }

  spawnAnimals({ count = 1, tileX, tileZ, range = 0 }) {
    let spawned = 0;
    const halfSize = this.game.terrain.size / 2;

    for (let i = 0; i < count; i++) {
      const targetX = tileX ?? Math.round(halfSize + (Math.random() - 0.5) * range);
      const targetZ = tileZ ?? Math.round(halfSize + (Math.random() - 0.5) * range);

      if (!this.game.terrain.isWalkable(targetX, targetZ)) {
        continue;
      }

      const animal = this.game.creatureManager.spawnAnimal(targetX, targetZ);
      if (animal) {
        spawned++;
      }
    }

    return spawned > 0;
  }

  handleCommand(command) {
    if (command.type === 'race.spawnHumans') {
      return this.spawnHumans(command);
    }

    if (command.type === 'race.spawnAnimals') {
      return this.spawnAnimals(command);
    }

    return false;
  }
}
