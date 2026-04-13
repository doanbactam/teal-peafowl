export class FaithSystem {
    constructor() {
        this.globalFaith = 500; // Start with some faith
        this.maxFaith = 2000;
        this.selectedDomain = 'neutral';
        
        // Faith cost for different tool categories or specific tools
        this.toolCosts = {
            disasters: 50,
            magic: 20,
            life: 50,
            animals: 10,
            terrain: 2,
            inspect: 0,
            other: 0,
            // Specific overrides
            'heal': 15,
            'bless': 30,
            'plague': 100,
            'meteor': 300,
            'tornado': 150,
            'nuclear': 500,
            'antimatter_bomb': 1000,
            'spawn_human': 30,
            'spawn_elf': 30,
            'spawn_orc': 30,
            'spawn_dwarf': 30,
            'spawn_demon': 100,
            'spawn_undead': 50,
            'madness': 50,
            'curse': 50
        };
    }

    update(gameState, tick) {
        // Run every 60 ticks to aggregate faith slowly
        if (tick % 60 !== 0) return;

        const { settlementManager } = gameState;
        
        let faithGain = 0;

        for (const settlement of settlementManager.getAll()) {
            if (!settlement.alive) continue;
            
            // Base gain from population
            let gain = settlement.population * 0.05;

            // Bonus from temples
            const temples = settlement.buildings ? settlement.buildings.filter(b => b.type === 'temple').length : 0;
            gain += temples * 2;
            
            // Bonus from statues
            const statues = settlement.buildings ? settlement.buildings.filter(b => b.type === 'statue').length : 0;
            gain += statues * 0.5;

            // Modifier from social stability from SocialSystem
            if (settlement.socialStability !== undefined) {
                if (settlement.socialStability > 75) gain *= 1.5;      // Zealous
                else if (settlement.socialStability > 50) gain *= 1.1; // Stable
                else if (settlement.socialStability < 25) gain *= 0.2; // Crisis
                else if (settlement.socialStability < 40) gain *= 0.7; // Unrest
            }

            // Modifier from loyalty (rebellious settlements give no faith)
            if (settlement.loyalty !== undefined && settlement.loyalty <= 0) {
                gain = 0; 
            }

            faithGain += gain;
        }

        // Add to global faith
        this.globalFaith = Math.min(this.maxFaith, this.globalFaith + faithGain);
    }

    getToolCost(tool) {
        if (!tool) return 0;
        let cost = this.toolCosts[tool.id];
        if (cost === undefined) cost = this.toolCosts[tool.category] || 0;
        return cost;
    }

    canAffordTool(tool) {
        const cost = this.getToolCost(tool);
        return this.globalFaith >= cost;
    }

    spendForTool(tool, tilePos, gameState) {
        if (!tool) return;

        const cost = this.getToolCost(tool);

        if (cost > 0) {
            this.globalFaith = Math.max(0, this.globalFaith - cost);
            
            // Domain interaction - destructive tools lower stability/happiness
            if (tool.category === 'disasters' || tool.id === 'madness' || tool.id === 'curse') {
                this._applyDivineFear(tool, tilePos, gameState);
            } else if (tool.id === 'heal' || tool.id === 'bless') {
                this._applyDivineZeal(tool, tilePos, gameState);
            }
        }
    }

    _applyDivineFear(tool, tilePos, gameState) {
        const { settlementManager, entityManager } = gameState;
        // Find settlements near the disaster
        for (const settlement of settlementManager.getAll()) {
            if (!settlement.alive) continue;
            
            const dx = settlement.tileX - tilePos.x;
            const dy = settlement.tileY - tilePos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 40) {
                // Apply a hit to social stability based on proximity
                const impact = Math.max(1, Math.floor(10 - (dist / 4)));
                if (settlement.socialStability !== undefined) {
                    settlement.socialStability = Math.max(0, settlement.socialStability - impact * 2);
                }
                
                // Panic the units temporarily
                const units = entityManager.getBySettlement(settlement.id);
                for (const unit of units) {
                    if (Math.random() < 0.3) {
                        unit.happiness = Math.max(-100, (unit.happiness || 50) - impact * 3);
                        if (tool.id === 'meteor' || tool.id === 'nuclear') {
                            // Run in panic
                            unit.state = 'idle';
                            gameState.historySystem?.logEvent(
                                'divine_fear',
                                `Người dân ${settlement.name} hoảng loạn vì cơn thịnh nộ của thần linh!`,
                                { settlementId: settlement.id }
                            );
                        }
                    }
                }
            }
        }
    }
    
    _applyDivineZeal(tool, tilePos, gameState) {
        const { settlementManager, entityManager } = gameState;
        // Find settlements near the blessing
        for (const settlement of settlementManager.getAll()) {
            if (!settlement.alive) continue;
            
            const dx = settlement.tileX - tilePos.x;
            const dy = settlement.tileY - tilePos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 30) {
                // Apply a boost to social stability
                const impact = Math.max(1, Math.floor(5 - (dist / 6)));
                if (settlement.socialStability !== undefined) {
                    settlement.socialStability = Math.min(100, settlement.socialStability + impact * 2);
                }
                
                // Bless the units temporarily
                const units = entityManager.getBySettlement(settlement.id);
                for (const unit of units) {
                    if (Math.random() < 0.4) {
                        unit.happiness = Math.min(100, (unit.happiness || 50) + impact * 3);
                    }
                }
            }
        }
    }

    getSaveData() {
        return {
            globalFaith: this.globalFaith,
            selectedDomain: this.selectedDomain
        };
    }

    restoreSaveData(data) {
        if (data) {
            this.globalFaith = data.globalFaith !== undefined ? data.globalFaith : 500;
            this.selectedDomain = data.selectedDomain || 'neutral';
        }
    }
}
