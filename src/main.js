import { Game } from './game.js';

// Setup UI interactions
function setupUI(game) {
  // Power buttons
  const powerBtns = document.querySelectorAll('.power-btn');
  powerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      powerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const power = btn.dataset.power;
      game.godPowers.setActive(power);

      // Update info
      document.getElementById('info-text').textContent =
        `Selected: ${btn.querySelector('.power-name').textContent}`;

      // Change cursor style based on power
      const canvas = game.renderer.domElement;
      if (power === 'select') {
        canvas.style.cursor = 'default';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    });
  });

  // Speed button
  document.getElementById('btn-speed').addEventListener('click', () => {
    game.cycleSpeed();
  });

  // Minimap click
  const minimap = document.getElementById('minimap');
  minimap.addEventListener('click', (e) => {
    const rect = minimap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const z = (e.clientY - rect.top) / rect.height;

    const halfSize = game.terrain.size / 2;
    const worldX = (x - 0.5) * game.terrain.size;
    const worldZ = (z - 0.5) * game.terrain.size;

    game.cameraTarget.set(worldX, 0, worldZ);
    game.updateCameraPosition();
  });

  // Minimap hover
  minimap.addEventListener('mousemove', (e) => {
    const rect = minimap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const z = (e.clientY - rect.top) / rect.height;

    const tx = Math.floor(x * game.terrain.size);
    const tz = Math.floor(z * game.terrain.size);
    const tile = game.terrain.tiles.get(`${tx},${tz}`);
    if (tile) {
      const biomeNames = ['Deep Water','Shallow Water','Beach','Grassland','Forest','Dense Forest','Mountain','Snow','Desert','Savanna','Tundra','Tropical Forest','Snow Peak'];
      minimap.title = `(${tx}, ${tz}) ${biomeNames[tile.biome]}`;
    }
  });
}

// Update minimap periodically (every 10 frames, not every frame)
let minimapFrame = 0
function updateMinimap(game) {
  minimapFrame++
  const shouldRedrawTerrain = minimapFrame % 30 === 0

  if (shouldRedrawTerrain) {
    const canvas = document.getElementById('minimap');
    game.terrain.drawMinimap(canvas);
  }

  // Draw creatures + viewport every 10 frames
  if (minimapFrame % 10 === 0) {
    const canvas = document.getElementById('minimap');
    const ctx = canvas.getContext('2d');
    const halfSize = game.terrain.size / 2;
    const scaleX = canvas.width / game.terrain.size;
    const scaleZ = canvas.height / game.terrain.size;

    // Redraw terrain first to clear old dots
    game.terrain.drawMinimap(canvas);

    for (const creature of game.creatureManager.creatures) {
      if (!creature.alive) continue;
      const mx = (creature.tileX) * scaleX;
      const mz = (creature.tileZ) * scaleZ;

      if (creature.type === 'human') {
        ctx.fillStyle = creature.faction === 0 ? '#42a5f5' : '#ef5350';
        ctx.fillRect(mx - 1.5, mz - 1.5, 3, 3);
      } else {
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(mx - 1, mz - 1, 2, 2);
      }
    }

    // Draw camera viewport
    const camX = game.cameraTarget.x;
    const camZ = game.cameraTarget.z;
    const viewSize = game.cameraDistance * 0.5;
    const vmx = (camX + halfSize) * scaleX;
    const vmz = (camZ + halfSize) * scaleZ;
    const vsize = viewSize * scaleX;

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(vmx - vsize, vmz - vsize, vsize * 2, vsize * 2);
  }

  requestAnimationFrame(() => updateMinimap(game));
}

// Loading screen
function showLoading() {
  const loading = document.createElement('div');
  loading.className = 'loading-screen';
  loading.innerHTML = '<div class="spinner"></div><div>GODBOX</div><div style="font-size:12px;margin-top:8px;color:#78909c">Generating world...</div>';
  document.body.appendChild(loading);
  return loading;
}

// Init
const loading = showLoading();

// Small delay to show loading screen
setTimeout(() => {
  const game = new Game();
  setupUI(game);
  updateMinimap(game);

  // Remove loading screen
  loading.style.opacity = '0';
  loading.style.transition = 'opacity 0.5s';
  setTimeout(() => loading.remove(), 500);

  console.log('GodBox initialized!');
  console.log('Controls: WASD/Arrows to move, Q/E to rotate, +/- to zoom, Space to change speed');
  console.log('Left click: Use selected power, Right click/Middle: Pan, Scroll: Zoom');
}, 100);
