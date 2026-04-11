import * as THREE from 'three';
import { BIOME } from './terrain.js';
import { getRace, RACE_IDS } from './races.js';

// Faction colors (richer palette)
const FACTION_COLORS = [
  0x42a5f5, // Blue
  0xef5350, // Red
  0x66bb6a, // Green
  0xffa726, // Orange
  0xab47bc, // Purple
];

const FACTION_NAMES = ['Azure', 'Crimson', 'Emerald', 'Amber', 'Violet'];

const ANIMAL_TYPES = [
  { name: 'Cow', color: 0xf5f5dc, scale: 0.35, food: 5, passive: true },
  { name: 'Chicken', color: 0xffd54f, scale: 0.2, food: 2, passive: true },
  { name: 'Wolf', color: 0x757575, scale: 0.3, food: 2, passive: false },
  { name: 'Rabbit', color: 0xd7ccc8, scale: 0.18, food: 1, passive: true },
  { name: 'Deer', color: 0xa1887f, scale: 0.33, food: 4, passive: true },
  { name: 'Bear', color: 0x5D4037, scale: 0.4, food: 6, passive: false },
  { name: 'Boar', color: 0x6d4c41, scale: 0.28, food: 3, passive: false },
  { name: 'Fox', color: 0xe65100, scale: 0.24, food: 1, passive: false },
];

const PROFESSIONS = ['Villager', 'Builder', 'Warrior', 'Farmer', 'Hunter', 'Miner', 'Priest'];

const HUMAN_NAMES = [
  'Aelin', 'Brom', 'Cira', 'Dax', 'Elara', 'Finn', 'Gwen', 'Holt',
  'Iris', 'Joss', 'Kai', 'Luna', 'Mira', 'Nyx', 'Orin', 'Pip',
  'Quinn', 'Rex', 'Sage', 'Tara', 'Uri', 'Vera', 'Wren', 'Xena',
  'Yara', 'Zane', 'Ada', 'Beck', 'Cleo', 'Dane', 'Eva', 'Flint',
  'Nebula', 'Orion', 'Nova', 'Cosmo', 'Stella', 'Lyra', 'Atlas', 'Vega',
];

// ========== RIMWORLD-INSPIRED TRAITS ==========
const TRAITS = [
  // Positive
  { id: 'tough', name: 'Tough', icon: '🛡️', desc: 'Takes 30% less damage', effects: { damageMult: 0.7 }, mood: 0, weight: 4 },
  { id: 'industrious', name: 'Industrious', icon: '⚒️', desc: 'Works 30% faster', effects: { workSpeed: 1.3 }, mood: 5, weight: 3 },
  { id: 'fast_learner', name: 'Fast Learner', icon: '📖', desc: 'Gains 50% more EXP', effects: { expMult: 1.5 }, mood: 0, weight: 3 },
  { id: 'sanguine', name: 'Sanguine', icon: '😊', desc: 'Always cheerful (+12 mood)', effects: {}, mood: 12, weight: 3 },
  { id: 'iron_will', name: 'Iron Will', icon: '🧠', desc: 'Resists mental breaks', effects: { mentalBreakResist: 0.5 }, mood: 0, weight: 2 },
  { id: 'jogger', name: 'Jogger', icon: '🏃', desc: 'Moves 25% faster', effects: { speedMult: 1.25 }, mood: 0, weight: 3 },
  { id: 'nimble', name: 'Nimble', icon: '💨', desc: '20% dodge chance', effects: { dodgeChance: 0.2 }, mood: 0, weight: 2 },
  { id: 'kind', name: 'Kind', icon: '💛', desc: 'Boosts nearby mood', effects: { auraRange: 3, auraMood: 3 }, mood: 3, weight: 3 },
  // Negative
  { id: 'depressive', name: 'Depressive', icon: '😢', desc: 'Always sad (-10 mood)', effects: {}, mood: -10, weight: 3 },
  { id: 'pyromaniac', name: 'Pyromaniac', icon: '🔥', desc: 'May start fires during break', effects: { pyroChance: 0.15 }, mood: 0, weight: 2 },
  { id: 'slowpoke', name: 'Slowpoke', icon: '🐌', desc: 'Moves 20% slower', effects: { speedMult: 0.8 }, mood: 0, weight: 3 },
  { id: 'glutton', name: 'Glutton', icon: '🍕', desc: 'Eats 50% more food', effects: { hungerRate: 1.5 }, mood: 0, weight: 3 },
  { id: 'coward', name: 'Coward', icon: '😰', desc: 'Flees from combat early', effects: { fleeThreshold: 0.6 }, mood: -3, weight: 3 },
  // Neutral/Special
  { id: 'ascetic', name: 'Ascetic', icon: '🧘', desc: 'Low needs, content easily', effects: { hungerRate: 0.6, restRate: 0.7 }, mood: 5, weight: 2 },
  { id: 'night_owl', name: 'Night Owl', icon: '🦉', desc: 'Prefers working at night', effects: { nightBonus: true }, mood: 0, weight: 3 },
  { id: 'bloodlust', name: 'Bloodlust', icon: '💀', desc: 'Gains mood from killing', effects: { killMoodBoost: 10 }, mood: -2, weight: 2 },
];

const STATES = {
  IDLE: 'idle',
  MOVING: 'moving',
  GATHERING: 'gathering',
  BUILDING: 'building',
  FIGHTING: 'fighting',
  FLEEING: 'fleeing',
  HUNTING: 'hunting',
  FARMING: 'farming',
  RESTING: 'resting',
  BUILDING_IDLE: 'building_idle',
  TRAINING: 'training',
  WORSHIPING: 'worshiping',
  SLEEPING: 'sleeping',
  MENTAL_BREAK: 'mental_break',
};

// Mental break types (RimWorld inspired)
const MENTAL_BREAKS = [
  { id: 'wander', name: 'Daze', icon: '💫', desc: 'Wanders aimlessly', duration: 8 },
  { id: 'berserk', name: 'Berserk', icon: '😡', desc: 'Attacks everyone nearby', duration: 6 },
  { id: 'binge_eat', name: 'Food Binge', icon: '🍖', desc: 'Eats all available food', duration: 5 },
  { id: 'fire', name: 'Fire Starting', icon: '🔥', desc: 'Sets things on fire', duration: 4 },
  { id: 'hide', name: 'Hide in Room', icon: '🏠', desc: 'Hides and refuses to work', duration: 10 },
];

let creatureId = 0;

export class Creature {
  constructor(scene, terrain, x, z, type = 'human', faction = 0, specificAnimalData = null, raceId = null) {
    this.id = creatureId++;
    this.scene = scene;
    this.terrain = terrain;
    this.type = type; // 'human' or 'animal'
    this.faction = faction;
    this.alive = true;
    this.state = STATES.IDLE;

    // Name and Profession for humans
    if (this.type === 'human') {
      this.name = HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
      this.profession = PROFESSIONS[Math.floor(Math.random() * PROFESSIONS.length)];
      // RimWorld-style traits (1-3 random traits)
      this.traits = this.generateTraits();
    } else {
      this.name = '';
      this.profession = '';
      this.traits = [];
    }

    // Stats
    this.health = type === 'human' ? 100 : 60;
    this.maxHealth = this.health;
    this.hunger = 0;
    this.speed = type === 'human' ? 1.8 : 1.2;
    this.attack = type === 'human' ? 12 : 8;
    this.defense = type === 'human' ? 5 : 2;
    this.experience = 0;
    this.level = 1;

    // Mood system (RimWorld inspired) - only for humans
    this.mood = 70; // 0-100 scale
    this.moodModifiers = []; // { name, value, duration, elapsed }
    this.mentalBreak = null; // { type, timer, duration }
    this.inspired = false;
    this.inspirationTimer = 0;

    // Rest/Sleep needs
    this.restLevel = 100; // 0-100
    this.comfort = 50;

    // Debuffs
    this.plagued = false;
    this.plagueTimer = 0;
    this.cursed = false;
    this.curseTimer = 0;
    this.madness = false;
    this.madnessTimer = 0;

    // Apply Profession Buffs
    if (this.type === 'human') {
      if (this.profession === 'Warrior') {
        this.maxHealth += 30;
        this.health = this.maxHealth;
        this.attack += 8;
        this.defense += 3;
      } else if (this.profession === 'Builder') {
        this.speed *= 1.15;
      } else if (this.profession === 'Farmer') {
        this.speed *= 1.1;
      } else if (this.profession === 'Hunter') {
        this.attack += 5;
        this.speed *= 1.15;
      } else if (this.profession === 'Miner') {
        this.maxHealth += 15;
        this.health = this.maxHealth;
        this.defense += 2;
      } else if (this.profession === 'Priest') {
        this.maxHealth += 10;
        this.health = this.maxHealth;
      }
      // Apply trait stat modifiers
      this.applyTraitEffects();
    }

    // Apply race modifiers (after profession and trait effects)
    if (this.type === 'human') {
      this.raceId = raceId || RACE_IDS.HUMAN;
      const race = getRace(this.raceId);
      // Override base stats with race stats (keep profession bonuses)
      const statDiff = {
        health: race.baseStats.health - 100,
        attack: race.baseStats.attack - 12,
        defense: race.baseStats.defense - 5,
        speed: race.baseStats.speed / 1.8,
      };
      this.maxHealth += statDiff.health;
      this.health = this.maxHealth;
      this.attack += statDiff.attack;
      this.defense += statDiff.defense;
      this.speed *= statDiff.speed;
      this.raceName = race.name;
    } else {
      this.raceId = null;
      this.raceName = '';
    }

    // Position
    this.tileX = x;
    this.tileZ = z;
    this.targetTileX = x;
    this.targetTileZ = z;
    this.moveProgress = 0;

    // AI
    this.stateTimer = 0;
    this.actionTimer = 0;
    this.target = null;
    this.combatTarget = null;
    this.restTimer = 0;

    // Population growth
    this.age = 20 + Math.random() * 30;
    this.reproductionTimer = 30 + Math.random() * 60;

    // Animal subtype
    this.animalData = type === 'animal'
      ? (specificAnimalData || ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)])
      : null;

    // Create mesh
    this.createMesh();

    // Place on terrain
    const worldPos = terrain.getWorldPos(x, z);
    this.mesh.position.copy(worldPos);
    this.mesh.position.y += 0.15;
  }

  generateTraits() {
    const traitCount = 1 + Math.floor(Math.random() * 2.5); // 1-3 traits
    const selected = [];
    const available = [...TRAITS];

    for (let i = 0; i < traitCount && available.length > 0; i++) {
      // Weighted random selection
      const totalWeight = available.reduce((s, t) => s + t.weight, 0);
      let roll = Math.random() * totalWeight;
      let picked = available[0];
      let pickedIdx = 0;

      for (let j = 0; j < available.length; j++) {
        roll -= available[j].weight;
        if (roll <= 0) {
          picked = available[j];
          pickedIdx = j;
          break;
        }
      }

      // Don't allow contradicting traits
      const hasFast = selected.some(t => t.id === 'jogger');
      const hasSlow = selected.some(t => t.id === 'slowpoke');
      if ((picked.id === 'jogger' && hasSlow) || (picked.id === 'slowpoke' && hasFast)) {
        available.splice(pickedIdx, 1);
        i--;
        continue;
      }

      selected.push(picked);
      available.splice(pickedIdx, 1);
    }

    return selected;
  }

  applyTraitEffects() {
    for (const trait of this.traits) {
      if (trait.effects.speedMult) {
        this.speed *= trait.effects.speedMult;
      }
      if (trait.effects.damageMult) {
        this._damageMult = (this._damageMult || 1) * trait.effects.damageMult;
      }
    }
  }

  hasTrait(traitId) {
    return this.traits.some(t => t.id === traitId);
  }

  getTraitEffect(effectKey) {
    for (const trait of this.traits) {
      if (trait.effects[effectKey] !== undefined) return trait.effects[effectKey];
    }
    return null;
  }

  // ========== MOOD SYSTEM ==========
  addMoodModifier(name, value, duration) {
    // Don't duplicate modifiers
    const existing = this.moodModifiers.find(m => m.name === name);
    if (existing) {
      existing.value = value;
      existing.elapsed = 0;
      existing.duration = duration;
      return;
    }
    this.moodModifiers.push({ name, value, duration, elapsed: 0 });
  }

  updateMood(dt) {
    if (this.type !== 'human') return;

    // Base mood from traits
    let baseMood = 50;
    for (const trait of this.traits) {
      baseMood += trait.mood;
    }

    // Mood modifiers from needs
    if (this.hunger > 70) {
      this.addMoodModifier('Starving', -15, 0);
    } else if (this.hunger > 45) {
      this.addMoodModifier('Hungry', -8, 0);
    } else if (this.hunger < 15) {
      this.addMoodModifier('Well Fed', 5, 0);
    } else {
      this.moodModifiers = this.moodModifiers.filter(m => m.name !== 'Starving' && m.name !== 'Hungry' && m.name !== 'Well Fed');
    }

    if (this.restLevel < 20) {
      this.addMoodModifier('Exhausted', -12, 0);
    } else if (this.restLevel < 40) {
      this.addMoodModifier('Tired', -5, 0);
    } else {
      this.moodModifiers = this.moodModifiers.filter(m => m.name !== 'Exhausted' && m.name !== 'Tired');
    }

    if (this.health < this.maxHealth * 0.3) {
      this.addMoodModifier('In Pain', -15, 0);
    } else if (this.health < this.maxHealth * 0.6) {
      this.addMoodModifier('Injured', -5, 0);
    } else {
      this.moodModifiers = this.moodModifiers.filter(m => m.name !== 'In Pain' && m.name !== 'Injured');
    }

    if (this.plagued) {
      this.addMoodModifier('Diseased', -20, 0);
    }
    if (this.cursed) {
      this.addMoodModifier('Cursed', -15, 0);
    }

    // Calculate total mood
    let totalModifier = 0;
    const toRemove = [];
    for (let i = 0; i < this.moodModifiers.length; i++) {
      const mod = this.moodModifiers[i];
      totalModifier += mod.value;
      if (mod.duration > 0) {
        mod.elapsed += dt;
        if (mod.elapsed >= mod.duration) {
          toRemove.push(i);
        }
      }
    }
    // Remove expired modifiers (reverse order)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.moodModifiers.splice(toRemove[i], 1);
    }

    // Target mood
    const targetMood = Math.max(0, Math.min(100, baseMood + totalModifier));
    // Smoothly approach target mood
    this.mood += (targetMood - this.mood) * dt * 0.3;
    this.mood = Math.max(0, Math.min(100, this.mood));

    // Mental break check (RimWorld style)
    if (this.mood < 15 && !this.mentalBreak && this.state !== STATES.MENTAL_BREAK) {
      const breakChance = dt * 0.08; // Higher chance at lower mood
      const resist = this.getTraitEffect('mentalBreakResist') || 1;
      if (Math.random() < breakChance * resist) {
        this.triggerMentalBreak();
      }
    }

    // Inspiration at high mood (RimWorld style)
    if (this.mood > 85 && !this.inspired && Math.random() < dt * 0.01) {
      this.inspired = true;
      this.inspirationTimer = 30; // 30 seconds of inspiration
      this.addMoodModifier('Inspired!', 5, 30);
    }

    if (this.inspired) {
      this.inspirationTimer -= dt;
      if (this.inspirationTimer <= 0) {
        this.inspired = false;
      }
    }
  }

  triggerMentalBreak() {
    // Pyromaniac trait forces fire break
    let breakType;
    if (this.hasTrait('pyromaniac') && Math.random() < 0.6) {
      breakType = MENTAL_BREAKS.find(b => b.id === 'fire');
    } else {
      breakType = MENTAL_BREAKS[Math.floor(Math.random() * MENTAL_BREAKS.length)];
    }

    this.mentalBreak = {
      type: breakType,
      timer: 0,
      duration: breakType.duration,
    };
    this.state = STATES.MENTAL_BREAK;
    this.stateTimer = 0;

    // After mental break ends, catharsis bonus (RimWorld)
    // This will be handled in updateMentalBreak
  }

  updateMentalBreak(dt, creatures) {
    if (!this.mentalBreak) return;

    this.mentalBreak.timer += dt;

    switch (this.mentalBreak.type.id) {
      case 'wander':
        // Just wander aimlessly
        if (this.stateTimer > 2) {
          this.stateTimer = 0;
          this.pickRandomTarget();
          this.state = STATES.MENTAL_BREAK; // Stay in mental break state
        }
        this.updateMoving(dt);
        break;

      case 'berserk':
        // Attack nearest creature
        if (!this.combatTarget || !this.combatTarget.alive) {
          let nearest = null;
          let nearestDist = Infinity;
          for (const c of creatures) {
            if (c === this || !c.alive) continue;
            const dx = Math.abs(c.tileX - this.tileX);
            const dz = Math.abs(c.tileZ - this.tileZ);
            const dist = dx + dz;
            if (dist < 6 && dist < nearestDist) {
              nearestDist = dist;
              nearest = c;
            }
          }
          if (nearest) {
            this.combatTarget = nearest;
            this.targetTileX = nearest.tileX;
            this.targetTileZ = nearest.tileZ;
          }
        }
        if (this.combatTarget && this.combatTarget.alive) {
          const tdx = Math.abs(this.tileX - this.combatTarget.tileX);
          const tdz = Math.abs(this.tileZ - this.combatTarget.tileZ);
          if (tdx <= 1 && tdz <= 1) {
            if (this.actionTimer > 0.8) {
              this.actionTimer = 0;
              const damage = this.attack + Math.random() * 8;
              this.combatTarget.takeDamage(damage);
            }
          } else {
            this.targetTileX = this.combatTarget.tileX;
            this.targetTileZ = this.combatTarget.tileZ;
            this.updateMoving(dt);
          }
        }
        break;

      case 'binge_eat':
        // Handled in game loop - consume food resources
        break;

      case 'fire':
        // Set fire nearby periodically
        if (this.actionTimer > 2) {
          this.actionTimer = 0;
          const fx = this.tileX + Math.floor(Math.random() * 5 - 2);
          const fz = this.tileZ + Math.floor(Math.random() * 5 - 2);
          this.terrain.setFire(fx, fz);
          this.pickRandomTarget();
          this.state = STATES.MENTAL_BREAK;
        }
        this.updateMoving(dt);
        break;

      case 'hide':
        // Do nothing, just idle
        break;
    }

    // Check if mental break is over
    if (this.mentalBreak.timer >= this.mentalBreak.duration) {
      this.mentalBreak = null;
      this.combatTarget = null;
      this.state = STATES.IDLE;
      this.stateTimer = 0;
      // Catharsis - mood boost after mental break (RimWorld)
      this.addMoodModifier('Catharsis', 20, 60);
    }
  }

  createMesh() {
    this.mesh = new THREE.Group();

    if (this.type === 'human') {
      // Improved body with slight taper
      const bodyGeo = new THREE.BoxGeometry(0.22, 0.38, 0.18);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: FACTION_COLORS[this.faction % FACTION_COLORS.length],
        roughness: 0.6,
        metalness: 0.1,
      });
      this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      this.bodyMesh.position.y = 0.22;
      this.bodyMesh.castShadow = true;
      this.mesh.add(this.bodyMesh);

      // Head with skin color
      const headGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
      const skinColors = [0xffccaa, 0xf0c8a0, 0xd4a574, 0xc49060, 0x8d5524];
      const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)];
      const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });
      this.headMesh = new THREE.Mesh(headGeo, headMat);
      this.headMesh.position.y = 0.48;
      this.headMesh.castShadow = true;
      this.mesh.add(this.headMesh);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.07, 0.25, 0.07);
      const armMat = bodyMat.clone();
      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.set(-0.17, 0.22, 0);
      this.mesh.add(leftArm);
      const rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.set(0.17, 0.22, 0);
      this.mesh.add(rightArm);
      this.leftArm = leftArm;
      this.rightArm = rightArm;

      // Legs
      const legGeo = new THREE.BoxGeometry(0.08, 0.18, 0.08);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x444466, roughness: 0.8 });
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.set(-0.06, 0.02, 0);
      this.mesh.add(leftLeg);
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.set(0.06, 0.02, 0);
      this.mesh.add(rightLeg);
      this.leftLeg = leftLeg;
      this.rightLeg = rightLeg;

      // Health bar (improved)
      const hbGeo = new THREE.PlaneGeometry(0.42, 0.06);
      const hbBgMat = new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      this.healthBarBg = new THREE.Mesh(hbGeo, hbBgMat);
      this.healthBarBg.position.y = 0.68;
      this.mesh.add(this.healthBarBg);

      const hbFillGeo = new THREE.PlaneGeometry(0.40, 0.04);
      const hbFillMat = new THREE.MeshBasicMaterial({ color: 0x4caf50, side: THREE.DoubleSide });
      this.healthBarFill = new THREE.Mesh(hbFillGeo, hbFillMat);
      this.healthBarFill.position.y = 0.68;
      this.healthBarFill.position.z = 0.001;
      this.mesh.add(this.healthBarFill);

      // Mood indicator (small colored dot above head)
      const moodGeo = new THREE.CircleGeometry(0.05, 6);
      const moodMat = new THREE.MeshBasicMaterial({ color: 0x4caf50, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      this.moodIndicator = new THREE.Mesh(moodGeo, moodMat);
      this.moodIndicator.position.y = 0.78;
      this.mesh.add(this.moodIndicator);

      // Level indicator (small dot)
      if (this.level > 1) {
        this.updateLevelIndicator();
      }

      // Mental break indicator (exclamation mark particle)
      // Will be toggled visible/hidden

    } else {
      // Animal
      const animalData = this.animalData;
      const bodyGeo = new THREE.BoxGeometry(
        animalData.scale * 1.2,
        animalData.scale * 0.7,
        animalData.scale * 0.8
      );
      const bodyMat = new THREE.MeshStandardMaterial({ color: animalData.color, roughness: 0.8 });
      this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      this.bodyMesh.position.y = animalData.scale * 0.5;
      this.bodyMesh.castShadow = true;
      this.mesh.add(this.bodyMesh);

      // Head
      const headGeo = new THREE.BoxGeometry(
        animalData.scale * 0.5,
        animalData.scale * 0.5,
        animalData.scale * 0.4
      );
      const headMat = new THREE.MeshStandardMaterial({ color: animalData.color, roughness: 0.8 });
      this.headMesh = new THREE.Mesh(headGeo, headMat);
      this.headMesh.position.set(
        animalData.scale * 0.5,
        animalData.scale * 0.6,
        0
      );
      this.mesh.add(this.headMesh);

      // Legs for non-small animals
      if (animalData.scale > 0.25) {
        const legGeo2 = new THREE.BoxGeometry(0.05, animalData.scale * 0.5, 0.05);
        const legMat2 = new THREE.MeshStandardMaterial({ color: animalData.color });
        for (let i = 0; i < 4; i++) {
          const leg = new THREE.Mesh(legGeo2, legMat2);
          leg.position.set(
            (i < 2 ? -1 : 1) * animalData.scale * 0.4,
            animalData.scale * 0.1,
            (i % 2 === 0 ? -1 : 1) * animalData.scale * 0.25
          );
          this.mesh.add(leg);
        }
      }

      this.speed = animalData.name === 'Wolf' || animalData.name === 'Bear' ? 2.5 :
                   animalData.name === 'Fox' ? 2.8 :
                   animalData.name === 'Rabbit' ? 2.2 :
                   animalData.name === 'Boar' ? 1.8 : 1.0;
    }

    this.scene.add(this.mesh);
  }

  updateLevelIndicator() {
    // Remove old indicator
    const old = this.mesh.getObjectByName('levelIndicator');
    if (old) this.mesh.remove(old);

    if (this.level > 1) {
      const starGeo = new THREE.CircleGeometry(0.06, 6);
      const starMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const star = new THREE.Mesh(starGeo, starMat);
      star.name = 'levelIndicator';
      star.position.y = 0.85;
      this.mesh.add(star);
    }
  }

  gainExp(amount) {
    if (this.type !== 'human') return;
    const expMult = this.getTraitEffect('expMult') || 1;
    this.experience += Math.floor(amount * expMult);
    if (this.inspired) this.experience += Math.floor(amount * 0.3); // Inspiration exp bonus
    const expNeeded = this.level * 50;
    if (this.experience >= expNeeded) {
      this.experience -= expNeeded;
      this.level++;
      this.maxHealth += 10;
      this.health = Math.min(this.health + 20, this.maxHealth);
      this.attack += 3;
      this.defense += 1;
      this.speed += 0.05;
      this.updateLevelIndicator();
      this.addMoodModifier('Leveled Up!', 8, 30);
    }
  }

  update(dt, creatures, buildings, resources, gameTime) {
    if (!this.alive) return;

    // Update hunger
    const hungerRate = this.getTraitEffect('hungerRate') || 1;
    this.hunger += dt * 0.4 * hungerRate;
    if (this.hunger > 100) {
      this.health -= dt * 4;
      if (this.health <= 0) this.die();
    }

    // Update rest level
    if (this.type === 'human') {
      const restRate = this.getTraitEffect('restRate') || 1;
      if (this.state === STATES.SLEEPING) {
        this.restLevel = Math.min(100, this.restLevel + dt * 8);
      } else {
        this.restLevel = Math.max(0, this.restLevel - dt * 0.3 * restRate);
      }
    }

    // Age
    if (this.type === 'human') {
      this.age += dt * 0.05;
    }

    // Update mood
    this.updateMood(dt);

    // Update plague
    if (this.plagued) {
      this.plagueTimer += dt;
      this.health -= dt * 3;
      // Spread chance
      if (Math.random() < dt * 0.02) {
        for (const c of creatures) {
          if (c !== this && c.alive && !c.plagued) {
            const dx = Math.abs(c.tileX - this.tileX);
            const dz = Math.abs(c.tileZ - this.tileZ);
            if (dx + dz <= 2) {
              c.plagued = true;
              c.plagueTimer = 0;
            }
          }
        }
      }
      // Plague can be cured over time
      if (this.plagueTimer > 30 + Math.random() * 20) {
        this.plagued = false;
        this.addMoodModifier('Recovered!', 10, 30);
      }
      if (this.health <= 0) this.die();
    }

    // Update curse
    if (this.cursed) {
      this.curseTimer += dt;
      this.attack = Math.max(1, this.attack - dt * 0.1);
      if (this.curseTimer > 60) {
        this.cursed = false;
      }
    }

    // Update madness
    if (this.madness) {
      this.madnessTimer += dt;
      if (this.madnessTimer > 20) {
        this.madness = false;
      }
    }

    // Health bar update
    if (this.type === 'human') {
      const hp = this.health / this.maxHealth;
      this.healthBarFill.scale.x = Math.max(0.01, hp);
      if (hp > 0.6) this.healthBarFill.material.color.setHex(0x4caf50);
      else if (hp > 0.3) this.healthBarFill.material.color.setHex(0xffa726);
      else this.healthBarFill.material.color.setHex(0xef5350);

      // Show health bar only when damaged
      const damaged = this.health < this.maxHealth;
      this.healthBarBg.visible = damaged;
      this.healthBarFill.visible = damaged;

      // Update mood indicator color
      if (this.moodIndicator) {
        if (this.mentalBreak) {
          this.moodIndicator.material.color.setHex(0xff0000);
          this.moodIndicator.visible = true;
          // Pulsing effect for mental break
          this.moodIndicator.scale.setScalar(0.8 + Math.sin(Date.now() * 0.01) * 0.3);
        } else if (this.inspired) {
          this.moodIndicator.material.color.setHex(0xffd700);
          this.moodIndicator.visible = true;
          this.moodIndicator.scale.setScalar(1);
        } else if (this.mood > 70) {
          this.moodIndicator.material.color.setHex(0x4caf50);
          this.moodIndicator.visible = false; // Hide when happy (normal)
        } else if (this.mood > 35) {
          this.moodIndicator.material.color.setHex(0xffa726);
          this.moodIndicator.visible = true;
        } else {
          this.moodIndicator.material.color.setHex(0xef5350);
          this.moodIndicator.visible = true;
        }
      }
    }

    // Face healthbar to camera (billboard)
    if (this.healthBarBg) {
      this.healthBarBg.lookAt(this.mesh.position.x, this.mesh.position.y + 10, this.mesh.position.z + 1);
      this.healthBarFill.lookAt(this.mesh.position.x, this.mesh.position.y + 10, this.mesh.position.z + 1);
    }
    if (this.moodIndicator) {
      this.moodIndicator.lookAt(this.mesh.position.x, this.mesh.position.y + 10, this.mesh.position.z + 1);
    }

    // Passive health regen when resting and well-fed
    if (this.state === STATES.RESTING || this.state === STATES.IDLE || this.state === STATES.SLEEPING) {
      if (this.hunger < 40) {
        this.health = Math.min(this.maxHealth, this.health + dt * 2);
      }
    }

    // Check fire damage
    const tile = this.terrain.tiles.get(`${this.tileX},${this.tileZ}`);
    if (tile && tile.onFire) {
      this.health -= dt * 25;
      if (this.health <= 0) this.die();
      // Flee from fire
      if (this.state !== STATES.FLEEING && this.state !== STATES.MENTAL_BREAK) {
        this.state = STATES.FLEEING;
        this.pickSafeTarget();
      }
    }

    // Death by old age
    if (this.type === 'human' && this.age > 75 + Math.random() * 15) {
      this.health -= dt * 10;
      if (this.health <= 0) this.die();
    }

    this.stateTimer += dt;
    this.actionTimer += dt;

    // Mental break overrides normal AI
    if (this.state === STATES.MENTAL_BREAK) {
      this.updateMentalBreak(dt, creatures);
      return; // Don't process normal state machine
    }

    // Madness override (WorldBox-inspired)
    if (this.madness && this.state !== STATES.FIGHTING && this.state !== STATES.FLEEING) {
      const victim = this.findNearbyCreatureAny(creatures);
      if (victim) {
        this.combatTarget = victim;
        this.targetTileX = victim.tileX;
        this.targetTileZ = victim.tileZ;
        this.state = STATES.MOVING;
        this.target = { type: 'fight' };
        // Continue to state machine below
      }
    }

    // State machine
    switch (this.state) {
      case STATES.IDLE:
        this.updateIdle(dt, creatures, buildings, resources, gameTime);
        break;
      case STATES.MOVING:
        this.updateMoving(dt);
        break;
      case STATES.BUILDING:
        this.updateBuildingState(dt, buildings, resources);
        break;
      case STATES.GATHERING:
        this.updateGathering(dt, resources);
        break;
      case STATES.FIGHTING:
        this.updateFighting(dt, resources);
        break;
      case STATES.FLEEING:
        this.updateFleeing(dt);
        break;
      case STATES.HUNTING:
        this.updateHunting(dt, creatures, resources);
        break;
      case STATES.RESTING:
        this.updateResting(dt);
        break;
      case STATES.SLEEPING:
        this.updateSleeping(dt);
        break;
      case STATES.TRAINING:
        this.updateTraining(dt);
        break;
      case STATES.WORSHIPING:
        this.updateWorshiping(dt, resources);
        break;
      case STATES.BUILDING_IDLE:
        // Short pause before continuing
        if (this.stateTimer > 1) this.state = STATES.IDLE;
        break;
    }

    // Walk animation
    if (this.state === STATES.MOVING || this.state === STATES.FLEEING || this.state === STATES.HUNTING || this.state === STATES.BUILDING) {
      const walkSpeed = this.state === STATES.FLEEING ? 18 : 12;
      const walkAmplitude = 0.04;

      if (this.type === 'human') {
        this.bodyMesh.position.y = 0.22 + Math.sin(Date.now() * 0.012) * 0.02;
        if (this.leftArm) {
          this.leftArm.rotation.x = Math.sin(Date.now() * walkSpeed * 0.001) * 0.5;
          this.rightArm.rotation.x = -Math.sin(Date.now() * walkSpeed * 0.001) * 0.5;
        }
        if (this.leftLeg) {
          this.leftLeg.rotation.x = -Math.sin(Date.now() * walkSpeed * 0.001) * 0.4;
          this.rightLeg.rotation.x = Math.sin(Date.now() * walkSpeed * 0.001) * 0.4;
        }
      } else {
        this.bodyMesh.position.y = (this.animalData.scale * 0.5) + Math.sin(Date.now() * 0.012) * walkAmplitude;
      }
    } else {
      // Reset arm/leg positions when idle
      if (this.type === 'human') {
        if (this.leftArm) this.leftArm.rotation.x = 0;
        if (this.rightArm) this.rightArm.rotation.x = 0;
        if (this.leftLeg) this.leftLeg.rotation.x = 0;
        if (this.rightLeg) this.rightLeg.rotation.x = 0;
      }
    }
  }

  updateIdle(dt, creatures, buildings, resources, gameTime) {
    if (this.stateTimer > 0.8 + Math.random() * 1.5) {
      this.stateTimer = 0;

      if (this.type === 'animal') {
        // Animals: wolves/bears hunt, others wander
        if (this.animalData && !this.animalData.passive && Math.random() < 0.3) {
          // Hunt nearby creatures
          const prey = this.findNearbyPrey(creatures);
          if (prey) {
            this.combatTarget = prey;
            this.targetTileX = prey.tileX;
            this.targetTileZ = prey.tileZ;
            this.state = STATES.HUNTING;
            return;
          }
        }
        this.pickRandomTarget();
        return;
      }

      // ===== Human AI priorities =====

      // Bandit specific AI
      if (this.faction === 99) {
        const prey = this.findNearbyEnemy(creatures);
        if (prey) {
           this.combatTarget = prey;
           this.targetTileX = prey.tileX;
           this.targetTileZ = prey.tileZ;
           this.state = STATES.MOVING;
           this.target = { type: 'fight' };
           return;
        }
        if (Math.random() < 0.6) {
           const half = this.terrain.size / 2;
           this.targetTileX = Math.round(half + (Math.random() - 0.5) * 15);
           this.targetTileZ = Math.round(half + (Math.random() - 0.5) * 15);
           this.state = STATES.MOVING;
           return;
        }
        this.pickRandomTarget();
        return;
      }

      // 1. Flee from fire
      const tile = this.terrain.tiles.get(`${this.tileX},${this.tileZ}`);
      if (tile && tile.onFire) {
        this.state = STATES.FLEEING;
        this.pickSafeTarget();
        return;
      }

      // 2. Sleep at night (realistic behavior)
      const isNight = gameTime !== undefined && (gameTime >= 21 || gameTime < 5);
      const isNightOwl = this.hasTrait('night_owl');
      if (isNight && !isNightOwl && this.restLevel < 70 && Math.random() < 0.5) {
        this.state = STATES.SLEEPING;
        this.restTimer = 0;
        return;
      }
      // Night owl works at night, sleeps during day
      if (!isNight && isNightOwl && this.restLevel < 50 && Math.random() < 0.4) {
        this.state = STATES.SLEEPING;
        this.restTimer = 0;
        return;
      }

      // 3. Rest if very low health
      if (this.health < this.maxHealth * 0.3) {
        this.state = STATES.RESTING;
        this.restTimer = 0;
        return;
      }

      // 3.5 Heal at Temple if injured but not dying
      if (this.health < this.maxHealth * 0.7 && Math.random() < 0.3) {
         const temple = this.findNearestBuilding('temple', buildings);
         if (temple) {
           this.targetTileX = temple.x;
           this.targetTileZ = temple.z;
           this.state = STATES.MOVING;
           this.target = { type: 'worship' };
           return;
         }
      }

      // 4. Eat if hungry
      if (this.hunger > 45 && resources.food > 0) {
        resources.food -= 1;
        this.hunger = Math.max(0, this.hunger - 35);
        this.addMoodModifier('Ate a meal', 3, 15);
      }

      // 5. Priest goes to worship
      if (this.profession === 'Priest' && Math.random() < 0.35) {
        const temple = this.findNearestBuilding('temple', buildings);
        if (temple) {
          this.targetTileX = temple.x;
          this.targetTileZ = temple.z;
          this.state = STATES.MOVING;
          this.target = { type: 'worship' };
          return;
        }
      }

      // Coward trait: avoid combat
      const isCoward = this.hasTrait('coward');

      // 6. Fight nearby enemies (skip if coward)
      if (!isCoward && Math.random() < 0.25) {
        const enemy = this.findNearbyEnemy(creatures);
        if (enemy) {
          // Coward flees instead of fighting if low hp
          if (isCoward && this.health < this.maxHealth * (this.getTraitEffect('fleeThreshold') || 0.3)) {
            this.state = STATES.FLEEING;
            this.pickSafeTarget();
            return;
          }
          this.combatTarget = enemy;
          this.targetTileX = enemy.tileX;
          this.targetTileZ = enemy.tileZ;
          this.state = STATES.MOVING;
          this.target = { type: 'fight' };
          return;
        }
      }

      // 7. Hunt animals if low on food (Hunter profession preference)
      const huntChance = this.profession === 'Hunter' ? 0.6 : 0.3;
      if (resources.food < 20 && Math.random() < huntChance) {
        const prey = this.findNearbyPrey(creatures);
        if (prey) {
          this.combatTarget = prey;
          this.targetTileX = prey.tileX;
          this.targetTileZ = prey.tileZ;
          this.state = STATES.HUNTING;
          return;
        }
      }

      // 8. Gather resources (profession-weighted)
      if (resources.wood < 200 && Math.random() < 0.35) {
        const treeTile = this.findNearestTree();
        if (treeTile) {
          this.targetTileX = treeTile.x;
          this.targetTileZ = treeTile.z;
          this.state = STATES.MOVING;
          this.target = { type: 'tree', x: treeTile.x, z: treeTile.z };
          return;
        }
      }

      // 9. Mine stone/gold (Miner profession preference)
      const mineChance = this.profession === 'Miner' ? 0.45 : 0.15;
      if (resources.stone < 100 && Math.random() < mineChance) {
        const mountainTile = this.findNearestBiome(6); // MOUNTAIN
        if (mountainTile) {
          this.targetTileX = mountainTile.x;
          this.targetTileZ = mountainTile.z;
          this.state = STATES.MOVING;
          this.target = { type: 'mine', x: mountainTile.x, z: mountainTile.z };
          return;
        }
      }

      // 10. Autonomous Building (Builder profession preference)
      const buildChance = this.profession === 'Builder' ? 0.5 : 0.2;
      if (Math.random() < buildChance) {
        const pop = creatures.filter(c => c.alive && c.type === 'human').length;
        const houseCount = buildings.getCountByType('house');
        const farmCount = buildings.getCountByType('farm');

        // Need more houses?
        if (houseCount * 4 < pop + 3 && resources.wood >= 10 && Math.random() < 0.5) {
           const buildSpot = this.findBuildSpot(buildings, 'house');
           if (buildSpot) {
             this.targetTileX = buildSpot.x;
             this.targetTileZ = buildSpot.z;
             this.state = STATES.MOVING;
             this.target = { type: 'build', bType: 'house' };
             return;
           }
        }

        // Need more farms?
        if (farmCount * 3 <= pop && resources.wood >= 5 && Math.random() < 0.5) {
           const buildSpot = this.findBuildSpot(buildings, 'farm');
           if (buildSpot) {
             this.targetTileX = buildSpot.x;
             this.targetTileZ = buildSpot.z;
             this.state = STATES.MOVING;
             this.target = { type: 'build', bType: 'farm' };
             return;
           }
        }
      }

      // 11. Train at Barracks (Warrior preference)
      const trainChance = this.profession === 'Warrior' ? 0.4 : 0.15;
      if (Math.random() < trainChance) {
        const barracks = this.findNearestBuilding('barracks', buildings);
        if (barracks) {
          this.targetTileX = barracks.x;
          this.targetTileZ = barracks.z;
          this.state = STATES.MOVING;
          this.target = { type: 'train' };
          return;
        }
      }

      // 12. Wander
      this.pickRandomTarget();
    }
  }

  updateMoving(dt) {
    const dx = this.targetTileX - this.tileX;
    const dz = this.targetTileZ - this.tileZ;
    const dist = Math.abs(dx) + Math.abs(dz);

    if (dist === 0) {
      // Arrived
      if (this.target) {
        if (this.target.type === 'tree') {
          this.state = STATES.GATHERING;
          this.actionTimer = 0;
        } else if (this.target.type === 'mine') {
          this.state = STATES.GATHERING;
          this.actionTimer = 0;
        } else if (this.target.type === 'fight' && this.combatTarget) {
          this.state = STATES.FIGHTING;
          this.actionTimer = 0;
        } else if (this.target.type === 'build') {
          this.state = STATES.BUILDING;
          this.actionTimer = 0;
        } else if (this.target.type === 'train') {
          this.state = STATES.TRAINING;
          this.actionTimer = 0;
        } else if (this.target.type === 'worship') {
          this.state = STATES.WORSHIPING;
          this.actionTimer = 0;
        } else {
          this.state = STATES.IDLE;
          this.stateTimer = 0;
        }
      } else {
        this.state = STATES.IDLE;
        this.stateTimer = 0;
      }
      return;
    }

    // Work speed bonus from trait
    const workSpeed = this.getTraitEffect('workSpeed') || 1;
    this.moveProgress += dt * this.speed * (this.inspired ? 1.2 : 1);

    if (this.moveProgress >= 1) {
      this.moveProgress = 0;
      // Move one step
      if (Math.abs(dx) >= Math.abs(dz)) {
        this.tileX += Math.sign(dx);
      } else {
        this.tileZ += Math.sign(dz);
      }

      // Check walkability
      if (!this.terrain.isWalkable(this.tileX, this.tileZ)) {
        this.tileX -= Math.sign(dx) || 0;
        this.tileZ -= Math.sign(dz) || 0;
        this.pickRandomTarget();
        return;
      }

      const worldPos = this.terrain.getWorldPos(this.tileX, this.tileZ);
      this.mesh.position.x = worldPos.x;
      this.mesh.position.y = worldPos.y + 0.15;
      this.mesh.position.z = worldPos.z;

      // Smooth rotation toward direction
      const targetAngle = Math.atan2(dx, dz);
      this.mesh.rotation.y = targetAngle;
    } else {
      // Interpolate position
      const fromPos = this.terrain.getWorldPos(this.tileX, this.tileZ);
      const nextX = this.tileX + (Math.abs(dx) >= Math.abs(dz) ? Math.sign(dx) : 0);
      const nextZ = this.tileZ + (Math.abs(dx) < Math.abs(dz) ? Math.sign(dz) : 0);

      if (nextX >= 0 && nextX < this.terrain.size && nextZ >= 0 && nextZ < this.terrain.size) {
        const toPos = this.terrain.getWorldPos(nextX, nextZ);
        this.mesh.position.x = fromPos.x + (toPos.x - fromPos.x) * this.moveProgress;
        this.mesh.position.z = fromPos.z + (toPos.z - fromPos.z) * this.moveProgress;
        this.mesh.position.y = fromPos.y + (toPos.y - fromPos.y) * this.moveProgress + 0.15;
      }
    }
  }

  updateGathering(dt, resources) {
    const workMult = this.inspired ? 1.5 : (this.getTraitEffect('workSpeed') || 1);
    if (this.actionTimer > 2.5 / workMult) {
      const isWorker = this.profession === 'Builder' || this.profession === 'Miner';
      if (this.target && this.target.type === 'tree') {
        const key = `${this.target.x},${this.target.z}`;
        const tile = this.terrain.tiles.get(key);
        if (tile && tile.hasTree) {
          tile.hasTree = false;
          resources.wood += isWorker ? 10 : 6;
          this.gainExp(5);
          const treeMesh = this.terrain.trees.get(key);
          if (treeMesh) {
            this.scene.remove(treeMesh);
            this.terrain.trees.delete(key);
          }
        }
      } else if (this.target && this.target.type === 'mine') {
        resources.stone += isWorker ? 7 : 4;
        if (this.profession === 'Miner') {
          resources.gold += 1; // Miners find gold occasionally
        }
        this.gainExp(5);
      }
      this.target = null;
      this.state = STATES.IDLE;
      this.stateTimer = 0;
      this.addMoodModifier('Completed work', 2, 10);
    }
  }

  updateBuildingState(dt, buildings, resources) {
    if (this.actionTimer > 2.0) {
       if (this.target && this.target.type === 'build') {
         if (buildings.canBuild(this.targetTileX, this.targetTileZ, this.target.bType)) {
           const success = buildings.build(this.targetTileX, this.targetTileZ, this.target.bType, resources);
           if (success) {
             this.gainExp(10);
             this.addMoodModifier('Built something', 5, 20);
           }
         }
       }
       this.target = null;
       this.state = STATES.BUILDING_IDLE;
       this.stateTimer = 0;
    }
  }

  updateTraining(dt) {
    if (this.actionTimer > 3.0) {
      this.gainExp(20);
      this.addMoodModifier('Training', 3, 15);
      this.target = null;
      this.state = STATES.IDLE;
      this.stateTimer = 0;
    }
  }

  updateWorshiping(dt, resources) {
    if (this.actionTimer > 3.0) {
      this.heal(40);
      this.hunger = Math.max(0, this.hunger - 15);
      if (resources) resources.faith += this.profession === 'Priest' ? 20 : 10;
      this.addMoodModifier('Worshiped', 8, 30);
      // Plague cure chance at temple
      if (this.plagued && Math.random() < 0.3) {
        this.plagued = false;
        this.addMoodModifier('Cured at Temple', 15, 40);
      }
      this.target = null;
      this.state = STATES.IDLE;
      this.stateTimer = 0;
    }
  }

  updateSleeping(dt) {
    this.restTimer += dt;
    this.restLevel = Math.min(100, this.restLevel + dt * 8);
    this.health = Math.min(this.maxHealth, this.health + dt * 1.5);

    // Emote Zzz occasionally (visual)
    if (this.bodyMesh && Math.floor(this.restTimer * 2) % 2 === 0) {
      this.bodyMesh.position.y = 0.18 + Math.sin(this.restTimer * 2) * 0.01;
    }

    if (this.restLevel >= 95 || this.restTimer > 12) {
      this.state = STATES.IDLE;
      this.stateTimer = 0;
      this.addMoodModifier('Well Rested', 5, 30);
    }
  }

  updateFighting(dt, resources) {
    if (!this.combatTarget || !this.combatTarget.alive) {
      this.state = STATES.IDLE;
      this.stateTimer = 0;
      this.combatTarget = null;
      return;
    }

    // Coward check - flee if hurt
    if (this.hasTrait('coward') && this.health < this.maxHealth * 0.6) {
      this.state = STATES.FLEEING;
      this.pickSafeTarget();
      this.combatTarget = null;
      return;
    }

    // Check distance
    const tdx = Math.abs(this.tileX - this.combatTarget.tileX);
    const tdz = Math.abs(this.tileZ - this.combatTarget.tileZ);
    if (tdx > 2 || tdz > 2) {
      // Chase
      this.targetTileX = this.combatTarget.tileX;
      this.targetTileZ = this.combatTarget.tileZ;
      this.state = STATES.MOVING;
      this.target = { type: 'fight' };
      return;
    }

    // Attack periodically
    if (this.actionTimer > 1.0) {
      this.actionTimer = 0;
      const damage = Math.max(1, this.attack - this.combatTarget.defense + (Math.random() * 6 - 3));

      // Dodge check (nimble trait)
      const dodgeChance = this.combatTarget.getTraitEffect ? (this.combatTarget.getTraitEffect('dodgeChance') || 0) : 0;
      if (Math.random() < dodgeChance) {
        // Dodged!
      } else {
        // Apply damage multiplier from tough trait
        const damageMult = this.combatTarget._damageMult || 1;
        this.combatTarget.takeDamage(damage * damageMult);
      }
      this.gainExp(3);

      // Target fights back
      if (this.combatTarget.alive && this.combatTarget.type === 'human') {
        const counterDamage = Math.max(1, this.combatTarget.attack - this.defense + (Math.random() * 4 - 2));
        const myDodge = this.getTraitEffect('dodgeChance') || 0;
        if (Math.random() >= myDodge) {
          const myDamageMult = this._damageMult || 1;
          this.takeDamage(counterDamage * myDamageMult);
        }
        this.combatTarget.gainExp(2);
      }

      if (!this.combatTarget.alive) {
        this.gainExp(20);
        // Bloodlust trait mood boost
        const killBoost = this.getTraitEffect('killMoodBoost');
        if (killBoost) {
          this.addMoodModifier('Bloodlust Satisfied', killBoost, 20);
        }
        if (this.combatTarget.type === 'animal') {
          resources.food += this.combatTarget.animalData ? this.combatTarget.animalData.food : 3;
        }
        this.combatTarget = null;
        this.state = STATES.IDLE;
        this.stateTimer = 0;
      }
    }
  }

  updateHunting(dt, creatures, resources) {
    if (!this.combatTarget || !this.combatTarget.alive) {
      this.state = STATES.IDLE;
      this.combatTarget = null;
      return;
    }

    // Move toward prey
    const tdx = Math.abs(this.tileX - this.combatTarget.tileX);
    const tdz = Math.abs(this.tileZ - this.combatTarget.tileZ);

    if (tdx <= 1 && tdz <= 1) {
      // Attack
      if (this.actionTimer > 0.8) {
        this.actionTimer = 0;
        const huntBonus = this.profession === 'Hunter' ? 8 : 0;
        const damage = this.attack + huntBonus + Math.random() * 5;
        this.combatTarget.takeDamage(damage);
        this.gainExp(2);

        if (!this.combatTarget.alive) {
          const foodGain = this.combatTarget.animalData ? this.combatTarget.animalData.food : 3;
          if (resources) resources.food += foodGain;
          this.gainExp(10);
          this.addMoodModifier('Successful hunt', 5, 20);
          this.combatTarget = null;
          this.state = STATES.IDLE;
        }
      }
    } else {
      // Chase
      this.targetTileX = this.combatTarget.tileX;
      this.targetTileZ = this.combatTarget.tileZ;
      this.updateMoving(dt);
    }
  }

  updateFleeing(dt) {
    // Same as moving but with higher speed
    const savedSpeed = this.speed;
    this.speed = 3.5;
    this.updateMoving(dt);
    this.speed = savedSpeed;
    if (this.state === STATES.IDLE) {
      // Check if still in danger
      const tile = this.terrain.tiles.get(`${this.tileX},${this.tileZ}`);
      if (tile && tile.onFire) {
        this.pickSafeTarget();
        this.state = STATES.FLEEING;
      }
    }
  }

  updateResting(dt) {
    this.restTimer += dt;
    this.health = Math.min(this.maxHealth, this.health + dt * 5);

    if (this.restTimer > 5 || this.health >= this.maxHealth * 0.8) {
      this.state = STATES.IDLE;
      this.stateTimer = 0;
    }
  }

  findNearbyCreatureAny(creatures) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const c of creatures) {
      if (c === this || !c.alive) continue;
      const dx = Math.abs(this.tileX - c.tileX);
      const dz = Math.abs(this.tileZ - c.tileZ);
      const dist = dx + dz;
      if (dist < 6 && dist < nearestDist) {
        nearestDist = dist;
        nearest = c;
      }
    }
    return nearest;
  }

  findNearbyEnemy(creatures) {
    if (this.type !== 'human') return null;
    let nearest = null;
    let nearestDist = Infinity;
    const range = 8;

    for (const c of creatures) {
      if (!c.alive || c.type !== 'human' || c.faction === this.faction) continue;
      const dx = Math.abs(this.tileX - c.tileX);
      const dz = Math.abs(this.tileZ - c.tileZ);
      const dist = dx + dz;
      if (dist < range && dist < nearestDist) {
        nearestDist = dist;
        nearest = c;
      }
    }
    return nearest;
  }

  findNearbyPrey(creatures) {
    let nearest = null;
    let nearestDist = Infinity;
    const range = 10;

    for (const c of creatures) {
      if (!c.alive) continue;
      if (this.type === 'human' && c.type !== 'animal') continue;
      if (this.type === 'animal' && c.type === 'animal' && c === this) continue;
      if (this.type === 'animal' && c.type === 'animal') {
        // Wolves/bears hunt smaller animals
        if (!this.animalData || this.animalData.passive) continue;
        if (c.animalData && c.animalData.scale >= this.animalData.scale) continue;
      }

      const dx = Math.abs(this.tileX - c.tileX);
      const dz = Math.abs(this.tileZ - c.tileZ);
      const dist = dx + dz;
      if (dist < range && dist < nearestDist) {
        nearestDist = dist;
        nearest = c;
      }
    }
    return nearest;
  }

  findNearestBiome(targetBiome) {
    let best = null;
    let bestDist = Infinity;
    const range = 12;

    for (let dz = -range; dz <= range; dz++) {
      for (let dx = -range; dx <= range; dx++) {
        const tx = this.tileX + dx;
        const tz = this.tileZ + dz;
        const tile = this.terrain.tiles.get(`${tx},${tz}`);
        if (tile && tile.biome === targetBiome && !tile.onFire) {
          const dist = Math.abs(dx) + Math.abs(dz);
          if (dist < bestDist) {
            bestDist = dist;
            best = tile;
          }
        }
      }
    }
    return best;
  }

  pickRandomTarget() {
    const range = 6;
    let attempts = 0;
    while (attempts < 10) {
      const tx = this.tileX + Math.floor(Math.random() * range * 2 - range);
      const tz = this.tileZ + Math.floor(Math.random() * range * 2 - range);
      if (this.terrain.isWalkable(tx, tz)) {
        this.targetTileX = tx;
        this.targetTileZ = tz;
        this.state = STATES.MOVING;
        this.moveProgress = 0;
        return;
      }
      attempts++;
    }
    this.state = STATES.IDLE;
    this.stateTimer = 0;
  }

  pickSafeTarget() {
    // Move away from fire
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 8;
      const tx = this.tileX + Math.round(Math.cos(angle) * dist);
      const tz = this.tileZ + Math.round(Math.sin(angle) * dist);
      const tile = this.terrain.tiles.get(`${tx},${tz}`);
      if (tile && !tile.onFire && this.terrain.isWalkable(tx, tz)) {
        this.targetTileX = tx;
        this.targetTileZ = tz;
        this.state = STATES.MOVING;
        this.moveProgress = 0;
        return;
      }
    }
    this.pickRandomTarget();
  }

  findNearestTree() {
    let best = null;
    let bestDist = Infinity;
    const range = 12;

    for (let dz = -range; dz <= range; dz++) {
      for (let dx = -range; dx <= range; dx++) {
        const tx = this.tileX + dx;
        const tz = this.tileZ + dz;
        const tile = this.terrain.tiles.get(`${tx},${tz}`);
        if (tile && tile.hasTree && !tile.onFire) {
          const dist = Math.abs(dx) + Math.abs(dz);
          if (dist < bestDist) {
            bestDist = dist;
            best = tile;
          }
        }
      }
    }
    return best;
  }

  findBuildSpot(buildings, bType) {
    const range = 8;
    let attempts = 0;
    while(attempts < 15) {
      const tx = this.tileX + Math.floor(Math.random() * range * 2 - range);
      const tz = this.tileZ + Math.floor(Math.random() * range * 2 - range);
      if (buildings.canBuild(tx, tz, bType)) {
        return { x: tx, z: tz };
      }
      attempts++;
    }
    return null;
  }

  findNearestBuilding(type, buildings) {
    if (!buildings || !buildings.buildings) return null;
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const [key, b] of buildings.buildings) {
      if (b.type === type) {
        const dx = Math.abs(this.tileX - b.x);
        const dz = Math.abs(this.tileZ - b.z);
        const dist = dx + dz;
        if (dist < 15 && dist < nearestDist) {
          nearestDist = dist;
          nearest = b;
        }
      }
    }
    return nearest;
  }

  takeDamage(amount) {
    this.health -= amount;
    this.addMoodModifier('Was hurt', -5, 10);
    // Flash red
    if (this.bodyMesh) {
      const originalColor = this.bodyMesh.material.color.getHex();
      this.bodyMesh.material.color.setHex(0xff0000);
      setTimeout(() => {
        if (this.bodyMesh && this.alive) {
          this.bodyMesh.material.color.setHex(originalColor);
        }
      }, 100);
    }
    if (this.health <= 0) this.die();
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  die() {
    this.alive = false;
    this.scene.remove(this.mesh);
    // Drop resources
    if (this.type === 'animal') {
      return { food: this.animalData ? this.animalData.food : 3 };
    }
    return {};
  }

  getInfo() {
    const stateColors = {
      [STATES.IDLE]: '#aaa',
      [STATES.MOVING]: '#64b5f6',
      [STATES.GATHERING]: '#ffa726',
      [STATES.BUILDING]: '#66bb6a',
      [STATES.FIGHTING]: '#ef5350',
      [STATES.FLEEING]: '#ff7043',
      [STATES.HUNTING]: '#ff9800',
      [STATES.RESTING]: '#90caf9',
      [STATES.FARMING]: '#8bc34a',
      [STATES.SLEEPING]: '#3f51b5',
      [STATES.MENTAL_BREAK]: '#ff1744',
      [STATES.TRAINING]: '#ce93d8',
      [STATES.WORSHIPING]: '#ffd700',
    };

    if (this.type === 'human') {
      const profIcon = {
        'Villager': '🧑‍🌾', 'Builder': '👷', 'Warrior': '🪖',
        'Farmer': '🌾', 'Hunter': '🏹', 'Miner': '⛏️', 'Priest': '🙏'
      }[this.profession] || '🧑';

      const traitStr = this.traits.map(t => `${t.icon} ${t.name}`).join(', ') || 'None';
      const moodEmoji = this.mood > 80 ? '😄' : this.mood > 60 ? '😊' : this.mood > 40 ? '😐' : this.mood > 20 ? '😟' : '😢';

      let statusStr = '';
      if (this.mentalBreak) {
        statusStr = `<br><span style="color:#ff1744">⚠️ Mental Break: ${this.mentalBreak.type.name}</span>`;
      }
      if (this.inspired) {
        statusStr += `<br><span style="color:#ffd700">✨ Inspired!</span>`;
      }
      if (this.plagued) {
        statusStr += `<br><span style="color:#9c27b0">☠️ Plagued</span>`;
      }
      if (this.cursed) {
        statusStr += `<br><span style="color:#7b1fa2">😈 Cursed</span>`;
      }
      if (this.madness) {
        statusStr += `<br><span style="color:#d50000">🤪 Madness</span>`;
      }

      return `<b>${this.name}</b> (${FACTION_NAMES[this.faction] || 'Bandit'}) ${profIcon} ${this.profession}<br>` +
        `Lv.${this.level} | State: <span style="color:${stateColors[this.state]}">${this.state}</span><br>` +
        `HP: ${Math.ceil(this.health)}/${this.maxHealth} | ATK: ${this.attack} | DEF: ${this.defense}<br>` +
        `Mood: ${moodEmoji} ${Math.round(this.mood)}% | Hunger: ${Math.ceil(this.hunger)}% | Rest: ${Math.ceil(this.restLevel)}%<br>` +
        `Traits: ${traitStr}` +
        statusStr;
    } else {
      return `<b>${this.animalData.name}</b><br>` +
        `State: <span style="color:${stateColors[this.state]}">${this.state}</span><br>` +
        `HP: ${Math.ceil(this.health)}/${this.maxHealth}`;
    }
  }
}

export class CreatureManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.creatures = [];
    this.reproductionTimer = 0;
    this.maxPopulation = 60;
  }

  spawnHuman(tileX, tileZ, faction = -1) {
    if (!this.terrain.isWalkable(tileX, tileZ)) return null;
    const f = faction >= 0 ? faction : Math.floor(Math.random() * FACTION_COLORS.length);
    const creature = new Creature(this.scene, this.terrain, tileX, tileZ, 'human', f);
    this.creatures.push(creature);
    return creature;
  }

  spawnAnimal(tileX, tileZ, specificTypeData = null) {
    if (!this.terrain.isWalkable(tileX, tileZ)) return null;
    const creature = new Creature(this.scene, this.terrain, tileX, tileZ, 'animal', 0, specificTypeData);
    this.creatures.push(creature);
    return creature;
  }

  update(dt, buildings, resources, gameTime) {
    const toRemove = [];

    for (const creature of this.creatures) {
      creature.update(dt, this.creatures, buildings, resources, gameTime);
      if (!creature.alive) {
        toRemove.push(creature);
      }
    }

    // Mental break food binge effect
    for (const creature of this.creatures) {
      if (creature.mentalBreak && creature.mentalBreak.type.id === 'binge_eat') {
        if (resources.food > 0) {
          resources.food -= dt * 2;
          creature.hunger = Math.max(0, creature.hunger - dt * 5);
        }
      }
    }

    for (const creature of toRemove) {
      const idx = this.creatures.indexOf(creature);
      if (idx >= 0) this.creatures.splice(idx, 1);
    }

    // Population growth - humans can reproduce near houses
    this.reproductionTimer += dt;
    if (this.reproductionTimer > 15) {
      this.reproductionTimer = 0;
      this.tryReproduction(buildings, resources);
    }
  }

  tryReproduction(buildings, resources) {
    const pop = this.getPopulationCount();
    if (pop >= this.maxPopulation) return;
    if (resources.food < 10) return;

    // Count houses for population cap
    let houseCap = 0;
    if (buildings && buildings.buildings) {
      for (const [, b] of buildings.buildings) {
        if (b.type === 'house') houseCap += 4;
      }
    }

    if (pop >= houseCap) return;

    // Find pairs of same-faction humans near houses
    const humans = this.creatures.filter(c => c.alive && c.type === 'human');
    const factions = {};
    for (const h of humans) {
      if (!factions[h.faction]) factions[h.faction] = [];
      factions[h.faction].push(h);
    }

    for (const [faction, members] of Object.entries(factions)) {
      if (members.length >= 2 && Math.random() < 0.3) {
        // Spawn new human near one of the members
        const parent = members[Math.floor(Math.random() * members.length)];
        const tx = parent.tileX + Math.floor(Math.random() * 3 - 1);
        const tz = parent.tileZ + Math.floor(Math.random() * 3 - 1);
        if (this.terrain.isWalkable(tx, tz)) {
          const child = this.spawnHuman(tx, tz, parseInt(faction));
          if (child) {
            resources.food -= 5;
            break; // Only one birth per cycle
          }
        }
      }
    }

    // Animal Ecosystem Reproduction
    const animals = this.creatures.filter(c => c.alive && c.type === 'animal');
    if (animals.length < 40) {
      const animalMap = {};
      for (const a of animals) {
        if (!a.animalData) continue;
        const name = a.animalData.name;
        if (!animalMap[name]) animalMap[name] = [];
        animalMap[name].push(a);
      }
      for (const [name, members] of Object.entries(animalMap)) {
        // Only reproduce if there's at least 2 of the same species
        if (members.length >= 2 && Math.random() < 0.25) {
          const parent = members[Math.floor(Math.random() * members.length)];
          const tx = parent.tileX + Math.floor(Math.random() * 5 - 2);
          const tz = parent.tileZ + Math.floor(Math.random() * 5 - 2);
          if (this.terrain.isWalkable(tx, tz)) {
            const child = this.spawnAnimal(tx, tz, parent.animalData);
            if (child) break; // Limit to one baby animal per cycle to prevent perf hit
          }
        }
      }
    }
  }

  getCreatureAt(tileX, tileZ) {
    return this.creatures.find(c =>
      c.alive && c.tileX === tileX && c.tileZ === tileZ
    );
  }

  getCreaturesInRange(tileX, tileZ, range) {
    return this.creatures.filter(c => {
      if (!c.alive) return false;
      const dx = Math.abs(c.tileX - tileX);
      const dz = Math.abs(c.tileZ - tileZ);
      return dx + dz <= range;
    });
  }

  getPopulationCount() {
    return this.creatures.filter(c => c.alive && c.type === 'human').length;
  }

  getAnimalCount() {
    return this.creatures.filter(c => c.alive && c.type === 'animal').length;
  }

  getFactionCounts() {
    const counts = {};
    for (const c of this.creatures) {
      if (c.alive && c.type === 'human') {
        counts[c.faction] = (counts[c.faction] || 0) + 1;
      }
    }
    return counts;
  }
}
