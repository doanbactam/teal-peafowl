/**
 * Traits — Defines unique properties assigned to entities at birth.
 * Traits affect stats, behaviors, and visual representation.
 */

export const TRAITS = {
    // Stat modifiers
    strong: { id: 'strong', name: 'Mạnh Mẽ', description: 'Tăng sức tấn công', stats: { attack: 3, maxHp: 10 } },
    weak: { id: 'weak', name: 'Yếu Ớt', description: 'Giảm sức tấn công', stats: { attack: -2, maxHp: -10 } },
    fast: { id: 'fast', name: 'Nhanh Nhẹn', description: 'Di chuyển nhanh hơn', stats: { speed: 0.3 } },
    slow: { id: 'slow', name: 'Chậm Chạp', description: 'Di chuyển chậm hơn', stats: { speed: -0.2 } },
    tough: { id: 'tough', name: 'Cứng Cáp', description: 'Chịu đòn tốt hơn', stats: { defense: 3, maxHp: 20 } },
    fragile: { id: 'fragile', name: 'Mỏng Manh', description: 'Dễ nhận sát thương', stats: { defense: -2, maxHp: -20 } },
    immortal: { id: 'immortal', name: 'Bất Tử', description: 'Không chết vì tuổi già', stats: { maxAge: 9999 } },
    giant: { id: 'giant', name: 'Khổng Lồ', description: 'Kích thước lớn, HP dồi dào', stats: { maxHp: 50, attack: 5, speed: -0.1 } },
    tiny: { id: 'tiny', name: 'Tí Hon', description: 'Nhỏ bé và lanh lợi', stats: { maxHp: -20, attack: -2, speed: 0.2, defense: 2 } },
    // Behavioural
    pacifist: { id: 'pacifist', name: 'Yêu Hòa Bình', description: 'Không chủ động gây chiến', stats: {} },
    bloodlust: { id: 'bloodlust', name: 'Khát Máu', description: 'Tấn công bất cứ ai', stats: { attack: 2 } },
    pyromaniac: { id: 'pyromaniac', name: 'Cuồng Hỏa', description: 'Thích đốt phá, mạnh hơn khi tấn công', stats: { attack: 2 } },
    regenerative: { id: 'regenerative', name: 'Hồi Phục', description: 'Tự động hồi máu', stats: {} },
    immune: { id: 'immune', name: 'Kháng Bệnh', description: 'Miễn dịch với dịch bệnh', stats: {} },
    infected: { id: 'infected', name: 'Nhiễm Bệnh', description: 'Từ từ chết dần và hồi sinh thành xác sống', stats: { maxHp: -10, speed: -0.2 } },
    blessed: { id: 'blessed', name: 'Thiên Cung Cấp', description: 'Được Chúa ban phước', stats: { attack: 5, defense: 5, speed: 0.2, maxHp: 50 } },
    cursed: { id: 'cursed', name: 'Bị Nguyền Rủa', description: 'Chúa nguyền rủa kẻ này', stats: { attack: -5, defense: -5, speed: -0.2, maxHp: -50 } },
    king: { id: 'king', name: 'Vương Giả', description: 'Vị vua tối cao, biểu tượng của vương quốc', stats: { attack: 10, defense: 10, maxHp: 100 } },

    // Gene-influenced traits (can be inherited via subspecies)
    mage_affinity: { id: 'mage_affinity', name: 'Thiên Phú Phép', description: 'Có khiếu pháp thuật bẩm sinh', stats: { mana: 10, maxMana: 10 } },

    // Social / personality traits
    extrovert: { id: 'extrovert', name: 'Hướng Ngoại', description: 'Dễ kết bạn, cần giao tiếp', stats: {} },
    introvert: { id: 'introvert', name: 'Hướng Nội', description: 'Thích một mình, ít kết bạn', stats: {} },
    charismatic: { id: 'charismatic', name: 'Lôi Cuốn', description: 'Thu hút người khác, tăng loyalty', stats: { defense: 1 } },
    jealous: { id: 'jealous', name: 'Ghen Tị', description: 'Dễ sinh thù hằn', stats: {} },
    loyal_heart: { id: 'loyal_heart', name: 'Trung Thành', description: 'Tăng quan hệ mạnh, khó phản bội', stats: {} },
    romantic: { id: 'romantic', name: 'Lãng Mạn', description: 'Dễ yêu, hạnh phúc khi có đôi', stats: {} },
    loner: { id: 'loner', name: 'Cô Độc', description: 'Không cần quan hệ, ít bị ảnh hưởng', stats: {} },
    gossipy: { id: 'gossipy', name: 'Buôn Chuyện', description: 'Lan truyền tin đồn, ảnh hưởng mood tập thể', stats: {} },
    compassionate: { id: 'compassionate', name: 'Từ Bi', description: 'Giúp đỡ người yếu, tăng stability', stats: {} },
    aggressive: { id: 'aggressive', name: 'Hung Hãn', description: 'Dễ gây sự, giảm stability', stats: { attack: 1 } }
};

export const POSITIVE_TRAITS = ['strong', 'fast', 'tough', 'immortal', 'giant', 'regenerative', 'immune'];
export const NEGATIVE_TRAITS = ['weak', 'slow', 'fragile', 'tiny', 'infected'];
export const SOCIAL_PERSONALITY_TRAITS = ['extrovert', 'introvert', 'charismatic', 'jealous', 'loyal_heart', 'romantic', 'loner', 'gossipy', 'compassionate', 'aggressive'];

/**
 * Applies traits to an entity's base stats.
 */
export function applyTraits(entity) {
    if (!entity.traits) entity.traits = [];
    
    entity.traits.forEach(traitId => {
        const trait = TRAITS[traitId];
        if (!trait) return;
        
        if (trait.stats) {
            if (trait.stats.attack) entity.attack += trait.stats.attack;
            if (trait.stats.defense) entity.defense += trait.stats.defense;
            if (trait.stats.speed) entity.speed += trait.stats.speed;
            if (trait.stats.maxHp) {
                entity.maxHp += trait.stats.maxHp;
                entity.hp += trait.stats.maxHp;
            }
            if (trait.stats.maxAge) entity.maxAge = Math.max(entity.maxAge, trait.stats.maxAge);
            if (trait.stats.mana) entity.mana += trait.stats.mana;
            if (trait.stats.maxMana) entity.maxMana += trait.stats.maxMana;
            if (trait.stats.dodge) entity.dodge += trait.stats.dodge;
        }
    });

    clampStats(entity);
}

/**
 * Clamps stats to prevent negative values.
 */
function clampStats(entity) {
    entity.attack = Math.max(1, entity.attack);
    entity.defense = Math.max(0, entity.defense);
    entity.speed = Math.max(0.1, entity.speed);
    entity.maxHp = Math.max(1, entity.maxHp);
    entity.hp = Math.min(entity.maxHp, entity.hp);
}

export function addTrait(entity, traitId) {
    if (!entity.traits) entity.traits = [];
    if (!entity.traits.includes(traitId)) {
        entity.traits.push(traitId);
        const trait = TRAITS[traitId];
        if (trait && trait.stats) {
            if (trait.stats.attack) entity.attack += trait.stats.attack;
            if (trait.stats.defense) entity.defense += trait.stats.defense;
            if (trait.stats.speed) entity.speed += trait.stats.speed;
            if (trait.stats.maxHp) {
                entity.maxHp += trait.stats.maxHp;
                entity.hp += trait.stats.maxHp; // heal by max amount
            }
            if (trait.stats.maxAge) entity.maxAge = Math.max(entity.maxAge, trait.stats.maxAge);
        }
        clampStats(entity);
    }
}

export function removeTrait(entity, traitId) {
    if (!entity.traits) return;
    const index = entity.traits.indexOf(traitId);
    if (index !== -1) {
        entity.traits.splice(index, 1);
        const trait = TRAITS[traitId];
        if (trait && trait.stats) {
            if (trait.stats.attack) entity.attack -= trait.stats.attack;
            if (trait.stats.defense) entity.defense -= trait.stats.defense;
            if (trait.stats.speed) entity.speed -= trait.stats.speed;
            if (trait.stats.maxHp) {
                entity.maxHp -= trait.stats.maxHp;
                entity.hp = Math.min(entity.hp, entity.maxHp);
            }
            // Age can't be easily reversed without knowing other traits, so we leave maxAge alone
        }
        clampStats(entity);
    }
}

/**
 * Randomly generate traits.
 * 20% chance for a random stat trait, then 5% for a second one.
 * 40% chance for a social/personality trait.
 */
export function generateRandomTraits() {
    const traits = [];
    // Stat traits
    if (Math.random() < 0.20) {
        const list = Math.random() > 0.5 ? POSITIVE_TRAITS : NEGATIVE_TRAITS;
        traits.push(list[Math.floor(Math.random() * list.length)]);
    }
    if (traits.length > 0 && Math.random() < 0.05) {
        const list = Math.random() > 0.5 ? POSITIVE_TRAITS : NEGATIVE_TRAITS;
        const newTrait = list[Math.floor(Math.random() * list.length)];
        if (!traits.includes(newTrait)) traits.push(newTrait);
    }
    // Social personality trait — most entities get one
    if (Math.random() < 0.40) {
        const socialTrait = SOCIAL_PERSONALITY_TRAITS[Math.floor(Math.random() * SOCIAL_PERSONALITY_TRAITS.length)];
        if (!traits.includes(socialTrait)) traits.push(socialTrait);
    }
    return traits;
}

/**
 * Inherit traits from parents.
 * Child gets parent's traits with 50% probability each, plus tiny chance of mutation.
 * If parent has subspecies traits, those are also considered.
 */
export function inheritTraits(parentTraits, subspeciesTraits) {
    const childTraits = [];
    const mergedTraits = [...(parentTraits || [])];

    // Include subspecies-specific traits as inheritable candidates
    if (subspeciesTraits && subspeciesTraits.length > 0) {
        for (const t of subspeciesTraits) {
            if (!mergedTraits.includes(t)) mergedTraits.push(t);
        }
    }

    if (mergedTraits.length > 0) {
        mergedTraits.forEach(t => {
            if (Math.random() < 0.5) childTraits.push(t);
        });
    }
    // Mutation
    if (Math.random() < 0.05) {
        const list = Math.random() > 0.5 ? POSITIVE_TRAITS : NEGATIVE_TRAITS;
        const mutation = list[Math.floor(Math.random() * list.length)];
        if (!childTraits.includes(mutation)) childTraits.push(mutation);
    }
    return childTraits;
}
