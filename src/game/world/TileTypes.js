/**
 * Tile type definitions with rendering and gameplay properties.
 * Extended palette matching WorldBox biome variety.
 */
export const TILE_TYPES = {
    deep_water: {
        id: 0, name: 'Deep Ocean',
        color: 0x113a6e, z: 0,
        walkable: false, buildable: false,
        resource: null, fertility: 0, moveCost: Infinity, flammable: false
    },
    shallow_water: {
        id: 1, name: 'Shallow Water',
        color: 0x2472b5, z: 1,
        walkable: false, buildable: false,
        resource: 'fish', fertility: 0, moveCost: Infinity, flammable: false
    },
    sand: {
        id: 2, name: 'Sand',
        color: 0xe8da8c, z: 2,
        walkable: true, buildable: true,
        resource: null, fertility: 0.15, moveCost: 1.5, flammable: false
    },
    grass: {
        id: 3, name: 'Grassland',
        color: 0x51a34b, z: 3,
        walkable: true, buildable: true,
        resource: 'food', fertility: 1.0, moveCost: 1.0, flammable: true
    },
    dirt: {
        id: 12, name: 'Dirt',
        color: 0x8a6341, z: 3,
        walkable: true, buildable: true,
        resource: null, fertility: 0.3, moveCost: 1.0, flammable: false
    },
    desert: {
        id: 10, name: 'Desert',
        color: 0xc49b49, z: 3,
        walkable: true, buildable: true,
        resource: null, fertility: 0.05, moveCost: 1.6, flammable: false
    },
    swamp: {
        id: 11, name: 'Swamp',
        color: 0x3d5c4b, z: 3,
        walkable: true, buildable: false,
        resource: 'food', fertility: 0.6, moveCost: 2.5, flammable: true
    },
    burned: {
        id: 14, name: 'Burned Land',
        color: 0x302e2c, z: 3,
        walkable: true, buildable: true,
        resource: null, fertility: 0.05, moveCost: 1.0, flammable: false
    },
    snow: {
        id: 7, name: 'Snow',
        color: 0xe3edf2, z: 3,
        walkable: true, buildable: true,
        resource: null, fertility: 0.1, moveCost: 2.0, flammable: false
    },
    forest: {
        id: 4, name: 'Forest',
        color: 0x2b6341, z: 4,
        walkable: true, buildable: false,
        resource: 'wood', fertility: 0.8, moveCost: 1.8, flammable: true
    },
    hill: {
        id: 6, name: 'Hill',
        color: 0x6e8f69, z: 5,
        walkable: true, buildable: true,
        resource: 'stone', fertility: 0.5, moveCost: 2.0, flammable: true
    },
    ice: {
        id: 8, name: 'Ice',
        color: 0x8fc8eb, z: 5,
        walkable: true, buildable: false,
        resource: null, fertility: 0, moveCost: 1.2, flammable: false
    },
    mountain: {
        id: 5, name: 'Mountain',
        color: 0x677180, z: 6,
        walkable: false, buildable: false,
        resource: 'stone', fertility: 0, moveCost: Infinity, flammable: false
    },
    lava: {
        id: 9, name: 'Lava',
        color: 0xd94418, z: 6,
        walkable: false, buildable: false,
        resource: null, fertility: 0, moveCost: Infinity, flammable: false
    },
    snow_mountain: {
        id: 13, name: 'Snowy Peak',
        color: 0xc8d7ed, z: 7,
        walkable: false, buildable: false,
        resource: null, fertility: 0, moveCost: Infinity, flammable: false
    },
    jungle: {
        id: 16, name: 'Jungle',
        color: 0x1a6b3c, z: 2,
        walkable: true, buildable: true,
        resource: 'wood', fertility: 0.9, moveCost: 2.0, flammable: false
    },
    savanna: {
        id: 17, name: 'Savanna',
        color: 0xc4a835, z: 1,
        walkable: true, buildable: true,
        resource: null, fertility: 0.6, moveCost: 1.2, flammable: true
    },
    crystal: {
        id: 18, name: 'Crystal',
        color: 0x9b59b6, z: 3,
        walkable: true, buildable: false,
        resource: 'stone', fertility: 0.1, moveCost: 1.5, flammable: false
    },
    candy: {
        id: 19, name: 'Candy',
        color: 0xff69b4, z: 1,
        walkable: true, buildable: true,
        resource: 'food', fertility: 0.5, moveCost: 1.0, flammable: false
    },
    mushroom: {
        id: 20, name: 'Mushroom',
        color: 0x8e44ad, z: 2,
        walkable: true, buildable: true,
        resource: 'food', fertility: 0.7, moveCost: 1.3, flammable: false
    },
    corrupted: {
        id: 21, name: 'Corrupted',
        color: 0x2c1338, z: 2,
        walkable: true, buildable: false,
        resource: null, fertility: 0.0, moveCost: 2.0, flammable: false
    },
    infernal: {
        id: 22, name: 'Infernal',
        color: 0x8b0000, z: 2,
        walkable: true, buildable: false,
        resource: null, fertility: 0.0, moveCost: 1.8, flammable: false
    },
    wasteland: {
        id: 23, name: 'Wasteland',
        color: 0x4a4a2a, z: 1,
        walkable: true, buildable: false,
        resource: null, fertility: 0.0, moveCost: 1.5, flammable: false
    },
    birch_grove: {
        id: 24, name: 'Birch Grove',
        color: 0x7db88a, z: 2,
        walkable: true, buildable: true,
        resource: 'wood', fertility: 0.7, moveCost: 1.5, flammable: true
    },
    maple_grove: {
        id: 25, name: 'Maple Grove',
        color: 0xc0392b, z: 2,
        walkable: true, buildable: true,
        resource: 'wood', fertility: 0.6, moveCost: 1.5, flammable: true
    },
    flower_meadow: {
        id: 26, name: 'Flower Meadow',
        color: 0x87d37c, z: 1,
        walkable: true, buildable: true,
        resource: 'food', fertility: 0.85, moveCost: 1.0, flammable: true
    },
    celestial: {
        id: 27, name: 'Celestial',
        color: 0xf0e68c, z: 2,
        walkable: true, buildable: true,
        resource: null, fertility: 0.8, moveCost: 1.0, flammable: false
    },
    deep_snow: {
        id: 28, name: 'Deep Snow',
        color: 0xd5e8f0, z: 2,
        walkable: true, buildable: false,
        resource: null, fertility: 0.05, moveCost: 2.5, flammable: false
    },
    permafrost: {
        id: 29, name: 'Permafrost',
        color: 0xb0c4de, z: 2,
        walkable: true, buildable: false,
        resource: null, fertility: 0.0, moveCost: 1.8, flammable: false
    },
    road: {
        id: 15, name: 'Road',
        color: 0x8B7355, z: 3,
        walkable: true, buildable: true,
        resource: null, fertility: 0.1, moveCost: 0.7, flammable: false
    }
};

export function getTileType(key) {
    return TILE_TYPES[key] || TILE_TYPES.grass;
}

export function getTileTypeById(id) {
    return Object.values(TILE_TYPES).find(t => t.id === id) || TILE_TYPES.grass;
}

export function isWalkable(key) {
    const tile = TILE_TYPES[key];
    return tile ? tile.walkable : false;
}
