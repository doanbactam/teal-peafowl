/**
 * SpriteGenerator — Converts pixel art data into Phaser textures at runtime.
 *
 * Generates a texture atlas from SpriteData definitions.
 * Each sprite is rendered to a Canvas, then registered as a Phaser texture.
 *
 * Supports:
 *   - Solid colors (0xRRGGBB)
 *   - Semi-transparent colors ([0xRRGGBB, alpha])
 *   - Body-color placeholders ('BODY', 'WALL', 'FLAG', 'LIGHT')
 */
import { RACE_SPRITES, CREATURE_SPRITES, BUILDING_SPRITES, CROWN_SPRITE, SPRITE_SIZE } from './SpriteData.js';

/**
 * Draw a pixel art sprite onto a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array[]} spriteData  - 2D array of color values
 * @param {number} offsetX      - X offset onto the canvas
 * @param {number} offsetY      - Y offset onto the canvas
 * @param {number} scale        - Pixel scale (1 = 1 pixel per cell)
 * @param {object} options      - { bodyColor, wallColor, flagColor }
 */
function drawSprite(ctx, spriteData, offsetX, offsetY, scale, options = {}) {
    const bodyColor = options.bodyColor || 0x5b9bd5;
    const wallColor = options.wallColor || 0xa0785a;
    const flagColor = options.flagColor || 0xff0000;

    for (let row = 0; row < spriteData.length; row++) {
        for (let col = 0; col < spriteData[row].length; col++) {
            let cell = spriteData[row][col];
            if (cell === 0) continue; // transparent

            let color, alpha = 1;

            // Handle special placeholder strings
            if (cell === 'BODY') {
                color = bodyColor;
            } else if (cell === 'WALL') {
                color = wallColor;
            } else if (cell === 'FLAG') {
                color = flagColor;
            } else if (cell === 'LIGHT') {
                // Rotating light — just use a default color; animation handled elsewhere
                color = 0xff0000;
            } else if (Array.isArray(cell)) {
                color = cell[0];
                alpha = cell[1];
            } else {
                color = cell;
            }

            const r = (color >> 16) & 0xFF;
            const g = (color >> 8) & 0xFF;
            const b = color & 0xFF;

            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.fillRect(offsetX + col * scale, offsetY + row * scale, scale, scale);
        }
    }
}

/**
 * Generate all sprite textures and register them with Phaser's texture manager.
 * Call this once during PreloaderScene.
 *
 * @param {Phaser.Scene} scene
 */
export function generateAllSpriteTextures(scene) {
    const texManager = scene.textures;
    const scale = 1; // 1:1 pixel art, will be scaled by Phaser sprites

    // ─── RACE SPRITES ───────────────────────────────────────
    // For each race, generate textures for each body color variant
    for (const [raceId, frames] of Object.entries(RACE_SPRITES)) {
        for (const [frameName, spriteData] of Object.entries(frames)) {
            const key = `race_${raceId}_${frameName}`;
            const w = SPRITE_SIZE * scale;
            const h = SPRITE_SIZE * scale;

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');

            // Draw with default body color (will be tinted at render time)
            drawSprite(ctx, spriteData, 0, 0, scale, {
                bodyColor: 0x888888, // Neutral gray — tinted per-kingdom at render
            });

            if (!texManager.exists(key)) {
                texManager.addCanvas(key, canvas);
            }
        }
    }

    // ─── CREATURE SPRITES ───────────────────────────────────
    for (const [creatureType, spriteData] of Object.entries(CREATURE_SPRITES)) {
        const key = `creature_${creatureType}`;
        const w = SPRITE_SIZE * scale;
        const h = SPRITE_SIZE * scale;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        drawSprite(ctx, spriteData, 0, 0, scale);

        if (!texManager.exists(key)) {
            texManager.addCanvas(key, canvas);
        }
    }

    // ─── BUILDING SPRITES ───────────────────────────────────
    for (const [buildingType, spriteData] of Object.entries(BUILDING_SPRITES)) {
        const key = `building_${buildingType}`;
        const w = SPRITE_SIZE * scale;
        const h = SPRITE_SIZE * scale;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        drawSprite(ctx, spriteData, 0, 0, scale, {
            wallColor: 0xa0785a,
        });

        if (!texManager.exists(key)) {
            texManager.addCanvas(key, canvas);
        }
    }

    // ─── CROWN SPRITE ───────────────────────────────────────
    {
        const cw = CROWN_SPRITE[0].length;
        const ch = CROWN_SPRITE.length;
        const canvas = document.createElement('canvas');
        canvas.width = cw * scale;
        canvas.height = ch * scale;
        const ctx = canvas.getContext('2d');
        drawSprite(ctx, CROWN_SPRITE, 0, 0, scale);
        if (!texManager.exists('crown')) {
            texManager.addCanvas('crown', canvas);
        }
    }

    console.log('[SpriteGenerator] All sprite textures generated');
}

/**
 * Generate a race sprite texture with a specific body color.
 * Used for kingdom-colored units.
 *
 * @param {Phaser.Scene} scene
 * @param {string} raceId
 * @param {string} frameName - 'idle', 'fight', 'work'
 * @param {number} bodyColor - 0xRRGGBB
 * @returns {string} texture key
 */
export function generateRaceSpriteWithColor(scene, raceId, frameName, bodyColor) {
    const key = `race_${raceId}_${frameName}_${bodyColor.toString(16)}`;

    if (scene.textures.exists(key)) return key;

    const raceFrames = RACE_SPRITES[raceId];
    if (!raceFrames) return `race_human_idle`;

    const spriteData = raceFrames[frameName] || raceFrames.idle;
    if (!spriteData) return `race_human_idle`;

    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    const ctx = canvas.getContext('2d');

    drawSprite(ctx, spriteData, 0, 0, 1, { bodyColor });

    scene.textures.addCanvas(key, canvas);
    return key;
}

/**
 * Generate a building sprite with specific wall color.
 *
 * @param {Phaser.Scene} scene
 * @param {string} buildingType
 * @param {number} wallColor
 * @param {number} flagColor
 * @returns {string} texture key
 */
export function generateBuildingSpriteWithColor(scene, buildingType, wallColor, flagColor) {
    const key = `building_${buildingType}_${wallColor.toString(16)}`;

    if (scene.textures.exists(key)) return key;

    const spriteData = BUILDING_SPRITES[buildingType];
    if (!spriteData) return `building_house`;

    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    const ctx = canvas.getContext('2d');

    drawSprite(ctx, spriteData, 0, 0, 1, { wallColor, flagColor });

    scene.textures.addCanvas(key, canvas);
    return key;
}
