/**
 * HeroSubsystem — owns hero emergence, abilities, and death consequences.
 *
 * Heroes emerge from merit: level 5+ unit with mood >70 winning a battle → 15% chance.
 * Profession-based passive abilities applied in an aura every 3 seconds.
 */
export class HeroSubsystem {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
    this.auraTimer = 0;
  }

  update(dt) {
    this.auraTimer += dt;

    // Apply hero auras every 3 seconds
    if (this.auraTimer >= 3) {
      this.auraTimer = 0;
      this.applyHeroAuras();
    }

    // Sync hero roster
    this.syncHeroRoster();
  }

  /**
   * Check if a creature qualifies for hero promotion after a battle victory.
   * Called externally when a unit kills an enemy.
   */
  checkHeroEmergence(creature) {
    if (!creature || !creature.alive || creature.type !== 'human') return false;
    if (creature.isHero) return false;
    if (creature.level < 5) return false;
    if (creature.mood < 70) return false;

    // Base 15% chance
    let chance = 0.15;

    // Trait bonuses
    if (creature.hasTrait('iron_will')) chance += 0.05;
    if (creature.hasTrait('bloodlust')) chance += 0.05;
    if (creature.hasTrait('tough')) chance += 0.03;

    // Barracks proximity bonus
    const nearBarracks = this.isNearBuilding(creature, 'barracks', 8);
    if (nearBarracks) chance += 0.10;

    if (Math.random() < chance) {
      this.promoteToHero(creature);
      return true;
    }
    return false;
  }

  /**
   * Promote a creature to hero status.
   */
  promoteToHero(creature) {
    creature.isHero = true;
    creature.heroAuraTimer = 0;

    // Name upgrade
    const cleanName = creature.name.replace(/^✨ /, '').replace(/ the Hero ✨$/, '');
    creature.name = `✨ ${cleanName} the Hero ✨`;

    // Stat boost (less extreme than the old random 3% spawn)
    creature.maxHealth = Math.ceil(creature.maxHealth * 2);
    creature.health = creature.maxHealth;
    creature.attack = Math.ceil(creature.attack * 1.8);
    creature.defense = Math.ceil(creature.defense * 1.5);
    creature.speed *= 1.2;

    // Add hero visual (aura mesh)
    this.addHeroVisuals(creature);

    // Mood boost to faction
    const citizens = this.selectors.getPlayerHumans(creature.faction);
    for (const c of citizens) {
      if (c !== creature && c.alive) {
        c.addMoodModifier('Hero Emerged!', 15, 30);
      }
    }

    // Notification
    this.game.eventSystem?.showNotification({
      type: 'success',
      icon: '⭐',
      message: `<b>${cleanName}</b> has risen as a <b>Hero</b>! (${this.getHeroAbilityName(creature.profession)})`,
    });
  }

  addHeroVisuals(creature) {
    if (!creature.mesh) return;
    const THREE = creature.mesh.parent?.constructor?.name === 'Scene'
      ? Object.getPrototypeOf(creature.mesh).constructor.__three
      : null;

    // Bail if we can't access THREE — the aura was already handled in creatures.js for existing heroes
    // New heroes promoted mid-game get visual updates via the mesh scale
    creature.mesh.scale.set(
      (creature.visualScale?.x || 1) * 1.2,
      (creature.visualScale?.y || 1) * 1.2,
      (creature.visualScale?.z || 1) * 1.2,
    );
  }

  getHeroAbilityName(profession) {
    const abilities = {
      Warrior: 'Rally — nearby units +20% ATK',
      Priest: 'Sanctuary — nearby units heal 2x, plague cure',
      Hunter: 'Tracker — faction hunt food +50%',
      Builder: 'Architect — nearby buildings +30% HP',
      Miner: 'Prospector — nearby mines +40% yield',
      Farmer: 'Bountiful — nearby farms +30% food',
      Villager: 'Inspiration — nearby units +10 mood',
    };
    return abilities[profession] || 'Inspiration';
  }

  /**
   * Apply hero passive abilities to nearby allies.
   */
  applyHeroAuras() {
    const creatures = this.game.creatureManager.creatures;

    for (const hero of creatures) {
      if (!hero.alive || !hero.isHero || hero.type !== 'human') continue;

      const auraRange = 6;
      for (const ally of creatures) {
        if (ally === hero || !ally.alive || ally.faction !== hero.faction || ally.type !== 'human') continue;
        const dist = Math.abs(ally.tileX - hero.tileX) + Math.abs(ally.tileZ - hero.tileZ);
        if (dist > auraRange) continue;

        switch (hero.profession) {
          case 'Warrior':
            ally.addMoodModifier('Hero Rally', 5, 8);
            break;
          case 'Priest':
            ally.addMoodModifier('Sanctuary', 5, 8);
            if (ally.plagued && Math.random() < 0.05) {
              ally.plagued = false;
              ally.addMoodModifier('Hero Cured', 15, 30);
            }
            break;
          case 'Hunter':
            // Passive — handled via getHuntYieldMultiplier check
            break;
          case 'Builder':
            // Passive — handled via building HP check
            break;
          default:
            ally.addMoodModifier('Heroic Presence', 8, 8);
            break;
        }
      }
    }
  }

  /**
   * Handle hero death consequences.
   */
  onHeroDeath(hero) {
    if (!hero.isHero) return;

    const citizens = this.selectors.getPlayerHumans(hero.faction);
    const heroCount = citizens.filter((c) => c.isHero && c.alive && c !== hero).length;

    // Faction-wide grief
    for (const c of citizens) {
      if (c !== hero && c.alive) {
        c.addMoodModifier('Hero Fallen', -20, 60);
      }
    }

    // If last hero — extra crisis
    if (heroCount === 0) {
      for (const c of citizens) {
        if (c !== hero && c.alive) {
          c.addMoodModifier('Last Hope Lost', -15, 90);
        }
      }
    }

    this.game.eventSystem?.showNotification({
      type: 'danger',
      icon: '💀',
      message: `<b>${hero.name}</b> has <b>fallen</b>! The people mourn their hero.`,
    });
  }

  /**
   * Sync the hero roster in state for HUD/selectors.
   */
  syncHeroRoster() {
    const heroes = [];
    for (const c of this.game.creatureManager.creatures) {
      if (c.alive && c.isHero && c.type === 'human') {
        heroes.push({
          creatureId: c.id,
          faction: c.faction,
          name: c.name,
          profession: c.profession,
          ability: this.getHeroAbilityName(c.profession),
          level: c.level,
          health: c.health,
          maxHealth: c.maxHealth,
          tileX: c.tileX,
          tileZ: c.tileZ,
        });
      }
    }
    this.state.heroes = heroes;
  }

  getHeroes(faction = null) {
    if (faction === null) return this.state.heroes;
    return this.state.heroes.filter((h) => h.faction === faction);
  }

  isNearBuilding(creature, buildingType, range) {
    for (const b of this.game.buildingManager.buildings.values()) {
      if (b.type === buildingType && b.faction === creature.faction) {
        const dist = Math.abs(b.x - creature.tileX) + Math.abs(b.z - creature.tileZ);
        if (dist <= range) return true;
      }
    }
    return false;
  }

  handleCommand(command) {
    if (command.type === 'hero.checkEmergence') {
      return this.checkHeroEmergence(command.creature);
    }
    if (command.type === 'hero.onDeath') {
      this.onHeroDeath(command.creature);
      return true;
    }
    return false;
  }
}
