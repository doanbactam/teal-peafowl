import * as THREE from 'three';

export class GodPowers {
  constructor(game) {
    this.game = game;
    this.activePower = 'select';
    this.particles = [];
    this.tornadoes = [];
    this.meteors = [];
  }

  // Faith costs - balanced and logical for a god simulator
  getCost(power) {
    const POWER_COSTS = {
      select: 0,
      // === Creation ===
      spawn_human: 25,
      spawn_animal: 10,
      spawn_tree: 3,
      // === Nature ===
      rain: 20,
      lightning: 20,
      // === Destruction ===
      fire: 8,
      meteor: 50,
      earthquake: 40,
      tornado: 35,
      // === Divine ===
      divine_light: 30,   // Heals + cures debuffs (WorldBox)
      plague: 25,          // Spreads disease (WorldBox)
      madness: 20,         // Makes creatures attack everything (WorldBox)
    };
    return POWER_COSTS[power] || 0;
  }

  setActive(power) {
    this.activePower = power;
  }

  execute(worldX, worldZ) {
    const terrain = this.game.terrain;
    const creatures = this.game.creatureManager;
    const buildings = this.game.buildingManager;
    const resources = this.game.resources;

    const halfSize = terrain.size / 2;
    const tileX = Math.round(worldX + halfSize);
    const tileZ = Math.round(worldZ + halfSize);

    const cost = this.getCost(this.activePower);

    // Apply theology discount if researched
    let finalCost = cost;
    if (this.game.techTree && this.game.techTree.hasEffect('divinePowerBoost')) {
       finalCost = Math.floor(cost * 0.7);
    }

    if (this.game.resources.faith < finalCost) {
      this.game.eventSystem.showNotification({
        type: 'warning',
        icon: '🔮',
        message: `Not enough <b>Faith</b>! Need ${finalCost}.`
      });
      return false;
    }

    let result = false;

    switch (this.activePower) {
      case 'select':
        result = this.select(tileX, tileZ);
        if (result) return result; // Return info directly
        break;
      case 'spawn_human':
        result = creatures.spawnHuman(tileX, tileZ);
        break;
      case 'spawn_animal':
        result = creatures.spawnAnimal(tileX, tileZ);
        break;
      case 'spawn_tree':
        result = this.plantTree(tileX, tileZ);
        break;
      case 'lightning':
        result = this.lightningStrike(worldX, worldZ, tileX, tileZ);
        break;
      case 'fire':
        result = this.startFire(tileX, tileZ);
        break;
      case 'rain':
        result = this.rain(worldX, worldZ);
        break;
      case 'meteor':
        result = this.meteorStrike(worldX, worldZ, tileX, tileZ);
        break;
      case 'earthquake':
        result = this.earthquake(worldX, worldZ);
        break;
      case 'tornado':
        result = this.spawnTornado(worldX, worldZ);
        break;
      // === NEW WorldBox-inspired powers ===
      case 'divine_light':
        result = this.divineLight(worldX, worldZ);
        break;
      case 'plague':
        result = this.spreadPlague(worldX, worldZ, tileX, tileZ);
        break;
      case 'madness':
        result = this.infictMadness(worldX, worldZ, tileX, tileZ);
        break;
    }

    if (result && finalCost > 0) {
       this.game.resources.faith -= finalCost;
    }
    
    return result;
  }

  select(tileX, tileZ) {
    // Check for creature
    const creature = this.game.creatureManager.getCreatureAt(tileX, tileZ);
    if (creature) return { type: 'info', data: creature.getInfo() };

    // Check for building
    const building = this.game.buildingManager.getBuildingAt(tileX, tileZ);
    if (building) return { type: 'info', data: this.game.buildingManager.getInfo(tileX, tileZ) };

    // Show tile info
    const tile = this.game.terrain.tiles.get(`${tileX},${tileZ}`);
    if (tile) {
      const biomeNames = ['Deep Water','Shallow Water','Beach','Grassland','Forest','Dense Forest','Mountain','Snow','Desert','Savanna'];
      return {
        type: 'info',
        data: `<b>Tile (${tileX}, ${tileZ})</b><br>` +
          `Biome: ${biomeNames[tile.biome]}<br>` +
          `Height: ${tile.height.toFixed(2)}<br>` +
          `Tree: ${tile.hasTree ? 'Yes' : 'No'}<br>` +
          `Fire: ${tile.onFire ? '🔥 Yes' : 'No'}`
      };
    }
    return null;
  }

  plantTree(tileX, tileZ) {
    const tile = this.game.terrain.tiles.get(`${tileX},${tileZ}`);
    if (!tile || tile.hasTree || tile.hasBuilding) return false;
    if (tile.biome === 0 || tile.biome === 1) return false;

    tile.hasTree = true;
    const worldPos = this.game.terrain.getWorldPos(tileX, tileZ);

    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 4);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5D4037 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.2;

    const leafGeo = new THREE.ConeGeometry(0.25, 0.5, 5);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2E7D32 });
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.y = 0.55;

    const treeGroup = new THREE.Group();
    treeGroup.add(trunk);
    treeGroup.add(leaves);
    treeGroup.position.copy(worldPos);

    const scale = 0.7 + Math.random() * 0.6;
    treeGroup.scale.set(scale, scale, scale);

    this.game.scene.add(treeGroup);
    this.game.terrain.trees.set(`${tileX},${tileZ}`, treeGroup);

    return true;
  }

  lightningStrike(worldX, worldZ, tileX, tileZ) {
    const height = this.game.terrain.getHeightAt(worldX, worldZ);

    // Lightning bolt visual
    const points = [];
    const startY = height + 30;
    const endY = height + 0.5;
    const segments = 8;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = startY + (endY - startY) * t;
      const offset = i > 0 && i < segments ? (Math.random() - 0.5) * 1.5 : 0;
      points.push(new THREE.Vector3(worldX + offset, y, worldZ + offset * 0.5));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffcc,
      linewidth: 3,
    });
    const bolt = new THREE.Line(geo, mat);
    this.game.scene.add(bolt);

    // Flash light
    const flashLight = new THREE.PointLight(0xffffaa, 50, 30);
    flashLight.position.set(worldX, height + 5, worldZ);
    this.game.scene.add(flashLight);

    // Impact particles
    this.spawnParticles(worldX, height + 0.5, worldZ, 0xffff00, 20, 3, 2);

    // Damage nearby creatures
    for (const creature of this.game.creatureManager.creatures) {
      const dx = creature.mesh.position.x - worldX;
      const dz = creature.mesh.position.z - worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 3) {
        creature.takeDamage(40 + Math.random() * 30);
      }
    }

    // Set fire at impact
    this.game.terrain.setFire(tileX, tileZ);

    // Remove after delay
    setTimeout(() => {
      this.game.scene.remove(bolt);
      this.game.scene.remove(flashLight);
    }, 200);

    // Sound effect simulation with screen flash
    this.screenFlash('#ffffff', 100);

    return true;
  }

  startFire(tileX, tileZ) {
    this.game.terrain.setFire(tileX, tileZ);
    return true;
  }

  rain(worldX, worldZ) {
    const range = 8;
    const halfSize = this.game.terrain.size / 2;

    // Extinguish fires in range
    for (let dz = -range; dz <= range; dz++) {
      for (let dx = -range; dx <= range; dx++) {
        const tx = Math.round(worldX + halfSize) + dx;
        const tz = Math.round(worldZ + halfSize) + dz;
        this.game.terrain.extinguish(tx, tz);
      }
    }

    // Rain particles
    this.spawnParticles(worldX, this.game.terrain.getHeightAt(worldX, worldZ) + 10, worldZ, 0x64b5f6, 100, 8, 4);

    // Heal nearby creatures slightly and boost mood
    for (const creature of this.game.creatureManager.creatures) {
      const dx = creature.mesh.position.x - worldX;
      const dz = creature.mesh.position.z - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) < range) {
        creature.heal(10);
        if (creature.addMoodModifier) {
          creature.addMoodModifier('Refreshing rain', 3, 15);
        }
      }
    }

    this.screenFlash('#4488ff44', 300);
    return true;
  }

  meteorStrike(worldX, worldZ, tileX, tileZ) {
    const height = this.game.terrain.getHeightAt(worldX, worldZ);

    // Meteor coming from sky
    const meteorGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const meteorMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const meteor = new THREE.Mesh(meteorGeo, meteorMat);
    meteor.position.set(worldX + 5, height + 25, worldZ - 5);
    this.game.scene.add(meteor);

    // Glow
    const glowLight = new THREE.PointLight(0xff4400, 20, 15);
    meteor.add(glowLight);

    this.meteors.push({
      mesh: meteor,
      target: new THREE.Vector3(worldX, height + 0.3, worldZ),
      speed: 15,
    });

    return true;
  }

  earthquake(worldX, worldZ) {
    const range = 6;
    const halfSize = this.game.terrain.size / 2;
    const centerTX = Math.round(worldX + halfSize);
    const centerTZ = Math.round(worldZ + halfSize);

    // Destroy buildings in range
    for (let dz = -range; dz <= range; dz++) {
      for (let dx = -range; dx <= range; dx++) {
        const tx = centerTX + dx;
        const tz = centerTZ + dz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= range && Math.random() < 0.5) {
          this.game.buildingManager.destroy(tx, tz);
        }
      }
    }

    // Damage creatures
    for (const creature of this.game.creatureManager.creatures) {
      const dx = creature.mesh.position.x - worldX;
      const dz = creature.mesh.position.z - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) < range) {
        creature.takeDamage(20 + Math.random() * 20);
      }
    }

    // Particles
    this.spawnParticles(worldX, this.game.terrain.getHeightAt(worldX, worldZ) + 0.5, worldZ, 0x8d6e63, 50, 6, 3);

    // Shake camera
    this.shakeCamera(0.5, 500);

    this.screenFlash('#ff884444', 200);
    return true;
  }

  spawnTornado(worldX, worldZ) {
    const height = this.game.terrain.getHeightAt(worldX, worldZ);
    const group = new THREE.Group();

    // Tornado funnel (multiple rings)
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const radius = 0.3 + t * 0.8;
      const ringGeo = new THREE.TorusGeometry(radius, 0.1, 4, 8);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x9e9e9e,
        transparent: true,
        opacity: 0.6 - t * 0.3
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = t * 3;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    group.position.set(worldX, height, worldZ);
    this.game.scene.add(group);

    this.tornadoes.push({
      mesh: group,
      position: new THREE.Vector3(worldX, height, worldZ),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3),
      lifetime: 10,
      ticks: 0,
    });

    return true;
  }

  // ========== NEW: DIVINE LIGHT (WorldBox inspired) ==========
  // Heals creatures and removes negative effects (plague, curse, madness)
  divineLight(worldX, worldZ) {
    const range = 6;
    let healed = 0;

    for (const creature of this.game.creatureManager.creatures) {
      const dx = creature.mesh.position.x - worldX;
      const dz = creature.mesh.position.z - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) < range) {
        creature.heal(60);
        // Remove negative debuffs
        if (creature.plagued !== undefined) {
          creature.plagued = false;
          creature.plagueTimer = 0;
        }
        if (creature.cursed !== undefined) {
          creature.cursed = false;
          creature.curseTimer = 0;
        }
        if (creature.madness !== undefined) {
          creature.madness = false;
          creature.madnessTimer = 0;
        }
        // Mental break cure
        if (creature.mentalBreak) {
          creature.mentalBreak = null;
          creature.state = 'idle';
          creature.stateTimer = 0;
        }
        // Mood boost
        if (creature.addMoodModifier) {
          creature.addMoodModifier('Divine Light', 20, 60);
        }
        healed++;
      }
    }

    // Golden divine particles
    const height = this.game.terrain.getHeightAt(worldX, worldZ);
    this.spawnParticles(worldX, height + 1, worldZ, 0xffd700, 40, 6, 3);
    this.spawnParticles(worldX, height + 3, worldZ, 0xffffff, 25, 4, 2);

    // Light effect
    const divineLight = new THREE.PointLight(0xffd700, 30, 15);
    divineLight.position.set(worldX, height + 5, worldZ);
    this.game.scene.add(divineLight);
    setTimeout(() => this.game.scene.remove(divineLight), 2000);

    // Light beam effect (pillar of light)
    const beamGeo = new THREE.CylinderGeometry(0.3, 1.5, 15, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(worldX, height + 7, worldZ);
    this.game.scene.add(beam);
    
    // Fade out beam
    const fadeBeam = (elapsed = 0) => {
      elapsed += 16;
      const t = elapsed / 2000;
      beam.material.opacity = 0.25 * (1 - t);
      beam.scale.x = 1 + t * 0.5;
      beam.scale.z = 1 + t * 0.5;
      if (t >= 1) {
        this.game.scene.remove(beam);
      } else {
        requestAnimationFrame(() => fadeBeam(elapsed));
      }
    };
    fadeBeam();

    this.screenFlash('#ffd70044', 300);
    return healed > 0;
  }

  // ========== NEW: PLAGUE (WorldBox inspired) ==========
  // Spread disease to creatures in area
  spreadPlague(worldX, worldZ, tileX, tileZ) {
    const range = 4;
    let infected = 0;

    for (const creature of this.game.creatureManager.creatures) {
      const dx = creature.mesh.position.x - worldX;
      const dz = creature.mesh.position.z - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) < range) {
        if (!creature.plagued) {
          creature.plagued = true;
          creature.plagueTimer = 0;
          if (creature.addMoodModifier) {
            creature.addMoodModifier('Feels sick', -15, 0);
          }
          infected++;
        }
      }
    }

    // Sickly green particles
    const height = this.game.terrain.getHeightAt(worldX, worldZ);
    this.spawnParticles(worldX, height + 0.5, worldZ, 0x4a148c, 30, 5, 3);
    this.spawnParticles(worldX, height + 1, worldZ, 0x76ff03, 20, 4, 2);

    // Poison cloud
    const cloudGeo = new THREE.SphereGeometry(2, 8, 6);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0x4a148c,
      transparent: true,
      opacity: 0.3,
    });
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
    cloud.position.set(worldX, height + 1, worldZ);
    this.game.scene.add(cloud);

    const fadeCloud = (elapsed = 0) => {
      elapsed += 16;
      const t = elapsed / 3000;
      cloud.material.opacity = 0.3 * (1 - t);
      cloud.scale.setScalar(1 + t * 2);
      if (t >= 1) {
        this.game.scene.remove(cloud);
      } else {
        requestAnimationFrame(() => fadeCloud(elapsed));
      }
    };
    fadeCloud();

    this.screenFlash('#4a148c44', 200);
    return infected > 0;
  }

  // ========== NEW: MADNESS (WorldBox inspired) ==========
  // Creatures in area go berserk and attack everything
  infictMadness(worldX, worldZ, tileX, tileZ) {
    const range = 4;
    let affected = 0;

    for (const creature of this.game.creatureManager.creatures) {
      const dx = creature.mesh.position.x - worldX;
      const dz = creature.mesh.position.z - worldZ;
      if (Math.sqrt(dx * dx + dz * dz) < range) {
        if (creature.type === 'human' && !creature.madness) {
          creature.madness = true;
          creature.madnessTimer = 0;
          if (creature.addMoodModifier) {
            creature.addMoodModifier('Madness!', -25, 0);
          }
          // Change body color to red-ish
          if (creature.bodyMesh) {
            creature.bodyMesh.material.color.setHex(0x880000);
          }
          affected++;
        }
      }
    }

    // Red chaotic particles
    const height = this.game.terrain.getHeightAt(worldX, worldZ);
    this.spawnParticles(worldX, height + 0.5, worldZ, 0xff0000, 25, 4, 2);
    this.spawnParticles(worldX, height + 1.5, worldZ, 0xff6600, 15, 3, 1.5);

    // Red pulse
    const pulseGeo = new THREE.SphereGeometry(1, 8, 6);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.4,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.position.set(worldX, height + 1, worldZ);
    this.game.scene.add(pulse);

    const fadePulse = (elapsed = 0) => {
      elapsed += 16;
      const t = elapsed / 1500;
      pulse.material.opacity = 0.4 * (1 - t);
      pulse.scale.setScalar(1 + t * 4);
      if (t >= 1) {
        this.game.scene.remove(pulse);
      } else {
        requestAnimationFrame(() => fadePulse(elapsed));
      }
    };
    fadePulse();

    this.screenFlash('#ff000044', 150);
    return affected > 0;
  }

  spawnParticles(x, y, z, color, count, spread, lifetime) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        x + (Math.random() - 0.5) * spread,
        y + Math.random() * spread * 0.5,
        z + (Math.random() - 0.5) * spread
      );
      this.game.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2 + 1,
          (Math.random() - 0.5) * 3
        ),
        lifetime,
        ticks: 0,
      });
    }
  }

  screenFlash(color, duration) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:${color};z-index:50;pointer-events:none;
      transition:opacity ${duration}ms;
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), duration);
    });
  }

  shakeCamera(intensity, duration) {
    this.game.cameraShake = { intensity, duration, elapsed: 0 };
  }

  update(dt) {
    // Update particles
    const toRemove = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.ticks += dt;
      p.velocity.y -= dt * 5; // gravity
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.mesh.material.opacity = Math.max(0, 1 - p.ticks / p.lifetime);

      if (p.ticks >= p.lifetime) {
        this.game.scene.remove(p.mesh);
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }

    // Update tornadoes
    const tornadoToRemove = [];
    for (let i = 0; i < this.tornadoes.length; i++) {
      const t = this.tornadoes[i];
      t.ticks += dt;

      // Move tornado
      t.position.x += t.velocity.x * dt;
      t.position.z += t.velocity.z * dt;
      t.mesh.position.copy(t.position);

      // Spin
      for (const ring of t.mesh.children) {
        ring.rotation.z += dt * 5;
      }

      // Damage creatures and destroy buildings
      const halfSize = this.game.terrain.size / 2;
      for (const creature of this.game.creatureManager.creatures) {
        const dx = creature.mesh.position.x - t.position.x;
        const dz = creature.mesh.position.z - t.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < 2) {
          creature.takeDamage(dt * 15);
          // Push creature
          creature.mesh.position.x += (Math.random() - 0.5) * dt * 5;
          creature.mesh.position.z += (Math.random() - 0.5) * dt * 5;
        }
      }

      const tx = Math.round(t.position.x + halfSize);
      const tz = Math.round(t.position.z + halfSize);
      this.game.buildingManager.destroy(tx, tz);

      if (t.ticks >= t.lifetime) {
        this.game.scene.remove(t.mesh);
        tornadoToRemove.push(i);
      }
    }
    for (let i = tornadoToRemove.length - 1; i >= 0; i--) {
      this.tornadoes.splice(tornadoToRemove[i], 1);
    }

    // Update meteors
    const meteorToRemove = [];
    for (let i = 0; i < this.meteors.length; i++) {
      const m = this.meteors[i];
      const dir = m.target.clone().sub(m.mesh.position).normalize();
      m.mesh.position.add(dir.multiplyScalar(m.speed * dt));

      // Check if reached target
      if (m.mesh.position.distanceTo(m.target) < 0.5) {
        // Impact!
        const halfSize = this.game.terrain.size / 2;
        const tx = Math.round(m.target.x + halfSize);
        const tz = Math.round(m.target.z + halfSize);

        // Explosion particles
        this.spawnParticles(m.target.x, m.target.y, m.target.z, 0xff4400, 40, 4, 2);
        this.spawnParticles(m.target.x, m.target.y + 1, m.target.z, 0xffaa00, 30, 3, 1.5);

        // Damage
        for (const creature of this.game.creatureManager.creatures) {
          const dx = creature.mesh.position.x - m.target.x;
          const dz = creature.mesh.position.z - m.target.z;
          if (Math.sqrt(dx * dx + dz * dz) < 5) {
            creature.takeDamage(60 + Math.random() * 40);
          }
        }

        // Set fires
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            this.game.terrain.setFire(tx + dx, tz + dz);
          }
        }

        // Destroy buildings
        this.game.buildingManager.destroy(tx, tz);

        this.screenFlash('#ff440044', 200);
        this.shakeCamera(0.3, 300);

        this.game.scene.remove(m.mesh);
        meteorToRemove.push(i);
      }
    }
    for (let i = meteorToRemove.length - 1; i >= 0; i--) {
      this.meteors.splice(meteorToRemove[i], 1);
    }
  }
}
