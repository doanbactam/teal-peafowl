/**
 * TerrainRenderer — chunk-based GPU-batched tile rendering.
 * Uses RenderTexture for each chunk to minimize draw calls.
 */
import { getTileType } from './TileTypes.js';

const CHUNK_SIZE = 32;

export class TerrainRenderer {
    constructor(scene, worldMap) {
        this.scene    = scene;
        this.worldMap = worldMap;
        /** @type {Map<string, Phaser.GameObjects.Graphics>} */
        this.chunks       = new Map();
        this.dirtyChunks  = new Set();
        this.visibleChunks= new Set();
    }

    renderAll() {
        const { width, height } = this.worldMap;
        const chunksX = Math.ceil(width  / CHUNK_SIZE);
        const chunksY = Math.ceil(height / CHUNK_SIZE);
        for (let cy = 0; cy < chunksY; cy++)
            for (let cx = 0; cx < chunksX; cx++)
                this.renderChunk(cx, cy);
    }

    renderChunk(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        const { tileSize: ts, tiles, width, height } = this.worldMap;
        const chunkPx = CHUNK_SIZE * ts;

        let rt = this.chunks.get(key);
        if (!rt) {
            // Use rigorous RenderTexture sizing
            rt = this.scene.add.renderTexture(chunkX * chunkPx, chunkY * chunkPx, chunkPx, chunkPx);
            rt.setOrigin(0, 0);
            rt.setDepth(0);
            this.chunks.set(key, rt);
        }
        rt.clear();

        if (!this._tempGfx) {
            // Hidden graphic object used purely as a stencil
            this._tempGfx = this.scene.add.graphics();
            this._tempGfx.setVisible(false);
        }
        const gfx = this._tempGfx;
        gfx.clear();
        const startX = chunkX * CHUNK_SIZE;
        const startY = chunkY * CHUNK_SIZE;
        const endX   = Math.min(startX + CHUNK_SIZE, width);
        const endY   = Math.min(startY + CHUNK_SIZE, height);

        // Batch by z-index then tile type
        const zBatches = new Map();
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const typeKey = tiles[y][x];
                const tileType = getTileType(typeKey);
                const z = tileType.z || 0;
                
                if (!zBatches.has(z)) zBatches.set(z, new Map());
                const typeBatches = zBatches.get(z);
                if (!typeBatches.has(typeKey)) typeBatches.set(typeKey, []);
                typeBatches.get(typeKey).push({ x, y });
            }
        }

        // Draw from lowest Z to highest Z
        const sortedZ = Array.from(zBatches.keys()).sort((a, b) => a - b);
        
        for (const z of sortedZ) {
            const typeBatches = zBatches.get(z);
            
            // Draw drop shadows for z >= 4 (forests, hills, mountains)
            if (z >= 4) {
                gfx.fillStyle(0x000000, 0.25);
                const shadowOffset = (z - 3) * 0.1 * ts; // Depth scaling shadow
                for (const [typeKey, rects] of typeBatches) {
                    for (const r of rects) {
                        gfx.fillRect(r.x * ts + shadowOffset, r.y * ts + shadowOffset * 1.5, ts, ts);
                    }
                }
            }

            // Draw actual tiles with biome-specific details
            for (const [typeKey, rects] of typeBatches) {
                const typeDef = getTileType(typeKey);
                gfx.fillStyle(typeDef.color, 1);
                
                for (const r of rects) {
                    const vx = r.x * ts;
                    const vy = r.y * ts;
                    gfx.fillRect(vx, vy, ts, ts);

                    // --- Stylized Vector Pixel Art Environment ---
                    if (typeKey === 'forest') {
                        // Rừng rậm: Kết hợp thân cây gỗ và tán lá xum xuê nhiều vòng tròn
                        const isPine = (r.x * 3 ^ r.y * 5) % 3 === 0;
                        const forestVar = (r.x * 7 ^ r.y * 3) % 12;
                        if (isPine) {
                            // Cây thông (Pine)
                            gfx.fillStyle(0x3e2723, 1); // Thân cây
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.6, ts*0.2, ts*0.4);
                            gfx.fillStyle(0x1a4529, 1); // Lá thông
                            gfx.fillTriangle(vx + ts*0.5, vy, vx + ts*0.1, vy + ts*0.7, vx + ts*0.9, vy + ts*0.7);
                            gfx.fillStyle(0x13331e, 1); // Đổ bóng lá
                            gfx.fillTriangle(vx + ts*0.5, vy, vx + ts*0.1, vy + ts*0.7, vx + ts*0.5, vy + ts*0.7);
                        } else {
                            // Cây cổ thụ (Oak/Canopy)
                            gfx.fillStyle(0x4e342e, 1); // Thân cây
                            gfx.fillRect(vx + ts*0.45, vy + ts*0.5, ts*0.1, ts*0.5);
                            gfx.fillStyle(0x27ae60, 1); // Tán lá
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.3, ts*0.35);
                            gfx.fillCircle(vx + ts*0.25, vy + ts*0.4, ts*0.25);
                            gfx.fillCircle(vx + ts*0.75, vy + ts*0.4, ts*0.25);
                        }
                        // Thêm nấm và mâm xôi
                        if (forestVar === 0) {
                            gfx.fillStyle(0xe74c3c, 0.9); // Nấm đỏ
                            gfx.fillCircle(vx + ts*0.7, vy + ts*0.8, ts*0.08);
                            gfx.fillStyle(0xffffff, 0.7);
                            gfx.fillRect(vx + ts*0.68, vy + ts*0.73, ts*0.04, ts*0.04);
                        } else if (forestVar === 1) {
                            gfx.fillStyle(0xc0392b, 0.8); // Berry bush
                            gfx.fillCircle(vx + ts*0.2, vy + ts*0.7, ts*0.06);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.75, ts*0.06);
                            gfx.fillCircle(vx + ts*0.25, vy + ts*0.65, ts*0.06);
                        }
                    } else if (typeKey === 'grass') {
                        // Điểm xuyết các cụm cỏ cao (Tall grass) hoặc hoa
                        const detail = (r.x * 7 ^ r.y * 11) % 12;
                        if (detail === 0) {
                            // Cụm hoa đỏ
                            gfx.fillStyle(0xe74c3c, 1);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.5, ts*0.1);
                            gfx.fillCircle(vx + ts*0.6, vy + ts*0.7, ts*0.1);
                        } else if (detail === 1) {
                            // Hoa vàng
                            gfx.fillStyle(0xf1c40f, 0.9);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.4, ts*0.08);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.6, ts*0.06);
                        } else if (detail === 2) {
                            // Hoa tím
                            gfx.fillStyle(0x9b59b6, 0.8);
                            gfx.fillCircle(vx + ts*0.6, vy + ts*0.3, ts*0.07);
                            gfx.fillCircle(vx + ts*0.4, vy + ts*0.7, ts*0.07);
                        } else if (detail === 3) {
                            // Hoa trắng
                            gfx.fillStyle(0xffffff, 0.7);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.5, ts*0.06);
                            gfx.fillCircle(vx + ts*0.7, vy + ts*0.3, ts*0.05);
                        } else if (detail < 5) {
                            // Bụi cỏ vươn cao
                            gfx.fillStyle(0x228b22, 0.6);
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.4, ts*0.1, ts*0.4);
                            gfx.fillRect(vx + ts*0.3, vy + ts*0.5, ts*0.1, ts*0.3);
                            gfx.fillRect(vx + ts*0.7, vy + ts*0.3, ts*0.1, ts*0.5);
                        }
                    }
                    else if (typeKey === 'mountain') {
                        // Tăng độ gồ ghề cho ngọn núi đá (Rocky Peaks)
                        gfx.fillStyle(0x565f6e, 1); // Đá tối
                        gfx.fillTriangle(vx + ts*0.1, vy + ts, vx + ts*0.5, vy + ts*0.1, vx + ts*0.9, vy + ts);
                        gfx.fillStyle(0x7c8799, 1); // Đá bắt sáng
                        gfx.fillTriangle(vx + ts*0.1, vy + ts, vx + ts*0.5, vy + ts*0.1, vx + ts*0.5, vy + ts);
                        // Điểm nhấn sườn gãy
                        gfx.fillStyle(0x424953, 1);
                        gfx.fillTriangle(vx + ts*0.6, vy + ts, vx + ts*0.75, vy + ts*0.4, vx + ts*0.9, vy + ts);
                    }
                    else if (typeKey === 'snow_mountain') {
                        // Đỉnh núi khuất trong tuyết băng
                        gfx.fillStyle(0x8a95a8, 1); // Rock base shadow
                        gfx.fillTriangle(vx + ts*0.1, vy + ts, vx + ts*0.5, vy, vx + ts*0.9, vy + ts);
                        gfx.fillStyle(0xa6b1c4, 1); // Rock base light
                        gfx.fillTriangle(vx + ts*0.1, vy + ts, vx + ts*0.5, vy, vx + ts*0.5, vy + ts);
                        
                        gfx.fillStyle(0xffffff, 0.95); // Lớp tuyết dày bao phủ đỉnh chóp
                        gfx.fillTriangle(vx + ts*0.3, vy + ts*0.5, vx + ts*0.5, vy, vx + ts*0.7, vy + ts*0.5);
                        // Tuyết chảy rủ xuống sườn
                        gfx.fillCircle(vx + ts*0.35, vy + ts*0.5, ts*0.15);
                        gfx.fillCircle(vx + ts*0.65, vy + ts*0.5, ts*0.15);
                    }
                    else if (typeKey === 'hill') {
                        // Đồi đá / Khoáng sản: Cơ sở nền đồi
                        gfx.fillStyle(0x4a6345, 1); 
                        gfx.fillCircle(vx + ts*0.5, vy + ts*0.6, ts*0.35);
                        
                        const hillVar = (r.x * 7 ^ r.y * 3) % 4;
                        if (hillVar === 0) {
                            // Đá Cuội lớn
                            gfx.fillStyle(0x7f8c8d, 1); // Xám xỉn
                            gfx.fillCircle(vx + ts*0.4, vy + ts*0.5, ts*0.2);
                            gfx.fillCircle(vx + ts*0.6, vy + ts*0.6, ts*0.15);
                        } else if (hillVar === 1) {
                            // Mỏ quặng Sắt (vệt sậm/gỉ sét)
                            gfx.fillStyle(0x555555, 1); // Đá đen
                            gfx.fillRect(vx + ts*0.3, vy + ts*0.4, ts*0.4, ts*0.3);
                            gfx.fillStyle(0xc0392b, 0.7); // Vết gỉ sét
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.5, ts*0.2, ts*0.15);
                        } else if (hillVar === 2) {
                            // Mỏ quặng Đồng (vệt cam nhạt)
                            gfx.fillStyle(0x8a6b4e, 1); // Đá nâu
                            gfx.fillTriangle(vx + ts*0.2, vy + ts*0.7, vx + ts*0.5, vy + ts*0.3, vx + ts*0.8, vy + ts*0.7);
                            gfx.fillStyle(0xd35400, 0.8); // Vệt quặng đồng
                            gfx.fillRect(vx + ts*0.45, vy + ts*0.5, ts*0.1, ts*0.15);
                        } else {
                            // Cụm đá nhỏ
                            gfx.fillStyle(0x95a5a6, 1); // Sáng màu
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.5, ts*0.15, ts*0.15);
                            gfx.fillRect(vx + ts*0.6, vy + ts*0.6, ts*0.1, ts*0.1);
                        }
                    }
                    else if (typeKey === 'snow') {
                        // Tuyết: Icicles và snowman hiếm
                        const snowVar = (r.x * 9 ^ r.y * 5) % 15;
                        if (snowVar === 0) {
                            // Snowman hiếm
                            gfx.fillStyle(0xffffff, 0.95);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.6, ts*0.2);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.35, ts*0.15);
                            // Mắt than
                            gfx.fillStyle(0x000000, 0.9);
                            gfx.fillRect(vx + ts*0.44, vy + ts*0.3, ts*0.05, ts*0.05);
                            gfx.fillRect(vx + ts*0.52, vy + ts*0.3, ts*0.05, ts*0.05);
                            // Mũi cà rốt
                            gfx.fillStyle(0xe67e22, 0.9);
                            gfx.fillRect(vx + ts*0.48, vy + ts*0.36, ts*0.12, ts*0.03);
                        } else if (snowVar < 4) {
                            // Icicles
                            gfx.fillStyle(0xd0e8f5, 0.6);
                            gfx.fillRect(vx + ts*0.3, vy, ts*0.06, ts*0.3);
                            gfx.fillRect(vx + ts*0.6, vy, ts*0.06, ts*0.2);
                        }
                    }
                    else if (typeKey === 'sand' || typeKey === 'desert') {
                        // Cồn cát lượn sóng (Dunes)
                        const duneVal = (r.x * 5 ^ r.y * 7) % 5;
                        if (duneVal === 0) {
                            // Cây xương rồng nhỏ mọc lác đác
                            gfx.fillStyle(0x2d5a27, 1);
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.4, ts*0.15, ts*0.5); 
                            gfx.fillRect(vx + ts*0.25, vy + ts*0.5, ts*0.15, ts*0.1); 
                            gfx.fillRect(vx + ts*0.55, vy + ts*0.6, ts*0.15, ts*0.1);
                        } else if (duneVal < 3) {
                            // Rãnh cồn cát
                            gfx.fillStyle(0xcca343, 0.4);
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.6, ts*0.5, ts*0.1);
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.7, ts*0.4, ts*0.1);
                        }
                    }
                    else if (typeKey === 'swamp') {
                        // Đầm lầy: Súng nước và bèo
                        const swampDetail = (r.x * 3 ^ r.y * 7) % 6;
                        if (swampDetail === 0) {
                            // Súng (lily pad)
                            gfx.fillStyle(0x1a6b37, 0.8);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.5, ts*0.25);
                            gfx.fillStyle(0x27ae60, 0.6);
                            gfx.fillCircle(vx + ts*0.35, vy + ts*0.4, ts*0.15);
                        } else if (swampDetail === 1) {
                            // Cỏ đầm lầy
                            gfx.fillStyle(0x2d5a27, 0.7);
                            gfx.fillRect(vx + ts*0.3, vy + ts*0.3, ts*0.1, ts*0.5);
                            gfx.fillRect(vx + ts*0.5, vy + ts*0.4, ts*0.1, ts*0.4);
                            gfx.fillRect(vx + ts*0.7, vy + ts*0.35, ts*0.1, ts*0.45);
                        } else if (swampDetail === 2) {
                            // Vũng nước đục
                            gfx.fillStyle(0x1a3a2a, 0.4);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.6, ts*0.3);
                        }
                    }
                    else if (typeKey === 'lava') {
                        // Dung nham: Vết nứt phát sáng và bọt
                        const lavaDetail = (r.x * 11 ^ r.y * 3) % 5;
                        // Vết nứt sáng
                        gfx.fillStyle(0xff6600, 0.8);
                        if (lavaDetail === 0) {
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.3, ts*0.6, ts*0.1);
                            gfx.fillRect(vx + ts*0.5, vy + ts*0.3, ts*0.1, ts*0.4);
                        } else if (lavaDetail === 1) {
                            gfx.fillRect(vx + ts*0.1, vy + ts*0.6, ts*0.8, ts*0.1);
                        } else if (lavaDetail === 2) {
                            // Bọt sáng
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.5, ts*0.15);
                            gfx.fillStyle(0xffaa00, 0.6);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.7, ts*0.1);
                        }
                        // Viền cháy xém
                        gfx.fillStyle(0x331100, 0.3);
                        gfx.fillRect(vx, vy, ts, ts*0.15);
                    }
                    else if (typeKey === 'burned') {
                        // Đất cháy: Cây chết và tro
                        const burnDetail = (r.x * 7 ^ r.y * 13) % 5;
                        if (burnDetail === 0) {
                            // Cây chết (cháy đen)
                            gfx.fillStyle(0x1a1a1a, 0.9);
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.5, ts*0.15, ts*0.4);
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.3, ts*0.1, ts*0.2);
                        } else if (burnDetail === 1) {
                            // Mảng tro
                            gfx.fillStyle(0x444444, 0.3);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.5, ts*0.25);
                        } else if (burnDetail === 2) {
                            // Tàn dư than
                            gfx.fillStyle(0x222222, 0.5);
                            gfx.fillRect(vx + ts*0.3, vy + ts*0.6, ts*0.2, ts*0.15);
                            gfx.fillRect(vx + ts*0.6, vy + ts*0.4, ts*0.15, ts*0.2);
                        }
                    }
                    else if (typeKey === 'dirt') {
                        // Đất trống: Sỏi và rễ cây
                        const dirtDetail = (r.x * 5 ^ r.y * 11) % 6;
                        if (dirtDetail === 0) {
                            // Hòn sỏi
                            gfx.fillStyle(0x9e9e9e, 0.7);
                            gfx.fillCircle(vx + ts*0.6, vy + ts*0.7, ts*0.1);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.5, ts*0.08);
                        } else if (dirtDetail === 1) {
                            // Rễ cây
                            gfx.fillStyle(0x5a3a1a, 0.5);
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.4, ts*0.6, ts*0.08);
                            gfx.fillRect(vx + ts*0.5, vy + ts*0.4, ts*0.08, ts*0.3);
                        } else if (dirtDetail === 2) {
                            // Đất xốp
                            gfx.fillStyle(0x7a5a31, 0.3);
                            gfx.fillCircle(vx + ts*0.4, vy + ts*0.6, ts*0.15);
                        }
                    }
                    else if (typeKey === 'ice') {
                        // Băng: Vết nứt và bề mặt đóng băng
                        const iceDetail = (r.x * 3 ^ r.y * 5) % 5;
                        gfx.fillStyle(0xffffff, 0.3);
                        if (iceDetail === 0) {
                            // Vết nứt băng
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.3, ts*0.4, ts*0.06);
                            gfx.fillRect(vx + ts*0.5, vy + ts*0.3, ts*0.06, ts*0.4);
                            gfx.fillRect(vx + ts*0.3, vy + ts*0.6, ts*0.5, ts*0.06);
                        } else if (iceDetail === 1) {
                            // Tinh thể băng sáng
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.5, ts*0.12);
                        } else if (iceDetail === 2) {
                            // Mảng băng mờ
                            gfx.fillStyle(0xd0e8f5, 0.3);
                            gfx.fillRect(vx + ts*0.1, vy + ts*0.1, ts*0.35, ts*0.35);
                        }
                    }
                    else if (typeKey === 'jungle') {
                        // Rừng rậm nhiệt đới: Cọ và dây leo
                        const jVar = (r.x * 7 ^ r.y * 3) % 6;
                        if (jVar === 0) {
                            // Cây cọ (palm tree)
                            gfx.fillStyle(0x5d4037, 1);
                            gfx.fillRect(vx + ts*0.45, vy + ts*0.3, ts*0.1, ts*0.7);
                            gfx.fillStyle(0x2e7d32, 1);
                            gfx.fillTriangle(vx + ts*0.5, vy, vx + ts*0.1, vy + ts*0.35, vx + ts*0.9, vy + ts*0.35);
                            gfx.fillTriangle(vx + ts*0.5, vy + ts*0.05, vx + ts*0.15, vy + ts*0.4, vx + ts*0.85, vy + ts*0.4);
                        } else if (jVar < 3) {
                            // Dây leo (vines)
                            gfx.fillStyle(0x1b5e20, 0.6);
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.1, ts*0.06, ts*0.6);
                            gfx.fillRect(vx + ts*0.7, vy + ts*0.2, ts*0.06, ts*0.5);
                            gfx.fillStyle(0x388e3c, 0.4);
                            gfx.fillCircle(vx + ts*0.2, vy + ts*0.1, ts*0.08);
                            gfx.fillCircle(vx + ts*0.7, vy + ts*0.2, ts*0.08);
                        }
                    }
                    else if (typeKey === 'savanna') {
                        // Xavan: Cỏ cao thưa và cây keo
                        const sVar = (r.x * 5 ^ r.y * 9) % 7;
                        if (sVar === 0) {
                            // Cây keo (acacia) nhỏ
                            gfx.fillStyle(0x5d4037, 1);
                            gfx.fillRect(vx + ts*0.45, vy + ts*0.5, ts*0.1, ts*0.5);
                            gfx.fillStyle(0x8d6e37, 0.9);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.4, ts*0.3);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.5, ts*0.2);
                            gfx.fillCircle(vx + ts*0.7, vy + ts*0.5, ts*0.2);
                        } else if (sVar < 4) {
                            // Cỏ cao thưa
                            gfx.fillStyle(0xb8a930, 0.5);
                            gfx.fillRect(vx + ts*0.3, vy + ts*0.4, ts*0.06, ts*0.4);
                            gfx.fillRect(vx + ts*0.5, vy + ts*0.5, ts*0.06, ts*0.3);
                            gfx.fillRect(vx + ts*0.7, vy + ts*0.35, ts*0.06, ts*0.45);
                        }
                    }
                    else if (typeKey === 'crystal') {
                        // Pha lê: Hình gem + tia sáng
                        const cVar = (r.x * 11 ^ r.y * 3) % 5;
                        // Crystal triangle
                        gfx.fillStyle(0xbb86fc, 0.8);
                        gfx.fillTriangle(vx + ts*0.5, vy + ts*0.15, vx + ts*0.3, vy + ts*0.7, vx + ts*0.7, vy + ts*0.7);
                        gfx.fillStyle(0xce93d8, 0.6);
                        gfx.fillTriangle(vx + ts*0.5, vy + ts*0.15, vx + ts*0.5, vy + ts*0.7, vx + ts*0.7, vy + ts*0.7);
                        // Tia sáng (sparkle dots)
                        if (cVar < 2) {
                            gfx.fillStyle(0xffffff, 0.7);
                            gfx.fillRect(vx + ts*0.45, vy + ts*0.3, ts*0.1, ts*0.06);
                            gfx.fillRect(vx + ts*0.47, vy + ts*0.28, ts*0.06, ts*0.1);
                        }
                    }
                    else if (typeKey === 'candy') {
                        // Kẹo ngọt: Kẹo mút và kẹo gậy
                        const cVar = (r.x * 3 ^ r.y * 7) % 6;
                        if (cVar === 0) {
                            // Kẹo mút (lollipop)
                            gfx.fillStyle(0xffffff, 1);
                            gfx.fillRect(vx + ts*0.45, vy + ts*0.5, ts*0.1, ts*0.5);
                            gfx.fillStyle(0xe91e63, 1);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.35, ts*0.2);
                            gfx.fillStyle(0xf48fb1, 0.6);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.35, ts*0.12);
                        } else if (cVar === 1) {
                            // Kẹo gậy sọc (candy cane)
                            gfx.fillStyle(0xffffff, 0.9);
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.2, ts*0.2, ts*0.7);
                            gfx.fillStyle(0xe74c3c, 0.8);
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.25, ts*0.2, ts*0.1);
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.45, ts*0.2, ts*0.1);
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.65, ts*0.2, ts*0.1);
                        }
                    }
                    else if (typeKey === 'mushroom') {
                        // Nấm: Mũ nấm bán nguyệt + chấm trắng
                        const mVar = (r.x * 5 ^ r.y * 11) % 5;
                        gfx.fillStyle(0xd4a04a, 1); // Thân nấm
                        gfx.fillRect(vx + ts*0.4, vy + ts*0.55, ts*0.2, ts*0.35);
                        gfx.fillStyle(0xd32f2f, 1); // Mũ nấm đỏ
                        gfx.fillCircle(vx + ts*0.5, vy + ts*0.5, ts*0.3);
                        gfx.fillCircle(vx + ts*0.25, vy + ts*0.55, ts*0.18);
                        gfx.fillCircle(vx + ts*0.75, vy + ts*0.55, ts*0.18);
                        // Chấm trắng trên mũ
                        if (mVar < 3) {
                            gfx.fillStyle(0xffffff, 0.8);
                            gfx.fillCircle(vx + ts*0.4, vy + ts*0.4, ts*0.05);
                            gfx.fillCircle(vx + ts*0.6, vy + ts*0.42, ts*0.04);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.32, ts*0.04);
                        }
                    }
                    else if (typeKey === 'corrupted') {
                        // Ô nhiễm: Hộp sọ và hào quang tà
                        const crVar = (r.x * 13 ^ r.y * 5) % 7;
                        if (crVar === 0) {
                            // Hộp sọ nhỏ
                            gfx.fillStyle(0x5c2d6e, 0.9);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.4, ts*0.2);
                            gfx.fillRect(vx + ts*0.35, vy + ts*0.5, ts*0.3, ts*0.15);
                            gfx.fillStyle(0x2c1338, 1);
                            gfx.fillCircle(vx + ts*0.42, vy + ts*0.38, ts*0.05);
                            gfx.fillCircle(vx + ts*0.58, vy + ts*0.38, ts*0.05);
                        } else if (crVar < 4) {
                            // Hạt tà ma (wisps)
                            gfx.fillStyle(0x7b1fa2, 0.5);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.3, ts*0.06);
                            gfx.fillCircle(vx + ts*0.7, vy + ts*0.6, ts*0.05);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.2, ts*0.04);
                        }
                    }
                    else if (typeKey === 'infernal') {
                        // Hỏa ngục: Lửa và tro tàn
                        const iVar = (r.x * 7 ^ r.y * 3) % 6;
                        if (iVar < 3) {
                            // Lửa (flame tendrils)
                            gfx.fillStyle(0xff6600, 0.8);
                            gfx.fillTriangle(vx + ts*0.3, vy + ts*0.7, vx + ts*0.4, vy + ts*0.2, vx + ts*0.5, vy + ts*0.7);
                            gfx.fillTriangle(vx + ts*0.5, vy + ts*0.8, vx + ts*0.6, vy + ts*0.3, vx + ts*0.7, vy + ts*0.8);
                            gfx.fillStyle(0xffaa00, 0.6);
                            gfx.fillTriangle(vx + ts*0.35, vy + ts*0.7, vx + ts*0.42, vy + ts*0.35, vx + ts*0.48, vy + ts*0.7);
                        } else if (iVar < 5) {
                            // Tàn tro (ember particles)
                            gfx.fillStyle(0xff4400, 0.6);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.4, ts*0.04);
                            gfx.fillCircle(vx + ts*0.6, vy + ts*0.3, ts*0.03);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.6, ts*0.05);
                        }
                    }
                    else if (typeKey === 'wasteland') {
                        // Hoang mạc: Vết nứt và cành khô
                        const wVar = (r.x * 3 ^ r.y * 11) % 7;
                        if (wVar === 0) {
                            // Cành khô (dead twigs)
                            gfx.fillStyle(0x3e2e1a, 0.7);
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.5, ts*0.5, ts*0.06);
                            gfx.fillRect(vx + ts*0.5, vy + ts*0.4, ts*0.06, ts*0.2);
                            gfx.fillRect(vx + ts*0.3, vy + ts*0.35, ts*0.06, ts*0.15);
                        } else if (wVar < 4) {
                            // Vết nứt đất (cracks)
                            gfx.fillStyle(0x2a2a1a, 0.5);
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.4, ts*0.5, ts*0.05);
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.55, ts*0.4, ts*0.05);
                        }
                    }
                    else if (typeKey === 'birch_grove') {
                        // Rừng bạch dương: Thân trắng + vết ngang đen
                        const bVar = (r.x * 5 ^ r.y * 7) % 5;
                        if (bVar < 3) {
                            // Thân cây bạch dương
                            gfx.fillStyle(0xf5f5dc, 1);
                            gfx.fillRect(vx + ts*0.42, vy + ts*0.2, ts*0.16, ts*0.8);
                            // Vết ngang đen đặc trưng
                            gfx.fillStyle(0x333333, 0.8);
                            gfx.fillRect(vx + ts*0.42, vy + ts*0.35, ts*0.16, ts*0.04);
                            gfx.fillRect(vx + ts*0.42, vy + ts*0.55, ts*0.16, ts*0.04);
                            gfx.fillRect(vx + ts*0.42, vy + ts*0.75, ts*0.16, ts*0.04);
                            // Tán lá mỏng
                            gfx.fillStyle(0x66bb6a, 0.6);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.15, ts*0.2);
                        }
                    }
                    else if (typeKey === 'maple_grove') {
                        // Rừng phong: Lá phong đỏ
                        const mVar = (r.x * 7 ^ r.y * 5) % 6;
                        if (mVar < 3) {
                            // Thân cây
                            gfx.fillStyle(0x5d4037, 1);
                            gfx.fillRect(vx + ts*0.45, vy + ts*0.5, ts*0.1, ts*0.5);
                            // Tán lá phong đỏ
                            gfx.fillStyle(0xe74c3c, 0.9);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.3, ts*0.25);
                            gfx.fillStyle(0xc0392b, 0.7);
                            gfx.fillCircle(vx + ts*0.35, vy + ts*0.4, ts*0.18);
                            gfx.fillCircle(vx + ts*0.65, vy + ts*0.4, ts*0.18);
                        } else if (mVar < 5) {
                            // Lá rơi (fallen leaf shape)
                            gfx.fillStyle(0xe67e22, 0.6);
                            gfx.fillTriangle(vx + ts*0.5, vy + ts*0.3, vx + ts*0.3, vy + ts*0.7, vx + ts*0.7, vy + ts*0.7);
                        }
                    }
                    else if (typeKey === 'flower_meadow') {
                        // Đồng hoa: Chấm hoa nhiều màu
                        const fVar = (r.x * 11 ^ r.y * 3) % 8;
                        if (fVar < 2) {
                            // Hoa hồng
                            gfx.fillStyle(0xff69b4, 0.9);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.5, ts*0.07);
                            gfx.fillCircle(vx + ts*0.7, vy + ts*0.4, ts*0.06);
                        } else if (fVar < 4) {
                            // Hoa vàng
                            gfx.fillStyle(0xf1c40f, 0.9);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.4, ts*0.06);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.7, ts*0.05);
                        } else if (fVar < 6) {
                            // Hoa xanh
                            gfx.fillStyle(0x3498db, 0.8);
                            gfx.fillCircle(vx + ts*0.6, vy + ts*0.6, ts*0.06);
                            gfx.fillCircle(vx + ts*0.4, vy + ts*0.3, ts*0.05);
                        }
                    }
                    else if (typeKey === 'celestial') {
                        // Thiên giới: Ngôi sao và hào quang
                        const celVar = (r.x * 3 ^ r.y * 7) % 5;
                        if (celVar === 0) {
                            // Ngôi sao nhỏ
                            gfx.fillStyle(0xffffff, 0.9);
                            gfx.fillRect(vx + ts*0.45, vy + ts*0.2, ts*0.1, ts*0.6);
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.45, ts*0.6, ts*0.1);
                            gfx.fillStyle(0xfff9c4, 0.5);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.5, ts*0.2);
                        } else if (celVar < 3) {
                            // Hào quang (glow)
                            gfx.fillStyle(0xffffff, 0.3);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.5, ts*0.15);
                            gfx.fillStyle(0xfff9c4, 0.2);
                            gfx.fillCircle(vx + ts*0.5, vy + ts*0.5, ts*0.25);
                        }
                    }
                    else if (typeKey === 'deep_snow') {
                        // Tuyết sâu: Drift patterns, ít decoration
                        const dsVar = (r.x * 5 ^ r.y * 9) % 6;
                        if (dsVar === 0) {
                            // Tuyết lượn sóng (drift curves)
                            gfx.fillStyle(0xecf0f1, 0.6);
                            gfx.fillCircle(vx + ts*0.3, vy + ts*0.7, ts*0.2);
                            gfx.fillCircle(vx + ts*0.7, vy + ts*0.5, ts*0.25);
                        } else if (dsVar < 3) {
                            // Vết tuyết lấp lánh
                            gfx.fillStyle(0xffffff, 0.4);
                            gfx.fillRect(vx + ts*0.3, vy + ts*0.4, ts*0.15, ts*0.08);
                            gfx.fillRect(vx + ts*0.6, vy + ts*0.6, ts*0.12, ts*0.06);
                        }
                    }
                    else if (typeKey === 'permafrost') {
                        // Permafrost: Tinh thể băng + vết đóng băng
                        const pVar = (r.x * 7 ^ r.y * 3) % 5;
                        if (pVar === 0) {
                            // Tinh thể băng lớn
                            gfx.fillStyle(0xe0e8ef, 0.7);
                            gfx.fillTriangle(vx + ts*0.5, vy + ts*0.15, vx + ts*0.25, vy + ts*0.8, vx + ts*0.75, vy + ts*0.8);
                            gfx.fillStyle(0xffffff, 0.4);
                            gfx.fillTriangle(vx + ts*0.5, vy + ts*0.15, vx + ts*0.5, vy + ts*0.8, vx + ts*0.75, vy + ts*0.8);
                        } else if (pVar < 3) {
                            // Vết đóng băng (frozen texture lines)
                            gfx.fillStyle(0xdce6f0, 0.5);
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.35, ts*0.4, ts*0.05);
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.55, ts*0.4, ts*0.05);
                        }
                    }
                    else if (typeKey === 'road') {
                        // Đường đi: Vệt nâu nhạt
                        gfx.fillStyle(0x9e8b6e, 0.5);
                        gfx.fillRect(vx + ts*0.15, vy + ts*0.15, ts*0.7, ts*0.7);
                        // Vệt bánh xe
                        gfx.fillStyle(0x7a6a50, 0.3);
                        gfx.fillRect(vx + ts*0.2, vy + ts*0.35, ts*0.6, ts*0.06);
                        gfx.fillRect(vx + ts*0.2, vy + ts*0.6, ts*0.6, ts*0.06);
                    }
                }
            }
        }

        // Draw animated sparkles and coastal foam lines
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = tiles[y][x];
                const vx = x * ts;
                const vy = y * ts;
                
                // Coastal Foam for shallow water adjacent to land
                if (tile === 'shallow_water') {
                    const checkLand = (nx, ny) => {
                        if (nx>=0 && nx<width && ny>=0 && ny<height) {
                            return getTileType(tiles[ny][nx]).z >= 2; // Sand has z=2
                        }
                        return false;
                    };
                    
                    gfx.fillStyle(0xffffff, 0.35);
                    if (checkLand(x, y - 1)) gfx.fillRect(vx, vy, ts, ts * 0.2); // Top coast
                    if (checkLand(x, y + 1)) gfx.fillRect(vx, vy + ts * 0.8, ts, ts * 0.2); // Bottom coast
                    if (checkLand(x - 1, y)) gfx.fillRect(vx, vy, ts * 0.2, ts); // Left coast
                    if (checkLand(x + 1, y)) gfx.fillRect(vx + ts * 0.8, vy, ts * 0.2, ts); // Right coast
                }

                // Sparkles / subtle texture for water and ice
                if (tile === 'deep_water' || tile === 'shallow_water' || tile === 'ice') {
                    const magic = (x * 19 ^ y * 11) % 13;
                    if (tile === 'ice' && magic === 0) {
                        gfx.fillStyle(0xffffff, 0.25);
                        gfx.fillRect(vx + ts*0.3, vy + ts*0.3, ts*0.2, ts*0.15);    
                    } else if ((tile === 'deep_water' || tile === 'shallow_water') && magic < 3) {
                        // Vệt gợn sóng (Wind Ripples)
                        gfx.fillStyle(0xffffff, tile === 'deep_water' ? 0.08 : 0.15);
                        if (magic === 0) {
                            gfx.fillRect(vx + ts*0.2, vy + ts*0.4, ts*0.6, ts*0.08);    
                            gfx.fillRect(vx + ts*0.3, vy + ts*0.7, ts*0.4, ts*0.08);
                        } else if (magic === 1) {
                            gfx.fillRect(vx + ts*0.1, vy + ts*0.2, ts*0.4, ts*0.08);
                            gfx.fillRect(vx + ts*0.5, vy + ts*0.5, ts*0.3, ts*0.08);
                        } else if (magic === 2) {
                            gfx.fillRect(vx + ts*0.4, vy + ts*0.8, ts*0.5, ts*0.08);
                        }
                    }
                }
            }
        }

        // Bake graphics into render texture!
        // We shift the drawn world-space geometry back by the chunk origin
        rt.draw(gfx, -chunkX * chunkPx, -chunkY * chunkPx);

        this.dirtyChunks.delete(key);
    }

    markDirty(positions) {
        for (const pos of positions) {
            const cx = Math.floor(pos.x / CHUNK_SIZE);
            const cy = Math.floor(pos.y / CHUNK_SIZE);
            this.dirtyChunks.add(`${cx},${cy}`);
        }
    }

    updateDirty() {
        for (const key of this.dirtyChunks) {
            const comma = key.indexOf(',');
            const cx = parseInt(key.substring(0, comma), 10);
            const cy = parseInt(key.substring(comma + 1), 10);
            this.renderChunk(cx, cy);
        }
        this.dirtyChunks.clear();
    }

    updateVisibility(camera) {
        const ts         = this.worldMap.tileSize;
        const chunkPx    = CHUNK_SIZE * ts;
        const { x: vx, y: vy, width: vw, height: vh } = camera.worldView;

        // Extra padding so chunks load before they enter view
        const pad = 2;
        const left   = Math.max(0, Math.floor(vx / chunkPx) - pad);
        const top    = Math.max(0, Math.floor(vy / chunkPx) - pad);
        const right  = Math.ceil((vx + vw) / chunkPx) + pad;
        const bottom = Math.ceil((vy + vh) / chunkPx) + pad;

        const newVisible = new Set();
        for (let cy = top; cy <= bottom; cy++) {
            for (let cx = left; cx <= right; cx++) {
                const key = `${cx},${cy}`;
                newVisible.add(key);
                const gfx = this.chunks.get(key);
                if (gfx) gfx.setVisible(true);
            }
        }

        for (const key of this.visibleChunks) {
            if (!newVisible.has(key)) {
                const gfx = this.chunks.get(key);
                if (gfx) gfx.setVisible(false);
            }
        }
        this.visibleChunks = newVisible;
    }

    destroy() {
        for (const gfx of this.chunks.values()) gfx.destroy();
        this.chunks.clear();
    }
}
