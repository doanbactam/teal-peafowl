/**
 * NatureSystem — handles forest regrowth, burned land recovery,
 * seasonal changes, and natural terrain evolution.
 */

export class NatureSystem {
    update(gameState, tick) {
        const { worldMap } = gameState;

        // Stagger different nature processes across ticks
        if (tick % 30 === 0) {
            this.forestRegrowth(worldMap, gameState);
        }

        if (tick % 60 === 0) {
            this.burnedLandRecovery(worldMap, gameState);
        }

        if (tick % 100 === 0) {
            this.naturalDesertification(worldMap, gameState);
        }
    }

    /**
     * Forest regrowth: grass tiles adjacent to forest can become forest.
     */
    forestRegrowth(worldMap, gameState) {
        if (!gameState.worldLawsSystem.isEnabled('regrowth')) return;

        const growthCandidates = [];
        const checkCount = 300;

        for (let i = 0; i < checkCount; i++) {
            const x = Math.floor(Math.random() * worldMap.width);
            const y = Math.floor(Math.random() * worldMap.height);
            const tile = worldMap.getTile(x, y);

            if (tile === 'grass') {
                let adjacentForest = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (worldMap.getTile(x + dx, y + dy) === 'forest') {
                            adjacentForest++;
                        }
                    }
                }

                // More adjacent forest = higher chance
                const chance = adjacentForest >= 3 ? 0.2 : adjacentForest >= 2 ? 0.1 : 0;
                if (chance > 0 && Math.random() < chance) {
                    // Don't grow on buildings
                    if (!worldMap.buildingGrid.has(`${x},${y}`)) {
                        growthCandidates.push({ x, y });
                    }
                }
            }
        }

        for (const pos of growthCandidates) {
            worldMap.setTile(pos.x, pos.y, 'forest');
        }

        if (growthCandidates.length > 0) {
            if (!gameState.dirtyTiles) gameState.dirtyTiles = [];
            gameState.dirtyTiles.push(...growthCandidates);
        }
    }

    /**
     * Burned land recovery: burned tiles slowly return to dirt, then grass.
     */
    burnedLandRecovery(worldMap, gameState) {
        if (!gameState.worldLawsSystem.isEnabled('regrowth')) return;

        const recoverCandidates = [];
        const checkCount = 200;

        for (let i = 0; i < checkCount; i++) {
            const x = Math.floor(Math.random() * worldMap.width);
            const y = Math.floor(Math.random() * worldMap.height);
            const tile = worldMap.getTile(x, y);

            if (tile === 'burned') {
                // Check neighbors for fertility
                let greenNeighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nt = worldMap.getTile(x + dx, y + dy);
                        if (nt === 'grass' || nt === 'forest' || nt === 'swamp') {
                            greenNeighbors++;
                        }
                    }
                }

                const chance = greenNeighbors >= 2 ? 0.15 : 0.04;
                if (Math.random() < chance) {
                    recoverCandidates.push({ x, y, target: greenNeighbors >= 3 ? 'grass' : 'dirt' });
                }
            } else if (tile === 'dirt') {
                // Dirt can become grass near grass
                let grassNeighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (worldMap.getTile(x + dx, y + dy) === 'grass') {
                            grassNeighbors++;
                        }
                    }
                }
                
                let regrowthChance = 0.1;
                if (gameState.currentAgeId === 'hope') regrowthChance = 0.3; // Mọc rất nhanh vào kỷ nguyên Hope
                if (gameState.currentAgeId === 'ice') regrowthChance = 0.01; // Gần như không mọc mùa đông
                if (gameState.currentAgeId === 'sun') regrowthChance = 0.05; // Khô hạn khó mọc

                if (grassNeighbors >= 2 && Math.random() < regrowthChance) {
                    recoverCandidates.push({ x, y, target: 'grass' });
                }
            } // <-- Missing closing brace for else if
        }

        for (const pos of recoverCandidates) {
            worldMap.setTile(pos.x, pos.y, pos.target);
        }

        if (recoverCandidates.length > 0) {
            if (!gameState.dirtyTiles) gameState.dirtyTiles = [];
            gameState.dirtyTiles.push(...recoverCandidates);
        }
    }

    /**
     * Natural desertification: desert can slowly spread to adjacent grass if no water nearby.
     */
    naturalDesertification(worldMap, gameState) {
        const desertCandidates = [];
        const checkCount = 100;

        for (let i = 0; i < checkCount; i++) {
            const x = Math.floor(Math.random() * worldMap.width);
            const y = Math.floor(Math.random() * worldMap.height);
            const tile = worldMap.getTile(x, y);

            if (tile === 'desert') {
                // Check if adjacent grass exists
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx, ny = y + dy;
                        if (worldMap.getTile(nx, ny) === 'grass') {
                            // Only desertify if no water nearby
                            let hasWater = false;
                            for (let wy = -2; wy <= 2; wy++) {
                                for (let wx = -2; wx <= 2; wx++) {
                                    const wt = worldMap.getTile(nx + wx, ny + wy);
                                    if (wt === 'shallow_water' || wt === 'deep_water' || wt === 'swamp') {
                                        hasWater = true;
                                        break;
                                    }
                                }
                                if (hasWater) break;
                            }
                            if (!hasWater && Math.random() < 0.03) {
                                desertCandidates.push({ x: nx, y: ny });
                            }
                        }
                    }
                }
            }
        }

        for (const pos of desertCandidates) {
            worldMap.setTile(pos.x, pos.y, 'desert');
        }

        if (desertCandidates.length > 0) {
            if (!gameState.dirtyTiles) gameState.dirtyTiles = [];
            gameState.dirtyTiles.push(...desertCandidates);
        }
    }
}
