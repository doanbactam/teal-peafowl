/**
 * Minimap — renders a small overview of the entire world map.
 * Shows terrain, settlements, and camera viewport.
 */
import { getTileType } from '../world/TileTypes.js';

export class Minimap {
    /**
     * @param {Phaser.Scene} scene - The HUD scene
     * @param {import('../world/WorldMap.js').WorldMap} worldMap
     * @param {number} x - Minimap position X
     * @param {number} y - Minimap position Y
     * @param {number} size - Minimap display size in pixels
     */
    constructor(scene, worldMap, x, y, size = 140) {
        this.scene = scene;
        this.worldMap = worldMap;
        this.x = x;
        this.y = y;
        this.size = size;

        this.tileScale = size / worldMap.width;

        // Background border
        this.border = scene.add.graphics();
        this.border.fillStyle(0x0a0a1a, 0.9);
        this.border.fillRoundedRect(x - 4, y - 4, size + 8, size + 8, 4);
        this.border.lineStyle(1, 0x334455, 0.5);
        this.border.strokeRoundedRect(x - 4, y - 4, size + 8, size + 8, 4);

        // Terrain texture (rendered once)
        this.terrainGfx = scene.add.graphics();
        this.renderTerrain();

        // Overlay for dynamic elements (viewport, settlements)
        this.overlayGfx = scene.add.graphics();

        // Make minimap clickable to move camera
        const hitArea = scene.add.rectangle(x + size / 2, y + size / 2, size, size, 0x000000, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', (pointer) => this.onMinimapClick(pointer));
        this.hitArea = hitArea;
    }

    renderTerrain() {
        this.terrainGfx.clear();
        const map = this.worldMap;
        const s = this.tileScale;

        // Sample every N tiles for performance
        const step = Math.max(1, Math.floor(1 / s));

        for (let y = 0; y < map.height; y += step) {
            for (let x = 0; x < map.width; x += step) {
                const tile = getTileType(map.tiles[y][x]);
                this.terrainGfx.fillStyle(tile.color, 1);
                this.terrainGfx.fillRect(
                    this.x + x * s,
                    this.y + y * s,
                    Math.max(1, s * step),
                    Math.max(1, s * step)
                );
            }
        }
    }

    /**
     * Update dynamic overlay — viewport rect + settlement markers
     * @param {Phaser.Cameras.Scene2D.Camera} gameCamera
     * @param {Array} settlements
     */
    updateOverlay(gameCamera, settlements) {
        this.overlayGfx.clear();
        const map = this.worldMap;
        const s = this.tileScale;
        const ts = map.tileSize;

        // Draw camera viewport rect
        const vx = gameCamera.worldView.x / ts * s + this.x;
        const vy = gameCamera.worldView.y / ts * s + this.y;
        const vw = gameCamera.worldView.width / ts * s;
        const vh = gameCamera.worldView.height / ts * s;

        this.overlayGfx.lineStyle(1, 0xffffff, 0.7);
        this.overlayGfx.strokeRect(vx, vy, vw, vh);

        // Draw settlement markers
        if (settlements) {
            for (const settlement of settlements) {
                const sx = this.x + settlement.tileX * s;
                const sy = this.y + settlement.tileY * s;

                // Settlement dot with race color
                const race = this.getRaceColor(settlement.raceId);
                this.overlayGfx.fillStyle(race, 1);
                const markerSize = Math.max(2, 1 + settlement.tier);
                this.overlayGfx.fillRect(sx - markerSize / 2, sy - markerSize / 2, markerSize, markerSize);
            }
        }
    }

    onMinimapClick(pointer) {
        const localX = pointer.x - this.x;
        const localY = pointer.y - this.y;

        const tileX = localX / this.tileScale;
        const tileY = localY / this.tileScale;

        // Emit event for GameScene to handle camera movement
        this.scene.events.emit('minimap-click', tileX, tileY);
    }

    getRaceColor(raceId) {
        const colors = {
            human: 0x5b9bd5,
            elf: 0x2ecc71,
            orc: 0xe74c3c,
            dwarf: 0xf39c12,
            demon: 0x9b59b6,
            undead: 0x8e9191
        };
        return colors[raceId] || 0xffffff;
    }

    /**
     * Refresh the terrain image (call after major terrain changes)
     */
    refresh() {
        this.renderTerrain();
    }

    setPosition(x, y) {
        // Would reposition all elements — used on resize
        this.x = x;
        this.y = y;
        this.renderTerrain();
    }

    destroy() {
        this.border.destroy();
        this.terrainGfx.destroy();
        this.overlayGfx.destroy();
        this.hitArea.destroy();
    }
}
