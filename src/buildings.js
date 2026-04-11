import * as THREE from 'three';

const BUILDING_TYPES = {
  house: {
    name: 'House',
    color: 0xd4a574,
    size: [0.7, 0.6, 0.7],
    roofColor: 0xb71c1c,
    cost: { wood: 10 },
    capacity: 4,
    height: 0.6,
    description: 'Shelter for 4 people',
  },
  farm: {
    name: 'Farm',
    color: 0x6d4c41,
    size: [0.9, 0.12, 0.9],
    roofColor: null,
    cost: { wood: 5 },
    foodProduction: 0.6,
    height: 0.12,
    description: 'Produces food over time',
  },
  wall: {
    name: 'Wall',
    color: 0x9e9e9e,
    size: [0.5, 0.6, 0.5],
    roofColor: null,
    cost: { stone: 3 },
    height: 0.6,
    defense: 10,
    description: 'Defensive barrier',
  },
  tower: {
    name: 'Tower',
    color: 0x607d8b,
    size: [0.45, 1.4, 0.45],
    roofColor: 0x455a64,
    cost: { stone: 10, wood: 5 },
    height: 1.4,
    defense: 20,
    range: 5,
    description: 'Watchtower with attack range',
  },
  storage: {
    name: 'Storage',
    color: 0x8d6e63,
    size: [0.8, 0.55, 0.65],
    roofColor: 0x6d4c41,
    cost: { wood: 15 },
    capacity: 50,
    height: 0.55,
    description: 'Stores 50 extra resources',
  },
  road: {
    name: 'Road',
    color: 0x795548,
    size: [0.97, 0.04, 0.97],
    roofColor: null,
    cost: { stone: 1 },
    height: 0.04,
    speedBoost: 1.3,
    description: 'Increases movement speed',
  },
  temple: {
    name: 'Temple',
    color: 0xffd700,
    size: [0.8, 0.9, 0.8],
    roofColor: 0xf5f5f5,
    cost: { stone: 20, gold: 15 },
    height: 0.9,
    description: 'Holy site - boosts healing',
  },
  barracks: {
    name: 'Barracks',
    color: 0x8b0000,
    size: [0.8, 0.55, 0.8],
    roofColor: 0x5d0000,
    cost: { wood: 15, stone: 10 },
    height: 0.55,
    description: 'Trains warriors - boosts ATK',
  },
  mine: {
    name: 'Mine',
    color: 0x5d4037,
    size: [0.6, 0.4, 0.6],
    roofColor: null,
    cost: { wood: 10 },
    height: 0.4,
    stoneProduction: 0.3,
    goldProduction: 0.1,
    description: 'Produces stone and gold',
  },
};

export class BuildingManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.buildings = new Map(); // key: "x,z" -> building data
    this.meshes = new Map();
  }

  canBuild(tileX, tileZ, type) {
    const key = `${tileX},${tileZ}`;
    if (this.buildings.has(key)) return false;
    const tile = this.terrain.tiles.get(key);
    if (!tile) return false;
    if (tile.biome === 0 || tile.biome === 1) return false; // water
    if (tile.hasTree) return false; // Must clear trees first

    // Mine can only be built on mountains
    if (type === 'mine' && tile.biome !== 6) return false;

    return true;
  }

  build(tileX, tileZ, type, resources) {
    if (!this.canBuild(tileX, tileZ, type)) return false;

    const bType = BUILDING_TYPES[type];
    if (!bType) return false;

    // Check cost
    for (const [res, amount] of Object.entries(bType.cost)) {
      if ((resources[res] || 0) < amount) return false;
    }

    // Deduct cost
    for (const [res, amount] of Object.entries(bType.cost)) {
      resources[res] -= amount;
    }

    const key = `${tileX},${tileZ}`;
    const worldPos = this.terrain.getWorldPos(tileX, tileZ);

    // Create mesh with enhanced visuals
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(...bType.size);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bType.color,
      roughness: 0.75,
      metalness: 0.05,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bType.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Add roof for certain buildings
    if (bType.roofColor) {
      const roofHeight = type === 'temple' ? 0.5 : 0.3;
      const roofGeo = new THREE.ConeGeometry(
        Math.max(bType.size[0], bType.size[2]) * 0.72,
        roofHeight,
        4
      );
      const roofMat = new THREE.MeshStandardMaterial({
        color: bType.roofColor,
        roughness: 0.6,
      });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = bType.height + roofHeight / 2;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);
    }

    // Building-specific decorations
    if (type === 'farm') {
      for (let i = -3; i <= 3; i++) {
        const cropGeo = new THREE.BoxGeometry(0.02, 0.1 + Math.random() * 0.08, 0.7);
        const cropMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.7, 0.3),
        });
        const crop = new THREE.Mesh(cropGeo, cropMat);
        crop.position.set(i * 0.12, 0.1, 0);
        group.add(crop);
      }
    } else if (type === 'temple') {
      // Glowing orb on top
      const orbGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const orbMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.y = bType.height + 0.55;
      group.add(orb);

      // Point light
      const templeLight = new THREE.PointLight(0xffd700, 3, 6);
      templeLight.position.y = bType.height + 0.5;
      group.add(templeLight);
    } else if (type === 'tower') {
      // Battlements on top
      for (let i = 0; i < 4; i++) {
        const battleGeo = new THREE.BoxGeometry(0.1, 0.15, 0.1);
        const battleMat = new THREE.MeshStandardMaterial({ color: 0x546e7a });
        const battle = new THREE.Mesh(battleGeo, battleMat);
        const angle = (i / 4) * Math.PI * 2;
        battle.position.set(
          Math.cos(angle) * 0.2,
          bType.height + 0.07,
          Math.sin(angle) * 0.2
        );
        group.add(battle);
      }
    } else if (type === 'barracks') {
      // Training dummy
      const dummyGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.4, 4);
      const dummyMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const dummy = new THREE.Mesh(dummyGeo, dummyMat);
      dummy.position.set(0.4, 0.3, 0);
      group.add(dummy);
    } else if (type === 'mine') {
      // Mine entrance
      const entranceGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
      const entranceMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const entrance = new THREE.Mesh(entranceGeo, entranceMat);
      entrance.position.set(0, 0.15, 0.3);
      group.add(entrance);
    }

    // Building placement animation
    group.scale.set(0.01, 0.01, 0.01);
    group.position.set(worldPos.x, worldPos.y, worldPos.z);
    this.scene.add(group);

    // Animate scale up
    const animateScale = (elapsed = 0) => {
      elapsed += 16;
      const t = Math.min(1, elapsed / 300);
      const ease = 1 - Math.pow(1 - t, 3); // ease out cubic
      group.scale.set(ease, ease, ease);
      if (t < 1) requestAnimationFrame(() => animateScale(elapsed));
    };
    animateScale();

    const buildingData = {
      x: tileX,
      z: tileZ,
      type,
      name: bType.name,
      mesh: group,
      foodProduction: bType.foodProduction || 0,
      stoneProduction: bType.stoneProduction || 0,
      goldProduction: bType.goldProduction || 0,
      defense: bType.defense || 0,
      ticks: 0,
      health: 100,
    };

    this.buildings.set(key, buildingData);
    this.meshes.set(key, group);

    // Mark tile
    const tile = this.terrain.tiles.get(key);
    if (tile) {
      tile.hasBuilding = true;
      // Clear tree if any
      if (tile.hasTree) {
        tile.hasTree = false;
        const treeMesh = this.terrain.trees.get(key);
        if (treeMesh) {
          this.scene.remove(treeMesh);
          this.terrain.trees.delete(key);
        }
      }
    }

    return true;
  }

  destroy(tileX, tileZ) {
    const key = `${tileX},${tileZ}`;
    const building = this.buildings.get(key);
    if (!building) return;

    // Destruction animation
    const mesh = building.mesh;
    const animateDestroy = (elapsed = 0) => {
      elapsed += 16;
      const t = Math.min(1, elapsed / 200);
      mesh.scale.set(1 - t, 1 - t, 1 - t);
      mesh.rotation.y += 0.1;
      mesh.position.y += 0.02;
      if (t >= 1) {
        this.scene.remove(mesh);
      } else {
        requestAnimationFrame(() => animateDestroy(elapsed));
      }
    };
    animateDestroy();

    this.buildings.delete(key);
    this.meshes.delete(key);

    const tile = this.terrain.tiles.get(key);
    if (tile) tile.hasBuilding = false;
  }

  update(dt, resources) {
    for (const [key, building] of this.buildings) {
      building.ticks += dt;

      // Farms produce food
      if (building.foodProduction && building.ticks > 3) {
        building.ticks = 0;
        resources.food += Math.ceil(building.foodProduction * 3);
      }

      // Mines produce stone and gold
      if (building.stoneProduction && building.ticks > 4) {
        building.ticks = 0;
        resources.stone += Math.ceil(building.stoneProduction * 4);
        if (building.goldProduction) {
          resources.gold += Math.ceil(building.goldProduction * 4);
        }
      }

      // Temple animation (if has point light)
      if (building.type === 'temple' && building.mesh.children.length > 2) {
        const orb = building.mesh.children[2]; // orb mesh
        if (orb) {
          orb.material.opacity = 0.7 + Math.sin(Date.now() * 0.003) * 0.3;
        }
      }
    }
  }

  getBuildingAt(tileX, tileZ) {
    return this.buildings.get(`${tileX},${tileZ}`);
  }

  getCount() {
    return this.buildings.size;
  }

  getCountByType(type) {
    let count = 0;
    for (const [, b] of this.buildings) {
      if (b.type === type) count++;
    }
    return count;
  }

  getInfo(tileX, tileZ) {
    const b = this.buildings.get(`${tileX},${tileZ}`);
    if (!b) return null;
    const bType = BUILDING_TYPES[b.type];
    let info = `<b>${b.name}</b><br>`;
    info += `${bType.description}<br>`;
    info += `Position: (${b.x}, ${b.z})`;
    if (b.foodProduction) info += `<br>Food/cycle: +${Math.ceil(b.foodProduction * 3)}`;
    if (b.stoneProduction) info += `<br>Stone/cycle: +${Math.ceil(b.stoneProduction * 4)}`;
    if (b.goldProduction) info += `<br>Gold/cycle: +${Math.ceil(b.goldProduction * 4)}`;
    if (b.defense) info += `<br>Defense: ${b.defense}`;
    return info;
  }
}

export { BUILDING_TYPES };
