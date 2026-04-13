/**
 * AnimalSystem — ambient wildlife: sheep, wolves, fish, birds, bears.
 * Animals wander, breed slowly, flee from fire, and wolves hunt sheep.
 */
import { moveEntityTo } from './MovementSystem.js';
import { applyTraits, generateRandomTraits } from '../data/Traits.js';

const ANIMAL_TYPES = {
    sheep: {
        icon: '🐑', color: 0xeeeeee, hp: 20, speed: 0.8,
        habitat: ['grass', 'hill'],
        fleeFrom: ['wolf', 'bear'],
        diet: 'herbivore', maxHunger: 120, // Herbivore
        herdSize: 4, breedRate: 0.04
    },
    wolf: {
        icon: '🐺', color: 0x888899, hp: 40, speed: 1.2,
        habitat: ['forest', 'hill', 'grass'],
        hunts: ['sheep', 'deer'],
        diet: 'carnivore', maxHunger: 150,
        herdSize: 3, breedRate: 0.02
    },
    bear: {
        icon: '🐻', color: 0x8B4513, hp: 80, speed: 0.9,
        habitat: ['forest', 'hill'],
        hunts: ['sheep', 'deer', 'wolf'], // Apex predator
        diet: 'carnivore', maxHunger: 250,
        herdSize: 1, breedRate: 0.01
    },
    deer: {
        icon: '🦌', color: 0xC4A35A, hp: 25, speed: 1.3,
        habitat: ['forest', 'grass'],
        fleeFrom: ['wolf', 'bear', 'zombie'],
        diet: 'herbivore', maxHunger: 140,
        herdSize: 3, breedRate: 0.03
    },
    fish: {
        icon: '🐟', color: 0x6699cc, hp: 10, speed: 0.6,
        habitat: ['shallow_water'],
        diet: 'none', maxHunger: 100, // Fish just exist
        herdSize: 5, breedRate: 0.06
    },
    zombie: {
        icon: '🧟', color: 0x66CC66, hp: 30, speed: 0.7,
        habitat: [], // only spawned by plague
        hunts: [], 
        diet: 'none', maxHunger: 100,
        herdSize: 1, breedRate: 0.0 // don't breed, they multiply by infecting
    },
    dragon: {
        icon: '🐉', color: 0xCC3333, hp: 200, speed: 1.5,
        habitat: ['grass', 'hill', 'mountain', 'forest', 'sand', 'desert', 'lava'],
        hunts: ['sheep', 'deer', 'wolf', 'bear'],
        diet: 'carnivore', maxHunger: 300,
        herdSize: 1, breedRate: 0.005
    },
    // ─── NEW ANIMALS (WorldBox-inspired) ──────────────────────
    cow: {
        icon: '🐄', color: 0xF5F5DC, hp: 25, speed: 0.6,
        habitat: ['grass', 'hill'],
        fleeFrom: ['wolf', 'bear', 'lion'],
        diet: 'herbivore', maxHunger: 130,
        herdSize: 3, breedRate: 0.03
    },
    pig: {
        icon: '🐷', color: 0xFFB6C1, hp: 20, speed: 0.7,
        habitat: ['grass', 'forest', 'hill'],
        fleeFrom: ['wolf', 'bear', 'lion'],
        diet: 'herbivore', maxHunger: 110,
        herdSize: 3, breedRate: 0.035
    },
    rabbit: {
        icon: '🐰', color: 0xD2B48C, hp: 8, speed: 1.6,
        habitat: ['grass', 'forest', 'hill', 'sand'],
        fleeFrom: ['wolf', 'bear', 'fox', 'lion', 'snake'],
        diet: 'herbivore', maxHunger: 80,
        herdSize: 5, breedRate: 0.08
    },
    chicken: {
        icon: '🐔', color: 0xFFFFFF, hp: 5, speed: 0.9,
        habitat: ['grass', 'hill'],
        fleeFrom: ['wolf', 'fox', 'snake'],
        diet: 'herbivore', maxHunger: 60,
        herdSize: 4, breedRate: 0.06
    },
    fox: {
        icon: '🦊', color: 0xD2691E, hp: 25, speed: 1.4,
        habitat: ['forest', 'grass', 'hill'],
        hunts: ['sheep', 'rabbit', 'chicken'],
        diet: 'carnivore', maxHunger: 120,
        herdSize: 2, breedRate: 0.025
    },
    lion: {
        icon: '🦁', color: 0xDAA520, hp: 100, speed: 1.1,
        habitat: ['grass', 'hill', 'desert', 'sand'],
        hunts: ['sheep', 'deer', 'cow', 'pig', 'rabbit'],
        diet: 'carnivore', maxHunger: 200,
        herdSize: 1, breedRate: 0.008
    },
    crocodile: {
        icon: '🐊', color: 0x556B2F, hp: 60, speed: 0.7,
        habitat: ['shallow_water', 'swamp'],
        hunts: ['sheep', 'deer', 'pig', 'rabbit'],
        diet: 'carnivore', maxHunger: 200,
        herdSize: 1, breedRate: 0.01
    },
    snake: {
        icon: '🐍', color: 0x2E8B57, hp: 12, speed: 1.0,
        habitat: ['grass', 'forest', 'sand', 'desert', 'hill'],
        hunts: ['rabbit', 'chicken', 'rat'],
        diet: 'carnivore', maxHunger: 100,
        herdSize: 1, breedRate: 0.03
    },
    crab: {
        icon: '🦀', color: 0xFF6347, hp: 15, speed: 0.5,
        habitat: ['sand', 'shallow_water'],
        diet: 'none', maxHunger: 80,
        herdSize: 3, breedRate: 0.04
    },
    monkey: {
        icon: '🐒', color: 0x8B6914, hp: 18, speed: 1.3,
        habitat: ['forest', 'hill'],
        fleeFrom: ['wolf', 'bear', 'lion'],
        diet: 'herbivore', maxHunger: 100,
        herdSize: 4, breedRate: 0.03
    },
    rat: {
        icon: '🐀', color: 0x808080, hp: 5, speed: 1.2,
        habitat: ['grass', 'forest', 'hill', 'sand', 'dirt'],
        fleeFrom: ['wolf', 'fox', 'snake', 'bear'],
        diet: 'herbivore', maxHunger: 60,
        herdSize: 6, breedRate: 0.07
    },
    // ─── BOSS MONSTERS ─────────────────────────────────────────
    crabzilla: {
        icon: '🦀', color: 0xFF0000, hp: 500, speed: 0.8,
        habitat: ['grass', 'sand', 'hill', 'forest', 'dirt'],
        hunts: ['sheep', 'wolf', 'bear', 'deer', 'cow', 'pig', 'rabbit', 'lion'],
        diet: 'carnivore', maxHunger: 500,
        herdSize: 1, breedRate: 0.0
    },
    ufo: {
        icon: '🛸', color: 0xC0C0C0, hp: 400, speed: 2.0,
        habitat: ['grass', 'hill', 'mountain', 'forest', 'sand', 'desert', 'snow', 'swamp', 'dirt'],
        hunts: [],
        diet: 'none', maxHunger: 999,
        herdSize: 1, breedRate: 0.0
    },
    // ─── NEW MONSTERS ──────────────────────────────────────────────
    skeleton: {
        icon: '💀', color: 0xd4c5a9, hp: 80, speed: 0.6,
        habitat: ['snow', 'corrupted'],
        hunts: ['sheep', 'deer', 'rabbit', 'chicken', 'cow', 'pig'],
        diet: 'none', maxHunger: 200,
        herdSize: 3, breedRate: 0.0,
        hostile: true, undead: true, behavior: 'undead_wander', attack: 12
    },
    snowman: {
        icon: '⛄', color: 0xf0f0f0, hp: 100, speed: 0.3,
        habitat: ['snow', 'deep_snow', 'permafrost'],
        hunts: ['sheep', 'deer', 'rabbit'],
        diet: 'none', maxHunger: 200,
        herdSize: 1, breedRate: 0.0,
        hostile: true, behavior: 'ambush', attack: 8
    },
    evil_mage: {
        icon: '🧙', color: 0x6a0dad, hp: 60, speed: 0.5,
        habitat: ['corrupted', 'wasteland'],
        hunts: ['sheep', 'deer', 'rabbit', 'wolf'],
        diet: 'none', maxHunger: 150,
        herdSize: 1, breedRate: 0.0,
        hostile: true, ranged: true, behavior: 'mage', attack: 20, mana: 80
    },
    bandit: {
        icon: '🥷', color: 0x4a3728, hp: 90, speed: 0.8,
        habitat: ['grass', 'dirt', 'savanna'],
        hunts: ['sheep', 'deer', 'rabbit', 'chicken', 'cow', 'pig'],
        diet: 'none', maxHunger: 150,
        herdSize: 2, breedRate: 0.01,
        hostile: true, behavior: 'roamer', attack: 15
    },
    cold_one: {
        icon: '❄️', color: 0xa0c4e8, hp: 120, speed: 0.5,
        habitat: ['snow', 'ice', 'deep_snow'],
        hunts: ['sheep', 'deer', 'wolf', 'bear'],
        diet: 'none', maxHunger: 250,
        herdSize: 1, breedRate: 0.0,
        hostile: true, behavior: 'ambush', attack: 18
    },
    sand_spider: {
        icon: '🕸️', color: 0xc2b280, hp: 70, speed: 1.0,
        habitat: ['desert', 'savanna', 'wasteland'],
        hunts: ['rabbit', 'chicken', 'rat', 'sheep'],
        diet: 'carnivore', maxHunger: 150,
        herdSize: 1, breedRate: 0.015,
        hostile: true, behavior: 'ambush', attack: 14
    },
    worm: {
        icon: '🪱', color: 0x8b7355, hp: 150, speed: 0.4,
        habitat: ['desert', 'dirt', 'wasteland'],
        hunts: ['sheep', 'deer', 'cow', 'pig', 'wolf'],
        diet: 'carnivore', maxHunger: 300,
        herdSize: 1, breedRate: 0.005,
        hostile: true, behavior: 'burrow', attack: 22
    },
    crystal_golem: {
        icon: '💎', color: 0x9b59b6, hp: 200, speed: 0.2,
        habitat: ['crystal'],
        hunts: [],
        diet: 'none', maxHunger: 500,
        herdSize: 1, breedRate: 0.0,
        hostile: true, behavior: 'guard', attack: 25
    },
    slime: {
        icon: '🟢', color: 0x2ecc71, hp: 50, speed: 0.3,
        habitat: ['swamp', 'mushroom'],
        hunts: ['rabbit', 'chicken', 'rat'],
        diet: 'none', maxHunger: 100,
        herdSize: 2, breedRate: 0.02,
        hostile: true, behavior: 'wander', attack: 8, splitsOnDeath: true
    },
    // ─── SPECIAL BIOME CREATURES ────────────────────────────────────
    grey_goo: {
        icon: '🫧', color: 0x808080, hp: 30, speed: 1.2,
        habitat: ['wasteland', 'dirt'],
        hunts: [],
        diet: 'none', maxHunger: 100,
        herdSize: 3, breedRate: 0.04,
        hostile: true, behavior: 'consume', attack: 5, devoursLand: true
    },
    flaming_skull: {
        icon: '🔥', color: 0xff4400, hp: 40, speed: 1.0,
        habitat: ['infernal', 'lava'],
        hunts: ['sheep', 'deer', 'rabbit', 'wolf', 'bear'],
        diet: 'none', maxHunger: 100,
        herdSize: 2, breedRate: 0.01,
        hostile: true, behavior: 'fly', attack: 15, ignites: true, flying: true
    },
    ghost: {
        icon: '👻', color: 0xccddff, hp: 60, speed: 0.8,
        habitat: ['corrupted'],
        hunts: [],
        diet: 'none', maxHunger: 200,
        herdSize: 1, breedRate: 0.0,
        hostile: true, behavior: 'phase', attack: 12, phaseThrough: true, flying: true
    },
    gummy_bear: {
        icon: '🧸', color: 0xff69b4, hp: 80, speed: 0.6,
        habitat: ['candy'],
        hunts: [],
        diet: 'herbivore', maxHunger: 120,
        herdSize: 3, breedRate: 0.03,
        hostile: true, behavior: 'wander', attack: 10
    },
    gingerbread_man: {
        icon: '🍪', color: 0xd2691e, hp: 50, speed: 0.9,
        habitat: ['candy'],
        fleeFrom: ['wolf', 'bear', 'lion', 'skeleton', 'bandit'],
        diet: 'herbivore', maxHunger: 100,
        herdSize: 3, breedRate: 0.04,
        hostile: false, behavior: 'flee', attack: 8
    },
    // ─── NEW ANIMALS ────────────────────────────────────────────────
    piranha: {
        icon: '🐡', color: 0xcc3333, hp: 15, speed: 1.2,
        habitat: ['shallow_water'],
        hunts: ['fish'],
        diet: 'carnivore', maxHunger: 80,
        herdSize: 5, breedRate: 0.05,
        hostile: true, behavior: 'swarm', attack: 10, aquatic: true
    },
    rhino: {
        icon: '🦏', color: 0x696969, hp: 200, speed: 0.5,
        habitat: ['savanna', 'grass'],
        fleeFrom: ['dragon', 'crabzilla'],
        diet: 'herbivore', maxHunger: 250,
        herdSize: 1, breedRate: 0.008,
        hostile: false, behavior: 'charge', attack: 20, chargesWhenProvoked: true
    },
    hyena: {
        icon: '🐾', color: 0xbdb76b, hp: 60, speed: 0.9,
        habitat: ['savanna', 'desert'],
        hunts: ['sheep', 'rabbit', 'chicken', 'rat'],
        diet: 'carnivore', maxHunger: 150,
        herdSize: 3, breedRate: 0.02,
        hostile: true, behavior: 'pack', attack: 12, packSize: 3
    },
    bee: {
        icon: '🐝', color: 0xffd700, hp: 10, speed: 1.5,
        habitat: ['flower_meadow', 'grass'],
        fleeFrom: ['bear'],
        diet: 'herbivore', maxHunger: 60,
        herdSize: 5, breedRate: 0.06,
        hostile: false, behavior: 'pollinate', attack: 5, swarmsWhenProvoked: true
    },
    cat: {
        icon: '🐱', color: 0xff9933, hp: 30, speed: 1.0,
        habitat: ['grass', 'sand'],
        hunts: ['rat', 'snake'],
        fleeFrom: ['wolf', 'bear', 'lion'],
        diet: 'carnivore', maxHunger: 80,
        herdSize: 2, breedRate: 0.03,
        hostile: false, behavior: 'pet', attack: 8, happinessBoost: 5
    },
    dog: {
        icon: '🐕', color: 0x8B4513, hp: 50, speed: 0.9,
        habitat: ['grass', 'savanna'],
        hunts: ['rabbit', 'rat', 'snake'],
        fleeFrom: ['wolf', 'bear', 'lion', 'dragon'],
        diet: 'carnivore', maxHunger: 120,
        herdSize: 2, breedRate: 0.02,
        hostile: false, behavior: 'guard', attack: 10, guardsSettlement: true
    }
};

let nextAnimalId = 100000;

export class AnimalSystem {
    constructor() {
        /** @type {Map<number, object>} */
        this.animals = new Map();
        this.spawnCooldown = 0;
    }

    update(gameState, tick) {
        const { worldMap } = gameState;
        const laws = gameState.worldLawsSystem;

        // Every 10 ticks, process animal behavior
        if (tick % 10 !== 0) return;

        // Auto-spawn if few animals
        if (tick % 100 === 0 && this.animals.size < 60) {
            this.spawnRandomAnimals(worldMap, 5);
        }

        // Age of Dark rapidly increases monster counts
        if (gameState.currentAgeId === 'dark') {
            if (tick % 40 === 0 && this.animals.size < 120) {
                // Spawn pure predators in the dark
                this.spawnRandomOfType(worldMap, 'wolf');
                if (Math.random() < 0.3) this.spawnRandomOfType(worldMap, 'bear');
            }
        }

        // ─── BIOME-SPECIFIC NATURAL SPAWNING ──────────────────────────
        if (tick % 200 === 0 && this.animals.size < 80) {
            this.spawnBiomeCreatures(worldMap);
        }

        const toRemove = [];

        for (const [id, animal] of this.animals) {
            if (!animal.alive) {
                toRemove.push(id);
                continue;
            }

            const info = ANIMAL_TYPES[animal.type];
            if (!info) continue;

            // Check for flee targets
            if (info.fleeFrom) {
                const predator = this.findNearby(animal, info.fleeFrom, 6);
                if (predator) {
                    // Flee away
                    const dx = animal.tileX - predator.tileX;
                    const dy = animal.tileY - predator.tileY;
                    const fx = Math.max(0, Math.min(worldMap.width - 1, animal.tileX + Math.sign(dx) * 5));
                    const fy = Math.max(0, Math.min(worldMap.height - 1, animal.tileY + Math.sign(dy) * 5));
                    if (worldMap.isWalkable(fx, fy)) {
                        animal.targetX = fx;
                        animal.targetY = fy;
                    }
                    continue;
                }
            }

            // Hunting behavior (Animal vs Animal)
            // Carnivores are more likely to hunt if they are hungry.
            const isHungryCarnivore = info.diet === 'carnivore' && animal.hunger < info.maxHunger * 0.8;
            if (laws.isEnabled('predator_prey') && info.hunts && (isHungryCarnivore || animal.type === 'zombie')) {
                const searchRange = isHungryCarnivore ? 12 : 6;
                const prey = this.findNearbyByType(animal, info.hunts, searchRange);
                if (prey) {
                    const dist = Math.abs(animal.tileX - prey.tileX) + Math.abs(animal.tileY - prey.tileY);
                    if (dist <= 1) {
                        // Attack
                        prey.hp -= (animal.type === 'bear' ? 25 : 15);
                        if (prey.hp <= 0) {
                            prey.alive = false;
                            
                            // Carnivores eat their prey
                            if (info.diet === 'carnivore') {
                                animal.hunger = info.maxHunger; // Full hunger restored
                                animal.hp = Math.min(animal.maxHp, animal.hp + 20); // Heal from eating
                            }

                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'blood', x: prey.tileX, y: prey.tileY, radius: 1 });
                            }
                        }
                    } else {
                        animal.targetX = prey.tileX;
                        animal.targetY = prey.tileY;
                    }
                    continue;
                }
            }

            // Age of Dark: Predators assault civilization | Zombies ALWAYS assault
            if ((gameState.currentAgeId === 'dark' && (animal.type === 'wolf' || animal.type === 'bear')) || animal.type === 'zombie') {
                let nearestVictim = null;
                let nearestDist = 100; // range 10
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx*dx + dy*dy;
                    if (d < nearestDist && e.state !== 'dead') {
                        nearestDist = d;
                        nearestVictim = e;
                    }
                }
                
                if (nearestVictim) {
                    if (nearestDist <= 2) {
                        // Vicious attack!
                        nearestVictim.hp -= (animal.type === 'zombie' ? 5 : 15);
                        
                        // Zombie Bite: Chance to infect
                        if (animal.type === 'zombie' && Math.random() < 0.3 && !nearestVictim.traits.includes('immune') && !nearestVictim.traits.includes('infected')) {
                            // Import addTrait dynamically or assume it's done via modifying Traits array directly (to avoid circular deps if needed). 
                            // Since AnimalSystem already imports applyTraits, we can just push it:
                            nearestVictim.traits.push('infected');
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'poison', x: nearestVictim.tileX, y: nearestVictim.tileY, radius: 2 });
                            }
                        }

                        if (nearestVictim.hp <= 0) {
                            nearestVictim.alive = false;
                            nearestVictim.state = 'dead';
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'blood', x: nearestVictim.tileX, y: nearestVictim.tileY, radius: 2 });
                            }
                        }
                    } else {
                        animal.targetX = nearestVictim.tileX;
                        animal.targetY = nearestVictim.tileY;
                    }
                    continue; // Skip wandering, focused on hunting
                }
            }

            // Dragon: apex predator that hunts animals AND attacks civilization
            if (animal.type === 'dragon') {
                // 1. Hunt animals first
                let dragonPrey = this.findNearby(animal, ['sheep', 'deer', 'wolf', 'bear', 'zombie'], 10);
                if (dragonPrey) {
                    const dist = Math.abs(animal.tileX - dragonPrey.tileX) + Math.abs(animal.tileY - dragonPrey.tileY);
                    if (dist <= 2) {
                        // Dragon fire breath attack
                        dragonPrey.hp -= 40;
                        // Set fire on prey's tile
                        worldMap.fireTiles.add(`${dragonPrey.tileX},${dragonPrey.tileY}`);
                        if (gameState.visualEvents) {
                            gameState.visualEvents.push({ type: 'fire', x: dragonPrey.tileX, y: dragonPrey.tileY });
                        }
                        if (dragonPrey.hp <= 0) {
                            dragonPrey.alive = false;
                            animal.hunger = info.maxHunger;
                            animal.hp = Math.min(animal.maxHp, animal.hp + 30);
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'blood', x: dragonPrey.tileX, y: dragonPrey.tileY, radius: 1 });
                            }
                        }
                    } else {
                        animal.targetX = dragonPrey.tileX;
                        animal.targetY = dragonPrey.tileY;
                    }
                    continue;
                }

                // 2. Attack civilization entities
                let nearestEntity = null;
                let nearestEntityDist = 100;
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx * dx + dy * dy;
                    if (d < nearestEntityDist) {
                        nearestEntityDist = d;
                        nearestEntity = e;
                    }
                }
                if (nearestEntity && nearestEntityDist <= 64) { // range 8
                    const dist = Math.abs(animal.tileX - nearestEntity.tileX) + Math.abs(animal.tileY - nearestEntity.tileY);
                    if (dist <= 2) {
                        nearestEntity.hp -= 35;
                        // Dragon fire breath
                        worldMap.fireTiles.add(`${nearestEntity.tileX},${nearestEntity.tileY}`);
                        if (gameState.visualEvents) {
                            gameState.visualEvents.push({ type: 'fire', x: nearestEntity.tileX, y: nearestEntity.tileY });
                        }
                        // Destroy buildings
                        if (Math.random() < 0.5) {
                            worldMap.removeBuilding(nearestEntity.tileX, nearestEntity.tileY);
                        }
                        if (nearestEntity.hp <= 0) {
                            nearestEntity.alive = false;
                            nearestEntity.state = 'dead';
                            worldMap.removeEntityAt(nearestEntity.tileX, nearestEntity.tileY, nearestEntity.id);
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'blood', x: nearestEntity.tileX, y: nearestEntity.tileY, radius: 2 });
                            }
                        }
                        if (gameState.historySystem) {
                            gameState.historySystem.logEvent(
                                'disaster',
                                `Rồng tấn công tại (${animal.tileX}, ${animal.tileY})`,
                                { type: 'dragon_attack', x: animal.tileX, y: animal.tileY }
                            );
                        }
                    } else {
                        animal.targetX = nearestEntity.tileX;
                        animal.targetY = nearestEntity.tileY;
                    }
                    continue;
                }
            }

            // Crabzilla: destroys everything in its path
            if (animal.type === 'crabzilla') {
                // 1. Hunt any nearby animal
                let cPrey = this.findNearby(animal, Object.keys(ANIMAL_TYPES).filter(t => t !== 'crabzilla' && t !== 'dragon'), 12);
                if (cPrey) {
                    const dist = Math.abs(animal.tileX - cPrey.tileX) + Math.abs(animal.tileY - cPrey.tileY);
                    if (dist <= 2) {
                        cPrey.hp -= 60;
                        if (cPrey.hp <= 0) {
                            cPrey.alive = false;
                            animal.hunger = info.maxHunger;
                            animal.hp = Math.min(animal.maxHp, animal.hp + 50);
                        }
                    } else {
                        animal.targetX = cPrey.tileX;
                        animal.targetY = cPrey.tileY;
                    }
                    continue;
                }

                // 2. Attack civilization — destroy buildings and kill units
                let cTarget = null;
                let cTargetDist = 144; // range 12
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx * dx + dy * dy;
                    if (d < cTargetDist) { cTargetDist = d; cTarget = e; }
                }
                if (cTarget) {
                    const dist = Math.abs(animal.tileX - cTarget.tileX) + Math.abs(animal.tileY - cTarget.tileY);
                    if (dist <= 2) {
                        cTarget.hp -= 50;
                        // Destroy buildings on impact
                        worldMap.removeBuilding(cTarget.tileX, cTarget.tileY);
                        if (gameState.visualEvents) {
                            gameState.visualEvents.push({ type: 'blood', x: cTarget.tileX, y: cTarget.tileY, radius: 2 });
                        }
                        if (cTarget.hp <= 0) {
                            cTarget.alive = false;
                            cTarget.state = 'dead';
                            worldMap.removeEntityAt(cTarget.tileX, cTarget.tileY, cTarget.id);
                        }
                    } else {
                        animal.targetX = cTarget.tileX;
                        animal.targetY = cTarget.tileY;
                    }
                    continue;
                }

                // 3. Stomp — damage tiles underfoot
                if (Math.random() < 0.3) {
                    const tile = worldMap.getTile(animal.tileX, animal.tileY);
                    if (tile === 'forest' || tile === 'grass') {
                        worldMap.setTile(animal.tileX, animal.tileY, 'dirt');
                        if (!gameState.dirtyTiles) gameState.dirtyTiles = [];
                        gameState.dirtyTiles.push({ x: animal.tileX, y: animal.tileY });
                        if (gameState.historySystem) {
                            gameState.historySystem.logEvent(
                                'disaster',
                                `Crabzilla giẫm đạp tại (${animal.tileX}, ${animal.tileY})`,
                                { type: 'crabzilla', x: animal.tileX, y: animal.tileY }
                            );
                        }
                    }
                }
            }

            // UFO: abducts civilization units
            if (animal.type === 'ufo') {
                let ufoTarget = null;
                let ufoTargetDist = 196; // range 14
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx * dx + dy * dy;
                    if (d < ufoTargetDist) { ufoTargetDist = d; ufoTarget = e; }
                }
                if (ufoTarget) {
                    const dist = Math.abs(animal.tileX - ufoTarget.tileX) + Math.abs(animal.tileY - ufoTarget.tileY);
                    if (dist <= 2) {
                        // Abduct: teleport victim to random location and damage
                        ufoTarget.hp -= 50;
                        if (gameState.visualEvents) {
                            gameState.visualEvents.push({ type: 'ufo_beam', x: animal.tileX, y: animal.tileY, tx: ufoTarget.tileX, ty: ufoTarget.tileY });
                        }
                        // Teleport victim to random position
                        const rndX = Math.floor(Math.random() * worldMap.width);
                        const rndY = Math.floor(Math.random() * worldMap.height);
                        if (worldMap.isWalkable(rndX, rndY)) {
                            worldMap.removeEntityAt(ufoTarget.tileX, ufoTarget.tileY, ufoTarget.id);
                            ufoTarget.tileX = rndX;
                            ufoTarget.tileY = rndY;
                            const px = worldMap.tileToPixel(rndX, rndY);
                            ufoTarget.x = px.x;
                            ufoTarget.y = px.y;
                            worldMap.addEntityAt(rndX, rndY, ufoTarget.id);
                        }
                        if (ufoTarget.hp <= 0) {
                            ufoTarget.alive = false;
                            ufoTarget.state = 'dead';
                            worldMap.removeEntityAt(ufoTarget.tileX, ufoTarget.tileY, ufoTarget.id);
                        }
                    } else {
                        animal.targetX = ufoTarget.tileX;
                        animal.targetY = ufoTarget.tileY;
                    }
                    continue;
                }
            }

            // ─── NEW CREATURE AI BEHAVIORS ──────────────────────────────
            const behavior = info.behavior;
            const atk = info.attack || 10;

            // undead_wander: Like zombie but faster, seeks living creatures
            if (behavior === 'undead_wander') {
                let nearestVictim = null;
                let nearestDist = 100;
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx*dx + dy*dy;
                    if (d < nearestDist && e.state !== 'dead') {
                        nearestDist = d;
                        nearestVictim = e;
                    }
                }
                // Also hunt living animals
                if (!nearestVictim) {
                    const livingTypes = ['sheep', 'deer', 'cow', 'pig', 'rabbit', 'chicken'];
                    nearestVictim = this.findNearby(animal, livingTypes, 8);
                    if (nearestVictim) nearestDist = (animal.tileX - nearestVictim.tileX)**2 + (animal.tileY - nearestVictim.tileY)**2;
                }
                if (nearestVictim) {
                    const dist = Math.abs(animal.tileX - nearestVictim.tileX) + Math.abs(animal.tileY - nearestVictim.tileY);
                    if (dist <= 1) {
                        if (nearestVictim.hp !== undefined) {
                            nearestVictim.hp -= atk;
                            if (nearestVictim.hp <= 0) {
                                nearestVictim.alive = false;
                                if (nearestVictim.state) nearestVictim.state = 'dead';
                                if (gameState.visualEvents) {
                                    gameState.visualEvents.push({ type: 'blood', x: nearestVictim.tileX, y: nearestVictim.tileY, radius: 1 });
                                }
                            }
                        }
                    } else {
                        animal.targetX = nearestVictim.tileX;
                        animal.targetY = nearestVictim.tileY;
                    }
                    continue;
                }
            }

            // ambush: Stays still until entity within 3 tiles, then attacks
            if (behavior === 'ambush') {
                if (animal._ambushHidden === undefined) animal._ambushHidden = true;
                let nearestTarget = null;
                let nearestDist = 9; // 3 tiles
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx*dx + dy*dy;
                    if (d < nearestDist) { nearestDist = d; nearestTarget = e; }
                }
                // Also detect nearby animals
                const preyList = info.hunts || [];
                if (!nearestTarget && preyList.length > 0) {
                    nearestTarget = this.findNearby(animal, preyList, 3);
                    if (nearestTarget) nearestDist = (animal.tileX - nearestTarget.tileX)**2 + (animal.tileY - nearestTarget.tileY)**2;
                }
                if (nearestTarget) {
                    animal._ambushHidden = false;
                    const dist = Math.abs(animal.tileX - nearestTarget.tileX) + Math.abs(animal.tileY - nearestTarget.tileY);
                    if (dist <= 1) {
                        if (nearestTarget.hp !== undefined) {
                            nearestTarget.hp -= atk;
                            if (nearestTarget.hp <= 0) {
                                nearestTarget.alive = false;
                                if (nearestTarget.state) nearestTarget.state = 'dead';
                                if (gameState.visualEvents) {
                                    gameState.visualEvents.push({ type: 'blood', x: nearestTarget.tileX, y: nearestTarget.tileY, radius: 1 });
                                }
                            }
                        }
                    } else {
                        animal.targetX = nearestTarget.tileX;
                        animal.targetY = nearestTarget.tileY;
                    }
                    continue;
                } else {
                    animal._ambushHidden = true;
                }
            }

            // mage: Keeps distance, casts spells at targets
            if (behavior === 'mage') {
                let nearestTarget = null;
                let nearestDist = 64; // range 8
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx*dx + dy*dy;
                    if (d < nearestDist) { nearestDist = d; nearestTarget = e; }
                }
                if (!nearestTarget && info.hunts && info.hunts.length > 0) {
                    nearestTarget = this.findNearby(animal, info.hunts, 8);
                    if (nearestTarget) nearestDist = (animal.tileX - nearestTarget.tileX)**2 + (animal.tileY - nearestTarget.tileY)**2;
                }
                if (nearestTarget) {
                    const dist = Math.abs(animal.tileX - nearestTarget.tileX) + Math.abs(animal.tileY - nearestTarget.tileY);
                    if (dist <= 3) {
                        // Cast spell — ranged attack
                        if (nearestTarget.hp !== undefined) {
                            nearestTarget.hp -= atk;
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'spell', x: animal.tileX, y: animal.tileY, tx: nearestTarget.tileX, ty: nearestTarget.tileY, vfxType: 'projectile', color: 0x9b59b6 });
                            }
                            if (nearestTarget.hp <= 0) {
                                nearestTarget.alive = false;
                                if (nearestTarget.state) nearestTarget.state = 'dead';
                                if (gameState.visualEvents) {
                                    gameState.visualEvents.push({ type: 'blood', x: nearestTarget.tileX, y: nearestTarget.tileY, radius: 1 });
                                }
                            }
                        }
                        // Flee to maintain distance
                        const fdx = animal.tileX - nearestTarget.tileX;
                        const fdy = animal.tileY - nearestTarget.tileY;
                        const fx = Math.max(0, Math.min(worldMap.width - 1, animal.tileX + Math.sign(fdx) * 4));
                        const fy = Math.max(0, Math.min(worldMap.height - 1, animal.tileY + Math.sign(fdy) * 4));
                        if (worldMap.isWalkable(fx, fy)) {
                            animal.targetX = fx;
                            animal.targetY = fy;
                        }
                    } else {
                        // Move closer to casting range
                        animal.targetX = nearestTarget.tileX;
                        animal.targetY = nearestTarget.tileY;
                    }
                    continue;
                }
            }

            // roamer: Wanders randomly, attacks weak targets
            if (behavior === 'roamer') {
                let weakTarget = null;
                let weakDist = 36; // range 6
                for (const e of gameState.entityManager.getAllAlive()) {
                    if (e.hp > 50) continue; // Only attack weak targets
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx*dx + dy*dy;
                    if (d < weakDist) { weakDist = d; weakTarget = e; }
                }
                if (!weakTarget && info.hunts) {
                    weakTarget = this.findNearby(animal, info.hunts, 6);
                    if (weakTarget) weakDist = (animal.tileX - weakTarget.tileX)**2 + (animal.tileY - weakTarget.tileY)**2;
                }
                if (weakTarget) {
                    const dist = Math.abs(animal.tileX - weakTarget.tileX) + Math.abs(animal.tileY - weakTarget.tileY);
                    if (dist <= 1) {
                        if (weakTarget.hp !== undefined) {
                            weakTarget.hp -= atk;
                            if (weakTarget.hp <= 0) {
                                weakTarget.alive = false;
                                if (weakTarget.state) weakTarget.state = 'dead';
                                if (gameState.visualEvents) {
                                    gameState.visualEvents.push({ type: 'blood', x: weakTarget.tileX, y: weakTarget.tileY, radius: 1 });
                                }
                            }
                        }
                    } else {
                        animal.targetX = weakTarget.tileX;
                        animal.targetY = weakTarget.tileY;
                    }
                    continue;
                }
            }

            // burrow: Invisible underground, surfaces to attack, re-burrows
            if (behavior === 'burrow') {
                if (animal._burrowed === undefined) animal._burrowed = false;
                if (animal._burrowTimer === undefined) animal._burrowTimer = 0;

                if (animal._burrowed) {
                    animal._burrowTimer--;
                    if (animal._burrowTimer <= 0) {
                        // Surface near a target
                        let surfTarget = null;
                        let surfDist = 64;
                        for (const e of gameState.entityManager.getAllAlive()) {
                            const dx = e.tileX - animal.tileX;
                            const dy = e.tileY - animal.tileY;
                            const d = dx*dx + dy*dy;
                            if (d < surfDist) { surfDist = d; surfTarget = e; }
                        }
                        if (surfTarget) {
                            const sx = Math.max(0, Math.min(worldMap.width-1, surfTarget.tileX + Math.floor(Math.random()*3)-1));
                            const sy = Math.max(0, Math.min(worldMap.height-1, surfTarget.tileY + Math.floor(Math.random()*3)-1));
                            if (worldMap.isWalkable(sx, sy)) {
                                animal.tileX = sx;
                                animal.tileY = sy;
                                const pixel = worldMap.tileToPixel(sx, sy);
                                animal.x = pixel.x;
                                animal.y = pixel.y;
                            }
                        }
                        animal._burrowed = false;
                        animal._burrowTimer = 0;
                    }
                    continue;
                } else {
                    // Surfaced — attack nearby target
                    let bTarget = null;
                    let bDist = 4;
                    for (const e of gameState.entityManager.getAllAlive()) {
                        const dx = e.tileX - animal.tileX;
                        const dy = e.tileY - animal.tileY;
                        const d = dx*dx + dy*dy;
                        if (d < bDist) { bDist = d; bTarget = e; }
                    }
                    if (!bTarget && info.hunts && info.hunts.length > 0) {
                        bTarget = this.findNearby(animal, info.hunts, 2);
                    }
                    if (bTarget) {
                        if (bTarget.hp !== undefined) {
                            bTarget.hp -= atk;
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'blood', x: bTarget.tileX, y: bTarget.tileY, radius: 1 });
                            }
                            if (bTarget.hp <= 0) {
                                bTarget.alive = false;
                                if (bTarget.state) bTarget.state = 'dead';
                                if (info.diet === 'carnivore') {
                                    animal.hunger = info.maxHunger;
                                    animal.hp = Math.min(animal.maxHp, animal.hp + 20);
                                }
                            }
                        }
                    }
                    // Re-burrow after a few ticks on surface
                    animal._burrowTimer++;
                    if (animal._burrowTimer > 3 || !bTarget) {
                        animal._burrowed = true;
                        animal._burrowTimer = 5 + Math.floor(Math.random() * 5);
                    }
                    continue;
                }
            }

            // guard (crystal_golem): Stays near spawn point, attacks anything within range
            if (behavior === 'guard' && animal.type === 'crystal_golem') {
                if (animal._spawnX === undefined) { animal._spawnX = animal.tileX; animal._spawnY = animal.tileY; }
                let gTarget = null;
                let gDist = 25; // range 5
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx*dx + dy*dy;
                    if (d < gDist) { gDist = d; gTarget = e; }
                }
                if (gTarget) {
                    const dist = Math.abs(animal.tileX - gTarget.tileX) + Math.abs(animal.tileY - gTarget.tileY);
                    if (dist <= 1) {
                        gTarget.hp -= atk;
                        if (gTarget.hp <= 0) {
                            gTarget.alive = false;
                            if (gTarget.state) gTarget.state = 'dead';
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'blood', x: gTarget.tileX, y: gTarget.tileY, radius: 1 });
                            }
                        }
                    } else {
                        animal.targetX = gTarget.tileX;
                        animal.targetY = gTarget.tileY;
                    }
                    continue;
                } else {
                    // Return to spawn point
                    if (Math.abs(animal.tileX - animal._spawnX) > 3 || Math.abs(animal.tileY - animal._spawnY) > 3) {
                        animal.targetX = animal._spawnX;
                        animal.targetY = animal._spawnY;
                    }
                }
            }

            // consume (grey_goo): Moves over land, converts tiles
            if (behavior === 'consume') {
                // Convert current tile to deep_water / devour it
                const curTile = worldMap.getTile(animal.tileX, animal.tileY);
                if (curTile !== 'deep_water' && curTile !== 'shallow_water' && curTile !== 'lava') {
                    worldMap.setTile(animal.tileX, animal.tileY, 'deep_water');
                    if (!gameState.dirtyTiles) gameState.dirtyTiles = [];
                    gameState.dirtyTiles.push({ x: animal.tileX, y: animal.tileY });
                    if (gameState.visualEvents) {
                        gameState.visualEvents.push({ type: 'poison', x: animal.tileX, y: animal.tileY, radius: 1 });
                    }
                    // Heal from consuming
                    animal.hp = Math.min(animal.maxHp, animal.hp + 2);
                }
                // Move randomly to consume more
                if (Math.random() < 0.5) {
                    const dx = Math.floor(Math.random() * 3) - 1;
                    const dy = Math.floor(Math.random() * 3) - 1;
                    const nx = Math.max(0, Math.min(worldMap.width - 1, animal.tileX + dx));
                    const ny = Math.max(0, Math.min(worldMap.height - 1, animal.tileY + dy));
                    animal.tileX = nx;
                    animal.tileY = ny;
                    const pixel = worldMap.tileToPixel(nx, ny);
                    animal.x = pixel.x;
                    animal.y = pixel.y;
                }
                // Replicate when health is high
                if (animal.hp > animal.maxHp * 0.9 && Math.random() < 0.1 && this.countByType('grey_goo') < 30) {
                    this.spawnNear(worldMap, 'grey_goo', animal.tileX, animal.tileY);
                }
                continue;
            }

            // fly (flaming_skull): Ignores terrain, ignites tiles
            if (behavior === 'fly' && info.flying) {
                let flyTarget = null;
                let flyDist = 36;
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx*dx + dy*dy;
                    if (d < flyDist) { flyDist = d; flyTarget = e; }
                }
                if (!flyTarget && info.hunts && info.hunts.length > 0) {
                    flyTarget = this.findNearby(animal, info.hunts, 6);
                    if (flyTarget) flyDist = (animal.tileX - flyTarget.tileX)**2 + (animal.tileY - flyTarget.tileY)**2;
                }
                if (flyTarget) {
                    const dist = Math.abs(animal.tileX - flyTarget.tileX) + Math.abs(animal.tileY - flyTarget.tileY);
                    if (dist <= 1) {
                        if (flyTarget.hp !== undefined) {
                            flyTarget.hp -= atk;
                            if (flyTarget.hp <= 0) {
                                flyTarget.alive = false;
                                if (flyTarget.state) flyTarget.state = 'dead';
                            }
                        }
                    } else {
                        animal.targetX = flyTarget.tileX;
                        animal.targetY = flyTarget.tileY;
                    }
                }
                // Ignite current tile
                if (info.ignites && Math.random() < 0.3) {
                    const tile = worldMap.getTile(animal.tileX, animal.tileY);
                    if (tile === 'grass' || tile === 'forest') {
                        worldMap.fireTiles.add(`${animal.tileX},${animal.tileY}`);
                        if (gameState.visualEvents) {
                            gameState.visualEvents.push({ type: 'fire', x: animal.tileX, y: animal.tileY });
                        }
                    }
                }
                // Move ignoring terrain
                if (Math.random() < 0.4) {
                    const dx = Math.floor(Math.random() * 5) - 2;
                    const dy = Math.floor(Math.random() * 5) - 2;
                    const nx = Math.max(0, Math.min(worldMap.width - 1, animal.tileX + dx));
                    const ny = Math.max(0, Math.min(worldMap.height - 1, animal.tileY + dy));
                    animal.tileX = nx;
                    animal.tileY = ny;
                    const pixel = worldMap.tileToPixel(nx, ny);
                    animal.x = pixel.x;
                    animal.y = pixel.y;
                }
                continue;
            }

            // phase (ghost): Ignores terrain and entities, passes through
            if (behavior === 'phase' && info.phaseThrough) {
                let phTarget = null;
                let phDist = 25;
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx*dx + dy*dy;
                    if (d < phDist) { phDist = d; phTarget = e; }
                }
                if (phTarget) {
                    const dist = Math.abs(animal.tileX - phTarget.tileX) + Math.abs(animal.tileY - phTarget.tileY);
                    if (dist <= 1) {
                        phTarget.hp -= atk;
                        if (gameState.visualEvents) {
                            gameState.visualEvents.push({ type: 'poison', x: phTarget.tileX, y: phTarget.tileY, radius: 1 });
                        }
                        if (phTarget.hp <= 0) {
                            phTarget.alive = false;
                            if (phTarget.state) phTarget.state = 'dead';
                        }
                    } else {
                        animal.targetX = phTarget.tileX;
                        animal.targetY = phTarget.tileY;
                    }
                }
                // Phase movement — ignores terrain
                if (Math.random() < 0.4) {
                    const dx = Math.floor(Math.random() * 5) - 2;
                    const dy = Math.floor(Math.random() * 5) - 2;
                    const nx = Math.max(0, Math.min(worldMap.width - 1, animal.tileX + dx));
                    const ny = Math.max(0, Math.min(worldMap.height - 1, animal.tileY + dy));
                    animal.tileX = nx;
                    animal.tileY = ny;
                    const pixel = worldMap.tileToPixel(nx, ny);
                    animal.x = pixel.x;
                    animal.y = pixel.y;
                }
                continue;
            }

            // swarm (piranha): Groups up, attacks in coordination
            if (behavior === 'swarm') {
                // Find nearby swarm members and a target
                const swarmMates = [];
                for (const [, other] of this.animals) {
                    if (!other.alive || other.id === animal.id) continue;
                    if (other.type === animal.type) {
                        const d = Math.abs(other.tileX - animal.tileX) + Math.abs(other.tileY - animal.tileY);
                        if (d <= 8) swarmMates.push(other);
                    }
                }
                // Attack nearby non-fish entities in water
                let sTarget = this.findNearby(animal, ['fish'], 4);
                if (!sTarget) {
                    for (const e of gameState.entityManager.getAllAlive()) {
                        const d = Math.abs(e.tileX - animal.tileX) + Math.abs(e.tileY - animal.tileY);
                        if (d <= 2) { sTarget = e; break; }
                    }
                }
                if (sTarget) {
                    const dist = Math.abs(animal.tileX - sTarget.tileX) + Math.abs(animal.tileY - sTarget.tileY);
                    if (dist <= 1) {
                        sTarget.hp -= atk;
                        // Swarm bonus: extra damage per nearby swarm mate
                        sTarget.hp -= Math.min(swarmMates.length, 3) * 3;
                        if (sTarget.hp <= 0) {
                            sTarget.alive = false;
                            if (sTarget.state) sTarget.state = 'dead';
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'blood', x: sTarget.tileX, y: sTarget.tileY, radius: 1 });
                            }
                            animal.hunger = info.maxHunger;
                        }
                    } else {
                        animal.targetX = sTarget.tileX;
                        animal.targetY = sTarget.tileY;
                    }
                    continue;
                }
                // Otherwise move toward swarm center
                if (swarmMates.length > 0) {
                    let cx = animal.tileX, cy = animal.tileY;
                    for (const m of swarmMates) { cx += m.tileX; cy += m.tileY; }
                    cx = Math.round(cx / (swarmMates.length + 1));
                    cy = Math.round(cy / (swarmMates.length + 1));
                    animal.targetX = cx;
                    animal.targetY = cy;
                }
            }

            // charge (rhino): Runs fast when provoked
            if (behavior === 'charge') {
                if (animal._charging === undefined) animal._charging = false;
                if (animal._chargeTarget === undefined) animal._chargeTarget = null;
                // Get provoked if attacked or if predator nearby
                if (!animal._charging) {
                    const predators = ['wolf', 'bear', 'lion', 'dragon', 'bandit', 'skeleton'];
                    const provoker = this.findNearby(animal, predators, 4);
                    if (provoker) {
                        animal._charging = true;
                        animal._chargeTarget = provoker;
                    }
                }
                if (animal._charging && animal._chargeTarget) {
                    const ct = animal._chargeTarget;
                    if (!ct.alive) { animal._charging = false; animal._chargeTarget = null; }
                    else {
                        const dist = Math.abs(animal.tileX - ct.tileX) + Math.abs(animal.tileY - ct.tileY);
                        if (dist <= 1) {
                            ct.hp -= atk * 2; // Double damage charge
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'blood', x: ct.tileX, y: ct.tileY, radius: 2 });
                            }
                            if (ct.hp <= 0) {
                                ct.alive = false;
                                if (ct.state) ct.state = 'dead';
                            }
                            animal._charging = false;
                            animal._chargeTarget = null;
                        } else {
                            // Charge toward target — move 2 tiles at once
                            animal.targetX = ct.tileX;
                            animal.targetY = ct.tileY;
                            const cdx = Math.sign(ct.tileX - animal.tileX);
                            const cdy = Math.sign(ct.tileY - animal.tileY);
                            const cnx = Math.max(0, Math.min(worldMap.width-1, animal.tileX + cdx * 2));
                            const cny = Math.max(0, Math.min(worldMap.height-1, animal.tileY + cdy * 2));
                            if (worldMap.isWalkable(cnx, cny)) {
                                animal.tileX = cnx;
                                animal.tileY = cny;
                                const pixel = worldMap.tileToPixel(cnx, cny);
                                animal.x = pixel.x;
                                animal.y = pixel.y;
                            }
                        }
                        continue;
                    }
                }
            }

            // pack (hyena): Coordinates attacks with pack
            if (behavior === 'pack') {
                // Find pack members nearby
                const packMates = [];
                for (const [, other] of this.animals) {
                    if (!other.alive || other.id === animal.id || other.type !== animal.type) continue;
                    const d = Math.abs(other.tileX - animal.tileX) + Math.abs(other.tileY - animal.tileY);
                    if (d <= 10) packMates.push(other);
                }
                // Hunt together
                if (info.hunts && info.hunts.length > 0) {
                    const packPrey = this.findNearby(animal, info.hunts, packMates.length > 0 ? 10 : 6);
                    if (packPrey) {
                        const dist = Math.abs(animal.tileX - packPrey.tileX) + Math.abs(animal.tileY - packPrey.tileY);
                        if (dist <= 1) {
                            packPrey.hp -= atk;
                            if (packPrey.hp <= 0) {
                                packPrey.alive = false;
                                animal.hunger = info.maxHunger;
                                animal.hp = Math.min(animal.maxHp, animal.hp + 15);
                                if (gameState.visualEvents) {
                                    gameState.visualEvents.push({ type: 'blood', x: packPrey.tileX, y: packPrey.tileY, radius: 1 });
                                }
                            }
                        } else {
                            animal.targetX = packPrey.tileX;
                            animal.targetY = packPrey.tileY;
                            // Signal pack to converge
                            for (const pm of packMates) {
                                pm.targetX = packPrey.tileX;
                                pm.targetY = packPrey.tileY;
                            }
                        }
                        continue;
                    }
                }
            }

            // pollinate (bee): Wanders between flowers, boosts crop growth
            if (behavior === 'pollinate') {
                // Boost nearby farm plots
                for (const settlement of gameState.settlementManager.getAll()) {
                    if (!settlement.farmPlots) continue;
                    for (const plot of settlement.farmPlots) {
                        const d = Math.abs(plot.x - animal.tileX) + Math.abs(plot.y - animal.tileY);
                        if (d <= 3 && plot.state === 'growing') {
                            if (plot.growthProgress !== undefined) plot.growthProgress += 2;
                        }
                    }
                }
                // Swarm when provoked
                if (!animal._provoked) {
                    const threats = ['bear', 'wolf'];
                    const threat = this.findNearby(animal, threats, 3);
                    if (threat) {
                        animal._provoked = true;
                        // Alert nearby bees
                        for (const [, other] of this.animals) {
                            if (!other.alive || other.type !== 'bee') continue;
                            const d = Math.abs(other.tileX - animal.tileX) + Math.abs(other.tileY - animal.tileY);
                            if (d <= 8) other._provoked = true;
                        }
                    }
                }
                if (animal._provoked) {
                    const pTarget = this.findNearby(animal, ['bear', 'wolf'], 6);
                    if (pTarget) {
                        const dist = Math.abs(animal.tileX - pTarget.tileX) + Math.abs(animal.tileY - pTarget.tileY);
                        if (dist <= 1) {
                            pTarget.hp -= atk;
                            if (pTarget.hp <= 0) { pTarget.alive = false; }
                        } else {
                            animal.targetX = pTarget.tileX;
                            animal.targetY = pTarget.tileY;
                        }
                        continue;
                    } else {
                        animal._provoked = false;
                    }
                }
            }

            // pet (cat): Follows nearest friendly entity, provides happiness
            if (behavior === 'pet') {
                let nearestFriend = null;
                let friendDist = 36;
                for (const e of gameState.entityManager.getAllAlive()) {
                    const dx = e.tileX - animal.tileX;
                    const dy = e.tileY - animal.tileY;
                    const d = dx*dx + dy*dy;
                    if (d < friendDist) { friendDist = d; nearestFriend = e; }
                }
                if (nearestFriend) {
                    // Follow at distance 2
                    const dist = Math.abs(animal.tileX - nearestFriend.tileX) + Math.abs(animal.tileY - nearestFriend.tileY);
                    if (dist > 2) {
                        animal.targetX = nearestFriend.tileX;
                        animal.targetY = nearestFriend.tileY;
                    }
                    // Hunt small prey (rats, snakes)
                    if (info.hunts && info.hunts.length > 0) {
                        const prey = this.findNearby(animal, info.hunts, 4);
                        if (prey) {
                            const pdist = Math.abs(animal.tileX - prey.tileX) + Math.abs(animal.tileY - prey.tileY);
                            if (pdist <= 1) {
                                prey.hp -= atk;
                                if (prey.hp <= 0) {
                                    prey.alive = false;
                                    animal.hunger = info.maxHunger;
                                }
                            } else {
                                animal.targetX = prey.tileX;
                                animal.targetY = prey.tileY;
                            }
                            continue;
                        }
                    }
                    if (dist > 2) continue;
                }
            }

            // guard (dog): Stays near settlement, attacks hostiles
            if (behavior === 'guard' && info.guardsSettlement) {
                // Find nearest settlement
                let nearestSettlement = null;
                let nsDist = 100;
                for (const s of gameState.settlementManager.getAll()) {
                    for (const key of s.territory) {
                        const [tx, ty] = key.split(',').map(Number);
                        const d = (tx - animal.tileX)**2 + (ty - animal.tileY)**2;
                        if (d < nsDist) { nsDist = d; nearestSettlement = s; break; }
                    }
                }
                // Attack nearby hostile creatures
                const hostileTypes = ['wolf', 'bear', 'lion', 'snake', 'skeleton', 'bandit', 'zombie', 'hyena', 'sand_spider', 'slime'];
                const hostile = this.findNearby(animal, hostileTypes, 6);
                if (hostile) {
                    const dist = Math.abs(animal.tileX - hostile.tileX) + Math.abs(animal.tileY - hostile.tileY);
                    if (dist <= 1) {
                        hostile.hp -= atk;
                        if (hostile.hp <= 0) {
                            hostile.alive = false;
                            if (gameState.visualEvents) {
                                gameState.visualEvents.push({ type: 'blood', x: hostile.tileX, y: hostile.tileY, radius: 1 });
                            }
                        }
                    } else {
                        animal.targetX = hostile.tileX;
                        animal.targetY = hostile.tileY;
                    }
                    continue;
                }
                // Return to settlement center
                if (nearestSettlement && nsDist > 25) {
                    animal.targetX = nearestSettlement.tileX;
                    animal.targetY = nearestSettlement.tileY;
                }
            }

            // Wander randomly
            if (Math.random() < 0.3) {
                const dx = Math.floor(Math.random() * 7) - 3;
                const dy = Math.floor(Math.random() * 7) - 3;
                const nx = Math.max(0, Math.min(worldMap.width - 1, animal.tileX + dx));
                const ny = Math.max(0, Math.min(worldMap.height - 1, animal.tileY + dy));
                const canWalk = worldMap.isWalkable(nx, ny) || animal.type === 'fish' || animal.type === 'dragon' || animal.type === 'ufo'
                    || info.flying || info.phaseThrough || info.aquatic && worldMap.getTile(nx, ny) === 'shallow_water';
                if (canWalk) {
                    animal.tileX = nx;
                    animal.tileY = ny;
                    const pixel = worldMap.tileToPixel(nx, ny);
                    animal.x = pixel.x;
                    animal.y = pixel.y;
                }
            }

            // --- DEEP ECOSYSTEM: Hunger & Eating ---
            if (animal.hunger !== undefined && info.diet !== 'none') {
                animal.hunger -= 1; // Lose hunger over time
                
                // Starvation
                if (animal.hunger <= 0) {
                    animal.hp -= 2; // Starve slowly
                    if (animal.hp <= 0) {
                        animal.alive = false;
                        if (gameState.visualEvents) {
                            gameState.visualEvents.push({ type: 'blood', x: animal.tileX, y: animal.tileY, radius: 1 });
                        }
                    }
                }

                // Herbivore grazing
                if (info.diet === 'herbivore' && animal.hunger < info.maxHunger * 0.6) {
                    const tile = worldMap.getTile(animal.tileX, animal.tileY);
                    if (tile === 'grass') {
                        // Eat grass
                        animal.hunger = Math.min(info.maxHunger, animal.hunger + 40);
                        animal.hp = Math.min(info.hp + 5, info.hp); // heal
                        worldMap.setTile(animal.tileX, animal.tileY, 'dirt');
                        if (!gameState.dirtyTiles) gameState.dirtyTiles = [];
                        gameState.dirtyTiles.push({ x: animal.tileX, y: animal.tileY });
                    }
                }
                
                // Carnivores hunting logic handles eating (restoring hunger) inside Hunt check below
            }

            // Move toward target
            if (animal.targetX >= 0 && animal.targetY >= 0) {
                const dx = Math.sign(animal.targetX - animal.tileX);
                const dy = Math.sign(animal.targetY - animal.tileY);
                const nx = animal.tileX + dx;
                const ny = animal.tileY + dy;
                if (nx >= 0 && nx < worldMap.width && ny >= 0 && ny < worldMap.height) {
                    const walkable = animal.type === 'fish'
                        ? (worldMap.getTile(nx, ny) === 'shallow_water')
                        : (worldMap.isWalkable(nx, ny) || animal.type === 'dragon' || animal.type === 'ufo'
                            || info.flying || info.phaseThrough
                            || (info.aquatic && worldMap.getTile(nx, ny) === 'shallow_water'));
                    if (walkable) {
                        animal.tileX = nx;
                        animal.tileY = ny;
                        const pixel = worldMap.tileToPixel(nx, ny);
                        animal.x = pixel.x;
                        animal.y = pixel.y;
                    }
                }
                if (animal.tileX === animal.targetX && animal.tileY === animal.targetY) {
                    animal.targetX = -1;
                    animal.targetY = -1;
                }
            }

            // Seasonal Breeding modifier
            let seasonBreedMulti = 1.0;
            switch(gameState.currentAgeId) {
                case 'hope': seasonBreedMulti = 1.5; break; // Spring/Hope: flourish
                case 'ice': seasonBreedMulti = 0.2; break; // Ice: hard to breed
                case 'dark': 
                    seasonBreedMulti = info.diet === 'carnivore' ? 1.5 : 0.5; // Dark: predators thrive
                    break;
                case 'sun': seasonBreedMulti = 0.8; break; // Too hot
            }
            
            // Only breed if well fed
            const wellFed = animal.hunger === undefined || animal.hunger > (info.maxHunger || 100) * 0.5;

            // Breeding
            if (laws.isEnabled('animal_breeding') && wellFed && Math.random() < info.breedRate * seasonBreedMulti && this.countByType(animal.type) < 40) {
                this.spawnNear(worldMap, animal.type, animal.tileX, animal.tileY);
            }
        }

        // Cleanup dead animals + handle special death effects
        for (const id of toRemove) {
            const deadAnimal = this.animals.get(id);
            if (deadAnimal) {
                const deadInfo = ANIMAL_TYPES[deadAnimal.type];
                // Slime splits on death
                if (deadInfo && deadInfo.splitsOnDeath && this.countByType(deadAnimal.type) < 40) {
                    for (let i = 0; i < 2; i++) {
                        const ox = Math.floor(Math.random() * 3) - 1;
                        const oy = Math.floor(Math.random() * 3) - 1;
                        const sx = Math.max(0, Math.min(worldMap.width-1, deadAnimal.tileX + ox));
                        const sy = Math.max(0, Math.min(worldMap.height-1, deadAnimal.tileY + oy));
                        this.spawn(worldMap, deadAnimal.type, sx, sy);
                    }
                }
            }
            this.animals.delete(id);
        }
    }

    spawnRandomAnimals(worldMap, count) {
        const types = Object.keys(ANIMAL_TYPES);
        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            this.spawnRandomOfType(worldMap, type);
        }
    }

    /**
     * Biome-specific natural spawning — each biome has a chance to spawn its native creatures.
     * Rare creatures (crystal_golem, ghost, grey_goo) have very low spawn rates.
     */
    spawnBiomeCreatures(worldMap) {
        const BIOME_SPAWN_TABLE = {
            snow:          [{ type: 'snowman', chance: 0.15 }, { type: 'cold_one', chance: 0.08 }, { type: 'skeleton', chance: 0.05 }],
            deep_snow:     [{ type: 'snowman', chance: 0.1 }, { type: 'cold_one', chance: 0.1 }],
            ice:           [{ type: 'cold_one', chance: 0.08 }],
            permafrost:    [{ type: 'snowman', chance: 0.05 }],
            desert:        [{ type: 'sand_spider', chance: 0.12 }, { type: 'worm', chance: 0.05 }, { type: 'hyena', chance: 0.08 }],
            savanna:       [{ type: 'hyena', chance: 0.1 }, { type: 'rhino', chance: 0.04 }, { type: 'bandit', chance: 0.05 }],
            swamp:         [{ type: 'slime', chance: 0.12 }, { type: 'piranha', chance: 0.08 }],
            mushroom:      [{ type: 'slime', chance: 0.1 }],
            corrupted:     [{ type: 'skeleton', chance: 0.1 }, { type: 'evil_mage', chance: 0.06 }, { type: 'ghost', chance: 0.03 }],
            wasteland:     [{ type: 'grey_goo', chance: 0.02 }, { type: 'sand_spider', chance: 0.06 }, { type: 'worm', chance: 0.04 }],
            crystal:       [{ type: 'crystal_golem', chance: 0.02 }],
            infernal:      [{ type: 'flaming_skull', chance: 0.06 }],
            lava:          [{ type: 'flaming_skull', chance: 0.04 }],
            candy:         [{ type: 'gummy_bear', chance: 0.1 }, { type: 'gingerbread_man', chance: 0.1 }],
            dirt:          [{ type: 'bandit', chance: 0.06 }, { type: 'grey_goo', chance: 0.01 }],
            grass:         [{ type: 'dog', chance: 0.04 }, { type: 'cat', chance: 0.04 }, { type: 'bee', chance: 0.05 }],
            flower_meadow: [{ type: 'bee', chance: 0.1 }, { type: 'cat', chance: 0.03 }],
            shallow_water: [{ type: 'piranha', chance: 0.06 }],
            forest:        [{ type: 'dog', chance: 0.03 }]
        };

        // Sample random tiles and attempt spawns
        for (let i = 0; i < 10; i++) {
            const x = Math.floor(Math.random() * worldMap.width);
            const y = Math.floor(Math.random() * worldMap.height);
            const tile = worldMap.getTile(x, y);
            const spawns = BIOME_SPAWN_TABLE[tile];
            if (!spawns) continue;
            for (const entry of spawns) {
                if (Math.random() < entry.chance && this.countByType(entry.type) < 20) {
                    this.spawn(worldMap, entry.type, x, y);
                    break; // Only one spawn per tile per tick
                }
            }
        }
    }

    spawnRandomOfType(worldMap, type) {
        const info = ANIMAL_TYPES[type];
        // Find a suitable tile
        for (let attempts = 0; attempts < 30; attempts++) {
            const x = Math.floor(Math.random() * worldMap.width);
            const y = Math.floor(Math.random() * worldMap.height);
            const tile = worldMap.getTile(x, y);

            if (info.habitat.includes(tile)) {
                this.spawn(worldMap, type, x, y);
                break;
            }
        }
    }

    spawnNear(worldMap, type, cx, cy) {
        const info = ANIMAL_TYPES[type];
        for (let r = 1; r <= 3; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const x = cx + dx;
                    const y = cy + dy;
                    if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;
                    const tile = worldMap.getTile(x, y);
                    if (info.habitat.includes(tile)) {
                        this.spawn(worldMap, type, x, y);
                        return;
                    }
                }
            }
        }
    }

    spawn(worldMap, type, tileX, tileY) {
        const info = ANIMAL_TYPES[type];
        const id = nextAnimalId++;
        const pixel = worldMap.tileToPixel(tileX, tileY);
        const animal = {
            id, type,
            tileX, tileY,
            x: pixel.x, y: pixel.y,
            targetX: -1, targetY: -1,
            hp: info.hp, maxHp: info.hp,
            attack: 10, defense: 5,
            speed: info.speed,
            color: info.color,
            alive: true,
            isAnimal: true,
            hunger: info.maxHunger || 100,
            traits: generateRandomTraits()
        };
        applyTraits(animal);
        
        this.animals.set(id, animal);
        return animal;
    }

    /**
     * Force-spawn an animal from save data (preserves ID and stats)
     */
    forceSpawn(data) {
        const animal = {
            id: data.id,
            type: data.type,
            tileX: data.tileX,
            tileY: data.tileY,
            x: data.x,
            y: data.y,
            targetX: -1,
            targetY: -1,
            hp: data.hp,
            maxHp: data.maxHp,
            attack: data.attack || 10,
            defense: data.defense || 5,
            speed: data.speed,
            color: data.color,
            alive: true,
            isAnimal: true,
            hunger: data.hunger || 100,
            traits: data.traits || []
        };
        // Update nextAnimalId to avoid collisions
        if (data.id >= nextAnimalId) nextAnimalId = data.id + 1;
        this.animals.set(animal.id, animal);
        return animal;
    }

    findNearby(animal, types, range) {
        let nearestDist = range * range;
        let nearest = null;
        for (const [, other] of this.animals) {
            if (!other.alive || other.id === animal.id) continue;
            if (!types.includes(other.type)) continue;
            const dx = other.tileX - animal.tileX;
            const dy = other.tileY - animal.tileY;
            const d = dx * dx + dy * dy;
            if (d < nearestDist) {
                nearestDist = d;
                nearest = other;
            }
        }
        return nearest;
    }

    findNearbyByType(animal, types, range) {
        return this.findNearby(animal, types, range);
    }

    countByType(type) {
        let c = 0;
        for (const [, a] of this.animals) {
            if (a.alive && a.type === type) c++;
        }
        return c;
    }

    getAllAlive() {
        const result = [];
        for (const a of this.animals.values()) {
            if (a.alive) result.push(a);
        }
        return result;
    }
}
