import * as Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager.js';

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor(0x030816);

        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9, 0.5);
            this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 0.9, 1.2);
            const colorFX = this.cameras.main.postFX.addColorMatrix();
            colorFX.saturation(1.2);
            colorFX.contrast(1.1);
        }

        // Sao băng (Shooting stars)
        this.time.addEvent({
            delay: 1500,
            loop: true,
            callback: () => {
                if(Math.random() > 0.6) return; // 40% chance
                const sx = Math.random() * w;
                const sy = -20;
                const targetX = sx - w * 0.8;
                const targetY = h + 50;
                
                const shootingStar = this.add.line(0, 0, sx, sy, sx - 40, sy + 40, 0xffffff, 0.8).setOrigin(0);
                this.tweens.add({
                    targets: shootingStar,
                    x: -w * 0.8,
                    y: h + 50,
                    duration: 1200,
                    ease: 'Linear',
                    onComplete: () => shootingStar.destroy()
                });
            }
        });
        // Animated background stars
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            const star = this.add.circle(
                Math.random() * w,
                Math.random() * h,
                Math.random() * 2 + 0.5,
                0xffffff,
                Math.random() * 0.5 + 0.2
            );
            this.stars.push(star);
            this.tweens.add({
                targets: star,
                alpha: Math.random() * 0.3 + 0.1,
                duration: 1000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1
            });
        }

        // Background nebula glow
        const nebula1 = this.add.circle(w * 0.3, h * 0.4, 200, 0x2a1a5e, 0.08);
        const nebula2 = this.add.circle(w * 0.7, h * 0.6, 250, 0x1a3a5e, 0.06);
        this.tweens.add({
            targets: [nebula1, nebula2],
            scaleX: 1.1, scaleY: 1.1,
            duration: 5000,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Game globe icon
        const globe = this.add.text(w / 2, h * 0.22, '🌍', {
            fontSize: '80px'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: globe,
            angle: 5,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Game title
        const title = this.add.text(w / 2, h * 0.38, 'DeusBox', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '72px',
            color: '#e8d44d',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: title,
            scaleX: 1.03, scaleY: 1.03,
            duration: 2000,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle
        this.add.text(w / 2, h * 0.46, 'God Simulator', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '22px',
            color: '#7788aa'
        }).setOrigin(0.5);

        // Version
        this.add.text(w / 2, h * 0.50, 'v1.0.0', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#445566'
        }).setOrigin(0.5);

        // === BUTTONS ===
        let btnY = h * 0.59;

        // Continue button (if save exists)
        if (SaveManager.hasSave()) {
            const saveInfo = SaveManager.getSaveInfo();
            this.createMenuButton(w / 2, btnY, '📂  Continue', '#aaddff', () => {
                this.scene.start('GameScene', { mapSize: 150, loadSave: true });
            });

            if (saveInfo) {
                this.add.text(w / 2, btnY + 28, `${saveInfo.formattedDate} · ${saveInfo.entities} units`, {
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    color: '#445566'
                }).setOrigin(0.5);
            }

            btnY += 55;
        }

        // New World button
        this.createMenuButton(w / 2, btnY, '🌍  New World', '#e0e0e0', () => {
            this.startGame();
        });
        btnY += 50;

        // Map size selector
        this.mapSize = 150;
        const sizeY = btnY + 5;

        this.add.text(w / 2, sizeY, 'Map Size:', {
            fontFamily: '"Segoe UI", monospace',
            fontSize: '14px',
            color: '#667788'
        }).setOrigin(0.5);

        const sizes = [
            { label: 'Tiny (80)', value: 80 },
            { label: 'Small (120)', value: 120 },
            { label: 'Medium (150)', value: 150 },
            { label: 'Large (200)', value: 200 },
        ];

        const sizeGroup = [];
        sizes.forEach((s, i) => {
            const x = w / 2 + (i - 1.5) * 110;
            const sizeBtn = this.add.rectangle(x, sizeY + 30, 95, 28,
                s.value === this.mapSize ? 0x3a6aaf : 0x1a2a3f, 0.8
            ).setInteractive({ useHandCursor: true })
                .setStrokeStyle(1, 0x4a8adf, 0.3);

            const sizeTxt = this.add.text(x, sizeY + 30, s.label, {
                fontFamily: '"Segoe UI", monospace',
                fontSize: '11px',
                color: s.value === this.mapSize ? '#ffffff' : '#8899aa'
            }).setOrigin(0.5);

            sizeBtn.on('pointerdown', () => {
                this.mapSize = s.value;
                sizeGroup.forEach(g => {
                    g.btn.setFillStyle(0x1a2a3f, 0.8);
                    g.txt.setColor('#8899aa');
                });
                sizeBtn.setFillStyle(0x3a6aaf, 0.8);
                sizeTxt.setColor('#ffffff');
            });

            sizeBtn.on('pointerover', () => {
                if (s.value !== this.mapSize) sizeBtn.setFillStyle(0x2a3a5f, 0.8);
            });
            sizeBtn.on('pointerout', () => {
                if (s.value !== this.mapSize) sizeBtn.setFillStyle(0x1a2a3f, 0.8);
            });

            sizeGroup.push({ btn: sizeBtn, txt: sizeTxt });
        });

        // Quick Tips
        const tipsY = h * 0.88;
        const tips = [
            'WASD / Drag to pan • Scroll to zoom',
            'Select races to spawn civilizations',
            'Use disasters to reshape the world',
            'F5 Save · F9 Load · Space Pause'
        ];
        tips.forEach((tip, i) => {
            this.add.text(w / 2, tipsY + i * 16, tip, {
                fontFamily: '"Segoe UI", monospace',
                fontSize: '10px',
                color: '#3a4a5a'
            }).setOrigin(0.5);
        });

        // Keyboard shortcuts
        this.input.keyboard.on('keydown-ENTER', () => this.startGame());
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    }

    createMenuButton(x, y, label, color, callback) {
        const btn = this.add.rectangle(x, y, 260, 46, 0x2a4a7f, 0.9)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x4a8adf, 0.4);

        const btnText = this.add.text(x, y, label, {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '20px',
            color
        }).setOrigin(0.5);

        btn.on('pointerover', () => {
            btn.setFillStyle(0x3a6aaf, 1);
            btn.setStrokeStyle(2, 0x6aaaff, 0.6);
            btnText.setColor('#ffffff');
        });
        btn.on('pointerout', () => {
            btn.setFillStyle(0x2a4a7f, 0.9);
            btn.setStrokeStyle(2, 0x4a8adf, 0.4);
            btnText.setColor(color);
        });
        btn.on('pointerdown', callback);

        return btn;
    }

    startGame() {
        this.scene.start('GameScene', { mapSize: this.mapSize });
    }
}
