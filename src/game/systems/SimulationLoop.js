/**
 * SimulationLoop — the master tick loop (Ralph Loop pattern).
 * Orchestrates all game systems in deterministic order.
 * Runs independently from render FPS.
 */

export class SimulationLoop {
    /**
     * @param {object} gameState - Shared game state
     */
    constructor(gameState) {
        this.gameState = gameState;
        this.systems = [];
        this.tickCount = 0;
        this.speed = 1; // 0=paused, 1=normal, 2=fast, 5=very fast, 10=ultra
        this.tickAccumulator = 0;
        this.tickInterval = 200; // ms per simulation tick at 1x speed
        this.maxTicksPerFrame = 10; // prevent spiral of death
    }

    /**
     * Register a system. Systems tick in registration order.
     * @param {string} name
     * @param {{ update: (gameState: object, tickCount: number) => void }} system
     */
    addSystem(name, system) {
        this.systems.push({ name, system });
    }

    /**
     * Set simulation speed
     */
    setSpeed(speed) {
        this.speed = Math.max(0, Math.min(10, speed));
    }

    /**
     * Advance simulation by delta milliseconds.
     * Called from Phaser's update loop.
     * @param {number} delta - Milliseconds since last frame
     */
    update(delta) {
        if (this.speed === 0) return;

        this.tickAccumulator += delta * this.speed;

        let ticksThisFrame = 0;
        while (this.tickAccumulator >= this.tickInterval && ticksThisFrame < this.maxTicksPerFrame) {
            this.tickAccumulator -= this.tickInterval;
            this.tick();
            ticksThisFrame++;
        }

        // Prevent accumulator from growing unbounded
        if (this.tickAccumulator > this.tickInterval * this.maxTicksPerFrame) {
            this.tickAccumulator = 0;
        }
    }

    /**
     * Execute one simulation tick — all systems in order
     */
    tick() {
        this.tickCount++;

        for (const { system } of this.systems) {
            system.update(this.gameState, this.tickCount);
        }
    }

    /**
     * Get current tick count
     */
    getTick() {
        return this.tickCount;
    }

    /**
     * Check if simulation is paused
     */
    isPaused() {
        return this.speed === 0;
    }
}
