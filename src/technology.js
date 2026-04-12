// Technology & Age Advancement System

export const AGES = {
  STONE: 0,
  BRONZE: 1,
  IRON: 2,
  IMPERIAL: 3,
  MYTHIC: 4,
  TRANSCENDENT: 5,
};

const AGE_NAMES = ['Stone Age', 'Bronze Age', 'Iron Age', 'Imperial Age', 'Mythic Age', 'Transcendent Age'];
const AGE_COLORS = ['#9e9e9e', '#cd7f32', '#607d8b', '#ffd700', '#ba68c8', '#00bcd4'];
const AGE_ICONS = ['🪨', '⚔️', '🛡️', '👑', '🔮', '🌌'];

const TECHNOLOGIES = [
  // STONE AGE
  {
    id: 'agriculture',
    name: 'Agriculture',
    icon: '🌱',
    age: AGES.STONE,
    cost: { food: 30, wood: 20 },
    researchTime: 15,
    description: 'Farms produce 50% more food',
    effects: { farmBoost: 1.5 },
  },
  {
    id: 'hunting',
    name: 'Hunting Techniques',
    icon: '🏹',
    age: AGES.STONE,
    cost: { food: 20, wood: 15 },
    researchTime: 12,
    description: 'Humans deal +5 damage when hunting',
    effects: { huntingDamage: 5 },
  },
  {
    id: 'stoneworking',
    name: 'Stoneworking',
    icon: '⛏️',
    age: AGES.STONE,
    cost: { wood: 25, stone: 15 },
    researchTime: 14,
    description: 'Mining yields +50% stone',
    effects: { miningBoost: 1.5 },
  },
  {
    id: 'medicine',
    name: 'Herbal Medicine',
    icon: '🌿',
    age: AGES.STONE,
    cost: { food: 25 },
    researchTime: 10,
    description: 'Resting heals 2x faster',
    effects: { healingBoost: 2.0 },
  },

  // BRONZE AGE
  {
    id: 'bronze_tools',
    name: 'Bronze Tools',
    icon: '🔨',
    age: AGES.BRONZE,
    cost: { stone: 40, gold: 20 },
    researchTime: 20,
    description: 'Gathering speed +30%, buildings cost 15% less',
    effects: { gatherSpeed: 1.3, buildDiscount: 0.85 },
    requires: ['stoneworking'],
  },
  {
    id: 'irrigation',
    name: 'Irrigation',
    icon: '💧',
    age: AGES.BRONZE,
    cost: { wood: 30, stone: 20 },
    researchTime: 18,
    description: 'Farms produce food 2x faster',
    effects: { farmSpeed: 2.0 },
    requires: ['agriculture'],
  },
  {
    id: 'archery',
    name: 'Archery',
    icon: '🎯',
    age: AGES.BRONZE,
    cost: { wood: 30, gold: 15 },
    researchTime: 16,
    description: 'Towers deal damage, humans +8 ATK',
    effects: { towerAttack: true, humanAttack: 8 },
    requires: ['hunting'],
  },
  {
    id: 'currency',
    name: 'Currency',
    icon: '🪙',
    age: AGES.BRONZE,
    cost: { gold: 30 },
    researchTime: 15,
    description: 'Markets generate gold, trade caravans arrive more often',
    effects: { marketIncome: true, tradeBoost: 1.5 },
  },
  {
    id: 'animal_husbandry',
    name: 'Animal Husbandry',
    icon: '🐑',
    age: AGES.BRONZE,
    cost: { food: 35, wood: 20 },
    researchTime: 14,
    description: 'Passive animals near farms produce food',
    effects: { animalFarming: true },
    requires: ['agriculture'],
  },

  // IRON AGE
  {
    id: 'iron_weapons',
    name: 'Iron Weapons',
    icon: '⚔️',
    age: AGES.IRON,
    cost: { stone: 60, gold: 40 },
    researchTime: 25,
    description: 'All humans +15 ATK, +5 DEF',
    effects: { humanAttack: 15, humanDefense: 5 },
    requires: ['bronze_tools', 'archery'],
  },
  {
    id: 'masonry',
    name: 'Masonry',
    icon: '🏰',
    age: AGES.IRON,
    cost: { stone: 50, wood: 30 },
    researchTime: 22,
    description: 'Walls/Towers +50% HP, unlock Castle',
    effects: { fortificationHP: 1.5, unlockCastle: true },
    requires: ['bronze_tools'],
  },
  {
    id: 'philosophy',
    name: 'Philosophy',
    icon: '📜',
    age: AGES.IRON,
    cost: { gold: 50 },
    researchTime: 20,
    description: 'EXP gain +50%, unlock Academy',
    effects: { expBoost: 1.5, unlockAcademy: true },
    requires: ['currency'],
  },
  {
    id: 'navigation',
    name: 'Navigation',
    icon: '🧭',
    age: AGES.IRON,
    cost: { wood: 40, gold: 30 },
    researchTime: 18,
    description: 'Units can cross shallow water, unlock Harbor',
    effects: { waterCrossing: true, unlockHarbor: true },
    requires: ['currency'],
  },

  // IMPERIAL AGE
  {
    id: 'steel',
    name: 'Steel Forging',
    icon: '🗡️',
    age: AGES.IMPERIAL,
    cost: { stone: 80, gold: 60 },
    researchTime: 30,
    description: 'All humans +25 ATK, +10 DEF, spawn Heroes',
    effects: { humanAttack: 25, humanDefense: 10, heroSpawn: true },
    requires: ['iron_weapons'],
  },
  {
    id: 'engineering',
    name: 'Engineering',
    icon: '⚙️',
    age: AGES.IMPERIAL,
    cost: { wood: 60, stone: 60, gold: 40 },
    researchTime: 28,
    description: 'All buildings +100% production, cost -25%',
    effects: { productionBoost: 2.0, buildDiscount: 0.75 },
    requires: ['masonry'],
  },
  {
    id: 'theology',
    name: 'Theology',
    icon: '🙏',
    age: AGES.IMPERIAL,
    cost: { gold: 80 },
    researchTime: 25,
    description: 'Temple heals all units, divine powers cost less',
    effects: { templeHealAll: true, divinePowerBoost: true },
    requires: ['philosophy'],
  },

  // MYTHIC AGE
  {
    id: 'mythic_materials',
    name: 'Mythic Materials',
    icon: '🔮',
    age: AGES.MYTHIC,
    cost: { stone: 200, gold: 100 },
    researchTime: 40,
    description: 'All humans +30 ATK, +15 DEF. Heroes become legendary.',
    effects: { humanAttack: 30, humanDefense: 15, mythicHeroes: true },
    requires: ['steel'],
  },
  {
    id: 'divine_architecture',
    name: 'Divine Architecture',
    icon: '🏛️',
    age: AGES.MYTHIC,
    cost: { wood: 150, stone: 150, gold: 150 },
    researchTime: 35,
    description: 'Buildings +50% HP, Towers shoot faster.',
    effects: { fortificationHP: 1.5, towerSpeed: 1.5 },
    requires: ['engineering'],
  },
  {
    id: 'planar_binding',
    name: 'Planar Binding',
    icon: '🌌',
    age: AGES.MYTHIC,
    cost: { gold: 200, faith: 100 },
    researchTime: 40,
    description: 'Temples generate 2x faith, unlocks planar summons.',
    effects: { techFaithBoost: 2.0, planarSummons: true },
    requires: ['theology'],
  },

  // TRANSCENDENT AGE
  {
    id: 'ascension',
    name: 'Ascension',
    icon: '🌟',
    age: AGES.TRANSCENDENT,
    cost: { gold: 500, faith: 300 },
    researchTime: 60,
    description: 'Humans become demi-gods. Massive health and damage boost.',
    effects: { humanAttack: 50, humanDefense: 30, demiGods: true },
    requires: ['planar_binding', 'mythic_materials'],
  },
  {
    id: 'heavenly_forge',
    name: 'Heavenly Forge',
    icon: '⚒️',
    age: AGES.TRANSCENDENT,
    cost: { wood: 300, stone: 300, gold: 300 },
    researchTime: 50,
    description: 'Production buildings operate 3x faster.',
    effects: { productionBoost: 3.0 },
    requires: ['divine_architecture'],
  },
];

export class TechTree {
  constructor(game) {
    this.game = game;
    this.researched = new Set();
    this.currentAge = AGES.STONE;
    this.researchQueue = null; // { tech, progress, time }
    this.effects = {};
    
    this.createUI();
  }

  createUI() {
    // Create tech panel toggle button
    const hud = document.getElementById('hud-top');
    const hudRight = hud.querySelector('.hud-right');
    
    const ageBtn = document.createElement('div');
    ageBtn.id = 'age-display';
    ageBtn.className = 'hud-stat';
    ageBtn.style.cursor = 'pointer';
    ageBtn.innerHTML = `<span class="stat-icon">${AGE_ICONS[0]}</span><span id="stat-age">Stone Age</span>`;
    ageBtn.title = 'Click to open Technology Tree';
    ageBtn.addEventListener('click', () => this.togglePanel());
    hudRight.insertBefore(ageBtn, hudRight.firstChild);

    // Create tech panel
    const panel = document.createElement('div');
    panel.id = 'tech-panel';
    panel.className = 'tech-panel';
    panel.innerHTML = `
      <div class="tech-panel-header">
        <span>📚 TECHNOLOGY TREE</span>
        <button class="tech-close-btn" id="tech-close">✕</button>
      </div>
      <div class="tech-age-display">
        <span id="tech-current-age" class="tech-age-badge">${AGE_ICONS[0]} Stone Age</span>
        <div class="tech-progress-container" id="tech-progress-container" style="display:none">
          <div class="tech-progress-label" id="tech-progress-label">Researching...</div>
          <div class="tech-progress-bar-bg"><div class="tech-progress-bar" id="tech-progress-bar"></div></div>
        </div>
      </div>
      <div class="tech-grid" id="tech-grid"></div>
      <div class="tech-advance-container">
        <button class="tech-advance-btn" id="tech-advance-btn" disabled>
          ⬆️ Advance to <span id="tech-next-age">Bronze Age</span>
        </button>
        <div class="tech-advance-cost" id="tech-advance-cost"></div>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('tech-close').addEventListener('click', () => this.togglePanel());
    document.getElementById('tech-advance-btn').addEventListener('click', () => this.advanceAge());

    this.renderTechGrid();
    this.updateAdvanceButton();
  }

  togglePanel() {
    const panel = document.getElementById('tech-panel');
    panel.classList.toggle('visible');
    if (panel.classList.contains('visible')) {
      this.renderTechGrid();
      this.updateAdvanceButton();
    }
  }

  renderTechGrid() {
    const grid = document.getElementById('tech-grid');
    grid.innerHTML = '';

    // Show techs for current and previous ages
    const availableTechs = TECHNOLOGIES.filter(t => t.age <= this.currentAge);

    for (const tech of availableTechs) {
      const isResearched = this.researched.has(tech.id);
      const isResearching = this.researchQueue && this.researchQueue.tech.id === tech.id;
      const canResearch = this.canResearch(tech);
      const meetsReqs = this.meetsRequirements(tech);

      const btn = document.createElement('button');
      btn.className = `tech-btn ${isResearched ? 'researched' : ''} ${isResearching ? 'researching' : ''} ${!meetsReqs ? 'locked' : ''} ${canResearch ? 'available' : ''}`;
      btn.innerHTML = `
        <span class="tech-icon">${tech.icon}</span>
        <span class="tech-name">${tech.name}</span>
        ${isResearched ? '<span class="tech-check">✓</span>' : ''}
        ${!meetsReqs ? '<span class="tech-lock">🔒</span>' : ''}
      `;
      btn.title = `${tech.name}\n${tech.description}\n${this.getCostString(tech)}${tech.requires ? '\nRequires: ' + tech.requires.join(', ') : ''}`;

      if (canResearch && !isResearched && !isResearching) {
        btn.addEventListener('click', () => this.startResearch(tech));
      }

      grid.appendChild(btn);
    }
  }

  getCostString(tech) {
    return Object.entries(tech.cost).map(([res, amt]) => `${res}: ${amt}`).join(', ');
  }

  canResearch(tech) {
    if (this.researched.has(tech.id)) return false;
    if (this.researchQueue) return false;
    if (tech.age > this.currentAge) return false;
    if (!this.meetsRequirements(tech)) return false;

    // Check cost
    const resources = this.game.resources;
    for (const [res, amount] of Object.entries(tech.cost)) {
      if ((resources[res] || 0) < amount) return false;
    }
    return true;
  }

  meetsRequirements(tech) {
    if (!tech.requires) return true;
    return tech.requires.every(req => this.researched.has(req));
  }

  startResearch(tech) {
    if (!this.canResearch(tech)) return;

    // Deduct cost
    for (const [res, amount] of Object.entries(tech.cost)) {
      this.game.resources[res] -= amount;
    }

    this.researchQueue = {
      tech,
      progress: 0,
      time: tech.researchTime,
    };

    // Show progress
    document.getElementById('tech-progress-container').style.display = 'block';
    document.getElementById('tech-progress-label').textContent = `Researching: ${tech.name}`;

    // Notification
    this.showNotification(`📚 Researching ${tech.icon} ${tech.name}...`, 'info');
    this.renderTechGrid();
  }

  completeResearch(tech) {
    this.researched.add(tech.id);
    this.researchQueue = null;

    // Apply effects
    for (const [key, value] of Object.entries(tech.effects)) {
      if (typeof value === 'number' && this.effects[key]) {
        this.effects[key] *= value; // Multiplicative stacking
      } else {
        this.effects[key] = value;
      }
    }

    // Apply immediate stat boosts
    if (tech.effects.humanAttack) {
      for (const c of this.game.creatureManager.creatures) {
        if (c.alive && c.type === 'human') {
          c.attack += tech.effects.humanAttack;
        }
      }
    }
    if (tech.effects.humanDefense) {
      for (const c of this.game.creatureManager.creatures) {
        if (c.alive && c.type === 'human') {
          c.defense += tech.effects.humanDefense;
        }
      }
    }

    // Hide progress
    document.getElementById('tech-progress-container').style.display = 'none';

    // Notification
    this.showNotification(`✅ ${tech.icon} ${tech.name} researched! ${tech.description}`, 'success');

    this.renderTechGrid();
    this.updateAdvanceButton();
  }

  getAdvanceCost() {
    const ageCosts = [
      null, // Can't go before stone
      { food: 100, wood: 80, stone: 50, gold: 30 },   // Bronze
      { food: 200, wood: 150, stone: 120, gold: 80 },  // Iron
      { food: 400, wood: 300, stone: 250, gold: 150 }, // Imperial
      { food: 800, wood: 500, stone: 400, gold: 300, faith: 100 }, // Mythic
      { food: 2000, wood: 1500, stone: 1000, gold: 800, faith: 400 }, // Transcendent
    ];
    return ageCosts[this.currentAge + 1] || null;
  }

  getAdvanceRequiredTechs() {
    // Need at least 2 techs from current age
    const currentAgeTechs = TECHNOLOGIES.filter(t => t.age === this.currentAge);
    const researched = currentAgeTechs.filter(t => this.researched.has(t.id));
    return { required: 2, current: researched.length };
  }

  canAdvanceAge() {
    if (this.currentAge >= AGES.TRANSCENDENT) return false;
    
    const techReq = this.getAdvanceRequiredTechs();
    if (techReq.current < techReq.required) return false;

    const cost = this.getAdvanceCost();
    if (!cost) return false;
    
    for (const [res, amount] of Object.entries(cost)) {
      if ((this.game.resources[res] || 0) < amount) return false;
    }
    return true;
  }

  advanceAge() {
    if (!this.canAdvanceAge()) return;

    const cost = this.getAdvanceCost();
    for (const [res, amount] of Object.entries(cost)) {
      this.game.resources[res] -= amount;
    }

    this.currentAge++;

    // Update UI
    const ageEl = document.getElementById('stat-age');
    ageEl.textContent = AGE_NAMES[this.currentAge];
    ageEl.style.color = AGE_COLORS[this.currentAge];

    const ageBadge = document.getElementById('tech-current-age');
    ageBadge.textContent = `${AGE_ICONS[this.currentAge]} ${AGE_NAMES[this.currentAge]}`;
    ageBadge.style.color = AGE_COLORS[this.currentAge];

    const ageIcon = document.querySelector('#age-display .stat-icon');
    ageIcon.textContent = AGE_ICONS[this.currentAge];

    // Age advancement bonuses
    for (const c of this.game.creatureManager.creatures) {
      if (c.alive && c.type === 'human') {
        const hpBoost = this.currentAge >= AGES.MYTHIC ? 50 : 20;
        const atkBoost = this.currentAge >= AGES.MYTHIC ? 15 : 5;
        const defBoost = this.currentAge >= AGES.MYTHIC ? 10 : 3;

        c.maxHealth += hpBoost;
        c.health = c.maxHealth;
        c.attack += atkBoost;
        c.defense += defBoost;
      }
    }

    // Grand notification
    this.showNotification(`👑 Advanced to ${AGE_ICONS[this.currentAge]} ${AGE_NAMES[this.currentAge]}! All units empowered!`, 'success');
    
    // Screen flash
    this.game.godPowers.screenFlash(AGE_COLORS[this.currentAge] + '44', 500);
    this.game.godPowers.shakeCamera(0.2, 300);

    this.renderTechGrid();
    this.updateAdvanceButton();
  }

  updateAdvanceButton() {
    const btn = document.getElementById('tech-advance-btn');
    const costEl = document.getElementById('tech-advance-cost');
    const nextAgeEl = document.getElementById('tech-next-age');

    if (this.currentAge >= AGES.TRANSCENDENT) {
      btn.style.display = 'none';
      costEl.textContent = 'Maximum age reached!';
      return;
    }

    nextAgeEl.textContent = AGE_NAMES[this.currentAge + 1];
    
    const cost = this.getAdvanceCost();
    const techReq = this.getAdvanceRequiredTechs();
    
    costEl.innerHTML = `Cost: ${Object.entries(cost).map(([r,a]) => `${r}:${a}`).join(' | ')}<br>Techs: ${techReq.current}/${techReq.required} researched`;

    btn.disabled = !this.canAdvanceAge();
  }

  showNotification(message, type) {
    const container = document.getElementById('event-notifications');
    if (!container) return;
    const notif = document.createElement('div');
    notif.className = `event-notification event-${type}`;
    notif.innerHTML = `<span class="event-text">${message}</span>`;
    container.appendChild(notif);
    setTimeout(() => notif.remove(), 4500);
  }

  update(dt) {
    if (this.researchQueue) {
      this.researchQueue.progress += dt;
      
      const pct = Math.min(100, (this.researchQueue.progress / this.researchQueue.time) * 100);
      const bar = document.getElementById('tech-progress-bar');
      if (bar) bar.style.width = `${pct}%`;

      if (this.researchQueue.progress >= this.researchQueue.time) {
        this.completeResearch(this.researchQueue.tech);
      }
    }
  }

  getEffect(key) {
    return this.effects[key] || null;
  }

  hasEffect(key) {
    return !!this.effects[key];
  }
}
