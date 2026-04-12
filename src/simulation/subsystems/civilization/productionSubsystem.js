/**
 * ProductionSubsystem — owns production chain logic and trade routes.
 *
 * Production chain: mine → iron → smithy → goods → market → gold
 * Trade routes: peace factions with markets → mutual gold income.
 */
export class ProductionSubsystem {
  constructor(game, state, selectors) {
    this.game = game;
    this.state = state;
    this.selectors = selectors;
    this.tradeTimer = 0;
    this.tradeInterval = 60; // seconds between auto-trade evaluations
  }

  update(dt) {
    this.tradeTimer += dt;

    // Evaluate trade routes periodically
    if (this.tradeTimer >= this.tradeInterval) {
      this.tradeTimer = 0;
      this.evaluateTradeRoutes();
    }

    // Apply passive trade route income
    this.applyTradeRouteIncome(dt);
  }

  /**
   * Evaluate which factions can trade — both need a market and be at peace.
   */
  evaluateTradeRoutes() {
    const routes = [];
    const godManager = this.game.godManager;
    if (!godManager || !godManager.initialized) {
      this.state.economy.tradeRoutes = routes;
      return;
    }

    const factions = godManager.gods.map((g) => g.faction);

    for (let i = 0; i < factions.length; i++) {
      for (let j = i + 1; j < factions.length; j++) {
        const a = factions[i];
        const b = factions[j];

        // Must be at peace
        if (godManager.isAtWar(a, b)) continue;

        // Both need at least one market
        const aMarkets = this.countBuildings(a, 'market');
        const bMarkets = this.countBuildings(b, 'market');
        if (aMarkets === 0 || bMarkets === 0) continue;

        // Gold per tick based on market count
        const goldPerTick = Math.min(aMarkets, bMarkets) * 0.05;
        routes.push({ factionA: a, factionB: b, goldPerTick });
      }
    }

    this.state.economy.tradeRoutes = routes;
  }

  /**
   * Apply passive gold income from active trade routes.
   */
  applyTradeRouteIncome(dt) {
    const routes = this.state.economy.tradeRoutes;
    if (!routes || routes.length === 0) return;

    for (const route of routes) {
      const gain = route.goldPerTick * dt;

      // Player faction gets direct gold
      if (route.factionA === 0 || route.factionB === 0) {
        this.game.resources.gold += gain;
      }

      // AI factions get faith equivalent (they use faith as currency)
      const godManager = this.game.godManager;
      if (godManager) {
        if (route.factionA !== 0) {
          const god = godManager.getGodByFaction(route.factionA);
          if (god) god.addFaith(gain * 2);
        }
        if (route.factionB !== 0) {
          const god = godManager.getGodByFaction(route.factionB);
          if (god) god.addFaith(gain * 2);
        }
      }
    }
  }

  /**
   * Get production metrics for selectors.
   */
  getProductionMetrics(faction = 0) {
    const smithies = this.countBuildings(faction, 'smithy');
    const markets = this.countBuildings(faction, 'market');
    const mines = this.countBuildings(faction, 'mine');

    // Estimate income per cycle
    const ironIncome = mines * 0.8;   // approximate per production cycle
    const goodsIncome = smithies * 2;  // per production cycle
    const tradeGold = this.getTradeGoldIncome(faction);

    return {
      smithies,
      markets,
      mines,
      ironIncome,
      goodsIncome,
      tradeGold,
      activeTradeRoutes: (this.state.economy.tradeRoutes || []).filter(
        (r) => r.factionA === faction || r.factionB === faction,
      ).length,
    };
  }

  getTradeGoldIncome(faction) {
    const routes = this.state.economy.tradeRoutes || [];
    let total = 0;
    for (const r of routes) {
      if (r.factionA === faction || r.factionB === faction) {
        total += r.goldPerTick;
      }
    }
    return total;
  }

  countBuildings(faction, type) {
    let count = 0;
    for (const b of this.game.buildingManager.buildings.values()) {
      if (b.faction === faction && b.type === type) count++;
    }
    return count;
  }

  handleCommand(command) {
    return false;
  }
}
