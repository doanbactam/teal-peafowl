/**
 * MovementSystem — handles pathfinding requests and smooth unit movement.
 */
import { findPath } from './Pathfinding.js';

export class MovementSystem {
    update(gameState, tick) {
        const { entityManager, worldMap, settlementManager } = gameState;

        for (const entity of entityManager.getAllAlive()) {
            if (entity.state === 'dead') continue;

            const settlement = settlementManager ? settlementManager.get(entity.settlementId) : null;
            if (settlement && settlement.buildings && settlement.buildings.some(b => b.type === 'port')) {
                entity.canBoat = true;
            } else {
                entity.canBoat = false;
            }

            // If entity has a target tile and no path, find one
            if (entity.targetX >= 0 && entity.targetY >= 0 && !entity.path) {
                entity.path = findPath(worldMap, entity.tileX, entity.tileY, entity.targetX, entity.targetY, entity);
                entity.pathIndex = 0;
                if (!entity.path || entity.path.length === 0) {
                    entity.targetX = -1;
                    entity.targetY = -1;
                    entity.path = null;
                }
            }

            // Follow path
            if (entity.path && entity.pathIndex < entity.path.length) {
                // Initialize/decrement move timer
                if (entity.moveTimer === undefined) entity.moveTimer = 0;
                
                if (entity.moveTimer > 0) {
                    entity.moveTimer--;
                    continue; // Skip moving this tick
                }

                const next = entity.path[entity.pathIndex];

                // Calculate next move cooldown based on terrain and entity speed
                const currentTile = worldMap.getTile(entity.tileX, entity.tileY);

                // Road speed bonus (roads are tracked by RoadSystem, not as terrain)
                const roadSystem = gameState.roadSystem;
                const onRoad = roadSystem && roadSystem.isRoad(entity.tileX, entity.tileY);
                let terrainPenalty = 1;

                if (onRoad) terrainPenalty = 0.67; // 1.5x speed on roads
                // Age of Ice impacts
                else if (currentTile === 'snow') terrainPenalty = 2; // Slower on snow
                else if (currentTile === 'ice') terrainPenalty = 3; // Very slow on ice
                else if (currentTile === 'deep_water') terrainPenalty = 4; // Swimming is hard
                else if (currentTile === 'shallow_water') terrainPenalty = 2;
                else if (currentTile === 'forest') terrainPenalty = 1.5;

                // Set timer: base delay 2 ticks * penalty / speed
                entity.moveTimer = Math.floor((2 * terrainPenalty) / Math.max(0.1, entity.speed));

                // Update spatial index
                worldMap.removeEntityAt(entity.tileX, entity.tileY, entity.id);
                entity.tileX = next.x;
                entity.tileY = next.y;
                worldMap.addEntityAt(entity.tileX, entity.tileY, entity.id);

                // Update boat rendering flag if on water
                const tTile = worldMap.getTile(entity.tileX, entity.tileY);
                entity.isBoat = entity.canBoat && (tTile === 'shallow_water' || tTile === 'deep_water');

                // Update pixel position
                const pixel = worldMap.tileToPixel(next.x, next.y);
                entity.x = pixel.x;
                entity.y = pixel.y;

                entity.pathIndex++;

                // Reached end of path
                if (entity.pathIndex >= entity.path.length) {
                    entity.path = null;
                    entity.targetX = -1;
                    entity.targetY = -1;

                    if (entity.state === 'moving') {
                        entity.state = 'idle';
                    }
                }
            }
        }
    }
}

/**
 * Set a movement target for an entity
 */
export function moveEntityTo(entity, tx, ty) {
    entity.targetX = tx;
    entity.targetY = ty;
    entity.path = null;
    entity.pathIndex = 0;
    entity.state = 'moving';
}
