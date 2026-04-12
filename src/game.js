import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Terrain, WORLD_SIZE } from './terrain.js';
import { CreatureManager } from './creatures.js';
import { BuildingManager } from './buildings.js';
import { GodPowers } from './godpowers.js';
import { EventSystem } from './events.js';
import { createWater, createStars, createClouds, createAmbientParticles } from './atmosphere.js';
import { GodManager } from './gods.js';
import { getRace, RACE_IDS } from './races.js';
import { getDomain, DOMAIN_IDS } from './domains.js';
import { TechTree } from './technology.js';
import { WorldSimulation } from './simulation/worldSimulation.js';

export class Game {
  constructor() {
    this.container = document.getElementById('game-container');

    // Resources
    this.resources = {
      wood: 600,
      food: 800,
      stone: 300,
      gold: 150,
      faith: 100, iron: 0, goods: 0,
    };

    // Time
    this.gameTime = 6; // Start at 6:00 AM
    this.day = 1;
    this.gameSpeed = 1;
    this.paused = false;

    // Camera shake
    this.cameraShake = null;

    // Hover
    this.hoverTile = null;
    this.hoverIndicator = null;

    // Stats tracking
    this.stats = {
      totalKills: 0,
      totalBuilt: 0,
      highestPop: 0,
      totalDays: 0,
    };

    this.initialWildlifeSpawned = false;
    this.playerSettlementSpawned = false;

    // Seasonal system
    this.season = 'spring';
    this.seasonTimer = 0;
    this.seasonDuration = 10; // days per season
    this.seasonEffects = { farmMult: 1.0, moodMod: 0, freezeChance: 0, droughtChance: 0 };

    // Social climate shaped by divine intervention.
    this.socialClimate = {
      trust: 10,
      fear: 0,
      strain: 0,
      lastPower: null,
    };

    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.userData.game = this;
    this.scene.background = new THREE.Color(0x0a0a1e);
    this.scene.fog = new THREE.FogExp2(0x0a0a1e, 0.003);

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 600);
    this.camera.position.set(40, 60, 70);
    this.camera.lookAt(0, 0, 0);

    // Camera control state
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraDistance = 80;
    this.cameraAngleX = -Math.PI / 5;
    this.cameraAngleY = Math.PI / 4;
    this.isDragging = false;
    this.isPanning = false;
    this.lastMouse = { x: 0, y: 0 };
    this.clickStart = { x: 0, y: 0 };

    // Renderer (enhanced)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // Lighting (enhanced)
    this.setupLighting();

    // Terrain
    this.terrain = new Terrain(this.scene);

    // Water (shader-based)
    this.waterSystem = createWater(this.scene, this.terrain.size);

    // Stars
    this.starSystem = createStars(this.scene);

    // Clouds
    this.clouds = createClouds(this.scene);

    // Ambient particles
    this.ambientParticles = createAmbientParticles(this.scene);

    // Creature manager
    this.creatureManager = new CreatureManager(this.scene, this.terrain);

    // Building manager
    this.buildingManager = new BuildingManager(this.scene, this.terrain);

    // God powers
    this.godPowers = new GodPowers(this);

    // Event system
    this.eventSystem = new EventSystem(this);

    // Technology progression
    this.techTree = new TechTree(this);

    // Simulation shell around the existing managers/state.
    this.simulation = new WorldSimulation(this);

    // God system (will be initialized after domain selection)
    this.godManager = null;
    this.playerRace = RACE_IDS.HUMAN;
    this.playerDomain = DOMAIN_IDS.LIGHT;
    this.domainSelected = false;

    // Hover indicator (improved)
    const indicatorGeo = new THREE.RingGeometry(0.35, 0.5, 4);
    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0x64b5f6,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    this.hoverIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    this.hoverIndicator.rotation.x = -Math.PI / 2;
    this.hoverIndicator.rotation.z = Math.PI / 4;
    this.hoverIndicator.position.y = 0.02;
    this.hoverIndicator.visible = false;
    this.scene.add(this.hoverIndicator);

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Ground plane for raycasting
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Spawn wildlife first. The player's settlement is founded after domain selection.
    this.spawnInitialWildlife();

    // Events
    this.setupEvents();
    this.setupNewPanels();

    // Update camera position
    this.updateCameraPosition();

    this.paused = true;
    this.showDomainSelection();

    // Start loop
    this.clock = new THREE.Clock();
    this.frameCount = 0;
    
    // Initialise Composer for Postprocessing Bloom
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, // default strength
      0.4, // radius
      0.85 // threshold
    );
    // Subtle bloom for magical effects, sun and fire
    bloomPass.strength = 0.4;
    bloomPass.radius = 0.5;
    bloomPass.threshold = 0.6;
    this.composer.addPass(bloomPass);

    this.animate();
  }

  setupLighting() {
    // Ambient light (softer)
    this.ambientLight = new THREE.AmbientLight(0x3a3a5e, 0.4);
    this.scene.add(this.ambientLight);

    // Sun directional light (enhanced shadows)
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.3);
    this.sunLight.position.set(30, 50, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // Hemisphere light for softer, more natural lighting
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a2f1f, 0.35);
    this.scene.add(this.hemiLight);

    // Rim light for depth
    this.rimLight = new THREE.DirectionalLight(0x4488cc, 0.25);
    this.rimLight.position.set(-20, 15, -20);
    this.scene.add(this.rimLight);
  }

  showDomainSelection() {
    // Create overlay for domain selection
    if (document.getElementById('domain-select-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'domain-select-overlay';
    overlay.className = 'domain-select-overlay';

    let html = '<div class="domain-select-panel">';
    html += '<h2>⚡ CHOOSE YOUR DOMAIN</h2>';
    html += '<p>Select a divine domain to guide your civilization</p>';
    html += '<div class="domain-grid">';

    const domains = [
      { id: 'fire', icon: '🔥', name: 'Fire', desc: 'Forge Master — Buildings produce 30% more' },
      { id: 'water', icon: '💧', name: 'Water', desc: 'Tidal Heal — Creatures heal 20% faster' },
      { id: 'earth', icon: '🏔️', name: 'Earth', desc: 'Stone Skin — All units +3 DEF' },
      { id: 'beast', icon: '🐺', name: 'Beast', desc: 'Wild Hunt — Hunting yields 50% more food' },
      { id: 'shadow', icon: '🌑', name: 'Shadow', desc: 'Night Stalker — +30% speed at night' },
      { id: 'light', icon: '✨', name: 'Light', desc: 'Divine Radiance — Faith generation +25%' },
      { id: 'death', icon: '💀', name: 'Death', desc: 'Undying Will — Units fight to 10% HP' },
      { id: 'nature', icon: '🌿', name: 'Nature', desc: 'Bountiful Harvest — Farms +40% food' },
    ];

    for (const d of domains) {
      html += `<button class="domain-btn" data-domain="${d.id}" title="${d.desc}">`;
      html += `<span class="domain-icon">${d.icon}</span>`;
      html += `<span class="domain-name">${d.name}</span>`;
      html += `<span class="domain-desc">${d.desc}</span>`;
      html += '</button>';
    }

    html += '</div></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // Wire up buttons
    overlay.querySelectorAll('.domain-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const domainId = btn.dataset.domain;
        this.selectDomain(domainId);
      });
    });
  }

  selectDomain(domainId) {
    this.playerDomain = domainId;
    this.domainSelected = true;
    this.simulation.syncStateFromGame();
    this.paused = false;

    // Remove overlay
    const overlay = document.getElementById('domain-select-overlay');
    if (overlay) overlay.remove();

    // Initialize god system
    this.godManager = new GodManager(this);
    this.godManager.init(this.playerRace, this.playerDomain);
    this.simulation.syncStateFromGame();

    // Show notification
    const domain = getDomain(domainId);
    this.eventSystem.showNotification({
      type: 'success',
      icon: domain.icon,
      message: `You chose <b>${domain.name}</b>! ${domain.passiveBonus.name}: ${domain.passiveBonus.description}`
    });

    // Spawn creatures now that domain is selected
    this.spawnInitialCreatures();
  }

  spawnInitialCreatures() {
    if (this.playerSettlementSpawned) {
      return;
    }

    const halfSize = this.terrain.size / 2;

    if (this.godManager) {
      // God system: player creatures at center
      for (let i = 0; i < 20; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 8 + Math.random() * 10;
        const tx = Math.round(halfSize + Math.cos(angle) * dist);
        const tz = Math.round(halfSize + Math.sin(angle) * dist);
        if (this.terrain.isWalkable(tx, tz)) {
          this.creatureManager.spawnHuman(tx, tz, 0, this.playerRace);
        }
      }
      const houseSpot = this.findNearbyBuildSite(halfSize, halfSize, 'house', 5);
      if (houseSpot) {
        this.buildingManager.build(houseSpot.x, houseSpot.z, 'house', this.resources, 0);
      }
      const farmSpot = this.findNearbyBuildSite(halfSize, halfSize, 'farm', 8);
      if (farmSpot) {
        this.buildingManager.build(farmSpot.x, farmSpot.z, 'farm', this.resources, 0);
      }
      const storageSpot = this.findNearbyBuildSite(halfSize, halfSize, 'storage', 6);
      if (storageSpot) {
        this.buildingManager.build(storageSpot.x, storageSpot.z, 'storage', this.resources, 0);
      }
    } else {
      // Fallback: original spawning (backward compatible)
      for (let i = 0; i < 30; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 15 + Math.random() * 20;
        const tx = Math.round(halfSize + Math.cos(angle) * dist);
        const tz = Math.round(halfSize + Math.sin(angle) * dist);
        if (this.terrain.isWalkable(tx, tz)) {
          this.creatureManager.spawnHuman(tx, tz, i < 6 ? 0 : 1);
        }
      }
      if (this.buildingManager.canBuild(halfSize, halfSize, 'house')) {
        this.buildingManager.build(halfSize, halfSize, 'house', this.resources);
      }
      if (this.buildingManager.canBuild(halfSize + 2, halfSize, 'farm')) {
        this.buildingManager.build(halfSize + 2, halfSize, 'farm', this.resources);
      }
      if (this.buildingManager.canBuild(halfSize - 2, halfSize, 'storage')) {
        this.buildingManager.build(halfSize - 2, halfSize, 'storage', this.resources);
      }
      if (this.buildingManager.canBuild(halfSize, halfSize + 2, 'house')) {
        this.buildingManager.build(halfSize, halfSize + 2, 'house', this.resources);
      }
    }

    this.playerSettlementSpawned = true;
  }

  spawnInitialWildlife() {
    if (this.initialWildlifeSpawned) {
      return;
    }

    const halfSize = this.terrain.size / 2;

    for (let i = 0; i < 10; i++) {
      const tx = Math.round(halfSize + (Math.random() - 0.5) * 120);
      const tz = Math.round(halfSize + (Math.random() - 0.5) * 120);
      if (this.terrain.isWalkable(tx, tz)) {
        this.creatureManager.spawnAnimal(tx, tz);
      }
    }

    this.initialWildlifeSpawned = true;
  }

  findNearbyBuildSite(centerX, centerZ, type, radius = 6) {
    for (let attempts = 0; attempts < 40; attempts++) {
      const tx = centerX + Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      const tz = centerZ + Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      if (this.buildingManager.canBuild(tx, tz, type)) {
        return { x: tx, z: tz };
      }
    }

    return null;
  }

  getFactionGod(faction = 0) {
    return this.simulation.select('factionGod', { faction });
  }

  getFactionRaceId(faction = 0) {
    return this.simulation.select('factionRaceId', { faction });
  }

  getFactionDomainId(faction = 0) {
    return this.simulation.select('factionDomainId', { faction });
  }

  getFactionPassiveEffects(faction = 0) {
    return this.simulation.select('factionPassiveEffects', { faction });
  }

  getFactionPopulation(faction = 0) {
    return this.simulation.select('factionPopulation', { faction });
  }

  countBurningTiles() {
    return this.simulation.selectors.countBurningTiles();
  }

  getSettlementMetrics(faction = 0) {
    return this.simulation.select('settlementMetrics', { faction });
  }

  getPlayerHumans(faction = 0) {
    return this.simulation.select('playerHumans', { faction });
  }

  getSocialMetrics(faction = 0) {
    return this.simulation.select('socialMetrics', { faction });
  }

  getDomainPowerDisposition(powerId, domainId = this.playerDomain) {
    return this.simulation.select('domainPowerDisposition', { powerId, domainId });
  }

  registerDivineIntervention(powerId, success = true) {
    return this.simulation.dispatch({ type: 'god.intervention', powerId, success });
  }

  updateSocialClimate(dt) {
    return this.simulation.civilizationLayer.updateSocialClimate(dt);
  }

  getFaithEconomy(faction = 0) {
    return this.simulation.select('faithEconomy', { faction });
  }

  getPressureLevel(score) {
    if (score >= 85) return 'crisis';
    if (score >= 60) return 'danger';
    if (score >= 30) return 'watch';
    return 'calm';
  }

  getPressureLabel(level) {
    if (level === 'crisis') return 'Crisis';
    if (level === 'danger') return 'Danger';
    if (level === 'watch') return 'Watch';
    return 'Stable';
  }

  getOverviewLabel(level) {
    if (level === 'crisis') return 'Critical';
    if (level === 'danger') return 'Unstable';
    if (level === 'watch') return 'Strained';
    return 'Calm';
  }

  getColonyDiagnostics(faction = 0) {
    return this.simulation.select('colonyDiagnostics', { faction });
  }

  updateColonyPressurePanel() {
    const panel = document.getElementById('colony-pressure-panel');
    if (!panel) {
      return;
    }

    const diagnostics = this.getColonyDiagnostics(0);
    const cards = panel.querySelectorAll('.pressure-card');
    const entries = [
      { id: 'food', card: cards[0] },
      { id: 'shelter', card: cards[1] },
      { id: 'stability', card: cards[2] },
    ];

    for (const entry of entries) {
      const pressure = diagnostics[entry.id];
      if (entry.card) {
        entry.card.dataset.pressureLevel = pressure.level;
      }
      const levelEl = document.getElementById(`pressure-${entry.id}-level`);
      const detailEl = document.getElementById(`pressure-${entry.id}-detail`);
      if (levelEl) {
        levelEl.textContent = pressure.label;
      }
      if (detailEl) {
        detailEl.textContent = pressure.detail;
      }
    }

    const badge = document.getElementById('pressure-overview-badge');
    if (badge) {
      badge.className = `pressure-overview-badge ${diagnostics.overview.level}`;
      badge.textContent = diagnostics.overview.label;
    }

    const summaryEl = document.getElementById('pressure-summary');
    if (summaryEl) {
      summaryEl.textContent = diagnostics.overview.summary;
    }
  }

  setupEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        this.isDragging = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.clickStart = { x: e.clientX, y: e.clientY };
      } else if (e.button === 1 || e.button === 2) { // Middle or Right
        this.isPanning = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDragging) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.cameraAngleY -= dx * 0.005;
        this.cameraAngleX = Math.max(-Math.PI / 2.5, Math.min(-0.1, this.cameraAngleX - dy * 0.005));
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.updateCameraPosition();
      }

      if (this.isPanning) {
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        const panSpeed = 0.05;
        // Pan relative to camera angle
        const forward = new THREE.Vector3(-Math.sin(this.cameraAngleY), 0, -Math.cos(this.cameraAngleY));
        const right = new THREE.Vector3(Math.cos(this.cameraAngleY), 0, -Math.sin(this.cameraAngleY));
        this.cameraTarget.add(right.multiplyScalar(-dx * panSpeed));
        this.cameraTarget.add(forward.multiplyScalar(dy * panSpeed));
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.updateCameraPosition();
      }

      // Update hover
      this.updateHover();
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        // If barely moved from click start, it's a click
        const dx = Math.abs(e.clientX - this.clickStart.x);
        const dy = Math.abs(e.clientY - this.clickStart.y);
        if (dx < 5 && dy < 5) {
          this.handleClick();
        }
        this.isDragging = false;
      }
      if (e.button === 1 || e.button === 2) {
        this.isPanning = false;
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(12, Math.min(200, this.cameraDistance + e.deltaY * 0.08));
      this.updateCameraPosition();
    }, { passive: false });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch support
    let touchStart = null;
    let touchDist = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchDist = Math.sqrt(dx * dx + dy * dy);
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && touchStart) {
        const dx = e.touches[0].clientX - touchStart.x;
        const dy = e.touches[0].clientY - touchStart.y;
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.cameraAngleY -= dx * 0.005;
        this.cameraAngleX = Math.max(-Math.PI / 2.5, Math.min(-0.1, this.cameraAngleX - dy * 0.005));
        this.updateCameraPosition();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.sqrt(dx * dx + dy * dy);
        this.cameraDistance = Math.max(12, Math.min(200, this.cameraDistance - (newDist - touchDist) * 0.1));
        touchDist = newDist;
        this.updateCameraPosition();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      if (touchStart && e.changedTouches.length === 1) {
        const dx = Math.abs(e.changedTouches[0].clientX - touchStart.x);
        const dy = Math.abs(e.changedTouches[0].clientY - touchStart.y);
        if (dx < 10 && dy < 10) {
          this.handleClick();
        }
      }
      touchStart = null;
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.composer) {
        this.composer.setSize(window.innerWidth, window.innerHeight);
      }
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      const speed = 2;
      const forward = new THREE.Vector3(-Math.sin(this.cameraAngleY), 0, -Math.cos(this.cameraAngleY));
      const right = new THREE.Vector3(Math.cos(this.cameraAngleY), 0, -Math.sin(this.cameraAngleY));

      switch (e.key) {
        case 'w': case 'ArrowUp':
          this.cameraTarget.add(forward.clone().multiplyScalar(speed));
          break;
        case 's': case 'ArrowDown':
          this.cameraTarget.add(forward.clone().multiplyScalar(-speed));
          break;
        case 'a': case 'ArrowLeft':
          this.cameraTarget.add(right.clone().multiplyScalar(-speed));
          break;
        case 'd': case 'ArrowRight':
          this.cameraTarget.add(right.clone().multiplyScalar(speed));
          break;
        case 'q':
          this.cameraAngleY -= 0.1;
          break;
        case 'e':
          this.cameraAngleY += 0.1;
          break;
        case '+': case '=':
          this.cameraDistance = Math.max(12, this.cameraDistance - 3);
          break;
        case '-':
          this.cameraDistance = Math.min(200, this.cameraDistance + 3);
          break;
        case ' ':
          this.cycleSpeed();
          break;
        case 'p':
          this.paused = !this.paused;
          break;
      }
      this.updateCameraPosition();
    });
  }

  updateCameraPosition() {
    const x = this.cameraTarget.x + this.cameraDistance * Math.cos(this.cameraAngleX) * Math.sin(this.cameraAngleY);
    const y = this.cameraTarget.y + this.cameraDistance * Math.sin(-this.cameraAngleX);
    const z = this.cameraTarget.z + this.cameraDistance * Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY);

    this.camera.position.set(x, Math.max(y, 2), z);
    this.camera.lookAt(this.cameraTarget);
  }

  getWorldPositionFromMouse() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersect);
    return intersect;
  }

  updateHover() {
    const worldPos = this.getWorldPositionFromMouse();
    if (!worldPos) return;

    const halfSize = this.terrain.size / 2;
    const tx = Math.round(worldPos.x + halfSize);
    const tz = Math.round(worldPos.z + halfSize);

    if (tx >= 0 && tx < this.terrain.size && tz >= 0 && tz < this.terrain.size) {
      const tilePos = this.terrain.getWorldPos(tx, tz);
      this.hoverIndicator.position.set(tilePos.x, tilePos.y + 0.03, tilePos.z);
      this.hoverIndicator.visible = true;
    } else {
      this.hoverIndicator.visible = false;
    }
  }

  handleClick() {
    const worldPos = this.getWorldPositionFromMouse();
    if (!worldPos) return;

    const result = this.godPowers.execute(worldPos.x, worldPos.z);
    
    const panel = document.getElementById('inspector-panel');
    const content = document.getElementById('inspector-content');
    
    if (result && result.type === 'info') {
      panel.classList.remove('hidden');
      content.innerHTML = result.data;
    } else if (this.godPowers.activePower === 'select') {
      panel.classList.add('hidden');
      content.innerHTML = '<div class="inspector-placeholder">Select a creature or building</div>';
    }
  }

  cycleSpeed() {
    const speeds = [1, 2, 4, 8];
    const idx = speeds.indexOf(this.gameSpeed);
    this.gameSpeed = speeds[(idx + 1) % speeds.length];
    const btn = document.getElementById('btn-speed');
    btn.textContent = `⏩ x${this.gameSpeed}`;
  }

  setupNewPanels() {
    // Diplomacy panel toggle
    const diploBtn = document.getElementById('btn-diplomacy');
    const diploPanel = document.getElementById('diplomacy-panel');
    const diploClose = document.getElementById('diplomacy-close');
    if (diploBtn && diploPanel) {
      diploBtn.addEventListener('click', () => {
        diploPanel.classList.toggle('hidden');
        if (!diploPanel.classList.contains('hidden')) {
          this.updateDiplomacyPanel();
        }
      });
      if (diploClose) {
        diploClose.addEventListener('click', () => diploPanel.classList.add('hidden'));
      }
    }

    // Hero panel toggle
    const heroBtn = document.getElementById('btn-heroes');
    const heroPanel = document.getElementById('hero-panel');
    const heroClose = document.getElementById('hero-close');
    if (heroBtn && heroPanel) {
      heroBtn.addEventListener('click', () => {
        heroPanel.classList.toggle('hidden');
        if (!heroPanel.classList.contains('hidden')) {
          this.updateHeroPanel();
        }
      });
      if (heroClose) {
        heroClose.addEventListener('click', () => heroPanel.classList.add('hidden'));
      }
    }
  }

  updateDiplomacyPanel() {
    const content = document.getElementById('diplomacy-content');
    if (!content || !this.godManager) return;

    const gods = this.godManager.gods;
    const playerFaction = 0;
    let html = '';

    for (const god of gods) {
      if (god.isPlayer) continue;
      const diplo = this.simulation.select('diplomacyState', { factionA: playerFaction, factionB: god.faction });
      const warState = this.simulation.select('warState', { factionA: playerFaction, factionB: god.faction });
      const relScore = diplo?.relations ?? 0;
      const status = diplo?.status || 'neutral';

      const barWidth = Math.abs(relScore) / 2;
      const barClass = relScore >= 0 ? 'positive' : 'negative';
      const barStyle = relScore >= 0
        ? 'left: 50%; width: ' + barWidth + '%'
        : 'right: 50%; width: ' + barWidth + '%; left: auto';

      html += '<div class="diplomacy-faction-row">';
      html += '<span class="diplomacy-faction-name" style="color:' + this.getFactionColor(god.faction) + '">' + god.name + '</span>';
      html += '<span class="diplomacy-status-badge ' + status + '">' + status.toUpperCase() + '</span>';
      html += '<div class="diplomacy-relation-bar"><div class="diplomacy-relation-fill ' + barClass + '" style="' + barStyle + '"></div></div>';
      html += '<span class="diplomacy-relation-score">' + (relScore >= 0 ? '+' : '') + Math.round(relScore) + '</span>';
      html += '</div>';

      if (diplo?.atWar && warState) {
        html += '<div class="diplomacy-war-score" style="padding-left:12px;margin-bottom:8px;">⚔️ War Score: You ' + (warState.scoreA || 0) + ' vs ' + (warState.scoreB || 0) + ' ' + god.name + '</div>';
      }
    }

    if (!html) html = '<div style="color:#546e7a;text-align:center;padding:20px">No other factions discovered.</div>';
    content.innerHTML = html;
  }

  updateHeroPanel() {
    const content = document.getElementById('hero-content');
    if (!content) return;

    const heroes = this.simulation.select('heroes', { faction: null }) || [];
    if (heroes.length === 0) {
      content.innerHTML = '<div class="hero-empty">No heroes yet. Heroes emerge from battle victories at level 5+.</div>';
      return;
    }

    let html = '';
    const profIcons = {
      Warrior: '⚔️', Priest: '🙏', Hunter: '🏹', Builder: '🔨',
      Miner: '⛏️', Farmer: '🌾', Villager: '🧑'
    };

    for (const hero of heroes) {
      const icon = profIcons[hero.profession] || '⭐';
      const hpPct = Math.floor((hero.health / hero.maxHealth) * 100);
      const factionColor = this.getFactionColor(hero.faction);

      html += '<div class="hero-card">';
      html += '<div class="hero-card-icon">' + icon + '</div>';
      html += '<div class="hero-card-info">';
      html += '<div class="hero-card-name">' + hero.name + '</div>';
      html += '<div class="hero-card-profession" style="color:' + factionColor + '">Lv.' + hero.level + ' ' + hero.profession + '</div>';
      html += '<div class="hero-card-ability">✨ ' + hero.ability + '</div>';
      html += '<div class="hero-card-stats">';
      html += '<span class="hero-card-stat">❤️ ' + hpPct + '%</span>';
      html += '<span class="hero-card-stat">📍 ' + hero.tileX + ',' + hero.tileZ + '</span>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
    }

    content.innerHTML = html;
  }

  getFactionColor(faction) {
    const colors = ['#42a5f5', '#ef5350', '#66bb6a', '#ffa726', '#ab47bc'];
    return colors[faction] || '#e0e0e0';
  }

  updateDayNight(dt) {
    this.gameTime += dt * 0.5 * this.gameSpeed; // 0.5 hours per second at x1

    if (this.gameTime >= 24) {
      this.gameTime -= 24;
      this.day++;
      this.stats.totalDays = this.day;
    }

    // Sun position based on time
    const sunAngle = ((this.gameTime - 6) / 24) * Math.PI * 2; // 6 AM = sunrise
    const sunX = Math.cos(sunAngle) * 50;
    const sunY = Math.sin(sunAngle) * 50;

    this.sunLight.position.set(sunX, Math.max(sunY, -15), 25);

    // Update water shader sun direction
    if (this.waterSystem) {
      this.waterSystem.material.uniforms.uSunDir.value.set(
        Math.cos(sunAngle) * 0.5,
        Math.max(Math.sin(sunAngle), 0.1),
        0.3
      ).normalize();
    }

    // Intensity based on time (smoother transitions)
    let intensity = 0;
    if (this.gameTime >= 5 && this.gameTime <= 19) {
      if (this.gameTime < 7) {
        intensity = ((this.gameTime - 5) / 2) * 1.3;
      } else if (this.gameTime > 17) {
        intensity = ((19 - this.gameTime) / 2) * 1.3;
      } else {
        const t = (this.gameTime - 7) / 10;
        intensity = Math.sin(t * Math.PI) * 0.5 + 0.8;
      }
    } else {
      intensity = 0.25; // Brighter night (moonlight)
    }
    this.sunLight.intensity = intensity;

    // Ambient light
    const isDay = this.gameTime >= 6 && this.gameTime < 19;
    const ambientTarget = isDay ? 0.45 : 0.25;
    this.ambientLight.intensity += (ambientTarget - this.ambientLight.intensity) * 0.02;

    // Hemisphere light
    this.hemiLight.intensity = isDay ? 0.35 : 0.20;

    // Sky color with smooth transitions
    let skyColor;
    if (this.gameTime >= 5 && this.gameTime < 7) {
      // Dawn
      const t = (this.gameTime - 5) / 2;
      skyColor = new THREE.Color(0x0a0a1e).lerp(new THREE.Color(0xE8A87C), t * 0.6);
      skyColor.lerp(new THREE.Color(0x87ceeb), Math.max(0, t - 0.5) * 2);
    } else if (this.gameTime >= 7 && this.gameTime < 17) {
      // Day
      skyColor = new THREE.Color(0x7EC8E3);
    } else if (this.gameTime >= 17 && this.gameTime < 19.5) {
      // Dusk
      const t = (this.gameTime - 17) / 2.5;
      skyColor = new THREE.Color(0x7EC8E3).lerp(new THREE.Color(0xE8A87C), t * 0.6);
      skyColor.lerp(new THREE.Color(0x0a0a1e), Math.max(0, t - 0.3) * 1.4);
    } else {
      // Night
      skyColor = new THREE.Color(0x111122); // Slightly brighter night sky
    }
    this.scene.background = skyColor;
    this.scene.fog.color = skyColor;

    // Sun color
    if (this.gameTime >= 5 && this.gameTime < 7) {
      this.sunLight.color.setHex(0xffaa66); // sunrise orange
    } else if (this.gameTime >= 17 && this.gameTime < 19.5) {
      this.sunLight.color.setHex(0xff7744); // sunset red-orange
    } else if (isDay) {
      this.sunLight.color.setHex(0xfff4e6); // natural daylight
    } else {
      this.sunLight.color.setHex(0x3a4b7c); // softer, brighter moonlight blue
    }

    // Stars visibility
    if (this.starSystem) {
      const starOpacity = isDay ? 0 : Math.min(1, Math.abs(this.gameTime - 12) / 6 - 0.5);
      this.starSystem.material.uniforms.uOpacity.value = Math.max(0, starOpacity);
    }

    // Cloud lighting
    if (this.clouds) {
      const cloudOpacity = isDay ? 0.6 : 0.15;
      const cloudColor = isDay ? 0xffffff : 0x334466;
      for (const cloud of this.clouds.children) {
        if (cloud.children[0] && cloud.children[0].material) {
          cloud.children[0].material.opacity = cloudOpacity;
          cloud.children[0].material.color.setHex(cloudColor);
        }
      }
    }

    // Ambient particles (fireflies at night)
    if (this.ambientParticles) {
      const nightFactor = isDay ? 0 : 0.7;
      this.ambientParticles.material.opacity = nightFactor;
      this.ambientParticles.material.color.setHex(isDay ? 0xffffff : 0xffee88);
    }

    // Tone mapping exposure
    this.renderer.toneMappingExposure = isDay ? 1.2 : 0.85; // Better exposure at night
  }

  updateSeason() {
    return this.simulation.worldLayer.updateSeason();
  }

  updateHUD() {
    const pop = this.getFactionPopulation(0);
    const buildingCount = [...this.buildingManager.buildings.values()].filter((building) => building.faction === 0).length;
    document.getElementById('stat-pop').textContent = pop;
    document.getElementById('stat-buildings').textContent = buildingCount;
    document.getElementById('stat-day').textContent = this.day;

    // Track highest pop
    if (pop > this.stats.highestPop) this.stats.highestPop = pop;

    const hours = Math.floor(this.gameTime);
    const mins = Math.floor((this.gameTime % 1) * 60);
    document.getElementById('stat-time').textContent =
      `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    const isDay = this.gameTime >= 6 && this.gameTime < 19;
    document.getElementById('time-icon').textContent = isDay ? '☀️' : '🌙';

    document.getElementById('stat-wood').textContent = Math.floor(this.resources.wood);
    document.getElementById('stat-food').textContent = Math.floor(this.resources.food);
    document.getElementById('stat-stone').textContent = Math.floor(this.resources.stone);
    document.getElementById('stat-gold').textContent = Math.floor(this.resources.gold);
    const ironEl = document.getElementById('stat-iron');
    if (ironEl) ironEl.textContent = Math.floor(this.resources.iron || 0);
    const goodsEl = document.getElementById('stat-goods');
    if (goodsEl) goodsEl.textContent = Math.floor(this.resources.goods || 0);
    if (document.getElementById('stat-faith')) {
      document.getElementById('stat-faith').textContent = Math.floor(this.resources.faith);
      const faithStat = document.getElementById('stat-faith')?.parentElement;
      if (faithStat) {
        const climate = this.getFaithEconomy(0);
        const trend = climate.rate > this.getFactionPopulation(0) * 0.14 ? 'high' : climate.rate < this.getFactionPopulation(0) * 0.08 ? 'low' : 'steady';
        faithStat.title = `Faith ${trend}. Mood x${climate.moodFactor.toFixed(2)}, stability x${climate.stabilityFactor.toFixed(2)}, divine climate x${climate.climateFactor.toFixed(2)}.`;
      }
    }

    // Season badge
    let seasonEl = document.getElementById('season-badge');
    if (!seasonEl) {
      seasonEl = document.createElement('span');
      seasonEl.id = 'season-badge';
      const hudRight = document.querySelector('.hud-right');
      if (hudRight) hudRight.appendChild(seasonEl);
    }
    const seasonIcons = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
    seasonEl.className = `season-badge ${this.season}`;
    seasonEl.textContent = `${seasonIcons[this.season]} ${this.season.charAt(0).toUpperCase() + this.season.slice(1)}`;

    this.updateColonyPressurePanel();

    // Update diplomacy and hero panels if visible
    const diploPanel = document.getElementById('diplomacy-panel');
    if (diploPanel && !diploPanel.classList.contains('hidden')) {
      this.updateDiplomacyPanel();
    }
    const heroPanel = document.getElementById('hero-panel');
    if (heroPanel && !heroPanel.classList.contains('hidden')) {
      this.updateHeroPanel();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const rawDt = this.clock.getDelta();

    this.frameCount++;

    this.simulation.update(rawDt);
    this.godPowers.update(rawDt);

    // Camera shake
    if (this.cameraShake) {
      this.cameraShake.elapsed += rawDt * 1000;
      if (this.cameraShake.elapsed < this.cameraShake.duration) {
        const t = this.cameraShake.elapsed / this.cameraShake.duration;
        const intensity = this.cameraShake.intensity * (1 - t);
        this.camera.position.x += (Math.random() - 0.5) * intensity;
        this.camera.position.y += (Math.random() - 0.5) * intensity;
        this.camera.position.z += (Math.random() - 0.5) * intensity;
      } else {
        this.cameraShake = null;
        this.updateCameraPosition();
      }
    }

    // Animate water shader
    if (this.waterSystem) {
      this.waterSystem.material.uniforms.uTime.value += rawDt;
    }

    // Animate stars
    if (this.starSystem) {
      this.starSystem.material.uniforms.uTime.value += rawDt;
    }

    // Animate clouds
    if (this.clouds) {
      for (const cloud of this.clouds.children) {
        cloud.position.x = cloud.userData.baseX + Math.sin(Date.now() * 0.0001 * cloud.userData.speed) * 15;
      }
    }

    // Animate ambient particles
    if (this.ambientParticles && this.ambientParticles.material.opacity > 0) {
      const positions = this.ambientParticles.mesh.geometry.attributes.position.array;
      for (let i = 0; i < this.ambientParticles.velocities.length; i++) {
        const vel = this.ambientParticles.velocities[i];
        positions[i * 3] += vel.x * rawDt;
        positions[i * 3 + 1] += vel.y * rawDt + Math.sin(Date.now() * 0.002 + i) * 0.005;
        positions[i * 3 + 2] += vel.z * rawDt;

        // Wrap around
        if (positions[i * 3] > 100) positions[i * 3] -= 200;
        if (positions[i * 3] < -100) positions[i * 3] += 200;
        if (positions[i * 3 + 2] > 100) positions[i * 3 + 2] -= 200;
        if (positions[i * 3 + 2] < -100) positions[i * 3 + 2] += 200;
      }
      this.ambientParticles.mesh.geometry.attributes.position.needsUpdate = true;
    }

    // Hover indicator animation
    if (this.hoverIndicator && this.hoverIndicator.visible) {
      this.hoverIndicator.material.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
      this.hoverIndicator.rotation.z += rawDt * 0.5;
    }

    // Update HUD (every 3 frames for performance)
    if (this.frameCount % 3 === 0) {
      this.updateHUD();
    }

    // Render
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
