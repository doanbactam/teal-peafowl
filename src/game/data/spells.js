/**
 * spells.js — Spell definitions for combat magic.
 * Units with mana can cast spells during combat (33% chance per attack).
 */

export const SPELLS = {
    fireball: {
        id: 'fireball', name: 'Cầu Lửa', icon: '🔥',
        manaCost: 15, damage: 25, range: 5, aoeRadius: 1,
        type: 'offensive', element: 'fire',
        description: 'Bắn cầu lửa gây sát thương diện rộng',
        vfx: { color: 0xff4400, type: 'projectile', trail: true, explosion: true }
    },
    shield: {
        id: 'shield', name: 'Khiên Phép', icon: '🛡️',
        manaCost: 10, damage: 0, range: 0, aoeRadius: 0,
        type: 'defensive', element: 'arcane', duration: 10,
        description: 'Tạo khiên phép giảm 50% sát thương nhận vào',
        vfx: { color: 0x5599ff, type: 'shield', pulse: true },
        effect: 'damage_reduction', effectValue: 0.5
    },
    teleport: {
        id: 'teleport', name: 'Dịch Chuyển', icon: '✨',
        manaCost: 20, damage: 0, range: 0, aoeRadius: 0,
        type: 'utility', element: 'arcane', teleportRange: 8,
        description: 'Dịch chuyển đến vị trí an toàn gần nhất',
        vfx: { color: 0xaa55ff, type: 'teleport', particles: true }
    },
    heal: {
        id: 'heal', name: 'Chữa Lành', icon: '💚',
        manaCost: 12, damage: -30, range: 3, aoeRadius: 0,
        type: 'support', element: 'nature',
        description: 'Chữa 30 HP cho đồng minh gần nhất',
        vfx: { color: 0x55ff55, type: 'heal', rise: true }
    },
    blood_rain: {
        id: 'blood_rain', name: 'Mưa Máu', icon: '🩸',
        manaCost: 25, damage: 15, range: 6, aoeRadius: 3,
        type: 'offensive', element: 'dark',
        description: 'Gây mưa máu sát thương diện rộng',
        vfx: { color: 0xcc0000, type: 'rain', drops: 8 }
    },
    lightning_bolt: {
        id: 'lightning_bolt', name: 'Tia Sét', icon: '⚡',
        manaCost: 18, damage: 35, range: 6, aoeRadius: 0,
        type: 'offensive', element: 'lightning',
        description: 'Đánh sét mạnh vào một mục tiêu',
        vfx: { color: 0xffff00, type: 'lightning', flash: true }
    },
    tornado: {
        id: 'tornado', name: 'Lốc Nhỏ', icon: '🌪️',
        manaCost: 22, damage: 10, range: 4, aoeRadius: 2,
        type: 'offensive', element: 'air', knockback: 3,
        description: 'Gây lốc xoáy hất văng kẻ địch',
        vfx: { color: 0x88ccff, type: 'spiral', spins: 3 }
    },
    curse: {
        id: 'curse', name: 'Nguyền Rủa', icon: '💜',
        manaCost: 15, damage: 5, range: 4, aoeRadius: 0,
        type: 'offensive', element: 'dark', duration: 15,
        description: 'Nguyền rủa mục tiêu giảm 20% tấn công',
        vfx: { color: 0x9933ff, type: 'curse', aura: true },
        effect: 'attack_reduction', effectValue: 0.2
    }
};

export const SPELL_CHANCE = 0.33; // 33% chance to cast spell instead of normal attack

/**
 * Get spells available to a race
 */
export function getRaceSpells(raceId) {
    const raceSpellMap = {
        human: ['fireball', 'shield', 'heal'],
        elf: ['shield', 'teleport', 'heal', 'lightning_bolt'],
        orc: [], // No spells - brute force only
        dwarf: ['shield', 'heal'],
        demon: ['fireball', 'blood_rain', 'curse', 'tornado'],
        undead: ['curse', 'blood_rain']
    };
    return (raceSpellMap[raceId] || []).map(id => SPELLS[id]).filter(Boolean);
}

/**
 * Select a spell to cast based on situation
 */
export function selectSpell(entity, target, availableSpells) {
    if (!availableSpells || availableSpells.length === 0) return null;

    // Filter by mana cost
    const affordable = availableSpells.filter(s => (entity.mana || 0) >= s.manaCost);
    if (affordable.length === 0) return null;

    // Pick spell based on situation
    const hpPercent = entity.hp / (entity.maxHp || 1);

    // Low HP: prefer defensive/support spells
    if (hpPercent < 0.3) {
        const defensive = affordable.filter(s => s.type === 'defensive' || s.type === 'support' || s.type === 'utility');
        if (defensive.length > 0) return defensive[Math.floor(Math.random() * defensive.length)];
    }

    // Normal: offensive spells
    const offensive = affordable.filter(s => s.type === 'offensive');
    if (offensive.length > 0) return offensive[Math.floor(Math.random() * offensive.length)];

    // Fallback: any affordable spell
    return affordable[Math.floor(Math.random() * affordable.length)];
}
