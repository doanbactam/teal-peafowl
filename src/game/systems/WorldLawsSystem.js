/**
 * WorldLawsSystem — toggleable game rules that affect simulation behavior.
 * Inspired by SuperWorldBox's "World Laws" panel.
 */

const WORLD_LAW_DEFS = {
    hunger: {
        id: 'hunger', name: 'Nan Đói', icon: '🍖',
        description: 'Đơn vị cần thức ăn để sống sót',
        enabled: true, category: 'population'
    },
    plague_spread: {
        id: 'plague_spread', name: 'Lây Lan Dịch Bệnh', icon: '🦠',
        description: 'Dịch bệnh có thể lây lan giữa các đơn vị',
        enabled: true, category: 'population'
    },
    aging: {
        id: 'aging', name: 'Lão Hóa', icon: '⏳',
        description: 'Đơn vị già đi và chết vì tuổi tác',
        enabled: true, category: 'population'
    },
    rebellions: {
        id: 'rebellions', name: 'Nổi Loạn', icon: '🏴',
        description: 'Khu định cư có thể nổi loạn tạo vương quốc mới',
        enabled: true, category: 'diplomacy'
    },
    trade: {
        id: 'trade', name: 'Thương Mại', icon: '💰',
        description: 'Vương quốc có thể giao thương với nhau',
        enabled: true, category: 'diplomacy'
    },
    diplomacy: {
        id: 'diplomacy', name: 'Ngoại Giao', icon: '🤝',
        description: 'Vương quốc tự động thiết lập quan hệ hòa bình',
        enabled: true, category: 'diplomacy'
    },
    natural_disasters: {
        id: 'natural_disasters', name: 'Thiên Tai Tự Nhiên', icon: '🌪️',
        description: 'Thiên tai có thể xảy ra ngẫu nhiên',
        enabled: true, category: 'environment'
    },
    fire_spread: {
        id: 'fire_spread', name: 'Lây Lan Hỏa Hoạn', icon: '🔥',
        description: 'Lửa có thể lan sang các ô kế bên',
        enabled: true, category: 'environment'
    },
    regrowth: {
        id: 'regrowth', name: 'Tái Phát Triển', icon: '🌱',
        description: 'Thực vật tự mọc lại trên đất trống',
        enabled: true, category: 'environment'
    },
    animal_breeding: {
        id: 'animal_breeding', name: 'Sinh Sản Động Vật', icon: '🐑',
        description: 'Động vật tự động sinh sản',
        enabled: true, category: 'wildlife'
    },
    predator_prey: {
        id: 'predator_prey', name: 'Chuỗi Thức Ăn', icon: '🐺',
        description: 'Động vật ăn thịt săn động vật ăn cỏ',
        enabled: true, category: 'wildlife'
    },
    wars: {
        id: 'wars', name: 'Chiến Tranh', icon: '⚔️',
        description: 'Vương quốc có thể tuyên chiến',
        enabled: true, category: 'military'
    },
    corruption: {
        id: 'corruption', name: 'Ô Nhiễm', icon: '😈',
        description: 'Ác quỷ làm ô nhiễm đất đai',
        enabled: true, category: 'military'
    },
    resurrection: {
        id: 'resurrection', name: 'Hồi Sinh', icon: '💀',
        description: 'Xương khô có thể hồi sinh kẻ chết',
        enabled: true, category: 'military'
    },
    radiation: {
        id: 'radiation', name: 'Phóng Xạ', icon: '☢️',
        description: 'Phóng xạ lan truyền và gây sát thương',
        enabled: true, category: 'disasters'
    }
};

export const LAW_CATEGORIES = [
    { id: 'population',  name: 'Dân Số',   icon: '👥' },
    { id: 'diplomacy',   name: 'Ngoại Giao', icon: '🤝' },
    { id: 'environment', name: 'Môi Trường', icon: '🌍' },
    { id: 'wildlife',    name: 'Động Vật',  icon: '🐾' },
    { id: 'military',    name: 'Quân Sự',   icon: '⚔️' },
    { id: 'disasters',   name: 'Thảm Họa',  icon: '💥' }
];

export class WorldLawsSystem {
    constructor() {
        this.laws = {};
        for (const [key, def] of Object.entries(WORLD_LAW_DEFS)) {
            this.laws[key] = { ...def };
        }
    }

    isEnabled(lawId) {
        const law = this.laws[lawId];
        return law ? law.enabled : true;
    }

    toggleLaw(lawId) {
        const law = this.laws[lawId];
        if (law) law.enabled = !law.enabled;
    }

    setLaw(lawId, enabled) {
        const law = this.laws[lawId];
        if (law) law.enabled = enabled;
    }

    getAllLaws() {
        return Object.values(this.laws);
    }

    getLawsByCategory(cat) {
        return Object.values(this.laws).filter(l => l.category === cat);
    }

    getSaveData() {
        const data = {};
        for (const [key, law] of Object.entries(this.laws)) {
            data[key] = law.enabled;
        }
        return data;
    }

    restoreSaveData(data) {
        if (!data) return;
        for (const [key, enabled] of Object.entries(data)) {
            if (this.laws[key] !== undefined) {
                this.laws[key].enabled = !!enabled;
            }
        }
    }
}
