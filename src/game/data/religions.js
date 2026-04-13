/**
 * religions.js — Religion definitions for kingdom-level faith system.
 */

export const RELIGIONS = {
    animism: { id: 'animism', name: 'Vạn Vật Hữu Linh', icon: '🌿', color: 0x2ecc71,
        desc: 'Tôn thờ tự nhiên', happinessBonus: 5, diplomacyBonus: 0.05 },
    sun_worship: { id: 'sun_worship', name: 'Thờ Mặt Trời', icon: '☀️', color: 0xf39c12,
        desc: 'Tôn thờ ánh sáng', attackBonus: 0.05, growthBonus: 0.1 },
    moon_cult: { id: 'moon_cult', name: 'Giáo Phái Mặt Trăng', icon: '🌙', color: 0x9b59b6,
        desc: 'Sùng bái bóng tối', manaBonus: 10, stealthBonus: 0.1 },
    ancestor_worship: { id: 'ancestor_worship', name: 'Thờ Cúng Tổ Tiên', icon: '⚱️', color: 0x8B4513,
        desc: 'Tôn kính tổ tiên', defenseBonus: 0.05, loyaltyBonus: 10 },
    war_faith: { id: 'war_faith', name: 'Đạo Chiến Tranh', icon: '⚔️', color: 0xcc0000,
        desc: 'Chiến tranh là vinh quang', attackBonus: 0.1, warChanceMod: 0.1 },
    chaos_cult: { id: 'chaos_cult', name: 'Giáo Phái Hỗn Mang', icon: '🌀', color: 0x2c1338,
        desc: 'Thờ hỗn mang', mutationChance: 0.1, rebelChanceMod: 0.05 },
    divine_order: { id: 'divine_order', name: 'Thần Điển', icon: '✝️', color: 0xecf0f1,
        desc: 'Trật tự thần thánh', happinessBonus: 8, diplomacyBonus: 0.1 },
    nature_faith: { id: 'nature_faith', name: 'Đức Tin Thiên Nhiên', icon: '🌳', color: 0x27ae60,
        desc: 'Hòa hợp tự nhiên', growthBonus: 0.15, fertilityBonus: 0.1 }
};

export function getRandomReligion() {
    const keys = Object.keys(RELIGIONS);
    return RELIGIONS[keys[Math.floor(Math.random() * keys.length)]];
}

export function getReligion(id) {
    return RELIGIONS[id] || null;
}

// Religion compatibility matrix (same religion = allies, different = neutral or hostile)
export function getReligionRelation(religionA, religionB) {
    if (!religionA || !religionB) return 0;
    if (religionA.id === religionB.id) return 20; // Same faith = strong bond

    // Hostile pairs
    const hostilePairs = [
        ['sun_worship', 'moon_cult'],
        ['divine_order', 'chaos_cult'],
        ['war_faith', 'nature_faith']
    ];

    for (const [a, b] of hostilePairs) {
        if ((religionA.id === a && religionB.id === b) || (religionA.id === b && religionB.id === a)) {
            return -15; // Hostile religions
        }
    }

    return 0; // Neutral
}
