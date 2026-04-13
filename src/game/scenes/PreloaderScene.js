import * as Phaser from 'phaser';
import { generateAllSpriteTextures } from '../rendering/SpriteGenerator.js';

export class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        // Background
        this.cameras.main.setBackgroundColor(0x0a0a1a);

        // Title
        this.add.text(w / 2, h / 2 - 80, '⚡ DeusBox', {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: '#e8d44d',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(w / 2, h / 2 - 30, 'God Simulator', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#8899aa'
        }).setOrigin(0.5);

        // Loading bar background
        const barBg = this.add.graphics();
        barBg.fillStyle(0x222244, 0.8);
        barBg.fillRect(w / 2 - 160, h / 2 + 20, 320, 24);

        // Loading bar fill
        const barFill = this.add.graphics();
        barFill.fillStyle(0xe8d44d, 1);
        barFill.fillRect(w / 2 - 158, h / 2 + 22, 316, 20);

        // Loading text
        const loadText = this.add.text(w / 2, h / 2 + 60, 'Generating sprites...', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#667788'
        }).setOrigin(0.5);

        // Generate all pixel sprite textures
        generateAllSpriteTextures(this);

        // Simulate a short loading delay, then go to menu
        this.time.delayedCall(800, () => {
            this.scene.start('MainMenuScene');
        });
    }
}
