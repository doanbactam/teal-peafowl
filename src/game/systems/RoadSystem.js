/**
 * RoadSystem — auto-builds roads between settlements within the same kingdom.
 * Roads provide a movement speed bonus for units traveling on them.
 */
export class RoadSystem {
    constructor() {
        /** @type {Map<string, { tiles: {x:number,y:number}[], kingdomId: number }>} */
        this.roads = new Map();
        /** @type {Set<string>} flat lookup for "x,y" tiles that are road */
        this.roadTileSet = new Set();
    }

    update(gameState, tick) {
        // Every 200 ticks, try to build new roads
        if (tick % 200 !== 0) return;

        const { settlementManager, kingdomManager, worldMap } = gameState;

        for (const kingdom of kingdomManager.getAll()) {
            const settlements = settlementManager.getAll().filter(s => s.kingdomId === kingdom.id);
            if (settlements.length < 2) continue;

            // Connect each pair of settlements that are close enough (within 40 tiles manhattan)
            for (let i = 0; i < settlements.length; i++) {
                for (let j = i + 1; j < settlements.length; j++) {
                    const a = settlements[i];
                    const b = settlements[j];
                    const dist = Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY);
                    if (dist > 40) continue;

                    const roadKey = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
                    if (this.roads.has(roadKey)) continue;

                    this.buildRoad(worldMap, a.tileX, a.tileY, b.tileX, b.tileY, kingdom.id, roadKey);
                }
            }
        }
    }

    buildRoad(worldMap, sx, sy, tx, ty, kingdomId, roadKey) {
        const roadTiles = [];
        let x = sx, y = sy;
        const maxSteps = 200;
        let steps = 0;

        // Skip the starting tile (settlement center)
        while ((x !== tx || y !== ty) && steps < maxSteps) {
            steps++;

            // Move toward target — prefer the axis with more distance remaining
            const dx = Math.sign(tx - x);
            const dy = Math.sign(ty - y);

            if (Math.abs(tx - x) > Math.abs(ty - y)) {
                x += dx;
            } else if (Math.abs(ty - y) > Math.abs(tx - x)) {
                y += dy;
            } else {
                // Equal distance — alternate or pick randomly to avoid straight boring roads
                if (Math.random() < 0.5) {
                    x += dx;
                } else {
                    y += dy;
                }
            }

            // Don't build on water, mountains, or lava
            const tile = worldMap.getTile(x, y);
            if (tile === 'deep_water' || tile === 'shallow_water' ||
                tile === 'mountain' || tile === 'snow_mountain' || tile === 'lava') {
                continue;
            }

            roadTiles.push({ x, y });
        }

        if (roadTiles.length > 0) {
            this.roads.set(roadKey, { tiles: roadTiles, kingdomId });
            // Update flat lookup set
            for (const t of roadTiles) {
                this.roadTileSet.add(`${t.x},${t.y}`);
            }
        }
    }

    getAllRoads() {
        return Array.from(this.roads.values());
    }

    getState() {
        const serialized = [];
        for (const [key, road] of this.roads) {
            serialized.push({ key, tiles: road.tiles, kingdomId: road.kingdomId });
        }
        return serialized;
    }

    restoreState(data) {
        if (!data) return;
        for (const rd of data) {
            this.roads.set(rd.key, { tiles: rd.tiles, kingdomId: rd.kingdomId });
            for (const t of rd.tiles) {
                this.roadTileSet.add(`${t.x},${t.y}`);
            }
        }
    }

    isRoad(x, y) {
        return this.roadTileSet.has(`${x},${y}`);
    }
}
