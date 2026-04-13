const fs = require('fs');
const file = 'src/game/scenes/HudScene.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/'"VT323", monospace'/g, "'\"Inter\", sans-serif'");
content = content.replace(/"VT323"/g, '"Inter"');
fs.writeFileSync(file, content);
