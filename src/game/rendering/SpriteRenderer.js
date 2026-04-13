/**
 * SpriteRenderer — Manages sprite-based rendering for entities, animals,
 * buildings, and ships.
 *
 * Replaces the old procedural-graphics renderEntities() and renderBuildings()
 * with a pooled Phaser.Image system for much better performance and visual
 * quality.
 */
import { generateRaceSpriteWithColor, generateBuildingSpriteWithColor } from './SpriteGenerator.js';
import { RACE_SPRITES, CREATURE_SPRITES, BUILDING_SPRITES, SPRITE_SIZE } from './SpriteData.js';

export class SpriteRenderer {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;

        // Sprite pools: Map<entityId, Phaser.GameObjects.Image>
        /** @type {Map<number, Phaser.GameObjects.Image>} */
        this.entitySprites = new Map();

        /** @type {Map<number, Phaser.GameObjects.Image>} */
        this.animalSprites = new Map();

        /** @type {Map<string, Phaser.GameObjects.Image>} */
        this.buildingSprites = new Map();

        /** @type {Map<number, Phaser.GameObjects.Image>} */
        this.shipSprites = new Map();

        // Crown overlays for kings
        /** @type {Map<number, Phaser.GameObjects.Image>} */
        this.crownSprites = new Map();

        // HP bar graphics (shared)
        this.hpGraphics = scene.add.graphics();
        this.hpGraphics.setDepth(12);

        // Indicator graphics (carrying, plagued, subspecies)
        this.indicatorGraphics = scene.add.graphics();
        this.indicatorGraphics.setDepth(13);

        // Texture cache: avoid regenerating same body-color texture
        /** @type {Map<string, string>} */
        this._textureCache = new Map();

        // Building texture cache
        /** @type {Map<string, string>} */
        this._buildingTextureCache = new Map();
    }

    // ─── GET / CREATE SPRITE ────────────────────────────────

    /**
     * Get or create a sprite for an entity.
     */
    _getEntitySprite(entity) {
        let sprite = this.entitySprites.get(entity.id);
        if (sprite && !sprite.active) {
            // sprite was destroyed, recreate
            this.entitySprites.delete(entity.id);
            sprite = null;
        }
        if (!sprite) {
            sprite = this.scene.add.image(0, 0, 'race_human_idle');
            sprite.setDepth(10);
            sprite.setOrigin(0.5, 0.5);
            this.entitySprites.set(entity.id, sprite);
        }
        return sprite;
    }

    _getAnimalSprite(animal) {
        let sprite = this.animalSprites.get(animal.id);
        if (sprite && !sprite.active) {
            this.animalSprites.delete(animal.id);
            sprite = null;
        }
        if (!sprite) {
            sprite = this.scene.add.image(0, 0, 'creature_dog');
            sprite.setDepth(10);
            sprite.setOrigin(0.5, 0.5);
            this.animalSprites.set(animal.id, sprite);
        }
        return sprite;
    }

    _getBuildingSprite(key) {
        let sprite = this.buildingSprites.get(key);
        if (sprite && !sprite.active) {
            this.buildingSprites.delete(key);
            sprite = null;
        }
        if (!sprite) {
            sprite = this.scene.add.image(0, 0, 'building_house');
            sprite.setDepth(5);
            sprite.setOrigin(0, 0);
            this.buildingSprites.set(key, sprite);
        }
        return sprite;
    }

    _getShipSprite(ship) {
        let sprite = this.shipSprites.get(ship.id);
        if (sprite && !sprite.active) {
            this.shipSprites.delete(ship.id);
            sprite = null;
        }
        if (!sprite) {
            sprite = this.scene.add.image(0, 0, 'building_ship');
            sprite.setDepth(10);
            sprite.setOrigin(0.5, 0.5);
            this.shipSprites.set(ship.id, sprite);
        }
        return sprite;
    }

    // ─── RESOLVE TEXTURE KEY ────────────────────────────────

    _getEntityTextureKey(entity) {
        const raceId = entity.raceId || 'human';
        let frameName = 'idle';
        if (entity.state === 'fighting') frameName = 'fight';
        else if (entity.state === 'chopping' || entity.state === 'mining' ||
                 entity.state === 'building' || entity.state === 'farming' ||
                 entity.state === 'gathering') frameName = 'work';

        // Get the body color (kingdom / entity color)
        let bodyColor = entity.color || 0x5b9bd5;

        // Apply subspecies color mod
        if (entity.subspecies && entity.subspecies.colorMod) {
            const r = (bodyColor >> 16) & 0xFF;
            const g = (bodyColor >> 8) & 0xFF;
            const b = bodyColor & 0xFF;
            const mod = entity.subspecies.colorMod;
            const nr = Math.max(0, Math.min(255, r + Math.floor(mod * 50)));
            const ng = Math.max(0, Math.min(255, g + Math.floor(mod * 50)));
            const nb = Math.max(0, Math.min(255, b + Math.floor(mod * 50)));
            bodyColor = (nr << 16) | (ng << 8) | nb;
        }

        // Check if this race has sprite data for the frame
        const raceData = RACE_SPRITES[raceId];
        if (!raceData) {
            // Fallback to human
            return this._resolveOrGenerate('human', frameName, bodyColor);
        }
        if (!raceData[frameName]) {
            frameName = 'idle'; // fallback frame
        }

        return this._resolveOrGenerate(raceId, frameName, bodyColor);
    }

    _resolveOrGenerate(raceId, frameName, bodyColor) {
        const cacheKey = `${raceId}_${frameName}_${bodyColor}`;
        let texKey = this._textureCache.get(cacheKey);
        if (texKey) return texKey;

        texKey = generateRaceSpriteWithColor(this.scene, raceId, frameName, bodyColor);
        this._textureCache.set(cacheKey, texKey);
        return texKey;
    }

    _getAnimalTextureKey(animal) {
        const type = animal.type || 'dog';
        if (CREATURE_SPRITES[type]) {
            return `creature_${type}`;
        }
        // fallback
        return 'creature_dog';
    }

    _getBuildingTextureKey(building) {
        const type = building.type || 'house';
        const wallColor = building.color || 0xa0785a;

        // Check if it's a standard building sprite
        if (BUILDING_SPRITES[type]) {
            const cacheKey = `${type}_${wallColor}`;
            let texKey = this._buildingTextureCache.get(cacheKey);
            if (texKey) return texKey;

            texKey = generateBuildingSpriteWithColor(this.scene, type, wallColor, building.flagColor || 0xff0000);
            this._buildingTextureCache.set(cacheKey, texKey);
            return texKey;
        }

        // Fallback to house
        return 'building_house';
    }

    // ─── RENDER ENTITIES ────────────────────────────────────

    /**
     * Called each frame from GameScene.update().
     * Replace the old renderEntities() method entirely.
     */
    renderEntities(entityManager, animalSystem, navalSystem, worldMap, camera) {
        const ts = worldMap.tileSize;
        const vx = camera.worldView.x;
        const vy = camera.worldView.y;
        const vw = camera.worldView.width;
        const vh = camera.worldView.height;
        const pad = ts * 2;

        // Track which entity IDs are still alive this frame
        const aliveEntityIds = new Set();
        const aliveAnimalIds = new Set();
        const aliveShipIds = new Set();

        // Clear HP and indicator graphics
        this.hpGraphics.clear();
        this.indicatorGraphics.clear();

        // ── Civilization Units ───────────────────────────────
        for (const entity of entityManager.getAllAlive()) {
            aliveEntityIds.add(entity.id);

            const ex = entity.x;
            const ey = entity.y;

            // Frustum cull
            if (ex < vx - pad || ex > vx + vw + pad ||
                ey < vy - pad || ey > vy + vh + pad) {
                const sprite = this.entitySprites.get(entity.id);
                if (sprite) sprite.setVisible(false);
                const crown = this.crownSprites.get(entity.id);
                if (crown) crown.setVisible(false);
                continue;
            }

            const sprite = this._getEntitySprite(entity);
            const texKey = this._getEntityTextureKey(entity);

            sprite.setTexture(texKey);
            sprite.setPosition(ex, ey);
            sprite.setVisible(true);

            // Scale and Alpha based on traits and state
            let scaleVal = ts / SPRITE_SIZE * 0.7;
            let alpha = 1;

            if (entity.isLeader) scaleVal *= 1.2;
            if (entity.state === 'fighting') alpha = 0.7 + Math.random() * 0.3;

            if (entity.traits && entity.traits.length > 0) {
                let hasGiant = false, hasTiny = false, hasInfected = false;
                for (let i = 0; i < entity.traits.length; i++) {
                    if (entity.traits[i] === 'giant') hasGiant = true;
                    else if (entity.traits[i] === 'tiny') hasTiny = true;
                    else if (entity.traits[i] === 'infected') hasInfected = true;
                }
                if (hasGiant) scaleVal *= 1.5;
                if (hasTiny) scaleVal *= 0.6;
                if (hasInfected) alpha = 0.5;
            }
            entity._hasInfected = entity.traits && entity.traits.length > 0 && entity.traits.includes('infected');

            sprite.setScale(scaleVal);
            sprite.setAlpha(alpha);

            // Boat override
            if (entity.isBoat) {
                sprite.setTexture('building_ship');
            }

            // King Crown
            if (entity.isKing) {
                let crown = this.crownSprites.get(entity.id);
                if (!crown) {
                    crown = this.scene.add.image(0, 0, 'crown');
                    crown.setDepth(14);
                    crown.setOrigin(0.5, 1);
                    this.crownSprites.set(entity.id, crown);
                }
                crown.setPosition(ex, ey - SPRITE_SIZE * scaleVal * 0.45);
                crown.setScale(scaleVal);
                crown.setVisible(true);
            } else {
                const crown = this.crownSprites.get(entity.id);
                if (crown) crown.setVisible(false);
            }

            // HP bar for damaged units
            if (entity.hp < entity.maxHp) {
                const hpRatio = entity.hp / entity.maxHp;
                const barW = 8;
                const barY = ey - SPRITE_SIZE * scaleVal * 0.5 - 3;
                this.hpGraphics.fillStyle(0x000000, 0.6);
                this.hpGraphics.fillRect(ex - barW / 2, barY, barW, 2);
                const hpColor = hpRatio > 0.6 ? 0x2ecc71 : hpRatio > 0.3 ? 0xf39c12 : 0xe74c3c;
                this.hpGraphics.fillStyle(hpColor, 0.9);
                this.hpGraphics.fillRect(ex - barW / 2, barY, barW * hpRatio, 2);
            }

            // Carrying indicator
            if (entity.carrying) {
                const carryColor = entity.carrying.type === 'food' ? 0xf1c40f
                    : entity.carrying.type === 'wood' ? 0x8B4513 : 0x95a5a6;
                this.indicatorGraphics.fillStyle(carryColor, 0.9);
                this.indicatorGraphics.fillRect(ex + 1, ey - 2, 2, 2);
            }

            // Plagued indicator
            if (entity._hasInfected) {
                this.indicatorGraphics.fillStyle(0x00ff00, 0.4);
                this.indicatorGraphics.fillRect(ex - 1, ey - SPRITE_SIZE * scaleVal * 0.5 - 1, 2, 1);
            }

            // Subspecies dot
            if (entity.subspecies && entity.subspecies.colorMod !== 0) {
                const dotColor = entity.subspecies.colorMod > 0 ? 0xffffff : 0x333333;
                this.indicatorGraphics.fillStyle(dotColor, 0.8);
                this.indicatorGraphics.fillRect(ex + SPRITE_SIZE * scaleVal * 0.35, ey - SPRITE_SIZE * scaleVal * 0.35, 1, 1);
            }
        }

        // ── Animals ──────────────────────────────────────────
        for (const animal of animalSystem.getAllAlive()) {
            aliveAnimalIds.add(animal.id);

            const ax = animal.x;
            const ay = animal.y;

            if (ax < vx - pad || ax > vx + vw + pad ||
                ay < vy - pad || ay > vy + vh + pad) {
                const sprite = this.animalSprites.get(animal.id);
                if (sprite) sprite.setVisible(false);
                continue;
            }

            const sprite = this._getAnimalSprite(animal);
            const texKey = this._getAnimalTextureKey(animal);

            sprite.setTexture(texKey);
            sprite.setPosition(ax, ay);
            sprite.setVisible(true);

            // Scale animals
            let scaleVal = ts / SPRITE_SIZE * 0.6;
            if (animal.type === 'dragon') scaleVal = ts / SPRITE_SIZE * 1.0;
            else if (animal.type === 'crabzilla') scaleVal = ts / SPRITE_SIZE * 1.2;
            else if (animal.type === 'ufo') scaleVal = ts / SPRITE_SIZE * 0.9;
            else if (animal.type === 'rhino') scaleVal = ts / SPRITE_SIZE * 0.8;
            else if (animal.type === 'bee') scaleVal = ts / SPRITE_SIZE * 0.4;
            else if (animal.type === 'piranha') scaleVal = ts / SPRITE_SIZE * 0.45;
            sprite.setScale(scaleVal);

            // HP bar for damaged creatures
            if (animal.hp < animal.maxHp) {
                const hpRatio = animal.hp / animal.maxHp;
                const barW = 6;
                const barY = ay - SPRITE_SIZE * scaleVal * 0.5 - 3;
                this.hpGraphics.fillStyle(0x000000, 0.6);
                this.hpGraphics.fillRect(ax - barW / 2, barY, barW, 2);
                const hpColor = hpRatio > 0.6 ? 0x2ecc71 : hpRatio > 0.3 ? 0xf39c12 : 0xe74c3c;
                this.hpGraphics.fillStyle(hpColor, 0.9);
                this.hpGraphics.fillRect(ax - barW / 2, barY, barW * hpRatio, 2);
            }
        }

        // ── Naval Ships ──────────────────────────────────────
        for (const ship of navalSystem.getAllShips()) {
            aliveShipIds.add(ship.id);

            if (ship.x < vx - pad || ship.x > vx + vw + pad ||
                ship.y < vy - pad || ship.y > vy + vh + pad) {
                const sprite = this.shipSprites.get(ship.id);
                if (sprite) sprite.setVisible(false);
                continue;
            }

            const sprite = this._getShipSprite(ship);
            sprite.setPosition(ship.x, ship.y);
            sprite.setVisible(true);
            sprite.setScale(ts / SPRITE_SIZE * 0.7);

            // Transport ships have red tint
            if (ship.type === 'transport') {
                sprite.setTint(0xff6666);
            } else {
                sprite.clearTint();
            }
        }

        // ── Cleanup dead/removed sprites ─────────────────────
        this._cleanup(this.entitySprites, aliveEntityIds);
        this._cleanup(this.animalSprites, aliveAnimalIds);
        this._cleanup(this.shipSprites, aliveShipIds);

        // Cleanup crowns
        for (const [id, crown] of this.crownSprites) {
            if (!aliveEntityIds.has(id)) {
                crown.destroy();
                this.crownSprites.delete(id);
            }
        }
    }

    // ─── RENDER BUILDINGS ───────────────────────────────────

    /**
     * Called each frame. Replaces old renderBuildings().
     */
    renderBuildings(worldMap, camera) {
        const ts = worldMap.tileSize;
        const vx = camera.worldView.x;
        const vy = camera.worldView.y;
        const vw = camera.worldView.width;
        const vh = camera.worldView.height;

        const activeBuildingKeys = new Set();

        for (const [key, building] of worldMap.buildingGrid) {
            // Use cached tile positions to avoid split(',') per frame
            const px = building.tileX * ts;
            const py = building.tileY * ts;

            if (px < vx - ts || px > vx + vw + ts ||
                py < vy - ts || py > vy + vh + ts) {
                const sprite = this.buildingSprites.get(key);
                if (sprite) sprite.setVisible(false);
                continue;
            }

            activeBuildingKeys.add(key);

            const sprite = this._getBuildingSprite(key);
            const texKey = this._getBuildingTextureKey(building);

            sprite.setTexture(texKey);
            sprite.setPosition(px, py);
            sprite.setVisible(true);

            // Scale to fill tile
            const scaleVal = ts / SPRITE_SIZE;
            sprite.setScale(scaleVal);
        }

        // Cleanup removed buildings
        for (const [key, sprite] of this.buildingSprites) {
            if (!activeBuildingKeys.has(key) && !worldMap.buildingGrid.has(key)) {
                sprite.destroy();
                this.buildingSprites.delete(key);
            }
        }
    }

    // ─── CLEANUP ────────────────────────────────────────────

    _cleanup(spriteMap, aliveIds) {
        for (const [id, sprite] of spriteMap) {
            if (!aliveIds.has(id)) {
                sprite.destroy();
                spriteMap.delete(id);
            }
        }
    }

    destroy() {
        for (const sprite of this.entitySprites.values()) sprite.destroy();
        for (const sprite of this.animalSprites.values()) sprite.destroy();
        for (const sprite of this.buildingSprites.values()) sprite.destroy();
        for (const sprite of this.shipSprites.values()) sprite.destroy();
        for (const sprite of this.crownSprites.values()) sprite.destroy();
        this.hpGraphics.destroy();
        this.indicatorGraphics.destroy();

        this.entitySprites.clear();
        this.animalSprites.clear();
        this.buildingSprites.clear();
        this.shipSprites.clear();
        this.crownSprites.clear();
    }
}
