import { adjustResources, applyMoodToFaction } from './sharedCivilizationEffects.js';

export class MoodStabilitySubsystem {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
  }

  update(dt) {
    return this.updateSocialClimate(dt);
  }

  updateSocialClimate(dt) {
    const citizens = this.selectors.getPlayerHumans(0);
    const pop = citizens.length;
    const socialClimate = this.state.factions.player.socialClimate;

    if (pop === 0) {
      socialClimate.trust = Math.max(0, socialClimate.trust - dt * 2);
      socialClimate.fear = Math.max(0, socialClimate.fear - dt * 3);
      socialClimate.strain = Math.max(0, socialClimate.strain - dt * 4);
      return socialClimate;
    }

    const socialMetrics = this.selectors.getSocialMetrics(0);
    const avgMoodBias = (socialMetrics.avgMood - 55) / 45;
    const stabilityRelief = socialMetrics.breaking === 0 && socialMetrics.sick === 0 ? 1 : 0;

    socialClimate.strain = Math.max(0, socialClimate.strain - dt * (2.4 + stabilityRelief));
    socialClimate.fear = Math.max(0, socialClimate.fear - dt * (1.2 + Math.max(0, avgMoodBias)));
    socialClimate.trust = Math.max(-40, Math.min(60, socialClimate.trust + dt * avgMoodBias * 0.7));

    return socialClimate;
  }

  triggerPlague() {
    let affected = 0;
    for (const creature of this.game.creatureManager.creatures) {
      if (creature.alive && creature.type === 'human' && creature.faction === 0 && Math.random() < 0.35) {
        creature.plagued = true;
        creature.plagueTimer = 0;
        affected++;
      }
    }
    return affected > 0;
  }

  triggerFamine() {
    adjustResources(this.game.resources, { food: -30 });

    for (const creature of this.game.creatureManager.creatures) {
      if (creature.alive && creature.type === 'human' && creature.faction === 0) {
        creature.hunger += 30;
        if (creature.addMoodModifier) {
          creature.addMoodModifier('Famine', -10, 30);
        }
      }
    }

    return true;
  }

  triggerMassMadness() {
    let affected = 0;
    for (const creature of this.game.creatureManager.creatures) {
      if (creature.alive && creature.type === 'human' && creature.faction === 0 && Math.random() < 0.25) {
        creature.madness = true;
        creature.madnessTimer = 0;
        if (creature.bodyMesh) {
          creature.bodyMesh.material.color.setHex(0x880000);
        }
        affected++;
      }
    }
    return affected > 0;
  }

  triggerSolarEclipse() {
    const success = applyMoodToFaction(this.game.creatureManager.creatures, {
      name: 'Solar Eclipse',
      amount: -8,
      duration: 40,
    });

    if (this.game.sunLight) {
      const origIntensity = this.game.sunLight.intensity;
      this.game.sunLight.intensity = 0.1;
      setTimeout(() => {
        this.game.sunLight.intensity = origIntensity;
      }, 15000);
    }

    return success;
  }

  handleCommand(command) {
    if (command.type === 'civ.plague') return this.triggerPlague();
    if (command.type === 'civ.famine') return this.triggerFamine();
    if (command.type === 'civ.massMadness') return this.triggerMassMadness();
    if (command.type === 'civ.solarEclipse') return this.triggerSolarEclipse();
    return false;
  }
}
