const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

export class WorldLayer {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
  }

  syncWorldState() {
    this.state.clock.gameTime = this.game.gameTime;
    this.state.clock.day = this.game.day;
    this.state.world.season = this.game.season;
    this.state.world.seasonDuration = this.game.seasonDuration;
    this.state.world.seasonEffects = { ...this.game.seasonEffects };
  }

  update(rawDt, dt) {
    this.game.updateDayNight(this.game.paused ? 0 : rawDt);

    if (!this.game.paused) {
      this.updateSeason();
      this.game.terrain.updateFire(dt);
    }

    this.syncWorldState();
  }

  updateSeason() {
    const seasonIndex = Math.floor(this.game.day / this.game.seasonDuration) % 4;
    const newSeason = SEASON_ORDER[seasonIndex];

    if (newSeason !== this.game.season) {
      this.game.season = newSeason;

      switch (this.game.season) {
        case 'spring':
          this.game.seasonEffects = { farmMult: 1.3, moodMod: 5, freezeChance: 0, droughtChance: 0 };
          this.game.eventSystem?.showNotification({ icon: '🌸', type: 'success', message: '<b>Spring</b> arrives! Crops flourish, spirits lift.' });
          break;
        case 'summer':
          this.game.seasonEffects = { farmMult: 1.0, moodMod: 3, freezeChance: 0, droughtChance: 0.02 };
          this.game.eventSystem?.showNotification({ icon: '☀️', type: 'warning', message: '<b>Summer</b> heat sets in. Beware droughts.' });
          break;
        case 'autumn':
          this.game.seasonEffects = { farmMult: 0.8, moodMod: 0, freezeChance: 0, droughtChance: 0 };
          this.game.eventSystem?.showNotification({ icon: '🍂', type: 'warning', message: '<b>Autumn</b> — harvests dwindle. Prepare for winter.' });
          break;
        case 'winter':
          this.game.seasonEffects = { farmMult: 0.3, moodMod: -8, freezeChance: 0.01, droughtChance: 0 };
          this.game.eventSystem?.showNotification({ icon: '❄️', type: 'danger', message: '<b>Winter</b> has come. Food is scarce, cold bites deep.' });
          break;
      }

      for (const c of this.game.creatureManager.creatures) {
        if (c.alive && c.type === 'human' && c.faction === 0 && c.addMoodModifier) {
          const seasonNames = { spring: 'Spring Bloom', summer: 'Summer Heat', autumn: 'Autumn Chill', winter: 'Bitter Cold' };
          c.addMoodModifier(seasonNames[this.game.season], this.game.seasonEffects.moodMod, 9999);
        }
      }
    }

    if (this.game.season === 'winter' && this.game.seasonEffects.freezeChance > 0) {
      for (const c of this.game.creatureManager.creatures) {
        if (c.alive && c.type === 'human' && Math.random() < this.game.seasonEffects.freezeChance * 0.016) {
          c.health -= 0.5;
          if (c.health <= 0) {
            c.die();
          }
        }
      }
    }
  }

  triggerWildfire() {
    let attempts = 0;
    while (attempts < 50) {
      const x = Math.floor(Math.random() * this.game.terrain.size);
      const z = Math.floor(Math.random() * this.game.terrain.size);
      const tile = this.game.terrain.tiles.get(`${x},${z}`);
      if (tile && tile.hasTree && !tile.onFire) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            this.game.terrain.setFire(x + dx, z + dz);
          }
        }
        return true;
      }
      attempts++;
    }
    return false;
  }

  triggerEarthquakeEvent() {
    const wx = (Math.random() - 0.5) * this.game.terrain.size * 0.4;
    const wz = (Math.random() - 0.5) * this.game.terrain.size * 0.4;
    return this.game.godPowers.earthquake(wx, wz);
  }

  triggerStorm() {
    const halfSize = this.game.terrain.size / 2;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const wx = (Math.random() - 0.5) * this.game.terrain.size * 0.5;
        const wz = (Math.random() - 0.5) * this.game.terrain.size * 0.5;
        const tx = Math.round(wx + halfSize);
        const tz = Math.round(wz + halfSize);
        this.game.godPowers.lightningStrike(wx, wz, tx, tz);
      }, i * 800);
    }

    setTimeout(() => {
      const wx = (Math.random() - 0.5) * this.game.terrain.size * 0.3;
      const wz = (Math.random() - 0.5) * this.game.terrain.size * 0.3;
      this.game.godPowers.rain(wx, wz);
    }, 4000);

    return true;
  }

  triggerMeteorShower() {
    const halfSize = this.game.terrain.size / 2;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const wx = (Math.random() - 0.5) * this.game.terrain.size * 0.6;
        const wz = (Math.random() - 0.5) * this.game.terrain.size * 0.6;
        const tx = Math.round(wx + halfSize);
        const tz = Math.round(wz + halfSize);
        this.game.godPowers.meteorStrike(wx, wz, tx, tz);
      }, i * 1500);
    }

    return true;
  }

  triggerVolcanicEruption() {
    const halfSize = this.game.terrain.size / 2;
    let eruptX = halfSize;
    let eruptZ = halfSize;

    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * this.game.terrain.size);
      const z = Math.floor(Math.random() * this.game.terrain.size);
      const tile = this.game.terrain.tiles.get(`${x},${z}`);
      if (tile && tile.biome === 6) {
        eruptX = x;
        eruptZ = z;
        break;
      }
    }

    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        if (Math.sqrt(dx * dx + dz * dz) <= 4) {
          this.game.terrain.setFire(eruptX + dx, eruptZ + dz);
        }
      }
    }

    const wx = eruptX - halfSize;
    const wz = eruptZ - halfSize;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const ox = wx + (Math.random() - 0.5) * 8;
        const oz = wz + (Math.random() - 0.5) * 8;
        const tx = Math.round(ox + halfSize);
        const tz = Math.round(oz + halfSize);
        this.game.godPowers.meteorStrike(ox, oz, tx, tz);
      }, i * 1000);
    }

    this.game.godPowers.shakeCamera(0.6, 800);
    return true;
  }

  handleCommand(command) {
    if (command.type === 'world.wildfire') return this.triggerWildfire();
    if (command.type === 'world.earthquakeEvent') return this.triggerEarthquakeEvent();
    if (command.type === 'world.storm') return this.triggerStorm();
    if (command.type === 'world.meteorShower') return this.triggerMeteorShower();
    if (command.type === 'world.volcanicEruption') return this.triggerVolcanicEruption();
    return false;
  }
}
