/**
 * Name generator — procedural settlement & leader names per race.
 */

const PREFIXES = {
    human: ['New ', 'Port ', 'Fort ', 'North ', 'South ', 'East ', 'West ', 'Saint ', 'Grand ', 'Old '],
    elf: ['Sil', 'Elar', 'Thal', 'Ael', 'Lóri', 'Cel', 'Fin', 'Gal', 'Mir', 'Fae'],
    orc: ['Grom', 'Krag', 'Mok', 'Gor', 'Urg', 'Drak', 'Skul', 'Zug', 'Rok', 'Tar'],
    dwarf: ['Iron', 'Stone', 'Gold', 'Dark', 'Deep', 'Black', 'Forge', 'Hammer', 'Anvil', 'Ember'],
    demon: ['Neth', 'Aza', 'Mal', 'Xar', 'Vor', 'Ith', 'Shar', 'Dra', 'Zor', 'Bal'],
    undead: ['Dead', 'Grave', 'Bone', 'Skull', 'Ash', 'Dusk', 'Rot', 'Blight', 'Haunt', 'Woe']
};

const SUFFIXES = {
    human: ['haven', 'bridge', 'burg', 'field', 'ton', 'ford', 'wood', 'dale', 'shire', 'castle', 'keep', 'wall'],
    elf: ['andel', 'oria', 'ithil', 'wen', 'dor', 'las', 'riel', 'won', 'thien', 'duin'],
    orc: ["'gash", 'gor', 'dun', 'thar', 'mok', 'bash', 'fang', 'skull', "'kar", 'rok'],
    dwarf: ['forge', 'hold', 'helm', 'guard', 'peak', 'mine', 'gate', 'hall', 'fall', 'deep'],
    demon: ['roth', 'ziel', 'gate', 'maw', 'pit', 'flame', 'void', 'bane', 'doom', 'abyss'],
    undead: ['mire', 'hollow', 'crypt', 'tomb', 'barrow', 'moor', 'vale', 'marsh', 'cairn', 'reach']
};

const LEADER_FIRST = {
    human: ['Arthur', 'Elena', 'Marcus', 'Lydia', 'William', 'Isabella', 'Roland', 'Sophia', 'Henry', 'Maria'],
    elf: ['Aelindra', 'Thalion', 'Celeborn', 'Galawen', 'Finrod', 'Lúthien', 'Eärendil', 'Arwen', 'Legolas', 'Cirdan'],
    orc: ['Grommash', 'Ulgra', 'Drakthar', 'Mogra', 'Zugbash', 'Skullclaw', 'Ironjaw', 'Roktar', 'Gorthak', 'Braga'],
    dwarf: ['Thorin', 'Gimli', 'Balin', 'Durin', 'Dwalin', 'Brunhild', 'Torga', 'Kili', 'Gloin', 'Bofur'],
    demon: ['Azazel', 'Lilith', 'Baphomet', 'Mephisto', 'Nether', 'Xarath', 'Voidmaw', 'Draziel', 'Sarthak', 'Malgor'],
    undead: ['Mortis', 'Banshea', 'Lich', 'Wraith', 'Phantom', 'Revenant', 'Specter', 'Shade', 'Ghoul', 'Dread']
};

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSettlementName(raceId) {
    const prefix = pick(PREFIXES[raceId] || PREFIXES.human);
    const suffix = pick(SUFFIXES[raceId] || SUFFIXES.human);
    return prefix + suffix;
}

export function generateLeaderName(raceId) {
    return pick(LEADER_FIRST[raceId] || LEADER_FIRST.human);
}

// ─── UNIT NAMES ──────────────────────────────────────────────────
const UNIT_FIRST = {
    human: ['Aldric', 'Brynn', 'Cedric', 'Dara', 'Erik', 'Fiona', 'Gareth', 'Helena', 'Ivan', 'Julia', 'Karl', 'Lena', 'Magnus', 'Nora', 'Otto', 'Petra'],
    elf: ['Aelion', 'Bryndis', 'Caelum', 'Daeloth', 'Eirien', 'Faelis', 'Gwindor', 'Haleth', 'Ithilwen', 'Laeriel'],
    orc: ['Grak', 'Urz', 'Mokdul', 'Shakra', 'Thrakk', 'Warg', 'Zulgra', 'Brulg', 'Krugash', 'Grimfang'],
    dwarf: ['Alaric', 'Brynja', 'Durin', 'Eitri', 'Fallra', 'Grimnir', 'Hilda', 'Irondel', 'Karga', 'Myra'],
    demon: ['Zael', 'Nyx', 'Vex', 'Morak', 'Shul', 'Xar', 'Belor', 'Draz', 'Kael', 'Vrath'],
    undead: ['Shade', 'Wraith', 'Bane', 'Hollow', 'Crypt', 'Ghast', 'Dusk', 'Ashen', 'Void', 'Requiem']
};

const UNIT_SUFFIX = ['the Bold', 'the Wise', 'the Strong', 'the Swift', 'Ironhand', 'Stormborn', 'Darkheart', 'Lightbringer', 'the Quiet', 'Bloodfang'];

export function generateUnitName(raceId) {
    const firsts = UNIT_FIRST[raceId] || UNIT_FIRST.human;
    const first = pick(firsts);
    if (Math.random() < 0.3) {
        return first + ' ' + pick(UNIT_SUFFIX);
    }
    return first;
}
