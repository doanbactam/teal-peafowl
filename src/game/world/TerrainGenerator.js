/**
 * Procedural terrain generator — multi-octave FBM noise, island shape, rich biomes.
 */

function hash(x, y, seed) {
    let h = (seed | 0) + x * 374761393 + y * 668265263;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return h;
}

function smoothNoise(x, y, seed) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = (hash(ix,     iy,     seed) & 0xffff) / 0xffff;
    const n10 = (hash(ix + 1, iy,     seed) & 0xffff) / 0xffff;
    const n01 = (hash(ix,     iy + 1, seed) & 0xffff) / 0xffff;
    const n11 = (hash(ix + 1, iy + 1, seed) & 0xffff) / 0xffff;
    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;
    return nx0 * (1 - sy) + nx1 * sy;
}

function fbm(x, y, seed, octaves = 6, lacunarity = 2.0, gain = 0.5) {
    let value = 0, amplitude = 1.0, frequency = 1.0, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
        value    += smoothNoise(x * frequency, y * frequency, seed + i * 1337) * amplitude;
        maxValue += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }
    return value / maxValue;
}

export function generateWorld(width, height, seed = Date.now()) {
    seed = seed | 0;
    const tiles       = [];
    const heightMap   = [];
    const moistureMap = [];
    const tempMap     = [];

    // Scale nhỏ đi để tạo lục địa và mảng sinh thái TO VÀ KHỐI hơn
    const mScale = 0.007; 
    const tScale = 0.006;

    for (let y = 0; y < height; y++) {
        tiles[y]       = [];
        heightMap[y]   = [];
        moistureMap[y] = [];
        tempMap[y]     = [];

        for (let x = 0; x < width; x++) {
            // Coordinate from -1 to 1
            const cx = (x / width  - 0.5) * 2;
            const cy = (y / height - 0.5) * 2;

            // Domain Warping: Làm méo để tạo các đường bờ biển tự nhiên
            let warpX = fbm(x * 0.01, y * 0.01, seed + 333, 3) * 2.0 - 1.0;
            let warpY = fbm(x * 0.01, y * 0.01, seed + 444, 3) * 2.0 - 1.0;
            
            let wx = x * 0.005 + warpX * 0.4;
            let wy = y * 0.005 + warpY * 0.4;
            
            // Nền đại lục liền khối
            let baseNode = fbm(wx, wy, seed + 111, 5, 2.0, 0.5);
            // Chi tiết đứt gãy núi
            let detail = fbm(x * 0.025, y * 0.025, seed + 222, 5);
            
            let h = baseNode * 0.70 + detail * 0.30;
            
            // Mask tạo đảo trung tâm lớn
            let distToCenter = Math.sqrt(cx*cx + cy*cy);
            let radialMask = Math.max(0, 1.0 - distToCenter * 0.90); 
            let organicMask = fbm(x * 0.004, y * 0.004, seed + 999, 3);
            let islandMask = radialMask * 0.75 + organicMask * 0.25;

            // Chặn ngoài viền phải là nước
            let distBox = Math.max(Math.abs(cx), Math.abs(cy));
            let edgeFalloff = 1.0 - Math.pow(distBox, 3.5);
            edgeFalloff = Math.max(0, Math.min(1, edgeFalloff));
            
            h = h * islandMask * 2.0; // Đẩy lục địa cao lên
            h = h * edgeFalloff;
            h = Math.max(0, Math.min(1, h));

            // Đất độ ẩm - quy hoạch mảng rừng lớn rải rác
            let m = fbm(x * mScale + 800, y * mScale + 800, seed + 99999, 4);
            if (h < 0.45 && h > 0.36) m += 0.15; // Ven bờ nhiều khả năng ẩm ướt rậm rạp
            m = Math.max(0, Math.min(1, m));

            // Nhiệt độ - theo vĩ độ và mảng cực
            const latFactor = 1.0 - Math.abs(cy); 
            let t = latFactor * 0.75 + fbm(x * tScale + 500, y * tScale + 500, seed + 55555, 3) * 0.25;
            t = Math.max(0, Math.min(1, t - (Math.max(0, h - 0.4) * 0.65))); 

            heightMap[y][x]   = h;
            moistureMap[y][x] = m;
            tempMap[y][x]     = t;
            
            // Thêm ngẫu nhiên các "mỏ khoáng sản" / Đồi đá nổi giữa các bình nguyên để khai thác
            let oreNoise = fbm(x * 0.08, y * 0.08, seed + 777, 2);
            let isOrePatch = (h >= 0.42 && h < 0.65 && oreNoise > 0.82);

            tiles[y][x] = isOrePatch ? 'hill' : assignBiome(h, m, t);
        }
    }

    return { tiles, heightMap, moistureMap, tempMap };
}

function assignBiome(h, m, t) {
    // ── Water layers ──
    if (h < 0.28) return 'deep_water';
    if (h < 0.38) return 'shallow_water'; // Bờ biển cạn dễ bơi thuyền, kiếm cá
    if (h < 0.42) return 'sand';

    // ── Swamp: low land, very wet ──
    if (h < 0.48 && m > 0.85) return 'swamp';

    // ── Pseudo-random rare biomes ──
    const rare = ((h * 7919 + m * 6271 + t * 3571) | 0) % 100;
    if (h >= 0.42 && h < 0.60 && m < 0.10 && t < 0.10 && rare < 3) return 'corrupted';
    if (h >= 0.42 && h < 0.55 && m >= 0.40 && m <= 0.60 && t >= 0.60 && t <= 0.80 && rare < 3) return 'candy';
    if (h >= 0.70 && h < 0.80 && t >= 0.50 && t <= 0.70 && m >= 0.30 && m <= 0.50 && rare < 3) return 'celestial';

    // ── VERY HIGH ALTITUDE (h > 0.80) - Dãy núi tuyết siêu lớn ──
    if (h > 0.82) {
        if (t < 0.10) return 'permafrost';
        if (t < 0.20) return 'deep_snow';
        return 'snow_mountain';
    }
    if (h > 0.78 && t < 0.30) return 'deep_snow';
    if (h > 0.75) return t < 0.25 ? 'snow_mountain' : 'mountain';

    // ── HIGH ALTITUDE (h 0.65–0.75) - Dãy núi / Đồi chứa Khoáng sản ──
    if (h >= 0.62) {
        if (t < 0.20 && m < 0.30) return 'crystal';
        if (t > 0.90) return 'infernal';
        return 'hill';
    }

    // ── MID-HIGH (h 0.52–0.62) ──
    if (h >= 0.52) {
        if (m < 0.18) return 'wasteland';
        if (t > 0.85) return 'infernal';
        if (m > 0.55) return 'forest'; // Rừng (Gỗ)
        if (m < 0.35) return 'dirt';
        return 'grass';
    }

    // ── LOWLAND / MIDLAND (h < 0.52) ──

    // Rừng nhiệt đới
    if (m > 0.78 && t > 0.55) return 'jungle';

    // Mushroom
    if (m > 0.82 && t >= 0.40 && t <= 0.70 && h >= 0.45) return 'mushroom';

    // Thảo nguyên hoa
    if (m >= 0.50 && m <= 0.80 && t >= 0.35 && t <= 0.55 && h >= 0.42) return 'flower_meadow';

    if (m >= 0.50 && m <= 0.70 && t < 0.30 && h >= 0.45) return 'maple_grove';
    if (m >= 0.50 && m <= 0.70 && t >= 0.30 && t < 0.50 && h >= 0.45) return 'birch_grove';

    // ── HOT (t > 0.70) ──
    if (t > 0.70) {
        if (m < 0.25) return 'desert';
        if (m < 0.45) return 'savanna';
        return 'grass';
    }

    // ── COLD (t < 0.25) ──
    if (t < 0.25) return 'snow';

    // ── COOL (t 0.25–0.40) ──
    if (t < 0.40) {
        if (m > 0.50) return 'forest';
        return 'dirt';
    }

    // ── TEMPERATE default (Đồng cỏ và Rừng) ──
    if (m > 0.52) return 'forest'; // Đất rừng
    if (m < 0.32) return 'dirt';
    return 'grass'; // Bình nguyên (Lương thực)
}

export function paintTerrain(tiles, cx, cy, radius, tileType) {
    const changed = [];
    const height  = tiles.length;
    const width   = tiles[0].length;
    const r2      = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > r2) continue;
            const tx = cx + dx, ty = cy + dy;
            if (tx < 0 || tx >= width || ty < 0 || ty >= height) continue;
            if (tiles[ty][tx] !== tileType) {
                tiles[ty][tx] = tileType;
                changed.push({ x: tx, y: ty });
            }
        }
    }
    return changed;
}
