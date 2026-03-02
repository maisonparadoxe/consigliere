// ══════════════════════════════════════════════════════
//   CONSIGLIERE — script.js
//   Chargement des données JSON puis init du jeu
// ══════════════════════════════════════════════════════

let state = {};
let DATA = { territories: [], events: {}, stats: {} };

const TYPE_COLORS = {
  "Résidentiel":"#5dbb6e", "Casino":"#f59e0b", "Port":"#60a5fa",
  "Politique":"#a78bfa", "Industriel":"#f87171"
};

// ── LOAD ALL JSON DATA ──
async function loadData() {
  const [territories, events, stats] = await Promise.all([
    fetch('data/territories.json').then(r => r.json()),
    fetch('data/events.json').then(r => r.json()),
    fetch('data/stats.json').then(r => r.json()),
  ]);
  DATA.territories = territories;
  DATA.events = events;
  DATA.stats = stats;
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  showScreen('intro');
});

// ── START GAME ──
function startGame(choice) {
  // Deep copy initial state from JSON
  state = {
    turn: 1,
    act: 1,
    actionsLeft: DATA.stats.actionsPerTurn,
    selectedTerritory: null,
    triggeredNarratives: new Set(),
    family: { ...DATA.stats.family },
    consigliere: { ...DATA.stats.consigliere },
    territories: JSON.parse(JSON.stringify(DATA.territories)),
  };

  if (choice === 'negotiate') {
    state.family.alliances += 20;
    state.family.politics  += 10;
    addLog("Vous négociez avec les Scorpioni. Un armistice fragile. +Alliances, +Politique.", "important");
  } else {
    state.family.power  += 15;
    state.family.threat += 10;
    state.territories[3].owner = 'castellano';
    addLog("Vous attaquez les lignes Scorpioni. Succès partiel aux Docks. +Puissance, +Menace.", "danger");
  }

  showScreen('game');
  buildMap();
  updateUI();
  updatePips();
}

// ── MAP ──
function buildMap() {
  const grid = document.getElementById('map-grid');
  grid.innerHTML = '';
  state.territories.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'territory';
    div.dataset.id = i;
    div.dataset.owner = t.owner;
    div.onclick = () => selectTerritory(i);
    const typeColor = TYPE_COLORS[t.type] || '#888';
    div.innerHTML = `
      <div class="territory-owner-badge ${t.owner}"></div>
      <div>
        <div class="territory-name">${t.name}</div>
        <div class="territory-type" style="color:${typeColor}60">${t.type}</div>
      </div>
      <div>
        <div class="territory-income">+$${t.income.toLocaleString()}</div>
        <div class="territory-defense">Déf. ${t.defense}%</div>
      </div>
      <div style="position:absolute;bottom:4px;left:6px;width:4px;height:4px;border-radius:50%;background:${typeColor}"></div>
    `;
    grid.appendChild(div);
  });
}

// ── SELECT TERRITORY ──
function selectTerritory(id) {
  state.selectedTerritory = id;
  document.querySelectorAll('.territory').forEach(el => el.classList.remove('selected'));
  document.querySelector(`.territory[data-id="${id}"]`).classList.add('selected');

  const t = state.territories[id];
  const canAttack  = t.owner !== 'castellano' && isAdjacent(id);
  const canCorrupt = t.owner !== 'castellano' && t.type === 'Politique';
  const canImprove = t.owner === 'castellano';

  document.getElementById('btn-attack').disabled  = !(canAttack  && state.actionsLeft > 0);
  document.getElementById('btn-corrupt').disabled = !(canCorrupt && state.actionsLeft > 0);
  document.getElementById('btn-improve').disabled = !(canImprove && state.actionsLeft > 0);

  const ownerLabels = { castellano:"Castellano (vous)", scorpioni:"Scorpioni", moretti:"Moretti", neutral:"Neutre" };
  document.getElementById('territory-info').innerHTML = `
    <strong style="color:var(--gold);font-family:'Playfair Display',serif">${t.name}</strong><br>
    <span style="color:${TYPE_COLORS[t.type]}">● ${t.type}</span><br><br>
    Propriétaire : <em>${ownerLabels[t.owner]}</em><br>
    Revenu : <span style="color:#5dbb6e">$${t.income.toLocaleString()}/tour</span><br>
    Défense : ${t.defense}% · Menace : +${t.threatBonus}<br><br>
    <span style="font-size:0.7rem;color:var(--text-dim)">
      ${canAttack  ? '⚔ Attaquable  '  : ''}
      ${canCorrupt ? '💰 Corruptible  ' : ''}
      ${canImprove ? '🔧 Améliorable'   : ''}
    </span>
  `;
}

function isAdjacent(id) {
  const myIds = state.territories.filter(t => t.owner === 'castellano').map(t => t.id);
  return state.territories[id].adjacent.some(adj => myIds.includes(adj));
}

// ── ACTIONS ──
function doAction(type) {
  if (state.actionsLeft <= 0 || state.selectedTerritory === null) return;
  const t = state.territories[state.selectedTerritory];

  if (type === 'attack') {
    const roll = Math.random() * 100;
    const success = roll + state.family.power * 0.5 > t.defense + 30;
    if (success) {
      const prev = t.owner;
      t.owner = 'castellano';
      state.family.power  -= 10;
      state.family.threat += t.threatBonus + 5;
      addLog(`✓ Attaque réussie sur ${t.name} (ex-${prev}). +Menace.`, "important");
    } else {
      state.family.power         -= 5;
      state.consigliere.loyalty  -= 5;
      addLog(`✗ Attaque sur ${t.name} repoussée. -Puissance, -Loyauté.`, "danger");
    }
  }

  if (type === 'corrupt') {
    if (state.family.finances < 1000) { addLog("Fonds insuffisants pour corrompre.", "danger"); return; }
    state.family.finances -= 1000;
    state.family.politics += 15;
    t.owner = 'castellano';
    addLog(`${t.name} corrompu. -$1000, +Réseau Politique.`, "important");
  }

  if (type === 'improve') {
    if (state.family.finances < 800) { addLog("Fonds insuffisants pour améliorer.", "danger"); return; }
    state.family.finances -= 800;
    t.income  = Math.round(t.income * 1.25);
    t.defense = Math.min(95, t.defense + 15);
    addLog(`${t.name} amélioré. Revenus +25%, Défense +15. Coût : $800.`, "important");
  }

  spendAction();
  buildMap();
  updateUI();
  selectTerritory(state.selectedTerritory);
}

function spendAction() {
  state.actionsLeft--;
  updatePips();
  if (state.actionsLeft === 0) {
    ['btn-attack','btn-corrupt','btn-improve'].forEach(id => document.getElementById(id).disabled = true);
  }
}

function updatePips() {
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`pip${i}`).classList.toggle('used', i > state.actionsLeft);
  }
}

// ── END TURN ──
function endTurn() {
  // Income
  let income = 0;
  state.territories.forEach(t => { if (t.owner === 'castellano') income += t.income; });
  state.family.finances += income;

  // AI
  aiTurn();

  // Random event
  const rEvents = DATA.events.random;
  const evt = rEvents[Math.floor(Math.random() * rEvents.length)];
  applyEffects(evt.effects);
  addLog(`[${evt.tag}] ${evt.text}`, (evt.effects.threat || 0) > 5 ? "danger" : "");

  // Passive changes
  state.family.threat        = Math.max(0, state.family.threat - 2);
  state.consigliere.influence = clamp(state.consigliere.influence + (state.family.politics > 40 ? 1 : -1), 0, 100);

  state.turn++;
  state.actionsLeft = DATA.stats.actionsPerTurn;

  checkNarrativeEvents();
  checkActTransition();
  checkGameOver();

  buildMap();
  updateUI();
  updatePips();

  addLog(`— Fin du Tour ${state.turn - 1}. Revenus : $${income.toLocaleString()} —`, "important");

  // Reset selection
  state.selectedTerritory = null;
  document.querySelectorAll('.territory').forEach(el => el.classList.remove('selected'));
  ['btn-attack','btn-corrupt','btn-improve'].forEach(id => document.getElementById(id).disabled = true);
  document.getElementById('territory-info').textContent = "Sélectionnez un territoire sur la carte.";
}

// ── AI ──
function aiTurn() {
  if (Math.random() < 0.25) {
    const mine = state.territories.filter(t => t.owner === 'castellano');
    if (mine.length > 1) {
      const target = mine[Math.floor(Math.random() * mine.length)];
      if (Math.random() < 0.3) {
        target.owner = 'scorpioni';
        state.family.power -= 5;
        addLog(`⚠ Les Scorpioni ont repris ${target.name} !`, "danger");
      }
    }
  }
  if (Math.random() < 0.15) {
    const neutral = state.territories.find(t => t.owner === 'neutral');
    if (neutral) {
      neutral.owner = 'moretti';
      addLog(`Les Moretti s'étendent vers ${neutral.name}.`);
    }
  }
}

// ── NARRATIVE EVENTS ──
function checkNarrativeEvents() {
  const ne = DATA.events.narrative.find(e => e.turn === state.turn && !state.triggeredNarratives.has(e.id));
  if (ne) {
    state.triggeredNarratives.add(ne.id);
    setTimeout(() => showNarrativeEvent(ne), 400);
  }
}

function showNarrativeEvent(ne) {
  document.getElementById('ov-tag').textContent   = ne.tag;
  document.getElementById('ov-title').textContent = ne.title;
  document.getElementById('ov-text').textContent  = ne.text;

  const choicesEl = document.getElementById('ov-choices');
  choicesEl.innerHTML = '';
  ne.choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `${c.label}<div class="choice-consequence">${c.consequence}</div>`;
    btn.onclick = () => {
      applyEffects(c.effects);
      addLog(c.log, "important");
      closeOverlay();
      updateUI();
    };
    choicesEl.appendChild(btn);
  });

  document.getElementById('narrative-overlay').classList.add('active');
}

function closeOverlay() {
  document.getElementById('narrative-overlay').classList.remove('active');
}

// ── ACT TRANSITIONS ──
function checkActTransition() {
  const next = DATA.events.acts.find(a => a.num === state.act + 1 && state.turn >= a.startTurn);
  if (next) {
    state.act = next.num;
    setTimeout(() => showActTransition(next), 500);
  }
}

function showActTransition(act) {
  const numerals = ['I','II','III','IV','V'];
  document.getElementById('at-number').textContent   = `ACTE ${numerals[act.num - 1]}`;
  document.getElementById('at-subtitle').textContent = act.name;
  document.getElementById('at-ellipse').textContent  = act.ellipse;
  document.getElementById('at-desc').textContent     = act.desc;
  showScreen('act-transition');
}

function resumeFromAct() {
  const numerals  = ['I','II','III','IV','V'];
  const actNames  = DATA.events.acts.map(a => a.name);
  document.getElementById('act-label').textContent = `Acte ${numerals[state.act - 1]} — ${actNames[state.act - 1]}`;
  showScreen('game');
  updateUI();
}

// ── EFFECTS ──
function applyEffects(fx) {
  const fm = state.family, cs = state.consigliere;
  if (fx.power)     fm.power     = clamp(fm.power     + fx.power,     0, 100);
  if (fx.finances)  fm.finances += fx.finances;
  if (fx.politics)  fm.politics  = clamp(fm.politics  + fx.politics,  0, 100);
  if (fx.media)     fm.media     = clamp(fm.media     + fx.media,     0, 100);
  if (fx.alliances) fm.alliances = clamp(fm.alliances + fx.alliances, -100, 100);
  if (fx.threat)    fm.threat    = clamp(fm.threat    + fx.threat,    0, 100);
  if (fx.influence) cs.influence = clamp(cs.influence + fx.influence, 0, 100);
  if (fx.loyalty)   cs.loyalty   = clamp(cs.loyalty   + fx.loyalty,   0, 100);
  if (fx.cunning)   cs.cunning   = clamp(cs.cunning   + fx.cunning,   0, 100);
  if (fx.morale)    cs.morale    = clamp(cs.morale    + fx.morale,   -100, 100);
}

// ── GAME OVER ──
function checkGameOver() {
  const go = DATA.stats.gameOver;
  if (state.family.threat >= go.threatThreshold) {
    showGameOver("L'État vous a eu", "La menace policière a atteint son paroxysme. Le FBI, la mairie et la presse vous ont cerné. Don Castellano est arrêté.");
  } else if (state.family.finances < go.bankruptcyThreshold) {
    showGameOver("La Faillite", "L'argent est la colonne vertébrale de tout empire. Sans lui, les soldats partent, les alliés disparaissent.");
  } else if (state.consigliere.loyalty < go.loyaltyThreshold) {
    showGameOver("La Trahison", "Le Don a appris votre déloyauté. Votre corps a été retrouvé près des docks.");
  } else if (state.territories.filter(t => t.owner === 'castellano').length === 0) {
    showGameOver("L'Exil", "Vous avez tout perdu. Nova Roma vous a recraché.");
  }
}

function showGameOver(title, reason) {
  document.getElementById('go-title').textContent  = title;
  document.getElementById('go-reason').textContent = reason;
  setTimeout(() => showScreen('game-over'), 800);
}

// ── UI UPDATE ──
function updateUI() {
  const fm = state.family, cs = state.consigliere;

  setBar('influence', cs.influence);
  setBar('loyalty',   cs.loyalty);
  setBar('cunning',   cs.cunning);

  const ml = DATA.stats.morale_labels.find(m => cs.morale >= m.min && cs.morale < m.max);
  document.getElementById('morale-val').textContent = ml ? ml.label : 'Neutre';

  let income = 0;
  state.territories.forEach(t => { if (t.owner === 'castellano') income += t.income; });
  document.getElementById('finances-val').textContent = '$' + Math.max(0, fm.finances).toLocaleString();
  document.getElementById('income-val').textContent   = `+$${income.toLocaleString()} / tour`;

  setBar('power',     fm.power);
  setBar('politics',  fm.politics);
  setBar('media',     fm.media);
  setBar('alliances', (fm.alliances + 100) / 2);
  setBar('threat',    fm.threat);

  document.getElementById('threat-warning').classList.toggle('visible', fm.threat >= 60);
  document.getElementById('turn-label').textContent = `Tour ${state.turn} · ${1974 + state.turn}`;

  // Update territory badges on map
  state.territories.forEach((t, i) => {
    const el = document.querySelector(`.territory[data-id="${i}"]`);
    if (!el) return;
    el.dataset.owner = t.owner;
    const badge = el.querySelector('.territory-owner-badge');
    if (badge) badge.className = `territory-owner-badge ${t.owner}`;
  });
}

function setBar(name, value) {
  const v = Math.round(value);
  const el  = document.getElementById(`stat-${name}`);
  const bar = document.getElementById(`bar-${name}`);
  if (el)  el.textContent   = v;
  if (bar) bar.style.width  = clamp(v, 0, 100) + '%';
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// ── LOG ──
function addLog(text, type = '') {
  const area  = document.getElementById('log-area');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = text;
  area.insertBefore(entry, area.firstChild);
  while (area.children.length > 30) area.removeChild(area.lastChild);
}

// ── SCREENS ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
