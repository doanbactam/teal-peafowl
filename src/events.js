// Random events system for dynamic gameplay
// Inspired by WorldBox + RimWorld storyteller system

const EVENTS = [
  // ===== DANGER EVENTS =====
  {
    id: 'plague',
    name: 'Plague Outbreak',
    icon: '☠️',
    type: 'danger',
    message: 'A deadly <b>plague</b> sweeps through your settlements!',
    weight: 3,
    minPop: 6,
    execute(game) {
      let affected = 0;
      for (const c of game.creatureManager.creatures) {
        if (c.alive && c.type === 'human' && Math.random() < 0.35) {
          c.plagued = true;
          c.plagueTimer = 0;
          affected++;
        }
      }
      return affected > 0;
    }
  },
  {
    id: 'famine',
    name: 'Famine',
    icon: '🥀',
    type: 'danger',
    message: 'Crops have <b>withered</b>! Food supplies dwindle.',
    weight: 4,
    minPop: 3,
    execute(game) {
      game.resources.food = Math.max(0, game.resources.food - 30);
      for (const c of game.creatureManager.creatures) {
        if (c.alive && c.type === 'human') {
          c.hunger += 30;
          if (c.addMoodModifier) c.addMoodModifier('Famine', -10, 30);
        }
      }
      return true;
    }
  },
  {
    id: 'wildfire',
    name: 'Wildfire',
    icon: '🔥',
    type: 'danger',
    message: 'A <b>wildfire</b> erupts in the forest!',
    weight: 3,
    minPop: 0,
    execute(game) {
      let attempts = 0;
      while (attempts < 50) {
        const x = Math.floor(Math.random() * game.terrain.size);
        const z = Math.floor(Math.random() * game.terrain.size);
        const tile = game.terrain.tiles.get(`${x},${z}`);
        if (tile && tile.hasTree && !tile.onFire) {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              game.terrain.setFire(x + dx, z + dz);
            }
          }
          return true;
        }
        attempts++;
      }
      return false;
    }
  },
  {
    id: 'bandit_raid',
    name: 'Bandit Raid',
    icon: '🥷',
    type: 'danger',
    message: 'A group of <b>bandits</b> raids your settlement!',
    weight: 3,
    minPop: 8,
    execute(game) {
      const halfSize = game.terrain.size / 2;
      let spawned = 0;
      const angle = Math.random() * Math.PI * 2;
      const dist = game.terrain.size * 0.4;
      const wx = Math.cos(angle) * dist;
      const wz = Math.sin(angle) * dist;
      
      const banditCount = 3 + Math.floor(game.day / 10); // Scale with game progress
      for (let i = 0; i < Math.min(banditCount, 8); i++) {
        const tx = Math.floor(wx + halfSize + (Math.random() - 0.5) * 4);
        const tz = Math.floor(wz + halfSize + (Math.random() - 0.5) * 4);
        if (game.terrain.isWalkable(tx, tz)) {
          const bandit = game.creatureManager.spawnHuman(tx, tz, 99);
          if (bandit) {
            bandit.name = 'Bandit';
            bandit.attack += 5;
            bandit.speed *= 1.2;
            spawned++;
          }
        }
      }
      return spawned > 0;
    }
  },
  {
    id: 'earthquake_event',
    name: 'Earthquake',
    icon: '💥',
    type: 'danger',
    message: 'The ground <b>shakes</b> violently!',
    weight: 2,
    minPop: 5,
    execute(game) {
      const halfSize = game.terrain.size / 2;
      const wx = (Math.random() - 0.5) * game.terrain.size * 0.4;
      const wz = (Math.random() - 0.5) * game.terrain.size * 0.4;
      game.godPowers.earthquake(wx, wz);
      return true;
    }
  },

  // ===== SUCCESS EVENTS =====
  {
    id: 'gold_rush',
    name: 'Gold Rush',
    icon: '⛏️',
    type: 'success',
    message: '<b>Gold deposits</b> discovered! +50 gold.',
    weight: 3,
    minPop: 2,
    execute(game) {
      game.resources.gold += 50;
      return true;
    }
  },
  {
    id: 'bountiful_harvest',
    name: 'Bountiful Harvest',
    icon: '🌾',
    type: 'success',
    message: 'An exceptional <b>harvest</b>! +40 food.',
    weight: 4,
    minPop: 1,
    execute(game) {
      game.resources.food += 40;
      for (const c of game.creatureManager.creatures) {
        if (c.alive && c.type === 'human' && c.addMoodModifier) {
          c.addMoodModifier('Good harvest', 5, 20);
        }
      }
      return true;
    }
  },
  {
    id: 'wanderers',
    name: 'Wanderers Arrive',
    icon: '🚶',
    type: 'success',
    message: '<b>Wanderers</b> join your settlement! +3 people.',
    weight: 3,
    minPop: 4,
    execute(game) {
      let spawned = 0;
      const halfSize = game.terrain.size / 2;
      for (let i = 0; i < 3; i++) {
        const tx = Math.round(halfSize + (Math.random() - 0.5) * 20);
        const tz = Math.round(halfSize + (Math.random() - 0.5) * 20);
        if (game.terrain.isWalkable(tx, tz)) {
          game.creatureManager.spawnHuman(tx, tz);
          spawned++;
        }
      }
      return spawned > 0;
    }
  },
  {
    id: 'trade_caravan',
    name: 'Trade Caravan',
    icon: '🐪',
    type: 'success',
    message: 'A <b>trade caravan</b> arrives! Exchanged goods.',
    weight: 4,
    minPop: 5,
    execute(game) {
      game.resources.wood += 15;
      game.resources.stone += 15;
      game.resources.gold += 5;
      game.resources.food += 10;
      return true;
    }
  },
  {
    id: 'animal_migration',
    name: 'Animal Migration',
    icon: '🦌',
    type: 'success',
    message: 'A herd of <b>animals</b> migrates through your land!',
    weight: 4,
    minPop: 0,
    execute(game) {
      const halfSize = game.terrain.size / 2;
      let spawned = 0;
      for (let i = 0; i < 5; i++) {
        const tx = Math.round(halfSize + (Math.random() - 0.5) * 30);
        const tz = Math.round(halfSize + (Math.random() - 0.5) * 30);
        if (game.terrain.isWalkable(tx, tz)) {
          game.creatureManager.spawnAnimal(tx, tz);
          spawned++;
        }
      }
      return spawned > 0;
    }
  },
  {
    id: 'divine_favor',
    name: 'Divine Favor',
    icon: '🙏',
    type: 'success',
    message: 'The people pray with fervor! <b>+30 Faith</b>.',
    weight: 3,
    minPop: 3,
    execute(game) {
      game.resources.faith += 30;
      for (const c of game.creatureManager.creatures) {
        if (c.alive && c.type === 'human' && c.addMoodModifier) {
          c.addMoodModifier('Divine Favor', 8, 30);
        }
      }
      return true;
    }
  },

  // ===== WARNING EVENTS =====
  {
    id: 'storm',
    name: 'Great Storm',
    icon: '⛈️',
    type: 'warning',
    message: 'A <b>thunderstorm</b> approaches!',
    weight: 3,
    minPop: 0,
    execute(game) {
      const halfSize = game.terrain.size / 2;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          const wx = (Math.random() - 0.5) * game.terrain.size * 0.5;
          const wz = (Math.random() - 0.5) * game.terrain.size * 0.5;
          const tx = Math.round(wx + halfSize);
          const tz = Math.round(wz + halfSize);
          game.godPowers.lightningStrike(wx, wz, tx, tz);
        }, i * 800);
      }
      // Rain after
      setTimeout(() => {
        const wx = (Math.random() - 0.5) * game.terrain.size * 0.3;
        const wz = (Math.random() - 0.5) * game.terrain.size * 0.3;
        game.godPowers.rain(wx, wz);
      }, 4000);
      return true;
    }
  },
  {
    id: 'meteor_shower',
    name: 'Meteor Shower',
    icon: '☄️',
    type: 'warning',
    message: 'A <b>meteor shower</b> lights up the sky!',
    weight: 2,
    minPop: 0,
    execute(game) {
      const halfSize = game.terrain.size / 2;
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const wx = (Math.random() - 0.5) * game.terrain.size * 0.6;
          const wz = (Math.random() - 0.5) * game.terrain.size * 0.6;
          const tx = Math.round(wx + halfSize);
          const tz = Math.round(wz + halfSize);
          game.godPowers.meteorStrike(wx, wz, tx, tz);
        }, i * 1500);
      }
      return true;
    }
  },
  // ===== RimWorld-inspired events =====
  {
    id: 'mass_madness',
    name: 'Mass Psychosis',
    icon: '🤪',
    type: 'danger',
    message: 'Strange <b>whispers</b> drive your people mad!',
    weight: 2,
    minPop: 10,
    execute(game) {
      let affected = 0;
      for (const c of game.creatureManager.creatures) {
        if (c.alive && c.type === 'human' && Math.random() < 0.25) {
          c.madness = true;
          c.madnessTimer = 0;
          if (c.bodyMesh) c.bodyMesh.material.color.setHex(0x880000);
          affected++;
        }
      }
      return affected > 0;
    }
  },
  {
    id: 'solar_eclipse',
    name: 'Solar Eclipse',
    icon: '🌑',
    type: 'warning',
    message: 'A <b>solar eclipse</b> darkens the sky! Mood drops.',
    weight: 2,
    minPop: 4,
    execute(game) {
      for (const c of game.creatureManager.creatures) {
        if (c.alive && c.type === 'human' && c.addMoodModifier) {
          c.addMoodModifier('Solar Eclipse', -8, 40);
        }
      }
      // Temporarily reduce light
      if (game.sunLight) {
        const origIntensity = game.sunLight.intensity;
        game.sunLight.intensity = 0.1;
        setTimeout(() => {
          game.sunLight.intensity = origIntensity;
        }, 15000);
      }
      return true;
    }
  },
  {
    id: 'refugee_crisis',
    name: 'Refugees',
    icon: '🏃',
    type: 'warning',
    message: '<b>Refugees</b> seek shelter! +5 people but they\'re hungry and injured.',
    weight: 3,
    minPop: 6,
    execute(game) {
      let spawned = 0;
      const halfSize = game.terrain.size / 2;
      for (let i = 0; i < 5; i++) {
        const tx = Math.round(halfSize + (Math.random() - 0.5) * 20);
        const tz = Math.round(halfSize + (Math.random() - 0.5) * 20);
        if (game.terrain.isWalkable(tx, tz)) {
          const refugee = game.creatureManager.spawnHuman(tx, tz);
          if (refugee) {
            refugee.health = refugee.maxHealth * 0.4;
            refugee.hunger = 60;
            if (refugee.addMoodModifier) refugee.addMoodModifier('Displaced', -12, 40);
            spawned++;
          }
        }
      }
      return spawned > 0;
    }
  },
  {
    id: 'volcanic_eruption',
    name: 'Volcanic Eruption',
    icon: '🌋',
    type: 'danger',
    message: 'A <b>volcano</b> erupts! Lava and fire everywhere!',
    weight: 1,
    minPop: 8,
    execute(game) {
      const halfSize = game.terrain.size / 2;
      // Find a mountain tile for eruption
      let eruptX = halfSize, eruptZ = halfSize;
      for (let i = 0; i < 100; i++) {
        const x = Math.floor(Math.random() * game.terrain.size);
        const z = Math.floor(Math.random() * game.terrain.size);
        const tile = game.terrain.tiles.get(`${x},${z}`);
        if (tile && tile.biome === 6) { // Mountain
          eruptX = x;
          eruptZ = z;
          break;
        }
      }

      // Set fires in a wide radius
      for (let dx = -4; dx <= 4; dx++) {
        for (let dz = -4; dz <= 4; dz++) {
          if (Math.sqrt(dx*dx + dz*dz) <= 4) {
            game.terrain.setFire(eruptX + dx, eruptZ + dz);
          }
        }
      }

      // Meteor strikes near eruption  
      const wx = eruptX - halfSize;
      const wz = eruptZ - halfSize;
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const ox = wx + (Math.random() - 0.5) * 8;
          const oz = wz + (Math.random() - 0.5) * 8;
          const tx = Math.round(ox + halfSize);
          const tz = Math.round(oz + halfSize);
          game.godPowers.meteorStrike(ox, oz, tx, tz);
        }, i * 1000);
      }

      game.godPowers.shakeCamera(0.6, 800);
      return true;
    }
  },
];

export class EventSystem {
  constructor(game) {
    this.game = game;
    this.timer = 0;
    this.eventInterval = 45; // seconds between events
    this.lastEventDay = 0;
    this.eventHistory = [];
    this.notificationContainer = null;

    this.createNotificationContainer();
  }

  createNotificationContainer() {
    this.notificationContainer = document.getElementById('event-notifications');
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement('div');
      this.notificationContainer.id = 'event-notifications';
      document.body.appendChild(this.notificationContainer);
    }
  }

  showNotification(event) {
    const notif = document.createElement('div');
    notif.className = `event-notification event-${event.type}`;
    notif.innerHTML = `
      <span class="event-icon">${event.icon}</span>
      <span class="event-text">${event.message}</span>
    `;
    this.notificationContainer.appendChild(notif);

    // Remove after animation
    setTimeout(() => {
      if (notif.parentNode) notif.remove();
    }, 4500);
  }

  update(dt) {
    this.timer += dt * this.game.gameSpeed;

    if (this.timer >= this.eventInterval && this.game.day > this.lastEventDay) {
      this.timer = 0;
      this.lastEventDay = this.game.day;

      const pop = this.game.creatureManager.getPopulationCount();

      // Filter eligible events
      const eligible = EVENTS.filter(e => pop >= e.minPop);
      if (eligible.length === 0) return;

      // RimWorld-inspired storyteller: balance events based on prosperity
      // If colony is doing well → more danger events, if struggling → more success events
      const isProsperous = pop > 15 && this.game.resources.food > 50 && this.game.resources.gold > 20;
      const isStruggling = pop < 5 || this.game.resources.food < 10;

      let weightedEvents = eligible.map(e => {
        let weight = e.weight;
        if (isProsperous && e.type === 'danger') weight *= 1.5;
        if (isStruggling && e.type === 'success') weight *= 2;
        if (isStruggling && e.type === 'danger') weight *= 0.5;
        return { event: e, weight };
      });

      // Weighted random selection
      const totalWeight = weightedEvents.reduce((sum, e) => sum + e.weight, 0);
      let roll = Math.random() * totalWeight;
      let selected = weightedEvents[0].event;

      for (const we of weightedEvents) {
        roll -= we.weight;
        if (roll <= 0) {
          selected = we.event;
          break;
        }
      }

      // Execute event
      const success = selected.execute(this.game);
      if (success) {
        this.showNotification(selected);
        this.eventHistory.push({
          event: selected.id,
          day: this.game.day,
          time: this.game.gameTime
        });
      }
    }
  }
}
