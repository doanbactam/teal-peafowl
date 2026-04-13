/**
 * AgeSystem — Manages global world eras (Ages) inspired by WorldBox.
 * Ages change periodically and affect global lighting, temperature, and spawn rates.
 */
export const AGES = {
    HOPE: {
        id: 'hope',
        name: 'Kỷ Nguyên Hy Vọng',
        description: 'Thời kỳ hòa bình và phát triển. Dân số tăng trưởng mạnh mẽ.',
        colorTint: 0xffffff,
        ambientLight: 1.0,
        tempModifier: 0,
        duration: 3600
    },
    SUN: {
        id: 'sun',
        name: 'Kỷ Nguyên Mặt Trời',
        description: 'Thời kỳ nắng nóng. Nguy cơ cháy rừng cao, nước bốc hơi.',
        colorTint: 0xffdd88,
        ambientLight: 1.1,
        tempModifier: 1,
        duration: 2400
    },
    TEARS: {
        id: 'tears',
        name: 'Kỷ Nguyên Nước Mắt',
        description: 'Mưa liên tục, lũ lụt, nhưng mùa màng tốt.',
        colorTint: 0x6688aa,
        ambientLight: 0.85,
        tempModifier: 0,
        duration: 2400
    },
    DARK: {
        id: 'dark',
        name: 'Kỷ Nguyên Bóng Tối',
        description: 'Bóng tối bao trùm. Quái vật sinh sôi, lòng dân suy giảm.',
        colorTint: 0x555588,
        ambientLight: 0.6,
        tempModifier: -1,
        duration: 2400
    },
    CHAOS: {
        id: 'chaos',
        name: 'Kỷ Nguyên Hỗn Loạn',
        description: 'Chiến tranh nổ ra mọi nơi, quỷ dữ xuất hiện.',
        colorTint: 0x883333,
        ambientLight: 0.7,
        tempModifier: 1,
        duration: 2000
    },
    ICE: {
        id: 'ice',
        name: 'Kỷ Nguyên Băng Giá',
        description: 'Nước đóng băng, tuyết phủ trắng mặt đất.',
        colorTint: 0xddeeff,
        ambientLight: 0.8,
        tempModifier: -2,
        duration: 3000
    },
    ASH: {
        id: 'ash',
        name: 'Kỷ Nguyên Tro Bụi',
        description: 'Tro bụi từ núi lửa che khuất mặt trời, cây cối chết dần.',
        colorTint: 0x888877,
        ambientLight: 0.7,
        tempModifier: 0,
        duration: 2400
    },
    DESPAIR: {
        id: 'despair',
        name: 'Kỷ Nguyên Tuyệt Vọng',
        description: 'Lạnh lẽo và buồn bã. Cây cối không mọc được.',
        colorTint: 0x445566,
        ambientLight: 0.55,
        tempModifier: -2,
        duration: 2600
    },
    MOON: {
        id: 'moon',
        name: 'Kỷ Nguyên Mặt Trăng',
        description: 'Ánh trăng bí ẩn. Sinh vật ban đêm mạnh mẽ.',
        colorTint: 0xaaaadd,
        ambientLight: 0.75,
        tempModifier: -1,
        duration: 2200
    },
    WONDERS: {
        id: 'wonders',
        name: 'Kỷ Nguyên Kỳ Diệu',
        description: 'Thời kỳ phép thuật. Sinh vật mạnh mẽ, xây dựng nhanh.',
        colorTint: 0xddaaff,
        ambientLight: 1.05,
        tempModifier: 0,
        duration: 2000
    }
};

const AGE_ORDER = ['HOPE', 'SUN', 'TEARS', 'HOPE', 'DARK', 'CHAOS', 'ICE', 'ASH', 'DESPAIR', 'MOON', 'WONDERS', 'HOPE'];

export class AgeSystem {
    constructor() {
        this.currentAgeIndex = 0;
        this.currentAgeId = AGE_ORDER[0];
        this.ticksInCurrentAge = 0;
    }

    getCurrentAge() {
        return AGES[this.currentAgeId];
    }

    update(gameState, tick) {
        this.ticksInCurrentAge++;
        const currentAgeDef = this.getCurrentAge();
        // Store lowercase id so ResourceSystem/NatureSystem can match
        gameState.currentAgeId = currentAgeDef.id;

        if (this.ticksInCurrentAge >= currentAgeDef.duration) {
            this.transitionNextAge(gameState);
        }

        // Apply global effects based on age every 100 ticks
        if (tick % 100 === 0) {
            this.applyAgeEffects(gameState);
        }
    }

    transitionNextAge(gameState) {
        this.currentAgeIndex = (this.currentAgeIndex + 1) % AGE_ORDER.length;
        this.currentAgeId = AGE_ORDER[this.currentAgeIndex];
        this.ticksInCurrentAge = 0;

        const newAge = this.getCurrentAge();
        gameState.visualEvents.push({
            type: 'age_change',
            ageId: newAge.id,
            name: newAge.name,
            message: newAge.description
        });
    }

    applyAgeEffects(gameState) {
        const age = this.getCurrentAge();
        const { worldMap } = gameState;

        if (age.id === 'ice') {
            this.randomTileEffect(worldMap, gameState, ['grass', 'forest'], 'snow', 10);
            this.randomTileEffect(worldMap, gameState, ['shallow_water'], 'ice', 5);
        } else if (age.id === 'sun') {
            this.randomTileEffect(worldMap, gameState, ['snow'], 'grass', 15);
            this.randomTileEffect(worldMap, gameState, ['shallow_water'], 'sand', 2);
        } else if (age.id === 'hope') {
            this.randomTileEffect(worldMap, gameState, ['ice'], 'shallow_water', 20);
            this.randomTileEffect(worldMap, gameState, ['snow'], 'grass', 20);
        } else if (age.id === 'tears') {
            // Rain: convert sand to grass, create shallow water from dirt
            this.randomTileEffect(worldMap, gameState, ['sand'], 'grass', 5);
            this.randomTileEffect(worldMap, gameState, ['dirt'], 'shallow_water', 3);
        } else if (age.id === 'chaos') {
            // Random fires and lava
            this.randomTileEffect(worldMap, gameState, ['grass', 'forest'], 'burned', 5);
            this.randomTileEffect(worldMap, gameState, ['grass'], 'lava', 1);
        } else if (age.id === 'ash') {
            // Ash covers everything
            this.randomTileEffect(worldMap, gameState, ['grass', 'forest'], 'dirt', 8);
            this.randomTileEffect(worldMap, gameState, ['snow'], 'dirt', 5);
        } else if (age.id === 'despair') {
            // Even harsher than ice — kill vegetation
            this.randomTileEffect(worldMap, gameState, ['grass'], 'snow', 12);
            this.randomTileEffect(worldMap, gameState, ['forest'], 'snow', 8);
            this.randomTileEffect(worldMap, gameState, ['shallow_water'], 'ice', 6);
        } else if (age.id === 'moon') {
            // Mysterious: some snow melts, some grass appears
            this.randomTileEffect(worldMap, gameState, ['snow'], 'grass', 5);
            this.randomTileEffect(worldMap, gameState, ['dirt'], 'grass', 3);
        } else if (age.id === 'wonders') {
            // Magic regrowth
            this.randomTileEffect(worldMap, gameState, ['dirt', 'burned'], 'grass', 10);
            this.randomTileEffect(worldMap, gameState, ['sand'], 'grass', 5);
            this.randomTileEffect(worldMap, gameState, ['ice'], 'shallow_water', 8);
        }
    }

    randomTileEffect(worldMap, gameState, fromTypes, toType, count) {
        let applied = 0;
        let attempts = 0;
        const changed = [];
        while (applied < count && attempts < count * 5) {
            attempts++;
            const x = Math.floor(Math.random() * worldMap.width);
            const y = Math.floor(Math.random() * worldMap.height);
            const tile = worldMap.getTile(x, y);
            if (fromTypes.includes(tile)) {
                worldMap.setTile(x, y, toType);
                changed.push({ x, y });
                applied++;
            }
        }
        // Push dirty tiles so terrain renderer updates visually
        if (changed.length > 0 && gameState.dirtyTiles) {
            gameState.dirtyTiles.push(...changed);
        }
    }

    getState() {
        return {
            currentAgeIndex: this.currentAgeIndex,
            currentAgeId: this.currentAgeId,
            ticksInCurrentAge: this.ticksInCurrentAge
        };
    }

    restoreState(state) {
        if (!state) return;
        this.currentAgeIndex = state.currentAgeIndex || 0;
        this.currentAgeId = state.currentAgeId || AGE_ORDER[0];
        this.ticksInCurrentAge = state.ticksInCurrentAge || 0;
    }
}
