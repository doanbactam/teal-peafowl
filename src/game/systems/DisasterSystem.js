/**
 * DisasterSystem — handles ALL god power effects:
 * meteor, lightning, fire, tornado, earthquake, plague, flood,
 * heal, bless, curse, black hole (gravity).
 */

export class DisasterSystem {
    constructor() {
        /** @type {Array<object>} Pending disaster events */
        this.queue = [];
        /** @type {Array<object>} Active ongoing effects (tornado, etc.) */
        this.activeEffects = [];
    }

    /**
     * Queue a disaster for processing
     */
    trigger(type, tileX, tileY) {
        this.queue.push({ type, tileX, tileY, tick: 0 });
    }

    update(gameState, tick) {
        const { worldMap, entityManager } = gameState;
        if (!gameState.dirtyTiles) gameState.dirtyTiles = [];
        if (!gameState.visualEvents) gameState.visualEvents = [];

        // Log queued disasters
        for (const disaster of this.queue) {
            if (gameState.historySystem) {
                gameState.historySystem.logEvent(
                    'disaster',
                    `${disaster.type} tại (${disaster.tileX}, ${disaster.tileY})`,
                    { type: disaster.type, x: disaster.tileX, y: disaster.tileY }
                );
            }
        }

        const toRemove = [];

        for (let i = 0; i < this.queue.length; i++) {
            const disaster = this.queue[i];

            switch (disaster.type) {
                case 'meteor':
                    this.processMeteor(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'lightning':
                    this.processLightning(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'fire':
                    this.processFire(disaster, worldMap, gameState);
                    toRemove.push(i);
                    break;
                case 'tornado':
                    this.processTornado(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'earthquake':
                    this.processEarthquake(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'plague':
                    this.processPlague(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'flood':
                    this.processFlood(disaster, worldMap, gameState);
                    toRemove.push(i);
                    break;
                case 'heal':
                    this.processHeal(disaster, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'bless':
                    this.processBless(disaster, gameState);
                    toRemove.push(i);
                    break;
                case 'curse':
                    this.processCurse(disaster, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'gravity':
                    this.processBlackHole(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'madness':
                    this.processMadness(disaster, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'nuclear':
                    this.processNuclear(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'acid_rain':
                    this.processAcidRain(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'tnt':
                    this.processTNT(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'napalm':
                    this.processNapalm(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'antimatter_bomb':
                    this.processAntimatterBomb(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
                case 'grenade':
                    this.processGrenade(disaster, worldMap, entityManager, gameState);
                    toRemove.push(i);
                    break;
            }
        }

        // Remove processed disasters (reverse order to preserve indices)
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.queue.splice(toRemove[i], 1);
        }

        // Process active fires
        if (tick % 5 === 0 && gameState.worldLawsSystem.isEnabled('fire_spread')) {
            this.spreadFire(worldMap, gameState);
        }

        // Process active ongoing effects
        this.updateActiveEffects(gameState, tick);

        // Process plague spread
        if (tick % 8 === 0 && gameState.worldLawsSystem.isEnabled('plague_spread')) {
            this.spreadPlague(worldMap, entityManager, gameState);
        }

        // Process radiation spread
        if (tick % 8 === 0 && gameState.worldLawsSystem.isEnabled('radiation')) {
            this.spreadRadiation(worldMap, entityManager, gameState);
        }
    }

    // ─── METEOR ─────────────────────────────────────────────────
    processMeteor(disaster, worldMap, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 4;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = tileX + dx;
                const y = tileY + dy;

                // Create crater
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 2) {
                    worldMap.setTile(x, y, 'sand');
                } else if (dist < 3) {
                    worldMap.setTile(x, y, 'burned');
                } else {
                    const current = worldMap.getTile(x, y);
                    if (current === 'forest') worldMap.setTile(x, y, 'burned');
                    if (current === 'grass') worldMap.setTile(x, y, 'dirt');
                }

                // Kill entities
                this.killEntitiesAt(x, y, 9999, entityManager, worldMap);

                // Remove buildings
                worldMap.removeBuilding(x, y);

                gameState.dirtyTiles.push({ x, y });
            }
        }

        // Ignite ring of fire around crater
        for (let dy = -radius - 1; dy <= radius + 1; dy++) {
            for (let dx = -radius - 1; dx <= radius + 1; dx++) {
                const d2 = dx * dx + dy * dy;
                if (d2 > (radius + 1) * (radius + 1) || d2 < radius * radius) continue;
                const x = tileX + dx, y = tileY + dy;
                if (worldMap.isFlammable(x, y)) {
                    worldMap.fireTiles.add(`${x},${y}`);
                }
            }
        }

        gameState.visualEvents.push({ type: 'meteor', x: tileX, y: tileY, radius });
    }

    // ─── LIGHTNING ──────────────────────────────────────────────
    processLightning(disaster, worldMap, entityManager, gameState) {
        const { tileX, tileY } = disaster;

        this.killEntitiesAt(tileX, tileY, 50, entityManager, worldMap);

        // Chain lightning to nearby tiles
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (Math.random() < 0.3) {
                    this.killEntitiesAt(tileX + dx, tileY + dy, 25, entityManager, worldMap);
                }
            }
        }

        if (worldMap.isFlammable(tileX, tileY)) {
            worldMap.fireTiles.add(`${tileX},${tileY}`);
        }

        gameState.visualEvents.push({ type: 'lightning', x: tileX, y: tileY });
    }

    // ─── FIRE ───────────────────────────────────────────────────
    processFire(disaster, worldMap, gameState) {
        const { tileX, tileY } = disaster;
        worldMap.fireTiles.add(`${tileX},${tileY}`);
    }

    // ─── TORNADO ────────────────────────────────────────────────
    processTornado(disaster, worldMap, entityManager, gameState) {
        const { tileX, tileY } = disaster;

        // Create an active tornado that moves across the map
        this.activeEffects.push({
            type: 'tornado',
            x: tileX,
            y: tileY,
            dx: (Math.random() - 0.5) * 2 > 0 ? 1 : -1,
            dy: (Math.random() - 0.5) * 2 > 0 ? 1 : -1,
            lifetime: 40,  // ticks
            radius: 3
        });

        gameState.visualEvents.push({ type: 'tornado', x: tileX, y: tileY, radius: 3 });
    }

    // ─── EARTHQUAKE ─────────────────────────────────────────────
    processEarthquake(disaster, worldMap, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 6;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = tileX + dx;
                const y = tileY + dy;

                if (Math.random() < 0.3) {
                    const current = worldMap.getTile(x, y);
                    if (current === 'grass' || current === 'forest') {
                        worldMap.setTile(x, y, 'hill');
                    }
                    worldMap.removeBuilding(x, y);
                }

                // Damage entities
                const entities = worldMap.getEntitiesAt(x, y);
                for (const eid of entities) {
                    const e = entityManager.get(eid);
                    if (e && e.alive && Math.random() < 0.5) {
                        e.hp -= 20;
                        if (e.hp <= 0) {
                            e.alive = false;
                            e.state = 'dead';
                            worldMap.removeEntityAt(x, y, eid);
                        }
                    }
                }

                gameState.dirtyTiles.push({ x, y });
            }
        }

        gameState.visualEvents.push({ type: 'earthquake', x: tileX, y: tileY, radius });
    }

    // ─── PLAGUE ─────────────────────────────────────────────────
    processPlague(disaster, worldMap, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 8;

        // Add plague tiles that will spread
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = tileX + dx, y = tileY + dy;
                if (x >= 0 && x < worldMap.width && y >= 0 && y < worldMap.height) {
                    worldMap.plagueTiles.add(`${x},${y}`);
                }
            }
        }

        // Immediately damage entities in radius
        for (const entity of entityManager.getAllAlive()) {
            const dx = entity.tileX - tileX;
            const dy = entity.tileY - tileY;
            if (dx * dx + dy * dy <= radius * radius) {
                if (!entity.traits) entity.traits = [];
                if (!entity.traits.includes('infected') && !entity.traits.includes('immune')) {
                    entity.traits.push('infected');
                }
                entity.hp -= 30; // initial shock damage
                if (entity.hp <= 0) {
                    entity.alive = false;
                    entity.state = 'dead';
                    worldMap.removeEntityAt(entity.tileX, entity.tileY, entity.id);
                    if (gameState.animalSystem) {
                        gameState.animalSystem.spawn(worldMap, 'zombie', entity.tileX, entity.tileY);
                    }
                }
            }
        }

        gameState.visualEvents.push({ type: 'plague', x: tileX, y: tileY, radius });
    }

    // ─── FLOOD ──────────────────────────────────────────────────
    processFlood(disaster, worldMap, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 5;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = tileX + dx;
                const y = tileY + dy;
                if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;

                const current = worldMap.getTile(x, y);
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Inner tiles become shallow water, outer keep existing
                if (dist < 2) {
                    worldMap.setTile(x, y, 'shallow_water');
                } else if (current === 'grass' || current === 'sand' || current === 'dirt' || current === 'desert') {
                    if (Math.random() < 0.5) {
                        worldMap.setTile(x, y, 'swamp');
                    }
                }

                worldMap.removeBuilding(x, y);
                gameState.dirtyTiles.push({ x, y });
            }
        }

        gameState.visualEvents.push({ type: 'flood', x: tileX, y: tileY, radius });
    }

    // ─── HEAL ───────────────────────────────────────────────────
    processHeal(disaster, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 5;

        for (const entity of entityManager.getAllAlive()) {
            const dx = entity.tileX - tileX;
            const dy = entity.tileY - tileY;
            if (dx * dx + dy * dy <= radius * radius) {
                entity.hp = Math.min(entity.maxHp, entity.hp + 40);
                if (entity.traits && entity.traits.includes('infected')) {
                    const idx = entity.traits.indexOf('infected');
                    entity.traits.splice(idx, 1);
                }
            }
        }

        gameState.visualEvents.push({ type: 'heal', x: tileX, y: tileY, radius });
    }

    // ─── BLESS ──────────────────────────────────────────────────
    processBless(disaster, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 6;
        const { settlementManager } = gameState;

        if (settlementManager) {
            for (const settlement of settlementManager.getAll()) {
                const dx = settlement.tileX - tileX;
                const dy = settlement.tileY - tileY;
                if (dx * dx + dy * dy <= radius * radius) {
                    settlement.food += 50;
                    settlement.wood += 30;
                    settlement.stone += 20;
                    settlement.food = Math.min(settlement.food, 500);
                    settlement.wood = Math.min(settlement.wood, 300);
                    settlement.stone = Math.min(settlement.stone, 200);
                }
            }
        }

        gameState.visualEvents.push({ type: 'bless', x: tileX, y: tileY, radius });
    }

    // ─── CURSE ──────────────────────────────────────────────────
    processCurse(disaster, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 5;

        for (const entity of entityManager.getAllAlive()) {
            const dx = entity.tileX - tileX;
            const dy = entity.tileY - tileY;
            if (dx * dx + dy * dy <= radius * radius) {
                entity.attack = Math.max(1, entity.attack - 3);
                entity.defense = Math.max(0, entity.defense - 3);
                entity.maxHp = Math.max(10, entity.maxHp - 20);
                entity.hp = Math.min(entity.hp, entity.maxHp);
            }
        }

        gameState.visualEvents.push({ type: 'curse', x: tileX, y: tileY, radius });
    }

    // ─── BLACK HOLE ─────────────────────────────────────────────
    processBlackHole(disaster, worldMap, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 7;

        // Create a black hole that destroys everything
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > radius) continue;
                const x = tileX + dx;
                const y = tileY + dy;
                if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;

                if (dist < 3) {
                    // Inner void — deep water
                    worldMap.setTile(x, y, 'deep_water');
                } else if (dist < 5) {
                    // Mid ring — terrain warped
                    worldMap.setTile(x, y, 'sand');
                }

                // Kill everything
                this.killEntitiesAt(x, y, 9999, entityManager, worldMap);
                worldMap.removeBuilding(x, y);
                gameState.dirtyTiles.push({ x, y });
            }
        }

        // Pull entities toward center from wider radius
        for (const entity of entityManager.getAllAlive()) {
            const dx = entity.tileX - tileX;
            const dy = entity.tileY - tileY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 15 && dist > radius) {
                // Pull toward center
                const pullX = entity.tileX - Math.sign(dx) * 2;
                const pullY = entity.tileY - Math.sign(dy) * 2;
                entity.tileX = Math.max(0, Math.min(worldMap.width - 1, pullX));
                entity.tileY = Math.max(0, Math.min(worldMap.height - 1, pullY));
                const pixel = worldMap.tileToPixel(entity.tileX, entity.tileY);
                entity.x = pixel.x;
                entity.y = pixel.y;
            }
        }

        gameState.visualEvents.push({ type: 'blackhole', x: tileX, y: tileY, radius });
    }

    // ─── MADNESS ────────────────────────────────────────────────
    processMadness(disaster, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 5;

        for (const entity of entityManager.getAllAlive()) {
            const dx = entity.tileX - tileX;
            const dy = entity.tileY - tileY;
            if (dx * dx + dy * dy <= radius * radius) {
                // Add bloodlust trait if not present
                if (!entity.traits) entity.traits = [];
                if (!entity.traits.includes('bloodlust')) {
                    entity.traits.push('bloodlust');
                    entity.attack += 5; // stat bump from trait
                    entity.color = 0xff0000; // turn red to show madness
                }
            }
        }

        gameState.visualEvents.push({ type: 'madness', x: tileX, y: tileY, radius });
    }

    // ─── NUCLEAR BOMB ────────────────────────────────────────────
    processNuclear(disaster, worldMap, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 8;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = tileX + dx;
                const y = tileY + dy;
                if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;

                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= 3) {
                    // Inner core — total annihilation
                    worldMap.setTile(x, y, 'lava');
                } else if (dist <= 5) {
                    // Mid ring — scorched earth
                    worldMap.setTile(x, y, 'burned');
                } else {
                    // Outer ring — heavy damage to terrain
                    const current = worldMap.getTile(x, y);
                    if (current === 'forest' || current === 'grass') {
                        worldMap.setTile(x, y, 'burned');
                    } else if (current !== 'lava' && current !== 'deep_water') {
                        worldMap.setTile(x, y, 'dirt');
                    }
                }

                // Kill entities in all zones (inner/mid = instant, outer = heavy damage)
                if (dist <= 5) {
                    this.killEntitiesAt(x, y, 9999, entityManager, worldMap);
                } else {
                    this.killEntitiesAt(x, y, 100, entityManager, worldMap);
                }

                // Remove buildings in mid and inner zones
                if (dist <= 5) {
                    worldMap.removeBuilding(x, y);
                }

                gameState.dirtyTiles.push({ x, y });
            }
        }

        // Ignite ring of fire at the edges (radius 7-9)
        for (let dy = -radius - 1; dy <= radius + 1; dy++) {
            for (let dx = -radius - 1; dx <= radius + 1; dx++) {
                const d2 = dx * dx + dy * dy;
                if (d2 > (radius + 1) * (radius + 1) || d2 < (radius - 1) * (radius - 1)) continue;
                const x = tileX + dx, y = tileY + dy;
                if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;
                if (worldMap.isFlammable(x, y)) {
                    worldMap.fireTiles.add(`${x},${y}`);
                }
            }
        }

        // Create radiation zone (radius 10 — larger than blast)
        const radiationRadius = 10;
        for (let dy = -radiationRadius; dy <= radiationRadius; dy++) {
            for (let dx = -radiationRadius; dx <= radiationRadius; dx++) {
                if (dx * dx + dy * dy > radiationRadius * radiationRadius) continue;
                const x = tileX + dx, y = tileY + dy;
                if (x >= 0 && x < worldMap.width && y >= 0 && y < worldMap.height) {
                    worldMap.radiationTiles.add(`${x},${y}`);
                }
            }
        }

        gameState.visualEvents.push({ type: 'nuclear', x: tileX, y: tileY, radius });
    }

    // ─── ACID RAIN ────────────────────────────────────────────────
    processAcidRain(disaster, worldMap, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 6;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = tileX + dx;
                const y = tileY + dy;
                if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;

                // Kill vegetation
                const tile = worldMap.getTile(x, y);
                if (tile === 'forest') {
                    worldMap.setTile(x, y, 'dirt');
                } else if (tile === 'grass') {
                    worldMap.setTile(x, y, 'sand');
                }

                // Damage entities
                this.killEntitiesAt(x, y, 15, entityManager, worldMap);

                // Damage animals
                if (gameState.animalSystem) {
                    for (const animal of gameState.animalSystem.getAllAlive()) {
                        if (animal.tileX === x && animal.tileY === y) {
                            animal.hp -= 10;
                            if (animal.hp <= 0) animal.alive = false;
                        }
                    }
                }

                gameState.dirtyTiles.push({ x, y });
            }
        }

        gameState.visualEvents.push({ type: 'plague', x: tileX, y: tileY, radius });
    }

    // ─── TNT EXPLOSION ────────────────────────────────────────────
    processTNT(disaster, worldMap, entityManager, gameState) {
        const { tileX, tileY } = disaster;
        const radius = 3;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = tileX + dx;
                const y = tileY + dy;
                if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;

                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1) {
                    worldMap.setTile(x, y, 'sand');
                } else {
                    const current = worldMap.getTile(x, y);
                    if (current === 'forest' || current === 'grass') {
                        worldMap.setTile(x, y, 'burned');
                    }
                }

                this.killEntitiesAt(x, y, 80, entityManager, worldMap);
                worldMap.removeBuilding(x, y);

                // Set fire at edges
                if (dist > 2 && worldMap.isFlammable(x, y)) {
                    worldMap.fireTiles.add(`${x},${y}`);
                }

                gameState.dirtyTiles.push({ x, y });
            }
        }

        gameState.visualEvents.push({ type: 'meteor', x: tileX, y: tileY, radius });
    }

    // ─── RADIATION SPREAD ────────────────────────────────────────
    spreadRadiation(worldMap, entityManager, gameState) {
        if (worldMap.radiationTiles.size === 0) return;

        const newRadiation = new Set();
        const toRemove = [];

        for (const key of worldMap.radiationTiles) {
            const [x, y] = key.split(',').map(Number);

            // Damage entities on radiation tiles
            const entities = worldMap.getEntitiesAt(x, y);
            for (const eid of entities) {
                const e = entityManager.get(eid);
                if (e && e.alive) {
                    e.hp -= 3;
                    if (e.hp <= 0) {
                        e.alive = false;
                        e.state = 'dead';
                        worldMap.removeEntityAt(x, y, eid);
                    }
                }
            }

            // Spread (10% chance)
            if (Math.random() < 0.10) {
                const nx = x + Math.floor(Math.random() * 3) - 1;
                const ny = y + Math.floor(Math.random() * 3) - 1;
                if (nx >= 0 && nx < worldMap.width && ny >= 0 && ny < worldMap.height) {
                    newRadiation.add(`${nx},${ny}`);
                }
            }

            // Decay (5% chance)
            if (Math.random() < 0.05) {
                toRemove.push(key);
            }
        }

        for (const key of toRemove) worldMap.radiationTiles.delete(key);
        for (const key of newRadiation) worldMap.radiationTiles.add(key);
    }

    // ─── ACTIVE EFFECTS (tornado movement, etc.) ────────────────
    updateActiveEffects(gameState, tick) {
        const { worldMap, entityManager } = gameState;
        const toRemove = [];

        for (let i = 0; i < this.activeEffects.length; i++) {
            const effect = this.activeEffects[i];

            if (effect.type === 'tornado') {
                effect.lifetime--;
                if (effect.lifetime <= 0) {
                    toRemove.push(i);
                    continue;
                }

                // Move tornado
                if (tick % 2 === 0) {
                    effect.x += effect.dx;
                    effect.y += effect.dy;

                    // Random direction changes
                    if (Math.random() < 0.2) effect.dx = Math.random() > 0.5 ? 1 : -1;
                    if (Math.random() < 0.2) effect.dy = Math.random() > 0.5 ? 1 : -1;

                    // Bounce off edges
                    if (effect.x <= 2 || effect.x >= worldMap.width - 2) effect.dx *= -1;
                    if (effect.y <= 2 || effect.y >= worldMap.height - 2) effect.dy *= -1;

                    // Tornado damage area
                    const r = effect.radius;
                    for (let dy = -r; dy <= r; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            if (dx * dx + dy * dy > r * r) continue;
                            const x = Math.floor(effect.x + dx);
                            const y = Math.floor(effect.y + dy);

                            // Destroy trees
                            if (worldMap.getTile(x, y) === 'forest') {
                                worldMap.setTile(x, y, 'grass');
                                gameState.dirtyTiles.push({ x, y });
                            }

                            // Destroy buildings
                            if (Math.random() < 0.5) {
                                worldMap.removeBuilding(x, y);
                            }

                            // Damage entities
                            const entities = worldMap.getEntitiesAt(x, y);
                            for (const eid of entities) {
                                const e = entityManager.get(eid);
                                if (e && e.alive) {
                                    e.hp -= 10;
                                    // Fling entity
                                    const flingX = e.tileX + Math.floor(Math.random() * 5) - 2;
                                    const flingY = e.tileY + Math.floor(Math.random() * 5) - 2;
                                    const fx = Math.max(0, Math.min(worldMap.width - 1, flingX));
                                    const fy = Math.max(0, Math.min(worldMap.height - 1, flingY));
                                    if (worldMap.isWalkable(fx, fy)) {
                                        worldMap.removeEntityAt(e.tileX, e.tileY, e.id);
                                        e.tileX = fx;
                                        e.tileY = fy;
                                        const pixel = worldMap.tileToPixel(fx, fy);
                                        e.x = pixel.x;
                                        e.y = pixel.y;
                                        worldMap.addEntityAt(fx, fy, e.id);
                                    }
                                    if (e.hp <= 0) {
                                        e.alive = false;
                                        e.state = 'dead';
                                        worldMap.removeEntityAt(e.tileX, e.tileY, e.id);
                                    }
                                }
                            }
                        }
                    }

                    // Emit tornado visual every tick it moves
                    gameState.visualEvents.push({ type: 'tornado_move', x: Math.floor(effect.x), y: Math.floor(effect.y), radius: r });
                }
            }
        }

        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.activeEffects.splice(toRemove[i], 1);
        }
    }

    // ─── PLAGUE SPREAD ──────────────────────────────────────────
    spreadPlague(worldMap, entityManager, gameState) {
        if (worldMap.plagueTiles.size === 0) return;

        const newPlague = new Set();
        const toRemove = [];

        for (const key of worldMap.plagueTiles) {
            const [x, y] = key.split(',').map(Number);

            // Damage entities on plague tiles
            const entities = worldMap.getEntitiesAt(x, y);
            for (const eid of entities) {
                const e = entityManager.get(eid);
                if (e && e.alive) {
                    if (!e.traits) e.traits = [];
                    if (!e.traits.includes('infected') && !e.traits.includes('immune')) {
                        e.traits.push('infected');
                    }
                    e.hp -= 5;
                    if (e.hp <= 0) {
                        e.alive = false;
                        e.state = 'dead';
                        worldMap.removeEntityAt(x, y, eid);
                        if (gameState.animalSystem) {
                            gameState.animalSystem.spawn(worldMap, 'zombie', x, y);
                        }
                    }
                }
            }

            // Random spread (low chance)
            if (Math.random() < 0.08) {
                const nx = x + Math.floor(Math.random() * 3) - 1;
                const ny = y + Math.floor(Math.random() * 3) - 1;
                if (nx >= 0 && nx < worldMap.width && ny >= 0 && ny < worldMap.height) {
                    newPlague.add(`${nx},${ny}`);
                }
            }

            // Random decay
            if (Math.random() < 0.12) {
                toRemove.push(key);
            }
        }

        for (const key of toRemove) worldMap.plagueTiles.delete(key);
        for (const key of newPlague) worldMap.plagueTiles.add(key);
    }

    // ─── FIRE SPREAD ────────────────────────────────────────────
    spreadFire(worldMap, gameState) {
        const newFires = new Set();
        const extinguished = [];

        for (const key of worldMap.fireTiles) {
            const [x, y] = key.split(',').map(Number);

            const tile = worldMap.getTile(x, y);
            if (tile === 'forest' || tile === 'grass' || tile === 'swamp') {
                worldMap.setTile(x, y, 'burned');
                gameState.dirtyTiles.push({ x, y });

                // Spread to adjacent flammable tiles
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (worldMap.isFlammable(nx, ny) && Math.random() < 0.25) {
                            newFires.add(`${nx},${ny}`);
                        }
                    }
                }
            }

            extinguished.push(key);
        }

        for (const key of extinguished) worldMap.fireTiles.delete(key);
        for (const key of newFires) worldMap.fireTiles.add(key);
    }

    // ─── NAPALM ─────────────────────────────────────────────────
    processNapalm(disaster, worldMap, entityManager, gameState) {
        const cx = disaster.tileX;
        const cy = disaster.tileY;
        const radius = 5;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = cx + dx;
                const y = cy + dy;
                if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;

                const tile = worldMap.getTile(x, y);
                // Burn vegetation
                if (tile === 'grass' || tile === 'forest' || tile === 'swamp') {
                    worldMap.setTile(x, y, 'burned');
                    gameState.dirtyTiles.push({ x, y });
                }
                // Set fire on all tiles in radius
                worldMap.fireTiles.add(`${x},${y}`);

                // Damage entities
                this.killEntitiesAt(x, y, 30, entityManager, worldMap);

                // Damage animals
                if (gameState.animalSystem) {
                    for (const animal of gameState.animalSystem.getAllAlive()) {
                        if (animal.tileX === x && animal.tileY === y) {
                            animal.hp -= 30;
                            if (animal.hp <= 0) animal.alive = false;
                        }
                    }
                }
            }
        }

        gameState.visualEvents.push({ type: 'napalm', x: cx, y: cy, radius });
    }

    // ─── ANTIMATTER BOMB ────────────────────────────────────────
    processAntimatterBomb(disaster, worldMap, entityManager, gameState) {
        const cx = disaster.tileX;
        const cy = disaster.tileY;
        const radius = 10;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = cx + dx;
                const y = cy + dy;
                if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;

                // Erase everything — tile becomes deep_water (void)
                worldMap.setTile(x, y, 'deep_water');
                worldMap.removeBuilding(x, y);
                worldMap.fireTiles.delete(`${x},${y}`);
                worldMap.plagueTiles.delete(`${x},${y}`);
                worldMap.radiationTiles.delete(`${x},${y}`);
                gameState.dirtyTiles.push({ x, y });

                // Kill all entities
                const entities = worldMap.getEntitiesAt(x, y);
                for (const eid of entities) {
                    const e = entityManager.get(eid);
                    if (e && e.alive) {
                        e.alive = false;
                        e.state = 'dead';
                    }
                    worldMap.removeEntityAt(x, y, eid);
                }

                // Kill all animals
                if (gameState.animalSystem) {
                    for (const animal of gameState.animalSystem.getAllAlive()) {
                        if (animal.tileX === x && animal.tileY === y) {
                            animal.alive = false;
                        }
                    }
                }
            }
        }

        gameState.visualEvents.push({ type: 'antimatter', x: cx, y: cy, radius });
    }

    // ─── GRENADE ────────────────────────────────────────────────
    processGrenade(disaster, worldMap, entityManager, gameState) {
        const cx = disaster.tileX;
        const cy = disaster.tileY;
        const radius = 2;

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy > radius * radius) continue;
                const x = cx + dx;
                const y = cy + dy;
                if (x < 0 || x >= worldMap.width || y < 0 || y >= worldMap.height) continue;

                // Damage entities
                this.killEntitiesAt(x, y, 40, entityManager, worldMap);

                // Destroy buildings
                worldMap.removeBuilding(x, y);

                // Random fire at edges
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist >= radius && Math.random() < 0.4) {
                    worldMap.fireTiles.add(`${x},${y}`);
                }

                // Damage animals
                if (gameState.animalSystem) {
                    for (const animal of gameState.animalSystem.getAllAlive()) {
                        if (animal.tileX === x && animal.tileY === y) {
                            animal.hp -= 40;
                            if (animal.hp <= 0) animal.alive = false;
                        }
                    }
                }

                gameState.dirtyTiles.push({ x, y });
            }
        }

        gameState.visualEvents.push({ type: 'grenade', x: cx, y: cy, radius });
    }

    // ─── HELPERS ────────────────────────────────────────────────
    killEntitiesAt(x, y, damage, entityManager, worldMap) {
        const entities = worldMap.getEntitiesAt(x, y);
        for (const eid of entities) {
            const e = entityManager.get(eid);
            if (e && e.alive) {
                e.hp -= damage;
                if (e.hp <= 0) {
                    e.alive = false;
                    e.state = 'dead';
                    worldMap.removeEntityAt(x, y, eid);
                }
            }
        }
    }
}
