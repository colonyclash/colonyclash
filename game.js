'use strict';
// ============================================================
// COLONY CLASH - Game Engine
// ============================================================

const MISSIONS = [
  { id: 0, text: 'CONSTRUIR 2 EXTRATORES DE MINERIOS', goal: 2, type: 'build', bldType: 'mineral_extractor', reward: 10 },
  { id: 1, text: 'CONSTRUIR 2 EXTRATORES DE OXIGENIO', goal: 2, type: 'build', bldType: 'oxygen_extractor', reward: 10 },
  { id: 2, text: 'CONSTRUIR 3 PAINÉIS SOLARES', goal: 3, type: 'build', bldType: 'solar_panel', reward: 10 },
  { id: 3, text: 'CONSTRUIR UM QUARTEL', goal: 1, type: 'build', bldType: 'barracks', reward: 10 },
  { id: 4, text: 'CONSTRUIR 2 ACAMPAMENTOS', goal: 2, type: 'build', bldType: 'camp', reward: 10 },
  { id: 5, text: 'GANHAR UM ATAQUE USANDO DRONE ROBO', goal: 1, type: 'attack_win', reward: 10 },
  { id: 6, text: 'MELHORAR CENTRO DE COMANDO PARA NÍVEL 2', goal: 2, type: 'cc_level', reward: 10 },
  { id: 7, text: 'CONSTRUIR 3 TORRETAS DE DEFESA', goal: 3, type: 'build', bldType: 'turret', reward: 10 },
  { id: 8, text: 'CONSTRUIR UM LABORATÓRIO', goal: 1, type: 'build', bldType: 'laboratory', reward: 10 },
  { id: 9, text: 'GANHAR 5 ATAQUES TOTAIS', goal: 5, type: 'attack_win_total', reward: 10 },
  { id: 10, text: 'MELHORAR CENTRO DE COMANDO PARA NÍVEL 3', goal: 3, type: 'cc_level', reward: 10 },
  { id: 11, text: 'DESTRUIR 10 EDIFÍCIOS INIMIGOS NO TOTAL', goal: 10, type: 'destroy_buildings_total', reward: 20 },
  { id: 12, text: 'TREINAR 10 DRONES', goal: 10, type: 'train_troop', troop: 'drone', reward: 10 },
  { id: 13, text: 'VENÇA 3 BATALHAS SEGUIDAS', goal: 3, type: 'win_streak', reward: 30 },
  { id: 14, text: 'REMOVA 1 ROCHA LUNAR', goal: 1, type: 'remove_obstacle', reward: 10 },
  { id: 15, text: 'PESQUISAR 3 MELHORIAS DE TROPA NO LABORATÓRIO', goal: 3, type: 'research_total', reward: 30 }
];

// ---- Global State ----
const G = {
  user: null,
  pid: null,
  base: {
    buildings: [],
    resources: { mineral: 500, oxygen: 300, energy: 0, gems: 10 },
    lastSave: Date.now(),
    troops: { drone: 0, robot: 0, tank: 0 },
    gems: 10,
    queue: [],
    ccLevel: 1,
    trophies: 100,
    playerName: 'Colono',
    totalWins: 0
  },
  ui: {
    screen: 'loading',
    panel: null,
    selectedBldId: null,
    buildMode: false,
    buildType: null,
    ghostX: -1, ghostY: -1,
    ghostValid: false,
    moveMode: false,
    moveBldId: null,
    origX: -1,
    origY: -1,
    mapZoom: 1.0
  },
  battle: null,
  db: null,
  auth: null,
  timers: { resource: null, save: null, queue: null }
};

let lastResourceTick = Date.now();

// ---- DOM Helpers ----
const gel   = id => document.getElementById(id);
const qsel  = s  => document.querySelector(s);
const show  = id => gel(id)?.classList.remove('hidden');
const hide  = id => gel(id)?.classList.add('hidden');

function notify(msg, type = 'info') {
  const stack = qsel('.notif-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ============================================================
// FIREBASE
// ============================================================
function initFirebase() {
  try {
    if (typeof firebaseConfig === 'undefined') return false;
    // Detect placeholder / unconfigured credentials
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('SUA_') || firebaseConfig.apiKey === 'YOUR_API_KEY') {
      console.warn('Firebase não configurado. Rodando em modo demo.');
      return false;
    }
    firebase.initializeApp(firebaseConfig);
    G.db   = firebase.firestore();
    G.auth = firebase.auth();
    return true;
  } catch (e) { console.warn('Firebase init failed:', e); return false; }
}

function loginGoogle() {
  const p = new firebase.auth.GoogleAuthProvider();
  G.auth.signInWithPopup(p).catch(e => notify('Erro ao entrar: ' + e.message, 'error'));
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(el => el.style.display = 'none');
  gel('tab-' + tab).classList.add('active');
  gel('form-' + tab).style.display = 'flex';
  gel('login-error').textContent = '';
  gel('reg-error').textContent = '';
}

async function loginEmail() {
  const email = gel('inp-email').value;
  const pass = gel('inp-pass').value;
  if (!email || !pass) return;
  try {
    await G.auth.signInWithEmailAndPassword(email, pass);
  } catch(e) {
    gel('login-error').textContent = 'Erro: ' + e.message;
  }
}

async function registerEmail() {
  const name = gel('inp-reg-name').value;
  const email = gel('inp-reg-email').value;
  const pass = gel('inp-reg-pass').value;
  const confirm = gel('inp-reg-confirm').value;
  if (!name || !email || !pass) return;
  
  if (pass !== confirm) { gel('reg-error').textContent = 'As senhas não coincidem!'; return; }
  
  try {
    const cred = await G.auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    G.user = cred.user;
    G.base.playerName = name;
    await saveData();
  } catch(e) {
    gel('reg-error').textContent = 'Erro: ' + e.message;
  }
}

function logout() {
  G.auth.signOut().then(() => { closePanels(); switchScreen('login'); });
}

async function loadData() {
  try {
    const doc = await G.db.collection('colonies').doc(G.pid).get();
    if (doc.exists) {
      const d = doc.data();
      G.base = { ...G.base, ...d };
      processOfflineResources();
      processOfflineQueue();
      processOfflineBuildings();
      processOfflineObstacles();
      if (!G.base.missions) G.base.missions = { currentId: 0, completed: [], claimed: [], progress: 0, allProgress: {} };
      if (!G.base.missions.allProgress) G.base.missions.allProgress = {};
    } else {
      createStarterBase();
      await saveData();
    }
  } catch (e) { console.error('Load failed:', e); createStarterBase(); }
}

async function saveData() {
  if (!G.pid || !G.db) return;
  checkMissionProgress();
  try {
    G.base.lastSave = Date.now();
    await G.db.collection('colonies').doc(G.pid).set({
      ...G.base,
      playerName: G.user?.displayName || G.base.playerName,
      uid: G.pid,
      photoURL: G.user?.photoURL || null,
      updatedAt: Date.now()
    });
  } catch (e) { console.error('Save failed:', e); }
}

// ============================================================
// STARTER BASE
// ============================================================
function createStarterBase() {
  G.base = {
    buildings: [{
      id: genId(), type: 'command_center', level: 1,
      x: 9, y: 9,
      hp: BUILDINGS.command_center.levels[1].hp,
      maxHp: BUILDINGS.command_center.levels[1].hp,
      buildFinish: 0, upgradeFinish: 0
    }],
    resources: { mineral: 1500, oxygen: 1000, energy: 0 },
    lastSave: Date.now(),
    troops: { drone: 0, robot: 0, tank: 0 },
    queue: [],
    ccLevel: 1,
    trophies: 100,
    gems: 10,
    builders: 1,
    troopUpgrades: {},
    playerName: G.user?.displayName || 'Colono',
    nameChanged: false,
    lastObstacleSpawn: Date.now(),
    tutorialDone: false,
    totalWins: 0,
    totalDestroyed: 0,
    winStreak: 0,
    totalObstaclesRemoved: 0,
    totalResearch: 0,
    totalDronesTrained: 0,
    missions: { currentId: 0, completed: [], claimed: [], progress: 0, allProgress: {} }
  };
}

// ============================================================
// OFFLINE PROCESSING
// ============================================================
function processOfflineResources() {
  const now = Date.now();
  const elapsed = Math.max(0, (now - (G.base.lastSave || now)) / 1000);
  if (elapsed < 5 || elapsed > 86400 * 7) return;
  const gain = calcResourceGain(elapsed);
  if (!G.base.resources) G.base.resources = { mineral: 0, oxygen: 0, energy: 0 };
  G.base.resources.mineral = (G.base.resources.mineral || 0) + gain.mineral;
  G.base.resources.oxygen  = (G.base.resources.oxygen  || 0) + gain.oxygen;
  G.base.resources.energy  = (G.base.resources.energy  || 0) + gain.energy;
  if (G.base.gems === undefined) G.base.gems = 10;
  clampResources();
  if (elapsed > 60 && (gain.mineral > 1 || gain.oxygen > 1)) {
    setTimeout(() =>
      notify(`Offline ${fmtTime(elapsed)}: +${fmtNum(gain.mineral)} ⛏️  +${fmtNum(gain.oxygen)} 💨`, 'success'),
    1500);
  }
}

function processOfflineQueue() {
  if (!Array.isArray(G.base.queue)) { G.base.queue = []; return; }
  const now = Date.now();
  const finished = G.base.queue.filter(q => q.finishTime <= now);
  G.base.queue = G.base.queue.filter(q => q.finishTime > now);
  for (const item of finished) {
    if (!G.base.troops) G.base.troops = {};
    G.base.troops[item.type] = (G.base.troops[item.type] || 0) + 1;
  }
}

function processOfflineBuildings() {
  if (!Array.isArray(G.base.buildings)) return;
  const now = Date.now();
  for (const b of G.base.buildings) {
    if (b.buildFinish && b.buildFinish > 0 && b.buildFinish <= now) {
      b.buildFinish = 0;
    }
    if (b.buildFinish && b.buildFinish > now) {
      const rem = b.buildFinish - now;
      const bId = b.id;
      const defName = BUILDINGS[b.type]?.name || b.type;
      setTimeout(() => {
        if (bld) { bld.buildFinish = 0; refreshBldEl(bId); notify(`${t(b.type)} ${t('ready')}!`, 'success'); saveData(); }
      }, rem);
    }
    if (b.upgradeFinish && b.upgradeFinish > 0 && b.upgradeFinish <= now) {
      const newLevel = b.level + 1;
      const def = BUILDINGS[b.type];
      if (def && def.levels[newLevel]) {
        b.level = newLevel;
        const lvlData = def.levels[newLevel];
        b.maxHp = lvlData.hp;
        b.hp    = lvlData.hp;
        if (b.type === 'command_center') G.base.ccLevel = newLevel;
      }
      b.upgradeFinish = 0;
    }
    if (b.upgradeFinish && b.upgradeFinish > now) {
      const rem     = b.upgradeFinish - now;
      const bId     = b.id;
      const nextLvl = b.level + 1;
      setTimeout(() => finishUpgrade(bId, nextLvl), rem);
    }
  }
  const cc = G.base.buildings.find(b => b.type === 'command_center');
  if (cc) G.base.ccLevel = cc.level;
}

function calcResourceGain(seconds) {
  let mineral = 0, oxygen = 0, energy = 0;
  const mins = seconds / 60;
  for (const b of (G.base.buildings || [])) {
    if (bldInProgress(b)) continue;
    const def = BUILDINGS[b.type];
    if (!def || !def.isResource) continue;
    const lvl = def.levels[b.level];
    if (!lvl || !lvl.production) continue;
    switch (def.resourceType) {
      case 'mineral': mineral += lvl.production * mins; break;
      case 'oxygen':  oxygen  += lvl.production * mins; break;
      case 'energy':  energy  += lvl.production * mins; break;
    }
  }
  return { mineral, oxygen, energy };
}

function clampResources() {
  if (G.user?.email === 'admin@colonyclash.com') return;
  const blds = G.base.buildings || [];
  const maxMin = getStorageCapacity(blds, 'mineral');
  const maxOxy = getStorageCapacity(blds, 'oxygen');
  const maxEne = getStorageCapacity(blds, 'energy');
  G.base.resources.mineral = Math.min(Math.max(0, G.base.resources.mineral), maxMin);
  G.base.resources.oxygen  = Math.min(Math.max(0, G.base.resources.oxygen),  maxOxy);
  G.base.resources.energy  = Math.min(Math.max(0, G.base.resources.energy),  maxEne);
}

// ============================================================
// ADMIN COMMANDS
// ============================================================
window.adminFillResources = function() {
  if (G.user?.email !== 'admin@colonyclash.com') return;
  G.base.resources.mineral = 99999999;
  G.base.resources.oxygen  = 99999999;
  G.base.resources.energy  = 99999999;
  updateHUD();
  saveData();
  notify(t('admin_resources_gain'), 'success');
};

window.adminMaxCC = function() {
  if (G.user?.email !== 'admin@colonyclash.com') return;
  const cc = G.base.buildings.find(b => b.type === 'command_center');
  if (cc && cc.level < 3) {
    cc.level = 3;
    G.base.ccLevel = 3;
    updateHUD();
    saveData();
    refreshBldEl(cc.id);
    notify(t('admin_cc_max'), 'success');
  }
};

window.adminGiveToPlayer = async function() {
  if (G.user?.email !== 'admin@colonyclash.com') { notify(t('admin_access_denied'), 'error'); return; }
  const uid = document.getElementById('admin-target-uid').value.trim();
  const type = document.getElementById('admin-give-type').value;
  const amt = parseInt(document.getElementById('admin-give-amount').value, 10);
  if (!uid || isNaN(amt)) { notify('Preencha os campos corretamente', 'error'); return; }

  if (uid === G.pid) {
    if (type === 'trophies') G.base.trophies = (G.base.trophies || 0) + amt;
    else if (type === 'gems') G.base.gems = (G.base.gems || 0) + amt;
    else if (type === 'tank') {
      if (!G.base.troops) G.base.troops = {};
      G.base.troops.tank = (G.base.troops.tank || 0) + amt;
    }
    else {
      if (!G.base.resources) G.base.resources = {};
      G.base.resources[type] = (G.base.resources[type] || 0) + amt;
    }
    updateHUD();
    saveData();
    notify(`Admin: Enviado ${amt} ${type} para você mesmo!`, 'success');
    return;
  }

  try {
    const docRef = G.db.collection('colonies').doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) { notify('Jogador não encontrado', 'error'); return; }
    const d = doc.data();
    
    if (type === 'trophies') d.trophies = (d.trophies || 0) + amt;
    else if (type === 'gems') d.gems = (d.gems || 0) + amt;
    else if (type === 'tank') {
      if (!d.troops) d.troops = {};
      d.troops.tank = (d.troops.tank || 0) + amt;
    }
    else {
      if (!d.resources) d.resources = {};
      d.resources[type] = (d.resources[type] || 0) + amt;
    }

    await docRef.update(d);
    notify(`Admin: Enviado ${amt} ${type} para ${d.playerName || uid}!`, 'success');
  } catch (e) {
    console.error(e);
    notify('Erro ao enviar', 'error');
  }
};

// ============================================================
// BUILDERS SYSTEM
// ============================================================
function getBuildersInUse() {
  return (G.base.buildings || []).filter(b => bldInProgress(b)).length;
}

function getTotalBuilders() {
  return G.base.builders || 1;
}

function hasFreeBuilder() {
  return getBuildersInUse() < getTotalBuilders();
}

window.showBuildersModal = function() {
  const current = getTotalBuilders();
  if (current >= 4) {
    notify(t('max_builders_reached'), 'info');
    return;
  }
  
  const costs = { 1: 100, 2: 500, 3: 1000 };
  const cost = costs[current];
  
  const modal = gel('upgrade-modal');
  gel('modal-icon').textContent  = '👨‍🚀';
  gel('modal-title').textContent = 'Contratar Astronauta Construtor';
  gel('modal-desc').textContent  = `Deseja contratar mais um astronauta para realizar construções simultâneas?\nAtual: ${current} | Novo: ${current + 1}`;
  
  const costsEl = gel('modal-costs');
  const affordable = (G.base.gems || 0) >= cost;
  costsEl.innerHTML = `<span class="modal-cost-item" style="color:${affordable ? 'var(--c-gem)' : 'var(--c-danger)'}">💎 ${cost}</span>`;
  
  const confirmBtn = gel('modal-confirm');
  confirmBtn.disabled = !affordable;
  confirmBtn.onclick = () => {
    G.base.gems -= cost;
    G.base.builders = (G.base.builders || 1) + 1;
    notify(t('new_builder_hired'), 'success');
    closeModal();
    updateHUD();
    saveData();
  };
  
  gel('modal-cancel').onclick = closeModal;
  modal.classList.add('visible');
};

// ============================================================
// OBSTACLES SYSTEM
// ============================================================
function trySpawnObstacle() {
  const ccLvl = getCurrentCCLevel();
  const intervals = { 1: 3600000, 2: 7200000, 3: 10800000 };
  const interval  = intervals[ccLvl] || 3600000;
  
  const last = G.base.lastObstacleSpawn || 0;
  if (Date.now() - last >= interval) {
    G.base.lastObstacleSpawn = Date.now();
    spawnRandomObstacle();
    saveData();
  }
}

function spawnRandomObstacle() {
  let gx, gy, attempts = 0;
  do {
    gx = Math.floor(Math.random() * GRID_W);
    gy = Math.floor(Math.random() * GRID_H);
    attempts++;
  } while (!canPlace('lunar_rock', gx, gy) && attempts < 100);
  
  if (attempts < 100) {
    const nb = {
      id: genId(), type: 'lunar_rock', level: 1,
      x: gx, y: gy, hp: 10, maxHp: 10,
      buildFinish: 0, upgradeFinish: 0
    };
    G.base.buildings.push(nb);
    spawnBldEl(nb);
  }
}

function removeObstacle(bId) {
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b || b.type !== 'lunar_rock') return;
  if (b.removing) return;

  if (!hasFreeBuilder()) {
    notify(t('all_builders_busy'), 'error'); return;
  }
  if (G.base.resources.mineral < 100) {
    notify(`${t('insufficient_minerals')} (100 ${t('ready')})`, 'error'); return;
  }
  
  G.base.resources.mineral -= 100;
  b.removing = true;
  b.removeFinish = Date.now() + 10000;
  
  hideBldPopup();
  refreshBldEl(b.id);
  updateHUD();
  saveData();
  
  notify(t('removing_obstacle') + ' (10s)...', 'info');
  
  setTimeout(() => {
    const rewards = [
      { type: 'mineral', amt: 100, weight: 35 },
      { type: 'mineral', amt: 200, weight: 15 },
      { type: 'oxygen',  amt: 100, weight: 30 },
      { type: 'oxygen',  amt: 200, weight: 10 },
      { type: 'gems',    amt: 1,   weight: 6 },
      { type: 'gems',    amt: 3,   weight: 3 },
      { type: 'gems',    amt: 5,   weight: 1 },
    ];
    const totalW = rewards.reduce((a, c) => a + c.weight, 0);
    let r = Math.random() * totalW;
    let reward = rewards[0];
    for (const rw of rewards) {
      r -= rw.weight;
      if (r <= 0) { reward = rw; break; }
    }
    
    if (reward.type === 'gems') G.base.gems += reward.amt;
    else G.base.resources[reward.type] = Math.min(G.base.resources[reward.type] + reward.amt, getStorageCapacity(G.base.buildings, reward.type));
    
    const idx = G.base.buildings.findIndex(x => x.id === bId);
    if (idx >= 0) G.base.buildings.splice(idx, 1);
    gel('bld-' + bId)?.remove();
    
    G.base.totalObstaclesRemoved = (G.base.totalObstaclesRemoved || 0) + 1;
    if (G.base.missions && G.base.missions.allProgress) {
      MISSIONS.forEach(m => {
        if (m.type === 'remove_obstacle') {
          G.base.missions.allProgress[m.id] = G.base.totalObstaclesRemoved;
        }
      });
    }

    notify(`${t('obstacle_removed')} ${t('earn_reward')}: ${reward.amt} ${reward.type === 'gems' ? t('gems_unit') : t(reward.type)}`, 'success');
    updateHUD();
    saveData();
  }, 10000);
}
function bldInProgress(b) {
  return (b.buildFinish && b.buildFinish > Date.now()) ||
         (b.upgradeFinish && b.upgradeFinish > Date.now()) ||
         (b.removing && b.removeFinish > Date.now());
}

function cellOccupied(x, y, excludeId = null) {
  for (const b of G.base.buildings) {
    if (b.id === excludeId) continue;
    const sz = BUILDINGS[b.type]?.size || 1;
    if (x >= b.x && x < b.x + sz && y >= b.y && y < b.y + sz) return true;
  }
  return false;
}

function canPlace(type, gx, gy, excludeId = null) {
  const def = BUILDINGS[type];
  if (!def) return false;
  const sz = def.size;
  if (gx < 0 || gy < 0 || gx + sz > GRID_W || gy + sz > GRID_H) return false;
  for (let dx = 0; dx < sz; dx++)
    for (let dy = 0; dy < sz; dy++)
      if (cellOccupied(gx + dx, gy + dy, excludeId)) return false;
  return true;
}

function getCurrentCCLevel() {
  const blds = G.base.buildings || [];
  const cc = blds.find(b => b.type === 'command_center');
  return cc ? cc.level : 1;
}

function getBuildingCountOfType(type) {
  const blds = G.base.buildings || [];
  return blds.filter(b => b.type === type).length;
}

// ============================================================
// TERRAIN CANVAS
// ============================================================
let terrainCtx;
const CRATERS = [];

function buildTerrain() {
  const canvas = gel('game-canvas');
  if (!canvas) return;
  canvas.width  = GRID_W * CELL_SIZE;
  canvas.height = GRID_H * CELL_SIZE;
  terrainCtx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;

  if (!CRATERS.length) {
    const rng = mulberry32(42);
    for (let i = 0; i < 28; i++)
      CRATERS.push({ cx: rng() * CW, cy: rng() * CH, r: 14 + rng() * 36, d: 0.25 + rng() * 0.45 });
  }

  const ctx = terrainCtx;
  const bg = ctx.createRadialGradient(CW * 0.4, CH * 0.3, 0, CW * 0.5, CH * 0.5, CW * 0.85);
  bg.addColorStop(0, '#696975'); bg.addColorStop(0.5, '#505060'); bg.addColorStop(1, '#343444');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);

  const rng2 = mulberry32(7);
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 250; i++) {
    const x = rng2() * CW, y = rng2() * CH, r = 1.5 + rng2() * 9;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = rng2() > 0.5 ? '#222232' : '#7a7a8a'; ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const c of CRATERS) drawCrater(ctx, c.cx, c.cy, c.r, c.d);

  ctx.strokeStyle = 'rgba(90,92,130,0.18)'; ctx.lineWidth = 0.6;
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, CH); ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(CW, y * CELL_SIZE); ctx.stroke();
  }

  const vig = ctx.createRadialGradient(CW / 2, CH / 2, CW * 0.28, CW / 2, CH / 2, CW * 0.82);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, CW, CH);
}

function drawCrater(ctx, cx, cy, r, d) {
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  g.addColorStop(0,   `rgba(80,80,96,${d * 0.7})`);
  g.addColorStop(0.7, `rgba(26,26,38,${d})`);
  g.addColorStop(1,   `rgba(75,75,90,0.05)`);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(110,110,130,${d * 0.4})`; ctx.lineWidth = 1.5; ctx.stroke();
}

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ============================================================
// BUILDINGS LAYER (DOM)
// ============================================================
let bldLayer;
const bldImgCache = {};
const troopImgCache = {};

function preloadAssets() {
  const essential = [];
  // Level 1 buildings
  for (const def of Object.values(BUILDINGS)) {
    essential.push(def.getAsset(1, 'dummy'));
  }
  // Troops
  ['drone', 'robot', 'tank', 'star_warrior'].forEach(t => essential.push(`${t}_sprite.png`));
  // Terrain & UI
  essential.push('moon_crater_bg.png', 'cc_lvl1.png', 'cc_lvl2.png', 'cc_lvl3.png');

  let loaded = 0;
  const total = essential.length;

  return Promise.all(essential.map(src => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        const pct = 10 + (loaded / total) * 20; // 10% to 30% range
        setLoadProgress(pct);
        resolve();
      };
      img.src = src;
      if (src.includes('sprite')) troopImgCache[src] = img;
      else bldImgCache[src] = img;
    });
  }));
}

// Background preloading for higher levels
function preloadExtraAssets() {
  for (const def of Object.values(BUILDINGS)) {
    for (let lv = 2; lv <= (def.maxLevel || 1); lv++) {
      const src = def.getAsset(lv, 'bg-load');
      if (!bldImgCache[src]) {
        const img = new Image(); img.src = src;
        bldImgCache[src] = img;
      }
    }
  }
}

function renderBuildingsLayer() {
  bldLayer = gel('buildings-layer');
  if (!bldLayer) return;
  bldLayer.innerHTML = '';
  bldLayer.style.width  = (GRID_W * CELL_SIZE) + 'px';
  bldLayer.style.height = (GRID_H * CELL_SIZE) + 'px';
  const blds = G.base.buildings || [];
  for (const b of blds) spawnBldEl(b);
}

function spawnBldEl(b) {
  if (!bldLayer) return;
  const def = BUILDINGS[b.type];
  if (!def) return;
  const sz  = def.size;
  const px  = b.x * CELL_SIZE;
  const py  = b.y * CELL_SIZE;
  const pxs = sz * CELL_SIZE;

  const wrap = document.createElement('div');
  wrap.className  = 'bld-el' + (bldInProgress(b) ? ' under-construction' : '');
  wrap.id         = 'bld-' + b.id;
  wrap.style.cssText = `left:${px}px;top:${py}px;width:${pxs}px;height:${pxs}px;`;
  wrap.dataset.id = b.id;

  const img = document.createElement('img');
  img.src = def.getAsset(b.level, b.id); img.alt = def.name; img.draggable = false;
  wrap.appendChild(img);

  if (bldInProgress(b)) {
    const badge = document.createElement('div');
    let badgeClass = 'bld-badge';
    if (b.upgradeFinish > Date.now()) badgeClass += ' upgrade';
    if (b.removing) badgeClass += ' removing';
    badge.className = badgeClass;
    badge.id = 'badge-' + b.id;
    wrap.appendChild(badge);
    tickBadge(b, badge);
  }

  wrap.addEventListener('click', e => {
    if (G.ui.buildMode) return;
    e.stopPropagation();
    showBldPopup(b.id, e.clientX, e.clientY);
  });
  wrap.addEventListener('touchend', e => {
    if (G.ui.buildMode) return;
    e.stopPropagation();
    const t = e.changedTouches[0];
    showBldPopup(b.id, t.clientX, t.clientY);
  });

  bldLayer.appendChild(wrap);
}

function refreshBldEl(bId) {
  const existing = gel('bld-' + bId);
  if (existing) existing.remove();
  const b = G.base.buildings.find(x => x.id === bId);
  if (b) spawnBldEl(b);
}

function tickBadge(b, badge) {
  const update = () => {
    let finish = 0;
    if (b.buildFinish > Date.now()) finish = b.buildFinish;
    else if (b.upgradeFinish > Date.now()) finish = b.upgradeFinish;
    else if (b.removing && b.removeFinish > Date.now()) finish = b.removeFinish;

    if (!finish || finish <= Date.now()) {
      if (badge.parentNode) badge.remove();
      return;
    }
    const rem = (finish - Date.now()) / 1000;
    let icon = '🔨';
    if (b.upgradeFinish > Date.now()) icon = '⚡';
    if (b.removing) icon = '🗑️';
    
    badge.textContent = icon + ' ' + fmtTime(rem);
    setTimeout(update, 1000);
  };
  update();
}

// ============================================================
// BUILDING POPUP
// ============================================================
function showBldPopup(bId, cx, cy) {
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b) return;
  G.ui.selectedBldId = bId;
  const def = BUILDINGS[b.type];
  const lvl = def.levels[b.level];

  const popup = gel('building-popup');
  popup.classList.add('visible');

  const pw = 248;
  let left = cx + 12;
  if (left + pw > window.innerWidth - 8) left = cx - pw - 12;
  if (left < 8) left = 8;
  let top = cy + 10;
  if (top + 240 > window.innerHeight) top = cy - 240;
  if (top < 60) top = 60;
  popup.style.left = left + 'px';
  popup.style.top  = top + 'px';

  gel('popup-img').src   = def.getAsset(b.level, b.id);
  gel('popup-name').textContent  = t(b.type);
  const hpPct = Math.round(((b.hp || b.maxHp) / b.maxHp) * 100);
  gel('popup-hp-fill').style.width = hpPct + '%';
  gel('popup-hp-fill').style.background = hpPct > 60 ? '#44FF88' : hpPct > 30 ? '#FFCC00' : '#FF4466';

  let desc = t(b.type + '_desc') || '';
  if (b.buildFinish && b.buildFinish > Date.now()) {
    desc = '🔨 ' + t('building') + '... ' + fmtTime((b.buildFinish - Date.now()) / 1000);
  } else if (b.upgradeFinish && b.upgradeFinish > Date.now()) {
    desc = '⚡ ' + t('upgrading') + '... ' + fmtTime((b.upgradeFinish - Date.now()) / 1000);
  } else if (def.isResource && lvl.production) {
    const icon = { mineral: '⛏️', oxygen: '💨', energy: '⚡' }[def.resourceType] || '';
    desc += `\n${icon} +${lvl.production}/min`;
  } else if (b.type === 'camp') {
    desc += `\n${t('capacity')}: ${lvl.capacity}`;
  } else if (b.type === 'lunar_rock' && b.removing) {
    desc = '🔨 Removendo... ' + fmtTime((b.removeFinish - Date.now()) / 1000);
  }
  gel('popup-desc').textContent = desc;

  const lvlEl = gel('popup-level');
  const themes = { 1: t('ferro'), 2: t('energy'), 3: t('ouro') };
  if (b.type === 'command_center') {
    lvlEl.textContent = `${t('level')} ${b.level} · ${t('theme')}: ${themes[b.level]} · ${lvl.hp} HP`;
  } else {
    lvlEl.textContent = `${t('level')} ${b.level} · ${lvl.hp} HP`;
  }

  const upBtn = gel('popup-upgrade');
  const ccLvl = getCurrentCCLevel();
  const maxBldLvl = BUILDINGS.command_center.levels[ccLvl].unlocks.max_building_level || 1;
  const canUp = b.level < def.maxLevel && !bldInProgress(b);
  const labLocked = b.type === 'laboratory' && ccLvl < 3;
  const levelLocked = canUp && b.level >= maxBldLvl && b.type !== 'command_center';
  
  if (canUp && !labLocked) {
    upBtn.style.display = 'block';
    if (levelLocked) {
      upBtn.textContent = `🔒 Requer CC ${b.level + 1}`;
      upBtn.style.opacity = '0.5';
      upBtn.onclick = () => notify(`Melhore o CC para nível ${b.level + 1} primeiro!`, 'error');
    } else {
      upBtn.textContent = `⬆ Nível ${b.level + 1}`;
      upBtn.style.opacity = '1';
      upBtn.onclick = () => showUpgradeModal(bId);
    }
  } else {
    upBtn.style.display = 'none';
  }

  const speedBtn = gel('popup-speedup');
  const cancelBtn = gel('popup-cancel-up');
  const clanBtn = gel('popup-clan');
  
  if (b.type === 'clan_tower' && !bldInProgress(b)) {
    clanBtn.style.display = 'block';
    clanBtn.onclick = () => showClanModal();
  } else {
    clanBtn.style.display = 'none';
  }
  const inProgress = bldInProgress(b);
  const isUpgrading = b.upgradeFinish > Date.now();

  speedBtn.style.display = inProgress ? 'flex' : 'none';
  cancelBtn.style.display = isUpgrading ? 'block' : 'none';

  if (inProgress) {
    const finish = b.buildFinish > Date.now() ? b.buildFinish : b.upgradeFinish;
    const remSeconds = (finish - Date.now()) / 1000;
    const gemCost = Math.max(1, Math.ceil(remSeconds / 60));
    speedBtn.innerHTML = `⚡ ACELERAR <span style="background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px;margin-left:5px">💎 ${gemCost}</span>`;
    speedBtn.onclick = () => speedUpBuilding(bId, gemCost);
    
    if (isUpgrading) {
      cancelBtn.onclick = () => cancelUpgrade(bId);
    }
  }

  const moveBtn = gel('popup-move');
  moveBtn.onclick = () => { enterMoveMode(bId); };

  const delBtn = gel('popup-destroy');
  if (def.isObstacle) {
    delBtn.style.display = 'block';
    delBtn.textContent = `🗑️ Remover (100 ⛏️)`;
    delBtn.onclick = () => removeObstacle(bId);
    moveBtn.style.display = 'none';
  } else {
    delBtn.style.display = 'none';
  }
}

function hideBldPopup() {
  const p = gel('building-popup');
  p.classList.remove('visible');
  G.ui.selectedBldId = null;
}

// ============================================================
// UPGRADE SYSTEM
// ============================================================
function showUpgradeModal(bId) {
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b) return;
  const def     = BUILDINGS[b.type];
  const nextLv  = b.level + 1;
  const nextLvl = def.levels[nextLv];
  if (!nextLvl) return;

  gel('modal-icon').textContent  = '⬆️';
  gel('modal-title').textContent = `${t('upgrade')} ${t(b.type)}`;
  let timeStr = nextLvl.buildTime > 0 ? ` · ${fmtTime(nextLvl.buildTime)}` : '';
  gel('modal-desc').textContent  = `${t('level')} ${b.level} → ${nextLv}${timeStr}\n${t(b.type + '_desc')}`;

  const costsEl = gel('modal-costs');
  costsEl.innerHTML = '';
  if (nextLvl.cost?.mineral > 0) {
    const affordable = G.base.resources.mineral >= nextLvl.cost.mineral;
    costsEl.innerHTML += `<span class="modal-cost-item" style="color:${affordable ? '#7EC8E3' : '#FF4466'}">⛏️ ${fmtNum(nextLvl.cost.mineral)}</span>`;
  }
  if (nextLvl.cost?.oxygen > 0) {
    const affordable = G.base.resources.oxygen >= nextLvl.cost.oxygen;
    costsEl.innerHTML += `<span class="modal-cost-item" style="color:${affordable ? '#78E89C' : '#FF4466'}">💨 ${fmtNum(nextLvl.cost.oxygen)}</span>`;
  }
  if (nextLvl.cost?.energy > 0) {
    const affordable = G.base.resources.energy >= nextLvl.cost.energy;
    costsEl.innerHTML += `<span class="modal-cost-item" style="color:${affordable ? '#FFE55C' : '#FF4466'}">⚡ ${fmtNum(nextLvl.cost.energy)}</span>`;
  }
  if (!nextLvl.cost?.mineral && !nextLvl.cost?.oxygen && !nextLvl.cost?.energy) {
    costsEl.innerHTML = '<span style="color:rgba(255,255,255,0.4)">Gratuito</span>';
  }

  const canAfford = (G.base.resources.mineral >= (nextLvl.cost?.mineral || 0)) &&
                    (G.base.resources.oxygen  >= (nextLvl.cost?.oxygen  || 0)) &&
                    (G.base.resources.energy  >= (nextLvl.cost?.energy  || 0));
  const confirmBtn = gel('modal-confirm');
  confirmBtn.disabled = !canAfford;
  confirmBtn.onclick  = () => { doUpgrade(bId); closeModal(); hideBldPopup(); };
  gel('modal-cancel').onclick = closeModal;
  gel('upgrade-modal').classList.add('visible');
}

function closeModal() { gel('upgrade-modal').classList.remove('visible'); }

function doUpgrade(bId) {
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b) return;
  const def     = BUILDINGS[b.type];
  const nextLv  = b.level + 1;
  const nextLvl = def.levels[nextLv];
  if (!nextLvl) return;

  const minCost = nextLvl.cost?.mineral || 0;
  const oxyCost = nextLvl.cost?.oxygen  || 0;
  const eneCost = nextLvl.cost?.energy  || 0;
  if (G.base.resources.mineral < minCost || G.base.resources.oxygen < oxyCost || G.base.resources.energy < eneCost) {
    notify('Recursos insuficientes!', 'error'); return;
  }
  
  if (!hasFreeBuilder()) {
    notify('Todos os astronautas estão ocupados! Contrate mais ou aguarde.', 'error'); return;
  }

  G.base.resources.mineral -= minCost;
  G.base.resources.oxygen  -= oxyCost;
  G.base.resources.energy  -= eneCost;

  if (nextLvl.buildTime > 0) {
    b.upgradeFinish = Date.now() + nextLvl.buildTime * 1000;
    setTimeout(() => finishUpgrade(bId, nextLv), nextLvl.buildTime * 1000);
    notify(`Melhorando ${def.name} para Nível ${nextLv}... (${fmtTime(nextLvl.buildTime)})`, 'info');
  } else {
    finishUpgrade(bId, nextLv);
  }
  refreshBldEl(bId);
  updateHUD();
  saveData();
}

function finishUpgrade(bId, newLevel) {
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b) return;
  b.level        = newLevel;
  b.upgradeFinish = 0;
  const lvlData  = BUILDINGS[b.type].levels[newLevel];
  b.maxHp = lvlData.hp; b.hp = lvlData.hp;
  if (b.type === 'command_center') {
    G.base.ccLevel = newLevel;
    updateHUD();
    renderBuildPanel();
  }
  notify(`✓ ${BUILDINGS[b.type].name} agora é Nível ${newLevel}!`, 'success');
  refreshBldEl(bId);
  saveData();
}

// ============================================================
// BUILD SYSTEM
// ============================================================
function enterBuildMode(type) {
  G.ui.buildMode = true;
  G.ui.buildType = type;
  G.ui.ghostX = -1; G.ui.ghostY = -1;

  closePanels();
  gel('map-container').classList.add('build-mode');
  gel('build-cancel-bar').classList.add('visible');
  gel('build-mode-label').textContent =
    `Posicionando: ${BUILDINGS[type]?.name || type}`;

  const existing = gel('bld-ghost');
  if (existing) existing.remove();
  const ghost = document.createElement('div');
  ghost.id = 'bld-ghost'; ghost.className = 'bld-ghost';
  const img = document.createElement('img');
  img.src = BUILDINGS[type]?.getAsset(1) || ''; img.draggable = false;
  ghost.appendChild(img);
  bldLayer.appendChild(ghost);

  notify(`Toque no mapa para posicionar ${BUILDINGS[type]?.name}`, 'info');
}

function enterMoveMode(bId) {
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b) return;
  hideBldPopup();
  closePanels();

  G.ui.moveMode = true;
  G.ui.moveBldId = bId;
  G.ui.buildType = b.type;
  G.ui.origX = b.x;
  G.ui.origY = b.y;
  G.ui.ghostX = b.x;
  G.ui.ghostY = b.y;

  const el = gel('bld-' + bId);
  if (el) el.style.display = 'none';

  gel('map-container').classList.add('build-mode');
  gel('build-cancel-bar').classList.add('visible');
  gel('build-mode-label').textContent = `Movendo: ${BUILDINGS[b.type]?.name || b.type}`;

  const existing = gel('bld-ghost');
  if (existing) existing.remove();
  const ghost = document.createElement('div');
  ghost.id = 'bld-ghost'; ghost.className = 'bld-ghost';
  const img = document.createElement('img');
  img.src = BUILDINGS[b.type]?.getAsset(b.level) || ''; img.draggable = false;
  ghost.appendChild(img);
  bldLayer.appendChild(ghost);

  moveGhost(b.x, b.y);
  notify(`Mova ${BUILDINGS[b.type]?.name} para o novo local`, 'info');
}

function cancelCurrentMode() {
  if (G.ui.moveMode) {
    const el = gel('bld-' + G.ui.moveBldId);
    if (el) el.style.display = 'block';
  }
  exitBuildMode();
}

function exitBuildMode() {
  G.ui.buildMode = false; G.ui.buildType = null;
  G.ui.moveMode = false; G.ui.moveBldId = null;
  G.ui.ghostX = -1; G.ui.ghostY = -1;
  gel('map-container').classList.remove('build-mode');
  gel('build-cancel-bar').classList.remove('visible');
  const ghost = gel('bld-ghost'); if (ghost) ghost.remove();
}

function moveGhost(gx, gy) {
  const ghost = gel('bld-ghost');
  if (!ghost || !G.ui.buildType) return;
  const def  = BUILDINGS[G.ui.buildType];
  const sz   = def?.size || 1;
  const valid = canPlace(G.ui.buildType, gx, gy, G.ui.moveMode ? G.ui.moveBldId : null);
  G.ui.ghostX = gx; G.ui.ghostY = gy; G.ui.ghostValid = valid;
  ghost.style.display = 'block';
  ghost.style.left    = (gx * CELL_SIZE) + 'px';
  ghost.style.top     = (gy * CELL_SIZE) + 'px';
  ghost.style.width   = (sz * CELL_SIZE) + 'px';
  ghost.style.height  = (sz * CELL_SIZE) + 'px';
  ghost.className     = 'bld-ghost ' + (valid ? 'valid' : 'invalid');
}

function confirmPlace() {
  if (!(G.ui.buildMode || G.ui.moveMode) || !G.ui.buildType) return;
  const { ghostX, ghostY, ghostValid, buildType } = G.ui;
  if (ghostX < 0 || ghostY < 0 || !ghostValid) {
    notify(t('invalid_position'), 'error'); return;
  }
  const def  = BUILDINGS[buildType];

  if (G.ui.moveMode) {
    const b = G.base.buildings.find(x => x.id === G.ui.moveBldId);
    if (b) {
      b.x = ghostX;
      b.y = ghostY;
      saveData();
      refreshBldEl(b.id);
      const el = gel('bld-' + b.id);
      if (el) el.style.display = 'block';
      notify(`${def.name} movido com sucesso!`, 'success');
    }
    exitBuildMode();
    return;
  }

  const lvl1 = def.levels[1];
  const minCost = lvl1.cost?.mineral || 0;
  const oxyCost = lvl1.cost?.oxygen  || 0;

  if (G.base.resources.mineral < minCost || G.base.resources.oxygen < oxyCost) {
    notify(t('insufficient_resources'), 'error'); return;
  }

  if (!hasFreeBuilder()) {
    notify('Todos os astronautas estão ocupados! Contrate mais ou aguarde.', 'error'); return;
  }

  const ccLvl  = getCurrentCCLevel();
  const maxAllowed = BUILDINGS.command_center.levels[ccLvl].unlocks.buildings?.[buildType] || 0;
  if (getBuildingCountOfType(buildType) >= maxAllowed) {
    notify(t('building_limit_reached'), 'error'); return;
  }

  G.base.resources.mineral -= minCost;
  G.base.resources.oxygen  -= oxyCost;

  const nb = {
    id: genId(), type: buildType, level: 1,
    x: ghostX, y: ghostY,
    hp: lvl1.hp, maxHp: lvl1.hp,
    buildFinish: lvl1.buildTime > 0 ? Date.now() + lvl1.buildTime * 1000 : 0,
    upgradeFinish: 0
  };
  G.base.buildings.push(nb);
  if (lvl1.buildTime > 0) {
    setTimeout(() => { nb.buildFinish = 0; refreshBldEl(nb.id); notify(`${t(buildType)} ${t('ready')}!`, 'success'); saveData(); }, lvl1.buildTime * 1000);
  }
  spawnBldEl(nb);
  exitBuildMode();
  updateHUD();
  saveData();
  notify(`${t(buildType)} ${t('ready')}!`, 'success');
}

// ============================================================
// MAP EVENTS (pan + build)
// ============================================================
function initMapEvents() {
  const mc = gel('map-container');
  if (!mc) return;
  let dragging = false, sx = 0, sy = 0, scx = 0, scy = 0, moved = false;

  function getGridPos(clientX, clientY) {
    const canvas = gel('game-canvas');
    if (!canvas) return { gx: 0, gy: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const gx = Math.floor((cx / rect.width) * GRID_W);
    const gy = Math.floor((cy / rect.height) * GRID_H);
    return { gx, gy };
  }

  mc.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragging = true; moved = false;
    sx = e.clientX; sy = e.clientY;
    scx = mc.scrollLeft; scy = mc.scrollTop;
  });
  mc.addEventListener('mousemove', e => {
    if (dragging) {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        moved = true;
        if (!(G.ui.buildMode || G.ui.moveMode)) { mc.scrollLeft = scx - dx; mc.scrollTop = scy - dy; }
      }
    }
    if (G.ui.buildMode || G.ui.moveMode) {
      const { gx, gy } = getGridPos(e.clientX, e.clientY);
      moveGhost(gx, gy);
    }
  });
  mc.addEventListener('mouseup', e => {
    if (!moved) {
      if (G.ui.buildMode || G.ui.moveMode) confirmPlace();
      else hideBldPopup();
    }
    dragging = false;
  });
  mc.addEventListener('mouseleave', () => { dragging = false; });

  window.addEventListener('keydown', e => {
    if (!(G.ui.buildMode || G.ui.moveMode)) return;
    if (e.key === 'Enter') {
      confirmPlace();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      cancelCurrentMode();
    }
  });

  let t0 = null;
  mc.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    t0 = e.touches[0]; moved = false;
    scx = mc.scrollLeft; scy = mc.scrollTop;
  }, { passive: true });
  mc.addEventListener('touchmove', e => {
    if (!t0 || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - t0.clientX;
    const dy = e.touches[0].clientY - t0.clientY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
    if (G.ui.buildMode || G.ui.moveMode) {
      const { gx, gy } = getGridPos(e.touches[0].clientX, e.touches[0].clientY);
      moveGhost(gx, gy);
    } else {
      mc.scrollLeft = scx - dx; mc.scrollTop = scy - dy;
    }
  }, { passive: false });
  mc.addEventListener('touchend', e => {
    t0 = null;
  });
}

// ============================================================
// MAP ZOOM
// ============================================================
function setMapZoom(newZoom, pivotX, pivotY) {
  const mc  = gel('map-container');
  const wrp = gel('map-zoom-wrapper');
  if (!mc || !wrp) return;
  
  const nat = GRID_W * CELL_SIZE;
  const minZoom = Math.max(mc.clientWidth / nat, mc.clientHeight / nat);
  
  const oldZoom = G.ui.mapZoom;
  G.ui.mapZoom  = Math.min(2.5, Math.max(minZoom, newZoom || oldZoom));

  if (pivotX !== undefined && mc.scrollWidth > mc.clientWidth) {
    const rect = mc.getBoundingClientRect();
    const ox = pivotX - rect.left + mc.scrollLeft;
    const oy = pivotY - rect.top  + mc.scrollTop;
    mc.scrollLeft = ox * (G.ui.mapZoom / oldZoom) - (pivotX - rect.left);
    mc.scrollTop  = oy * (G.ui.mapZoom / oldZoom) - (pivotY - rect.top);
  }

  wrp.style.width           = nat + 'px';
  wrp.style.height          = nat + 'px';
  wrp.style.transformOrigin = '0 0';
  wrp.style.transform       = `scale(${G.ui.mapZoom})`;

  const margin = (nat * G.ui.mapZoom) - nat;
  wrp.style.marginRight  = margin + 'px';
  wrp.style.marginBottom = margin + 'px';
}

function initMapZoom() {
  const mc = gel('map-container');
  if (!mc) return;

  mc.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setMapZoom(G.ui.mapZoom * delta, e.clientX, e.clientY);
  }, { passive: false });

  let lastDist = null;
  let pinchMidX = 0, pinchMidY = 0;
  mc.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1];
      lastDist  = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      pinchMidX = (t0.clientX + t1.clientX) / 2;
      pinchMidY = (t0.clientY + t1.clientY) / 2;
    }
  }, { passive: true });
  mc.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && lastDist) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      setMapZoom(G.ui.mapZoom * (dist / lastDist), pinchMidX, pinchMidY);
      lastDist = dist;
    }
  }, { passive: false });
  mc.addEventListener('touchend', () => { lastDist = null; });

  window.addEventListener('resize', () => {
    if (G.ui.screen === 'game') setMapZoom(G.ui.mapZoom);
  });
}

function initBattleZoom() {
  const atk = gel('attack-screen');
  if (!atk) return;
  let lastDist = null;
  atk.addEventListener('wheel', e => {
    e.preventDefault();
    if (!G.battle) return;
    G.battle.userZoom = Math.min(2, Math.max(1.0, (G.battle.userZoom || 1) * (e.deltaY < 0 ? 1.1 : 0.9)));
    drawBattleFrame();
  }, { passive: false });
  atk.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1];
      lastDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    }
  }, { passive: true });
  atk.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && lastDist && G.battle) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      G.battle.userZoom = Math.min(2, Math.max(1.0, (G.battle.userZoom || 1) * (dist / lastDist)));
      lastDist = dist;
      drawBattleFrame();
    }
  }, { passive: false });
  atk.addEventListener('touchend', () => { lastDist = null; });
}

function updateHUD() {
  const r = G.base.resources || {};
  gel('hud-mineral').textContent  = fmtNum(r.mineral);
  gel('hud-oxygen').textContent   = fmtNum(r.oxygen);
  gel('hud-energy').textContent   = fmtNum(r.energy);
  gel('hud-gems').textContent     = fmtNum(G.base.gems || 0);
  gel('hud-trophies').textContent = G.base.trophies || 0;
  const name = G.base.playerName || t('colono');
  gel('hud-name').textContent  = name;
  gel('hud-cc').textContent    = `CC ${t('level')} ${getCurrentCCLevel()}`;
  gel('hud-avatar').textContent = name[0]?.toUpperCase() || 'C';
  const league = getLeague(G.base.trophies || 0);
  const lb = gel('hud-league');
  if (lb) { lb.innerHTML = `${league.emoji} <span data-t="${league.name.toLowerCase()}">${t(league.name.toLowerCase())}</span>`; lb.style.color = league.color; }
  const shieldEl = gel('hud-shield');
  if (shieldEl) {
    const shieldActive = G.base.shieldUntil && G.base.shieldUntil > Date.now();
    shieldEl.style.display = shieldActive ? 'flex' : 'none';
    if (shieldActive) {
      const rem = Math.ceil((G.base.shieldUntil - Date.now()) / 3600000);
      shieldEl.textContent = `🛡️ ${rem}h`;
    }
  }
  const bldEl = gel('hud-builders');
  if (bldEl) {
    bldEl.textContent = `${getBuildersInUse()} / ${getTotalBuilders()}`;
    bldEl.parentElement.style.color = hasFreeBuilder() ? 'var(--c-success)' : 'var(--c-danger)';
  }
}

function updateUILanguage() {
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.dataset.t;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-t-placeholder]').forEach(el => {
    const key = el.dataset.tPlaceholder;
    el.placeholder = t(key);
  });
  updateHUD();
  if (G.ui.panel) showPanel(G.ui.panel);
  renderBuildingsLayer();
}

function showPanel(name) {
  if (G.ui.panel === name) { closePanels(); return; }
  closePanels();
  G.ui.panel = name;
  gel('panel-overlay').classList.add('active');
  gel(name + '-panel')?.classList.add('visible');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  gel('nav-' + name)?.classList.add('active');

  if (name === 'build')   renderBuildPanel();
  if (name === 'troops')  renderTroopsPanel();
  if (name === 'info')    renderInfoPanel();
  if (name === 'mission') renderMissionPanel();
}

function openShop() {
  showPanel('build');
  filterBuildTab('shop');
}

function closePanels() {
  G.ui.panel = null;
  gel('panel-overlay').classList.remove('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

function renderBuildPanel() {
  const grid = gel('build-panel-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const ccLvl  = getCurrentCCLevel();
  const unlocks = BUILDINGS.command_center.levels[ccLvl].unlocks.buildings || {};
  const order   = [
    'mineral_extractor','oxygen_extractor','solar_panel',
    'barracks','camp','turret','laboratory','railgun',
    'mineral_storage','oxygen_storage','energy_storage'
  ];

  for (const type of order) {
    const def  = BUILDINGS[type]; if (!def) continue;
    const max  = unlocks[type] || 0;
    const cur  = getBuildingCountOfType(type);
    const lv1  = def.levels[1];
    const locked = max === 0;

    const card = document.createElement('div');
    card.className = 'build-card-new' + (locked ? ' locked' : '');
    
    const costVal = lv1.cost.mineral || lv1.cost.oxygen || 0;
    const costIcon = lv1.cost.mineral !== undefined ? '⛏️' : '💨';

    card.innerHTML = `
      <div class="bn-title">${t(type)}</div>
      <img src="${def.getAsset(1)}" class="bn-img">
      <div style="font-size:10px;color:#aaa;margin-bottom:5px">⏳ ${fmtTime(lv1.buildTime)}</div>
      <div class="bn-count">${cur}/${max}</div>
      <div class="bn-cost-bar">
        <span class="bn-cost-val">${fmtNum(costVal)}</span>
        <span style="font-size:12px">${costIcon}</span>
      </div>
      ${locked ? `<div class="bn-lock">🔒</div>` : ''}
    `;

    if (!locked && cur < max) {
      card.onclick = () => { closePanels(); enterBuildMode(type); };
    } else if (locked) {
      card.onclick = () => notify(`Desbloqueie melhorando o Centro de Comando!`, 'info');
    } else {
      card.onclick = () => notify(`Limite atingido!`, 'info');
    }
    grid.appendChild(card);
  }
}

window.filterBuildTab = function(tab) {
  document.querySelectorAll('.panel-tabs .tab').forEach((el, i) => {
    el.classList.toggle('active', 
      (tab === 'all' && i === 0) || 
      (tab === 'shop' && i === 1) || 
      (tab === 'res' && i === 2) || 
      (tab === 'shield' && i === 3)
    );
  });
  
  const head = gel('build-panel-head');
  if (head) head.style.display = tab === 'all' ? 'block' : 'none';

  if (tab === 'all') renderBuildPanel();
  else if (tab === 'shop') renderShopTab();
  else if (tab === 'res') renderResourcesTab();
  else if (tab === 'shield') renderShieldTab();
};

function renderShopTab() {
  const grid = gel('build-panel-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const packages = [
    { name: 'Punhado de Gemas', gems: 100, price: 'R$ 4,90', icon: '💎' },
    { name: 'Pilha de Gemas', gems: 500, price: 'R$ 19,90', icon: '💎💎' },
    { name: 'Caixa de Gemas', gems: 1200, price: 'R$ 39,90', icon: '💎💎💎' }
  ];

  packages.forEach(pkg => {
    const card = document.createElement('div');
    card.className = 'build-card-new';
    card.innerHTML = `
      <div class="bn-title">${pkg.name}</div>
      <div style="font-size:40px;margin:15px 0">${pkg.icon}</div>
      <div class="bn-count" style="bottom:50px; right:auto; width:100%; text-align:center;">${pkg.gems} 💎</div>
      <div class="bn-cost-bar" style="background:#444">
        <span class="bn-cost-val" style="font-size:9px">EM BREVE</span>
      </div>
    `;
    card.onclick = () => notify('A loja de gemas estará disponível em breve!', 'info');
    grid.appendChild(card);
  });
}

function renderResourcesTab() {
  const grid = gel('build-panel-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const offers = [
    { name: 'Minérios', amount: 10000, cost: 50, icon: '⛏️', type: 'mineral' },
    { name: 'Oxigênio', amount: 10000, cost: 50, icon: '💨', type: 'oxygen' },
    { name: 'Energia',  amount: 5000,  cost: 50, icon: '⚡', type: 'energy' }
  ];

  offers.forEach(off => {
    const card = document.createElement('div');
    card.className = 'build-card-new';
    card.innerHTML = `
      <div class="bn-title">${off.name}</div>
      <div style="font-size:40px;margin:15px 0">${off.icon}</div>
      <div class="bn-count" style="bottom:50px; right:auto; width:100%; text-align:center;">+${fmtNum(off.amount)}</div>
      <div class="bn-cost-bar">
        <span class="bn-cost-val">${off.cost} 💎</span>
      </div>
    `;
    card.onclick = () => {
      if ((G.base.gems || 0) < off.cost) return notify('Gemas insuficientes!', 'error');
      G.base.gems -= off.cost;
      G.base.resources[off.type] += off.amount;
      clampResources();
      updateHUD();
      saveData();
      notify(`Você comprou ${fmtNum(off.amount)} de ${off.name}!`, 'success');
    };
    grid.appendChild(card);
  });
}

function renderShieldTab() {
  const grid = gel('build-panel-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const shields = [
    { name: 'Escudo 24h', hours: 24, cost: 100 },
    { name: 'Escudo 3 Dias', hours: 72, cost: 250 },
    { name: 'Escudo 7 Dias', hours: 168, cost: 500 }
  ];

  shields.forEach(s => {
    const card = document.createElement('div');
    card.className = 'build-card-new';
    card.innerHTML = `
      <div class="bn-title">${s.name}</div>
      <img src="shield.png" style="width:50px; height:50px; object-fit:contain; margin:15px 0">
      <div class="bn-count" style="bottom:50px; right:auto; width:100%; text-align:center;">${s.hours}h</div>
      <div class="bn-cost-bar">
        <span class="bn-cost-val">${s.cost} 💎</span>
      </div>
    `;
    card.onclick = () => {
      if ((G.base.gems || 0) < s.cost) return notify('Gemas insuficientes!', 'error');
      
      G.base.gems -= s.cost;
      const current = G.base.shieldUntil && G.base.shieldUntil > Date.now() ? G.base.shieldUntil : Date.now();
      G.base.shieldUntil = current + (s.hours * 3600 * 1000);
      
      updateHUD();
      saveData();
      notify(`${s.name} ativado!`, 'success');
    };
    grid.appendChild(card);
  });
}

function renderMissionPanel() {
  const cont = gel('mission-content');
  if (!cont) return;
  
  if (!G.base.missions) G.base.missions = { currentId: 0, completed: [], claimed: [], progress: 0, allProgress: {} };
  if (!G.base.missions.allProgress) G.base.missions.allProgress = {};
  if (!G.base.missions.claimed) G.base.missions.claimed = [];
  
  let html = `<div class="mission-title" data-t="mission_title">${t('mission_title')}</div>`;
  
  let hasPending = false;
  
  // Dividimos em Pendentes e Concluídas/Resgatadas?
  // Vamos mostrar todas em uma lista única, mas destacando as que podem ser resgatadas.
  
  MISSIONS.forEach(m => {
    const prog = G.base.missions.allProgress[m.id] || 0;
    const isDone = prog >= m.goal;
    const pct = Math.min(100, Math.floor((prog / m.goal) * 100));
    const isClaimed = G.base.missions.claimed.includes(m.id);
    
    if (!isClaimed) hasPending = true;

    html += `
      <div class="${isClaimed ? 'mission-card-next' : 'mission-box-current'}" style="${isClaimed ? 'opacity: 0.7; border-color: #444;' : ''}">
        ${isDone && !isClaimed ? `<div class="mission-badge" style="background:#00D215;">${t('ready') || 'PRONTO'}</div>` : ''}
        <div class="mission-flex">
          <div class="mission-info">
            <div class="mission-text">${t('mission_' + m.id)}</div>
            <div class="mission-reward-label">${t('earn_reward')} ${m.reward} ${t('gems_unit')}</div>
            <div class="mission-prog-wrap">
              <div class="mission-prog-bar">
                <div class="mission-prog-fill ${isDone ? 'done' : ''}" style="width:${pct}%"></div>
              </div>
              <div class="mission-prog-pct">${pct}%</div>
            </div>
          </div>
          <button class="btn-claim-mission ${(!isDone || isClaimed) ? 'disabled' : ''}" 
            ${(!isDone || isClaimed) ? 'disabled' : ''} 
            onclick="claimMissionReward(${m.id})">
            ${isClaimed ? t('claimed') : `${t('claim_reward')}<br>${m.reward} ${t('gems_unit')}`}
          </button>
        </div>
      </div>
    `;
  });
  
  if (!hasPending) {
    html += `<p style="color:#00D215;text-align:center;padding:20px;font-family:var(--font-hd);">${t('all_missions_done')}</p>`;
  }
  
  cont.innerHTML = html;
}

function checkMissionProgress() {
  if (!G.base.missions) return;
  if (!G.base.missions.allProgress) G.base.missions.allProgress = {};

  MISSIONS.forEach(m => {
    let prog = 0;
    if (m.type === 'build') {
      prog = getBuildingCountOfType(m.bldType);
    } else if (m.type === 'cc_level') {
      prog = getCurrentCCLevel();
    } else if (m.type === 'attack_win_total') {
      prog = G.base.totalWins || 0;
    } else if (m.type === 'destroy_buildings_total') {
      prog = G.base.totalDestroyed || 0;
    } else if (m.type === 'win_streak') {
      prog = G.base.winStreak || 0;
    } else if (m.type === 'remove_obstacle') {
      prog = G.base.totalObstaclesRemoved || 0;
    } else if (m.type === 'research_total') {
      prog = G.base.totalResearch || 0;
    } else if (m.type === 'train_troop') {
      if (m.troop === 'drone') prog = G.base.totalDronesTrained || 0;
      // Adicione outros se necessário
    } else if (m.type === 'attack_win') {
      prog = G.base.missions.allProgress[m.id] || 0;
    }
    
    if (prog > m.goal) prog = m.goal;
    G.base.missions.allProgress[m.id] = prog;
  });

  if (G.ui.panel === 'mission') renderMissionPanel();
}

function claimMissionReward(id) {
  const m = MISSIONS[id];
  if (!m || !G.base.missions.claimed) return;
  if (G.base.missions.claimed.includes(id)) return;
  
  const prog = G.base.missions.allProgress[id] || 0;
  if (prog < m.goal) return;
  
  G.base.missions.claimed.push(id);
  G.base.gems = (G.base.gems || 0) + m.reward;
  
  updateHUD();
  notify(`${t('reward_claimed_success')}: +${m.reward} 💎`, 'success');
  saveData();
  renderMissionPanel();
}

function renderTroopsPanel() {
  const list     = gel('troops-list');
  const capFill  = gel('cap-bar-fill');
  const capLabel = gel('cap-bar-label-val');
  if (!list) return;

  const totalCap  = getTotalCampCapacity(G.base.buildings);
  const usedSpace = getTotalTroopSpace(G.base.troops);
  const capPct    = totalCap > 0 ? Math.min(100, (usedSpace / totalCap) * 100) : 0;

  if (capFill)  capFill.style.width   = capPct + '%';
  if (capLabel) capLabel.textContent  = `${usedSpace} / ${totalCap}`;

  list.innerHTML = '';
  const ccLvl     = getCurrentCCLevel();
  const unlocked  = BUILDINGS.command_center.levels[ccLvl].unlocks.troop_unlock || [];
  const available = getAvailableTroops(G.base.buildings);

  if (totalCap === 0) {
    list.innerHTML = `<p style="color:rgba(255,255,255,0.35);text-align:center;padding:18px;font-size:12px">
      ${t('build_camp_tip') || 'Construa um Acampamento para abrigar tropas!'}</p>`;
  }

  for (const troopId of unlocked) {
    const td    = TROOPS[troopId]; if (!td) continue;
    const count = G.base.troops?.[troopId] || 0;
    const canTrain = available.includes(troopId);
    const full     = (usedSpace + td.space) > totalCap;

    const row = document.createElement('div');
    row.className  = 'troop-row';
    row.style.opacity = canTrain ? '1' : '0.45';
    row.innerHTML = `
      <span class="tr-emoji">${td.emoji}</span>
      <div class="tr-info">
        <div class="tr-name">${t(troopId)}</div>
        <div class="tr-stats">❤️${td.hp} ⚔️${td.damage} 🕐${fmtTime(td.trainTime)}</div>
        <div class="tr-stats">${t('capacity')}: ${td.space} · ${t(troopId + '_desc')}</div>
      </div>
      <div class="tr-count-wrap">
        <span class="tr-cnt">${count}</span>
      </div>
    `;
    if (canTrain) {
      const btn = document.createElement('button');
      btn.className  = 'btn-train';
      btn.disabled   = full || G.base.resources.mineral < td.cost.mineral || G.base.resources.oxygen < td.cost.oxygen;
      btn.innerHTML  = `${t('train') || 'TREINAR'}<br><small>⛏️${fmtNum(td.cost.mineral)} 💨${fmtNum(td.cost.oxygen)}</small>`;
      btn.onclick    = () => { trainTroop(troopId); renderTroopsPanel(); };
      row.appendChild(btn);
    } else {
      const lck = document.createElement('span');
      lck.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.25)';
      lck.textContent   = t('locked') || 'Bloqueado';
      row.appendChild(lck);
    }
    list.appendChild(row);
  }

  if (unlocked.length === 0) {
    list.innerHTML = `<p style="color:rgba(255,255,255,0.35);text-align:center;padding:18px;font-size:12px">
      Construa um Quartel para treinar tropas!</p>`;
  }

  renderTrainingQueue();
}

function renderTrainingQueue() {
  const el = gel('training-queue-list');
  if (!el) return;
  if (!G.base.queue || G.base.queue.length === 0) {
    el.innerHTML = '<p style="color:rgba(255,255,255,0.25);font-size:11px">Nenhum treinamento em andamento.</p>';
    return;
  }
  el.innerHTML = '';
  for (const item of G.base.queue) {
    const td  = TROOPS[item.type];
    const rem = Math.max(0, (item.finishTime - Date.now()) / 1000);
    const cost = Math.max(1, Math.ceil(rem / 60));
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'space-between';
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px">${td?.emoji || '?'}</span>
        <span style="font-size:12px">${td?.name || item.type}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="qi-time">${fmtTime(rem)}</span>
        <button onclick="speedUpTraining(${item.finishTime}, ${cost})" style="cursor:pointer; background:var(--c-gem); border:none; padding:4px 8px; border-radius:4px; color:#fff; font-weight:bold; font-size:10px; display:flex; align-items:center; gap:4px;">⚡💎${cost}</button>
      </div>`;
    el.appendChild(div);
  }
}

// ---- Info Panel ----
function renderInfoPanel() {
  const content = gel('info-content');
  if (!content) return;
  const ccLvl = getCurrentCCLevel();
  const themes  = { 1: 'Ferro ⚙️', 2: 'Energia ⚡', 3: 'Ouro 🥇' };
  const blds = G.base.buildings || [];
  const maxMin = getStorageCapacity(blds, 'mineral');
  const maxOxy = getStorageCapacity(blds, 'oxygen');
  const maxEne = getStorageCapacity(blds, 'energy');
  
  let adminBtn = '';
  if (G.user?.email === 'admin@colonyclash.com') {
    adminBtn = `<button onclick="document.getElementById('admin-panel').classList.remove('hidden'); closePanels();" style="width: calc(100% - 32px); margin: 0 auto 12px; display:block; padding: 12px; background: linear-gradient(135deg, rgba(255,68,102,0.2), rgba(255,68,102,0.4)); border: 2px solid #FF4466; border-radius: 10px; color: #FF4466; font-family: 'Orbitron'; font-size: 14px; font-weight: bold; cursor: pointer; text-shadow: 0 0 10px rgba(255,68,102,0.8);">🛡️ ABRIR PAINEL ADMIN</button>`;
  }

  let nameChangeBtn = '';
  if (!G.base.nameChanged) {
    nameChangeBtn = `<button onclick="promptChangeName()" style="margin-left:8px; background:rgba(46,204,113,0.2); border:1px solid var(--c-gem); border-radius:6px; color:var(--c-gem); font-size:9px; padding:3px 8px; cursor:pointer; font-family:var(--font-hd); vertical-align:middle;">💎 100</button>`;
  }

  content.innerHTML = `
    <img src="cc_lvl${ccLvl}.png" class="info-cc-img" alt="CC">
    <div class="info-cc-label">${t('command_center')} ${t('level')} ${ccLvl} · ${themes[ccLvl]}</div>
    ${adminBtn}
    <div style="text-align:center; margin-bottom:10px; font-size:10px; color:rgba(255,255,255,0.4);">UID: ${G.pid}</div>
    <div style="padding:0 16px; margin-bottom:12px; background:rgba(255,255,255,0.03); border-radius:12px; margin:0 16px 12px;">
      <div style="font-family:var(--font-hd); font-size:9px; color:#888; letter-spacing:2px; padding:10px 0 6px" data-t="storage">💼 ARMAZENAMENTO</div>
      <div style="display:flex; flex-direction:column; gap:6px; padding-bottom:10px;">
        <div style="display:flex; justify-content:space-between; font-size:11px;"><span>⛏️ ${t('mineral')}</span><span style="color:var(--c-mineral)">${fmtNum(G.base.resources?.mineral)} / ${fmtNum(maxMin)}</span></div>
        <div style="display:flex; justify-content:space-between; font-size:11px;"><span>💨 ${t('oxygen')}</span><span style="color:var(--c-oxygen)">${fmtNum(G.base.resources?.oxygen)} / ${fmtNum(maxOxy)}</span></div>
        <div style="display:flex; justify-content:space-between; font-size:11px;"><span>⚡ ${t('energy')}</span><span style="color:var(--c-energy)">${fmtNum(G.base.resources?.energy)} / ${fmtNum(maxEne)}</span></div>
      </div>
    </div>
    <table class="info-table">
      <tr><td>👤 ${t('username')}</td><td style="color:#fff">${G.base.playerName || t('colono')} ${nameChangeBtn}</td></tr>
      <tr><td>🏆 ${t('trophies')}</td><td style="color:var(--c-gold)">${G.base.trophies || 0}</td></tr>
      <tr><td>🏗️ ${t('buildings')}</td><td>${G.base.buildings.length}</td></tr>
      <tr><td>🛠️ ${t('drone')}</td><td>${G.base.troops?.drone || 0}</td></tr>
      <tr><td>🤖 ${t('robot')}</td><td>${G.base.troops?.robot || 0}</td></tr>
      <tr><td>🚀 ${t('tank')}</td><td>${G.base.troops?.tank || 0}</td></tr>
    </table>
    <button class="btn-logout" onclick="logout()">🚹 ${t('logout')}</button>
  `;
}

window.promptChangeName = function() {
  if (G.base.nameChanged) {
    notify('Você já alterou seu nome uma vez!', 'error');
    return;
  }
  if ((G.base.gems || 0) < 100) {
    notify(`${t('not_enough_gems')} (100 ${t('ready')})`, 'error');
    return;
  }
  
  const newName = prompt('Digite o novo nome para sua colônia (máx. 12 letras):');
  if (!newName) return;
  const cleanName = newName.trim().substring(0, 12);
  if (cleanName.length < 3) {
    notify('Nome muito curto! (mín. 3 letras)', 'error');
    return;
  }
  
  if (confirm(`Deseja alterar o nome para "${cleanName}" por 100 gemas?`)) {
    G.base.gems -= 100;
    G.base.playerName = cleanName;
    G.base.nameChanged = true;
    notify(t('name_changed_success'), 'success');
    renderInfoPanel();
    updateHUD();
    saveData();
  }
};

// ============================================================
// TROOP TRAINING
// ============================================================
function trainTroop(type) {
  const td  = TROOPS[type]; if (!td) return;
  const cap = getTotalCampCapacity(G.base.buildings);
  const used = getTotalTroopSpace(G.base.troops);
  if (used + td.space > cap) { notify(t('need_camp'), 'error'); return; }
  if (G.base.resources.mineral < td.cost.mineral || G.base.resources.oxygen < td.cost.oxygen) {
    notify('Recursos insuficientes!', 'error'); return;
  }
  G.base.resources.mineral -= td.cost.mineral;
  G.base.resources.oxygen  -= td.cost.oxygen;

  if (!G.base.queue) G.base.queue = [];
  const finishTime = Date.now() + td.trainTime * 1000;
  G.base.queue.push({ type, finishTime });
  setTimeout(() => finishTraining(type, finishTime), td.trainTime * 1000);

  updateHUD();
  saveData();
  notify(`${t('training')} ${t(type)}... (${fmtTime(td.trainTime)})`, 'info');
}

function finishTraining(type, finishTime) {
  if (!G.base.queue) return;
  const idx = G.base.queue.findIndex(q => q.type === type && q.finishTime === finishTime);
  if (idx >= 0) G.base.queue.splice(idx, 1);
  G.base.troops[type] = (G.base.troops[type] || 0) + 1;
  
  if (type === 'drone') {
    G.base.totalDronesTrained = (G.base.totalDronesTrained || 0) + 1;
    if (G.base.missions && G.base.missions.allProgress) {
      MISSIONS.forEach(m => {
        if (m.type === 'train_troop' && m.troop === 'drone') {
          G.base.missions.allProgress[m.id] = G.base.totalDronesTrained;
        }
      });
    }
  }
  
  notify(`${TROOPS[type]?.emoji} ${t(type)} ${t('ready')}!`, 'success');
  if (G.ui.panel === 'troops') renderTroopsPanel();
  updateHUD();
  saveData();
}

// ============================================================
// TIMERS
// ============================================================
function startTimers() {
  lastResourceTick = Date.now();
  G.timers.resource = setInterval(() => {
    const now     = Date.now();
    const elapsed = (now - lastResourceTick) / 1000;
    lastResourceTick = now;
    const gain = calcResourceGain(elapsed);
    G.base.resources.mineral += gain.mineral;
    G.base.resources.oxygen  += gain.oxygen;
    G.base.resources.energy  += gain.energy;
    clampResources();
    updateHUD();
  }, 5000);

  G.timers.save  = setInterval(saveData, 30000);

  G.timers.queue = setInterval(() => {
    const now = Date.now();
    if (!G.base.queue) return;
    for (const item of [...G.base.queue]) {
      if (item.finishTime <= now) finishTraining(item.type, item.finishTime);
    }
    if (G.ui.panel === 'troops') renderTrainingQueue();
  }, 1000);

  // Spawning de obstáculos (Rochas)
  G.timers.obstacles = setInterval(trySpawnObstacle, 60000); // Checa a cada minuto
}

function cancelUpgrade(bId) {
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b || !b.upgradeFinish || b.upgradeFinish <= Date.now()) return;
  
  if (confirm(t('confirm_cancel_upgrade'))) {
    const def = BUILDINGS[b.type];
    const nextLvl = b.level + 1;
    const cost = def.levels[nextLvl].cost;
    
    G.base.resources.mineral += Math.floor((cost.mineral || 0) * 0.5);
    G.base.resources.oxygen  += Math.floor((cost.oxygen || 0) * 0.5);
    
    b.upgradeFinish = 0;
    notify(t('upgrade_cancelled'), 'info');
    hideBldPopup();
    refreshBldEl(bId);
    updateHUD();
    saveData();
  }
}

function processOfflineObstacles() {
  const now = Date.now();
  const last = G.base.lastObstacleSpawn || now;
  const diff = now - last;
  
  const ccLvl = getCurrentCCLevel();
  const intervals = { 1: 3600000, 2: 7200000, 3: 10800000 };
  const interval  = intervals[ccLvl] || 3600000;
  
  const count = Math.floor(diff / interval);
  if (count > 0) {
    const maxSpawn = 20;
    let spawned = 0;
    for (let i = 0; i < count && spawned < maxSpawn; i++) {
      let gx, gy, attempts = 0;
      do {
        gx = Math.floor(Math.random() * GRID_W);
        gy = Math.floor(Math.random() * GRID_H);
        attempts++;
      } while (!canPlace('lunar_rock', gx, gy) && attempts < 100);
      
      if (attempts < 100) {
        G.base.buildings.push({
          id: genId(), type: 'lunar_rock', level: 1,
          x: gx, y: gy, hp: 10, maxHp: 10,
          buildFinish: 0, upgradeFinish: 0
        });
        spawned++;
      }
    }
    G.base.lastObstacleSpawn = now;
  }
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function switchScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  gel(name + '-screen')?.classList.remove('hidden');
  G.ui.screen = name;
}

function setLoadProgress(pct) {
  const bar = gel('loading-bar');
  if (bar) bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
}

// ============================================================
// STARS (login bg + canvas stars)
// ============================================================
function spawnLoginStars() {
  const layer = qsel('.stars-layer');
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < 180; i++) {
    const s   = document.createElement('div');
    const sz  = Math.random() * 2.2 + 0.4;
    const dur = (2 + Math.random() * 5).toFixed(1);
    const del = (Math.random() * 5).toFixed(1);
    const minO = (0.15 + Math.random() * 0.2).toFixed(2);
    const maxO = (0.6  + Math.random() * 0.4).toFixed(2);
    s.className = 'star';
    s.style.cssText = `
      width:${sz}px;height:${sz}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      --dur:${dur}s;--delay:-${del}s;
      --min-op:${minO};--max-op:${maxO};
    `;
    layer.appendChild(s);
  }
}

// ============================================================
// OPPONENT SCREEN
// ============================================================
// ============================================================
// MATCHMAKING
// ============================================================
async function showOpponentScreen() {
  // Check if under attack by showing matchmaking
  startMatchmaking();
}

async function startMatchmaking() {
  const screen = gel('opponent-screen');
  screen.classList.add('visible');
  const area = gel('matchmaking-area');
  if (!area) return;

  // Check own shield
  if (G.base.shieldUntil && G.base.shieldUntil > Date.now()) {
    const rem = Math.ceil((G.base.shieldUntil - Date.now()) / 3600000);
    area.innerHTML = `<div class="mm-status">🛡️ Você está protegido por ${rem}h<br><small>Atacar remove sua proteção!</small></div>
      <button class="mm-btn" onclick="confirmAttackWithShield()">⚔️ ATACAR MESMO ASSIM</button>`;
    return;
  }

  area.innerHTML = `<div class="mm-status"><div class="mm-spinner"></div>Procurando oponente...</div>`;

  if (!G.db) {
    area.innerHTML = `<div class="mm-status">⚠️ Configure o Firebase para jogar online!</div>`;
    return;
  }

  try {
    const myEnergy = G.base.resources?.energy || 0;
    if (myEnergy < 10) {
      area.innerHTML = `<div class="mm-status" style="color:var(--c-energy)">⚡ Energia insuficiente para buscar (10 necessária)</div>
        <button class="mm-btn" onclick="closePanels()">FECHAR</button>`;
      return;
    }

    // Cobrar energia
    G.base.resources.energy -= 10;
    updateHUD();
    saveData();

    const myCC = getCurrentCCLevel();
    // Query CC ±1 level
    let snap = await G.db.collection('colonies')
      .where('ccLevel', '>=', Math.max(1, myCC - 1))
      .where('ccLevel', '<=', myCC + 1)
      .limit(30).get();
      
    let pool = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.uid !== G.pid && (p.buildings||[]).length > 0
        && !(p.shieldUntil && p.shieldUntil > Date.now()));
    
    // Fallback: se não achar no range, pegar qualquer um (mas preferir CC próximo)
    if (pool.length === 0) {
      const snap2 = await G.db.collection('colonies').limit(50).get();
      pool = snap2.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.uid !== G.pid && (p.buildings||[]).length > 0
          && !(p.shieldUntil && p.shieldUntil > Date.now()));
    }
    if (pool.length === 0) {
      area.innerHTML = `<div class="mm-status">😴 Nenhum oponente disponível.<br>Tente novamente mais tarde!</div>
        <button class="mm-btn" onclick="startMatchmaking()">🔄 TENTAR NOVAMENTE</button>`;
      return;
    }
    // Pick random from pool
    const op = pool[Math.floor(Math.random() * pool.length)];
    const league = getLeague(op.trophies || 0);
    const init = (op.playerName || 'C')[0].toUpperCase();
    G._pendingOpponent = op;
    area.innerHTML = `
      <div class="mm-found" data-t="opponent_found">${t('opponent_found') || '⚔️ Oponente Encontrado!'}</div>
      <div class="opp-card mm-card">
        <div class="opp-avatar" style="background:linear-gradient(135deg,${league.color}44,${league.color}22)">${init}</div>
        <div class="opp-info">
          <div class="opp-name">${op.playerName || 'Colono'}</div>
          <div class="opp-stats">${league.emoji} ${league.name} · CC${op.ccLevel||1} · 🏆${op.trophies||0}</div>
          <div class="opp-stats">${(op.buildings||[]).length} construções · ⛏️${fmtNum(op.resources?.mineral||0)} 💨${fmtNum(op.resources?.oxygen||0)}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="mm-btn" onclick="confirmMatchmaking()" data-t="attack_btn">${t('attack') || '⚔️ ATACAR!'}</button>
        <button class="mm-btn mm-btn-skip" onclick="startMatchmaking()" data-t="next_btn">⚡ 10 · ${t('next') || 'Próximo'}</button>
      </div>`;
  } catch (e) {
    area.innerHTML = `<div style="color:var(--c-danger);text-align:center;font-size:12px">Erro: ${e.message}</div>
      <button class="mm-btn" onclick="startMatchmaking()">🔄 TENTAR NOVAMENTE</button>`;
  }
}

function confirmMatchmaking() {
  if (!G._pendingOpponent) return;
  G.base.shieldUntil = 0;
  const screen = gel('opponent-screen');
  screen.classList.remove('visible');
  screen.classList.add('hidden');
  launchBattle(G._pendingOpponent);
  G._pendingOpponent = null;
}

function confirmAttackWithShield() {
  G.base.shieldUntil = 0;
  saveData();
  startMatchmaking();
}

// ============================================================
// BATTLE SYSTEM
// ============================================================
let bCtx, bCanvas, bInterval, bTimerInterval;

function launchBattle(opponent) {
  const myTroops = G.base.troops || {};
  const totalT   = Object.values(myTroops).reduce((a, c) => a + c, 0);
  if (totalT === 0) { notify(t('train_troops_first'), 'error'); return; }
  if (!opponent.buildings || opponent.buildings.length === 0) { notify(t('enemy_base_empty'), 'error'); return; }

  switchScreen('attack');
  bCanvas = gel('battle-canvas');
  bCtx    = bCanvas.getContext('2d');
  const atkScreen = gel('attack-screen');
  bCanvas.width   = atkScreen.clientWidth;
  bCanvas.height  = atkScreen.clientHeight - 50 - 68;

  // Scale: fit the grid into the canvas
  const scaleX = bCanvas.width  / (GRID_W * CELL_SIZE);
  const scaleY = bCanvas.height / (GRID_H * CELL_SIZE);
  const scale  = Math.min(scaleX, scaleY) * 0.95;
  const offX   = (bCanvas.width  - GRID_W * CELL_SIZE * scale) / 2;
  const offY   = (bCanvas.height - GRID_H * CELL_SIZE * scale) / 2;

  G.battle = {
    opponent,
    buildings: opponent.buildings.map(b => {
      const def  = BUILDINGS[b.type];
      const lvl  = def?.levels?.[b.level];
      return { ...b, curHp: lvl?.hp || 400, maxHp: lvl?.hp || 400, alive: true, atkTimer: 0 };
    }),
    troops: [],
    deployPool: { ...myTroops },
    selectedTroop: null,
    startTime: Date.now(),
    duration: 180,
    destroyed: 0,
    totalBld: opponent.buildings.length,
    phase: 'deploy',
    projectiles: [],
    explosions: [],
    scale, offX, offY,
    lootedMineral: 0,
    lootedOxygen: 0,
    // Máximo de roubo: 30% dos recursos do oponente
    totalStealMin: Math.floor((opponent.resources?.mineral || 0) * 0.3),
    totalStealOxy: Math.floor((opponent.resources?.oxygen || 0) * 0.3)
  };

  // Distribuir saque entre armazéns e CC
  const storages = G.battle.buildings.filter(b => BUILDINGS[b.type]?.isStorage || b.type === 'command_center');
  const count = storages.length || 1;
  storages.forEach(b => {
    b.lootMin = Math.floor(G.battle.totalStealMin / count);
    b.lootOxy = Math.floor(G.battle.totalStealOxy / count);
  });

  buildDeployBar();
  gel('atk-pct').textContent   = '💥 0%';
  gel('atk-timer').textContent = '3:00';

  bCanvas.addEventListener('click', onBattleClick);
  bCanvas.addEventListener('touchend', onBattleTouchEnd);

  drawBattleFrame();
  bInterval      = setInterval(battleTick, 100);
  bTimerInterval = setInterval(tickBattleTimer, 500);
}

function buildDeployBar() {
  const bar = gel('troops-deploy-bar');
  if (!bar || !G.battle) return;
  bar.innerHTML = '';
  for (const [type, count] of Object.entries(G.battle.deployPool)) {
    if (!TROOPS[type] || count <= 0) continue;
    const td  = TROOPS[type];
    const btn = document.createElement('button');
    btn.className = 'deploy-btn' + (G.battle.selectedTroop === type ? ' selected' : '');
    btn.id        = 'deploy-' + type;
    btn.innerHTML = `<span class="db-emoji">${td.emoji}</span>
      <span class="db-name">${td.name}</span>
      <span class="db-count" id="pool-${type}">${count}</span>`;
    btn.onclick   = () => selectTroop(type);
    bar.appendChild(btn);
  }
  const endBtn = document.createElement('button');
  endBtn.className = 'btn-end-battle';
  endBtn.textContent = 'ENCERRAR';
  endBtn.onclick  = endBattle;
  bar.appendChild(endBtn);
}

function selectTroop(type) {
  if (!G.battle) return;
  G.battle.selectedTroop = type;
  document.querySelectorAll('.deploy-btn').forEach(b => b.classList.remove('selected'));
  gel('deploy-' + type)?.classList.add('selected');
}

function getGridFromCanvas(cx, cy) {
  const { offX, offY, scale, userZoom = 1 } = G.battle;
  const bCanvas = gel('battle-canvas');
  const W = bCanvas.width, H = bCanvas.height;
  const x = (cx - W/2) / userZoom + W/2;
  const y = (cy - H/2) / userZoom + H/2;
  return { gx: (x - offX) / (CELL_SIZE * scale), gy: (y - offY) / (CELL_SIZE * scale) };
}

function onBattleClick(e) {
  const r = bCanvas.getBoundingClientRect();
  deployTroop(e.clientX - r.left, e.clientY - r.top);
}
function onBattleTouchEnd(e) {
  const t = e.changedTouches[0];
  const r = bCanvas.getBoundingClientRect();
  deployTroop(t.clientX - r.left, t.clientY - r.top);
}

function deployTroop(px, py) {
  if (!G.battle || G.battle.phase === 'end') return;
  const type = G.battle.selectedTroop;
  if (!type) { notify(t('select_troop_deploy'), 'error'); return; }
  if ((G.battle.deployPool[type] || 0) <= 0) return;
  const { gx, gy } = getGridFromCanvas(px, py);
  const td = TROOPS[type];
  G.battle.troops.push({
    id: genId(), type, x: gx, y: gy,
    hp: td.hp, maxHp: td.hp, target: null, atkTimer: 0, alive: true
  });
  G.battle.deployPool[type]--;
  G.battle.phase = 'fight';
  const poolEl = gel('pool-' + type);
  if (poolEl) poolEl.textContent = G.battle.deployPool[type];
  if (G.battle.deployPool[type] <= 0) {
    gel('deploy-' + type)?.setAttribute('disabled', '');
  }
}

function battleTick() {
  const bs = G.battle; if (!bs || bs.phase === 'end') return;

  // Move troops & attack
  for (const t of bs.troops) {
    if (!t.alive) continue;
    const td = TROOPS[t.type];

    // Find/validate target
    if (!t.target || !bs.buildings.find(b => b.id === t.target && b.alive)) {
      t.target = findTarget(t, bs.buildings, td.priority);
    }
    if (!t.target) continue;

    const tb = bs.buildings.find(b => b.id === t.target);
    if (!tb || !tb.alive) { t.target = null; continue; }

    const bsz = BUILDINGS[tb.type]?.size || 1;
    const tx  = tb.x + bsz / 2, ty = tb.y + bsz / 2;
    const dx  = tx - t.x, dy   = ty - t.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Atualiza o ângulo da tropa (especialmente importante para o Tank)
    if (dist > 0.01) {
      t.angle = Math.atan2(dy, dx);
    }
    const range = td.range || 1.5;

    if (dist > range) {
      const spd = (td.speed || 1) * 0.1;
      t.x += (dx / dist) * spd;
      t.y += (dy / dist) * spd;
    } else {
      t.atkTimer--;
      if (t.atkTimer <= 0) {
        tb.curHp = Math.max(0, tb.curHp - td.damage);
        bs.projectiles.push({ x1:t.x, y1:t.y, x2:tx, y2:ty, life:5, color: td.color });
        if (tb.curHp <= 0) {
          tb.alive = false; bs.destroyed++;
          for (let i = 0; i < 15; i++)
            bs.explosions.push({ x: tx + (Math.random()-.5)*2, y: ty + (Math.random()-.5)*2,
              r: 8+Math.random()*16, life:18+Math.random()*8, maxLife:26,
              color: Math.random()>.5 ? '#FF8C00' : '#FFD700' });
        } else {
          bs.explosions.push({ x:tx, y:ty, r:5, life:5, maxLife:5, color:'#ff4444' });
        }
        t.atkTimer = 10;
      }
    }
  }

  // Defenses attack
  for (const b of bs.buildings) {
    if (!b.alive) continue;
    const def = BUILDINGS[b.type];
    if (!def?.isDefense) continue;
    const lvl = def.levels[b.level];
    if (!lvl?.damage) continue;
    b.atkTimer--;
    if (b.atkTimer <= 0) {
      const bsz = def.size || 1;
      const cx  = b.x + bsz/2, cy = b.y + bsz/2;
      let nearest = null, nearestD = Infinity;
      for (const t of bs.troops) {
        if (!t.alive) continue;
        const d = Math.hypot(t.x - cx, t.y - cy);
        if (d <= (lvl.range||3) && d < nearestD) { nearest = t; nearestD = d; }
      }
      if (nearest) {
        nearest.hp = Math.max(0, nearest.hp - lvl.damage);
        bs.projectiles.push({ x1:cx, y1:cy, x2:nearest.x, y2:nearest.y, life:5, color:'#ff4466' });
        if (nearest.hp <= 0) {
          nearest.alive = false;
          bs.explosions.push({ x:nearest.x, y:nearest.y, r:10, life:10, maxLife:10, color:'#00D4FF' });
        }
      }
      b.atkTimer = Math.max(3, Math.round(10 / (lvl.rate || 1)));
    }
  }

  // Decay effects
  bs.explosions  = bs.explosions.filter(e => (e.life--, e.life > 0));
  bs.projectiles = bs.projectiles.filter(p => (p.life--, p.life > 0));

  drawBattleFrame();
  gel('atk-pct').textContent = `💥 ${Math.round((bs.destroyed / bs.totalBld) * 100)}%`;
  
  // Atualiza HUD de saque em tempo real
  const lootLabel = gel('atk-label');
  if (lootLabel) {
    lootLabel.innerHTML = `⚔️ <span style="color:var(--c-mineral)">⛏️${fmtNum(bs.lootedMineral)}</span> <span style="color:var(--c-oxygen)">💨${fmtNum(bs.lootedOxygen)}</span>`;
  }

  if (bs.buildings.every(b => !b.alive)) endBattle();
}

function findTarget(troop, buildings, priority) {
  const alive = buildings.filter(b => b.alive);
  if (!alive.length) return null;
  let pool;
  if (priority === 'defense') {
    pool = alive.filter(b => BUILDINGS[b.type]?.isDefense);
    if (!pool.length) pool = alive;
  } else if (priority === 'resource') {
    pool = alive.filter(b => BUILDINGS[b.type]?.isResource);
    if (!pool.length) pool = alive;
  } else {
    pool = alive;
  }
  let best = null, bestD = Infinity;
  for (const b of pool) {
    const sz = BUILDINGS[b.type]?.size || 1;
    const d  = Math.hypot(b.x + sz/2 - troop.x, b.y + sz/2 - troop.y);
    if (d < bestD) { best = b; bestD = d; }
  }
  return best?.id || null;
}

function drawBattleFrame() {
  if (!bCtx || !G.battle) return;
  const bs = G.battle;
  const { scale, offX, offY, userZoom = 1 } = bs;
  const W = bCanvas.width, H = bCanvas.height;

  // Background
  bCtx.fillStyle = '#070912'; bCtx.fillRect(0, 0, W, H);

  bCtx.save();
  bCtx.translate(W/2, H/2);
  bCtx.scale(userZoom, userZoom);
  bCtx.translate(-W/2, -H/2);

  // Draw some stars in bg
  bCtx.fillStyle = 'rgba(255,255,255,0.6)';
  const starRng = mulberry32(99);
  for (let i = 0; i < 60; i++) {
    const sx = starRng() * W, sy = starRng() * H, sr = starRng() * 1.2 + 0.2;
    bCtx.beginPath(); bCtx.arc(sx, sy, sr, 0, Math.PI*2); bCtx.fill();
  }

  // Moon surface
  const surf = bCtx.createLinearGradient(offX, offY, offX + GRID_W*CELL_SIZE*scale, offY + GRID_H*CELL_SIZE*scale);
  surf.addColorStop(0, '#585868'); surf.addColorStop(1, '#3e3e50');
  bCtx.fillStyle = surf;
  bCtx.fillRect(offX, offY, GRID_W*CELL_SIZE*scale, GRID_H*CELL_SIZE*scale);

  // Grid lines
  bCtx.strokeStyle = 'rgba(100,100,140,0.18)'; bCtx.lineWidth = 0.5;
  for (let x = 0; x <= GRID_W; x++) { bCtx.beginPath(); bCtx.moveTo(offX+x*CELL_SIZE*scale,offY); bCtx.lineTo(offX+x*CELL_SIZE*scale,offY+GRID_H*CELL_SIZE*scale); bCtx.stroke(); }
  for (let y = 0; y <= GRID_H; y++) { bCtx.beginPath(); bCtx.moveTo(offX,offY+y*CELL_SIZE*scale); bCtx.lineTo(offX+GRID_W*CELL_SIZE*scale,offY+y*CELL_SIZE*scale); bCtx.stroke(); }

  function toScr(gx, gy) { return { x: offX + gx*CELL_SIZE*scale, y: offY + gy*CELL_SIZE*scale }; }

  // Buildings
  for (const b of bs.buildings) {
    const def = BUILDINGS[b.type]; if (!def) continue;
    const sz  = def.size || 1;
    const s   = toScr(b.x, b.y);
    const bw  = sz * CELL_SIZE * scale, bh = sz * CELL_SIZE * scale;

    if (!b.alive) {
      bCtx.fillStyle = 'rgba(80,40,20,0.65)';
      bCtx.fillRect(s.x+2, s.y+2, bw-4, bh-4);
      bCtx.fillStyle = 'rgba(120,60,30,0.45)';
      for (let i=0;i<4;i++) bCtx.fillRect(s.x+Math.random()*bw*.7, s.y+Math.random()*bh*.7, 7, 4);
      continue;
    }

    const img = bldImgCache[def.getAsset(b.level)];
    if (img?.complete && img.naturalWidth > 0) {
      bCtx.drawImage(img, s.x, s.y, bw, bh);
    } else {
      bCtx.fillStyle = def.isDefense ? '#8B2222' : def.isResource ? '#224488' : '#446688';
      bCtx.fillRect(s.x+2, s.y+2, bw-4, bh-4);
      bCtx.font = `${Math.round(14*scale)}px serif`;
      bCtx.textAlign = 'center'; bCtx.textBaseline = 'middle';
      bCtx.fillText(def.isDefense ? '🛡' : '🏗', s.x + bw/2, s.y + bh/2);
    }

    if (b.curHp < b.maxHp && b.alive) {
      const pct = Math.max(0, b.curHp / b.maxHp);
      bCtx.fillStyle = 'rgba(0,0,0,0.5)'; bCtx.fillRect(s.x, s.y-6, bw, 4);
      bCtx.fillStyle = pct > 0.5 ? '#44ff88' : pct > 0.2 ? '#ffd700' : '#ff4466';
      bCtx.fillRect(s.x, s.y-6, bw*pct, 4);
    }
  }

  // Troops
  for (const t of bs.troops) {
    if (!t.alive) continue;
    const td = TROOPS[t.type];
    const s  = toScr(t.x, t.y);
    const tr = (td.size || 0.4) * CELL_SIZE * scale;
    const img = troopImgCache[`${t.type}_sprite.png`];

    bCtx.save();
    bCtx.translate(s.x, s.y);
    
    // Rotação: apenas o Tank gira conforme o pedido
    if (t.type === 'tank' && t.angle !== undefined) {
      bCtx.rotate(t.angle + Math.PI/2); 
    }

    if (img && img.complete && img.naturalWidth > 0) {
      // Imagem estática simples
      bCtx.drawImage(img, -tr, -tr, tr*2, tr*2);
    } else {
      // Fallback visual se a imagem não carregar
      bCtx.beginPath(); bCtx.arc(0, 0, tr, 0, Math.PI*2);
      bCtx.fillStyle = td.color; bCtx.fill();
      bCtx.strokeStyle = 'rgba(0,0,0,0.5)'; bCtx.lineWidth = 1; bCtx.stroke();
    }
    bCtx.restore();

    // hp bar
    if (t.hp < t.maxHp) {
      const pct = Math.max(0, t.hp / t.maxHp);
      bCtx.fillStyle = 'rgba(0,0,0,0.5)'; bCtx.fillRect(s.x-tr, s.y-tr-8, tr*2, 4);
      bCtx.fillStyle = pct > 0.5 ? '#44ff88' : pct > 0.2 ? '#ffd700' : '#ff4466';
      bCtx.fillRect(s.x-tr, s.y-tr-8, (tr*2)*pct, 4);
    }
  }

  // Projectiles
  for (const p of bs.projectiles) {
    const s1 = toScr(p.x1, p.y1), s2 = toScr(p.x2, p.y2);
    bCtx.beginPath(); bCtx.moveTo(s1.x,s1.y); bCtx.lineTo(s2.x,s2.y);
    bCtx.strokeStyle = p.color; bCtx.lineWidth = 1.5;
    bCtx.globalAlpha = p.life / 5; bCtx.stroke(); bCtx.globalAlpha = 1;
  }

  // Explosions
  for (const ex of bs.explosions) {
    const s   = toScr(ex.x, ex.y);
    const pct = ex.life / ex.maxLife;
    bCtx.beginPath(); bCtx.arc(s.x, s.y, ex.r * scale * pct, 0, Math.PI*2);
    bCtx.fillStyle = ex.color; bCtx.globalAlpha = pct * 0.8; bCtx.fill(); bCtx.globalAlpha = 1;
  }

  bCtx.restore();
}

function tickBattleTimer() {
  if (!G.battle) return;
  const elapsed   = (Date.now() - G.battle.startTime) / 1000;
  const remaining = Math.max(0, G.battle.duration - elapsed);
  const el        = gel('atk-timer');
  if (el) {
    const m = Math.floor(remaining / 60), s = Math.floor(remaining % 60);
    el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    el.style.color = remaining < 30 ? '#ff4466' : 'var(--c-danger)';
  }
  if (remaining <= 0) endBattle();
}

async function endBattle() {
  const bs = G.battle;
  if (!bs || bs.phase === 'end') return;
  bs.phase = 'end';
  clearInterval(bInterval); clearInterval(bTimerInterval);
  bCanvas.removeEventListener('click', onBattleClick);
  bCanvas.removeEventListener('touchend', onBattleTouchEnd);

  const pct  = Math.round((bs.destroyed / bs.totalBld) * 100);
  const stars = pct >= 100 ? 3 : pct >= 50 ? 2 : pct > 0 ? 1 : 0;
  const won   = stars >= 1;

  // Trophy calculation
  const prevLeague = getLeague(G.base.trophies || 0);
  const tGain = won ? Math.floor(8 + pct / 8) : -5;
  G.base.trophies = Math.max(0, (G.base.trophies || 0) + tGain);
  const newLeague = getLeague(G.base.trophies || 0);

  // Saque final baseado no que foi destruído durante a batalha
  const stolenMin = bs.lootedMineral;
  const stolenOxy = bs.lootedOxygen;
  const blds = G.base.buildings || [];
  G.base.resources.mineral = Math.min(G.base.resources.mineral + stolenMin, getStorageCapacity(blds, 'mineral'));
  G.base.resources.oxygen  = Math.min(G.base.resources.oxygen  + stolenOxy, getStorageCapacity(blds, 'oxygen'));

  // Consume troops used
  for (const t of bs.troops) {
    G.base.troops[t.type] = Math.max(0, (G.base.troops[t.type] || 0) - 1);
  }

  // Deduct from opponent in Firebase
  let oppTrophyLoss = 0;
  if (won && G.db && bs.opponent.uid) {
    try {
      const oppRef = G.db.collection('colonies').doc(bs.opponent.uid);
      const oppDoc = await oppRef.get();
      if (oppDoc.exists) {
        const od = oppDoc.data();
        oppTrophyLoss = won ? Math.floor(8 + pct / 8) : 0;
        const newOppTrophies = Math.max(0, (od.trophies || 0) - oppTrophyLoss);
        const newOppMin = Math.max(0, (od.resources?.mineral || 0) - stolenMin);
        const newOppOxy = Math.max(0, (od.resources?.oxygen  || 0) - stolenOxy);
        // Apply shield to opponent
        const oppLeague  = getLeague(od.trophies || 0);
        const shieldMs   = oppLeague.shieldHours * 3600 * 1000;
        await oppRef.update({
          trophies: newOppTrophies,
          'resources.mineral': newOppMin,
          'resources.oxygen':  newOppOxy,
          shieldUntil: Date.now() + shieldMs
        });
      }
    } catch(e) { console.warn('Could not update opponent:', e); }
  }

  // League advancement gem reward (first time only)
  let leagueRewardStr = '';
  if (newLeague.id > prevLeague.id && newLeague.gemReward > 0) {
    if (!G.base.leaguesReached) G.base.leaguesReached = [];
    if (!G.base.leaguesReached.includes(newLeague.id)) {
      G.base.leaguesReached.push(newLeague.id);
      G.base.gems = (G.base.gems || 0) + newLeague.gemReward;
      leagueRewardStr = `<br>🎉 ${newLeague.emoji} ${newLeague.name}! +💎${newLeague.gemReward} gemas!`;
      setTimeout(() => notify(`🎉 Nova Liga: ${newLeague.emoji} ${newLeague.name}! +💎${newLeague.gemReward}`, 'success'), 2000);
    }
  }

  if (won) {
    G.base.totalWins = (G.base.totalWins || 0) + 1;
    G.base.winStreak = (G.base.winStreak || 0) + 1;
    G.base.totalDestroyed = (G.base.totalDestroyed || 0) + bs.destroyed;
    
    if (G.base.missions) {
      if (!G.base.missions.allProgress) G.base.missions.allProgress = {};
      MISSIONS.forEach(m => {
        if (m.type === 'attack_win') {
          G.base.missions.allProgress[m.id] = 1;
        }
        if (m.type === 'attack_win_total') {
          G.base.missions.allProgress[m.id] = G.base.totalWins;
        }
        if (m.type === 'win_streak') {
          G.base.missions.allProgress[m.id] = G.base.winStreak;
        }
        if (m.type === 'destroy_buildings_total') {
          G.base.missions.allProgress[m.id] = G.base.totalDestroyed;
        }
      });
    }
  } else {
    G.base.winStreak = 0; // Perdeu a sequência
  }

  await saveData();
  updateHUD();

  const starsStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  gel('result-stars').textContent = starsStr;
  gel('result-title').textContent = won ? 'VITÓRIA!' : 'DERROTA';
  gel('result-title').className   = 'result-title ' + (won ? 'win' : 'lose');
  gel('result-pct').textContent   = pct + '%';
  gel('result-details').innerHTML = `
    Destruídas: ${bs.destroyed}/${bs.totalBld}<br>
    🏆 Troféus: <span style="color:${tGain>=0?'#44FF88':'#FF4466'}">${tGain>0?'+':''}${tGain}</span> → ${G.base.trophies}
    ${won && oppTrophyLoss ? `<br>🏆 Oponente: <span style="color:#FF4466">-${oppTrophyLoss}</span>` : ''}
    ${stolenMin > 0 ? `<br>⛏️ +${fmtNum(stolenMin)} &nbsp; 💨 +${fmtNum(stolenOxy)}` : ''}
    ${leagueRewardStr}
  `;
  gel('battle-result').classList.add('visible');
}

function closeBattleResult() {
  gel('battle-result').classList.remove('visible');
  G.battle = null;
  switchScreen('game');
  updateHUD();
}

// ============================================================
// GEM SYSTEM & SHOP
// ============================================================
function speedUpBuilding(bId, cost) {
  if ((G.base.gems || 0) < cost) { 
    notify('Gemas insuficientes!', 'error'); 
    showPanel('shop'); 
    return; 
  }
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b) return;
  
  G.base.gems = (G.base.gems || 0) - cost;

  // If it was an upgrade in progress, complete it now
  if (b.upgradeFinish && b.upgradeFinish > Date.now()) {
    const nextLevel = b.level + 1;
    b.upgradeFinish = 0;
    finishUpgrade(bId, nextLevel);
  } else if (b.buildFinish && b.buildFinish > Date.now()) {
    b.buildFinish = 0;
    refreshBldEl(bId);
    notify('⚡ Construção concluída instantaneamente!', 'success');
  }
  
  updateHUD();
  saveData();
  hideBldPopup();
}

function speedUpTraining(finishTime, cost) {
  if ((G.base.gems || 0) < cost) { 
    notify('Gemas insuficientes!', 'error'); 
    showPanel('shop'); 
    return; 
  }
  const item = G.base.queue?.find(q => q.finishTime === finishTime);
  if (!item) return;
  
  G.base.gems -= cost;
  item.finishTime = Date.now();
  updateHUD();
  saveData();
  notify('⚡ Tropa pronta instantaneamente!', 'success');
}

function renderShopPanel() {
  const grid = gel('shop-grid');
  if (!grid) return;
  const items = [
    { gems: 100,  desc: 'Carga de Satélite', price: 'R$ 4,90',  icon: '💎' },
    { gems: 550,  desc: 'Pilha Lunar',      price: 'R$ 19,90', icon: '💎💎' },
    { gems: 1200, desc: 'Caixa de Orion',    price: 'R$ 39,90', icon: '📦' },
    { gems: 3000, desc: 'Recipiente Solar',  price: 'R$ 89,90', icon: '🚀' }
  ];
  grid.innerHTML = items.map(it => `
    <div class="shop-item">
      <div class="si-info">
        <span class="si-icon">${it.icon}</span>
        <div class="si-text">
          <span class="si-amount">${it.gems} Cristais Verdes</span>
          <span class="si-desc">${it.desc}</span>
        </div>
      </div>
      <button class="btn-buy" onclick="window.open('https://checkout.exemplo.com?gems=${it.gems}', '_blank')">${it.price}</button>
    </div>
  `).join('');
}

// ============================================================
// TUTORIAL
// ============================================================
function showTutorial() {
  const overlay = gel('tutorial-overlay');
  if (overlay) overlay.classList.add('visible');
}
function closeTutorial() {
  const overlay = gel('tutorial-overlay');
  if (overlay) overlay.classList.remove('visible');
  G.base.tutorialDone = true;
  saveData();
}

// ============================================================
// LABORATORY MODAL
// ============================================================
function showLabModal() {
  const ccLvl = getCurrentCCLevel();
  if (ccLvl < 3) { notify('O Laboratório requer CC nível 3!', 'error'); return; }
  const labLvl = getLaboratoryLevel(G.base.buildings);
  if (labLvl === 0) { notify('Construa e conclua o Laboratório primeiro!', 'error'); return; }

  const el = gel('lab-modal');
  if (!el) return;

  const body = gel('lab-modal-body');
  if (!body) return;

  const upgrades = G.base.troopUpgrades || {};
  let html = '';
  for (const [troopId, tDef] of Object.entries(TROOP_UPGRADES)) {
    const curLevel = upgrades[troopId] || 0;
    html += `<div class="lab-troop-section">
      <div class="lab-troop-title">${tDef.emoji} ${tDef.name}</div>`;
    for (const upg of tDef.upgrades) {
      const done = curLevel >= upg.level;
      const isNext = curLevel === upg.level - 1;
      const labOk = labLvl >= upg.labLevel;
      const canAfford = G.base.resources.energy >= upg.energyCost && G.base.resources.mineral >= upg.mineralCost;
      const locked = !labOk || (!done && !isNext);
      html += `<div class="lab-upg-row ${done ? 'done' : locked ? 'locked' : ''}">
        <div class="lab-upg-info">
          <span class="lab-upg-name">${upg.name} <span style="font-size:9px;color:#888">Nív.${upg.level}</span></span>
          <span class="lab-upg-desc">${upg.desc}</span>
          <span class="lab-upg-cost">⚡${fmtNum(upg.energyCost)} ⛏️${fmtNum(upg.mineralCost)}</span>
        </div>
        <div>
          ${done
            ? '<span class="lab-badge-done">✓ FEITO</span>'
            : locked
              ? `<span class="lab-badge-locked">🔒 Lab.${upg.labLevel}</span>`
              : `<button class="btn-lab-research" onclick="doLabResearch('${troopId}',${upg.level},${upg.energyCost},${upg.mineralCost})" ${!canAfford || !isNext ? 'disabled' : ''}>PESQUISAR</button>`
          }
        </div>
      </div>`;
    }
    html += '</div>';
  }
  body.innerHTML = html;
  el.classList.add('visible');
}

function closeLabModal() {
  gel('lab-modal')?.classList.remove('visible');
}

function doLabResearch(troopId, level, energyCost, mineralCost) {
  if (G.base.resources.energy < energyCost || G.base.resources.mineral < mineralCost) {
    notify('Recursos insuficientes!', 'error'); return;
  }
  if (!G.base.troopUpgrades) G.base.troopUpgrades = {};
  const cur = G.base.troopUpgrades[troopId] || 0;
  if (level !== cur + 1) { notify('Pesquise na ordem!', 'error'); return; }
  G.base.resources.energy  -= energyCost;
  G.base.resources.mineral -= mineralCost;
  G.base.troopUpgrades[troopId] = level;
  
  G.base.totalResearch = (G.base.totalResearch || 0) + 1;
  if (G.base.missions && G.base.missions.allProgress) {
    MISSIONS.forEach(m => {
      if (m.type === 'research_total') {
        G.base.missions.allProgress[m.id] = G.base.totalResearch;
      }
    });
  }

  updateHUD();
  saveData();
  notify(`✓ ${TROOP_UPGRADES[troopId].name} — ${TROOP_UPGRADES[troopId].upgrades[level-1].name} desbloqueado!`, 'success');
  showLabModal();
}

// ============================================================
// MAIN INIT
// ============================================================
async function init() {
  spawnLoginStars();
  setLoadProgress(10);

  await preloadAssets();
  preloadExtraAssets(); // Background load levels 2+
  
  const hasFirebase = initFirebase();
  setLoadProgress(35);

  if (!hasFirebase) {
    // Demo mode — no Firebase
    createStarterBase();
    G.base.playerName = 'Demo';
    buildTerrain();
    renderBuildingsLayer();
    initMapEvents();
    initMapZoom();
    setMapZoom(1.0);
    initBattleZoom();
    updateHUD();
    updateUILanguage();
    startTimers();
    setLoadProgress(100);
    setTimeout(() => {
      switchScreen('game');
      centerMap();
      notify('Modo demo: configure firebase-config.js para jogar online!', 'info');
      if (!G.base.tutorialDone) setTimeout(showTutorial, 800);
    }, 600);
    return;
  }

  G.auth.onAuthStateChanged(async user => {
    if (user) {
      G.user = user;
      G.pid  = user.uid;
      setLoadProgress(55);
      await loadData();
      G.base.ccLevel = getCurrentCCLevel();
      setLoadProgress(80);
      buildTerrain();
      renderBuildingsLayer();
      initMapEvents();
      initMapZoom();
      setMapZoom(1.0);
      initBattleZoom();
      updateHUD();
      startTimers();
      updateUILanguage();
      setLoadProgress(100);
      setTimeout(() => {
        switchScreen('game');
        centerMap();
        if (!G.base.tutorialDone) setTimeout(showTutorial, 800);
      }, 500);
    } else {
      updateUILanguage();
      setLoadProgress(100);
      setTimeout(() => switchScreen('login'), 400);
    }
  });
}

// ============================================================
// SOCIAL / CLAN SYSTEM
// ============================================================
let currentSocialTab = 'clan';
let clanUnsubscribe = null;

function showClanModal() {
  const modal = gel('clan-modal');
  if (!modal) return;
  modal.classList.add('visible');
  hideBldPopup();
  refreshSocialUI();
}

function closeClanModal() {
  gel('clan-modal')?.classList.remove('visible');
  if (clanUnsubscribe) { clanUnsubscribe(); clanUnsubscribe = null; }
}

function switchSocialTab(tab) {
  currentSocialTab = tab;
  document.querySelectorAll('.social-tab').forEach(t => t.classList.remove('active'));
  gel('tab-' + tab)?.classList.add('active');
  
  hide('social-content-clan');
  hide('social-content-search');
  hide('social-content-friends');
  show('social-content-' + tab);
  
  if (tab === 'friends') renderFriendsList();
}

async function refreshSocialUI() {
  if (!G.user) return;
  const clanId = G.base.clanId;
  if (clanId) {
    hide('clan-no-clan');
    show('clan-active');
    loadClanData(clanId);
  } else {
    show('clan-no-clan');
    hide('clan-active');
  }
}

async function createClan() {
  const name = gel('new-clan-name').value.trim();
  if (!name || name.length < 3) { notify('Nome muito curto!', 'error'); return; }
  
  if (!G.db) { notify('Modo demo: Firebase não configurado.', 'error'); return; }
  
  try {
    const clanRef = await G.db.collection('clans').add({
      name: name,
      owner: G.pid,
      members: [G.pid],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    G.base.clanId = clanRef.id;
    G.base.clanName = name;
    await saveData();
    notify(t('clan_created'), 'success');
    refreshSocialUI();
  } catch (e) { notify('Erro ao criar clã.', 'error'); }
}

async function loadClanData(clanId) {
  if (!G.db) return;
  gel('active-clan-name').textContent = G.base.clanName || 'Carregando...';
  
  // Real-time chat listener
  if (clanUnsubscribe) clanUnsubscribe();
  clanUnsubscribe = G.db.collection('clans').doc(clanId).collection('messages')
    .orderBy('time', 'desc').limit(30)
    .onSnapshot(snap => {
      const msgs = [];
      snap.forEach(doc => msgs.push(doc.data()));
      renderClanChat(msgs.reverse());
    });
}

function renderClanChat(msgs) {
  const box = gel('clan-chat-box');
  if (!box) return;
  box.innerHTML = msgs.map(m => `
    <div class="chat-msg ${m.senderId === G.pid ? 'mine' : 'other'}">
      <div class="chat-msg-sender">${m.senderName}</div>
      <div class="chat-msg-text">${m.text}</div>
    </div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}

async function sendClanMessage() {
  const input = gel('clan-chat-input');
  const text = input.value.trim();
  if (!text || !G.base.clanId || !G.db) return;
  
  try {
    await G.db.collection('clans').doc(G.base.clanId).collection('messages').add({
      senderId: G.pid,
      senderName: G.base.playerName,
      text: text,
      time: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
  } catch (e) { console.error(e); }
}

async function searchPlayers() {
  const query = gel('search-player-input').value.trim();
  if (!query || !G.db) return;
  
  const results = gel('player-search-results');
  results.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Buscando...</div>';
  
  try {
    // Basic search by exact name (Firestore limitation)
    const snap = await G.db.collection('users').where('base.playerName', '==', query).limit(10).get();
    let html = '';
    snap.forEach(doc => {
      const data = doc.data();
      const p = data.base;
      if (doc.id === G.pid) return;
      html += `
        <div class="social-item">
          <div class="social-item-info">
            <span class="social-item-name">${p.playerName}</span>
            <span class="social-item-sub">🏆 ${p.trophies || 0} · CC${p.ccLevel || 1}</span>
          </div>
          <div style="display:flex;gap:5px;">
            <button class="social-btn-small social-btn-visit" onclick="visitPlayer('${doc.id}')">${t('visit')}</button>
            <button class="social-btn-small social-btn-add" onclick="addFriend('${doc.id}', '${p.playerName}')">+</button>
          </div>
        </div>
      `;
    });
    results.innerHTML = html || `<div style="text-align:center;padding:20px;color:#888;">${t('no_results')}</div>`;
  } catch (e) { results.innerHTML = 'Erro na busca.'; }
}

async function visitPlayer(targetPid) {
  if (!G.db) return;
  notify(t('visiting_player').replace('{name}', ''), 'info');
  closeClanModal();
  
  try {
    const doc = await G.db.collection('users').doc(targetPid).get();
    if (doc.exists) {
      const data = doc.data();
      G.visiting = {
        pid: targetPid,
        base: data.base
      };
      enterVisitMode();
    }
  } catch (e) { notify('Erro ao visitar jogador.', 'error'); }
}

function enterVisitMode() {
  G.ui.screen = 'visit';
  // UI for visit mode (read only)
  gel('hud-top').style.display = 'none';
  gel('hud-bottom').style.display = 'none';
  gel('visit-controls').style.display = 'flex';
  
  // Redesenhar o mapa com a base do oponente
  buildTerrain();
  renderBuildingsLayer(G.visiting.base.buildings);
  centerMap();
}

function returnToHome() {
  G.visiting = null;
  G.ui.screen = 'game';
  gel('hud-top').style.display = 'flex';
  gel('hud-bottom').style.display = 'flex';
  gel('visit-controls').style.display = 'none';
  
  buildTerrain();
  renderBuildingsLayer();
  centerMap();
}

async function addFriend(fid, fname) {
  if (!G.base.friends) G.base.friends = [];
  if (G.base.friends.some(f => f.id === fid)) { notify('Já é seu amigo!', 'info'); return; }
  G.base.friends.push({ id: fid, name: fname });
  await saveData();
  notify(t('friend_added'), 'success');
}

function renderFriendsList() {
  const list = gel('friends-list');
  if (!list) return;
  const friends = G.base.friends || [];
  list.innerHTML = friends.map(f => `
    <div class="social-item">
      <div class="social-item-info">
        <span class="social-item-name">${f.name}</span>
      </div>
      <button class="social-btn-small social-btn-visit" onclick="visitPlayer('${f.id}')">${t('visit')}</button>
    </div>
  `).join('') || '<div style="text-align:center;padding:20px;color:#888;">Sua lista de amigos está vazia.</div>';
}

function centerMap() {
  const mc = gel('map-container');
  if (!mc) return;
  mc.scrollLeft = (GRID_W * CELL_SIZE - mc.clientWidth)  / 2;
  mc.scrollTop  = (GRID_H * CELL_SIZE - mc.clientHeight) / 2;
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
