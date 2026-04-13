/**
 * God tool definitions — everything the player can use on the world.
 * Organized into categories matching WorldBox's tool layout.
 */
export const TOOL_CATEGORIES = {
    INSPECT:   'inspect',
    TERRAIN:   'terrain',
    LIFE:      'life',
    ANIMALS:   'animals',
    DISASTERS: 'disasters',
    MAGIC:     'magic',
    OTHER:     'other'
};

export const TOOLS = {
    // ─── INSPECT ───────────────────────────────────────────────
    INSPECT: {
        id: 'inspect', name: 'Quan Sát', icon: '🔍',
        category: TOOL_CATEGORIES.INSPECT, brush: 0,
        description: 'Nhấn để quan sát ô đất, cá thể và khu định cư'
    },

    // ─── TERRAIN ───────────────────────────────────────────────
    GRASS: {
        id: 'grass', name: 'Đồng Cỏ', icon: '🌿',
        category: TOOL_CATEGORIES.TERRAIN, brush: 3,
        tileType: 'grass', description: 'Trồng cỏ tươi tốt'
    },
    FOREST: {
        id: 'forest', name: 'Rừng Rậm', icon: '🌲',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'forest', description: 'Trồng rừng'
    },
    WATER: {
        id: 'water', name: 'Nước Trong', icon: '💧',
        category: TOOL_CATEGORIES.TERRAIN, brush: 3,
        tileType: 'shallow_water', description: 'Thêm nước nông'
    },
    OCEAN: {
        id: 'deep_water', name: 'Đại Dương', icon: '🌊',
        category: TOOL_CATEGORIES.TERRAIN, brush: 4,
        tileType: 'deep_water', description: 'Biển sâu'
    },
    SAND: {
        id: 'sand', name: 'Cát', icon: '🏖️',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'sand', description: 'Bãi biển đầy cát'
    },
    MOUNTAIN: {
        id: 'mountain', name: 'Núi Đá', icon: '⛰️',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'mountain', description: 'Nâng núi cao'
    },
    HILL: {
        id: 'hill', name: 'Đồi Núi', icon: '🗻',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'hill', description: 'Nâng đồi'
    },
    SNOW: {
        id: 'snow', name: 'Tuyết', icon: '❄️',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'snow', description: 'Đóng băng mặt đất'
    },
    DESERT: {
        id: 'desert', name: 'Sa Mạc', icon: '🏜️',
        category: TOOL_CATEGORIES.TERRAIN, brush: 3,
        tileType: 'desert', description: 'Cát khô cằn'
    },
    SWAMP: {
        id: 'swamp', name: 'Đầm Lầy', icon: '🌿',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'swamp', description: 'Vùng đầm lầy âm u'
    },
    LAVA: {
        id: 'lava', name: 'Hố Dung Nham', icon: '🌋',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'lava', description: 'Đá nóng chảy'
    },
    JUNGLE: {
        id: 'jungle', name: 'Rừng Rậm Nhiệt Đới', icon: '🌴',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'jungle', description: 'Rừng nhiệt đới rậm rạp'
    },
    SAVANNA: {
        id: 'savanna', name: 'Xavan', icon: '🌾',
        category: TOOL_CATEGORIES.TERRAIN, brush: 3,
        tileType: 'savanna', description: 'Thảo trường khô cằn'
    },
    CRYSTAL: {
        id: 'crystal', name: 'Pha Lê', icon: '💎',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'crystal', description: 'Đất pha lê lấp lánh'
    },
    CANDY: {
        id: 'candy', name: 'Kẹo Ngọt', icon: '🍬',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'candy', description: 'Vùng đất kẹo ngọt thần tiên'
    },
    MUSHROOM: {
        id: 'mushroom', name: 'Nấm', icon: '🍄',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'mushroom', description: 'Rừng nấm kỳ bí'
    },
    CORRUPTED: {
        id: 'corrupted', name: 'Ô Nhiễm Tà Ác', icon: '🖤',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'corrupted', description: 'Đất bị tha hóa bởi bóng tối'
    },
    INFERNAL: {
        id: 'infernal', name: 'Địa Ngục', icon: '🔥',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'infernal', description: 'Đất thiêu đốt từ địa ngục'
    },
    WASTELAND: {
        id: 'wasteland', name: 'Hoang Mạc', icon: '☠️',
        category: TOOL_CATEGORIES.TERRAIN, brush: 3,
        tileType: 'wasteland', description: 'Vùng đất chết không sự sống'
    },
    BIRCH_GROVE: {
        id: 'birch_grove', name: 'Rừng Bạch Dương', icon: '🌳',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'birch_grove', description: 'Rừng bạch dương thanh bình'
    },
    MAPLE_GROVE: {
        id: 'maple_grove', name: 'Rừng Phong', icon: '🍁',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'maple_grove', description: 'Rừng phong đỏ rực'
    },
    FLOWER_MEADOW: {
        id: 'flower_meadow', name: 'Đồng Hoa', icon: '🌸',
        category: TOOL_CATEGORIES.TERRAIN, brush: 3,
        tileType: 'flower_meadow', description: 'Đồng cỏ hoa rực rỡ'
    },
    CELESTIAL: {
        id: 'celestial', name: 'Thiên Giới', icon: '✨',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'celestial', description: 'Đất thần thánh tỏa sáng'
    },
    DEEP_SNOW: {
        id: 'deep_snow', name: 'Tuyết Sâu', icon: '❄️',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'deep_snow', description: 'Tuyết dày không thể xây dựng'
    },
    PERMAFROST: {
        id: 'permafrost', name: 'Băng Vĩnh Cửu', icon: '🧊',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'permafrost', description: 'Băng giá vĩnh cửu không tan'
    },
    DIRT: {
        id: 'dirt', name: 'Đất', icon: '🟫',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'dirt', description: 'Đất trống barren'
    },
    ICE: {
        id: 'ice', name: 'Băng', icon: '🧊',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        tileType: 'ice', description: 'Băng giá lạnh'
    },
    ROAD: {
        id: 'road', name: 'Đường', icon: '🛤️',
        category: TOOL_CATEGORIES.TERRAIN, brush: 1,
        tileType: 'road', description: 'Xây đường đi lại'
    },
    TEMP_UP: {
        id: 'temp_up', name: 'Tăng Nhiệt Độ', icon: '🌡️',
        category: TOOL_CATEGORIES.TERRAIN, brush: 3,
        description: 'Tăng nhiệt độ khu vực'
    },
    TEMP_DOWN: {
        id: 'temp_down', name: 'Giảm Nhiệt Độ', icon: '🧊',
        category: TOOL_CATEGORIES.TERRAIN, brush: 3,
        description: 'Giảm nhiệt độ khu vực'
    },
    ERASER: {
        id: 'eraser', name: 'Tẩy Xóa', icon: '🧹',
        category: TOOL_CATEGORIES.TERRAIN, brush: 2,
        description: 'Xóa bỏ mọi thứ: sinh vật, công trình, địa hình'
    },

    // ─── LIFE ──────────────────────────────────────────────────
    SPAWN_HUMAN: {
        id: 'spawn_human', name: 'Con Người', icon: '👤',
        category: TOOL_CATEGORIES.LIFE, brush: 0,
        raceId: 'human', description: 'Đặt một ngôi làng con người'
    },
    SPAWN_ELF: {
        id: 'spawn_elf', name: 'Tiên Tộc', icon: '🧝',
        category: TOOL_CATEGORIES.LIFE, brush: 0,
        raceId: 'elf', description: 'Đặt một ngôi làng tiên tộc'
    },
    SPAWN_ORC: {
        id: 'spawn_orc', name: 'Quỷ Nhân', icon: '👹',
        category: TOOL_CATEGORIES.LIFE, brush: 0,
        raceId: 'orc', description: 'Đặt một trại orc'
    },
    SPAWN_DWARF: {
        id: 'spawn_dwarf', name: 'Người Lùn', icon: '⛏️',
        category: TOOL_CATEGORIES.LIFE, brush: 0,
        raceId: 'dwarf', description: 'Đặt một lâu đài người lùn'
    },
    SPAWN_DEMON: {
        id: 'spawn_demon', name: 'Ác Quỷ', icon: '😈',
        category: TOOL_CATEGORIES.LIFE, brush: 0,
        raceId: 'demon', description: 'Triệu hồi ác quỷ rực lửa'
    },
    SPAWN_UNDEAD: {
        id: 'spawn_undead', name: 'Xương Khô', icon: '💀',
        category: TOOL_CATEGORIES.LIFE, brush: 0,
        raceId: 'undead', description: 'Hồi sinh xác chết'
    },

    // ─── ANIMALS ───────────────────────────────────────────────
    SPAWN_SHEEP: {
        id: 'spawn_sheep', name: 'Cừu', icon: '🐑',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'sheep', description: 'Thả đàn cừu hiền lành'
    },
    SPAWN_WOLF: {
        id: 'spawn_wolf', name: 'Sói', icon: '🐺',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'wolf', description: 'Triệu hồi bầy sói dữ dằn'
    },
    SPAWN_BEAR: {
        id: 'spawn_bear', name: 'Gấu', icon: '🐻',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'bear', description: 'Gọi gấu lớn thống trị rừng sâu'
    },
    SPAWN_DEER: {
        id: 'spawn_deer', name: 'Hươu', icon: '🦌',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'deer', description: 'Thả đàn hươu nai nhanh nhẹn'
    },
    SPAWN_FISH: {
        id: 'spawn_fish', name: 'Cá', icon: '🐟',
        category: TOOL_CATEGORIES.ANIMALS, brush: 2,
        animalType: 'fish', description: 'Thả cá vào vùng nước'
    },
    SPAWN_DRAGON: {
        id: 'spawn_dragon', name: 'Rồng', icon: '🐉',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'dragon', description: 'Triệu hồi rồng hỏa long hùng mạnh'
    },
    SPAWN_COW: {
        id: 'spawn_cow', name: 'Bò', icon: '🐄',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'cow', description: 'Thả đàn bò hiền lành'
    },
    SPAWN_PIG: {
        id: 'spawn_pig', name: 'Heo', icon: '🐷',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'pig', description: 'Thả đàn heo'
    },
    SPAWN_RABBIT: {
        id: 'spawn_rabbit', name: 'Thỏ', icon: '🐰',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'rabbit', description: 'Thả thỏ nhanh nhẹn'
    },
    SPAWN_CHICKEN: {
        id: 'spawn_chicken', name: 'Gà', icon: '🐔',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'chicken', description: 'Thả gà'
    },
    SPAWN_FOX: {
        id: 'spawn_fox', name: 'Cáo', icon: '🦊',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'fox', description: 'Triệu hồi cáo đỏ tinh nghịch'
    },
    SPAWN_LION: {
        id: 'spawn_lion', name: 'Sư Tử', icon: '🦁',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'lion', description: 'Sư tử vua của thảo nguyên'
    },
    SPAWN_CROCODILE: {
        id: 'spawn_crocodile', name: 'Cá Sấu', icon: '🐊',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'crocodile', description: 'Cá sấu dưới đầm lầy'
    },
    SPAWN_SNAKE: {
        id: 'spawn_snake', name: 'Rắn', icon: '🐍',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'snake', description: 'Rắn độc tiềm ẩn trong rừng'
    },
    SPAWN_CRAB: {
        id: 'spawn_crab', name: 'Cua', icon: '🦀',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'crab', description: 'Cua trên bãi biển'
    },
    SPAWN_MONKEY: {
        id: 'spawn_monkey', name: 'Khỉ', icon: '🐒',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'monkey', description: 'Khỉ trong rừng sâu'
    },
    SPAWN_RAT: {
        id: 'spawn_rat', name: 'Chuột', icon: '🐀',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'rat', description: 'Chuột đồng nhỏ bé'
    },
    SPAWN_CRABZILLA: {
        id: 'spawn_crabzilla', name: 'Cua Khổng Lồ', icon: '🦀',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'crabzilla', description: 'CRABZILLA! Hủy diệt mọi thứ!'
    },
    SPAWN_UFO: {
        id: 'spawn_ufo', name: 'Đĩa Bay UFO', icon: '🛸',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'ufo', description: 'Triệu hồi đĩa bay không gian — bắt cóc dân số!'
    },
    // ─── NEW MONSTERS & CREATURES ──────────────────────────────────
    SPAWN_SKELETON: {
        id: 'spawn_skeleton', name: 'Xương Khô', icon: '💀',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'skeleton', description: 'Hồi sinh xương khô từ mộ phần'
    },
    SPAWN_EVIL_MAGE: {
        id: 'spawn_evil_mage', name: 'Pháp Sư Ác', icon: '🧙',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'evil_mage', description: 'Pháp sư hắc ám'
    },
    SPAWN_BANDIT: {
        id: 'spawn_bandit', name: 'Cướp', icon: '🥷',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'bandit', description: 'Cướp bóc trên thảo nguyên'
    },
    SPAWN_WORM: {
        id: 'spawn_worm', name: 'Giun Khổng Lồ', icon: '🪱',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'worm', description: 'Giun sa mạc khổng lồ'
    },
    SPAWN_SLIME: {
        id: 'spawn_slime', name: 'Slime', icon: '🟢',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'slime', description: 'Slime đầm lầy phân chia khi chết'
    },
    SPAWN_GHOST: {
        id: 'spawn_ghost', name: 'Hồn Ma', icon: '👻',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'ghost', description: 'Hồn ma từ vùng đất ô nhiễm'
    },
    SPAWN_GREY_GOO: {
        id: 'spawn_grey_goo', name: 'Grey Goo', icon: '🫧',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'grey_goo', description: 'Sinh vật ăn đất — biến mọi thứ thành biển!'
    },
    SPAWN_SNOWMAN: {
        id: 'spawn_snowman', name: 'Người Tuyết', icon: '⛄',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'snowman', description: 'Người tuyết phục kích trên băng giá'
    },
    SPAWN_COLD_ONE: {
        id: 'spawn_cold_one', name: 'Cold One', icon: '❄️',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'cold_one', description: 'Sinh vật băng giá phục kích'
    },
    SPAWN_SAND_SPIDER: {
        id: 'spawn_sand_spider', name: 'Nhện Cát', icon: '🕸️',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'sand_spider', description: 'Nhện sa mạc phục kích'
    },
    SPAWN_CRYSTAL_GOLEM: {
        id: 'spawn_crystal_golem', name: 'Golem Pha Lê', icon: '💎',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'crystal_golem', description: 'Golem pha lê bảo vệ mỏ'
    },
    SPAWN_FLAMING_SKULL: {
        id: 'spawn_flaming_skull', name: 'Đầu Lâu Lửa', icon: '🔥',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'flaming_skull', description: 'Đầu lâu cháy bùng từ địa ngục'
    },
    SPAWN_GUMMY_BEAR: {
        id: 'spawn_gummy_bear', name: 'Gấu Kẹo', icon: '🧸',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'gummy_bear', description: 'Gấu kẹo ngọt ngào nhưng hung dữ'
    },
    SPAWN_GINGERBREAD: {
        id: 'spawn_gingerbread_man', name: 'Gingerbread', icon: '🍪',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'gingerbread_man', description: 'Người bánh gừng hiền lành'
    },
    // ─── NEW ANIMALS ──────────────────────────────────────────────────
    SPAWN_PIRANHA: {
        id: 'spawn_piranha', name: 'Cà Piranha', icon: '🐡',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'piranha', description: 'Cá piranha săn theo bầy trong nước'
    },
    SPAWN_RHINO: {
        id: 'spawn_rhino', name: 'Tê Giác', icon: '🦏',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'rhino', description: 'Tê giác hùng mạnh'
    },
    SPAWN_HYENA: {
        id: 'spawn_hyena', name: 'Linh Cẩu', icon: '🐾',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'hyena', description: 'Linh cẩu săn theo bầy'
    },
    SPAWN_BEE: {
        id: 'spawn_bee', name: 'Ong', icon: '🐝',
        category: TOOL_CATEGORIES.ANIMALS, brush: 1,
        animalType: 'bee', description: 'Ong thụ phấn tăng thu hoạch'
    },
    SPAWN_DOG: {
        id: 'spawn_dog', name: 'Chó', icon: '🐕',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'dog', description: 'Chó canh gác khu định cư'
    },
    SPAWN_CAT: {
        id: 'spawn_cat', name: 'Mèo', icon: '🐱',
        category: TOOL_CATEGORIES.ANIMALS, brush: 0,
        animalType: 'cat', description: 'Mèo mang lại may mắn'
    },

    // ─── DISASTERS ─────────────────────────────────────────────
    METEOR: {
        id: 'meteor', name: 'Thiên Thạch', icon: '☄️',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Gọi thiên thạch khổng lồ'
    },
    LIGHTNING: {
        id: 'lightning', name: 'Sấm Sét', icon: '⚡',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Đánh sét hủy diệt'
    },
    FIRE: {
        id: 'fire', name: 'Vệt Lửa', icon: '🔥',
        category: TOOL_CATEGORIES.DISASTERS, brush: 1,
        description: 'Đốt cháy vùng đất'
    },
    TORNADO: {
        id: 'tornado', name: 'Lốc Xoáy', icon: '🌪️',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Triệu hồi siêu lốc xoáy'
    },
    EARTHQUAKE: {
        id: 'earthquake', name: 'Động Đất', icon: '〰️',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Gây chấn động mặt đất'
    },
    PLAGUE: {
        id: 'plague', name: 'Dịch Bệnh', icon: '☠️',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Phát tán dịch bệnh chết người'
    },
    FLOOD: {
        id: 'flood', name: 'Lũ Lụt', icon: '🌊',
        category: TOOL_CATEGORIES.DISASTERS, brush: 5,
        description: 'Nhấn chìm vùng đất dưới dòng nước'
    },
    NUCLEAR: {
        id: 'nuclear', name: 'Bom Nguyên Tử', icon: '☢️',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Hủy diệt hạt nhân — thiệt hại khổng lồ và phóng xạ'
    },
    ACID_RAIN: {
        id: 'acid_rain', name: 'Mưa Axit', icon: '🌧️',
        category: TOOL_CATEGORIES.DISASTERS, brush: 4,
        description: 'Mưa axit phá hủy cây cối và gây sát thương'
    },
    TNT: {
        id: 'tnt', name: 'Bộ Bắt Nổ (TNT)', icon: '🧨',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Chất nổ mạnh — phát nổ khi chạm lửa hoặc kích hoạt'
    },
    NAPALM: {
        id: 'napalm', name: 'Napalm', icon: '🔥',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Thiêu rụi diện rộng — đốt cháy mọi thứ trong bán kính lớn'
    },
    ANTIMATTER: {
        id: 'antimatter_bomb', name: 'Bom Phản Vật Chất', icon: '💫',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Hủy diệt tuyệt đối — xóa sạch mọi thứ trong bán kính khổng lồ'
    },
    GRENADE: {
        id: 'grenade', name: 'Lựu Đạn', icon: '💣',
        category: TOOL_CATEGORIES.DISASTERS, brush: 0,
        description: 'Nổ nhỏ — sát thương cao trong phạm vi hẹp'
    },

    // ─── MAGIC ─────────────────────────────────────────────────
    HEAL: {
        id: 'heal', name: 'Đèn Chữa Lành', icon: '✨',
        category: TOOL_CATEGORIES.MAGIC, brush: 3,
        description: 'Chữa lành vết thương cho các cá thể'
    },
    BLESS: {
        id: 'bless', name: 'Ban Phước', icon: '🌟',
        category: TOOL_CATEGORIES.MAGIC, brush: 4,
        description: 'Ban phước cho vùng đất, áp dụng hiệu ứng chúc phúc'
    },
    CURSE: {
        id: 'curse', name: 'Lời Nguyền', icon: '💜',
        category: TOOL_CATEGORIES.MAGIC, brush: 3,
        description: 'Nguyền rủa diện rộng'
    },
    GRAVITY: {
        id: 'gravity', name: 'Lỗ Đen', icon: '🕳️',
        category: TOOL_CATEGORIES.MAGIC, brush: 0,
        description: 'Hút mọi thứ xung quanh'
    },
    MADNESS: {
        id: 'madness', name: 'Điên Loạn', icon: '😵‍💫',
        category: TOOL_CATEGORIES.MAGIC, brush: 3,
        description: 'Gây ra sự điên loạn (Khát Máu) trên diện rộng'
    },
    SEED_JUNGLE: {
        id: 'seed_jungle', name: 'Hạt Giống Rừng Nhiệt Đới', icon: '🌴',
        category: TOOL_CATEGORIES.MAGIC, brush: 5,
        description: 'Trồng rừng nhiệt đới diện rộng'
    },
    SEED_CRYSTAL: {
        id: 'seed_crystal', name: 'Hạt Pha Lê', icon: '💎',
        category: TOOL_CATEGORIES.MAGIC, brush: 4,
        description: 'Kích hoạt mạch pha lê dưới đất'
    },
    SEED_MUSHROOM: {
        id: 'seed_mushroom', name: 'Bào Tử Nấm', icon: '🍄',
        category: TOOL_CATEGORIES.MAGIC, brush: 5,
        description: 'Phát tán bào tử nấm khắp vùng'
    },

    // ─── OTHER ─────────────────────────────────────────────────
    DIPLOMACY: {
        id: 'diplomacy', name: 'Ngoại Giao', icon: '🤝',
        category: TOOL_CATEGORIES.OTHER, brush: 0,
        description: 'Nhấn vào khu định cư để thiết lập quan hệ ngoại giao'
    },
    MIGRATE: {
        id: 'migrate', name: 'Di Cư', icon: '🏠',
        category: TOOL_CATEGORIES.OTHER, brush: 0,
        description: 'Di chuyển dân số giữa các khu định cư'
    },
    WORLD_LAWS: {
        id: 'world_laws', name: 'Luật Thế Giới', icon: '📜',
        category: TOOL_CATEGORIES.OTHER, brush: 0,
        description: 'Bật/tắt các luật thế giới — kiểm soát cách thế giới hoạt động'
    },
    HISTORY: {
        id: 'history', name: 'Lịch Sử', icon: '📖',
        category: TOOL_CATEGORIES.OTHER, brush: 0,
        description: 'Xem lịch sử thế giới — các sự kiện quan trọng đã xảy ra'
    }
};

export function getToolsByCategory(category) {
    return Object.values(TOOLS).filter(t => t.category === category);
}

export function getAllCategories() {
    return [
        { key: TOOL_CATEGORIES.INSPECT,   label: '🔍', name: 'Quan Sát' },
        { key: TOOL_CATEGORIES.TERRAIN,   label: '🌍', name: 'Địa Hình' },
        { key: TOOL_CATEGORIES.LIFE,      label: '👥', name: 'Sự Sống' },
        { key: TOOL_CATEGORIES.ANIMALS,   label: '🐾', name: 'Động Vật' },
        { key: TOOL_CATEGORIES.DISASTERS, label: '💥', name: 'Thảm Họa' },
        { key: TOOL_CATEGORIES.MAGIC,     label: '✨', name: 'Phép Thuật' },
        { key: TOOL_CATEGORIES.OTHER,     label: '⚡', name: 'Khác' },
    ];
}
