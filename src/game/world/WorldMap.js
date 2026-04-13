/**
 * WorldMap — central data structure.
 * Holds tiles, entities, buildings, fire, and provides all query methods.
 */
import { generateWorld, paintTerrain } from './TerrainGenerator.js';
import { getTileType } from './TileTypes.js';

export class WorldMap {
    constructor(width = 200, height = 200, tileSize = 8, seed = undefined) {
        this.width    = width;
        this.height   = height;
        this.tileSize = tileSize;
        this.seed     = seed || (Date.now() + Math.floor(Math.random() * 1e6));

        this.tiles       = [];
        this.heightMap   = [];
        this.moistureMap = [];
        this.tempMap     = [];

        /** @type {Map<string, Set<number>>} */
        this.entityGrid  = new Map();
        /** @type {Map<string, object>} */
        this.buildingGrid = new Map();
        /** @type {Set<string>} */
        this.fireTiles   = new Set();
        /** @type {Set<string>} tiles with poison/plague */
        this.plagueTiles = new Set();
        /** @type {Set<string>} tiles with nuclear radiation */
        this.radiationTiles = new Set();

        this.generate();
    }

    generate() {
        const result = generateWorld(this.width, this.height, this.seed);
        this.tiles       = result.tiles;
        this.heightMap   = result.heightMap;
        this.moistureMap = result.moistureMap;
        this.tempMap     = result.tempMap || [];
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 'deep_water';
        return this.tiles[y][x];
    }

    setTile(x, y, tileType) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        this.tiles[y][x] = tileType;
    }

    getTileInfo(x, y) {
        return getTileType(this.getTile(x, y));
    }

    isWalkable(x, y, entity = null) {
        const info = this.getTileInfo(x, y);
        let walkable = info.walkable;
        
        // If entity can use boats, allow walking on water
        if (entity && !walkable) {
            const isWater = (this.getTile(x, y) === 'deep_water' || this.getTile(x, y) === 'shallow_water');
            if (isWater && entity.canBoat) {
                walkable = true;
            }
        }

        return walkable && !this.buildingGrid.has(`${x},${y}`);
    }

    isBuildable(x, y) {
        const info = this.getTileInfo(x, y);
        return info.buildable && !this.buildingGrid.has(`${x},${y}`);
    }

    isFlammable(x, y) {
        return getTileType(this.getTile(x, y)).flammable;
    }

    paint(cx, cy, radius, tileType) {
        return paintTerrain(this.tiles, cx, cy, radius, tileType);
    }

    pixelToTile(px, py) {
        return {
            x: Math.floor(px / this.tileSize),
            y: Math.floor(py / this.tileSize)
        };
    }

    tileToPixel(tx, ty) {
        return {
            x: tx * this.tileSize + this.tileSize / 2,
            y: ty * this.tileSize + this.tileSize / 2
        };
    }

    addEntityAt(x, y, entityId) {
        const key = `${x},${y}`;
        if (!this.entityGrid.has(key)) this.entityGrid.set(key, new Set());
        this.entityGrid.get(key).add(entityId);
    }

    removeEntityAt(x, y, entityId) {
        const key = `${x},${y}`;
        const set = this.entityGrid.get(key);
        if (set) {
            set.delete(entityId);
            if (set.size === 0) this.entityGrid.delete(key);
        }
    }

    getEntitiesAt(x, y) {
        return this.entityGrid.get(`${x},${y}`) || new Set();
    }

    placeBuilding(x, y, building) {
        // Add default HP for village_center
        if (building.type === 'village_center') {
            building.hp = 200;
            building.maxHp = 200;
        }
        // Add default HP and combat stats for watch_tower
        if (building.type === 'watch_tower') {
            building.hp = 100;
            building.maxHp = 100;
            building.range = 8;
            building.damage = 5;
            building.attackCooldown = 0;
        }
        this.buildingGrid.set(`${x},${y}`, building);
    }

    removeBuilding(x, y) {
        this.buildingGrid.delete(`${x},${y}`);
    }

    getBuilding(x, y) {
        return this.buildingGrid.get(`${x},${y}`) || null;
    }

    findNearestWalkable(x, y, maxRadius = 10) {
        if (this.isWalkable(x, y)) return { x, y };
        for (let r = 1; r <= maxRadius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    const nx = x + dx, ny = y + dy;
                    if (this.isWalkable(nx, ny)) return { x: nx, y: ny };
                }
            }
        }
        return null;
    }

    findNearestBuildable(x, y, maxRadius = 12) {
        if (this.isBuildable(x, y)) return { x, y };
        for (let r = 1; r <= maxRadius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    const nx = x + dx, ny = y + dy;
                    if (this.isBuildable(nx, ny)) return { x: nx, y: ny };
                }
            }
        }
        return null;
    }

    findTilesOfType(cx, cy, type, radius = 15) {
        const results = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const tx = cx + dx, ty = cy + dy;
                if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;
                if (this.tiles[ty][tx] === type) {
                    results.push({ x: tx, y: ty, dist: Math.abs(dx) + Math.abs(dy) });
                }
            }
        }
        results.sort((a, b) => a.dist - b.dist);
        return results;
    }

    /** Find tiles of multiple types within radius */
    findTilesOfTypes(cx, cy, types, radius = 15) {
        const typeSet = new Set(types);
        const results = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const tx = cx + dx, ty = cy + dy;
                if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;
                if (typeSet.has(this.tiles[ty][tx]) && this.isWalkable(tx, ty)) {
                    results.push({ x: tx, y: ty, dist: Math.abs(dx) + Math.abs(dy) });
                }
            }
        }
        results.sort((a, b) => a.dist - b.dist);
        return results;
    }

    getWorldBounds() {
        return { x: 0, y: 0, width: this.width * this.tileSize, height: this.height * this.tileSize };
    }
}
