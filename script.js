// ══════════════════════════════════════════════════════
//   CONSIGLIERE — script.js
// ══════════════════════════════════════════════════════

let state = {};
let DATA  = { territories: [], events: {}, stats: {} };

const TYPE_COLORS = {
  "Résidentiel": "#5dbb6e",
  "Casino":      "#f59e0b",
  "Port":        "#60a5fa",
  "Politique":   "#a78bfa",
  "Industriel":  "#f87171",
  "Marché Noir": "#e879f9",
  "International":"#34d399",
  "Église":      "#fbbf24",
  "Hôpital":     "#38bdf8",
  "Université":  "#818cf8",
};

// ── SYNERGIES ──────────────────────────────────────────
// Chaque synergie : ids de territoires requis (tous owner=castellano), et effets passifs par tour
const SYNERGIES = [
  {
    id: "syn_contrebande",
    name: "Route de Contrebande",
    desc: "+$600/tour bonus",
    requires: [3, 5],   // Les Docks + Chinatown
    effects: { finances: 600 }
  },
  {
    id: "syn_loi",
    name: "Main sur la Loi",
    desc: "-5 Menace/tour",
    requires: [6, 2],   // City Hall + Financial District
    effects: { threat: -5 }
  },
  {
    id: "syn_quartiers",
    name: "Loyauté des Rues",
    desc: "+3 Loyauté/tour",
    requires: [0, 7, 8], // Little Sicilia + The Heights + Eastside
    effects: { loyalty: 3 }
  },
  {
    id: "syn_sante_morale",
    name: "Image Publique",
    desc: "+5 Médias/tour · -3 Menace/tour",
    requires: [13, 14], // Église + Hôpital
    effects: { media: 5, threat: -3 }
  },
  {
    id: "syn_trafic_aero",
    name: "Trafic International",
    desc: "+$900/tour bonus · +8 Menace/tour",
    requires: [4, 9],   // Aéroport + Marché Noir
    effects: { finances: 900, threat: 8 }
  },
  {
    id: "syn_influence_campus",
    name: "Influence Académique",
    desc: "+4 Ruse/tour · +5 Médias/tour",
    requires: [12, 6],  // Université + City Hall
    effects: { cunning: 4, media: 5 }
  },
  {
    id: "syn_empire_casino",
    name: "Empire du Jeu",
    desc: "+$700/tour bonus",
    requires: [1, 11],  // Downtown + Quartier Rouge
    effects: { finances: 700 }
  },
];

// ── ENDINGS ────────────────────────────────────────────
const ENDINGS = [
  {
    id: "victory",
    tag: "Victoire Totale",
    title: "Le Parrain Incontesté",
    bgClass: "victory",
    check: (s) => s.family.power >= 70 && s.consigliere.loyalty >= 50 && s.family.threat <= 40 && s.territories.filter(t => t.owner === 'castellano').length >= 10,
    text: "Nova Roma vous appartient. Hargrove est rentré à Washington, bredouille. Les autres familles ont plié genou. On murmurera votre nom pendant des décennies dans les ruelles de Little Sicilia — avec respect, et avec peur. Vous avez construit un empire. Et cette fois, il tiendra.",
  },
  {
    id: "shadow",
    tag: "Victoire dans l'Ombre",
    title: "L'Éminence Grise",
    bgClass: "shadow",
    check: (s) => s.consigliere.cunning >= 70 && s.family.politics >= 60 && s.consigliere.morale > -20,
    text: "Votre nom n'apparaît dans aucun registre. Aucune photo, aucune preuve. Pourtant chaque décision qui compte dans cette ville passe par votre bureau. Vous avez placé un Don de paille sur le trône. Le vrai pouvoir, c'est le vôtre — et il durera bien plus longtemps que n'importe quel parrain visible.",
  },
  {
    id: "martyr",
    tag: "Fin Morale",
    title: "Le Martyr",
    bgClass: "martyr",
    check: (s) => s.consigliere.morale >= 50 && s.family.politics >= 50 && s.family.power <= 40,
    text: "Vous avez refusé de devenir le monstre que cette ville voulait faire de vous. Vous avez coopéré avec la justice, livré les noms, démantelé la structure depuis l'intérieur. Vous perdez tout — territoire, argent, nom. Mais vous vous retrouvez. Et quelques rues de Little Sicilia respirent un peu mieux ce soir.",
  },
  {
    id: "exile",
    tag: "Fin Neutre",
    title: "L'Exil Doré",
    bgClass: "exile",
    check: (s) => s.family.finances >= 15000 && s.consigliere.loyalty < 0,
    text: "Avant l'aube, une voiture vous emmène à l'aéroport. Vous emportez trois valises et un compte bancaire en Suisse. Pas de gloire, pas de prison. Quelque part en Sicile, il y a une villa avec vue sur la mer. Certains appelleraient ça une défaite. Vous, vous appelez ça survivre.",
  },
  {
    id: "titan",
    tag: "Défaite Tragique",
    title: "La Chute du Titan",
    bgClass: "titan",
    check: (s) => s.family.power >= 60 && s.family.threat >= 75,
    text: "Vous étiez le plus puissant de Nova Roma. Et c'est exactement ce qui vous a perdu. Hargrove vous arrête en direct devant le Palais de Justice. Les flashs des appareils photo crépitent. La ville regarde tomber le titan. On parlera de vous longtemps — comme d'un avertissement.",
  },
  {
    id: "chaos",
    tag: "Fin Catastrophique",
    title: "Le Chaos",
    bgClass: "chaos",
    check: (s) => s.family.alliances <= -40,
    text: "Vous n'avez fait confiance à personne. Et personne ne vous a protégé. Les Scorpioni, les Moretti, les fédéraux — tous vous encerclent en même temps. Nova Roma brûle. Vous disparaissez dans les ruines de ce que vous avez construit. Seule l'obscurité vous accueille.",
  },
  // Fins de défaite classiques
  {
    id: "arrested",
    tag: "Game Over",
    title: "L'État vous a eu",
    bgClass: "arrested",
    check: (s) => s.family.threat >= 90,
    text: "La menace policière a atteint son paroxysme. Le FBI, la mairie et la presse vous ont cerné de toutes parts. Don Castellano est arrêté à l'aube. Vous avez passé votre vie à construire un empire — il s'effondre en une nuit.",
  },
  {
    id: "bankrupt",
    tag: "Game Over",
    title: "La Faillite",
    bgClass: "bankrupt",
    check: (s) => s.family.finances < -2000,
    text: "L'argent est la colonne vertébrale de tout empire. Sans lui, les soldats partent, les alliés disparaissent, et les ennemis festoient sur vos ruines. Nova Roma ne pardonne pas la faiblesse.",
  },
  {
    id: "betrayed",
    tag: "Game Over",
    title: "La Trahison",
    bgClass: "betrayed",
    check: (s) => s.consigliere.loyalty < -30,
    text: "Le Don a appris votre déloyauté. Votre corps a été retrouvé près des docks, les mains liées. La leçon : on ne trahit pas Don Enzo Castellano. Pas deux fois.",
  },
  {
    id: "no_territory",
    tag: "Game Over",
    title: "L'Exil Forcé",
    bgClass: "chaos",
    check: (s) => s.territories.filter(t => t.owner === 'castellano').length === 0,
    text: "Vous avez tout perdu. Chaque territoire, chaque allié, chaque dollar. Nova Roma vous a recraché. Un nouveau consigliere vous remplace dès demain.",
  },
];

// ── LOAD DATA ──────────────────────────────────────────
async function loadData() {
  const [territories, events, stats] = await Promise.all([
    fetch('data/territories.json').then(r => r.json()),
    fetch('data/events.json').then(r => r.json()),
    fetch('data/stats.json').then(r => r.json()),
  ]);
  DATA.territories = territories;
  DATA.events      = events;
  DATA.stats       = stats;
}

window.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  showScreen('intro');
});

// ── START GAME ──────────────────────────────────────────
function startGame(choice) {
  state = {
    turn: 1,
    act: 1,
    actionsLeft: DATA.stats.actionsPerTurn,
    selectedTerritory: null,
    triggeredNarratives: new Set(),
    activeSynergies: new Set(),
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

// ── MAP ──────────────────────────────────────────────────
function buildMap() {
  const grid = document.getElementById('map-grid');
  grid.innerHTML = '';
  state.territories.forEach((t, i) => {
    const div = document.createElement('div');
    div.className  = 'territory';
    div.dataset.id = i;
    div.dataset.owner = t.owner;
    div.onclick = () => selectTerritory(i);
    const typeColor = TYPE_COLORS[t.type] || '#888';
    div.innerHTML = `
      <div class="territory-owner-badge ${t.owner}"></div>
      <div>
        <div class="territory-name">${t.name}</div>
        <div class="territory-type" style="color:${typeColor}90">${t.type}</div>
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

// ── SELECT TERRITORY ────────────────────────────────────
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

  // Check if this territory is part of an active or potential synergy
  const synergyLines = SYNERGIES.map(syn => {
    if (!syn.requires.includes(id)) return null;
    const myCount  = syn.requires.filter(rid => state.territories[rid].owner === 'castellano').length;
    const isActive = myCount === syn.requires.length;
    return `<div class="synergy-banner">${isActive ? '✦ Synergie active' : `◦ Synergie possible`} : <strong>${syn.name}</strong> — ${syn.desc}</div>`;
  }).filter(Boolean).join('');

  document.getElementById('territory-info').innerHTML = `
    <strong style="color:var(--gold);font-family:'Playfair Display',serif">${t.name}</strong><br>
    <span style="color:${TYPE_COLORS[t.type]}">● ${t.type}</span><br><br>
    ${t.desc ? `<em style="font-size:0.75rem;color:var(--text-dim);line-height:1.5;display:block;margin-bottom:0.6rem">${t.desc}</em>` : ''}
    Propriétaire : <em>${ownerLabels[t.owner]}</em><br>
    Revenu : <span style="color:#5dbb6e">$${t.income.toLocaleString()}/tour</span><br>
    Défense : ${t.defense}% · Menace : +${t.threatBonus}<br>
    ${synergyLines}
    <br><span style="font-size:0.7rem;color:var(--text-dim)">
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

// ── ACTIONS ──────────────────────────────────────────────
function doAction(type) {
  if (state.actionsLeft <= 0 || state.selectedTerritory === null) return;
  const t = state.territories[state.selectedTerritory];

  if (type === 'attack') {
    const roll    = Math.random() * 100;
    const success = roll + state.family.power * 0.5 > t.defense + 30;
    if (success) {
      const prev = t.owner;
      t.owner = 'castellano';
      state.family.power  -= 10;
      state.family.threat += t.threatBonus + 5;
      addLog(`✓ Attaque réussie sur ${t.name} (ex-${prev}). +Menace.`, "important");
    } else {
      state.family.power        -= 5;
      state.consigliere.loyalty -= 5;
      addLog(`✗ Attaque sur ${t.name} repoussée. -Puissance, -Loyauté.`, "danger");
    }
  }

  if (type === 'corrupt') {
    if (state.family.finances < 1000) { addLog("Fonds insuffisants pour corrompre.", "danger"); return; }
    state.family.finances -= 1000;
    state.family.politics += 15;
    t.owner = 'castellano';
    addLog(`${t.name} corrompu. -$1 000, +Réseau Politique.`, "important");
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

// ── END TURN ─────────────────────────────────────────────
function endTurn() {
  // Collect territory income
  let income = 0;
  state.territories.forEach(t => { if (t.owner === 'castellano') income += t.income; });
  state.family.finances += income;

  // Apply active synergies
  applySynergies();

  // AI moves
  aiTurn();

  // Random event
  const rEvents = DATA.events.random;
  const evt = rEvents[Math.floor(Math.random() * rEvents.length)];
  applyEffects(evt.effects);
  addLog(`[${evt.tag}] ${evt.text}`, (evt.effects.threat || 0) > 5 ? "danger" : "");

  // Passive decay
  state.family.threat         = Math.max(0, state.family.threat - 2);
  state.consigliere.influence = clamp(state.consigliere.influence + (state.family.politics > 40 ? 1 : -1), 0, 100);

  // Université bonus : +cunning si possédé
  if (state.territories[12].owner === 'castellano') {
    state.consigliere.cunning = clamp(state.consigliere.cunning + 1, 0, 100);
  }
  // Église bonus : +morale si possédée
  if (state.territories[13].owner === 'castellano') {
    state.consigliere.morale = clamp(state.consigliere.morale + 2, -100, 100);
  }
  // Hôpital bonus : -menace si possédé
  if (state.territories[14].owner === 'castellano') {
    state.family.threat = Math.max(0, state.family.threat - 2);
  }

  state.turn++;
  state.actionsLeft = DATA.stats.actionsPerTurn;

  // Check game over conditions first (urgent)
  if (checkGameOver()) return;

  checkNarrativeEvents();
  checkActTransition();

  // Check final endings at turn 28
  if (state.turn >= 28) {
    setTimeout(() => triggerFinalEnding(), 600);
    return;
  }

  buildMap();
  updateUI();
  updatePips();
  addLog(`— Fin du Tour ${state.turn - 1}. Revenus : $${income.toLocaleString()} —`, "important");

  state.selectedTerritory = null;
  document.querySelectorAll('.territory').forEach(el => el.classList.remove('selected'));
  ['btn-attack','btn-corrupt','btn-improve'].forEach(id => document.getElementById(id).disabled = true);
  document.getElementById('territory-info').textContent = "Sélectionnez un territoire sur la carte.";
}

// ── SYNERGIES ─────────────────────────────────────────────
function applySynergies() {
  const newActive = new Set();
  SYNERGIES.forEach(syn => {
    const active = syn.requires.every(rid => state.territories[rid].owner === 'castellano');
    if (active) {
      newActive.add(syn.id);
      applyEffects(syn.effects);
      // Log only on first activation
      if (!state.activeSynergies.has(syn.id)) {
        addLog(`✦ Synergie débloquée : ${syn.name} — ${syn.desc}`, "important");
      }
    }
  });
  state.activeSynergies = newActive;
}

function getSynergyPanel() {
  const active = SYNERGIES.filter(syn =>
    syn.requires.every(rid => state.territories[rid].owner === 'castellano')
  );
  return active;
}

// ── AI ────────────────────────────────────────────────────
function aiTurn() {
  // Scorpioni counter-attack
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
  // Moretti expansion
  if (Math.random() < 0.15) {
    const neutral = state.territories.find(t => t.owner === 'neutral');
    if (neutral) {
      neutral.owner = 'moretti';
      addLog(`Les Moretti s'étendent vers ${neutral.name}.`);
    }
  }
  // Scorpioni occasional expansion too
  if (Math.random() < 0.10) {
    const neutral = state.territories.find(t => t.owner === 'neutral');
    if (neutral) {
      neutral.owner = 'scorpioni';
      addLog(`Les Scorpioni s'emparent de ${neutral.name}.`, "danger");
    }
  }
}

// ── NARRATIVE EVENTS ──────────────────────────────────────
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

// ── ACT TRANSITIONS ───────────────────────────────────────
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
  const numerals = ['I','II','III','IV','V'];
  const actNames = DATA.events.acts.map(a => a.name);
  document.getElementById('act-label').textContent = `Acte ${numerals[state.act - 1]} — ${actNames[state.act - 1]}`;
  showScreen('game');
  updateUI();
}

// ── FINAL ENDINGS ─────────────────────────────────────────
function triggerFinalEnding() {
  // Evaluate in priority order — first match wins
  const ending = ENDINGS.find(e => e.check(state));
  if (ending) showEnding(ending);
}

function checkGameOver() {
  // Urgent defeat conditions — check every turn
  const urgentEndings = ['arrested','bankrupt','betrayed','no_territory'];
  const match = ENDINGS.filter(e => urgentEndings.includes(e.id)).find(e => e.check(state));
  if (match) {
    setTimeout(() => showEnding(match), 600);
    return true;
  }
  return false;
}

function showEnding(ending) {
  const myTerritories = state.territories.filter(t => t.owner === 'castellano').length;

  document.getElementById('ending-tag').textContent   = ending.tag;
  document.getElementById('ending-title').textContent = ending.title;
  document.getElementById('ending-text').textContent  = ending.text;
  document.getElementById('ending-bg').className      = `ending-bg ${ending.bgClass}`;

  // Final stats display
  document.getElementById('ending-stats').innerHTML = `
    <div class="ending-stat">
      <span class="ending-stat-val">${myTerritories}/15</span>
      <span class="ending-stat-label">Territoires</span>
    </div>
    <div class="ending-stat">
      <span class="ending-stat-val">$${Math.max(0,state.family.finances).toLocaleString()}</span>
      <span class="ending-stat-label">Trésorerie</span>
    </div>
    <div class="ending-stat">
      <span class="ending-stat-val">${state.turn - 1}</span>
      <span class="ending-stat-label">Tours joués</span>
    </div>
    <div class="ending-stat">
      <span class="ending-stat-val">${getMoraleLabel()}</span>
      <span class="ending-stat-label">Âme</span>
    </div>
    <div class="ending-stat">
      <span class="ending-stat-val">${state.family.power}</span>
      <span class="ending-stat-label">Puissance</span>
    </div>
  `;

  showScreen('ending');
}

// ── EFFECTS ───────────────────────────────────────────────
function applyEffects(fx) {
  const fm = state.family, cs = state.consigliere;
  if (fx.power)     fm.power     = clamp(fm.power     + fx.power,     0, 100);
  if (fx.finances)  fm.finances += fx.finances;
  if (fx.politics)  fm.politics  = clamp(fm.politics  + fx.politics,  0, 100);
  if (fx.media)     fm.media     = clamp(fm.media     + fx.media,     0, 100);
  if (fx.alliances) fm.alliances = clamp(fm.alliances + fx.alliances,-100, 100);
  if (fx.threat)    fm.threat    = clamp(fm.threat    + fx.threat,    0, 100);
  if (fx.influence) cs.influence = clamp(cs.influence + fx.influence, 0, 100);
  if (fx.loyalty)   cs.loyalty   = clamp(cs.loyalty   + fx.loyalty,   0, 100);
  if (fx.cunning)   cs.cunning   = clamp(cs.cunning   + fx.cunning,   0, 100);
  if (fx.morale)    cs.morale    = clamp(cs.morale    + fx.morale,  -100, 100);
}

// ── UI ────────────────────────────────────────────────────
function updateUI() {
  const fm = state.family, cs = state.consigliere;

  setBar('influence', cs.influence);
  setBar('loyalty',   cs.loyalty);
  setBar('cunning',   cs.cunning);
  document.getElementById('morale-val').textContent = getMoraleLabel();

  let income = 0;
  state.territories.forEach(t => { if (t.owner === 'castellano') income += t.income; });

  // Add synergy bonuses to income display
  let synergyBonus = 0;
  SYNERGIES.forEach(syn => {
    if (syn.requires.every(rid => state.territories[rid].owner === 'castellano') && syn.effects.finances) {
      synergyBonus += syn.effects.finances;
    }
  });

  document.getElementById('finances-val').textContent = '$' + Math.max(0, fm.finances).toLocaleString();
  document.getElementById('income-val').textContent   = `+$${(income + synergyBonus).toLocaleString()} / tour${synergyBonus ? ` (✦+$${synergyBonus})` : ''}`;

  setBar('power',     fm.power);
  setBar('politics',  fm.politics);
  setBar('media',     fm.media);
  setBar('alliances', (fm.alliances + 100) / 2);
  setBar('threat',    fm.threat);

  document.getElementById('threat-warning').classList.toggle('visible', fm.threat >= 60);
  document.getElementById('turn-label').textContent = `Tour ${state.turn} · ${1974 + state.turn}`;

  // Update synergy panel
  updateSynergyPanel();

  // Update territory badges
  state.territories.forEach((t, i) => {
    const el = document.querySelector(`.territory[data-id="${i}"]`);
    if (!el) return;
    el.dataset.owner = t.owner;
    const badge = el.querySelector('.territory-owner-badge');
    if (badge) badge.className = `territory-owner-badge ${t.owner}`;
  });
}

function updateSynergyPanel() {
  const active = getSynergyPanel();
  const el = document.getElementById('synergy-panel');
  if (!el) return;
  if (active.length === 0) {
    el.innerHTML = '<span style="font-size:0.75rem;font-style:italic;color:var(--text-dim)">Aucune synergie active.</span>';
  } else {
    el.innerHTML = active.map(s =>
      `<div class="synergy-banner">✦ <strong>${s.name}</strong><br>${s.desc}</div>`
    ).join('');
  }
}

function getMoraleLabel() {
  const morale = state.consigliere.morale;
  const ml = DATA.stats.morale_labels.find(m => morale >= m.min && morale < m.max);
  return ml ? ml.label : 'Neutre';
}

function setBar(name, value) {
  const v   = Math.round(value);
  const el  = document.getElementById(`stat-${name}`);
  const bar = document.getElementById(`bar-${name}`);
  if (el)  el.textContent  = v;
  if (bar) bar.style.width = clamp(v, 0, 100) + '%';
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// ── LOG ───────────────────────────────────────────────────
function addLog(text, type = '') {
  const area  = document.getElementById('log-area');
  const entry = document.createElement('div');
  entry.className   = `log-entry ${type}`;
  entry.textContent = text;
  area.insertBefore(entry, area.firstChild);
  while (area.children.length > 40) area.removeChild(area.lastChild);
}

// ── SCREENS ───────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
