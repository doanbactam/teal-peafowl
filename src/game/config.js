import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloaderScene } from './scenes/PreloaderScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HudScene } from './scenes/HudScene.js';

export const gameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#1a1a2e',
    disableContextMenu: true,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    scene: [BootScene, PreloaderScene, MainMenuScene, GameScene, HudScene],
    fps: {
        target: 60,
        smoothStep: true
    }
};
