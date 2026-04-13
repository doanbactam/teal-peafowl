/**
 * KingdomManager — Manages kingdoms that group settlements together.
 * Kingdoms can wage war, make peace, and have a King.
 */
import { getRandomReligion, getReligion } from '../data/religions.js';

// Culture traits (one primary per kingdom)
export const CULTURE_TRAITS = {
    expansionist: { id: 'expansionist', name: 'Mở Rộng', icon: '🗺️', villageLimitBonus: 3, warChanceMod: 0.1, desc: 'Mở rộng lãnh thổ nhanh' },
    isolationist: { id: 'isolationist', name: 'Cô Lập', icon: '🏔️', villageLimitBonus: -1, tradeMod: 0.5, defenseBonus: 0.1, desc: 'Ít giao tiếp, phòng thủ mạnh' },
    militaristic: { id: 'militaristic', name: 'Quân Phiệt', icon: '⚔️', attackBonus: 0.15, warChanceMod: 0.2, desc: 'Sẵn sàng chiến tranh' },
    cultural: { id: 'cultural', name: 'Văn Hóa', icon: '📚', techBonus: 0.2, happinessBonus: 10, desc: 'Ưu tiên phát triển văn hóa' },
    religious: { id: 'religious', name: 'Tôn Giáo', icon: '🙏', happinessBonus: 15, diplomacyBonus: 0.1, desc: 'Đề cao đức tin' },
    mercantile: { id: 'mercantile', name: 'Thương Mại', icon: '💰', tradeMod: 1.5, goldBonus: 0.2, desc: 'Giao thương đắc lợi' }
};

const CULTURE_KEYS = Object.keys(CULTURE_TRAITS);

function randomCulture() {
    return { ...CULTURE_TRAITS[CULTURE_KEYS[Math.floor(Math.random() * CULTURE_KEYS.length)]] };
}

let nextKingdomId = 1;

export function setNextKingdomId(id) { if (id >= nextKingdomId) nextKingdomId = id + 1; }
export function getNextKingdomId() { return nextKingdomId; }

export class KingdomManager {
    constructor() {
        /** @type {Map<number, object>} */
        this.kingdoms = new Map();
    }

    create(props) {
        const id = nextKingdomId++;
        const kingdom = {
            id,
            name: props.name || `Kingdom ${id}`,
            raceId: props.raceId || 'human',
            color: props.color || 0xffffff,
            kingId: -1,
            capitalId: -1,
            age: 0,
            alive: true,
            enemies: new Set(), // Set of kingdom IDs
            allies: new Set(),
            // Culture trait (one primary per kingdom)
            culture: props.culture || randomCulture(),
            // Culture level (increases over time with population + library + academy)
            cultureLevel: props.cultureLevel || 1,
            // Religion (faith system affecting diplomacy and happiness)
            religion: props.religion || getRandomReligion(),
            ...props
        };
        // Resolve culture: if it's a string id from save data, look it up
        if (typeof kingdom.culture === 'string') {
            kingdom.culture = CULTURE_TRAITS[kingdom.culture] ? { ...CULTURE_TRAITS[kingdom.culture] } : randomCulture();
        } else if (!kingdom.culture || !kingdom.culture.id) {
            kingdom.culture = randomCulture();
        }
        this.kingdoms.set(id, kingdom);
        return kingdom;
    }

    get(id) {
        return this.kingdoms.get(id) || null;
    }

    getAll() {
        return Array.from(this.kingdoms.values()).filter(k => k.alive);
    }
    
    remove(id) {
        this.kingdoms.delete(id);
    }

    declareWar(kingdomAId, kingdomBId) {
        const a = this.get(kingdomAId);
        const b = this.get(kingdomBId);
        if (a && b) {
            a.enemies.add(b.id);
            b.enemies.add(a.id);
        }
    }

    makePeace(kingdomAId, kingdomBId) {
        const a = this.get(kingdomAId);
        const b = this.get(kingdomBId);
        if (a && b) {
            a.enemies.delete(b.id);
            b.enemies.delete(a.id);
        }
    }

    setReligion(kingdomId, religionId) {
        const kingdom = this.kingdoms.get(kingdomId);
        if (kingdom) {
            const r = getReligion(religionId);
            if (r) kingdom.religion = r;
        }
    }
}
