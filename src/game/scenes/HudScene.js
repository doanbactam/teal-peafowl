import * as Phaser from 'phaser';
import { TOOLS, TOOL_CATEGORIES, getToolsByCategory, getAllCategories } from '../data/tools.js';
import { SettlementManager } from '../entities/Settlement.js';
import { getRace, getAllRaces } from '../data/races.js';
import { TRAITS, POSITIVE_TRAITS, NEGATIVE_TRAITS } from '../data/Traits.js';
import { Minimap } from '../ui/Minimap.js';
import { LAW_CATEGORIES } from '../systems/WorldLawsSystem.js';
import { getRarityColor, MODIFIERS, EQUIPMENT_SLOTS } from '../data/equipment.js';

// ---- UI THEME (Nord-inspired, extended) ----
const THEME = {
    bg: 0x3b4252,
    bgBorder: 0x2e3440,
    bgInner: 0x434c5e,
    btn: 0x4c566a,
    btnHover: 0x5e81ac,
    btnActive: 0x81a1c1,
    highlight: 0x8fbcbb,
    text: '#eceff4',
    gold: '#ebcb8b',
    red: '#bf616a',
    green: '#a3be8c',
    blue: '#81a1c1',
    purple: '#b48ead',
    orange: '#d08770',
    cyan: '#88c0d0',
    shadow: 0x000000,
    panelAlpha: 0.92,
};

const AGE_UI_COLORS = {
    hope:    { hex: 0xa3be8c, css: '#a3be8c', label: '🌿' },
    sun:     { hex: 0xebcb8b, css: '#ebcb8b', label: '☀️' },
    tears:   { hex: 0x81a1c1, css: '#81a1c1', label: '💧' },
    dark:    { hex: 0xb48ead, css: '#b48ead', label: '🌑' },
    chaos:   { hex: 0xbf616a, css: '#bf616a', label: '🔥' },
    ice:     { hex: 0x81a1c1, css: '#81a1c1', label: '❄️' },
    ash:     { hex: 0x8fbcbb, css: '#8fbcbb', label: '🌫️' },
    despair: { hex: 0x4c566a, css: '#4c566a', label: '💀' },
    moon:    { hex: 0xb48ead, css: '#b48ead', label: '🌙' },
    wonders: { hex: 0xebcb8b, css: '#ebcb8b', label: '✨' },
};

const ANIMAL_INFO = {
    sheep:  { icon: '🐑', name: 'Cừu' },
    wolf:   { icon: '🐺', name: 'Sói' },
    bear:   { icon: '🐻', name: 'Gấu' },
    deer:   { icon: '🦌', name: 'Hươu' },
    fish:   { icon: '🐟', name: 'Cá' },
    zombie: { icon: '🧟', name: 'Xác Sống' },
    dragon: { icon: '🐉', name: 'Rồng' },
    cow:    { icon: '🐄', name: 'Bò' },
    pig:    { icon: '🐷', name: 'Heo' },
    rabbit: { icon: '🐰', name: 'Thỏ' },
    chicken:{ icon: '🐔', name: 'Gà' },
    fox:    { icon: '🦊', name: 'Cáo' },
    lion:   { icon: '🦁', name: 'Sư Tử' },
    crocodile:{ icon: '🐊', name: 'Cá Sấu' },
    snake:  { icon: '🐍', name: 'Rắn' },
    crab:   { icon: '🦀', name: 'Cua' },
    monkey: { icon: '🐒', name: 'Khỉ' },
    rat:    { icon: '🐀', name: 'Chuột' },
    crabzilla:{ icon: '🦀', name: 'Cua Khổng Lồ' },
    ufo:    { icon: '🛸', name: 'Đĩa Bay UFO' },
};

const STATE_LABELS = {
    idle: '😴 Nghỉ ngơi',
    moving: '🚶 Di chuyển',
    gathering: '⛏️ Thu thập',
    fighting: '⚔️ Chiến đấu',
    building: '🔨 Xây dựng',
    fleeing: '🏃 Bỏ chạy',
    dead: '💀 Đã chết',
};

const BRUSH_PRESETS = [
    { size: 1, label: '◉', name: 'Nhỏ' },
    { size: 2, label: '⬤', name: 'Vừa' },
    { size: 4, label: '🔴', name: 'Lớn' },
];

export class HudScene extends Phaser.Scene {
    constructor() {
        super('HudScene');
    }

    init(data) {
        this.gameSceneRef = data.gameScene;
    }

    _playClick() {
        if (this.gameSceneRef && this.gameSceneRef.soundSystem) {
            this.gameSceneRef.soundSystem.playClick();
        }
    }

    create() {
        this.w = this.scale.width;
        this.h = this.scale.height;

        this.selectedToolId = 'inspect';
        this.activeCategory = null;
        this._prevAgeId = null;
        this._hoverGlows = [];

        // Population history for world stats graph
        this.popHistory = new Map();
        this._histSampleTick = 0;
        this._maxHistSamples = 60;

        // Main containers
        this.bottomBarContainer = this.add.container(0, 0);
        this.toolPanelContainer = this.add.container(0, 0);
        this.topPanelContainer = this.add.container(0, 0);
        this.inspectPanelContainer = this.add.container(0, 0);
        this.brushSizeContainer = this.add.container(0, 0);

        // Overlay containers (drawn last so they're on top)
        this.worldStatsContainer = this.add.container(0, 0);
        this.worldStatsContainer.setVisible(false);
        this.shortcutsContainer = this.add.container(0, 0);
        this.shortcutsContainer.setVisible(false);
        this.diplomacyPanelContainer = this.add.container(0, 0);
        this.diplomacyPanelContainer.setVisible(false);
        this.worldLawsContainer = this.add.container(0, 0);
        this.worldLawsContainer.setVisible(false);
        this.historyContainer = this.add.container(0, 0);
        this.historyContainer.setVisible(false);

        this.createBottomBar();
        this.createBrushSizeControl();
        this.createTopPanel();
        this.createInspectPanel();
        this.createMinimap();
        this.createWorldStatsPanel();
        this.createShortcutsPanel();

        this.notificationText = null;
        this._pausePulseTween = null;

        // Resize event
        this.scale.on('resize', (gameSize) => {
            this.w = gameSize.width;
            this.h = gameSize.height;
            this.repositionUI();
        });

        // Inspect data listener
        this.registry.events.on('changedata-inspectData', (parent, value) => {
            this.updateInspectPanel(value);
        });

        this.registry.events.on('changedata-notification', (parent, value) => {
            if (value) this.showNotification(value);
        });

        // Speed change listener for pulse effect
        this.registry.events.on('changedata-simSpeed', (parent, value) => {
            this.updateSpeedUI(value);
        });

        // Diplomacy panel listener
        this.registry.events.on('changedata-diplomacyTarget', (parent, value) => {
            if (value) this.showDiplomacyPanel(value);
        });

        // World Laws panel listener
        this.registry.events.on('changedata-showWorldLaws', (parent, value) => {
            if (value) {
                this.showWorldLawsPanel();
                this.registry.set('showWorldLaws', false);
            }
        });

        // History panel listener
        this.registry.events.on('changedata-showHistory', (parent, value) => {
            if (value) {
                this.showHistoryPanel();
                this.registry.set('showHistory', false);
            }
        });

        // Default open INSPECT category
        this.toggleCategory(TOOL_CATEGORIES.INSPECT);

        // Update loops
        this.time.addEvent({ delay: 500, callback: this.updateStats, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 200, callback: this.updateMinimap, callbackScope: this, loop: true });
    }

    // ============================================
    // UI BUILDER HELPERS
    // ============================================
    createPanelBg(x, y, width, height, isButton = false, isActive = false) {
        const bg = this.add.graphics();
        this.drawPanel(bg, x, y, width, height, isButton, isActive);
        return bg;
    }

    drawPanel(graphics, x, y, width, height, isButton = false, isActive = false) {
        graphics.clear();
        const mainColor = isActive ? THEME.btnActive : (isButton ? THEME.btn : THEME.bg);

        // Shadow
        graphics.fillStyle(THEME.shadow, 0.5);
        graphics.fillRoundedRect(x + 2, y + 2, width, height, 4);

        // Outer border
        graphics.fillStyle(THEME.bgBorder, 1);
        graphics.fillRoundedRect(x - 2, y - 2, width + 4, height + 4, 4);

        // Main bg
        graphics.fillStyle(mainColor, THEME.panelAlpha);
        graphics.fillRoundedRect(x, y, width, height, 2);

        // Inner highlight (top & left edge for depth)
        graphics.lineStyle(2, isActive ? 0xffffff : THEME.bgInner, isButton ? 0.3 : 0.1);
        graphics.beginPath();
        graphics.moveTo(x, y + height);
        graphics.lineTo(x, y);
        graphics.lineTo(x + width, y);
        graphics.strokePath();
    }

    drawHoverGlow(graphics, x, y, w, h) {
        graphics.clear();
        graphics.fillStyle(THEME.btnHover, 0.15);
        graphics.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 6);
        graphics.lineStyle(1, THEME.btnHover, 0.5);
        graphics.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, 3);
    }

    drawHpBar(x, y, width, current, max, barH = 6) {
        const gr = this.add.graphics();
        const ratio = Math.max(0, Math.min(1, current / max));
        // Background
        gr.fillStyle(0x000000, 0.6);
        gr.fillRoundedRect(x, y, width, barH, 2);
        // HP fill
        const hpColor = ratio > 0.6 ? 0x2ecc71 : ratio > 0.3 ? 0xf39c12 : 0xe74c3c;
        if (ratio > 0) {
            gr.fillStyle(hpColor, 0.9);
            gr.fillRoundedRect(x, y, Math.max(2, width * ratio), barH, 2);
        }
        // Border
        gr.lineStyle(1, 0xffffff, 0.2);
        gr.strokeRoundedRect(x, y, width, barH, 2);
        return gr;
    }

    drawLoyaltyBar(x, y, width, loyalty, barH = 6) {
        const gr = this.add.graphics();
        const ratio = Math.max(0, Math.min(1, loyalty / 100));
        gr.fillStyle(0x000000, 0.6);
        gr.fillRoundedRect(x, y, width, barH, 2);
        const color = loyalty >= 60 ? 0x2ecc71 : loyalty >= 30 ? 0xf39c12 : 0xe74c3c;
        if (ratio > 0) {
            gr.fillStyle(color, 0.9);
            gr.fillRoundedRect(x, y, Math.max(2, width * ratio), barH, 2);
        }
        gr.lineStyle(1, 0xffffff, 0.2);
        gr.strokeRoundedRect(x, y, width, barH, 2);
        return gr;
    }

    // ============================================
    // BOTTOM CATEGORY BAR
    // ============================================
    createBottomBar() {
        const categories = getAllCategories();
        this.categoryBtns = [];

        const btnW = 56;
        const btnH = 50;
        const spacing = 8;
        const totalW = categories.length * btnW + (categories.length - 1) * spacing;

        const startX = this.w / 2 - totalW / 2;
        const startY = this.h - btnH - 10;

        this.bottomBarBg = this.add.graphics();
        this.drawPanel(this.bottomBarBg, startX - 10, startY - 10, totalW + 20, btnH + 20);
        this.bottomBarContainer.add(this.bottomBarBg);

        categories.forEach((cat, index) => {
            const x = startX + index * (btnW + spacing);
            const y = startY;

            const zone = this.add.zone(x + btnW / 2, y + btnH / 2, btnW, btnH)
                .setInteractive({ useHandCursor: true });

            const bg = this.add.graphics();
            this.drawPanel(bg, x, y, btnW, btnH, true, false);

            const glowGr = this.add.graphics();
            glowGr.setVisible(false);

            const icon = this.add.text(x + btnW / 2, y + btnH / 2, cat.label, { fontSize: '26px' }).setOrigin(0.5);

            zone.on('pointerover', () => {
                if (this.activeCategory !== cat.key) this.drawPanel(bg, x, y, btnW, btnH, true, true);
                this.drawHoverGlow(glowGr, x, y, btnW, btnH);
                glowGr.setVisible(true);
                this.showTooltip(cat.name, '', x + btnW / 2, y - 40);
            });
            zone.on('pointerout', () => {
                if (this.activeCategory !== cat.key) this.drawPanel(bg, x, y, btnW, btnH, true, false);
                glowGr.setVisible(false);
                this.hideTooltip();
            });
            zone.on('pointerdown', () => {
                this._playClick();
                // Pressed animation
                this.tweens.add({ targets: icon, scaleX: 0.85, scaleY: 0.85, duration: 60, yoyo: true });
                this.toggleCategory(cat.key);
            });

            this.bottomBarContainer.add([zone, glowGr, bg, icon]);
            this.categoryBtns.push({ key: cat.key, bg, x, y, w: btnW, h: btnH });
        });
    }

    toggleCategory(catKey) {
        if (this.activeCategory === catKey) {
            this.activeCategory = null;
            this.clearToolPanel();
        } else {
            this.activeCategory = catKey;
            this.buildToolPanel(catKey);
        }

        this.categoryBtns.forEach(c => {
            this.drawPanel(c.bg, c.x, c.y, c.w, c.h, true, c.key === this.activeCategory);
        });
    }

    // ============================================
    // TOOL PANEL
    // ============================================
    clearToolPanel() {
        this.toolPanelContainer.removeAll(true);
        this.toolButtons = [];
    }

    buildToolPanel(catKey) {
        this.clearToolPanel();

        const tools = getToolsByCategory(catKey);
        if (tools.length === 0) return;

        const cols = Math.min(tools.length, 8);
        const rows = Math.ceil(tools.length / cols);

        const btnW = 44;
        const btnH = 44;
        const spacing = 6;
        const padding = 10;

        const panelW = cols * btnW + (cols - 1) * spacing + padding * 2;
        const panelH = rows * btnH + (rows - 1) * spacing + padding * 2;

        let cbY = this.h - 60 - 10;
        const panelX = this.w / 2 - panelW / 2;
        const panelY = cbY - panelH - 10;

        const bg = this.add.graphics();
        this.drawPanel(bg, panelX, panelY, panelW, panelH, false, false);
        this.toolPanelContainer.add(bg);

        this.toolButtons = [];

        tools.forEach((tool, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = panelX + padding + col * (btnW + spacing);
            const y = panelY + padding + row * (btnH + spacing);

            const isSelected = tool.id === this.selectedToolId;
            const btnBg = this.add.graphics();
            this.drawPanel(btnBg, x, y, btnW, btnH, true, isSelected);

            const glowGr = this.add.graphics();
            glowGr.setVisible(false);

            const icon = this.add.text(x + btnW / 2, y + btnH / 2, tool.icon, { fontSize: '20px' }).setOrigin(0.5);

            const zone = this.add.zone(x + btnW / 2, y + btnH / 2, btnW, btnH)
                .setInteractive({ useHandCursor: true });

            zone.on('pointerover', () => {
                if (tool.id !== this.selectedToolId) this.drawPanel(btnBg, x, y, btnW, btnH, true, true);
                this.drawHoverGlow(glowGr, x, y, btnW, btnH);
                glowGr.setVisible(true);
                this.showTooltip(tool.name, tool.description, x + btnW / 2, y - 40);
            });
            zone.on('pointerout', () => {
                if (tool.id !== this.selectedToolId) this.drawPanel(btnBg, x, y, btnW, btnH, true, false);
                glowGr.setVisible(false);
                this.hideTooltip();
            });
            zone.on('pointerdown', () => {
                this._playClick();
                this.tweens.add({ targets: icon, scaleX: 0.8, scaleY: 0.8, duration: 60, yoyo: true });
                this.selectTool(tool);
            });

            this.toolPanelContainer.add([zone, glowGr, btnBg, icon]);
            this.toolButtons.push({ id: tool.id, bg: btnBg, x, y, w: btnW, h: btnH });
        });
    }

    selectTool(tool) {
        this.selectedToolId = tool.id;
        this.gameSceneRef.setTool(tool);

        this.toolButtons.forEach(b => {
            this.drawPanel(b.bg, b.x, b.y, b.w, b.h, true, b.id === tool.id);
        });
    }

    // ============================================
    // BRUSH SIZE CONTROL
    // ============================================
    createBrushSizeControl() {
        this.brushSizeContainer.removeAll(true);

        const panelW = 90;
        const panelH = 54;
        const bx = this.w / 2 + 220;
        const by = this.h - panelH - 10;

        const bg = this.add.graphics();
        this.drawPanel(bg, bx, by, panelW, panelH);
        this.brushSizeContainer.add(bg);

        const label = this.add.text(bx + panelW / 2, by + 8, 'Cọ', {
            fontFamily: '"VT323", monospace', fontSize: '11px', color: THEME.text
        }).setOrigin(0.5, 0);
        this.brushSizeContainer.add(label);

        this.brushSizeLabel = this.add.text(bx + panelW / 2, by + panelH - 10, '', {
            fontFamily: '"VT323", monospace', fontSize: '11px', color: THEME.gold
        }).setOrigin(0.5, 1);
        this.brushSizeContainer.add(this.brushSizeLabel);

        this.brushBtns = [];
        const btnSize = 24;
        const startX = bx + 6;
        const btnY = by + 20;

        BRUSH_PRESETS.forEach((preset, i) => {
            const x = startX + i * (btnSize + 4);
            const isActive = this.gameSceneRef.brushSize === preset.size;
            const btnBg = this.add.graphics();
            this.drawPanel(btnBg, x, btnY, btnSize, btnSize, true, isActive);

            const icon = this.add.text(x + btnSize / 2, btnY + btnSize / 2, preset.label, {
                fontSize: '10px'
            }).setOrigin(0.5);

            const zone = this.add.zone(x + btnSize / 2, btnY + btnSize / 2, btnSize, btnSize)
                .setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                this.gameSceneRef.brushSize = preset.size;
                this.updateBrushSizeUI();
            });
            zone.on('pointerover', () => this.showTooltip(preset.name, `Kích cọ: ${preset.size}`, x + btnSize / 2, btnY - 30));
            zone.on('pointerout', () => this.hideTooltip());

            this.brushSizeContainer.add([zone, btnBg, icon]);
            this.brushBtns.push({ size: preset.size, bg: btnBg, x, y: btnY, w: btnSize, h: btnSize });
        });

        this.updateBrushSizeUI();
    }

    updateBrushSizeUI() {
        const current = this.gameSceneRef.brushSize;
        if (this.brushBtns) {
            this.brushBtns.forEach(b => {
                this.drawPanel(b.bg, b.x, b.y, b.w, b.h, true, b.size === current);
            });
        }
        if (this.brushSizeLabel) {
            this.brushSizeLabel.setText(`Size: ${current}`);
        }
    }

    // ============================================
    // TOP PANEL (Enhanced)
    // ============================================
    createTopPanel() {
        // TOP LEFT: Year, Age, Population, Settlement, Kingdom, Animal counts
        const tlW = 280;
        const tlH = 70;
        const tlBg = this.add.graphics();
        this.drawPanel(tlBg, 10, 10, tlW, tlH);
        this.topPanelContainer.add(tlBg);
        this._topLeftBg = tlBg;
        this._topLeftW = tlW;
        this._topLeftH = tlH;

        // Age color indicator (small circle)
        this.ageIndicator = this.add.graphics();
        this.topPanelContainer.add(this.ageIndicator);

        this.infoText = this.add.text(20, 18, '', {
            fontFamily: '"VT323", monospace', fontSize: '14px', color: THEME.text,
            lineSpacing: 2
        });
        this.topPanelContainer.add(this.infoText);

        // Counts row
        this.countsText = this.add.text(20, 52, '', {
            fontFamily: '"VT323", monospace', fontSize: '12px', color: THEME.cyan
        });
        this.topPanelContainer.add(this.countsText);

        // Speed indicator (visual bar)
        this.speedIndicator = this.add.graphics();
        this.topPanelContainer.add(this.speedIndicator);

        // TOP RIGHT: Speed buttons, Stats, Help, History, Save, Load
        const trW = 350;
        const trH = 50;
        const trX = this.w - trW - 10;
        this._topRightW = trW;
        this.trBg = this.add.graphics();
        this.drawPanel(this.trBg, trX, 10, trW, trH);
        this.topPanelContainer.add(this.trBg);

        // Speed buttons
        this.speedButtons = [];
        const speeds = [
            { icon: '⏸', speed: 0, desc: 'Tạm dừng' },
            { icon: '▶', speed: 1, desc: 'Bình thường' },
            { icon: '⏩', speed: 2, desc: 'Nhanh' },
            { icon: '⚡', speed: 5, desc: 'Siêu tốc' }
        ];

        this._speedPauseIcon = null;

        speeds.forEach((s, i) => {
            const btnW = 36;
            const btnH = 36;
            const x = trX + 10 + i * (btnW + 6);
            const y = 17;

            const bgb = this.add.graphics();
            this.drawPanel(bgb, x, y, btnW, btnH, true, false);

            const icon = this.add.text(x + btnW / 2, y + btnH / 2, s.icon, { fontSize: '16px' }).setOrigin(0.5);

            if (s.speed === 0) this._speedPauseIcon = icon;

            const zone = this.add.zone(x + btnW / 2, y + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                this._playClick();
                this.gameSceneRef.setSimSpeed(s.speed);
                this.updateSpeedUI(s.speed);
            });
            zone.on('pointerover', () => this.showTooltip(s.desc, '', x + btnW / 2, y + btnH + 15));
            zone.on('pointerout', () => this.hideTooltip());

            this.topPanelContainer.add([zone, bgb, icon]);
            this.speedButtons.push({ speed: s.speed, bg: bgb, x, y, w: btnW, h: btnH, icon });
        });

        // World Stats button (📊)
        const statsX = trX + 175;
        const statsZone = this.add.zone(statsX, 35, 30, 30).setInteractive({ useHandCursor: true });
        const statsIcon = this.add.text(statsX, 35, '📊', { fontSize: '18px' }).setOrigin(0.5);
        statsZone.on('pointerdown', () => this.toggleWorldStats());
        statsZone.on('pointerover', () => this.showTooltip('Thống Kê', 'Thống kê thế giới', statsX, 65));
        statsZone.on('pointerout', () => this.hideTooltip());

        // Help / Shortcuts button (?)
        const helpX = trX + 205;
        const helpZone = this.add.zone(helpX, 35, 30, 30).setInteractive({ useHandCursor: true });
        const helpIcon = this.add.text(helpX, 35, '?', {
            fontFamily: '"VT323", monospace', fontSize: '20px', color: THEME.gold
        }).setOrigin(0.5);
        helpZone.on('pointerdown', () => this.toggleShortcuts());
        helpZone.on('pointerover', () => this.showTooltip('Phím Tắt', 'Hiển thị phím tắt', helpX, 65));
        helpZone.on('pointerout', () => this.hideTooltip());

        // History button (📖)
        const histX = trX + 240;
        const histZone = this.add.zone(histX, 35, 30, 30).setInteractive({ useHandCursor: true });
        const histIcon = this.add.text(histX, 35, '\uD83D\uDCD6', { fontSize: '16px' }).setOrigin(0.5);
        histZone.on('pointerdown', () => { this._playClick(); this.showHistoryPanel(); });
        histZone.on('pointerover', () => this.showTooltip('Lịch Sử', 'Lịch sử thế giới', histX, 65));
        histZone.on('pointerout', () => this.hideTooltip());

        // Save & Load
        const slX = trX + 270;
        const saveZone = this.add.zone(slX + 18, 35, 28, 28).setInteractive({ useHandCursor: true });
        const saveIcon = this.add.text(slX + 18, 35, '💾', { fontSize: '16px' }).setOrigin(0.5);
            saveZone.on('pointerdown', () => { this._playClick(); this.gameSceneRef.saveGame(); });
        saveZone.on('pointerover', () => this.showTooltip('Lưu Game', 'F5', slX + 18, 65));
        saveZone.on('pointerout', () => this.hideTooltip());

        const loadZone = this.add.zone(slX + 48, 35, 28, 28).setInteractive({ useHandCursor: true });
        const loadIcon = this.add.text(slX + 48, 35, '📂', { fontSize: '16px' }).setOrigin(0.5);
            loadZone.on('pointerdown', () => { this._playClick(); this.gameSceneRef.loadGameState(); });
        loadZone.on('pointerover', () => this.showTooltip('Tải Game', 'F9', slX + 48, 65));
        loadZone.on('pointerout', () => this.hideTooltip());

        this.topPanelContainer.add([statsZone, statsIcon, helpZone, helpIcon, histZone, histIcon, saveZone, saveIcon, loadZone, loadIcon]);
        this.updateSpeedUI(1);
    }

    updateSpeedUI(currentSpeed) {
        this.speedButtons.forEach(b => {
            this.drawPanel(b.bg, b.x, b.y, b.w, b.h, true, b.speed === currentSpeed);
        });

        // Pause pulse effect
        if (this._pausePulseTween) {
            this._pausePulseTween.stop();
            this._pausePulseTween = null;
        }
        if (this._speedPauseIcon) {
            if (currentSpeed === 0) {
                this._speedPauseIcon.setAlpha(1);
                this._pausePulseTween = this.tweens.add({
                    targets: this._speedPauseIcon,
                    alpha: 0.3,
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else {
                this._speedPauseIcon.setAlpha(1);
            }
        }

        // Update speed indicator bar
        this.drawSpeedIndicator(currentSpeed);
    }

    drawSpeedIndicator(speed) {
        if (!this.speedIndicator) return;
        this.speedIndicator.clear();

        const tlX = 10;
        const barX = tlX + 260;
        const barY = 18;
        const barW = 8;
        const barH = 50;
        const maxSpeed = 5;
        const ratio = Math.min(1, speed / maxSpeed);

        // Bar background
        this.speedIndicator.fillStyle(0x000000, 0.4);
        this.speedIndicator.fillRoundedRect(barX, barY, barW, barH, 2);

        if (speed > 0) {
            const speedColor = speed >= 5 ? 0xe74c3c : speed >= 2 ? 0xf39c12 : 0x2ecc71;
            const fillH = Math.max(2, barH * ratio);
            this.speedIndicator.fillStyle(speedColor, 0.8);
            this.speedIndicator.fillRoundedRect(barX, barY + barH - fillH, barW, fillH, 2);
        }

        this.speedIndicator.lineStyle(1, 0xffffff, 0.15);
        this.speedIndicator.strokeRoundedRect(barX, barY, barW, barH, 2);
    }

    updateStats() {
        const pop = this.registry.get('totalPopulation') || 0;
        const year = this.registry.get('worldYear') || 0;
        const animalCount = this.registry.get('animalCount') || 0;
        const simSpeed = this.registry.get('simSpeed') || 1;
        const ageSystem = this.gameSceneRef.ageSystem;

        let ageStr = '';
        let ageId = 'hope';
        if (ageSystem) {
            const age = ageSystem.getCurrentAge();
            ageStr = age.name;
            ageId = age.id;

            // Age color indicator
            const ageColor = AGE_UI_COLORS[ageId] || AGE_UI_COLORS.hope;
            this.ageIndicator.clear();
            this.ageIndicator.fillStyle(ageColor.hex, 1);
            this.ageIndicator.fillCircle(16, 22, 5);
            this.ageIndicator.lineStyle(1, 0xffffff, 0.3);
            this.ageIndicator.strokeCircle(16, 22, 5);
        }

        // Detect age transition
        if (this._prevAgeId && this._prevAgeId !== ageId) {
            const ageColor = AGE_UI_COLORS[ageId];
            if (ageColor) {
                this.showAgeTransition(ageStr, ageColor.css);
            }
        }
        this._prevAgeId = ageId;

        this.infoText.setText(`📅 Năm ${year}  ·  ${AGE_UI_COLORS[ageId]?.label || ''} ${ageStr}`);

        // Counts
        const settleCount = this.gameSceneRef.settlementManager ? this.gameSceneRef.settlementManager.getAll().length : 0;
        const kingdomCount = this.gameSceneRef.kingdomManager ? this.gameSceneRef.kingdomManager.getAll().length : 0;
        this.countsText.setText(
            `👥${pop}  🏘️${settleCount}  👑${kingdomCount}  🐾${animalCount}  ⏱️x${simSpeed}`
        );

        // Sample population history
        this.samplePopHistory();

        this.drawSpeedIndicator(simSpeed);
    }

    samplePopHistory() {
        const tick = this.registry.get('tickCount') || 0;
        if (tick === this._histSampleTick) return;
        this._histSampleTick = tick;

        const races = getAllRaces();
        for (const race of races) {
            const count = this.gameSceneRef.entityManager.countByRace(race.id);
            if (!this.popHistory.has(race.id)) {
                this.popHistory.set(race.id, []);
            }
            const arr = this.popHistory.get(race.id);
            arr.push({ tick, count });
            if (arr.length > this._maxHistSamples) arr.shift();
        }
    }

    // ============================================
    // INSPECT PANEL (Enhanced)
    // ============================================
    createInspectPanel() {
        this.inspectBg = this.add.graphics();
        this.inspectContent = this.add.container(20, 70);
        this.inspectPanelContainer.add([this.inspectBg, this.inspectContent]);
        this.inspectPanelContainer.setVisible(false);
    }

    updateInspectPanel(data) {
        if (!data) {
            this.inspectPanelContainer.setVisible(false);
            return;
        }

        this.inspectContent.removeAll(true);
        this.inspectPanelContainer.setVisible(true);

        const pW = 280;
        let pYOffset = 0;

        const addLine = (text, color = THEME.text, size = '14px', isBold = false) => {
            const font = isBold ? `bold 15px "VT323", monospace` : `${size} "VT323", monospace`;
            const t = this.add.text(10, pYOffset, text, {
                font,
                color,
                wordWrap: { width: pW - 20 }
            });
            this.inspectContent.add(t);
            pYOffset += t.height + 4;
            return t;
        };

        const addDivider = () => {
            const gr = this.add.graphics();
            gr.lineStyle(1, 0x4c566a, 0.5);
            gr.lineBetween(10, pYOffset + 2, pW - 10, pYOffset + 2);
            this.inspectContent.add(gr);
            pYOffset += 10;
        };

        const addSpacer = (h = 4) => { pYOffset += h; };

        // ── TILE HEADER ──
        addLine(`📍 ${data.tile.name} (${data.tilePos.x}, ${data.tilePos.y})`, THEME.gold, '16px', true);
        addSpacer(2);

        // ── SETTLEMENT INFO ──
        if (data.settlement) {
            const s = data.settlement;
            const race = getRace(s.raceId);
            const tierName = SettlementManager.getTierName(s.tier);

            // Portrait area with race color
            const portraitGr = this.add.graphics();
            portraitGr.fillStyle(race.color, 0.6);
            portraitGr.fillRoundedRect(10, pYOffset, 24, 24, 4);
            portraitGr.lineStyle(1, 0xffffff, 0.3);
            portraitGr.strokeRoundedRect(10, pYOffset, 24, 24, 4);
            this.inspectContent.add(portraitGr);

            const nameT = this.add.text(40, pYOffset + 2, `${race.icon} ${s.name}`, {
                font: `bold 15px "VT323", monospace`,
                color: race.flagColor || THEME.text,
                wordWrap: { width: pW - 50 }
            });
            this.inspectContent.add(nameT);
            const subT = this.add.text(40, pYOffset + 18, `${tierName}`, {
                font: `11px "VT323", monospace`,
                color: THEME.cyan
            });
            this.inspectContent.add(subT);
            pYOffset += 30;

            // Population bar
            addLine(`👥 Dân số: ${s.population}/${s.maxPopulation}`, THEME.text, '13px');
            const popBar = this.drawHpBar(10, pYOffset, pW - 20, s.population, s.maxPopulation, 5);
            this.inspectContent.add(popBar);
            pYOffset += 10;

            // Resources
            addLine(`🍗${Math.floor(s.food)}  🪵${Math.floor(s.wood)}  🪨${Math.floor(s.stone)}  🥇${Math.floor(s.gold || 0)}`, '#c0caf5', '13px');

            // Territory size
            const territorySize = s.territory ? s.territory.size : 0;
            addLine(`🗺️ Lãnh thổ: ${territorySize} ô`, THEME.text, '12px');

            // Buildings count
            if (s.buildings && s.buildings.length > 0) {
                addLine(`🏠 Công trình: ${s.buildings.length}`, THEME.text, '12px');
            }

            // Loyalty bar
            addLine(`🤝 Trung thành: ${Math.floor(s.loyalty || 100)}%`, s.loyalty < 30 ? THEME.red : THEME.green, '12px');
            const loyaltyBar = this.drawLoyaltyBar(10, pYOffset, pW - 20, s.loyalty || 100, 5);
            this.inspectContent.add(loyaltyBar);
            pYOffset += 10;

            // Kingdom info
            const kingdom = this.gameSceneRef.kingdomManager ? this.gameSceneRef.kingdomManager.get(s.kingdomId) : null;
            if (kingdom) {
                const kRace = getRace(kingdom.raceId);
                // Kingdom color swatch
                const swatchGr = this.add.graphics();
                swatchGr.fillStyle(kingdom.color, 1);
                swatchGr.fillRoundedRect(10, pYOffset, 12, 12, 2);
                this.inspectContent.add(swatchGr);

                const kText = this.add.text(28, pYOffset - 1, `Vương quốc: ${kingdom.name}`, {
                    font: `12px "VT323", monospace`,
                    color: THEME.gold
                });
                this.inspectContent.add(kText);
                pYOffset += 16;

                // Full kingdom details
                this._renderKingdomDetails(kingdom, kRace, pW, (gr) => {
                    this.inspectContent.add(gr);
                    pYOffset += gr._pHeight || 0;
                }, (text, color, size) => {
                    const t = addLine(text, color, size);
                    return t;
                }, addDivider, addSpacer);
            }

            addDivider();
        }

        // ── BUILDING ──
        if (data.building) {
            let bName = '🏠 Công trình';
            switch (data.building.type) {
                case 'village_center': bName = '🏛️ Trung tâm Tòa thị chính'; break;
            }
            addLine(bName, THEME.highlight, '13px', true);
            if (data.building.raceId) {
                const bRace = getRace(data.building.raceId);
                addLine(`  Chủng tộc: ${bRace.icon} ${bRace.name}`, THEME.text, '12px');
            }
            addDivider();
        }

        // ── ENTITIES ──
        if (data.entities && data.entities.length > 0) {
            addLine(`Dân Cư (${data.entities.length})`, THEME.gold, '13px', true);
            addSpacer(2);

            const maxEnts = Math.min(data.entities.length, 3);
            for (let i = 0; i < maxEnts; i++) {
                pYOffset = this._renderEntityCard(data.entities[i], pW, pYOffset);
            }
            if (data.entities.length > 3) {
                addLine(`  ... và ${data.entities.length - 3} cá thể khác`, THEME.blue, '11px');
            }
            addDivider();
        }

        // ── ANIMALS ──
        if (data.animals && data.animals.length > 0) {
            addLine(`Động Vật (${data.animals.length})`, THEME.gold, '13px', true);
            addSpacer(2);

            const maxAnimals = Math.min(data.animals.length, 5);
            for (let i = 0; i < maxAnimals; i++) {
                const a = data.animals[i];
                const info = ANIMAL_INFO[a.type] || { icon: '🐾', name: a.type };

                // Animal portrait
                const portraitGr = this.add.graphics();
                portraitGr.fillStyle(a.color || 0x888888, 0.7);
                portraitGr.fillRoundedRect(10, pYOffset, 16, 16, 3);
                this.inspectContent.add(portraitGr);

                addSpacer(0);
                const at = this.add.text(32, pYOffset - 2, `${info.icon} ${info.name}`, {
                    font: `bold 13px "VT323", monospace`, color: THEME.text
                });
                this.inspectContent.add(at);
                pYOffset += 16;

                // HP bar
                const hpBar = this.drawHpBar(10, pYOffset, pW - 20, a.hp, a.maxHp || 20, 4);
                this.inspectContent.add(hpBar);
                pYOffset += 8;

                // Hunger & behavior
                const hungerRatio = a.hunger !== undefined ? (a.hunger / (a.maxHunger || 100)) : 1;
                const hungerText = hungerRatio > 0.6 ? 'No' : hungerRatio > 0.3 ? 'Đói' : 'Rất đói';
                const hungerColor = hungerRatio > 0.6 ? THEME.green : hungerRatio > 0.3 ? THEME.orange : THEME.red;
                addLine(`  🍖 ${hungerText} (${Math.floor(a.hunger || 0)})  ${this._getAnimalBehavior(a)}`, hungerColor, '11px');
                addSpacer(2);
            }
            if (data.animals.length > 5) {
                addLine(`  ... và ${data.animals.length - 5} con khác`, THEME.blue, '11px');
            }
            addDivider();
        }

        // ── KINGDOM TILE DETECTION ──
        // If no settlement but tile belongs to a kingdom territory
        if (!data.settlement) {
            for (const settlement of this.gameSceneRef.settlementManager.getAll()) {
                if (settlement.territory.has(`${data.tilePos.x},${data.tilePos.y}`)) {
                    const kingdom = this.gameSceneRef.kingdomManager.get(settlement.kingdomId);
                    if (kingdom) {
                        const kRace = getRace(kingdom.raceId);
                        addLine(`👑 Vương quốc: ${kingdom.name}`, THEME.gold, '13px', true);
                        addLine(`  ${kRace.icon} ${kRace.name} · Lập năm ${kingdom.age || 0}`, THEME.text, '12px');
                        addSpacer(2);
                    }
                    break;
                }
            }
        }

        const pH = Math.max(120, pYOffset + 10);
        this.inspectBg.clear();
        this.drawPanel(this.inspectBg, 10, 60, pW, pH);
    }

    _renderEntityCard(entity, pW, pYOffset) {
        const race = getRace(entity.raceId);
        const kingStr = entity.isKing ? '👑 ' : (entity.isLeader ? '⭐ ' : '');

        // Portrait with race color
        const portraitGr = this.add.graphics();
        portraitGr.fillStyle(race.color, 0.7);
        portraitGr.fillRoundedRect(10, pYOffset, 20, 20, 3);
        portraitGr.lineStyle(1, 0xffffff, 0.2);
        portraitGr.strokeRoundedRect(10, pYOffset, 20, 20, 3);
        this.inspectContent.add(portraitGr);

        // Name & race
        const nameT = this.add.text(36, pYOffset, `${kingStr}${race.icon} ${race.name}`, {
            font: `bold 13px "VT323", monospace`,
            color: race.flagColor || THEME.text
        });
        this.inspectContent.add(nameT);
        pYOffset += 16;

        // State with descriptive text
        const stateStr = STATE_LABELS[entity.state] || `• ${entity.state || 'không rõ'}`;
        const stateColor = entity.state === 'fighting' ? THEME.red :
            entity.state === 'fleeing' ? THEME.orange : THEME.text;
        const stateT = this.add.text(14, pYOffset, stateStr, {
            font: `11px "VT323", monospace`, color: stateColor
        });
        this.inspectContent.add(stateT);
        pYOffset += 14;

        // HP bar
        const hpText = this.add.text(14, pYOffset, `❤️ ${Math.floor(entity.hp)}/${entity.maxHp}`, {
            font: `11px "VT323", monospace`, color: THEME.text
        });
        this.inspectContent.add(hpText);
        const hpBar = this.drawHpBar(90, pYOffset + 2, pW - 100, entity.hp, entity.maxHp, 5);
        this.inspectContent.add(hpBar);
        pYOffset += 12;

        // Happiness bar
        const happiness = entity.happiness !== undefined ? entity.happiness : 50;
        const happPct = (happiness + 100) / 200; // -100..100 → 0..1
        const happColor = happiness > 20 ? 0xa3be8c : happiness > -20 ? 0xebcb8b : 0xbf616a;
        const happLabel = happiness > 40 ? 'Hạnh phúc' : happiness > 0 ? 'Bình thường' : happiness > -40 ? 'Buồn bã' : 'Đau khổ';

        const happBarW = pW - 28;
        const happBarH = 6;
        const happGr = this.add.graphics();
        happGr.fillStyle(0x2e3440);
        happGr.fillRect(14, pYOffset, happBarW, happBarH);
        happGr.fillStyle(happColor);
        happGr.fillRect(14, pYOffset, Math.max(1, happBarW * happPct), happBarH);
        this.inspectContent.add(happGr);

        const happT = this.add.text(14, pYOffset + 8, `😊 ${happLabel} (${happiness})`, {
            font: `10px "VT323", monospace`, color: '#d8dee9'
        });
        this.inspectContent.add(happT);
        pYOffset += 20;

        // Stats row
        const statsT = this.add.text(14, pYOffset, `⚔️${entity.attack || 0}  🛡️${entity.defense || 0}  💨${(entity.speed || 0).toFixed(1)}`, {
            font: `11px "VT323", monospace`, color: '#a9b1d6'
        });
        this.inspectContent.add(statsT);
        pYOffset += 13;

        // Age with life stage
        if (entity.age !== undefined) {
            const ageYears = entity.age;
            let stage = 'Trưởng thành';
            let stageColor = THEME.green;
            if (ageYears < 15) { stage = 'Trẻ em'; stageColor = THEME.cyan; }
            else if (ageYears >= 50) { stage = 'Già cả'; stageColor = THEME.orange; }
            const ageT = this.add.text(14, pYOffset, `🎂 ${ageYears} tuổi (${stage})`, {
                font: `11px "VT323", monospace`, color: stageColor
            });
            this.inspectContent.add(ageT);
            pYOffset += 13;
        }

        // Kingdom affiliation
        if (entity.settlementId >= 0) {
            const settlement = this.gameSceneRef.settlementManager.get(entity.settlementId);
            if (settlement) {
                const kingdom = this.gameSceneRef.kingdomManager.get(settlement.kingdomId);
                if (kingdom) {
                    const swatchGr = this.add.graphics();
                    swatchGr.fillStyle(kingdom.color, 1);
                    swatchGr.fillRoundedRect(14, pYOffset + 2, 8, 8, 2);
                    this.inspectContent.add(swatchGr);

                    const affT = this.add.text(28, pYOffset, `${kingdom.name} · ${settlement.name}`, {
                        font: `11px "VT323", monospace`, color: THEME.gold
                    });
                    this.inspectContent.add(affT);
                    pYOffset += 13;

                    // Kingdom religion
                    if (kingdom.religion) {
                        const relT = this.add.text(14, pYOffset, `${kingdom.religion.icon} ${kingdom.religion.name}`, {
                            font: `11px "VT323", monospace`, color: '#ebcb8b'
                        });
                        this.inspectContent.add(relT);
                        pYOffset += 13;
                        const relDesc = this.add.text(20, pYOffset, kingdom.religion.desc, {
                            font: `10px "VT323", monospace`, color: '#a9b1d6'
                        });
                        this.inspectContent.add(relDesc);
                        pYOffset += 12;
                    }
                }
            }
        }

        // Family info
        if (entity.familyId) {
            const childCount = (entity.children || []).length;
            const gen = entity.generation || 1;
            const famT = this.add.text(14, pYOffset, `👨‍👩‍👧 Đời thứ ${gen} · ${childCount} con`, {
                font: `10px "VT323", monospace`, color: '#a9b1d6'
            });
            this.inspectContent.add(famT);
            pYOffset += 12;
        }

        // Traits as colored badges
        if (entity.traits && entity.traits.length > 0) {
            const meaningfulTraits = entity.traits.filter(t => TRAITS[t]);
            if (meaningfulTraits.length > 0) {
                let tx = 14;
                for (const traitId of meaningfulTraits) {
                    const trait = TRAITS[traitId];
                    if (!trait) continue;
                    const isPositive = POSITIVE_TRAITS.includes(traitId);
                    const isNegative = NEGATIVE_TRAITS.includes(traitId);
                    const badgeColor = isPositive ? 0x2ecc71 : isNegative ? 0xe74c3c : 0x4c566a;

                    const badgeGr = this.add.graphics();
                    const badgeW = Math.max(30, trait.name.length * 7 + 8);
                    badgeGr.fillStyle(badgeColor, 0.5);
                    badgeGr.fillRoundedRect(tx, pYOffset, badgeW, 14, 3);
                    badgeGr.lineStyle(1, badgeColor, 0.7);
                    badgeGr.strokeRoundedRect(tx, pYOffset, badgeW, 14, 3);
                    this.inspectContent.add(badgeGr);

                    const badgeT = this.add.text(tx + 4, pYOffset + 1, trait.name, {
                        font: `9px "VT323", monospace`, color: '#ffffff'
                    });
                    this.inspectContent.add(badgeT);

                    tx += badgeW + 3;
                    if (tx > pW - 40) { tx = 14; pYOffset += 17; }
                }
                pYOffset += 18;
            }
        }

        // Equipment display (6 slots + durability + modifiers)
        if (this.gameSceneRef.equipmentSystem) {
            const eqSlots = this.gameSceneRef.equipmentSystem.getEntityEquipment(entity.id);
            const slotDefs = [
                { key: 'weapon', icon: '⚔️', label: 'Vũ khí' },
                { key: 'helmet', icon: '🪖', label: 'Mũ' },
                { key: 'armor', icon: '🛡️', label: 'Giáp' },
                { key: 'boots', icon: '👢', label: 'Giày' },
                { key: 'ring', icon: '💍', label: 'Nhẫn' },
                { key: 'amulet', icon: '📿', label: 'Bùa' }
            ];
            const hasAny = slotDefs.some(s => eqSlots[s.key] != null);
            if (hasAny) {
                pYOffset += 2;
                for (const slot of slotDefs) {
                    const item = eqSlots[slot.key];
                    if (!item) continue;

                    const itemColor = getRarityColor(item.rarity);
                    const broken = item.durability !== undefined && item.durability <= 0;

                    // Item name with rarity color
                    const nameStr = broken ? `💔 ${item.name}` : `${slot.icon} ${item.name}`;
                    const nameColor = broken ? '#666666' : itemColor;
                    const equipT = this.add.text(14, pYOffset, nameStr, {
                        font: `11px "VT323", monospace`, color: nameColor
                    });
                    this.inspectContent.add(equipT);
                    pYOffset += 13;

                    // Stats row
                    if (item.stats) {
                        const parts = [];
                        if (item.stats.attack) parts.push(`⚔+${item.stats.attack}`);
                        if (item.stats.defense) parts.push(`🛡+${item.stats.defense}`);
                        if (item.stats.speed) parts.push(`💨+${item.stats.speed}`);
                        if (item.stats.attackSpeed) parts.push(`⚡${item.stats.attackSpeed.toFixed(2)}`);
                        if (item.stats.range && item.stats.range > 1) parts.push(`📐${item.stats.range}`);
                        if (item.stats.damage) parts.push(`💥+${item.stats.damage}`);
                        if (item.stats.crit) parts.push(`🎯+${item.stats.crit}`);
                        if (item.stats.dodge) parts.push(`🌀+${item.stats.dodge}`);
                        if (item.stats.accuracy) parts.push(`🎯+${item.stats.accuracy}`);
                        if (parts.length > 0) {
                            const statsT = this.add.text(20, pYOffset, parts.join('  '), {
                                font: `10px "VT323", monospace`, color: '#a9b1d6'
                            });
                            this.inspectContent.add(statsT);
                            pYOffset += 12;
                        }
                    }

                    // Modifier display (colored text)
                    if (item.modifier) {
                        const mod = MODIFIERS[item.modifier.key];
                        if (mod) {
                            const modValue = mod.levels[item.modifier.level];
                            const modText = `${mod.icon} ${mod.name} +${modValue}`;
                            const modT = this.add.text(20, pYOffset, modText, {
                                font: `10px "VT323", monospace`, color: mod.color
                            });
                            this.inspectContent.add(modT);
                            pYOffset += 11;
                        }
                    }

                    // Durability bar
                    if (item.durability !== undefined && item.maxDurability > 0) {
                        const durRatio = item.durability / item.maxDurability;
                        const durBarW = pW - 30;
                        const durBarH = 3;

                        const durBar = this.add.graphics();
                        // Background
                        durBar.fillStyle(0x000000, 0.5);
                        durBar.fillRoundedRect(20, pYOffset, durBarW, durBarH, 1);
                        // Fill
                        const durColor = durRatio > 0.5 ? 0x2ecc71 : durRatio > 0.2 ? 0xf39c12 : 0xe74c3c;
                        if (durRatio > 0) {
                            durBar.fillStyle(durColor, 0.8);
                            durBar.fillRoundedRect(20, pYOffset, Math.max(2, durBarW * durRatio), durBarH, 1);
                        }
                        this.inspectContent.add(durBar);

                        // Durability text
                        const durT = this.add.text(20 + durBarW + 4, pYOffset - 3, `${Math.floor(item.durability)}`, {
                            font: `8px "VT323", monospace`, color: '#888888'
                        });
                        this.inspectContent.add(durT);
                        pYOffset += 7;
                    }
                }
            }
        }

        pYOffset += 4;
        return pYOffset;
    }

    _renderKingdomDetails(kingdom, kRace, pW, addGraphics, addLine, addDivider, addSpacer) {
        addSpacer(2);

        // Kingdom settlements & population
        const allSettlements = this.gameSceneRef.settlementManager.getAll().filter(s => s.kingdomId === kingdom.id);
        const totalPop = allSettlements.reduce((sum, s) => sum + s.population, 0);

        addLine(`  🏘️ ${allSettlements.length} khu định cư`, THEME.text, '12px');
        addLine(`  👥 Tổng dân: ${totalPop}`, THEME.text, '12px');

        // Culture trait display
        if (kingdom.culture) {
            addLine(`  ${kingdom.culture.icon || '🎭'} Văn hóa: ${kingdom.culture.name || 'Không rõ'}`, THEME.purple, '12px');
        }
        if (kingdom.cultureLevel) {
            addLine(`  🎓 Cấp văn hóa: ${kingdom.cultureLevel}`, THEME.cyan, '12px');
        }

        // War status (enemies)
        if (kingdom.enemies && kingdom.enemies.size > 0) {
            const enemyNames = [];
            for (const eid of kingdom.enemies) {
                const ek = this.gameSceneRef.kingdomManager.get(eid);
                if (ek) enemyNames.push(ek.name);
            }
            if (enemyNames.length > 0) {
                addLine(`  ⚔️ Chiến tranh: ${enemyNames.join(', ')}`, THEME.red, '12px');
            }
        }

        // Alliance status
        if (kingdom.allies && kingdom.allies.size > 0) {
            const allyNames = [];
            for (const aid of kingdom.allies) {
                const ak = this.gameSceneRef.kingdomManager.get(aid);
                if (ak) allyNames.push(ak.name);
            }
            if (allyNames.length > 0) {
                addLine(`  🤝 Đồng minh: ${allyNames.join(', ')}`, THEME.green, '12px');
            }
        }

        // King/leader
        if (kingdom.kingId >= 0) {
            const king = this.gameSceneRef.entityManager.get(kingdom.kingId);
            if (king) {
                const kingRace = getRace(king.raceId);
                addLine(`  👑 ${kingRace.icon} Vua: ⚔️${king.attack} 🛡️${king.defense} ❤️${Math.floor(king.hp)}/${king.maxHp}`, THEME.gold, '12px');
            }
        }
    }

    _getAnimalBehavior(animal) {
        if (animal.targetX >= 0) {
            return '🏃 Di chuyển';
        }
        if (animal.hunger !== undefined && animal.hunger < 30) {
            return '🍽️ Tìm thức ăn';
        }
        return '🌿 Thả rông';
    }

    // ============================================
    // WORLD STATISTICS PANEL
    // ============================================
    createWorldStatsPanel() {
        this.worldStatsContainer.removeAll(true);

        const panelW = Math.min(500, this.w - 40);
        const panelH = Math.min(400, this.h - 80);
        const px = this.w / 2 - panelW / 2;
        const py = this.h / 2 - panelH / 2;

        // Background overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, this.w, this.h);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.w, this.h), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => this.toggleWorldStats());
        this.worldStatsContainer.add(overlay);

        // Main panel
        const panelBg = this.add.graphics();
        this.drawPanel(panelBg, px, py, panelW, panelH);
        this.worldStatsContainer.add(panelBg);

        // Title
        const title = this.add.text(px + panelW / 2, py + 12, '📊 Thống Kê Thế Giới', {
            fontFamily: '"VT323", monospace', fontSize: '18px', color: THEME.gold
        }).setOrigin(0.5, 0);
        this.worldStatsContainer.add(title);

        // Close button
        const closeX = px + panelW - 20;
        const closeY = py + 10;
        const closeZone = this.add.zone(closeX, closeY, 24, 24).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(closeX, closeY, '✕', {
            fontFamily: '"VT323", monospace', fontSize: '16px', color: THEME.red
        }).setOrigin(0.5);
        closeZone.on('pointerdown', () => this.toggleWorldStats());
        this.worldStatsContainer.add([closeZone, closeText]);

        // Store for dynamic content area
        this._statsContentY = py + 36;
        this._statsContentX = px + 15;
        this._statsContentW = panelW - 30;
        this._statsPanelX = px;
        this._statsPanelY = py;
        this._statsPanelH = panelH;
    }

    refreshWorldStatsContent() {
        // Remove old dynamic content (everything after the static elements)
        const keepCount = this.worldStatsContainer.length;
        // We'll rebuild: remove items beyond the first few static ones
        while (this.worldStatsContainer.length > 5) {
            const child = this.worldStatsContainer.last;
            if (child) child.destroy();
        }

        const sx = this._statsContentX;
        const sw = this._statsContentW;
        let sy = this._statsContentY;

        const addStatLine = (text, color = THEME.text, size = '13px') => {
            const t = this.add.text(sx, sy, text, {
                fontFamily: '"VT323", monospace', fontSize: size, color
            });
            this.worldStatsContainer.add(t);
            sy += t.height + 3;
            return t;
        };

        // ── Population by Race (Bar Chart) ──
        addStatLine('Dân số theo chủng tộc:', THEME.gold, '14px');
        const races = getAllRaces();
        const maxPop = Math.max(1, ...races.map(r => this.gameSceneRef.entityManager.countByRace(r.id)));
        const barMaxW = sw - 80;

        for (const race of races) {
            const count = this.gameSceneRef.entityManager.countByRace(race.id);
            if (count === 0) continue;

            const label = this.add.text(sx, sy, `${race.icon} ${race.name}`, {
                fontFamily: '"VT323", monospace', fontSize: '11px', color: THEME.text
            });
            this.worldStatsContainer.add(label);

            const barX = sx + 70;
            const barW = Math.max(2, (count / maxPop) * barMaxW);
            const barGr = this.add.graphics();
            barGr.fillStyle(race.color, 0.7);
            barGr.fillRoundedRect(barX, sy + 2, barW, 10, 2);
            barGr.lineStyle(1, 0xffffff, 0.15);
            barGr.strokeRoundedRect(barX, sy + 2, barMaxW, 10, 2);
            this.worldStatsContainer.add(barGr);

            const countT = this.add.text(barX + barW + 4, sy, `${count}`, {
                fontFamily: '"VT323", monospace', fontSize: '11px', color: THEME.text
            });
            this.worldStatsContainer.add(countT);
            sy += 16;
        }
        sy += 8;

        // ── Population Over Time (Line Graph) ──
        addStatLine('Biến động dân số:', THEME.gold, '14px');
        const graphX = sx;
        const graphY = sy;
        const graphW = sw;
        const graphH = 60;

        const graphGr = this.add.graphics();
        // Graph background
        graphGr.fillStyle(0x2e3440, 0.5);
        graphGr.fillRoundedRect(graphX, graphY, graphW, graphH, 3);
        // Grid lines
        graphGr.lineStyle(1, 0x4c566a, 0.3);
        for (let i = 1; i < 4; i++) {
            const gy = graphY + (graphH / 4) * i;
            graphGr.lineBetween(graphX, gy, graphX + graphW, gy);
        }

        // Draw lines for each race
        const maxHistPop = Math.max(1, ...races.map(r => {
            const hist = this.popHistory.get(r.id);
            return hist && hist.length > 0 ? Math.max(...hist.map(h => h.count)) : 0;
        }));

        for (const race of races) {
            const hist = this.popHistory.get(r.id);
            if (!hist || hist.length < 2) continue;

            graphGr.lineStyle(2, race.color, 0.8);
            graphGr.beginPath();
            for (let i = 0; i < hist.length; i++) {
                const hx = graphX + (i / (this._maxHistSamples - 1)) * graphW;
                const hy = graphY + graphH - (hist[i].count / maxHistPop) * (graphH - 4);
                if (i === 0) graphGr.moveTo(hx, hy);
                else graphGr.lineTo(hx, hy);
            }
            graphGr.strokePath();
        }
        this.worldStatsContainer.add(graphGr);
        sy += graphH + 8;

        // ── Settlements per Kingdom ──
        const kingdoms = this.gameSceneRef.kingdomManager ? this.gameSceneRef.kingdomManager.getAll() : [];
        if (kingdoms.length > 0) {
            addStatLine('Khu định cư / Vương quốc:', THEME.gold, '14px');
            for (const k of kingdoms) {
                const kRace = getRace(k.raceId);
                const kSettlements = this.gameSceneRef.settlementManager.getAll().filter(s => s.kingdomId === k.id);
                const kPop = kSettlements.reduce((sum, s) => sum + s.population, 0);

                // Color swatch
                const swGr = this.add.graphics();
                swGr.fillStyle(k.color, 1);
                swGr.fillRoundedRect(sx, sy + 2, 10, 10, 2);
                this.worldStatsContainer.add(swGr);

                const kt = this.add.text(sx + 14, sy, `${k.name} (${kRace.icon}${kRace.name}): ${kSettlements.length} định cư · ${kPop} dân`, {
                    fontFamily: '"VT323", monospace', fontSize: '11px', color: THEME.text
                });
                this.worldStatsContainer.add(kt);
                sy += 15;
            }
            sy += 6;
        }

        // ── Animals by Type ──
        addStatLine('Động vật:', THEME.gold, '14px');
        const animalTypes = Object.keys(ANIMAL_INFO);
        let animalLine = '';
        for (const type of animalTypes) {
            const count = this.gameSceneRef.animalSystem.countByType(type);
            const info = ANIMAL_INFO[type];
            if (count > 0 && info) {
                animalLine += `${info.icon}${count}  `;
            }
        }
        if (animalLine) {
            addStatLine(`  ${animalLine}`, THEME.text, '12px');
        } else {
            addStatLine('  Không có', THEME.text, '12px');
        }
    }

    toggleWorldStats() {
        const visible = !this.worldStatsContainer.visible;
        if (visible) {
            this.createWorldStatsPanel();
            this.refreshWorldStatsContent();
        }
        this.worldStatsContainer.setVisible(visible);
        if (this.shortcutsContainer.visible) this.shortcutsContainer.setVisible(false);
        if (this.historyContainer.visible) this.historyContainer.setVisible(false);
    }

    // ============================================
    // KEYBOARD SHORTCUTS PANEL
    // ============================================
    createShortcutsPanel() {
        this.shortcutsContainer.removeAll(true);

        const panelW = 260;
        const panelH = 220;
        const px = this.w - panelW - 20;
        const py = 70;

        const bg = this.add.graphics();
        this.drawPanel(bg, px, py, panelW, panelH);
        this.shortcutsContainer.add(bg);

        // Close button
        const closeZone = this.add.zone(px + panelW - 16, py + 12, 20, 20).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(px + panelW - 16, py + 12, '✕', {
            fontFamily: '"VT323", monospace', fontSize: '14px', color: THEME.red
        }).setOrigin(0.5);
        closeZone.on('pointerdown', () => this.toggleShortcuts());
        this.shortcutsContainer.add([closeZone, closeText]);

        const title = this.add.text(px + panelW / 2, py + 14, '⌨️ Phím Tắt', {
            fontFamily: '"VT323", monospace', fontSize: '16px', color: THEME.gold
        }).setOrigin(0.5, 0);
        this.shortcutsContainer.add(title);

        const shortcuts = [
            ['WASD', 'Di chuyển camera'],
            ['Cuộn chuột / Q·E', 'Phóng to / thu nhỏ'],
            ['Space', 'Tạm dừng / Tiếp tục'],
            ['1', 'Tốc độ bình thường'],
            ['2', 'Tốc độ nhanh'],
            ['3', 'Siêu tốc'],
            ['5', 'Siêu tốc cấp cao'],
            ['F5', 'Lưu game'],
            ['F9', 'Tải game'],
        ];

        let sy = py + 36;
        for (const [key, desc] of shortcuts) {
            const keyT = this.add.text(px + 14, sy, key, {
                fontFamily: '"VT323", monospace', fontSize: '12px', color: THEME.cyan
            });
            const descT = this.add.text(px + 120, sy, desc, {
                fontFamily: '"VT323", monospace', fontSize: '12px', color: THEME.text
            });
            this.shortcutsContainer.add([keyT, descT]);
            sy += 18;
        }
    }

    toggleShortcuts() {
        const visible = !this.shortcutsContainer.visible;
        if (visible) {
            this.createShortcutsPanel();
        }
        this.shortcutsContainer.setVisible(visible);
        if (this.worldStatsContainer.visible) this.worldStatsContainer.setVisible(false);
        if (this.historyContainer.visible) this.historyContainer.setVisible(false);
    }

    // ============================================
    // WORLD LAWS PANEL
    // ============================================
    showWorldLawsPanel() {
        this.worldLawsContainer.removeAll(true);

        const panelW = Math.min(500, this.w - 40);
        const panelH = Math.min(450, this.h - 80);
        const px = this.w / 2 - panelW / 2;
        const py = this.h / 2 - panelH / 2;

        // Background overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, this.w, this.h);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.w, this.h), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => this.hideWorldLawsPanel());
        this.worldLawsContainer.add(overlay);

        // Main panel
        const panelBg = this.add.graphics();
        this.drawPanel(panelBg, px, py, panelW, panelH);
        this.worldLawsContainer.add(panelBg);

        // Title
        const title = this.add.text(px + panelW / 2, py + 12, '\uD83D\uDCDC Lu\u1EADt Th\u1EBF Gi\u1EDBi', {
            fontFamily: '"VT323", monospace', fontSize: '18px', color: THEME.gold
        }).setOrigin(0.5, 0);
        this.worldLawsContainer.add(title);

        // Close button
        const closeX = px + panelW - 20;
        const closeY = py + 10;
        const closeZone = this.add.zone(closeX, closeY, 24, 24).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(closeX, closeY, '\u2715', {
            fontFamily: '"VT323", monospace', fontSize: '16px', color: THEME.red
        }).setOrigin(0.5);
        closeZone.on('pointerdown', () => this.hideWorldLawsPanel());
        this.worldLawsContainer.add([closeZone, closeText]);

        // Content area — scrollable-ish via clipped area
        const contentX = px + 15;
        const contentW = panelW - 30;
        let cy = py + 38;

        const lawsSystem = this.gameSceneRef.worldLawsSystem;

        for (const cat of LAW_CATEGORIES) {
            if (cy > py + panelH - 30) break;

            // Category header
            const header = this.add.text(contentX, cy, `${cat.icon} ${cat.name}`, {
                fontFamily: '"VT323", monospace', fontSize: '14px', fontStyle: 'bold', color: THEME.gold
            });
            this.worldLawsContainer.add(header);
            cy += 20;

            const divider = this.add.graphics();
            divider.lineStyle(1, 0x4c566a, 0.5);
            divider.lineBetween(contentX, cy, contentX + contentW, cy);
            this.worldLawsContainer.add(divider);
            cy += 5;

            const laws = lawsSystem.getLawsByCategory(cat.id);
            for (const law of laws) {
                if (cy > py + panelH - 30) break;

                const isEnabled = lawsSystem.isEnabled(law.id);

                // Law name + description row
                const lawText = this.add.text(contentX, cy, `${law.icon} ${law.name}`, {
                    fontFamily: '"VT323", monospace', fontSize: '12px', color: THEME.text
                });
                this.worldLawsContainer.add(lawText);

                const descText = this.add.text(contentX + 4, cy + 14, law.description, {
                    fontFamily: '"VT323", monospace', fontSize: '10px', color: '#8a8a9a'
                });
                this.worldLawsContainer.add(descText);

                // Toggle switch
                const toggleW = 48;
                const toggleH = 18;
                const toggleX = contentX + contentW - toggleW;
                const toggleY = cy + 4;

                const toggleBg = this.add.graphics();
                this._drawLawToggle(toggleBg, toggleX, toggleY, toggleW, toggleH, isEnabled);
                this.worldLawsContainer.add(toggleBg);

                const toggleLabel = this.add.text(toggleX + toggleW / 2, toggleY + toggleH / 2, isEnabled ? 'B\u1EACT' : 'T\u1EAET', {
                    fontFamily: '"VT323", monospace', fontSize: '10px', color: '#ffffff'
                }).setOrigin(0.5);
                this.worldLawsContainer.add(toggleLabel);

                const toggleZone = this.add.zone(toggleX + toggleW / 2, toggleY + toggleH / 2, toggleW, toggleH)
                    .setInteractive({ useHandCursor: true });

                const lawId = law.id;
                toggleZone.on('pointerdown', () => {
                    this._playClick();
                    lawsSystem.toggleLaw(lawId);
                    const nowOn = lawsSystem.isEnabled(lawId);
                    this._drawLawToggle(toggleBg, toggleX, toggleY, toggleW, toggleH, nowOn);
                    toggleLabel.setText(nowOn ? 'B\u1EACT' : 'T\u1EAET');
                });
                toggleZone.on('pointerover', () => {
                    const on = lawsSystem.isEnabled(lawId);
                    const color = on ? 0xa3be8c : 0xbf616a;
                    toggleBg.clear();
                    toggleBg.fillStyle(color, 1);
                    toggleBg.fillRoundedRect(toggleX, toggleY, toggleW, toggleH, 4);
                    toggleBg.lineStyle(1, 0xffffff, 0.3);
                    toggleBg.strokeRoundedRect(toggleX, toggleY, toggleW, toggleH, 4);
                });
                toggleZone.on('pointerout', () => {
                    const on = lawsSystem.isEnabled(lawId);
                    this._drawLawToggle(toggleBg, toggleX, toggleY, toggleW, toggleH, on);
                });
                this.worldLawsContainer.add(toggleZone);

                cy += 32;
            }

            cy += 8;
        }

        this.worldLawsContainer.setVisible(true);

        // Close other overlays
        if (this.worldStatsContainer.visible) this.worldStatsContainer.setVisible(false);
        if (this.shortcutsContainer.visible) this.shortcutsContainer.setVisible(false);
        if (this.diplomacyPanelContainer.visible) this.diplomacyPanelContainer.setVisible(false);
        if (this.historyContainer.visible) this.historyContainer.setVisible(false);
    }

    _drawLawToggle(graphics, x, y, w, h, isOn) {
        const color = isOn ? 0xa3be8c : 0xbf616a;
        graphics.clear();
        graphics.fillStyle(0x000000, 0.4);
        graphics.fillRoundedRect(x, y, w, h, 4);
        graphics.fillStyle(color, 0.85);
        graphics.fillRoundedRect(x + 1, y + 1, w - 2, h - 2, 3);
        graphics.lineStyle(1, 0xffffff, 0.15);
        graphics.strokeRoundedRect(x, y, w, h, 4);
    }

    hideWorldLawsPanel() {
        this.worldLawsContainer.setVisible(false);
    }

    // ============================================
    // HISTORY PANEL
    // ============================================
    showHistoryPanel() {
        this.historyContainer.removeAll(true);

        const panelW = Math.min(500, this.w - 40);
        const panelH = Math.min(450, this.h - 80);
        const px = this.w / 2 - panelW / 2;
        const py = this.h / 2 - panelH / 2;

        // Background overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, this.w, this.h);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.w, this.h), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => this.hideHistoryPanel());
        this.historyContainer.add(overlay);

        // Main panel
        const panelBg = this.add.graphics();
        this.drawPanel(panelBg, px, py, panelW, panelH);
        this.historyContainer.add(panelBg);

        // Title
        const title = this.add.text(px + panelW / 2, py + 12, '\uD83D\uDCD6 Lịch Sử Thế Giới', {
            fontFamily: '"VT323", monospace', fontSize: '18px', color: THEME.gold
        }).setOrigin(0.5, 0);
        this.historyContainer.add(title);

        // Close button
        const closeX = px + panelW - 20;
        const closeY = py + 10;
        const closeZone = this.add.zone(closeX, closeY, 24, 24).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(closeX, closeY, '\u2715', {
            fontFamily: '"VT323", monospace', fontSize: '16px', color: THEME.red
        }).setOrigin(0.5);
        closeZone.on('pointerdown', () => this.hideHistoryPanel());
        this.historyContainer.add([closeZone, closeText]);

        const contentX = px + 15;
        const contentW = panelW - 30;
        let cy = py + 38;

        // Stats summary
        const historySystem = this.gameSceneRef.historySystem;
        if (historySystem) {
            const stats = historySystem.getStats();
            const statsLine = `⚔️Chiến tranh: ${stats.totalWars}  ☄️Thảm họa: ${stats.totalDisasters}  👑Lập quốc: ${stats.kingdomsFounded}  💀Tiêu diệt: ${stats.kingdomsDestroyed}`;
            const statsText = this.add.text(contentX, cy, statsLine, {
                fontFamily: '"VT323", monospace', fontSize: '11px', color: THEME.cyan
            });
            this.historyContainer.add(statsText);
            cy += 18;

            // Divider
            const divider = this.add.graphics();
            divider.lineStyle(1, 0x4c566a, 0.5);
            divider.lineBetween(contentX, cy, contentX + contentW, cy);
            this.historyContainer.add(divider);
            cy += 6;

            // Event list
            const events = historySystem.getRecent(50);
            if (events.length === 0) {
                const emptyText = this.add.text(contentX, cy, 'Chưa có sự kiện nào.', {
                    fontFamily: '"VT323", monospace', fontSize: '13px', color: THEME.text
                });
                this.historyContainer.add(emptyText);
            } else {
                // Show events in reverse chronological order (newest first)
                const reversed = [...events].reverse();
                for (const event of reversed) {
                    if (cy > py + panelH - 20) break;

                    // Color by event type
                    let eventColor = THEME.text; // #eceff4
                    let typeIcon = '•';
                    switch (event.type) {
                        case 'war_declared':
                        case 'battle':
                            eventColor = '#bf616a'; typeIcon = '⚔️'; break;
                        case 'peace_made':
                        case 'settlement_founded':
                            eventColor = '#a3be8c'; typeIcon = '🏘️'; break;
                        case 'disaster':
                            eventColor = '#d08770'; typeIcon = '☄️'; break;
                        case 'leader_died':
                            eventColor = '#b48ead'; typeIcon = '👑'; break;
                        case 'era_changed':
                        case 'age_changed':
                            eventColor = '#81a1c1'; typeIcon = '📅'; break;
                        case 'building_built':
                            eventColor = '#a3be8c'; typeIcon = '🏗️'; break;
                        case 'settlement_destroyed':
                            eventColor = '#bf616a'; typeIcon = '💥'; break;
                        case 'race_extinct':
                            eventColor = '#b48ead'; typeIcon = '💀'; break;
                        case 'kingdom_founded':
                            eventColor = '#a3be8c'; typeIcon = '👑'; break;
                        default:
                            eventColor = '#eceff4'; typeIcon = '•'; break;
                    }

                    // Year badge
                    const year = event.year || 0;
                    const yearStr = `Năm ${year}`;
                    const yearText = this.add.text(contentX, cy, yearStr, {
                        fontFamily: '"VT323", monospace', fontSize: '10px', color: '#5e81ac',
                        backgroundColor: '#4c566a55',
                        padding: { x: 3, y: 1 }
                    });
                    this.historyContainer.add(yearText);

                    // Event description
                    const descText = this.add.text(contentX + 65, cy, `${typeIcon} ${event.description}`, {
                        fontFamily: '"VT323", monospace', fontSize: '12px', color: eventColor,
                        wordWrap: { width: contentW - 70 }
                    });
                    this.historyContainer.add(descText);

                    cy += Math.max(16, descText.height + 4);
                }
            }
        }

        this.historyContainer.setVisible(true);

        // Close other overlays
        if (this.worldStatsContainer.visible) this.worldStatsContainer.setVisible(false);
        if (this.shortcutsContainer.visible) this.shortcutsContainer.setVisible(false);
        if (this.diplomacyPanelContainer.visible) this.diplomacyPanelContainer.setVisible(false);
        if (this.worldLawsContainer.visible) this.worldLawsContainer.setVisible(false);
    }

    hideHistoryPanel() {
        this.historyContainer.setVisible(false);
    }

    // ============================================
    // DIPLOMACY PANEL
    // ============================================
    showDiplomacyPanel(settlement) {
        this.diplomacyPanelContainer.removeAll(true);
        this.diplomacyPanelContainer.setVisible(true);

        const gameScene = this.gameSceneRef;
        const kingdom = gameScene.kingdomManager.get(settlement.kingdomId);
        if (!kingdom) return;

        const pW = 280;
        const px = this.w - pW - 20;
        const py = 70;
        let pYOffset = 0;

        // Panel background (we'll resize after content)
        const bg = this.add.graphics();
        this.diplomacyPanelContainer.add(bg);

        // Header
        const headerText = this.add.text(px + pW / 2, py + 14, '🤝 Ngoại Giao', {
            fontFamily: '"VT323", monospace', fontSize: '18px', color: THEME.gold
        }).setOrigin(0.5, 0);
        this.diplomacyPanelContainer.add(headerText);
        pYOffset = py + 36;

        // Settlement info
        const settleText = this.add.text(px + 12, py + pYOffset - py, `${settlement.name} — ${kingdom.name}`, {
            fontFamily: '"VT323", monospace', fontSize: '13px', color: THEME.cyan
        });
        this.diplomacyPanelContainer.add(settleText);
        pYOffset += 20;

        // Divider
        const divGr = this.add.graphics();
        divGr.lineStyle(1, 0x4c566a, 0.5);
        divGr.lineBetween(px + 10, pYOffset, px + pW - 10, pYOffset);
        this.diplomacyPanelContainer.add(divGr);
        pYOffset += 8;

        // List all OTHER kingdoms
        const allKingdoms = gameScene.kingdomManager.getAll().filter(k => k.id !== kingdom.id);

        if (allKingdoms.length === 0) {
            const noText = this.add.text(px + 12, pYOffset, 'Không có vương quốc khác.', {
                fontFamily: '"VT323", monospace', fontSize: '12px', color: THEME.text
            });
            this.diplomacyPanelContainer.add(noText);
            pYOffset += 20;
        }

        for (const otherK of allKingdoms) {
            const kRace = getRace(otherK.raceId);
            const isEnemy = kingdom.enemies.has(otherK.id);
            const isAlly = kingdom.allies.has(otherK.id);
            let statusStr = '⚪ Trung lập';
            let statusColor = THEME.text;
            if (isEnemy) { statusStr = '🔴 Chiến tranh'; statusColor = THEME.red; }
            else if (isAlly) { statusStr = '🟢 Đồng minh'; statusColor = THEME.green; }

            // Kingdom name line
            const nameText = this.add.text(px + 12, pYOffset, `${kRace.icon} ${otherK.name}`, {
                fontFamily: '"VT323", monospace', fontSize: '13px', color: THEME.gold
            });
            this.diplomacyPanelContainer.add(nameText);
            pYOffset += 16;

            // Status line
            const statusText = this.add.text(px + 16, pYOffset, statusStr, {
                fontFamily: '"VT323", monospace', fontSize: '11px', color: statusColor
            });
            this.diplomacyPanelContainer.add(statusText);
            pYOffset += 16;

            // Buttons: Declare War + Make Peace
            const btnW = 110;
            const btnH = 24;
            const warBtnX = px + 16;
            const peaceBtnX = px + 16 + btnW + 8;
            const btnY = pYOffset;

            // War button
            const warBg = this.add.graphics();
            this.drawPanel(warBg, warBtnX, btnY, btnW, btnH, true, isEnemy);
            this.diplomacyPanelContainer.add(warBg);
            const warText = this.add.text(warBtnX + btnW / 2, btnY + btnH / 2, '⚔️ Tuyên Chiến', {
                fontFamily: '"VT323", monospace', fontSize: '11px', color: THEME.red
            }).setOrigin(0.5);
            this.diplomacyPanelContainer.add(warText);
            const warZone = this.add.zone(warBtnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
                .setInteractive({ useHandCursor: true });
            warZone.on('pointerdown', () => {
                this._playClick();
                gameScene.kingdomManager.declareWar(kingdom.id, otherK.id);
                this.showDiplomacyPanel(settlement); // refresh
            });
            warZone.on('pointerover', () => {
                this.drawPanel(warBg, warBtnX, btnY, btnW, btnH, true, true);
            });
            warZone.on('pointerout', () => {
                this.drawPanel(warBg, warBtnX, btnY, btnW, btnH, true, isEnemy);
            });
            this.diplomacyPanelContainer.add(warZone);

            // Peace button
            const peaceBg = this.add.graphics();
            this.drawPanel(peaceBg, peaceBtnX, btnY, btnW, btnH, true, !isEnemy);
            this.diplomacyPanelContainer.add(peaceBg);
            const peaceText = this.add.text(peaceBtnX + btnW / 2, btnY + btnH / 2, '🕊️ Hòa Bình', {
                fontFamily: '"VT323", monospace', fontSize: '11px', color: THEME.green
            }).setOrigin(0.5);
            this.diplomacyPanelContainer.add(peaceText);
            const peaceZone = this.add.zone(peaceBtnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
                .setInteractive({ useHandCursor: true });
            peaceZone.on('pointerdown', () => {
                this._playClick();
                gameScene.kingdomManager.makePeace(kingdom.id, otherK.id);
                this.showDiplomacyPanel(settlement); // refresh
            });
            peaceZone.on('pointerover', () => {
                this.drawPanel(peaceBg, peaceBtnX, btnY, btnW, btnH, true, true);
            });
            peaceZone.on('pointerout', () => {
                this.drawPanel(peaceBg, peaceBtnX, btnY, btnW, btnH, true, !isEnemy);
            });
            this.diplomacyPanelContainer.add(peaceZone);

            pYOffset += btnH + 10;

            // Small divider between kingdoms
            const kDivGr = this.add.graphics();
            kDivGr.lineStyle(1, 0x4c566a, 0.3);
            kDivGr.lineBetween(px + 20, pYOffset, px + pW - 20, pYOffset);
            this.diplomacyPanelContainer.add(kDivGr);
            pYOffset += 6;
        }

        // Close button
        const closeX = px + pW - 20;
        const closeY = py + 10;
        const closeZone = this.add.zone(closeX, closeY, 24, 24).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(closeX, closeY, '✕', {
            fontFamily: '"VT323", monospace', fontSize: '16px', color: THEME.red
        }).setOrigin(0.5);
        closeZone.on('pointerdown', () => {
            this.diplomacyPanelContainer.setVisible(false);
            this.registry.set('diplomacyTarget', null);
        });
        this.diplomacyPanelContainer.add([closeZone, closeText]);

        // Draw the background panel now that we know the height
        const pH = Math.max(120, pYOffset - py + 10);
        this.drawPanel(bg, px, py, pW, pH);
    }

    // ============================================
    // MINIMAP
    // ============================================
    createMinimap() {
        const minimapSize = 160;
        const mx = this.w - minimapSize - 20;
        const my = 90;

        this.minimapBg = this.add.graphics();
        this.drawPanel(this.minimapBg, mx - 4, my - 4, minimapSize + 8, minimapSize + 8);

        this.minimap = new Minimap(
            this,
            this.gameSceneRef.worldMap,
            mx, my, minimapSize
        );

        this.events.on('minimap-click', (tileX, tileY) => {
            const ts = this.gameSceneRef.worldMap.tileSize;
            const gameCam = this.gameSceneRef.cameras.main;
            gameCam.centerOn(tileX * ts, tileY * ts);
        });
    }

    updateMinimap() {
        if (!this.minimap) return;
        const gameCam = this.gameSceneRef.cameras.main;
        const settlements = this.gameSceneRef.settlementManager.getAll();
        this.minimap.updateOverlay(gameCam, settlements);
    }

    // ============================================
    // TOOLTIPS
    // ============================================
    showTooltip(name, desc, x, y) {
        this.hideTooltip();

        this.tooltip = this.add.container(x, y);

        const bg = this.add.graphics();
        const txt1 = this.add.text(0, -10, name, { fontFamily: '"VT323", monospace', fontSize: '14px', color: THEME.gold }).setOrigin(0.5);
        let txt2 = null;
        let dh = 30;
        let dw = Math.max(100, txt1.width + 20);

        if (desc) {
            txt2 = this.add.text(0, 10, desc, {
                fontFamily: '"VT323", monospace', fontSize: '11px', color: THEME.text,
                align: 'center', wordWrap: { width: 140 }
            }).setOrigin(0.5);
            dh += txt2.height;
            dw = Math.max(dw, txt2.width + 20);
        }

        bg.fillStyle(THEME.bgBorder, 0.95);
        bg.fillRoundedRect(-dw / 2, -25, dw, dh, 4);
        bg.lineStyle(1, THEME.btnHover, 0.5);
        bg.strokeRoundedRect(-dw / 2, -25, dw, dh, 4);

        this.tooltip.add(bg);
        this.tooltip.add(txt1);
        if (txt2) this.tooltip.add(txt2);
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.destroy();
            this.tooltip = null;
        }
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================
    showNotification(message) {
        if (this.notificationText) this.notificationText.destroy();

        this.notificationText = this.add.text(this.w / 2, 100, message, {
            fontFamily: '"VT323", monospace',
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#2a4a7fcc',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.notificationText,
            alpha: 0,
            y: 70,
            delay: 2000,
            duration: 800,
            onComplete: () => {
                if (this.notificationText) this.notificationText.destroy();
                this.notificationText = null;
            }
        });
    }

    showAgeTransition(ageName, ageColor) {
        // Dramatic full-width notification
        const notif = this.add.container(this.w / 2, this.h / 2);

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.4);
        overlay.fillRect(-this.w / 2, -40, this.w, 80);
        notif.add(overlay);

        const text = this.add.text(0, -10, `✦ ${ageName} ✦`, {
            fontFamily: '"VT323", monospace',
            fontSize: '28px',
            color: ageColor
        }).setOrigin(0.5);
        notif.add(text);

        const sub = this.add.text(0, 18, 'Kỷ nguyên mới đã bắt đầu!', {
            fontFamily: '"VT323", monospace',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        notif.add(sub);

        // Animate
        notif.setAlpha(0);
        notif.setScale(0.8);
        this.tweens.add({
            targets: notif,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: notif,
                    alpha: 0,
                    delay: 2500,
                    duration: 800,
                    onComplete: () => notif.destroy()
                });
            }
        });
    }

    // ============================================
    // REPOSITION UI ON RESIZE
    // ============================================
    repositionUI() {
        const hw = this.w / 2;

        // Rebuild bottom bar
        if (this.bottomBarContainer) {
            this.bottomBarContainer.removeAll(true);
            this.createBottomBar();
        }
        if (this.activeCategory) {
            this.buildToolPanel(this.activeCategory);
        }

        // Rebuild brush size
        if (this.brushSizeContainer) {
            this.brushSizeContainer.removeAll(true);
            this.createBrushSizeControl();
        }

        // Rebuild top panel
        if (this.topPanelContainer) {
            this.topPanelContainer.removeAll(true);
            this.createTopPanel();
        }

        // Rebuild minimap
        const minimapSize = 160;
        const mx = this.w - minimapSize - 20;
        const my = 90;
        this.minimapBg.clear();
        this.drawPanel(this.minimapBg, mx - 4, my - 4, minimapSize + 8, minimapSize + 8);
        if (this.minimap) {
            this.minimap.destroy();
            this.minimap = new Minimap(this, this.gameSceneRef.worldMap, mx, my, minimapSize);
        }

        // Rebuild overlays
        if (this.worldStatsContainer.visible) {
            this.createWorldStatsPanel();
            this.refreshWorldStatsContent();
        }
        if (this.shortcutsContainer.visible) {
            this.createShortcutsPanel();
        }
        if (this.worldLawsContainer.visible) {
            this.showWorldLawsPanel();
        }
        if (this.historyContainer.visible) {
            this.showHistoryPanel();
        }
    }
}
