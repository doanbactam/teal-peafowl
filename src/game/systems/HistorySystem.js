/**
 * HistorySystem — world event log, tracks notable events across the simulation.
 * Inspired by SuperWorldBox's world history panel.
 */

export const HISTORY_EVENTS = {
    KINGDOM_FOUNDED: 'kingdom_founded',
    SETTLEMENT_FOUNDED: 'settlement_founded',
    SETTLEMENT_DESTROYED: 'settlement_destroyed',
    WAR_DECLARED: 'war_declared',
    PEACE_MADE: 'peace_made',
    BATTLE: 'battle',
    LEADER_DIED: 'leader_died',
    ERA_CHANGED: 'era_changed',
    DISASTER: 'disaster',
    MIGRATION: 'migration',
    BUILDING_BUILT: 'building_built',
    COLONY_FOUNDED: 'colony_founded',
    AGE_CHANGED: 'age_changed',
    RACE_EXTINCT: 'race_extinct'
};

const MAX_EVENTS = 500;

export class HistorySystem {
    constructor() {
        /** @type {Array<{year:number, tick:number, type:string, description:string, data:object}>} */
        this.events = [];
    }

    update(gameState, tick) {
        // HistorySystem is mainly an API for other systems to call logEvent().
        // We store a reference to tick for auto-timestamping.
        this._tick = tick;
    }

    logEvent(type, description, data = {}) {
        this.events.push({
            year: data.year || 0,
            tick: data.tick || this._tick || 0,
            type,
            description,
            timestamp: Date.now(),
            data
        });

        if (this.events.length > MAX_EVENTS) {
            this.events = this.events.slice(-MAX_EVENTS);
        }
    }

    getRecent(count = 20) {
        return this.events.slice(-count);
    }

    getByType(type) {
        return this.events.filter(e => e.type === type);
    }

    getByYear(year) {
        return this.events.filter(e => e.year === year);
    }

    getStats() {
        const stats = {
            totalWars: 0,
            totalBattles: 0,
            totalDeaths: 0,
            totalSettlements: 0,
            totalDisasters: 0,
            kingdomsFounded: 0,
            kingdomsDestroyed: 0
        };
        for (const e of this.events) {
            switch (e.type) {
                case HISTORY_EVENTS.WAR_DECLARED: stats.totalWars++; break;
                case HISTORY_EVENTS.BATTLE: stats.totalBattles++; break;
                case HISTORY_EVENTS.LEADER_DIED: stats.totalDeaths++; break;
                case HISTORY_EVENTS.SETTLEMENT_FOUNDED: stats.totalSettlements++; break;
                case HISTORY_EVENTS.SETTLEMENT_DESTROYED: stats.kingdomsDestroyed++; break;
                case HISTORY_EVENTS.KINGDOM_FOUNDED: stats.kingdomsFounded++; break;
                case HISTORY_EVENTS.DISASTER: stats.totalDisasters++; break;
            }
        }
        return stats;
    }

    getSaveData() {
        return { events: this.events.slice(-200) };
    }

    restoreSaveData(data) {
        if (data && Array.isArray(data.events)) {
            this.events = data.events;
        }
    }
}
