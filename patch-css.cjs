const fs = require('fs');
let css = fs.readFileSync('src/style.css', 'utf8');

// 1. HUD top bar height
css = css.replace(/#hud-top \{[\s\S]*?\n\}/, 
`#hud-top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: rgba(10, 10, 18, 0.95);
  border-bottom: 1px solid rgba(100,200,255,0.15);
  box-shadow: 0 4px 24px rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
  backdrop-filter: blur(12px);
}`);

// shrink hud-title
css = css.replace('font-size: 20px;', 'font-size: 15px;');
css = css.replace('letter-spacing: 4px;', 'letter-spacing: 2px;');
css = css.replace('margin-right: 16px;', 'margin-right: 10px;');

// shrink hud-stat
css = css.replace(/padding: 4px 10px;/g, 'padding: 2px 6px;');
css = css.replace(/font-size: 14px;/g, 'font-size: 12px;');
css = css.replace(/border-radius: 8px;/g, 'border-radius: 4px;');

// shrink hud-time
css = css.replace(/padding: 4px 14px;/g, 'padding: 2px 10px;');
css = css.replace(/font-size: 16px;/g, 'font-size: 14px;');

// shrink hud-btn
css = css.replace(/padding: 5px 14px;/g, 'padding: 2px 8px;');
css = css.replace(/font-size: 13px;/g, 'font-size: 11px;');

// 2. Colony pressure panel
css = css.replace(/#colony-pressure-panel \{[\s\S]*?\n\}/, 
`#colony-pressure-panel {
  position: fixed;
  top: 50px;
  left: 10px;
  width: 280px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(12, 12, 18, 0.95);
  border: 1px solid rgba(100,180,255,0.12);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  backdrop-filter: blur(10px);
  z-index: 95;
}`);

// Grid in pressure panel -> column
css = css.replace(/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/g, 
'grid-template-columns: 1fr; gap: 4px;');
css = css.replace(/min-height: 86px;/g, 'min-height: 40px; padding: 6px;');
css = css.replace(/font-size: 12px;/g, 'font-size: 11px;');

/* Modify Power Panel */
css = css.replace(/#power-panel \{[\s\S]*?\n\}/,
`#power-panel {
  position: fixed;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: rgba(12, 14, 30, 0.95);
  border: 1px solid rgba(100,180,255,0.15);
  border-radius: 12px;
  z-index: 100;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}`);

css = css.replace(/max-height: calc.*?;/, '');
css = css.replace(/overflow-y: auto;/, '');

css = css.replace(/\.panel-header \{[\s\S]*?\n\}/,
`.panel-header { display: none; }`);

css = css.replace(/\.power-section-label \{[\s\S]*?\n\}/g,
`.power-section-label { display: none; }`);
css = css.replace(/\.power-section-label:first-of-type \{[\s\S]*?\n\}/,
`.power-section-label:first-of-type { display: none; }`);

css = css.replace(/\.power-grid \{[\s\S]*?\n\}/g,
`.power-grid {
  display: flex;
  flex-direction: row;
  gap: 6px;
  padding-right: 12px;
  border-right: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 0;
}`);

css = css.replace(/\.power-btn \{[\s\S]*?\n\}/g,
`.power-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  padding: 4px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #aaa;
  position: relative;
  overflow: hidden;
}`);

/* Hide scrollbar styles since we removed scrolling for power-panel but keep them in general or just remove them */
css = css.replace(/#power-panel::-webkit-scrollbar \{[\s\S]*?\n\}/g, '');
css = css.replace(/#power-panel::-webkit-scrollbar-track \{[\s\S]*?\n\}/g, '');
css = css.replace(/#power-panel::-webkit-scrollbar-thumb \{[\s\S]*?\n\}/g, '');

/* Modify inspector panel */
css = css.replace(/#inspector-panel \{[\s\S]*?\n\}/,
`#inspector-panel {
  position: fixed;
  bottom: 70px;
  left: 10px;
  width: 250px;
  max-height: calc(100vh - 140px);
  background: rgba(12, 14, 30, 0.95);
  border: 1px solid rgba(100,180,255,0.15);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  z-index: 100;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  transition: transform 0.3s, opacity 0.3s;
}`);

/* Fix minimap positioning to not overlap power panel on very small screens, maybe leave it alone */

fs.writeFileSync('src/style.css', css);
console.log('Patched style.css');
