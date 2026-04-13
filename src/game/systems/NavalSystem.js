/**
 * NavalSystem — manages boats (trade ships and transport ships) moving across the ocean.
 * Boats are separate from entities to avoid expensive A* pathfinding.
 * Trade ships generate wealth; Transport ships execute naval invasions.
 */

import { getRace } from '../data/races.js';

const SHIP_TYPES = {
    trade: { hp: 50, speed: 0.6, color: 0x8B4513 }, // Brown wood
    transport: { hp: 100, speed: 0.5, color: 0x555555 } // Darker warship
};

let nextShipId = 200000;

export class NavalSystem {
    constructor() {
        this.ships = new Map();
    }

    update(gameState, tick) {
        // Run every 5 ticks to process ship movement
        if (tick % 5 !== 0) return;

        const { worldMap, settlementManager, kingdomManager } = gameState;

        // 1. Spawning logic for Ports
        if (tick % 100 === 0) {
            this.spawnShips(gameState);
        }

        // 2. Move existing ships
        const toRemove = [];
        for (const [id, ship] of this.ships) {
            if (ship.hp <= 0) {
                toRemove.push(id);
                continue;
            }

            if (ship.targetX >= 0 && ship.targetY >= 0) {
                const dx = ship.targetX - ship.tileX;
                const dy = ship.targetY - ship.tileY;
                const dist = Math.abs(dx) + Math.abs(dy);

                if (dist <= 1) {
                    // Arrived!
                    this.handleArrival(ship, gameState);
                    toRemove.push(id); // Ship vanishes after completing task for simplicity
                } else {
                    // Move towards target
                    const mx = Math.sign(dx);
                    const my = Math.sign(dy);

                    let nx = ship.tileX + mx;
                    let ny = ship.tileY;
                    let moved = false;

                    // Prefer horizontal movement, then vertical. Only walk on water.
                    if (mx !== 0 && this.isWater(worldMap, nx, ny)) {
                        ship.tileX = nx;
                        moved = true;
                    } else if (my !== 0) {
                        ny = ship.tileY + my;
                        if (this.isWater(worldMap, ship.tileX, ny)) {
                            ship.tileY = ny;
                            moved = true;
                        }
                    }

                    // Simple obstacle avoidance for ships
                    if (!moved) {
                        const randomDirs = [[0,1],[0,-1],[1,0],[-1,0]];
                        const rdir = randomDirs[Math.floor(Math.random()*4)];
                        const rx = ship.tileX + rdir[0];
                        const ry = ship.tileY + rdir[1];
                        if (this.isWater(worldMap, rx, ry)) {
                            ship.tileX = rx;
                            ship.tileY = ry;
                        }
                    }

                    // Update pixel pos
                    const pixel = worldMap.tileToPixel(ship.tileX, ship.tileY);
                    ship.x = pixel.x;
                    ship.y = pixel.y;
                }
            }
        }

        for (const id of toRemove) {
            this.ships.delete(id);
        }
    }

    spawnShips(gameState) {
        const { worldMap, settlementManager, kingdomManager } = gameState;

        // Iterate settlements
        for (const st of settlementManager.getAll()) {
            if (!st.alive) continue;
            const port = st.buildings.find(b => b.type === 'port');
            if (!port) continue;

            const kingdom = kingdomManager.get(st.kingdomId);
            if (!kingdom) continue;

            // Spawn Trade Ship
            if (Math.random() < 0.2) {
                // Find another allied or neutral port
                const targetPort = this.findTradeTarget(st, settlementManager, kingdom);
                if (targetPort) {
                    this.createShip('trade', st, port, targetPort);
                }
            }

            // Spawn Transport Ship (Invasion)
            // If kingdom is at war and has military capacity
            if (kingdom.enemies.size > 0 && Math.random() < 0.1 && st.population > 20) {
                const targetEnemy = this.findEnemyCoast(st, settlementManager, kingdom, worldMap);
                if (targetEnemy) {
                    this.createShip('transport', st, port, targetEnemy);
                }
            }
        }
    }

    findTradeTarget(sourceSt, settlementManager, kingdom) {
        const candidates = [];
        for (const other of settlementManager.getAll()) {
            if (!other.alive || other.id === sourceSt.id) continue;
            if (other.buildings.some(b => b.type === 'port')) {
                // Don't trade with enemies
                const otherKingdom = kingdom.enemies.has(other.kingdomId);
                if (!otherKingdom) {
                    const otherPort = other.buildings.find(b => b.type === 'port');
                    candidates.push(otherPort);
                }
            }
        }
        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        return null;
    }

    findEnemyCoast(sourceSt, settlementManager, kingdom, worldMap) {
        const candidates = [];
        for (const enemyKId of kingdom.enemies) {
            for (const other of settlementManager.getAll()) {
                if (!other.alive || other.kingdomId !== enemyKId) continue;
                // Find a coastal tile in their territory or nearby
                const coast = this.findCoastNear(other, worldMap);
                if (coast) candidates.push(coast);
            }
        }
        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        return null;
    }

    findCoastNear(settlement, worldMap) {
        const r = 10; // search radius around settlement
        for (let i = 0; i < 30; i++) {
            const dx = Math.floor(Math.random() * (2 * r)) - r;
            const dy = Math.floor(Math.random() * (2 * r)) - r;
            const tx = settlement.tileX + dx;
            const ty = settlement.tileY + dy;
            
            // Coast means water adjacent to walkable land
            if (this.isWater(worldMap, tx, ty)) {
                // Check adjacent for land
                const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
                for (const d of dirs) {
                    const nx = tx + d[0];
                    const ny = ty + d[1];
                    if (worldMap.getTileInfo(nx, ny).buildable) {
                        return { x: tx, y: ty };
                    }
                }
            }
        }
        return null;
    }

    createShip(type, settlement, portPos, targetPos) {
        const info = SHIP_TYPES[type];
        const ship = {
            id: nextShipId++,
            type,
            tileX: portPos.x,
            tileY: portPos.y,
            x: portPos.x * (worldMap?.tileSize || 8) + (worldMap?.tileSize || 8) / 2,
            y: portPos.y * (worldMap?.tileSize || 8) + (worldMap?.tileSize || 8) / 2,
            targetX: targetPos.x,
            targetY: targetPos.y,
            settlementId: settlement.id,
            hp: info.hp,
            maxHp: info.hp,
            speed: info.speed,
            color: type === 'trade' ? 0x8DA399 : 0x553333 // distinct colors
        };
        this.ships.set(ship.id, ship);
    }

    handleArrival(ship, gameState) {
        const { settlementManager, entityManager, worldMap } = gameState;
        const sourceSt = settlementManager.get(ship.settlementId);
        
        if (ship.type === 'trade') {
            // Grant gold to source
            if (sourceSt) sourceSt.gold += 20;

            // Find destination settlement
            for (const st of settlementManager.getAll()) {
                if (st.buildings.some(b => b.x === ship.targetX && b.y === ship.targetY)) {
                    st.gold += 20;
                    if (gameState.visualEvents) {
                        gameState.visualEvents.push({ type: 'trade', x: ship.targetX, y: ship.targetY });
                    }
                    break;
                }
            }
        } else if (ship.type === 'transport') {
            if (!sourceSt) return;
            // Spawn 4 fighters to raid the enemy coast
            // Find nearby land
            const dirs = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,-1]];
            let spawned = 0;
            for (const d of dirs) {
                const nx = ship.tileX + d[0];
                const ny = ship.tileY + d[1];
                if (worldMap.getTileInfo(nx, ny).walkable && spawned < 4) {
                    sourceSt.population -= 1; // Take population from home city
                    if (sourceSt.population <= 0) break;
                    
                    const unit = entityManager.create({
                        tileX: nx,
                        tileY: ny,
                        x: nx * (worldMap.tileSize || 8) + (worldMap.tileSize || 8) / 2,
                        y: ny * (worldMap.tileSize || 8) + (worldMap.tileSize || 8) / 2,
                        raceId: sourceSt.raceId,
                        settlementId: sourceSt.id,
                        color: getRace(sourceSt.raceId).color,
                        state: 'idle',
                        hp: 120, // beefy invaders
                        maxHp: 120,
                        attack: 25,
                        traits: ['bloodlust'] // make them attack immediately
                    });
                    worldMap.addEntityAt(nx, ny, unit.id);
                    spawned++;
                }
            }
            if (gameState.visualEvents) {
                gameState.visualEvents.push({ type: 'invasion', x: ship.tileX, y: ship.tileY });
            }
        }
    }

    isWater(worldMap, x, y) {
        const tile = worldMap.getTile(x, y);
        return tile === 'deep_water' || tile === 'shallow_water';
    }

    getAllShips() {
        return Array.from(this.ships.values());
    }

    restoreShips(shipDataList) {
        for (const sd of shipDataList) {
            const ship = {
                id: sd.id,
                type: sd.type,
                x: sd.x,
                y: sd.y,
                tileX: sd.tileX,
                tileY: sd.tileY,
                targetX: -1,
                targetY: -1,
                color: sd.color,
                fromSettlementId: sd.fromSettlementId,
                toSettlementId: sd.toSettlementId,
                hp: SHIP_TYPES[sd.type]?.hp || 50,
                speed: SHIP_TYPES[sd.type]?.speed || 0.5,
                alive: true
            };
            if (sd.id >= nextShipId) nextShipId = sd.id + 1;
            this.ships.set(ship.id, ship);
        }
    }
}
