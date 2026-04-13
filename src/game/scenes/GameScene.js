import * as Phaser from 'phaser';
import { WorldMap } from '../world/WorldMap.js';
import { TerrainRenderer } from '../world/TerrainRenderer.js';
import { EntityManager, setNextEntityId } from '../entities/EntityManager.js';
import { SettlementManager, setNextSettlementId } from '../entities/Settlement.js';
import { KingdomManager, setNextKingdomId } from '../entities/KingdomManager.js';
import { SimulationLoop } from '../systems/SimulationLoop.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { PopulationSystem } from '../systems/PopulationSystem.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { NatureSystem } from '../systems/NatureSystem.js';
import { CivilizationSystem } from '../systems/CivilizationSystem.js';
import { DisasterSystem } from '../systems/DisasterSystem.js';
import { DiplomacySystem } from '../systems/DiplomacySystem.js';
import { AnimalSystem } from '../systems/AnimalSystem.js';
import { AgeSystem } from '../systems/AgeSystem.js';
import { SaveManager } from '../systems/SaveManager.js';
import { TOOLS } from '../data/tools.js';
import { getRace, getSubspeciesById } from '../data/races.js';
import { generateSettlementName } from '../data/names.js';
import { NavalSystem } from '../systems/NavalSystem.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { RoadSystem } from '../systems/RoadSystem.js';
import { EquipmentSystem } from '../systems/EquipmentSystem.js';
import { TechSystem } from '../systems/TechSystem.js';
import { WorldLawsSystem } from '../systems/WorldLawsSystem.js';
import { HistorySystem, HISTORY_EVENTS } from '../systems/HistorySystem.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.mapSize = data.mapSize || 150;
        this.selectedTool = TOOLS.INSPECT;
        this.brushSize = 2;
        this.isPainting = false;
        this.loadSave = data.loadSave || false;
        this.ageSystem = new AgeSystem();
        this.worldAge = 0;          // in ticks
        this.worldYear = 0;         // display year
    }

    create() {
        // === WORLD MAP ===
        this.worldMap = new WorldMap(this.mapSize, this.mapSize, 8);

        // === TERRAIN RENDERER ===
        this.terrainRenderer = new TerrainRenderer(this, this.worldMap);
        this.terrainRenderer.renderAll();

        // === ENTITY MANAGER ===
        this.entityManager = new EntityManager();
        this.settlementManager = new SettlementManager();
        this.kingdomManager = new KingdomManager();

        // === ANIMAL SYSTEM ===
        this.animalSystem = new AnimalSystem();
        if (!this.loadSave) {
            this.animalSystem.spawnRandomAnimals(this.worldMap, 30);
        }

        // === NAVAL SYSTEM ===
        this.navalSystem = new NavalSystem();

        // === DISASTER SYSTEM (needs ref for queuing) ===
        this.disasterSystem = new DisasterSystem();

        // === SOUND SYSTEM ===
        this.soundSystem = new SoundSystem();

        // === ROAD SYSTEM ===
        this.roadSystem = new RoadSystem();

        // === EQUIPMENT SYSTEM ===
        this.equipmentSystem = new EquipmentSystem();

        // === TECH SYSTEM ===
        this.techSystem = new TechSystem();

        // === WORLD LAWS SYSTEM ===
        this.worldLawsSystem = new WorldLawsSystem();

        // === HISTORY SYSTEM ===
        this.historySystem = new HistorySystem();

        // === GAME STATE (shared by all systems) ===
        this.gameState = {
            worldMap: this.worldMap,
            entityManager: this.entityManager,
            settlementManager: this.settlementManager,
            kingdomManager: this.kingdomManager,
            disasterSystem: this.disasterSystem,
            animalSystem: this.animalSystem,
            navalSystem: this.navalSystem,
            ageSystem: this.ageSystem,
            soundSystem: this.soundSystem,
            roadSystem: this.roadSystem,
            equipmentSystem: this.equipmentSystem,
            techSystem: this.techSystem,
            worldLawsSystem: this.worldLawsSystem,
            historySystem: this.historySystem,
            dirtyTiles: [],
            visualEvents: []
        };

        // === SIMULATION LOOP ===
        this.simLoop = new SimulationLoop(this.gameState);
        this.simLoop.addSystem('ages', this.ageSystem);
        this.simLoop.addSystem('nature', new NatureSystem());
        this.simLoop.addSystem('population', new PopulationSystem());
        this.simLoop.addSystem('resource', new ResourceSystem());
        this.simLoop.addSystem('civilization', new CivilizationSystem());
        this.simLoop.addSystem('movement', new MovementSystem());
        this.simLoop.addSystem('combat', new CombatSystem());
        this.simLoop.addSystem('diplomacy', new DiplomacySystem());
        this.simLoop.addSystem('disaster', this.disasterSystem);
        this.simLoop.addSystem('animals', this.animalSystem);
        this.simLoop.addSystem('naval', this.navalSystem);
        this.simLoop.addSystem('roads', this.roadSystem);
        this.simLoop.addSystem('equipment', this.equipmentSystem);
        this.simLoop.addSystem('tech', this.techSystem);
        this.simLoop.addSystem('history', this.historySystem);

        // === ENTITY SPRITES LAYER ===
        this.entityGraphics = this.add.graphics();
        this.entityGraphics.setDepth(10);

        // === BUILDING GRAPHICS LAYER ===
        this.buildingGraphics = this.add.graphics();
        this.buildingGraphics.setDepth(5);

        // === SELECTION / BRUSH OVERLAY ===
        this.brushOverlay = this.add.graphics();
        this.brushOverlay.setDepth(20);

        // === VISUAL EFFECTS LAYER ===
        this.vfxLayer = this.add.graphics();
        this.vfxLayer.setDepth(30);

        // === ENVIRONMENT LAYER (Clouds, Birds) ===
        this.environmentLayer = this.add.graphics();
        this.environmentLayer.setDepth(25);
        
        this.weatherSystem = {
            clouds: [],
            birds: [],
            fireflies: [],
            godRays: [],
            generate: () => {
                const ts = this.worldMap.tileSize;
                const width = this.worldMap.width * ts;
                const height = this.worldMap.height * ts;
                for(let i = 0; i < ((this.mapSize/100) * 45); i++) {
                    this.weatherSystem.clouds.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        vx: Math.random() * 0.3 + 0.1,
                        vy: (Math.random() - 0.5) * 0.05,
                        size: Math.random() * 30 + 15,
                        alpha: Math.random() * 0.15 + 0.05
                    });
                }
                for(let i = 0; i < ((this.mapSize/100) * 20); i++) {
                    this.weatherSystem.birds.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        vx: (Math.random() - 0.5) * 0.8,
                        vy: (Math.random() - 0.5) * 0.8,
                        z: Math.random() * 20 + 10,
                        flapOff: Math.random() * Math.PI * 2
                    });
                }
                for(let i = 0; i < ((this.mapSize/100) * 80); i++) {
                    this.weatherSystem.fireflies.push({
                        x: Math.random() * width,
                        y: Math.random() * height,
                        vx: (Math.random() - 0.5) * 0.4,
                        vy: (Math.random() - 0.5) * 0.4,
                        offset: Math.random() * Math.PI * 2,
                        size: Math.random() * 1.5 + 0.5
                    });
                }
                for(let i = 0; i < 8; i++) {
                    this.weatherSystem.godRays.push({
                        x: Math.random() * width,
                        w: Math.random() * 400 + 100,
                        offset: Math.random() * Math.PI * 2,
                        speed: Math.random() * 0.0005 + 0.0002
                    });
                }
            }
        };
        this.weatherSystem.generate();

        // === PLAGUE OVERLAY LAYER ===
        this.plagueOverlay = this.add.graphics();
        this.plagueOverlay.setDepth(3);

        // === AMBIENT TINT OVERLAY ===
        this.ambientOverlay = this.add.graphics();
        this.ambientOverlay.setDepth(40);
        // It stays fixed to camera
        this.ambientOverlay.setScrollFactor(0);
        this.plagueOverlay.setDepth(3);

        // === CAMERA SETUP ===
        const bounds = this.worldMap.getWorldBounds();
        // this.cameras.main.setBounds(0, 0, bounds.width, bounds.height); // Removed to prevent zoom bug
        this.cameras.main.setZoom(2);
        this.cameras.main.centerOn(bounds.width / 2, bounds.height / 2);

        // Nâng cấp đồ họa: Thêm Post Processing FX (Cinematic feel)
        if (this.cameras.main.postFX) {
            // Viền tối nhẹ tạo tập trung vào chính giữa thế giới
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9, 0.3);
            
            // Thêm Bloom Glow để các hiệu ứng như Lava / Cửa sổ sáng lên
            this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 0.9, 1.2);

            // Tilt Shift để tạo hiệu ứng Diorama / Thế giới thu nhỏ (đặc trưng game God Simulator)
            try {
                this.cameras.main.postFX.addTiltShift(0.6);
            } catch(e) {}

            // Chuẩn hóa và làm rực rỡ màu sắc hơn nữa
            const colorFX = this.cameras.main.postFX.addColorMatrix();
            colorFX.saturation(1.25); 
            colorFX.contrast(1.10);
            colorFX.brightness(1.03); // Tăng sáng nhẹ cho rực ngời
        }

        // === INPUT: Camera controls ===
        this.cursors = this.input.keyboard.addKeys({
            up: 'W',
            down: 'S',
            left: 'A',
            right: 'D',
            zoomIn: 'Q',
            zoomOut: 'E',
            pause: 'SPACE',
            speed1: 'ONE',
            speed2: 'TWO',
            speed3: 'THREE',
            speed5: 'FIVE',
            save: 'F5',
            load: 'F9'
        });

        // Scroll zoom - Integer steps for pure pixel art
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            const cam = this.cameras.main;
            const newZoom = Phaser.Math.Clamp(cam.zoom + (deltaY > 0 ? -1 : 1), 1, 8);
            cam.setZoom(Math.round(newZoom));
        });

        // === INPUT: Mouse drag pan (right-click or middle-click) ===
        this.dragStart = null;
        this._soundInitialized = false;
        this.input.on('pointerdown', (pointer) => {
            if (!this._soundInitialized) {
                this.soundSystem.init();
                this._soundInitialized = true;
            }
            if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
                this.dragStart = { x: pointer.worldX, y: pointer.worldY };
            } else if (pointer.leftButtonDown()) {
                this.isPainting = true;
                this.handleToolUse(pointer);
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.dragStart && (pointer.rightButtonDown() || pointer.middleButtonDown())) {
                const cam = this.cameras.main;
                cam.scrollX += (this.dragStart.x - pointer.worldX);
                cam.scrollY += (this.dragStart.y - pointer.worldY);
            }
            if (this.isPainting && pointer.leftButtonDown()) {
                this.handleToolUse(pointer);
            }
            this.updateBrushOverlay(pointer);
        });

        this.input.on('pointerup', () => {
            this.dragStart = null;
            this.isPainting = false;
        });

        // === LOAD SAVE IF REQUESTED ===
        if (this.loadSave) {
            this.loadGameState();
        }

        // === LAUNCH HUD ===
        this.scene.launch('HudScene', { gameScene: this });

        // === EXPOSE to HUD ===
        this.registry.set('simSpeed', 1);
        this.registry.set('tickCount', 0);
        this.registry.set('totalPopulation', 0);
        this.registry.set('animalCount', 0);
        this.registry.set('worldYear', 0);
    }

    update(time, delta) {
        const camSpeed = 4 / this.cameras.main.zoom;
        if (this.cursors.up.isDown) this.cameras.main.scrollY -= camSpeed;
        if (this.cursors.down.isDown) this.cameras.main.scrollY += camSpeed;
        if (this.cursors.left.isDown) this.cameras.main.scrollX -= camSpeed;
        if (this.cursors.right.isDown) this.cameras.main.scrollX += camSpeed;

        // Manual bounds clamping to avoid getting lost
        const boundsWidth = this.worldMap.width * this.worldMap.tileSize;
        const boundsHeight = this.worldMap.height * this.worldMap.tileSize;
        const wView = this.cameras.main.width / this.cameras.main.zoom;
        const hView = this.cameras.main.height / this.cameras.main.zoom;
        this.cameras.main.scrollX = Phaser.Math.Clamp(this.cameras.main.scrollX, -wView, boundsWidth + wView);
        this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY, -hView, boundsHeight + hView);


        // Zoom controls - Integer steps for pure pixel art
        if (Phaser.Input.Keyboard.JustDown(this.cursors.zoomIn)) {
            const cam = this.cameras.main;
            cam.setZoom(Math.min(8, Math.round(cam.zoom) + 1));
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.zoomOut)) {
            const cam = this.cameras.main;
            cam.setZoom(Math.max(1, Math.round(cam.zoom) - 1));
        }

        // Speed controls
        if (Phaser.Input.Keyboard.JustDown(this.cursors.pause)) {
            this.simLoop.setSpeed(this.simLoop.speed === 0 ? 1 : 0);
            this.registry.set('simSpeed', this.simLoop.speed);
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.speed1)) {
            this.simLoop.setSpeed(1);
            this.registry.set('simSpeed', 1);
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.speed2)) {
            this.simLoop.setSpeed(2);
            this.registry.set('simSpeed', 2);
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.speed3)) {
            this.simLoop.setSpeed(5);
            this.registry.set('simSpeed', 5);
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.speed5)) {
            this.simLoop.setSpeed(10);
            this.registry.set('simSpeed', 10);
        }

        // Save/Load shortcuts
        if (Phaser.Input.Keyboard.JustDown(this.cursors.save)) {
            this.saveGame();
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.load)) {
            this.loadGameState();
        }

        // === SIMULATION TICK ===
        const prevTick = this.simLoop.getTick();
        this.simLoop.update(delta);
        const newTick = this.simLoop.getTick();

        // Track world age
        if (newTick > prevTick) {
            this.worldAge += (newTick - prevTick);
            this.worldYear = Math.floor(this.worldAge / 50); // ~1 year per 50 ticks
        }

        // === PROCESS DIRTY TILES ===
        if (this.gameState.dirtyTiles.length > 0) {
            this.terrainRenderer.markDirty(this.gameState.dirtyTiles);
            this.terrainRenderer.updateDirty();
            this.gameState.dirtyTiles = [];
        }

        // === PROCESS VISUAL EVENTS ===
        if (this.gameState.visualEvents && this.gameState.visualEvents.length > 0) {
            for (const evt of this.gameState.visualEvents) {
                this.playVisualEffect(evt);
            }
            this.gameState.visualEvents = [];
        }

        // === RENDER TERRITORY ===
        this.renderTerritory();

        // === RENDER PLAGUE OVERLAY ===
        this.renderPlagueOverlay();

        // === RENDER ROADS ===
        this.renderRoads();

        // === RENDER ENTITIES ===
        this.renderEntities();

        // === RENDER BUILDINGS (includes farm plots) ===
        this.renderBuildings();

        // === RENDER SIEGE EFFECTS ===
        this.renderSiege();

        // === RENDER FIRES ===
        this.renderFires();

        // === RENDER ENVIRONMENT (Clouds, Birds) ===
        this.renderEnvironment(delta, time);

        // === AMBIENT TINT ===
        this.renderAmbientTint();

        // === UPDATE TERRAIN VISIBILITY ===
        this.terrainRenderer.updateVisibility(this.cameras.main);

        // === UPDATE REGISTRY FOR HUD ===
        this.registry.set('tickCount', this.simLoop.getTick());
        this.registry.set('totalPopulation', this.entityManager.countAlive());
        this.registry.set('animalCount', this.animalSystem.getAllAlive().length);
        this.registry.set('worldYear', this.worldYear);
    }

    // ─── RENDER: Environment (Clouds & Birds) ─────────────────────
    renderEnvironment(delta, time) {
        this.environmentLayer.clear();
        const ts = this.worldMap.tileSize;
        const boundsWidth = this.worldMap.width * ts;
        const boundsHeight = this.worldMap.height * ts;
        
        const cam = this.cameras.main;
        const vx = cam.worldView.x;
        const vy = cam.worldView.y;
        const vw = cam.worldView.width;
        const vh = cam.worldView.height;
        
        // Render Clouds
        for (const c of this.weatherSystem.clouds) {
            c.x += c.vx * delta * 0.01;
            c.y += c.vy * delta * 0.01;
            if (c.x > boundsWidth + c.size*2) c.x = -c.size*2;
            if (c.y > boundsHeight + c.size*2) c.y = -c.size*2;
            if (c.y < -c.size*2) c.y = boundsHeight + c.size*2;
            
            if (c.x < vx - c.size*2 || c.x > vx + vw + c.size*2 ||
                c.y < vy - c.size*2 || c.y > vy + vh + c.size*2) continue;
            
            // Cloud shadow
            this.environmentLayer.fillStyle(0x000000, c.alpha * 0.5); 
            const shadowOffY = ts * 2;
            this.environmentLayer.fillCircle(c.x, c.y + shadowOffY, c.size);
            this.environmentLayer.fillCircle(c.x + c.size * 0.8, c.y + shadowOffY + c.size * 0.2, c.size * 0.8);
            this.environmentLayer.fillCircle(c.x - c.size * 0.6, c.y + shadowOffY + c.size * 0.1, c.size * 0.6);
            this.environmentLayer.fillCircle(c.x + c.size * 1.5, c.y + shadowOffY - c.size * 0.1, c.size * 0.5);
            
            // Cloud body
            this.environmentLayer.fillStyle(0xffffff, c.alpha);
            this.environmentLayer.fillCircle(c.x, c.y, c.size);
            this.environmentLayer.fillCircle(c.x + c.size * 0.8, c.y + c.size * 0.2, c.size * 0.8);
            this.environmentLayer.fillCircle(c.x - c.size * 0.6, c.y + c.size * 0.1, c.size * 0.6);
            this.environmentLayer.fillCircle(c.x + c.size * 1.5, c.y - c.size * 0.1, c.size * 0.5);
        }

        // Render Birds
        for (const b of this.weatherSystem.birds) {
            b.x += b.vx * delta * 0.05;
            b.y += b.vy * delta * 0.05;

            // Flock random turn
            if (Math.random() < 0.02) {
                b.vx += (Math.random() - 0.5) * 0.5;
                b.vy += (Math.random() - 0.5) * 0.5;
                let speed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
                if (speed > 1.0) { b.vx /= speed; b.vy /= speed; }
                if (speed < 0.3) { b.vx *= 1.5; b.vy *= 1.5; }
            }

            if (b.x > boundsWidth + 10) b.x = -10;
            if (b.x < -10) b.x = boundsWidth + 10;
            if (b.y > boundsHeight + 10) b.y = -10;
            if (b.y < -10) b.y = boundsHeight + 10;
            
            if (b.x < vx - 10 || b.x > vx + vw + 10 ||
                b.y < vy - 10 || b.y > vy + vh + 10) continue;
            
            // Bird shadow
            this.environmentLayer.lineStyle(1, 0x000000, 0.2);
            this.environmentLayer.beginPath();
            this.environmentLayer.moveTo(b.x - 2, b.y + b.z);
            this.environmentLayer.lineTo(b.x, b.y + b.z);
            this.environmentLayer.lineTo(b.x + 2, b.y + b.z);
            this.environmentLayer.strokePath();

            // Draw Bird
            this.environmentLayer.lineStyle(1, 0x000000, 0.6);
            const flap = Math.sin(time * 0.01 + b.flapOff) * 2;
            const wingY = b.y - flap;
            
            this.environmentLayer.beginPath();
            this.environmentLayer.moveTo(b.x - 2, wingY);
            this.environmentLayer.lineTo(b.x, b.y);
            this.environmentLayer.lineTo(b.x + 2, wingY);
            this.environmentLayer.strokePath();
        }

        // Render God Rays (Tia nắng chiếu xuống thế giới)
        for (const ray of this.weatherSystem.godRays) {
            const rayAlpha = (Math.sin(time * ray.speed + ray.offset) + 1) * 0.5 * 0.08;
            if (rayAlpha <= 0) continue;
            
            // Chỉ vẽ góc chiếu nghiêng
            const rayX = ray.x + Math.sin(time * ray.speed * 0.5) * 200;
            if (rayX + ray.w < vx || rayX - 300 > vx + vw) continue;

            this.environmentLayer.fillStyle(0xfffae6, rayAlpha);
            this.environmentLayer.beginPath();
            this.environmentLayer.moveTo(rayX, vy - 100);
            this.environmentLayer.lineTo(rayX + ray.w, vy - 100);
            this.environmentLayer.lineTo(rayX + ray.w - 300, vy + vh + 100);
            this.environmentLayer.lineTo(rayX - 300, vy + vh + 100);
            this.environmentLayer.fillPath();
        }

        // Render Fireflies / Magic Dust (Đom đóm / Hạt bụi ma thuật bay lơ lửng)
        // Hiển thị rõ nhất vào buổi tối hoặc trên nước / rừng dậm
        const isDarkAge = this.ageSystem.getCurrentAge().ambientLight < 1.0;
        const fireflyBaseAlpha = isDarkAge ? 0.8 : 0.2;

        for (const f of this.weatherSystem.fireflies) {
            f.x += f.vx * delta * 0.05 + Math.sin(time * 0.002 + f.offset) * 0.2;
            f.y += f.vy * delta * 0.05 + Math.cos(time * 0.002 + f.offset) * 0.2;

            if (f.x > boundsWidth) f.x = 0;
            if (f.x < 0) f.x = boundsWidth;
            if (f.y > boundsHeight) f.y = 0;
            if (f.y < 0) f.y = boundsHeight;
            
            if (f.x < vx - 5 || f.x > vx + vw + 5 ||
                f.y < vy - 5 || f.y > vy + vh + 5) continue;
            
            const blink = (Math.sin(time * 0.005 + f.offset) + 1) * 0.5;
            if (blink < 0.1) continue;

            this.environmentLayer.fillStyle(0xd4fc79, blink * fireflyBaseAlpha);
            this.environmentLayer.fillCircle(f.x, f.y, f.size);
            
            // Vầng sáng nhỏ quanh đom đóm
            this.environmentLayer.fillStyle(0x96e6a1, blink * fireflyBaseAlpha * 0.4);
            this.environmentLayer.fillCircle(f.x, f.y, f.size * 2.5);
        }
    }

    // ─── AMBIENT TINT ───────────────────────────────────────────
    renderAmbientTint() {
        const currentAge = this.ageSystem.getCurrentAge();
        const color = currentAge.colorTint;
        
        // Custom blending behavior
        let alpha = 0.15;
        if (currentAge.ambientLight < 1.0) {
            alpha = (1.0 - currentAge.ambientLight) * 0.5 + 0.1;
        } else if (currentAge.ambientLight > 1.0) {
            alpha = (currentAge.ambientLight - 1.0) * 0.2 + 0.1;
        }

        if (color === 0xffffff && currentAge.ambientLight === 1.0) {
            this.ambientOverlay.clear();
            return;
        }

        this.ambientOverlay.clear();
        this.ambientOverlay.fillStyle(color, alpha);
        this.ambientOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
    }

    // ─── RENDER: Territory ──────────────────────────────────────
    renderTerritory() {
        if (!this._territoryFrame) this._territoryFrame = 0;
        this._territoryFrame++;
        if (this._territoryFrame % 30 !== 1 && this._territoryGfx) return;

        if (!this._territoryGfx) {
            this._territoryGfx = this.add.graphics();
            this._territoryGfx.setDepth(2);
        }
        this._territoryGfx.clear();

        const cam = this.cameras.main;
        const ts = this.worldMap.tileSize;
        const vx = cam.worldView.x;
        const vy = cam.worldView.y;
        const vw = cam.worldView.width;
        const vh = cam.worldView.height;

        for (const settlement of this.settlementManager.getAll()) {
            const race = getRace(settlement.raceId);
            let tColor = race.color;
            const kingdom = this.kingdomManager.get(settlement.kingdomId);
            if (kingdom) {
                tColor = kingdom.color;
            }
            this._territoryGfx.fillStyle(tColor, 0.2);

            for (const key of settlement.territory) {
                const [tx, ty] = key.split(',').map(Number);
                const px = tx * ts;
                const py = ty * ts;
                if (px < vx - ts || px > vx + vw + ts ||
                    py < vy - ts || py > vy + vh + ts) continue;
                this._territoryGfx.fillRect(px, py, ts, ts);
            }
        }
    }

    // ─── RENDER: Plague overlay ─────────────────────────────────
    renderPlagueOverlay() {
        if (!this._plagueFrame) this._plagueFrame = 0;
        this._plagueFrame++;
        if (this._plagueFrame % 10 !== 1) return;

        this.plagueOverlay.clear();
        if (this.worldMap.plagueTiles.size === 0) return;

        const cam = this.cameras.main;
        const ts = this.worldMap.tileSize;
        const vx = cam.worldView.x;
        const vy = cam.worldView.y;
        const vw = cam.worldView.width;
        const vh = cam.worldView.height;

        this.plagueOverlay.fillStyle(0x00ff00, 0.12);
        for (const key of this.worldMap.plagueTiles) {
            const [tx, ty] = key.split(',').map(Number);
            const px = tx * ts;
            const py = ty * ts;
            if (px < vx - ts || px > vx + vw + ts ||
                py < vy - ts || py > vy + vh + ts) continue;
            this.plagueOverlay.fillRect(px, py, ts, ts);
        }

        // Radiation overlay (yellow-green, more visible)
        if (this.worldMap.radiationTiles && this.worldMap.radiationTiles.size > 0) {
            this.plagueOverlay.fillStyle(0x88ff00, 0.18);
            for (const key of this.worldMap.radiationTiles) {
                const [tx, ty] = key.split(',').map(Number);
                const px = tx * ts;
                const py = ty * ts;
                if (px < vx - ts || px > vx + vw + ts ||
                    py < vy - ts || py > vy + vh + ts) continue;
                this.plagueOverlay.fillRect(px, py, ts, ts);
            }
        }
    }

    // ─── RENDER: Roads ───────────────────────────────────────────
    renderRoads() {
        if (!this._roadFrame) this._roadFrame = 0;
        this._roadFrame++;
        if (this._roadFrame % 60 !== 1 && this._roadGfx) return;

        if (!this._roadGfx) {
            this._roadGfx = this.add.graphics();
            this._roadGfx.setDepth(3);
        }
        this._roadGfx.clear();

        const cam = this.cameras.main;
        const ts = this.worldMap.tileSize;
        const vx = cam.worldView.x;
        const vy = cam.worldView.y;
        const vw = cam.worldView.width;
        const vh = cam.worldView.height;

        for (const road of this.roadSystem.getAllRoads()) {
            for (const t of road.tiles) {
                const px = t.x * ts;
                const py = t.y * ts;
                if (px < vx - ts || px > vx + vw + ts ||
                    py < vy - ts || py > vy + vh + ts) continue;
                // Tan road with subtle border
                this._roadGfx.fillStyle(0x6B5B3A, 0.4);
                this._roadGfx.fillRect(px, py, ts, ts);
                this._roadGfx.fillStyle(0x8B7355, 0.6);
                this._roadGfx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
            }
        }
    }

    // ─── RENDER: Entities + Animals ─────────────────────────────
    renderEntities() {
        this.entityGraphics.clear();
        const cam = this.cameras.main;
        const ts = this.worldMap.tileSize;
        const vx = cam.worldView.x;
        const vy = cam.worldView.y;
        const vw = cam.worldView.width;
        const vh = cam.worldView.height;

        // Render civilization units
        for (const entity of this.entityManager.getAllAlive()) {
            if (entity.x < vx - ts || entity.x > vx + vw + ts ||
                entity.y < vy - ts || entity.y > vy + vh + ts) {
                continue;
            }

            let size = 3;
            if (entity.state === 'fighting') size = 4;
            if (entity.isLeader) size = 5;
            if (entity.traits.includes('giant')) size += 3;
            if (entity.traits.includes('tiny')) size = Math.max(1, size - 2);

            // Dark outline
            this.entityGraphics.fillStyle(0x000000, 0.6);
            this.entityGraphics.fillRect(
                entity.x - (size + 1) / 2,
                entity.y - (size + 1) / 2,
                size + 1, size + 1
            );

            // Unit body or Boat
            if (entity.isBoat) {
                // Draw a simple boat shape
                this.entityGraphics.fillStyle(0x8B4513, 1.0); // wood color
                this.entityGraphics.fillRoundedRect(entity.x - size, entity.y - size/2, size * 2, size, 2);
                // Sail
                this.entityGraphics.fillStyle(0xffffff, 0.9);
                this.entityGraphics.beginPath();
                this.entityGraphics.moveTo(entity.x, entity.y - size/2);
                this.entityGraphics.lineTo(entity.x + size, entity.y - size);
                this.entityGraphics.lineTo(entity.x, entity.y - size * 1.5);
                this.entityGraphics.fillPath();
            } else {
                let alpha = 1;
                if (entity.state === 'fighting') alpha = 0.6 + Math.random() * 0.4;
                if (entity.traits && entity.traits.includes('infected')) alpha = 0.5;
                
                const ex = entity.x;
                const ey = entity.y;
                const hs = size / 2;

                // Apply subspecies color modification
                let entityColor = entity.color;
                if (entity.subspecies && entity.subspecies.colorMod) {
                    const r = (entityColor >> 16) & 0xFF;
                    const g = (entityColor >> 8) & 0xFF;
                    const b = entityColor & 0xFF;
                    const mod = entity.subspecies.colorMod;
                    const nr = Math.max(0, Math.min(255, r + Math.floor(mod * 50)));
                    const ng = Math.max(0, Math.min(255, g + Math.floor(mod * 50)));
                    const nb = Math.max(0, Math.min(255, b + Math.floor(mod * 50)));
                    entityColor = (nr << 16) | (ng << 8) | nb;
                }

                this.entityGraphics.fillStyle(entityColor, alpha);

                // --- Stylized Custom Race Units ---
                switch(entity.raceId) {
                    case 'elf':
                        this.entityGraphics.fillRect(ex - hs*0.6, ey - hs*1.2, size*0.6, size*1.2);
                        this.entityGraphics.fillStyle(0xffebcd, alpha); // face
                        this.entityGraphics.fillRect(ex - hs*0.6, ey - hs*1.2, size*0.6, size*0.4);
                        this.entityGraphics.fillStyle(0x2ecc71, alpha); // green hat
                        this.entityGraphics.fillTriangle(ex - hs, ey - hs, ex + hs, ey - hs, ex, ey - hs*2);
                        break;
                    case 'orc':
                        this.entityGraphics.fillRect(ex - hs*1.2, ey - hs, size*1.2, size);
                        this.entityGraphics.fillStyle(0x8b0000, alpha); // Red eyes
                        this.entityGraphics.fillRect(ex - 1, ey - hs*0.5, 2, 1);
                        break;
                    case 'dwarf':
                        this.entityGraphics.fillRect(ex - hs*1.2, ey - hs*0.6, size*1.2, size*0.6);
                        this.entityGraphics.fillStyle(0x8B4513, alpha); // Brown beard
                        this.entityGraphics.fillRect(ex - hs, ey, size, size*0.3);
                        break;
                    case 'demon':
                        this.entityGraphics.fillRect(ex - hs, ey - hs, size, size);
                        this.entityGraphics.fillStyle(0x000000, alpha); // Sừng
                        this.entityGraphics.fillRect(ex - hs, ey - hs - 2, 1, 2);
                        this.entityGraphics.fillRect(ex + hs - 1, ey - hs - 2, 1, 2);
                        break;
                    case 'undead': {
                        // Bóng ma lơ lửng, phần đuôi sương khói
                        const ghostFloat = Math.sin(Date.now() * 0.005 + ex) * 1.5;
                        this.entityGraphics.fillStyle(0x48dbfb, Math.max(0.3, alpha - 0.2)); // Hồn lam nhạt
                        this.entityGraphics.fillCircle(ex, ey + ghostFloat, hs*1.2);
                        // Đuôi ma (Trail hình tam giác)
                        this.entityGraphics.fillTriangle(ex - hs*0.8, ey + ghostFloat, ex + hs*0.8, ey + ghostFloat, ex, ey + hs*2 + ghostFloat);
                        // Hốc mắt phát sáng
                        this.entityGraphics.fillStyle(0xffffff, 1);
                        this.entityGraphics.fillRect(ex - hs*0.5, ey - hs*0.2 + ghostFloat, 1.5, 1.5);
                        this.entityGraphics.fillRect(ex + hs*0.5, ey - hs*0.2 + ghostFloat, 1.5, 1.5);
                        break;
                    }
                    case 'human':
                    default: {
                        // Vẽ "chuẩn Pixel" (chấm từng ô nhỏ 1x1 để tạo hình người)
                        const px = Math.round(ex);
                        const py = Math.round(ey);

                        // 1. Quần (Pants)
                        this.entityGraphics.fillStyle(0x3e2723, alpha); // Mầu nâu sẫm
                        this.entityGraphics.fillRect(px - 1.5, py + 1.5, 1.5, 2); // Chân trái
                        this.entityGraphics.fillRect(px + 0.5, py + 1.5, 1.5, 2); // Chân phải

                        // 2. Áo (Body) - Màu của vương quốc
                        this.entityGraphics.fillStyle(entityColor, alpha); 
                        this.entityGraphics.fillRect(px - 1.5, py - 1.5, 3.5, 3); // Thân áo
                        
                        // 3. Tay (Arms)
                        this.entityGraphics.fillStyle(0xffdbac, alpha); // Màu da mặt/tay
                        this.entityGraphics.fillRect(px - 2.5, py - 1.5, 1, 2); // Tay trái
                        this.entityGraphics.fillRect(px + 2, py - 1.5, 1, 2); // Tay phải

                        // 4. Đầu (Head & Skin)
                        this.entityGraphics.fillRect(px - 1.5, py - 4.5, 3.5, 3); // Mặt hình vuông

                        // 5. Tóc (Hair)
                        this.entityGraphics.fillStyle(0x3b2818, alpha); // Nâu đen
                        this.entityGraphics.fillRect(px - 1.5, py - 5.5, 3.5, 1.5); // Mái chóp
                        this.entityGraphics.fillRect(px + 1.5, py - 4.5, 1.5, 1.5); // Tóc đuôi gáy phải

                        // 6. Mắt (Eye) - (Góc nhìn hơi nghiêng nên thấy 1 mắt rõ)
                        this.entityGraphics.fillStyle(0x111111, alpha);
                        this.entityGraphics.fillRect(px - 0.5, py - 3.5, 1, 1);

                        // 7. Vũ khí / Công cụ 
                        if (entity.state === 'fighting') {
                            // Cầm kiếm chém lên
                            this.entityGraphics.fillStyle(0xbdc3c7, alpha); // Lưỡi kiếm bạc
                            this.entityGraphics.fillRect(px + 2.5, py - 5.5, 1, 4);
                            this.entityGraphics.fillStyle(0xc0392b, alpha); // Chuôi đỏ
                            this.entityGraphics.fillRect(px + 2, py - 1.5, 2, 1);
                        } else if (entity.state === 'chopping' || entity.state === 'mining') {
                            // Cầm Rìu/Cuốc
                            this.entityGraphics.fillStyle(0x8B4513, alpha); // Cán gỗ
                            this.entityGraphics.fillRect(px + 2.5, py - 4, 1, 3);
                            this.entityGraphics.fillStyle(0x7f8c8d, alpha); // Lưỡi búa đá
                            this.entityGraphics.fillRect(px + 3.5, py - 4, 1.5, 1.5);
                        }
                        break;
                    }
                }
            }

            // Subspecies indicator — small colored dot for non-default subspecies
            if (entity.subspecies && entity.subspecies.colorMod !== 0) {
                // White dot for lightened subspecies, dark dot for darkened
                const dotColor = entity.subspecies.colorMod > 0 ? 0xffffff : 0x333333;
                this.entityGraphics.fillStyle(dotColor, 0.8);
                this.entityGraphics.fillRect(entity.x + size / 2, entity.y - size / 2, 1, 1);
            }

            // Plagued indicator
            if (entity.traits && entity.traits.includes('infected')) {
                this.entityGraphics.fillStyle(0x00ff00, 0.4);
                this.entityGraphics.fillRect(entity.x - 1, entity.y - size / 2 - 1, 2, 1);
            }

            // Carrying indicator
            if (entity.carrying) {
                const carryColor = entity.carrying.type === 'food' ? 0xf1c40f
                    : entity.carrying.type === 'wood' ? 0x8B4513 : 0x95a5a6;
                this.entityGraphics.fillStyle(carryColor, 0.9);
                this.entityGraphics.fillRect(entity.x + 1, entity.y - 2, 2, 2);
            }

            // King Crown
            if (entity.isKing) {
                this.entityGraphics.fillStyle(0xffd700, 1.0); // Gold
                // A small 3-pixel crown above the head
                this.entityGraphics.fillRect(entity.x - 1.5, entity.y - size / 2 - 2, 3, 2);
                this.entityGraphics.fillRect(entity.x - 2.5, entity.y - size / 2 - 3, 1, 1);
                this.entityGraphics.fillRect(entity.x - 0.5, entity.y - size / 2 - 3, 1, 1);
                this.entityGraphics.fillRect(entity.x + 1.5, entity.y - size / 2 - 3, 1, 1);
            }

            // HP bar for damaged units
            if (entity.hp < entity.maxHp) {
                const hpRatio = entity.hp / entity.maxHp;
                const barW = 8;
                this.entityGraphics.fillStyle(0x000000, 0.6);
                this.entityGraphics.fillRect(entity.x - barW / 2, entity.y - size / 2 - 3, barW, 2);
                const hpColor = hpRatio > 0.6 ? 0x2ecc71 : hpRatio > 0.3 ? 0xf39c12 : 0xe74c3c;
                this.entityGraphics.fillStyle(hpColor, 0.9);
                this.entityGraphics.fillRect(entity.x - barW / 2, entity.y - size / 2 - 3, barW * hpRatio, 2);
            }
        }

        // Render animals
        for (const animal of this.animalSystem.getAllAlive()) {
            if (animal.x < vx - ts || animal.x > vx + vw + ts ||
                animal.y < vy - ts || animal.y > vy + vh + ts) {
                continue;
            }

            // Dragon gets special rendering
            if (animal.type === 'dragon') {
                const ds = 4;
                // Wings
                this.entityGraphics.fillStyle(0x991111, 0.8);
                this.entityGraphics.fillTriangle(
                    animal.x - ds * 2, animal.y,
                    animal.x - ds * 0.5, animal.y - ds * 0.5,
                    animal.x - ds * 0.5, animal.y + ds * 0.5
                );
                this.entityGraphics.fillTriangle(
                    animal.x + ds * 2, animal.y,
                    animal.x + ds * 0.5, animal.y - ds * 0.5,
                    animal.x + ds * 0.5, animal.y + ds * 0.5
                );
                // Body
                this.entityGraphics.fillStyle(animal.color, 1);
                this.entityGraphics.fillCircle(animal.x, animal.y, ds);
                // Eyes
                this.entityGraphics.fillStyle(0xffff00, 1);
                this.entityGraphics.fillRect(animal.x - 1.5, animal.y - 1, 1, 1);
                this.entityGraphics.fillRect(animal.x + 0.5, animal.y - 1, 1, 1);
                // HP bar
                if (animal.hp < animal.maxHp) {
                    const hpRatio = animal.hp / animal.maxHp;
                    this.entityGraphics.fillStyle(0x000000, 0.6);
                    this.entityGraphics.fillRect(animal.x - 4, animal.y - ds - 3, 8, 2);
                    this.entityGraphics.fillStyle(hpRatio > 0.5 ? 0x2ecc71 : 0xe74c3c, 0.9);
                    this.entityGraphics.fillRect(animal.x - 4, animal.y - ds - 3, 8 * hpRatio, 2);
                }
            } else if (animal.type === 'crabzilla') {
                // Crabzilla — giant red crab
                const cs = 6;
                this.entityGraphics.fillStyle(0xff3333, 1);
                this.entityGraphics.fillCircle(animal.x, animal.y, cs);
                // Claws
                this.entityGraphics.fillStyle(0xcc2222, 1);
                this.entityGraphics.fillCircle(animal.x - cs, animal.y - cs * 0.3, cs * 0.5);
                this.entityGraphics.fillCircle(animal.x + cs, animal.y - cs * 0.3, cs * 0.5);
                // Eyes
                this.entityGraphics.fillStyle(0x000000, 1);
                this.entityGraphics.fillRect(animal.x - 2, animal.y - 2, 1, 1);
                this.entityGraphics.fillRect(animal.x + 1, animal.y - 2, 1, 1);
                // HP bar
                if (animal.hp < animal.maxHp) {
                    const hpRatio = animal.hp / animal.maxHp;
                    this.entityGraphics.fillStyle(0x000000, 0.6);
                    this.entityGraphics.fillRect(animal.x - 6, animal.y - cs - 4, 12, 2);
                    this.entityGraphics.fillStyle(hpRatio > 0.5 ? 0x2ecc71 : 0xe74c3c, 0.9);
                    this.entityGraphics.fillRect(animal.x - 6, animal.y - cs - 4, 12 * hpRatio, 2);
                }
            } else if (animal.type === 'ufo') {
                // UFO — silver disc with rotating lights
                const us = 5;
                // Disc body
                this.entityGraphics.fillStyle(0xC0C0C0, 1);
                this.entityGraphics.fillRoundedRect(animal.x - us, animal.y - us * 0.4, us * 2, us * 0.8, 2);
                // Dome
                this.entityGraphics.fillStyle(0x88ccff, 0.8);
                this.entityGraphics.fillCircle(animal.x, animal.y - us * 0.4, us * 0.5);
                // Rotating light — alternates color
                const lightColor = (Math.floor(Date.now() / 200) % 3 === 0) ? 0xff0000 :
                                   (Math.floor(Date.now() / 200) % 3 === 1) ? 0x00ff00 : 0x0000ff;
                this.entityGraphics.fillStyle(lightColor, 1);
                this.entityGraphics.fillCircle(animal.x, animal.y + us * 0.2, 1);
                // HP bar
                if (animal.hp < animal.maxHp) {
                    const hpRatio = animal.hp / animal.maxHp;
                    this.entityGraphics.fillStyle(0x000000, 0.6);
                    this.entityGraphics.fillRect(animal.x - 6, animal.y - us - 4, 12, 2);
                    this.entityGraphics.fillStyle(hpRatio > 0.5 ? 0x2ecc71 : 0xe74c3c, 0.9);
                    this.entityGraphics.fillRect(animal.x - 6, animal.y - us - 4, 12 * hpRatio, 2);
                }
            } else {
                // ─── PER-TYPE CREATURE RENDERING ────────────────────────
                const ax = animal.x;
                const ay = animal.y;
                const s = 2; // base half-size

                switch (animal.type) {
                    case 'skeleton': {
                        // Cream/white stick figure with visible ribs
                        const sz = 3;
                        this.entityGraphics.fillStyle(0xd4c5a9, 0.9);
                        // Skull
                        this.entityGraphics.fillCircle(ax, ay - sz, 2);
                        // Spine
                        this.entityGraphics.fillRect(ax - 0.5, ay - sz + 2, 1, sz);
                        // Ribs
                        this.entityGraphics.fillRect(ax - 2, ay - sz + 3, 4, 1);
                        this.entityGraphics.fillRect(ax - 2, ay - sz + 5, 4, 1);
                        // Arms
                        this.entityGraphics.fillRect(ax - 3, ay - sz + 3, 2, 1);
                        this.entityGraphics.fillRect(ax + 1, ay - sz + 3, 2, 1);
                        break;
                    }
                    case 'snowman': {
                        // Three stacked white circles with carrot nose
                        this.entityGraphics.fillStyle(0xf0f0f0, 1);
                        this.entityGraphics.fillCircle(ax, ay + 3, 4);
                        this.entityGraphics.fillCircle(ax, ay - 1, 3);
                        this.entityGraphics.fillCircle(ax, ay - 5, 2);
                        // Carrot nose
                        this.entityGraphics.fillStyle(0xff6600, 1);
                        this.entityGraphics.fillRect(ax, ay - 5, 2, 1);
                        // Eyes
                        this.entityGraphics.fillStyle(0x000000, 1);
                        this.entityGraphics.fillRect(ax - 1, ay - 6, 1, 1);
                        this.entityGraphics.fillRect(ax + 1, ay - 6, 1, 1);
                        break;
                    }
                    case 'evil_mage': {
                        // Purple robed figure with staff
                        this.entityGraphics.fillStyle(0x6a0dad, 1);
                        // Robe (triangle)
                        this.entityGraphics.fillTriangle(ax - 3, ay + 3, ax + 3, ay + 3, ax, ay - 2);
                        // Hood
                        this.entityGraphics.fillCircle(ax, ay - 3, 2);
                        // Staff
                        this.entityGraphics.fillStyle(0x8B4513, 1);
                        this.entityGraphics.fillRect(ax + 3, ay - 5, 1, 8);
                        // Staff orb
                        this.entityGraphics.fillStyle(0xff00ff, 0.8 + Math.sin(Date.now() * 0.005) * 0.2);
                        this.entityGraphics.fillCircle(ax + 3, ay - 6, 2);
                        break;
                    }
                    case 'bandit': {
                        // Brown figure with mask
                        this.entityGraphics.fillStyle(0x4a3728, 1);
                        this.entityGraphics.fillRect(ax - 2, ay - 2, 4, 5);
                        // Head
                        this.entityGraphics.fillStyle(0xffe0bd, 1);
                        this.entityGraphics.fillCircle(ax, ay - 3, 2);
                        // Mask
                        this.entityGraphics.fillStyle(0x333333, 0.9);
                        this.entityGraphics.fillRect(ax - 2, ay - 4, 4, 2);
                        // Weapon
                        this.entityGraphics.fillStyle(0x888888, 1);
                        this.entityGraphics.fillRect(ax + 2, ay - 1, 1, 4);
                        break;
                    }
                    case 'cold_one': {
                        // Blue-white crystalline figure
                        const crystalFloat = Math.sin(Date.now() * 0.003 + ax) * 1;
                        this.entityGraphics.fillStyle(0xa0c4e8, 0.9);
                        // Crystal body
                        this.entityGraphics.fillTriangle(ax - 3, ay + 3 + crystalFloat, ax + 3, ay + 3 + crystalFloat, ax, ay - 4 + crystalFloat);
                        // Inner glow
                        this.entityGraphics.fillStyle(0xd0e8ff, 0.5);
                        this.entityGraphics.fillTriangle(ax - 1.5, ay + 1 + crystalFloat, ax + 1.5, ay + 1 + crystalFloat, ax, ay - 2 + crystalFloat);
                        // Eyes
                        this.entityGraphics.fillStyle(0x00ccff, 1);
                        this.entityGraphics.fillRect(ax - 1, ay - 2 + crystalFloat, 1, 1);
                        this.entityGraphics.fillRect(ax + 1, ay - 2 + crystalFloat, 1, 1);
                        break;
                    }
                    case 'sand_spider': {
                        // Multi-legged tan creature
                        this.entityGraphics.fillStyle(0xc2b280, 1);
                        this.entityGraphics.fillCircle(ax, ay, 2);
                        // Legs
                        this.entityGraphics.lineStyle(1, 0xa08960, 1);
                        for (let i = 0; i < 4; i++) {
                            const lx = i < 2 ? ax - 2 : ax + 2;
                            const ly = ay - 1 + i * 0.8;
                            this.entityGraphics.beginPath();
                            this.entityGraphics.moveTo(lx, ly);
                            this.entityGraphics.lineTo(lx + (i < 2 ? -2 : 2), ly + 1);
                            this.entityGraphics.strokePath();
                        }
                        // Eyes
                        this.entityGraphics.fillStyle(0xff0000, 1);
                        this.entityGraphics.fillRect(ax - 1, ay - 1, 1, 1);
                        this.entityGraphics.fillRect(ax + 1, ay - 1, 1, 1);
                        break;
                    }
                    case 'worm': {
                        // Large brown segmented body
                        const wSegs = 4;
                        for (let i = 0; i < wSegs; i++) {
                            const segR = 3 - i * 0.5;
                            this.entityGraphics.fillStyle(i % 2 === 0 ? 0x8b7355 : 0x7a6248, 1);
                            this.entityGraphics.fillCircle(ax + i * 2 - 3, ay, Math.max(1, segR));
                        }
                        // Mouth
                        this.entityGraphics.fillStyle(0xff6666, 1);
                        this.entityGraphics.fillCircle(ax - 4, ay, 1.5);
                        break;
                    }
                    case 'crystal_golem': {
                        // Purple geometric shape with sparkle
                        const gs = 4;
                        this.entityGraphics.fillStyle(0x9b59b6, 1);
                        // Diamond body
                        this.entityGraphics.fillTriangle(ax - gs, ay, ax + gs, ay, ax, ay - gs * 1.5);
                        this.entityGraphics.fillTriangle(ax - gs, ay, ax + gs, ay, ax, ay + gs);
                        // Inner facet
                        this.entityGraphics.fillStyle(0xc39bd3, 0.6);
                        this.entityGraphics.fillTriangle(ax - gs * 0.5, ay, ax + gs * 0.5, ay, ax, ay - gs);
                        // Sparkle
                        if (Math.random() > 0.5) {
                            this.entityGraphics.fillStyle(0xffffff, 0.8);
                            this.entityGraphics.fillRect(ax + gs - 1, ay - gs - 1, 2, 2);
                        }
                        break;
                    }
                    case 'slime': {
                        // Green blob with eyes
                        const slimeBob = Math.sin(Date.now() * 0.005 + ax) * 0.5;
                        this.entityGraphics.fillStyle(0x2ecc71, 0.8);
                        this.entityGraphics.fillCircle(ax, ay + slimeBob, 3);
                        this.entityGraphics.fillCircle(ax - 2, ay + 1 + slimeBob, 2);
                        this.entityGraphics.fillCircle(ax + 2, ay + 1 + slimeBob, 2);
                        // Eyes
                        this.entityGraphics.fillStyle(0xffffff, 1);
                        this.entityGraphics.fillRect(ax - 1, ay - 1 + slimeBob, 1, 1);
                        this.entityGraphics.fillRect(ax + 1, ay - 1 + slimeBob, 1, 1);
                        this.entityGraphics.fillStyle(0x000000, 1);
                        this.entityGraphics.fillRect(ax - 0.5, ay - 0.5 + slimeBob, 1, 1);
                        this.entityGraphics.fillRect(ax + 1.5, ay - 0.5 + slimeBob, 1, 1);
                        break;
                    }
                    case 'grey_goo': {
                        // Small grey amorphous blob
                        const gooWobble = Math.sin(Date.now() * 0.008 + ay) * 0.5;
                        this.entityGraphics.fillStyle(0x808080, 0.85);
                        this.entityGraphics.fillCircle(ax - 1 + gooWobble, ay, 2);
                        this.entityGraphics.fillCircle(ax + 1 + gooWobble, ay, 1.5);
                        this.entityGraphics.fillCircle(ax + gooWobble, ay - 1, 1.5);
                        break;
                    }
                    case 'flaming_skull': {
                        // Orange skull shape
                        const flameFlicker = Math.random() * 0.3;
                        this.entityGraphics.fillStyle(0xff4400, 0.9);
                        this.entityGraphics.fillCircle(ax, ay, 2.5);
                        // Skull top
                        this.entityGraphics.fillStyle(0xffffff, 0.8);
                        this.entityGraphics.fillCircle(ax, ay, 2);
                        // Eye sockets
                        this.entityGraphics.fillStyle(0xff4400, 1);
                        this.entityGraphics.fillRect(ax - 1, ay - 1, 1, 1);
                        this.entityGraphics.fillRect(ax + 1, ay - 1, 1, 1);
                        // Flame
                        this.entityGraphics.fillStyle(0xffaa00, 0.6 + flameFlicker);
                        this.entityGraphics.fillTriangle(ax - 1, ay - 2, ax + 1, ay - 2, ax, ay - 4);
                        break;
                    }
                    case 'ghost': {
                        // Semi-transparent white figure
                        const ghostY = Math.sin(Date.now() * 0.004 + ax) * 2;
                        this.entityGraphics.fillStyle(0xccddff, 0.45);
                        this.entityGraphics.fillCircle(ax, ay + ghostY, 3);
                        // Wavy tail
                        this.entityGraphics.fillTriangle(ax - 2, ay + ghostY, ax + 2, ay + ghostY, ax, ay + 5 + ghostY);
                        // Eyes
                        this.entityGraphics.fillStyle(0x333366, 0.8);
                        this.entityGraphics.fillRect(ax - 1.5, ay - 1 + ghostY, 1, 1);
                        this.entityGraphics.fillRect(ax + 0.5, ay - 1 + ghostY, 1, 1);
                        break;
                    }
                    case 'gummy_bear': {
                        // Pink bear shape
                        this.entityGraphics.fillStyle(0xff69b4, 0.9);
                        // Body
                        this.entityGraphics.fillCircle(ax, ay, 3);
                        // Ears
                        this.entityGraphics.fillCircle(ax - 2, ay - 3, 1.5);
                        this.entityGraphics.fillCircle(ax + 2, ay - 3, 1.5);
                        // Inner ears
                        this.entityGraphics.fillStyle(0xff99cc, 0.8);
                        this.entityGraphics.fillCircle(ax - 2, ay - 3, 1);
                        this.entityGraphics.fillCircle(ax + 2, ay - 3, 1);
                        // Eyes
                        this.entityGraphics.fillStyle(0x000000, 1);
                        this.entityGraphics.fillRect(ax - 1, ay - 1, 1, 1);
                        this.entityGraphics.fillRect(ax + 1, ay - 1, 1, 1);
                        break;
                    }
                    case 'gingerbread_man': {
                        // Brown human shape with buttons
                        this.entityGraphics.fillStyle(0xd2691e, 1);
                        // Body
                        this.entityGraphics.fillRect(ax - 1.5, ay - 1, 3, 4);
                        // Head
                        this.entityGraphics.fillCircle(ax, ay - 3, 2);
                        // Arms
                        this.entityGraphics.fillRect(ax - 3, ay - 0.5, 1.5, 1);
                        this.entityGraphics.fillRect(ax + 1.5, ay - 0.5, 1.5, 1);
                        // Legs
                        this.entityGraphics.fillRect(ax - 1.5, ay + 3, 1, 2);
                        this.entityGraphics.fillRect(ax + 0.5, ay + 3, 1, 2);
                        // Buttons
                        this.entityGraphics.fillStyle(0xffffff, 1);
                        this.entityGraphics.fillRect(ax - 0.5, ay, 1, 1);
                        this.entityGraphics.fillRect(ax - 0.5, ay + 2, 1, 1);
                        break;
                    }
                    case 'piranha': {
                        // Small red fish with teeth
                        this.entityGraphics.fillStyle(0xcc3333, 1);
                        this.entityGraphics.fillRect(ax - 2, ay - 1, 4, 2);
                        // Tail
                        this.entityGraphics.fillTriangle(ax + 2, ay - 1, ax + 2, ay + 1, ax + 3, ay);
                        // Eye
                        this.entityGraphics.fillStyle(0xffff00, 1);
                        this.entityGraphics.fillRect(ax - 1, ay - 0.5, 1, 1);
                        // Teeth
                        this.entityGraphics.fillStyle(0xffffff, 1);
                        this.entityGraphics.fillRect(ax - 2, ay, 1, 1);
                        break;
                    }
                    case 'rhino': {
                        // Large grey body with horn
                        this.entityGraphics.fillStyle(0x696969, 1);
                        this.entityGraphics.fillCircle(ax, ay, 4);
                        // Head
                        this.entityGraphics.fillCircle(ax + 3, ay - 1, 2.5);
                        // Horn
                        this.entityGraphics.fillStyle(0xcccccc, 1);
                        this.entityGraphics.fillTriangle(ax + 5, ay - 1, ax + 5, ay + 1, ax + 7, ay);
                        // Eye
                        this.entityGraphics.fillStyle(0x000000, 1);
                        this.entityGraphics.fillRect(ax + 3, ay - 2, 1, 1);
                        // Ears
                        this.entityGraphics.fillStyle(0x555555, 1);
                        this.entityGraphics.fillCircle(ax + 1, ay - 4, 1);
                        break;
                    }
                    case 'hyena': {
                        // Tan body with spots
                        this.entityGraphics.fillStyle(0xbdb76b, 1);
                        this.entityGraphics.fillCircle(ax, ay, 2.5);
                        // Head
                        this.entityGraphics.fillCircle(ax - 2, ay - 1, 1.5);
                        // Spots
                        this.entityGraphics.fillStyle(0x8b8348, 0.8);
                        this.entityGraphics.fillRect(ax + 1, ay - 1, 1, 1);
                        this.entityGraphics.fillRect(ax - 0.5, ay + 1, 1, 1);
                        // Eye
                        this.entityGraphics.fillStyle(0x000000, 1);
                        this.entityGraphics.fillRect(ax - 2.5, ay - 1.5, 1, 1);
                        break;
                    }
                    case 'bee': {
                        // Tiny yellow-black striped oval
                        this.entityGraphics.fillStyle(0xffd700, 1);
                        this.entityGraphics.fillCircle(ax, ay, 1.5);
                        // Stripes
                        this.entityGraphics.fillStyle(0x000000, 1);
                        this.entityGraphics.fillRect(ax - 1, ay - 0.5, 2, 1);
                        // Wings
                        this.entityGraphics.fillStyle(0xffffff, 0.4);
                        const wingFlap = Math.sin(Date.now() * 0.02) * 1;
                        this.entityGraphics.fillCircle(ax - 1, ay - 1.5 + wingFlap, 1);
                        this.entityGraphics.fillCircle(ax + 1, ay - 1.5 + wingFlap, 1);
                        break;
                    }
                    case 'cat': {
                        // Small orange figure with ears/tail
                        this.entityGraphics.fillStyle(0xff9933, 1);
                        this.entityGraphics.fillCircle(ax, ay, 2);
                        // Ears
                        this.entityGraphics.fillTriangle(ax - 2, ay - 2, ax - 1, ay - 2, ax - 1.5, ay - 4);
                        this.entityGraphics.fillTriangle(ax + 1, ay - 2, ax + 2, ay - 2, ax + 1.5, ay - 4);
                        // Eyes
                        this.entityGraphics.fillStyle(0x00ff00, 0.9);
                        this.entityGraphics.fillRect(ax - 1, ay - 1, 1, 1);
                        this.entityGraphics.fillRect(ax + 0.5, ay - 1, 1, 1);
                        // Tail
                        this.entityGraphics.lineStyle(1, 0xff9933, 1);
                        this.entityGraphics.beginPath();
                        this.entityGraphics.moveTo(ax + 2, ay);
                        this.entityGraphics.lineTo(ax + 3, ay - 2);
                        this.entityGraphics.strokePath();
                        break;
                    }
                    case 'dog': {
                        // Medium brown figure with tail
                        this.entityGraphics.fillStyle(0x8B4513, 1);
                        this.entityGraphics.fillRect(ax - 2, ay - 1, 4, 3);
                        // Head
                        this.entityGraphics.fillCircle(ax - 2, ay - 1, 2);
                        // Ear
                        this.entityGraphics.fillStyle(0x654321, 1);
                        this.entityGraphics.fillRect(ax - 3, ay - 3, 1.5, 2);
                        // Eye
                        this.entityGraphics.fillStyle(0x000000, 1);
                        this.entityGraphics.fillRect(ax - 2.5, ay - 1.5, 1, 1);
                        // Nose
                        this.entityGraphics.fillStyle(0x000000, 0.8);
                        this.entityGraphics.fillRect(ax - 4, ay - 0.5, 1, 1);
                        // Tail
                        this.entityGraphics.lineStyle(1, 0x8B4513, 1);
                        this.entityGraphics.beginPath();
                        this.entityGraphics.moveTo(ax + 2, ay);
                        this.entityGraphics.lineTo(ax + 4, ay - 2);
                        this.entityGraphics.strokePath();
                        break;
                    }
                    default: {
                        // Generic small square for any unspecified types
                        const size = 2;
                        this.entityGraphics.fillStyle(animal.color, 0.85);
                        this.entityGraphics.fillRect(
                            animal.x - size / 2,
                            animal.y - size / 2,
                            size, size
                        );
                        break;
                    }
                }

                // HP bar for damaged creatures
                if (animal.hp < animal.maxHp) {
                    const hpRatio = animal.hp / animal.maxHp;
                    const barW = 6;
                    this.entityGraphics.fillStyle(0x000000, 0.6);
                    this.entityGraphics.fillRect(ax - barW / 2, ay - 5, barW, 2);
                    const hpColor = hpRatio > 0.6 ? 0x2ecc71 : hpRatio > 0.3 ? 0xf39c12 : 0xe74c3c;
                    this.entityGraphics.fillStyle(hpColor, 0.9);
                    this.entityGraphics.fillRect(ax - barW / 2, ay - 5, barW * hpRatio, 2);
                }
            }
        }

        // Render naval ships
        for (const ship of this.navalSystem.getAllShips()) {
            if (ship.x < vx - ts || ship.x > vx + vw + ts ||
                ship.y < vy - ts || ship.y > vy + vh + ts) {
                continue;
            }

            const size = 4;
            // Draw a simple boat shape
            this.entityGraphics.fillStyle(ship.color, 1.0); 
            this.entityGraphics.fillRoundedRect(ship.x - size, ship.y - size/2, size * 2, size, 2);
            // Sail
            this.entityGraphics.fillStyle(0xffffff, 0.9);
            this.entityGraphics.beginPath();
            this.entityGraphics.moveTo(ship.x, ship.y - size/2);
            this.entityGraphics.lineTo(ship.x + size, ship.y - size);
            this.entityGraphics.lineTo(ship.x, ship.y - size * 1.5);
            this.entityGraphics.fillPath();

            if (ship.type === 'transport') {
                 // War flag
                 this.entityGraphics.fillStyle(0xff0000, 1.0);
                 this.entityGraphics.fillRect(ship.x + size/3, ship.y - size*1.5, size/1.5, size/1.5);
            }
        }
    }

    // ─── RENDER: Buildings ──────────────────────────────────────
    renderBuildings() {
        this.buildingGraphics.clear();
        const cam = this.cameras.main;
        const ts = this.worldMap.tileSize;
        const vx = cam.worldView.x;
        const vy = cam.worldView.y;
        const vw = cam.worldView.width;
        const vh = cam.worldView.height;

        for (const [key, building] of this.worldMap.buildingGrid) {
            const [x, y] = key.split(',').map(Number);
            const px = x * ts;
            const py = y * ts;

            if (px < vx - ts || px > vx + vw + ts ||
                py < vy - ts || py > vy + vh + ts) {
                continue;
            }

            // --- Race-specific Architectures ---
            const hts = ts / 2; // half tile size
            if (building.type === 'village_center') {
                // Lâu đài / Cung điện chính
                switch (building.raceId) {
                    case 'elf': // Cây đại thụ cổ thụ
                        this.buildingGraphics.fillStyle(0x5c4033, 1); 
                        this.buildingGraphics.fillRect(px + ts*0.3, py + ts*0.4, ts*0.4, ts*0.6);
                        this.buildingGraphics.fillStyle(building.color, 1); 
                        this.buildingGraphics.fillCircle(px + hts, py + hts*0.6, hts);
                        this.buildingGraphics.fillCircle(px + hts*0.5, py + hts, hts*0.8);
                        this.buildingGraphics.fillCircle(px + hts*1.5, py + hts, hts*0.8);
                        break;
                    case 'orc': // Hào lũy đầy gai góc
                        this.buildingGraphics.fillStyle(building.color, 1);
                        this.buildingGraphics.fillTriangle(px, py + ts, px + hts, py, px + ts, py + ts);
                        this.buildingGraphics.fillStyle(0xecf0f1, 1); // Tù và xương
                        this.buildingGraphics.fillRect(px + hts - 1, py - ts*0.2, 2, ts*0.5);
                        break;
                    case 'dwarf': // Pháo đài đá
                        this.buildingGraphics.fillStyle(0x555555, 1);
                        this.buildingGraphics.fillRect(px + ts*0.1, py + ts*0.1, ts*0.8, ts*0.9);
                        this.buildingGraphics.fillStyle(building.color, 1); // Cờ hiệu
                        this.buildingGraphics.fillRect(px + hts - 1, py + ts*0.2, 2, ts*0.5);
                        this.buildingGraphics.fillRect(px + ts*0.1, py, ts*0.2, ts*0.1);
                        this.buildingGraphics.fillRect(px + ts*0.4, py, ts*0.2, ts*0.1);
                        this.buildingGraphics.fillRect(px + ts*0.7, py, ts*0.2, ts*0.1);
                        break;
                    case 'demon': // Tháp địa ngục
                        this.buildingGraphics.fillStyle(0x2a0845, 1);
                        this.buildingGraphics.fillTriangle(px + ts*0.2, py + ts, px + hts, py - ts*0.3, px + ts*0.8, py + ts);
                        this.buildingGraphics.fillStyle(0xff2a00, 0.8); // Con mắt quỷ
                        this.buildingGraphics.fillCircle(px + hts, py + ts*0.6, ts*0.15);
                        break;
                    case 'undead': // Hầm ngục / Mộ khổng lồ
                        this.buildingGraphics.fillStyle(0x2c3e50, 1);
                        this.buildingGraphics.fillRect(px + ts*0.1, py + ts*0.4, ts*0.8, ts*0.6);
                        this.buildingGraphics.fillCircle(px + hts, py + ts*0.4, ts*0.4);
                        this.buildingGraphics.fillStyle(0x000000, 1);
                        this.buildingGraphics.fillRect(px + hts - ts*0.15, py + ts*0.6, ts*0.3, ts*0.4);
                        break;
                    case 'human':
                    default: // Lâu đài cổ điển mái ngói
                        this.buildingGraphics.fillStyle(building.color, 1);
                        this.buildingGraphics.fillRect(px + ts*0.1, py + ts*0.3, ts*0.8, ts*0.7);
                        this.buildingGraphics.fillStyle(0x992b22, 1); 
                        this.buildingGraphics.fillTriangle(px, py + ts*0.3, px + hts, py - ts*0.2, px + ts, py + ts*0.3);
                        break;
                }
            } else {
                // Get tier for size scaling
                const tier = building.tier || 1;
                const tierScale = 1 + (tier - 1) * 0.08; // slightly larger per tier

                // Per-type rendering
                switch (building.type) {
                    case 'watch_tower': {
                        // Tall rectangle with pointed top (triangle), arrow slit
                        const bw = ts * 0.3 * tierScale;
                        const bh = ts * 0.9 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0x888888, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Pointed top
                        this.buildingGraphics.fillTriangle(bx, by, bx + bw / 2, by - ts * 0.2, bx + bw, by);
                        // Arrow slit
                        this.buildingGraphics.fillStyle(0x000000, 0.7);
                        this.buildingGraphics.fillRect(bx + bw / 2 - 1, by + bh * 0.3, 2, bh * 0.15);
                        break;
                    }
                    case 'library': {
                        // Rectangle with scroll/book decorations
                        const bw = ts * 0.7 * tierScale;
                        const bh = ts * 0.6 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0x6A5ACD, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Roof
                        this.buildingGraphics.fillStyle(0x4B0082, 1);
                        this.buildingGraphics.fillTriangle(bx, by, bx + bw / 2, by - ts * 0.15, bx + bw, by);
                        // Book lines
                        this.buildingGraphics.fillStyle(0xFFD700, 0.9);
                        for (let i = 0; i < tier && i < 3; i++) {
                            this.buildingGraphics.fillRect(bx + bw * 0.15, by + bh * 0.2 + i * 2, bw * 0.25, 1);
                        }
                        break;
                    }
                    case 'windmill': {
                        // Rectangle base with rotating blade cross on top
                        const bw = ts * 0.5 * tierScale;
                        const bh = ts * 0.55 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0xDEB887, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Rotating blades (cross)
                        const bladeAngle = (Date.now() * 0.003) % (Math.PI * 2);
                        const cx = bx + bw / 2;
                        const cy = by - ts * 0.05;
                        const bladeLen = ts * 0.35 * tierScale;
                        this.buildingGraphics.lineStyle(2, 0x8B7355, 1);
                        this.buildingGraphics.beginPath();
                        this.buildingGraphics.moveTo(cx + Math.cos(bladeAngle) * bladeLen, cy + Math.sin(bladeAngle) * bladeLen);
                        this.buildingGraphics.lineTo(cx - Math.cos(bladeAngle) * bladeLen, cy - Math.sin(bladeAngle) * bladeLen);
                        this.buildingGraphics.strokePath();
                        this.buildingGraphics.beginPath();
                        this.buildingGraphics.moveTo(cx + Math.cos(bladeAngle + Math.PI / 2) * bladeLen, cy + Math.sin(bladeAngle + Math.PI / 2) * bladeLen);
                        this.buildingGraphics.lineTo(cx - Math.cos(bladeAngle + Math.PI / 2) * bladeLen, cy - Math.sin(bladeAngle + Math.PI / 2) * bladeLen);
                        this.buildingGraphics.strokePath();
                        break;
                    }
                    case 'temple': {
                        // Larger rectangle with pointed roof, glow
                        const bw = ts * 0.75 * tierScale;
                        const bh = ts * 0.7 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        // Glow
                        this.buildingGraphics.fillStyle(0xFFD700, 0.15);
                        this.buildingGraphics.fillCircle(px + hts, py + ts * 0.5, ts * 0.5);
                        this.buildingGraphics.fillStyle(building.color || 0xCCA43B, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Pointed roof
                        this.buildingGraphics.fillStyle(0x992b22, 1);
                        this.buildingGraphics.fillTriangle(bx, by, bx + bw / 2, by - ts * 0.25, bx + bw, by);
                        // Tier stars
                        this.buildingGraphics.fillStyle(0xFFD700, 1);
                        for (let i = 0; i < Math.min(tier, 3); i++) {
                            this.buildingGraphics.fillRect(bx + bw * 0.2 + i * 3, by + bh * 0.3, 2, 2);
                        }
                        break;
                    }
                    case 'training_dummy': {
                        // Small rectangle with stick figure
                        const bw = ts * 0.3 * tierScale;
                        const bh = ts * 0.5 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0xA0522D, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Stick figure head
                        this.buildingGraphics.fillStyle(0xffe0bd, 1);
                        this.buildingGraphics.fillCircle(px + hts, by - ts * 0.08, ts * 0.08);
                        // Arms
                        this.buildingGraphics.lineStyle(1, 0x8B4513, 1);
                        this.buildingGraphics.beginPath();
                        this.buildingGraphics.moveTo(px + hts - ts * 0.12, by + bh * 0.3);
                        this.buildingGraphics.lineTo(px + hts + ts * 0.12, by + bh * 0.3);
                        this.buildingGraphics.strokePath();
                        break;
                    }
                    case 'statue': {
                        // Small pedestal with figure on top
                        const pedW = ts * 0.35 * tierScale;
                        const pedH = ts * 0.2;
                        const bx = px + hts - pedW / 2;
                        const by = py + ts - pedH;
                        // Pedestal
                        this.buildingGraphics.fillStyle(0x808080, 1);
                        this.buildingGraphics.fillRect(bx, by, pedW, pedH);
                        // Figure
                        this.buildingGraphics.fillStyle(building.color || 0xC0C0C0, 1);
                        this.buildingGraphics.fillCircle(px + hts, by - ts * 0.1, ts * 0.08);
                        this.buildingGraphics.fillRect(px + hts - ts * 0.05, by - ts * 0.06, ts * 0.1, ts * 0.15);
                        // Glow for higher tiers
                        if (tier >= 2) {
                            this.buildingGraphics.fillStyle(0xFFD700, 0.2);
                            this.buildingGraphics.fillCircle(px + hts, by - ts * 0.05, ts * 0.15);
                        }
                        break;
                    }
                    case 'stockpile': {
                        // Open rectangle with pile shapes inside
                        const bw = ts * 0.7 * tierScale;
                        const bh = ts * 0.5 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        // Walls (open top)
                        this.buildingGraphics.fillStyle(0x8B6914, 1);
                        this.buildingGraphics.fillRect(bx, by, bw * 0.15, bh);
                        this.buildingGraphics.fillRect(bx + bw * 0.85, by, bw * 0.15, bh);
                        this.buildingGraphics.fillRect(bx, by + bh * 0.85, bw, bh * 0.15);
                        // Resource piles
                        this.buildingGraphics.fillStyle(0xDEB887, 0.8);
                        this.buildingGraphics.fillRect(bx + bw * 0.2, by + bh * 0.5, bw * 0.25, bh * 0.35);
                        this.buildingGraphics.fillStyle(0x808080, 0.7);
                        this.buildingGraphics.fillRect(bx + bw * 0.5, by + bh * 0.6, bw * 0.25, bh * 0.25);
                        break;
                    }
                    case 'town_hall': {
                        // Larger building with banner
                        const bw = ts * 0.8 * tierScale;
                        const bh = ts * 0.7 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        const raceColor = building.color || 0x996633;
                        this.buildingGraphics.fillStyle(raceColor, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Roof
                        this.buildingGraphics.fillStyle(0x992b22, 1);
                        this.buildingGraphics.fillTriangle(bx, by, bx + bw / 2, by - ts * 0.2, bx + bw, by);
                        // Banner
                        this.buildingGraphics.fillStyle(0xff0000, 0.9);
                        this.buildingGraphics.fillRect(bx + bw * 0.4, by - ts * 0.2, bw * 0.2, ts * 0.15);
                        // Flag pole
                        this.buildingGraphics.fillStyle(0x4A4A4A, 1);
                        this.buildingGraphics.fillRect(bx + bw * 0.5 - 0.5, by - ts * 0.35, 1, ts * 0.35);
                        // Tier indicator dots
                        this.buildingGraphics.fillStyle(0xFFD700, 1);
                        for (let i = 0; i < tier; i++) {
                            this.buildingGraphics.fillRect(bx + bw * 0.2 + i * 4, by + bh * 0.15, 2, 2);
                        }
                        break;
                    }
                    case 'mine': {
                        // Dark entrance with ore pile
                        const bw = ts * 0.6 * tierScale;
                        const bh = ts * 0.5 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0x555555, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Dark entrance
                        this.buildingGraphics.fillStyle(0x000000, 0.8);
                        this.buildingGraphics.fillRect(bx + bw * 0.3, by + bh * 0.4, bw * 0.4, bh * 0.6);
                        break;
                    }
                    case 'barracks': {
                        // Military structure with weapon rack
                        const bw = ts * 0.7 * tierScale;
                        const bh = ts * 0.6 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0x6B3A3A, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Roof
                        this.buildingGraphics.fillStyle(0x4A2A2A, 1);
                        this.buildingGraphics.fillTriangle(bx, by, bx + bw / 2, by - ts * 0.12, bx + bw, by);
                        // Weapon rack (sword shape)
                        this.buildingGraphics.fillStyle(0x888888, 0.9);
                        this.buildingGraphics.fillRect(bx + bw * 0.7, by + bh * 0.2, 1, bh * 0.5);
                        this.buildingGraphics.fillRect(bx + bw * 0.65, by + bh * 0.4, bw * 0.15, 1);
                        break;
                    }
                    case 'market': {
                        // Colorful stall with canopy
                        const bw = ts * 0.7 * tierScale;
                        const bh = ts * 0.4 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0xD4AF37, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Canopy (striped)
                        this.buildingGraphics.fillStyle(0xCC3333, 1);
                        this.buildingGraphics.fillTriangle(bx - ts * 0.05, by, bx + bw / 2, by - ts * 0.15, bx + bw + ts * 0.05, by);
                        // Goods dots
                        this.buildingGraphics.fillStyle(0xFFD700, 0.9);
                        this.buildingGraphics.fillRect(bx + bw * 0.2, by + bh * 0.3, 2, 2);
                        this.buildingGraphics.fillStyle(0x228B22, 0.9);
                        this.buildingGraphics.fillRect(bx + bw * 0.5, by + bh * 0.3, 2, 2);
                        break;
                    }
                    case 'forge': {
                        // Dark building with chimney smoke
                        const bw = ts * 0.6 * tierScale;
                        const bh = ts * 0.55 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0x4A4A4A, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Chimney
                        this.buildingGraphics.fillStyle(0x333333, 1);
                        this.buildingGraphics.fillRect(bx + bw * 0.7, by - ts * 0.15, bw * 0.15, ts * 0.15);
                        // Fire glow
                        this.buildingGraphics.fillStyle(0xff6600, 0.6 + Math.random() * 0.4);
                        this.buildingGraphics.fillRect(bx + bw * 0.3, by + bh * 0.5, bw * 0.2, bh * 0.3);
                        break;
                    }
                    case 'academy': {
                        // Scholarly building with cap
                        const bw = ts * 0.65 * tierScale;
                        const bh = ts * 0.6 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0x4169E1, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Roof
                        this.buildingGraphics.fillStyle(0x2A2A8A, 1);
                        this.buildingGraphics.fillTriangle(bx, by, bx + bw / 2, by - ts * 0.15, bx + bw, by);
                        // Scroll
                        this.buildingGraphics.fillStyle(0xFFFFEE, 0.9);
                        this.buildingGraphics.fillRect(bx + bw * 0.15, by + bh * 0.25, bw * 0.3, bh * 0.3);
                        break;
                    }
                    case 'port': {
                        // Brown wooden dock
                        const bw = ts * 0.7 * tierScale;
                        const bh = ts * 0.35 * tierScale;
                        const bx = px + hts - bw / 2;
                        const by = py + ts - bh;
                        this.buildingGraphics.fillStyle(building.color || 0x8B4513, 1);
                        this.buildingGraphics.fillRect(bx, by, bw, bh);
                        // Pier posts
                        this.buildingGraphics.fillStyle(0x5C3317, 1);
                        this.buildingGraphics.fillRect(bx, by + bh, bw * 0.1, ts * 0.1);
                        this.buildingGraphics.fillRect(bx + bw * 0.9, by + bh, bw * 0.1, ts * 0.1);
                        // Ships indicator (tier)
                        this.buildingGraphics.fillStyle(0xffffff, 0.8);
                        for (let i = 0; i < tier; i++) {
                            this.buildingGraphics.fillRect(bx + bw * 0.3 + i * 4, by + bh * 0.2, 3, 2);
                        }
                        break;
                    }
                    case 'wall': {
                        // Stone wall segment
                        this.buildingGraphics.fillStyle(building.color || 0x888888, 1);
                        this.buildingGraphics.fillRect(px + ts * 0.1, py + ts * 0.3, ts * 0.8, ts * 0.7);
                        // Crenellations
                        this.buildingGraphics.fillStyle(0x999999, 1);
                        this.buildingGraphics.fillRect(px + ts * 0.1, py + ts * 0.25, ts * 0.2, ts * 0.1);
                        this.buildingGraphics.fillRect(px + ts * 0.45, py + ts * 0.25, ts * 0.2, ts * 0.1);
                        this.buildingGraphics.fillRect(px + ts * 0.7, py + ts * 0.25, ts * 0.2, ts * 0.1);
                        break;
                    }
                    case 'house':
                    default: {
                        // Tiered houses with race-specific styles
                        const houseScale = tierScale;
                        switch (building.raceId) {
                            case 'elf':
                                this.buildingGraphics.fillStyle(building.color || 0x228B22, 1);
                                this.buildingGraphics.fillCircle(px + hts, py + hts, ts * 0.4 * houseScale);
                                this.buildingGraphics.fillStyle(0x8B4513, 1);
                                this.buildingGraphics.fillRect(px + ts * 0.4, py + ts * 0.8, ts * 0.2, ts * 0.2);
                                break;
                            case 'orc':
                                this.buildingGraphics.fillStyle(building.color || 0x556B2F, 1);
                                this.buildingGraphics.fillTriangle(px + ts * 0.1, py + ts, px + hts, py + ts * 0.3, px + ts * 0.9, py + ts);
                                break;
                            case 'dwarf':
                                this.buildingGraphics.fillStyle(0x666666, 1);
                                this.buildingGraphics.fillRect(px + ts * 0.1, py + ts * 0.4, ts * 0.8 * houseScale, ts * 0.6);
                                this.buildingGraphics.fillStyle(building.color || 0x888888, 1);
                                this.buildingGraphics.fillRect(px + ts * 0.2, py + ts * 0.3, ts * 0.6 * houseScale, ts * 0.1);
                                break;
                            case 'demon':
                                this.buildingGraphics.fillStyle(0x3e185c, 1);
                                this.buildingGraphics.fillTriangle(px + ts * 0.2, py + ts, px + hts, py + ts * 0.1, px + ts * 0.8, py + ts);
                                break;
                            case 'undead':
                                this.buildingGraphics.fillStyle(0x2c3e50, 1);
                                this.buildingGraphics.fillRect(px + ts * 0.3, py + ts * 0.4, ts * 0.4 * houseScale, ts * 0.6);
                                this.buildingGraphics.fillCircle(px + hts, py + ts * 0.4, ts * 0.2);
                                break;
                            case 'human':
                            default:
                                this.buildingGraphics.fillStyle(building.color || 0xCD853F, 1);
                                this.buildingGraphics.fillRect(px + ts * 0.2, py + ts * 0.5, ts * 0.6 * houseScale, ts * 0.5);
                                this.buildingGraphics.fillStyle(0x992b22, 1);
                                this.buildingGraphics.fillTriangle(px + ts * 0.1, py + ts * 0.5, px + hts, py + ts * 0.1, px + ts * 0.9, py + ts * 0.5);
                                // Tier indicator: small dots
                                if (tier > 1) {
                                    this.buildingGraphics.fillStyle(0xFFD700, 0.9);
                                    for (let i = 0; i < Math.min(tier - 1, 4); i++) {
                                        this.buildingGraphics.fillRect(px + ts * 0.3 + i * 2, py + ts * 0.55, 1, 1);
                                    }
                                }
                                break;
                        }
                        break;
                    }
                }
            }
        }

        // === RENDER FARM PLOTS (crop growth visualization) ===
        for (const settlement of this.settlementManager.getAll()) {
            if (!settlement.farmPlots) continue;
            for (const plot of settlement.farmPlots) {
                const px = plot.x * ts;
                const py = plot.y * ts;
                if (px < vx - ts || px > vx + vw + ts ||
                    py < vy - ts || py > vy + vh + ts) continue;

                // Nền đất cày xới (Tilled Soil)
                this.buildingGraphics.fillStyle(0x654321, 1); // Đất nâu sậm
                this.buildingGraphics.fillRect(px, py, ts, ts);
                
                // Các luống cày (Rows)
                this.buildingGraphics.fillStyle(0x4a2e15, 0.8);
                this.buildingGraphics.fillRect(px, py + ts * 0.2, ts, 1);
                this.buildingGraphics.fillRect(px, py + ts * 0.5, ts, 1);
                this.buildingGraphics.fillRect(px, py + ts * 0.8, ts, 1);

                if (plot.state === 'growing') {
                    // Mầm xanh non trên các luống
                    this.buildingGraphics.fillStyle(0x2ecc71, 0.9);
                    this.buildingGraphics.fillRect(px + ts * 0.2, py + ts * 0.1, 2, 2);
                    this.buildingGraphics.fillRect(px + ts * 0.4, py + ts * 0.4, 2, 2);
                    this.buildingGraphics.fillRect(px + ts * 0.6, py + ts * 0.7, 2, 2);
                    this.buildingGraphics.fillRect(px + ts * 0.8, py + ts * 0.1, 2, 2);
                } else if (plot.state === 'mature') {
                    // Lúa chín vàng ươm trĩu hạt dầy đặc các luống
                    this.buildingGraphics.fillStyle(0xf1c40f, 1); // Vàng sáng
                    this.buildingGraphics.fillRect(px + 1, py + 1, ts - 2, ts * 0.3);
                    this.buildingGraphics.fillRect(px + 1, py + ts * 0.35, ts - 2, ts * 0.3);
                    this.buildingGraphics.fillRect(px + 1, py + ts * 0.7, ts - 2, ts * 0.25);
                    
                    // Đầu bông lúa (hạt)
                    this.buildingGraphics.fillStyle(0xd4ac0d, 1);
                    this.buildingGraphics.fillRect(px + 1, py, ts - 2, 1);
                    this.buildingGraphics.fillRect(px + 1, py + ts * 0.35, ts - 2, 1);
                    this.buildingGraphics.fillRect(px + 1, py + ts * 0.7, ts - 2, 1);
                } else if (plot.state === 'harvested') {
                    // Cỏ khô / gốc rạ sau thu hoạch
                    this.buildingGraphics.fillStyle(0xbdb76b, 0.6); // Màu rạ 
                    this.buildingGraphics.fillRect(px + ts * 0.2, py + ts * 0.15, 2, 1);
                    this.buildingGraphics.fillRect(px + ts * 0.5, py + ts * 0.45, 2, 1);
                    this.buildingGraphics.fillRect(px + ts * 0.3, py + ts * 0.75, 2, 1);
                    this.buildingGraphics.fillRect(px + ts * 0.7, py + ts * 0.15, 2, 1);
                }
            }
        }
    }

    // ─── RENDER: Siege Effects ──────────────────────────────────
    renderSiege() {
        if (!this._siegeGfx) {
            this._siegeGfx = this.add.graphics();
            this._siegeGfx.setDepth(6);
        }
        this._siegeGfx.clear();

        const cam = this.cameras.main;
        const ts = this.worldMap.tileSize;
        const vx = cam.worldView.x;
        const vy = cam.worldView.y;
        const vw = cam.worldView.width;
        const vh = cam.worldView.height;

        // Show attack sparks on buildings being sieged
        for (const [key, building] of this.worldMap.buildingGrid) {
            if (building.type !== 'village_center' || !building._underSiege) continue;
            const [x, y] = key.split(',').map(Number);
            const px = x * ts;
            const py = y * ts;
            if (px < vx - ts || px > vx + vw + ts ||
                py < vy - ts || py > vy + vh + ts) continue;

            // Flashing red border on besieged building
            if (Math.random() > 0.3) {
                this._siegeGfx.lineStyle(2, 0xff0000, 0.7);
                this._siegeGfx.strokeRect(px, py, ts, ts);
            }
            // Damage sparks
            for (let i = 0; i < 3; i++) {
                const sx = px + Math.random() * ts;
                const sy = py + Math.random() * ts;
                this._siegeGfx.fillStyle(0xff6600, 0.8);
                this._siegeGfx.fillRect(sx, sy, 2, 2);
            }

            // HP bar on besieged village_center
            if (building.hp !== undefined && building.maxHp !== undefined && building.hp < building.maxHp) {
                const hpRatio = building.hp / building.maxHp;
                const barW = ts;
                this._siegeGfx.fillStyle(0x000000, 0.6);
                this._siegeGfx.fillRect(px, py - 4, barW, 3);
                const hpColor = hpRatio > 0.5 ? 0xff8800 : 0xff0000;
                this._siegeGfx.fillStyle(hpColor, 0.9);
                this._siegeGfx.fillRect(px, py - 4, barW * hpRatio, 3);
            }
        }
    }

    // ─── RENDER: Fires ──────────────────────────────────────────
    renderFires() {
        const ts = this.worldMap.tileSize;

        for (const key of this.worldMap.fireTiles) {
            const [x, y] = key.split(',').map(Number);
            const flicker = Math.random();
            const color = flicker > 0.5 ? 0xff4400 : 0xff8800;
            this.entityGraphics.fillStyle(color, 0.7);
            this.entityGraphics.fillRect(x * ts, y * ts, ts, ts);

            // Smoke particles
            if (Math.random() > 0.5) {
                this.entityGraphics.fillStyle(0x333333, 0.3);
                this.entityGraphics.fillRect(x * ts + Math.random() * ts, y * ts - Math.random() * 4, 2, 2);
            }
        }
    }

    // ─── TOOL HANDLING ──────────────────────────────────────────
    handleToolUse(pointer) {
        const tilePos = this.worldMap.pixelToTile(pointer.worldX, pointer.worldY);
        const tool = this.selectedTool;

        if (!tool) return;

        if (tilePos.x < 0 || tilePos.x >= this.worldMap.width ||
            tilePos.y < 0 || tilePos.y >= this.worldMap.height) return;

        switch (tool.category) {
            case 'terrain':
                this.useTerrain(tool, tilePos);
                break;
            case 'life':
                this.useLife(tool, tilePos);
                break;
            case 'disasters':
                this.useDisaster(tool, tilePos);
                break;
            case 'magic':
                this.useMagic(tool, tilePos);
                break;
            case 'animals':
                this.useAnimal(tool, tilePos);
                break;
            case 'inspect':
                this.useInspect(tilePos);
                break;
            case 'other':
                if (tool.id === 'diplomacy') {
                    this.useDiplomacy(tilePos);
                } else if (tool.id === 'migrate') {
                    this.useMigrate(tilePos);
                } else if (tool.id === 'world_laws') {
                    this.registry.set('showWorldLaws', true);
                } else if (tool.id === 'history') {
                    this.registry.set('showHistory', true);
                }
                break;
        }
    }

    useTerrain(tool, pos) {
        if (tool.id === 'eraser') {
            this.useEraser(tool, pos);
            return;
        }
        const changed = this.worldMap.paint(pos.x, pos.y, tool.brush || this.brushSize, tool.tileType);
        if (changed.length > 0) {
            this.terrainRenderer.markDirty(changed);
            this.terrainRenderer.updateDirty();
        }
    }

    useEraser(tool, pos) {
        const brush = tool.brush || this.brushSize;
        const changed = [];

        for (let dy = -brush; dy <= brush; dy++) {
            for (let dx = -brush; dx <= brush; dx++) {
                if (dx * dx + dy * dy > brush * brush) continue;
                const x = pos.x + dx;
                const y = pos.y + dy;
                if (x < 0 || x >= this.worldMap.width || y < 0 || y >= this.worldMap.height) continue;

                // Kill all entities at tile
                const entityIds = this.worldMap.getEntitiesAt(x, y);
                for (const eid of entityIds) {
                    const e = this.entityManager.get(eid);
                    if (e && e.alive) {
                        e.alive = false;
                        e.state = 'dead';
                    }
                    this.worldMap.removeEntityAt(x, y, eid);
                }

                // Kill all animals at tile
                for (const animal of this.animalSystem.getAllAlive()) {
                    if (animal.tileX === x && animal.tileY === y) {
                        animal.alive = false;
                    }
                }

                // Remove any building
                this.worldMap.removeBuilding(x, y);

                // Reset tile to grass
                this.worldMap.setTile(x, y, 'grass');

                changed.push({ x, y });
            }
        }

        if (changed.length > 0) {
            this.terrainRenderer.markDirty(changed);
            this.terrainRenderer.updateDirty();
        }
    }

    useLife(tool, pos) {
        if (this.isPainting && this._lastSpawnTick === this.simLoop.getTick()) return;
        this._lastSpawnTick = this.simLoop.getTick();

        if (!this.worldMap.isBuildable(pos.x, pos.y)) return;

        const race = getRace(tool.raceId);

        // Does it land inside an existing settlement?
        let placedInsideId = -1;
        for (const s of this.settlementManager.getAll()) {
            if (s.territory.has(`${pos.x},${pos.y}`)) {
                placedInsideId = s.id;
                break;
            }
        }

        // If placed inside an active settlement, we just add units to it
        if (placedInsideId >= 0) {
            const settlement = this.settlementManager.get(placedInsideId);
            this.spawnGodUnits(settlement, pos, race, 3);
            return;
        }

        // Otherwise, found a new kingdom and settlement.
        const kingdom = this.kingdomManager.create({
            raceId: tool.raceId,
            color: race.color
        });

        const settlement = this.settlementManager.create({
            raceId: tool.raceId,
            kingdomId: kingdom.id,
            tileX: pos.x,
            tileY: pos.y,
            name: generateSettlementName(tool.raceId)
        });

        // Place village building
        this.worldMap.placeBuilding(pos.x, pos.y, {
            type: 'village_center',
            raceId: tool.raceId,
            settlementId: settlement.id,
            color: race.buildingColor
        });

        this.spawnGodUnits(settlement, pos, race, 5);
    }

    spawnGodUnits(settlement, centerPos, race, count) {
        for (let i = 0; i < count; i++) {
            const spawnPos = this.worldMap.findNearestWalkable(centerPos.x, centerPos.y, 5);
            if (spawnPos) {
                const pixel = this.worldMap.tileToPixel(spawnPos.x, spawnPos.y);
                const unit = this.entityManager.create({
                    tileX: spawnPos.x,
                    tileY: spawnPos.y,
                    x: pixel.x,
                    y: pixel.y,
                    raceId: race.id,
                    settlementId: settlement.id,
                    hp: race.stats.hp,
                    maxHp: race.stats.hp,
                    attack: race.stats.attack,
                    defense: race.stats.defense,
                    speed: race.stats.speed,
                    maxAge: 60 + Math.floor(Math.random() * 40),
                    color: race.color,
                    isLeader: i === 0
                });
                this.worldMap.addEntityAt(spawnPos.x, spawnPos.y, unit.id);
            }
        }
    }

    useDisaster(tool, pos) {
        if (this.isPainting && this._lastDisasterTick === this.simLoop.getTick()) return;
        this._lastDisasterTick = this.simLoop.getTick();

        this.disasterSystem.trigger(tool.id, pos.x, pos.y);
    }

    useMagic(tool, pos) {
        if (this.isPainting && this._lastMagicTick === this.simLoop.getTick()) return;
        this._lastMagicTick = this.simLoop.getTick();

        this.disasterSystem.trigger(tool.id, pos.x, pos.y);
    }

    useAnimal(tool, pos) {
        if (this.isPainting && this._lastAnimalTick === this.simLoop.getTick()) return;
        this._lastAnimalTick = this.simLoop.getTick();

        const brushRadius = tool.brush || 1;
        const count = brushRadius === 0 ? 1 : brushRadius * 2;
        for (let i = 0; i < count; i++) {
            const ox = Math.floor(Math.random() * (brushRadius * 2 + 1)) - brushRadius;
            const oy = Math.floor(Math.random() * (brushRadius * 2 + 1)) - brushRadius;
            const tx = pos.x + ox;
            const ty = pos.y + oy;
            if (tx < 0 || tx >= this.worldMap.width || ty < 0 || ty >= this.worldMap.height) continue;
            const tile = this.worldMap.getTile(tx, ty);
            const type = tool.animalType;
            // Fish only in water
            if (type === 'fish') {
                if (tile === 'shallow_water' || tile === 'deep_water') {
                    this.animalSystem.spawn(this.worldMap, type, tx, ty);
                }
            } else {
                if (this.worldMap.isWalkable(tx, ty)) {
                    this.animalSystem.spawn(this.worldMap, type, tx, ty);
                }
            }
        }
    }

    useInspect(pos) {
        const entityIds = this.worldMap.getEntitiesAt(pos.x, pos.y);
        const building = this.worldMap.getBuilding(pos.x, pos.y);
        const tileInfo = this.worldMap.getTileInfo(pos.x, pos.y);

        const inspectData = {
            tile: tileInfo,
            tilePos: pos,
            entities: [],
            building,
            animals: []
        };

        for (const eid of entityIds) {
            const entity = this.entityManager.get(eid);
            if (entity && entity.alive) {
                inspectData.entities.push(entity);
            }
        }

        // Check animals at this position
        for (const animal of this.animalSystem.getAllAlive()) {
            if (animal.tileX === pos.x && animal.tileY === pos.y) {
                inspectData.animals.push(animal);
            }
        }

        // Find settlement info
        for (const settlement of this.settlementManager.getAll()) {
            if (settlement.territory.has(`${pos.x},${pos.y}`)) {
                inspectData.settlement = settlement;
                break;
            }
        }

        this.registry.set('inspectData', inspectData);
    }

    useDiplomacy(pos) {
        // Find settlement at pos
        let targetSettlement = null;
        for (const s of this.settlementManager.getAll()) {
            if (s.territory.has(`${pos.x},${pos.y}`)) {
                targetSettlement = s;
                break;
            }
        }
        if (targetSettlement) {
            this.registry.set('diplomacyTarget', targetSettlement);
        }
    }

    useMigrate(pos) {
        // Two-click migration system
        let targetSettlement = null;
        for (const s of this.settlementManager.getAll()) {
            if (s.territory.has(`${pos.x},${pos.y}`)) {
                targetSettlement = s;
                break;
            }
        }

        if (!this._migrateSource) {
            // First click: set source
            if (targetSettlement) {
                this._migrateSource = targetSettlement;
                this.registry.set('notification', '🏠 Chọn khu định cư đích');
            }
        } else {
            // Second click: migrate
            if (targetSettlement && targetSettlement.id !== this._migrateSource.id &&
                targetSettlement.kingdomId === this._migrateSource.kingdomId) {
                // Move up to 3 units from source to target
                const units = this.entityManager.getBySettlement(this._migrateSource.id);
                const moved = Math.min(3, units.length, targetSettlement.maxPopulation - targetSettlement.population);
                for (let i = 0; i < moved; i++) {
                    const u = units[i];
                    u.settlementId = targetSettlement.id;
                    // Remove from old settlement index
                    const oldSet = this.entityManager.bySettlement.get(this._migrateSource.id);
                    if (oldSet) oldSet.delete(u.id);
                    // Add to new settlement index
                    if (!this.entityManager.bySettlement.has(targetSettlement.id)) {
                        this.entityManager.bySettlement.set(targetSettlement.id, new Set());
                    }
                    this.entityManager.bySettlement.get(targetSettlement.id).add(u.id);
                }
                this.registry.set('notification', `🏠 Đã di cư ${moved} dân`);
            }
            this._migrateSource = null;
        }
    }

    // ─── BRUSH OVERLAY ──────────────────────────────────────────
    updateBrushOverlay(pointer) {
        this.brushOverlay.clear();
        const tool = this.selectedTool;
        if (!tool || tool.category === 'inspect') return;

        const tilePos = this.worldMap.pixelToTile(pointer.worldX, pointer.worldY);
        const ts = this.worldMap.tileSize;
        const radius = tool.brush !== undefined ? tool.brush : this.brushSize;

        if (radius === 0) {
            // Single tile crosshair
            this.brushOverlay.lineStyle(1, 0xffffff, 0.6);
            this.brushOverlay.strokeRect(tilePos.x * ts, tilePos.y * ts, ts, ts);
            const cx = tilePos.x * ts + ts / 2;
            const cy = tilePos.y * ts + ts / 2;
            this.brushOverlay.lineBetween(cx - ts, cy, cx + ts, cy);
            this.brushOverlay.lineBetween(cx, cy - ts, cx, cy + ts);
        } else {
            // Color-coded per category
            const overlayColors = {
                terrain: 0xffffff,
                life: 0x44ff44,
                disasters: 0xff4444,
                magic: 0xaa44ff
            };
            const color = overlayColors[tool.category] || 0xffffff;
            this.brushOverlay.lineStyle(1, color, 0.35);
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx * dx + dy * dy > radius * radius) continue;
                    const tx = tilePos.x + dx;
                    const ty = tilePos.y + dy;
                    this.brushOverlay.strokeRect(tx * ts, ty * ts, ts, ts);
                }
            }
        }
    }

    // ─── VISUAL EFFECTS ─────────────────────────────────────────
    playVisualEffect(evt) {
        const ts = this.worldMap.tileSize;
        const px = evt.x * ts + ts / 2;
        const py = evt.y * ts + ts / 2;

        switch (evt.type) {
            case 'meteor': {
                this.soundSystem.playExplosion();
                const circle = this.add.circle(px, py, evt.radius * ts, 0xff4400, 0.8);
                circle.setDepth(50);
                this.tweens.add({
                    targets: circle,
                    alpha: 0, scaleX: 2, scaleY: 2,
                    duration: 600,
                    onComplete: () => circle.destroy()
                });
                // Camera shake
                this.cameras.main.shake(400, 0.015);
                break;
            }
            case 'lightning': {
                this.soundSystem.playThunder();
                const flash = this.add.rectangle(px, py, ts * 2, ts * 2, 0xffff00, 0.9);
                flash.setDepth(50);

                // Screen flash
                const screenFlash = this.add.rectangle(
                    this.cameras.main.worldView.x + this.cameras.main.worldView.width / 2,
                    this.cameras.main.worldView.y + this.cameras.main.worldView.height / 2,
                    this.cameras.main.worldView.width,
                    this.cameras.main.worldView.height,
                    0xffffff, 0.3
                );
                screenFlash.setDepth(100);

                this.tweens.add({
                    targets: flash,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => flash.destroy()
                });
                this.tweens.add({
                    targets: screenFlash,
                    alpha: 0,
                    duration: 100,
                    onComplete: () => screenFlash.destroy()
                });
                break;
            }
            case 'earthquake': {
                this.soundSystem.playEarthquake();
                this.cameras.main.shake(500, 0.02);
                break;
            }
            case 'plague': {
                this.soundSystem.playPlague();
                const cloud = this.add.circle(px, py, evt.radius * ts, 0x00ff00, 0.25);
                cloud.setDepth(50);
                this.tweens.add({
                    targets: cloud,
                    alpha: 0, scaleX: 1.5, scaleY: 1.5,
                    duration: 1500,
                    onComplete: () => cloud.destroy()
                });
                break;
            }
            case 'tornado': {
                this.soundSystem.playTornado();
                const tornado = this.add.circle(px, py, evt.radius * ts, 0x888888, 0.5);
                tornado.setDepth(50);
                this.tweens.add({
                    targets: tornado,
                    alpha: 0, scaleX: 2, scaleY: 2, angle: 360,
                    duration: 800,
                    onComplete: () => tornado.destroy()
                });
                break;
            }
            case 'tornado_move': {
                // Small swirl at tornado position
                const swirl = this.add.circle(px, py, evt.radius * ts * 0.8, 0x999999, 0.3);
                swirl.setDepth(45);
                this.tweens.add({
                    targets: swirl,
                    alpha: 0, angle: 180, scaleX: 1.3, scaleY: 1.3,
                    duration: 400,
                    onComplete: () => swirl.destroy()
                });
                break;
            }
            case 'flood': {
                this.soundSystem.playFlood();
                const wave = this.add.circle(px, py, evt.radius * ts, 0x1a7aaa, 0.5);
                wave.setDepth(50);
                this.tweens.add({
                    targets: wave,
                    alpha: 0, scaleX: 1.5, scaleY: 1.5,
                    duration: 1000,
                    onComplete: () => wave.destroy()
                });
                break;
            }
            case 'heal': {
                this.soundSystem.playHeal();
                const glow = this.add.circle(px, py, evt.radius * ts, 0x00ffaa, 0.4);
                glow.setDepth(50);
                this.tweens.add({
                    targets: glow,
                    alpha: 0, scaleX: 1.3, scaleY: 1.3,
                    duration: 800,
                    onComplete: () => glow.destroy()
                });
                // Sparkle particles
                for (let i = 0; i < 5; i++) {
                    const sparkle = this.add.circle(
                        px + (Math.random() - 0.5) * evt.radius * ts * 2,
                        py + (Math.random() - 0.5) * evt.radius * ts * 2,
                        2, 0xffffff, 0.8
                    );
                    sparkle.setDepth(55);
                    this.tweens.add({
                        targets: sparkle,
                        alpha: 0, y: sparkle.y - 20,
                        duration: 600 + Math.random() * 400,
                        onComplete: () => sparkle.destroy()
                    });
                }
                break;
            }
            case 'bless': {
                this.soundSystem.playBless();
                const ring = this.add.circle(px, py, evt.radius * ts, 0xffd700, 0.3);
                ring.setDepth(50);
                this.tweens.add({
                    targets: ring,
                    alpha: 0, scaleX: 1.5, scaleY: 1.5,
                    duration: 1000,
                    onComplete: () => ring.destroy()
                });
                break;
            }
            case 'curse': {
                this.soundSystem.playCurse();
                const dark = this.add.circle(px, py, evt.radius * ts, 0x9900ff, 0.4);
                dark.setDepth(50);
                this.tweens.add({
                    targets: dark,
                    alpha: 0, scaleX: 0.5, scaleY: 0.5,
                    duration: 800,
                    onComplete: () => dark.destroy()
                });
                break;
            }
            case 'blackhole': {
                this.soundSystem.playExplosion();
                this.soundSystem.playCurse();
                const hole = this.add.circle(px, py, 3 * ts, 0x000000, 0.9);
                hole.setDepth(50);
                const rim = this.add.circle(px, py, evt.radius * ts, 0x4400ff, 0.4);
                rim.setDepth(49);
                this.tweens.add({
                    targets: hole,
                    scaleX: 0, scaleY: 0, alpha: 0,
                    duration: 2000,
                    onComplete: () => hole.destroy()
                });
                this.tweens.add({
                    targets: rim,
                    scaleX: 0, scaleY: 0, alpha: 0, angle: 720,
                    duration: 2000,
                    onComplete: () => rim.destroy()
                });
                this.cameras.main.shake(800, 0.02);
                break;
            }
            case 'age_change': {
                this.soundSystem.playAgeChange();
                this.registry.set('notification', `🔄 ${evt.name}`);
                break;
            }
            case 'blood': {
                const blood = this.add.circle(px, py, (evt.radius || 1) * ts * 0.5, 0xcc0000, 0.6);
                blood.setDepth(45);
                this.tweens.add({
                    targets: blood,
                    alpha: 0,
                    duration: 600,
                    onComplete: () => blood.destroy()
                });
                break;
            }
            case 'poison': {
                const poison = this.add.circle(px, py, (evt.radius || 1) * ts * 0.5, 0x00cc00, 0.5);
                poison.setDepth(45);
                this.tweens.add({
                    targets: poison,
                    alpha: 0, scaleX: 1.3, scaleY: 1.3,
                    duration: 800,
                    onComplete: () => poison.destroy()
                });
                break;
            }
            case 'trade': {
                const coin = this.add.circle(px, py, ts, 0xffd700, 0.4);
                coin.setDepth(45);
                this.tweens.add({
                    targets: coin,
                    alpha: 0, y: coin.y - 20,
                    duration: 800,
                    onComplete: () => coin.destroy()
                });
                break;
            }
            case 'invasion': {
                const flag = this.add.circle(px, py, (evt.radius || 1) * ts, 0xff0000, 0.5);
                flag.setDepth(45);
                this.tweens.add({
                    targets: flag,
                    alpha: 0, scaleX: 2, scaleY: 2,
                    duration: 800,
                    onComplete: () => flag.destroy()
                });
                this.cameras.main.shake(200, 0.01);
                break;
            }
            case 'blessing': {
                const glow = this.add.circle(px, py, ts, 0xffd700, 0.3);
                glow.setDepth(45);
                this.tweens.add({
                    targets: glow,
                    alpha: 0, scaleX: 1.5, scaleY: 1.5,
                    duration: 1000,
                    onComplete: () => glow.destroy()
                });
                break;
            }
            case 'arrow': {
                const px2 = evt.tx * ts + ts / 2;
                const py2 = evt.ty * ts + ts / 2;
                const arrow = this.add.rectangle(px, py, 4, 1, 0x000000); // black arrow body
                arrow.setDepth(45);
                const angle = Phaser.Math.Angle.Between(px, py, px2, py2);
                arrow.setRotation(angle);

                this.tweens.add({
                    targets: arrow,
                    x: px2, y: py2,
                    duration: 300, // fast travel
                    onComplete: () => arrow.destroy()
                });
                break;
            }
            case 'madness': {
                this.soundSystem.playCurse();
                const redPulse = this.add.circle(px, py, evt.radius * ts, 0xff0000, 0.6);
                redPulse.setDepth(50);
                this.tweens.add({
                    targets: redPulse,
                    scaleX: 1.5, scaleY: 1.5, alpha: 0,
                    duration: 600,
                    yoyo: true, // Pulse effect
                    repeat: 1,
                    onComplete: () => redPulse.destroy()
                });
                break;
            }
            case 'settlement_captured': {
                // Flag planting effect — expanding ring in attacker's color
                const flagColor = evt.color || 0xff0000;
                const ring = this.add.circle(px, py, ts * 2, flagColor, 0.5);
                ring.setDepth(50);
                this.tweens.add({
                    targets: ring,
                    alpha: 0, scaleX: 3, scaleY: 3,
                    duration: 1000,
                    onComplete: () => ring.destroy()
                });
                // Brief camera shake for impact
                this.cameras.main.shake(200, 0.008);
                break;
            }
            case 'kingdom_destroyed': {
                // Dark implosion effect
                const darkRing = this.add.circle(px, py, ts * 3, 0x333333, 0.6);
                darkRing.setDepth(50);
                this.tweens.add({
                    targets: darkRing,
                    alpha: 0, scaleX: 0.3, scaleY: 0.3,
                    duration: 1200,
                    onComplete: () => darkRing.destroy()
                });
                this.cameras.main.shake(300, 0.01);
                break;
            }
            case 'nuclear': {
                this.soundSystem.playExplosion();
                // Massive white flash
                const nukeFlash = this.add.circle(px, py, evt.radius * ts * 2, 0xffffff, 1.0);
                nukeFlash.setDepth(100);
                this.tweens.add({
                    targets: nukeFlash,
                    alpha: 0, scaleX: 3, scaleY: 3,
                    duration: 800,
                    onComplete: () => nukeFlash.destroy()
                });
                // Fire ring
                const nukeFire = this.add.circle(px, py, evt.radius * ts, 0xff4400, 0.8);
                nukeFire.setDepth(50);
                this.tweens.add({
                    targets: nukeFire,
                    alpha: 0, scaleX: 1.5, scaleY: 1.5,
                    duration: 1200,
                    onComplete: () => nukeFire.destroy()
                });
                // Radiation glow
                const nukeRad = this.add.circle(px, py, evt.radius * ts * 1.5, 0x00ff00, 0.3);
                nukeRad.setDepth(49);
                this.tweens.add({
                    targets: nukeRad,
                    alpha: 0, scaleX: 2, scaleY: 2,
                    duration: 2000,
                    onComplete: () => nukeRad.destroy()
                });
                this.cameras.main.shake(1000, 0.04);
                break;
            }
            case 'napalm': {
                this.soundSystem.playExplosion();
                const napalmFire = this.add.circle(px, py, evt.radius * ts, 0xff6600, 0.8);
                napalmFire.setDepth(50);
                this.tweens.add({
                    targets: napalmFire,
                    alpha: 0, scaleX: 1.5, scaleY: 1.5,
                    duration: 1200,
                    onComplete: () => napalmFire.destroy()
                });
                this.cameras.main.shake(400, 0.01);
                break;
            }
            case 'antimatter': {
                this.soundSystem.playExplosion();
                // White-purple void
                const voidCircle = this.add.circle(px, py, evt.radius * ts, 0xffffff, 1.0);
                voidCircle.setDepth(100);
                this.tweens.add({
                    targets: voidCircle,
                    alpha: 0, scaleX: 1.2, scaleY: 1.2,
                    duration: 1500,
                    onComplete: () => voidCircle.destroy()
                });
                const voidRing = this.add.circle(px, py, evt.radius * ts * 1.5, 0x8800ff, 0.6);
                voidRing.setDepth(50);
                this.tweens.add({
                    targets: voidRing,
                    alpha: 0, scaleX: 2, scaleY: 2,
                    duration: 2000,
                    onComplete: () => voidRing.destroy()
                });
                this.cameras.main.shake(1500, 0.05);
                break;
            }
            case 'grenade': {
                this.soundSystem.playExplosion();
                const grenadeFlash = this.add.circle(px, py, evt.radius * ts * 2, 0xffaa00, 0.9);
                grenadeFlash.setDepth(50);
                this.tweens.add({
                    targets: grenadeFlash,
                    alpha: 0, scaleX: 1.5, scaleY: 1.5,
                    duration: 400,
                    onComplete: () => grenadeFlash.destroy()
                });
                this.cameras.main.shake(200, 0.008);
                break;
            }
            case 'ufo_beam': {
                const beamPx = evt.x * ts + ts / 2;
                const beamPy = evt.y * ts + ts / 2;
                const targetPx = evt.tx * ts + ts / 2;
                const targetPy = evt.ty * ts + ts / 2;
                // Abduction beam — yellow-green triangle
                const beam = this.add.triangle(
                    beamPx, beamPy,
                    beamPx - ts, beamPy + ts * 3,
                    beamPx + ts, beamPy + ts * 3,
                    targetPx, targetPy,
                    0xaaff00, 0.4
                );
                beam.setDepth(45);
                this.tweens.add({
                    targets: beam,
                    alpha: 0,
                    duration: 800,
                    onComplete: () => beam.destroy()
                });
                break;
            }
            case 'spell': {
                const spx = evt.x * ts + ts / 2;
                const spy = evt.y * ts + ts / 2;
                const stpx = (evt.tx || evt.x) * ts + ts / 2;
                const stpy = (evt.ty || evt.y) * ts + ts / 2;
                const spellColor = evt.color || 0xff4400;

                switch (evt.vfxType) {
                    case 'projectile': {
                        // Fireball: projectile from caster to target with explosion
                        const proj = this.add.circle(spx, spy, 3, spellColor, 0.9);
                        proj.setDepth(50);
                        this.tweens.add({
                            targets: proj,
                            x: stpx, y: stpy,
                            duration: 300,
                            onComplete: () => {
                                proj.destroy();
                                // Explosion at target
                                const explosion = this.add.circle(stpx, stpy, ts, spellColor, 0.6);
                                explosion.setDepth(50);
                                this.tweens.add({
                                    targets: explosion,
                                    alpha: 0, scaleX: 2, scaleY: 2,
                                    duration: 400,
                                    onComplete: () => explosion.destroy()
                                });
                                const flash = this.add.circle(stpx, stpy, 3, 0xffffff, 0.8);
                                flash.setDepth(51);
                                this.tweens.add({
                                    targets: flash,
                                    alpha: 0,
                                    duration: 200,
                                    onComplete: () => flash.destroy()
                                });
                            }
                        });
                        break;
                    }
                    case 'shield': {
                        // Shield bubble around caster
                        const shield = this.add.circle(spx, spy, ts * 1.2, spellColor, 0.15);
                        shield.setDepth(45);
                        const shieldRing = this.add.circle(spx, spy, ts * 1.2, spellColor, 0.7);
                        shieldRing.setDepth(46);
                        shieldRing.setStrokeStyle(2, spellColor, 0.7);
                        shieldRing.setFillStyle(0x000000, 0);
                        this.tweens.add({
                            targets: [shield, shieldRing],
                            alpha: 0, scaleX: 1.3, scaleY: 1.3,
                            duration: 800,
                            onComplete: () => { shield.destroy(); shieldRing.destroy(); }
                        });
                        break;
                    }
                    case 'teleport': {
                        // Flash at origin
                        const flashOut = this.add.circle(spx, spy, ts, spellColor, 0.6);
                        flashOut.setDepth(50);
                        this.tweens.add({
                            targets: flashOut,
                            alpha: 0, scaleX: 2, scaleY: 2,
                            duration: 300,
                            onComplete: () => flashOut.destroy()
                        });
                        // Flash at destination
                        const flashIn = this.add.circle(stpx, stpy, ts * 0.5, spellColor, 0.5);
                        flashIn.setDepth(50);
                        this.tweens.add({
                            targets: flashIn,
                            alpha: 0, scaleX: 2, scaleY: 2,
                            duration: 500,
                            onComplete: () => flashIn.destroy()
                        });
                        break;
                    }
                    case 'heal': {
                        // Green rising particles
                        for (let i = 0; i < 5; i++) {
                            const sparkle = this.add.circle(
                                stpx + (Math.random() - 0.5) * ts * 2,
                                stpy + (Math.random() - 0.5) * ts,
                                2, spellColor, 0.8
                            );
                            sparkle.setDepth(50);
                            this.tweens.add({
                                targets: sparkle,
                                alpha: 0, y: sparkle.y - 15,
                                duration: 600 + Math.random() * 400,
                                onComplete: () => sparkle.destroy()
                            });
                        }
                        break;
                    }
                    case 'lightning': {
                        // Lightning bolt — bright flash line from caster to target
                        const line = this.add.rectangle(spx, spy, 2, Phaser.Math.Distance.Between(spx, spy, stpx, stpy), 0xffff00, 0.9);
                        line.setDepth(50);
                        line.setRotation(Phaser.Math.Angle.Between(spx, spy, stpx, stpy) - Math.PI / 2);
                        line.setOrigin(0.5, 0);
                        this.tweens.add({
                            targets: line,
                            alpha: 0,
                            duration: 200,
                            onComplete: () => line.destroy()
                        });
                        // Flash at impact
                        const impact = this.add.circle(stpx, stpy, 5, 0xffffff, 0.9);
                        impact.setDepth(51);
                        this.tweens.add({
                            targets: impact,
                            alpha: 0,
                            duration: 150,
                            onComplete: () => impact.destroy()
                        });
                        break;
                    }
                    case 'rain': {
                        // Blood drops falling around target
                        const drops = evt.drops || 6;
                        for (let i = 0; i < drops; i++) {
                            const rx = stpx + (Math.random() - 0.5) * ts * 4;
                            const ry = stpy - ts * 2 - Math.random() * ts * 2;
                            const drop = this.add.circle(rx, ry, 2, spellColor, 0.7);
                            drop.setDepth(50);
                            this.tweens.add({
                                targets: drop,
                                y: stpy + (Math.random() - 0.5) * ts * 4,
                                alpha: 0,
                                duration: 400 + Math.random() * 400,
                                onComplete: () => drop.destroy()
                            });
                        }
                        break;
                    }
                    case 'spiral': {
                        // Tornado spiral
                        const spiral = this.add.circle(stpx, stpy, ts * 1.5, spellColor, 0.4);
                        spiral.setDepth(50);
                        this.tweens.add({
                            targets: spiral,
                            alpha: 0, angle: 720, scaleX: 1.5, scaleY: 1.5,
                            duration: 800,
                            onComplete: () => spiral.destroy()
                        });
                        break;
                    }
                    case 'curse': {
                        // Dark aura around target
                        const aura = this.add.circle(stpx, stpy, ts * 1.5, spellColor, 0.3);
                        aura.setDepth(50);
                        this.tweens.add({
                            targets: aura,
                            alpha: 0, scaleX: 0.5, scaleY: 0.5,
                            duration: 800,
                            onComplete: () => aura.destroy()
                        });
                        break;
                    }
                }
                break;
            }
            case 'miss': {
                // Show miss indicator
                const missX = evt.x * ts + ts / 2;
                const missY = evt.y * ts + ts / 2 - 3;
                // Small X mark
                const missGfx = this.add.graphics();
                missGfx.setDepth(50);
                missGfx.lineStyle(1, 0xcccccc, 0.7);
                missGfx.beginPath();
                missGfx.moveTo(missX - 3, missY - 3);
                missGfx.lineTo(missX + 3, missY + 3);
                missGfx.moveTo(missX + 3, missY - 3);
                missGfx.lineTo(missX - 3, missY + 3);
                missGfx.strokePath();
                this.tweens.add({
                    targets: missGfx,
                    alpha: 0, y: -5,
                    duration: 400,
                    onComplete: () => missGfx.destroy()
                });
                break;
            }
        }
    }

    // ─── SAVE / LOAD ────────────────────────────────────────────
    saveGame() {
        const success = SaveManager.save(this.gameState, this.simLoop.getTick(), {
            worldAge: this.worldAge
        });
        if (success) {
            this.soundSystem.playNotification();
            this.registry.set('notification', '💾 Game Saved');
        }
    }

    loadGameState() {
        const data = SaveManager.load();
        if (!data) return;

        // Restore tiles
        this.worldMap.tiles = data.world.tiles;
        
        // Restore fire and plague tiles
        if (data.world.fireTiles) {
            this.worldMap.fireTiles = new Set(data.world.fireTiles);
        }
        if (data.world.plagueTiles) {
            this.worldMap.plagueTiles = new Set(data.world.plagueTiles);
        }
        if (data.world.radiationTiles) {
            this.worldMap.radiationTiles = new Set(data.world.radiationTiles);
        }
        
        // Restore building grid
        if (data.world.buildingGrid) {
            this.worldMap.buildingGrid = new Map(data.world.buildingGrid);
        }
        
        this.terrainRenderer.renderAll();

        // Restore kingdoms first (settlements reference them)
        if (data.kingdoms) {
            for (const kd of data.kingdoms) {
                const kingdom = this.kingdomManager.create({
                    ...kd,
                    enemies: new Set(kd.enemies || []),
                    allies: new Set(kd.allies || [])
                });
                // Ensure ID counter is above loaded IDs
            }
        }

        // Restore settlements
        for (const sd of data.settlements) {
            const settlement = this.settlementManager.create({
                ...sd,
                territory: new Set(sd.territory)
            });
        }

        // Restore entities
        for (const ed of data.entities) {
            // Restore subspecies object from saved subspeciesId
            if (ed.subspeciesId && !ed.subspecies) {
                ed.subspecies = getSubspeciesById(ed.subspeciesId);
            }
            const unit = this.entityManager.create(ed);
            this.worldMap.addEntityAt(ed.tileX, ed.tileY, unit.id);
        }

        // Restore animals
        if (data.animals) {
            for (const ad of data.animals) {
                this.animalSystem.forceSpawn(ad);
            }
        }

        // Restore ships
        if (data.ships && this.navalSystem.restoreShips) {
            this.navalSystem.restoreShips(data.ships);
        }

        // Restore age system
        if (data.ageState && this.ageSystem.restoreState) {
            this.ageSystem.restoreState(data.ageState);
        }

        // Restore ID counters to prevent conflicts
        if (data.maxEntityId) setNextEntityId(data.maxEntityId);
        if (data.maxSettlementId) setNextSettlementId(data.maxSettlementId);
        if (data.maxKingdomId) setNextKingdomId(data.maxKingdomId);

        // Restore roads
        if (data.roads && this.roadSystem) {
            this.roadSystem.restoreState(data.roads);
        }

        // Restore equipment
        if (data.equipment && this.equipmentSystem) {
            this.equipmentSystem.restoreSaveData(data.equipment);
        }

        // Restore world laws
        if (data.worldLaws && this.worldLawsSystem) {
            this.worldLawsSystem.restoreSaveData(data.worldLaws);
        }

        // Restore history
        if (data.history && this.historySystem) {
            this.historySystem.restoreSaveData(data.history);
        }

        // Restore world age
        this.worldAge = data.worldAge || data.tick || 0;
        this.simLoop.tickCount = data.tick || 0;
        this.soundSystem.playNotification();
        this.registry.set('notification', '📂 Game Loaded');
    }

    setTool(tool) {
        this.selectedTool = tool;
    }

    setSimSpeed(speed) {
        this.simLoop.setSpeed(speed);
        this.registry.set('simSpeed', speed);
    }
}
