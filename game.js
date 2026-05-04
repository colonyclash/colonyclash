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
  { id: 15, text: 'PESQUISAR 3 MELHORIAS DE TROPA NO LABORATÓRIO', goal: 3, type: 'research_total', reward: 30 },
  { id: 16, text: 'CONSTRUIR 1 ACAMPAMENTO', goal: 1, type: 'build', bldType: 'camp', reward: 1000, rewardType: 'mineral' },
  { id: 17, text: 'TREINAR 1 DRONE', goal: 1, type: 'train_troop', troop: 'drone', reward: 1000, rewardType: 'energy' },
  { id: 18, text: 'DESTRUIR 1 EDIFICIO ENEMIGO', goal: 1, type: 'destroy_buildings_total', reward: 1000, rewardType: 'mineral' },
  { id: 19, text: 'CONTRATAR O SEGUNDO ASTRONAUTA CONSTRUTOR', goal: 2, type: 'builders', reward: 20 }
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
  analytics: null,
  timers: { resource: null, save: null, queue: null }
};

let lastResourceTick = Date.now();

// ---- DOM Helpers ----
// DOM helpers now use game-config.js versions where possible, 
// but we keep the UI-specific ones here.
const gel   = id => document.getElementById(id);
const qsel  = s  => document.querySelector(s);
const show  = id => gel(id)?.classList.remove('hidden');
const hide  = id => gel(id)?.classList.add('hidden');

function notify(msg, type = 'info') {
  const stack = qsel('.notif-stack');
  if (!stack) return;

  // Stacking logic: find any active identical notification
  let existing = null;
  for (let i = 0; i < stack.children.length; i++) {
    const child = stack.children[i];
    if (child.dataset.msg === msg && child.dataset.type === type && child.style.opacity !== '0') {
      existing = child;
      break;
    }
  }

  if (existing) {
    let count = parseInt(existing.dataset.count || 1) + 1;
    existing.dataset.count = count;
    const content = existing.querySelector('.notif-content');
    if (content) {
      content.innerHTML = `${msg} <span style="margin-left: 8px; font-weight: 800; color: #fff; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 10px; font-size: 10px;">${count}x</span>`;
    }
    
    existing.style.transform = 'scale(1.05)';
    setTimeout(() => { if (existing) existing.style.transform = 'none'; }, 150);

    if (existing.notifTimeout) clearTimeout(existing.notifTimeout);
    existing.notifTimeout = setTimeout(() => {
      existing.style.opacity = '0';
      existing.style.transform = 'translateX(20px)';
      setTimeout(() => existing.remove(), 300);
    }, 4000);
    return;
  }

  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.dataset.msg = msg;
  el.dataset.type = type;
  el.dataset.count = 1;
  
  let icon = '🛰️';
  if (type === 'success') icon = '✅';
  if (type === 'error')   icon = '⚠️';
  if (type === 'info')    icon = 'ℹ️';

  el.innerHTML = `
    <div class="notif-icon">${icon}</div>
    <div class="notif-content">${msg}</div>
  `;
  
  stack.appendChild(el);
  
  el.notifTimeout = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 300);
  }, 4000);
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
    try {
      if (typeof firebase.analytics === 'function') {
        G.analytics = firebase.analytics();
      }
    } catch (ae) { console.warn('Analytics init skipped:', ae); }
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
    G.pid  = cred.user.uid;
    createStarterBase(); // Initialize with CC and default resources
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
    const doc = await G.db.collection('users').doc(G.pid).get();
    if (doc.exists) {
      const d = doc.data();
      // Deep merge of essential objects to avoid losing new fields
      G.base = {
        ...G.base,
        ...d,
        resources: { ...G.base.resources, ...(d.resources || {}) },
        missions:  { ...G.base.missions,  ...(d.missions || {}) },
        troops:    { ...G.base.troops,    ...(d.troops || {}) },
        troopUpgrades: { ...G.base.troopUpgrades, ...(d.troopUpgrades || {}) }
      };
      
      // Ensure all Progress exists
      if (!G.base.missions.allProgress) G.base.missions.allProgress = {};
      if (!G.base.missions.claimed) G.base.missions.claimed = [];
      
      processOfflineResources();
      processOfflineQueue();
      processOfflineBuildings();
      processOfflineObstacles();
      
      // Inicia o listener em tempo real após o carregamento inicial
      listenToUserData();
    } else {
      createStarterBase();
      await saveData();
      listenToUserData();
    }
  } catch (e) { console.error('Load failed:', e); createStarterBase(); }
}

function listenToUserData() {
  if (!G.db || !G.pid) return;
  if (window.userUnsubscribe) window.userUnsubscribe();
  
  window.userUnsubscribe = G.db.collection('users').doc(G.pid).onSnapshot(doc => {
    if (!doc.exists) return;
    const d = doc.data();
    
    // Atualiza apenas campos que podem ser alterados externamente (Admin)
    // para não interferir com a lógica local de construção/movimentação
    if (d.resources) {
      G.base.resources.mineral = d.resources.mineral !== undefined ? d.resources.mineral : G.base.resources.mineral;
      G.base.resources.oxygen = d.resources.oxygen !== undefined ? d.resources.oxygen : G.base.resources.oxygen;
      G.base.resources.energy = d.resources.energy !== undefined ? d.resources.energy : G.base.resources.energy;
    }
    if (d.gems !== undefined) G.base.gems = d.gems;
    if (d.trophies !== undefined) G.base.trophies = d.trophies;
    if (d.troops) G.base.troops = { ...G.base.troops, ...d.troops };
    
    updateHUD();
  }, err => console.warn('User listener error:', err));
}

function sanitizeForFirestore(obj) {
  const clean = {};
  Object.keys(obj).forEach(key => {
    const v = obj[key];
    if (v === undefined) return;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      clean[key] = sanitizeForFirestore(v);
    } else if (Array.isArray(v)) {
      clean[key] = v.map(item => (typeof item === 'object' && item !== null) ? sanitizeForFirestore(item) : item);
    } else {
      clean[key] = v;
    }
  });
  return clean;
}

async function saveData() {
  if (!G.pid || !G.db) return;
  checkMissionProgress();
  try {
    G.base.lastSave = Date.now();
    const dataToSave = sanitizeForFirestore({
      ...G.base,
      playerName: G.user?.displayName || G.base.playerName || 'Colono',
      uid: G.pid,
      photoURL: G.user?.photoURL || null,
      updatedAt: Date.now()
    });
    
    await G.db.collection('users').doc(G.pid).set(dataToSave);
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
    resources: { mineral: 1500, oxygen: 1000, energy: 500 },
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
    tutorialStep: 0,
    tutorialTroopCount: 0,
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
      notify(`Offline ${fmtTime(elapsed)}: +${fmtNum(gain.mineral)} <img src="mineral_icon.svg" class="inline-icon">  +${fmtNum(gain.oxygen)} <img src="oxygen_icon.svg" class="inline-icon">`, 'success'),
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
        const bld = G.base.buildings.find(x => x.id === bId);
        if (bld) { bld.buildFinish = 0; refreshBldEl(bId); notify(`${t(bld.type)} ${t('ready')}!`, 'success'); saveData(); }
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
    if (b.removing && b.removeFinish && b.removeFinish <= now) {
      finishObstacleRemoval(b.id);
    }
    if (b.removing && b.removeFinish && b.removeFinish > now) {
      const rem = b.removeFinish - now;
      const bId = b.id;
      setTimeout(() => finishObstacleRemoval(bId), rem);
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
  const maxLvl = BUILDINGS.command_center.maxLevel;
  if (cc && cc.level < maxLvl) {
    cc.level = maxLvl;
    G.base.ccLevel = maxLvl;
    const lvlData = BUILDINGS.command_center.levels[maxLvl];
    cc.maxHp = lvlData.hp; cc.hp = lvlData.hp;
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
    const docRef = G.db.collection('users').doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) { notify('Jogador não encontrado', 'error'); return; }
    const d = doc.data();
    
    const updateData = {};
    if (type === 'trophies') {
      updateData.trophies = (d.trophies || 0) + amt;
    } else if (type === 'gems') {
      updateData.gems = (d.gems || 0) + amt;
    } else if (type === 'tank') {
      const currentTanks = (d.troops?.tank || 0) + amt;
      updateData['troops.tank'] = currentTanks;
    } else {
      // Recursos básicos (mineral, oxygen, energy)
      const currentRes = (d.resources?.[type] || 0) + amt;
      updateData[`resources.${type}`] = currentRes;
    }

    await docRef.update(updateData);
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
  
  const costs = { 1: 50, 2: 500, 3: 1000 };
  const cost = costs[current];
  
  const modal = gel('upgrade-modal');
  gel('modal-icon').innerHTML  = '<img src="astronaut_builder.svg" class="inline-icon">';
  gel('modal-title').textContent = 'Contratar Astronauta Construtor';
  gel('modal-desc').textContent  = `Deseja contratar mais um astronauta para realizar construções simultâneas?\nAtual: ${current} | Novo: ${current + 1}`;
  
  const costsEl = gel('modal-costs');
  const affordable = (G.base.gems || 0) >= cost;
  costsEl.innerHTML = `<span class="modal-cost-item" style="color:${affordable ? 'var(--c-gem)' : 'var(--c-danger)'}"><img src="gems_icon.svg" class="inline-icon"> ${cost}</span>`;
  
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
  const currentRocks = (G.base.buildings || []).filter(b => b.type === 'lunar_rock').length;
  if (currentRocks >= 10) return;

  const interval = 8 * 3600 * 1000; // 8 horas em ms
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
  
  setTimeout(() => finishObstacleRemoval(bId), 10000);
}

function finishObstacleRemoval(bId) {
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b || b.type !== 'lunar_rock') return;

  const rewards = [
    { type: 'mineral', amt: 100, weight: 25 },
    { type: 'mineral', amt: 200, weight: 10 },
    { type: 'oxygen',  amt: 100, weight: 20 },
    { type: 'oxygen',  amt: 200, weight: 10 },
    { type: 'gems',    amt: 1,   weight: 20 },
    { type: 'gems',    amt: 3,   weight: 10 },
    { type: 'gems',    amt: 5,   weight: 5 },
  ];
  
  // Sistema de Piedade: Garante gemas a cada 3 rochas removidas
  const rocksRemoved = G.base.totalObstaclesRemoved || 0;
  const forceGems = (rocksRemoved + 1) % 3 === 0;

  let reward;
  if (forceGems) {
    const gemRewards = rewards.filter(r => r.type === 'gems');
    const totalW = gemRewards.reduce((a, c) => a + c.weight, 0);
    let r = Math.random() * totalW;
    reward = gemRewards[0];
    for (const rw of gemRewards) {
      r -= rw.weight;
      if (r <= 0) { reward = rw; break; }
    }
  } else {
    const totalW = rewards.reduce((a, c) => a + c.weight, 0);
    let r = Math.random() * totalW;
    reward = rewards[0];
    for (const rw of rewards) {
      r -= rw.weight;
      if (r <= 0) { reward = rw; break; }
    }
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
  ['drone', 'robot', 'tank'].forEach(t => essential.push(`${t}_sprite.png`));
  essential.push('star_warrior.png');
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
      // Corrigido: Guerreiro Estelar e sprites de tropas vão para o cache de tropas
      if (src.includes('sprite') || src.includes('star_warrior')) troopImgCache[src] = img;
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

function renderBuildingsLayer(externalBuildings) {
  bldLayer = gel('buildings-layer');
  if (!bldLayer) return;
  bldLayer.innerHTML = '';
  bldLayer.style.width  = (GRID_W * CELL_SIZE) + 'px';
  bldLayer.style.height = (GRID_H * CELL_SIZE) + 'px';
  const blds = externalBuildings || G.base.buildings || [];
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

  const pw = 260; // Largura do popup modernizado
  const ph = 300; // Altura estimada
  let left = cx + 12;
  if (left + pw > window.innerWidth - 8) left = cx - pw - 12;
  if (left < 8) left = 8;

  let top = cy + 10;
  if (top + ph > window.innerHeight - 8) top = cy - ph - 10;
  if (top < 70) top = 70; // Espaço para o HUD superior

  popup.style.left = left + 'px';
  popup.style.top  = top + 'px';

  advanceTutorialIf(4);

  gel('popup-img').src   = def.getAsset(b.level, b.id);
  
  // Atualiza nome mantendo o botão (i)
  const nameEl = gel('popup-name');
  nameEl.innerHTML = `${t(b.type)} <button id="popup-info-btn" class="info-circle-btn">i</button>`;
  gel('popup-info-btn').onclick = (e) => { 
    e.stopPropagation(); 
    if (b.type === 'command_center') showCCPath();
    else showBuildingDetails(bId); 
  };

  const hpPct = Math.round(((b.hp || b.maxHp) / b.maxHp) * 100);
  gel('popup-hp-fill').style.width = hpPct + '%';
  gel('popup-hp-fill').style.background = hpPct > 60 ? '#44FF88' : hpPct > 30 ? '#FFCC00' : '#FF4466';

  let desc = t(b.type + '_desc') || '';
  if (b.buildFinish && b.buildFinish > Date.now()) {
    desc = '🔨 ' + t('building') + '... ' + fmtTime((b.buildFinish - Date.now()) / 1000);
  } else if (b.upgradeFinish && b.upgradeFinish > Date.now()) {
    desc = '⚡ ' + t('upgrading') + '... ' + fmtTime((b.upgradeFinish - Date.now()) / 1000);
  } else if (def.isResource && lvl.production) {
    const icon = { mineral: '<img src="mineral_icon.svg" class="inline-icon">', oxygen: '<img src="oxygen_icon.svg" class="inline-icon">', energy: '<img src="energy_icon.svg" class="inline-icon">' }[def.resourceType] || '';
    desc += `\n${icon} +${lvl.production}/min`;
  } else if (b.type === 'camp') {
    desc += `\n${t('capacity')}: ${lvl.capacity}`;
  } else if (b.type === 'lunar_rock' && b.removing) {
    desc = '🔨 Removendo... ' + fmtTime((b.removeFinish - Date.now()) / 1000);
  }
  gel('popup-desc').textContent = desc;

  const lvlEl = gel('popup-level');
  const themes = { 1: t('ferro'), 2: t('energy'), 3: t('ouro'), 4: t('platina') };
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
  const labBtn = gel('popup-lab');
  
  const profileBtn = gel('popup-profile');
  if (b.type === 'command_center' && !bldInProgress(b)) {
    profileBtn.style.display = 'block';
    profileBtn.onclick = () => { hideBldPopup(); openUnifiedModal('profile'); };
  } else {
    profileBtn.style.display = 'none';
  }

  if (b.type === 'clan_tower' && !bldInProgress(b)) {
    clanBtn.style.display = 'block';
    clanBtn.onclick = () => { 
      if (!canAccessClans()) {
        notify('Melhore seu CC para o Nível 4 para liberar as funções de clã!', 'error');
        return;
      }
      hideBldPopup(); 
      openUnifiedModal('clan'); 
    };
  } else {
    clanBtn.style.display = 'none';
  }

  if (b.type === 'laboratory' && !bldInProgress(b)) {
    labBtn.style.display = 'block';
    labBtn.onclick = () => { hideBldPopup(); showLabModal(); };
  } else {
    labBtn.style.display = 'none';
  }
  const inProgress = bldInProgress(b);
  const isUpgrading = b.upgradeFinish > Date.now();

  speedBtn.style.display = inProgress ? 'flex' : 'none';
  cancelBtn.style.display = isUpgrading ? 'block' : 'none';

  if (inProgress) {
    const finish = b.buildFinish > Date.now() ? b.buildFinish : b.upgradeFinish;
    const remSeconds = (finish - Date.now()) / 1000;
    const gemCost = Math.max(1, Math.ceil(remSeconds / 60));
    speedBtn.innerHTML = `<img src="energy_icon.svg" class="inline-icon"> ACELERAR <span style="background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px;margin-left:5px"><img src="gems_icon.svg" class="inline-icon"> ${gemCost}</span>`;
    speedBtn.onclick = () => { speedUpBuilding(bId, gemCost); };
    
    if (isUpgrading) {
      cancelBtn.onclick = () => cancelUpgrade(bId);
    }
  }

  const moveBtn = gel('popup-move');
  moveBtn.onclick = () => { enterMoveMode(bId); };

  const delBtn = gel('popup-destroy');
  if (def.isObstacle) {
    delBtn.style.display = 'block';
    delBtn.innerHTML = `🗑️ Remover (100 <img src="mineral_icon.svg" class="inline-icon">)`;
    delBtn.onclick = () => removeObstacle(bId);
    moveBtn.style.display = 'none';
  } else {
    delBtn.style.display = 'none';
  }
}

function hideBldPopup() {
  gel('building-popup').classList.remove('visible');
  G.ui.selectedBldId = null;
}

function showBuildingDetails(bId) {
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b) return;
  const def = BUILDINGS[b.type];
  const lvl = def.levels[b.level];
  
  let html = `<ul style="list-style:none; padding:0; margin:0;">`;
  html += `<li style="margin-bottom:8px;">❤️ <b>${t('hp')}:</b> ${b.hp || lvl.hp} / ${lvl.hp}</li>`;
  
  if (def.isResource) {
    const resNames = { mineral: t('mineral'), oxygen: t('oxygen'), energy: t('energy') };
    html += `<li style="margin-bottom:8px;"><img src="${def.resourceType === 'oxygen' ? 'oxygen_icon.svg' : (def.resourceType === 'energy' ? 'energy_icon.svg' : 'mineral_icon.svg')}" class="inline-icon"> <b>${t('production')}:</b> ${lvl.production}/min (${resNames[def.resourceType]})</li>`;
  }
  if (def.isDefense) {
    html += `<li style="margin-bottom:8px;">⚔️ <b>${t('damage')}:</b> ${lvl.damage}</li>`;
    html += `<li style="margin-bottom:8px;">📏 <b>${t('range')}:</b> ${lvl.range}</li>`;
    html += `<li style="margin-bottom:8px;">⏱️ <b>Rate:</b> ${lvl.rate}s</li>`;
  }
  if (b.type === 'camp') {
    html += `<li style="margin-bottom:8px;">🏕️ <b>${t('capacity')}:</b> ${lvl.capacity}</li>`;
  }
  if (b.type === 'barracks') {
    const troops = lvl.availableTroops.map(tid => t(tid)).join(', ');
    html += `<li style="margin-bottom:8px;">🪖 <b>Desbloqueia:</b> ${troops}</li>`;
  }
  html += `</ul>`;
  
  gel('info-modal-title').textContent = t(b.type);
  gel('info-modal-desc').innerHTML = html;
  gel('info-modal').classList.add('visible');
}

// ============================================================
// UPGRADE SYSTEM
// ============================================================
function showUpgradeModal(bId) {
  hideBldPopup();
  const b = G.base.buildings.find(x => x.id === bId);
  if (!b) return;
  const def     = BUILDINGS[b.type];
  const nextLv  = b.level + 1;
  const nextLvl = def.levels[nextLv];
  if (!nextLvl) return;

  gel('modal-icon').textContent  = '⬆️';
  gel('modal-title').textContent = `${t('upgrade')} ${t(b.type)}`;
  let timeStr = nextLvl.buildTime > 0 ? ` · ${fmtTime(nextLvl.buildTime)}` : '';
  
  const curLvl = def.levels[b.level];
  let statsHtml = '';
  const compareStats = (label, cur, next, icon) => {
    if (next !== undefined && next !== cur) {
      statsHtml += `<div style="margin-bottom:4px;">${icon} ${label}: ${cur} → <span style="color:#44FF88; font-weight:bold;">${next}</span></div>`;
    }
  };

  compareStats(t('hp'), curLvl.hp, nextLvl.hp, '❤️');
  if (def.isResource) compareStats(t('production'), curLvl.production, nextLvl.production, '💎');
  if (def.isDefense) {
    compareStats(t('damage'), curLvl.damage, nextLvl.damage, '⚔️');
    compareStats(t('range'), curLvl.range, nextLvl.range, '📏');
  }
  if (b.type === 'camp') compareStats(t('capacity'), curLvl.capacity, nextLvl.capacity, '🏕️');

  let descHtml = `${t('level')} ${b.level} → ${nextLv}${timeStr}`;
  if (statsHtml) {
    descHtml += `<div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.3); border-radius:10px; border:1px solid rgba(255,255,255,0.05); text-align:left;">${statsHtml}</div>`;
  } else {
    descHtml += `<br>${t(b.type + '_desc')}`;
  }
  gel('modal-desc').innerHTML = descHtml;

  const costsEl = gel('modal-costs');
  costsEl.innerHTML = '';
  if (nextLvl.cost?.mineral > 0) {
    const affordable = G.base.resources.mineral >= nextLvl.cost.mineral;
    costsEl.innerHTML += `<span class="modal-cost-item" style="color:${affordable ? '#7EC8E3' : '#FF4466'}"><img src="mineral_icon.svg" class="inline-icon"> ${fmtNum(nextLvl.cost.mineral)}</span>`;
  }
  if (nextLvl.cost?.oxygen > 0) {
    const affordable = G.base.resources.oxygen >= nextLvl.cost.oxygen;
    costsEl.innerHTML += `<span class="modal-cost-item" style="color:${affordable ? '#78E89C' : '#FF4466'}"><img src="oxygen_icon.svg" class="inline-icon"> ${fmtNum(nextLvl.cost.oxygen)}</span>`;
  }
  if (nextLvl.cost?.energy > 0) {
    const affordable = G.base.resources.energy >= nextLvl.cost.energy;
    costsEl.innerHTML += `<span class="modal-cost-item" style="color:${affordable ? '#FFE55C' : '#FF4466'}"><img src="energy_icon.svg" class="inline-icon"> ${fmtNum(nextLvl.cost.energy)}</span>`;
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

  if (type === 'mineral_extractor') advanceTutorialIf(2);
  if (type === 'oxygen_extractor')  advanceTutorialIf(7);
  if (type === 'barracks')          advanceTutorialIf(17);
  if (type === 'camp')              advanceTutorialIf(20);

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
    setTimeout(() => {
      const bld = G.base.buildings.find(x => x.id === nb.id);
      if (bld && bld.buildFinish === 0) return; // already sped up
      nb.buildFinish = 0;
      refreshBldEl(nb.id);
      notify(`${t(buildType)} ${t('ready')}!`, 'success');
      saveData();
    }, lvl1.buildTime * 1000);
  }
  spawnBldEl(nb);
  exitBuildMode();
  updateHUD();
  saveData();
  if (buildType === 'mineral_extractor') advanceTutorialIf(3);
  if (buildType === 'oxygen_extractor')  advanceTutorialIf(8);
  if (buildType === 'barracks')          advanceTutorialIf(11);
  if (buildType === 'camp')              advanceTutorialIf(14);
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
  window.addEventListener('mouseup', () => {
    dragging = false;
  });
  mc.addEventListener('mouseup', e => {
    if (!moved) {
      if (G.ui.buildMode || G.ui.moveMode) confirmPlace();
      else hideBldPopup();
      updateTutorialStep(); // Checa avanço após ação no mapa
    }
  });

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

  const applyZoom = () => {
    const bs = G.battle;
    if (!bs || !bCanvas) return;
    bs.scale = bs.baseScale * bs.userZoom;
    bs.offX = (bCanvas.width - GRID_W * CELL_SIZE * bs.scale) / 2;
    bs.offY = (bCanvas.height - GRID_H * CELL_SIZE * bs.scale) / 2;
    drawBattleFrame();
  };

  atk.addEventListener('wheel', e => {
    e.preventDefault();
    if (!G.battle) return;
    G.battle.userZoom = Math.min(3, Math.max(0.5, (G.battle.userZoom || 1) * (e.deltaY < 0 ? 1.1 : 0.9)));
    applyZoom();
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
      G.battle.userZoom = Math.min(3, Math.max(0.5, (G.battle.userZoom || 1) * (dist / lastDist)));
      lastDist = dist;
      applyZoom();
    }
  }, { passive: false });

  atk.addEventListener('touchend', () => { lastDist = null; });
}

function updateHUD() {
  const r = G.base.resources || {};
  const blds = G.base.buildings || [];
  
  const caps = {
    mineral: getStorageCapacity(blds, 'mineral'),
    oxygen: getStorageCapacity(blds, 'oxygen'),
    energy: getStorageCapacity(blds, 'energy'),
    gem: 5000 // Just for visual scale
  };

  gel('hud-mineral').textContent  = fmtNum(r.mineral);
  gel('hud-oxygen').textContent   = fmtNum(r.oxygen);
  gel('hud-energy').textContent   = fmtNum(r.energy);
  gel('hud-gems').textContent     = fmtNum(G.base.gems || 0);
  gel('hud-trophies').textContent = G.base.trophies || 0;

  // Update Bar Fills
  ['mineral', 'oxygen', 'energy', 'gems'].forEach(type => {
    const val = type === 'gems' ? (G.base.gems || 0) : (r[type] || 0);
    const cap = type === 'gems' ? caps.gem : caps[type];
    const pct = Math.min(100, (val / cap) * 100);
    const fillEl = gel(`hud-${type}-fill`);
    if (fillEl) fillEl.style.width = `${pct}%`;
  });

  const name = G.base.playerName || t('colono');
  gel('hud-name').textContent  = name;
  gel('hud-cc').textContent    = `CC ${t('level')} ${getCurrentCCLevel()}`;
  gel('hud-avatar').textContent = name[0]?.toUpperCase() || 'C';
  
  const league = getLeague(G.base.trophies || 0);
  const lb = gel('hud-league');
  if (lb) { 
    lb.innerHTML = `${league.emoji} <span data-t="${league.name.toLowerCase()}">${t(league.name.toLowerCase())}</span>`; 
    lb.style.color = league.color; 
  }

  const shieldEl = gel('hud-shield');
  if (shieldEl) {
    const shieldActive = G.base.shieldUntil && G.base.shieldUntil > Date.now();
    shieldEl.style.display = shieldActive ? 'flex' : 'none';
    if (shieldActive) {
      const rem = Math.ceil((G.base.shieldUntil - Date.now()) / 3600000);
      shieldEl.innerHTML = `🛡️ ${rem}h`;
    }
  }

  const bldEl = gel('hud-builders');
  if (bldEl) {
    bldEl.textContent = `${getBuildersInUse()} / ${getTotalBuilders()}`;
    // No longer updating parent color here as it's a bar now
  }

  // Update Mission Badge
  const missionBadge = gel('mission-badge');
  if (missionBadge && G.base.missions) {
    let pendingCount = 0;
    MISSIONS.forEach(m => {
      const prog = G.base.missions.allProgress[m.id] || 0;
      const isDone = prog >= m.goal;
      const isClaimed = G.base.missions.claimed.includes(m.id);
      if (isDone && !isClaimed) pendingCount++;
    });
    if (pendingCount > 0) {
      missionBadge.textContent = pendingCount;
      missionBadge.style.display = 'flex';
    } else {
      missionBadge.style.display = 'none';
    }
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
  if (name === 'info' || name === 'social') {
    closePanels();
    openUnifiedModal(name === 'info' ? 'profile' : 'social');
    return;
  }
  if (G.ui.panel === name) { closePanels(); return; }
  closePanels();
  G.ui.panel = name;
  gel('panel-overlay').classList.add('active');
  gel(name + '-panel')?.classList.add('visible');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  gel('nav-' + name)?.classList.add('active');

  if (name === 'build') {
    renderBuildPanel();
    advanceTutorialIf(1);
    advanceTutorialIf(6);
    advanceTutorialIf(9);
    advanceTutorialIf(12);
  }
  if (name === 'troops') {
    renderTroopsPanel();
    advanceTutorialIf(15);
  }
  if (name === 'mission') renderMissionPanel();
  
  updateTutorialStep(); // Checa avanço automático
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
    'mineral_storage','oxygen_storage','energy_storage','clan_tower'
  ];

  for (const type of order) {
    const def  = BUILDINGS[type]; if (!def) continue;
    const max  = unlocks[type] || 0;
    const cur  = getBuildingCountOfType(type);
    const lv1  = def.levels[1];
    const locked = max === 0;

    const card = document.createElement('div');
    card.className = 'build-card-new' + (locked ? ' locked' : '');
    card.dataset.type = type;
    
    const costVal = lv1.cost.mineral || lv1.cost.oxygen || 0;
    const costIcon = lv1.cost.mineral !== undefined ? '<img src="mineral_icon.svg" class="inline-icon">' : '<img src="oxygen_icon.svg" class="inline-icon">';

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
      card.onclick = () => notify(`Desbloqueie melhorando o Centro de Comando para CC${Math.max(3, ccLvl + 1)}!`, 'info');
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
      (tab === 'shield' && i === 3) ||
      (tab === 'builders' && i === 4)
    );
  });
  
  const head = gel('build-panel-head');
  if (head) head.style.display = tab === 'all' ? 'block' : 'none';

  if (tab === 'all') renderBuildPanel();
  else if (tab === 'shop') renderShopTab();
  else if (tab === 'res') renderResourcesTab();
  else if (tab === 'shield') renderShieldTab();
  else if (tab === 'builders') renderBuildersTab();
};

function renderBuildersTab() {
  const grid = gel('build-panel-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const current = getTotalBuilders();
  if (current >= 4) {
    grid.innerHTML = `<div style="grid-column: 1/-1; color:#fff; text-align:center; padding:20px; font-family:var(--font-hd); font-size:12px;">${t('max_builders_reached')}</div>`;
    return;
  }
  
  const costs = { 1: 50, 2: 500, 3: 1000 };
  const cost = costs[current];
  const affordable = (G.base.gems || 0) >= cost;

  const card = document.createElement('div');
  card.className = 'build-card-new';
  card.innerHTML = `
    <div class="bn-title">Astronauta Construtor</div>
    <img src="astronaut_builder.svg" style="width:50px;height:50px;margin:15px 0">
    <div class="bn-desc" style="font-size:10px; color:#888; text-align:center; margin-bottom:10px;">
      Contrate mais um astronauta para construir e melhorar edifícios simultaneamente.
    </div>
    <div class="bn-cost-bar" style="background:${affordable ? '#2ecc71' : '#e74c3c'}">
      <span class="bn-cost-icon"><img src="gems_icon.svg" class="inline-icon"></span>
      <span class="bn-cost-val">${cost}</span>
    </div>
  `;
  
  card.onclick = () => {
    if (!affordable) {
      notify(t('not_enough_gems'), 'error');
      return;
    }
    showBuildersModal();
  };
  grid.appendChild(card);
}


function renderShopTab() {
  const grid = gel('build-panel-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const packages = [
    { name: 'Punhado de Gemas', gems: 100, price: 'R$ 4,90', icon: '<img src="gems_icon.svg" class="inline-icon">' },
    { name: 'Pilha de Gemas', gems: 500, price: 'R$ 19,90', icon: '<img src="gems_icon.svg" class="inline-icon">' },
    { name: 'Caixa de Gemas', gems: 1200, price: 'R$ 39,90', icon: '<img src="gems_icon.svg" class="inline-icon">' }
  ];

  packages.forEach(pkg => {
    const card = document.createElement('div');
    card.className = 'build-card-new';
    card.innerHTML = `
      <div class="bn-title">${pkg.name}</div>
      <div style="font-size:40px;margin:15px 0">${pkg.icon}</div>
      <div class="bn-count" style="bottom:50px; right:auto; width:100%; text-align:center;">${pkg.gems} <img src="gems_icon.svg" class="inline-icon"></div>
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
    { name: 'Minérios', amount: 10000, cost: 50, icon: '<img src="mineral_icon.svg" class="inline-icon">', type: 'mineral' },
    { name: 'Oxigênio', amount: 10000, cost: 50, icon: '<img src="oxygen_icon.svg" class="inline-icon">', type: 'oxygen' },
    { name: 'Energia',  amount: 5000,  cost: 50, icon: '<img src="energy_icon.svg" class="inline-icon">', type: 'energy' }
  ];

  offers.forEach(off => {
    const card = document.createElement('div');
    card.className = 'build-card-new';
    card.innerHTML = `
      <div class="bn-title">${off.name}</div>
      <div style="font-size:40px;margin:15px 0">${off.icon}</div>
      <div class="bn-count" style="bottom:50px; right:auto; width:100%; text-align:center;">+${fmtNum(off.amount)}</div>
      <div class="bn-cost-bar">
        <span class="bn-cost-val">${off.cost} <img src="gems_icon.svg" class="inline-icon"></span>
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
        <span class="bn-cost-val">${s.cost} <img src="gems_icon.svg" class="inline-icon"></span>
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
  
  // Sort missions: Done & !Claimed first, then !Done, then Claimed
  const sortedMissions = [...MISSIONS].sort((a, b) => {
    const progA = G.base.missions.allProgress[a.id] || 0;
    const isDoneA = progA >= a.goal;
    const isClaimedA = G.base.missions.claimed.includes(a.id);
    
    const progB = G.base.missions.allProgress[b.id] || 0;
    const isDoneB = progB >= b.goal;
    const isClaimedB = G.base.missions.claimed.includes(b.id);
    
    if (isDoneA && !isClaimedA && !(isDoneB && !isClaimedB)) return -1;
    if (!(isDoneA && !isClaimedA) && isDoneB && !isClaimedB) return 1;
    if (!isClaimedA && isClaimedB) return -1;
    if (isClaimedA && !isClaimedB) return 1;
    return a.id - b.id;
  });

  sortedMissions.forEach(m => {
    const prog = G.base.missions.allProgress[m.id] || 0;
    const isDone = prog >= m.goal;
    const pct = Math.min(100, Math.floor((prog / m.goal) * 100));
    const isClaimed = G.base.missions.claimed.includes(m.id);
    
    if (!isClaimed) hasPending = true;

    html += `
      <div class="${isClaimed ? 'mission-card-next' : 'mission-box-current'}" style="${isClaimed ? 'opacity: 0.7; border-color: #444;' : ''}">
        ${isDone && !isClaimed ? `<div class="mission-badge" style="background:#00D215; animation: pulse-green 2s infinite;">${t('ready') || 'PRONTO'}</div>` : ''}
        <div class="mission-flex">
          <div class="mission-info">
            <div class="mission-text">${t('mission_' + m.id)}</div>
            <div class="mission-reward-label">
              ${t('earn_reward')} ${m.reward} <img src="${m.rewardType === 'mineral' ? 'mineral_icon.svg' : m.rewardType === 'energy' ? 'energy_icon.svg' : 'gems_icon.svg'}" class="inline-icon">
            </div>
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
            ${isClaimed ? t('claimed') : t('claim_reward')}
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
    const oldProg = G.base.missions.allProgress[m.id] || 0;
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
    } else if (m.type === 'builders') {
      prog = getTotalBuilders();
    } else if (m.type === 'attack_win') {
      prog = G.base.missions.allProgress[m.id] || 0;
    }
    
    if (prog > m.goal) prog = m.goal;
    G.base.missions.allProgress[m.id] = prog;

    if (prog >= m.goal && oldProg < m.goal) {
       notify(`🎯 ${t('mission_title')}: ${t('mission_' + m.id)} ${t('ready') || 'Concluída!'}`, 'success');
    }
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
  
  if (m.rewardType === 'mineral') {
    G.base.resources.mineral += m.reward;
    clampResources();
    notify(`+${m.reward} <img src="mineral_icon.svg" class="inline-icon">`, 'success');
  } else if (m.rewardType === 'energy') {
    G.base.resources.energy += m.reward;
    clampResources();
    notify(`+${m.reward} <img src="energy_icon.svg" class="inline-icon">`, 'success');
  } else {
    G.base.gems = (G.base.gems || 0) + m.reward;
    notify(`+${m.reward} <img src="gems_icon.svg" class="inline-icon">`, 'success');
  }
  
  updateHUD();
  saveData();
  renderMissionPanel();
}

window.switchTroopTab = function(tab) {
  G.ui.troopTab = tab || 'train';
  document.querySelectorAll('.t-tab').forEach(t => t.classList.remove('active'));
  gel('ttab-' + G.ui.troopTab)?.classList.add('active');

  document.querySelectorAll('.troop-tab-content').forEach(c => c.style.display = 'none');
  const content = gel('t-content-' + G.ui.troopTab);
  if (content) {
    content.style.display = G.ui.troopTab === 'troops' ? 'flex' : 'block';
    if (G.ui.troopTab === 'troops') content.style.flexDirection = 'column';
  }

  if (G.ui.troopTab === 'troops') advanceTutorialIf(17);
  renderTroopsPanel();
};

function renderTroopsPanel() {
  if (!G.ui.troopTab) G.ui.troopTab = 'train';
  
  const totalCap  = getTotalCampCapacity(G.base.buildings);
  const usedSpace = getTotalTroopSpace(G.base.troops);
  const capPct    = totalCap > 0 ? Math.min(100, (usedSpace / totalCap) * 100) : 0;

  // Update Capacity Bar
  const capFill = gel('cap-fill-modern');
  const capVal  = gel('cap-val-modern');
  if (capFill) capFill.style.width = capPct + '%';
  if (capVal)  capVal.textContent  = `${usedSpace} / ${totalCap}`;

  if (G.ui.troopTab === 'train') {
    renderTrainTabContent(totalCap, usedSpace);
  } else {
    renderTroopsTabContent();
  }
}

function renderTrainTabContent(totalCap, usedSpace) {
  const queueList = gel('training-queue-modern');
  const troopsGrid = gel('available-troops-grid-modern');
  if (!queueList || !troopsGrid) return;

  // 1. Training Queue
  const queue = G.base.queue || [];
  if (queue.length === 0) {
    queueList.innerHTML = `<div style="grid-column:1/-1; color:#555; text-align:center; font-size:11px; padding:20px;">Nenhuma tropa em treinamento</div>`;
    gel('total-training-time-modern').textContent = '0s';
    gel('accelerate-cost-modern').innerHTML = '0 <img src="gems_icon.svg" class="inline-icon">';
  } else {
    let totalTime = 0;
    let totalGemCost = 0;
    const now = Date.now();

    // Group queue items by type for better visualization (optional, but requested layout shows 16x Drone)
    // Actually, the current queue is an array of individual items. Let's group them.
    const grouped = {};
    queue.forEach((it, idx) => {
      if (!grouped[it.type]) grouped[it.type] = { count: 0, items: [] };
      grouped[it.type].count++;
      grouped[it.type].items.push(it);
    });

    let html = '';
    let first = true;
    for (const [type, data] of Object.entries(grouped)) {
      const td = TROOPS[type];
      const isTraining = first; // Assuming the first group contains the current training item
      // Note: In this simple engine, the first item in G.base.queue is the one currently ticking.
      
      const item0 = data.items[0];
      const rem = Math.max(0, (item0.finishTime - now) / 1000);
      
      if (isTraining) {
        html += `
          <div class="training-card-modern">
            <span class="tc-count">${data.count}x</span>
            <img src="${td.asset}" class="tc-img">
            <div class="tc-progress-bar">${fmtTime(rem)}</div>
          </div>
        `;
      } else {
        html += `
          <div class="training-card-modern waiting">
            <span class="tc-count">${data.count}x</span>
            <img src="${td.asset}" class="tc-img">
            <div class="tc-waiting-label">${t('waiting')}</div>
          </div>
        `;
      }
      first = false;
    }
    queueList.innerHTML = html;

    // Calculate totals
    queue.forEach(it => {
      const itRem = Math.max(0, (it.finishTime - now) / 1000);
      totalTime += itRem;
      totalGemCost += Math.max(1, Math.ceil(itRem / 60));
    });
    gel('total-training-time-modern').textContent = fmtTime(totalTime);
    gel('accelerate-cost-modern').innerHTML = `${totalGemCost} <img src="gems_icon.svg" class="inline-icon">`;
  }

  // 2. Available Troops
  const ccLvl = getCurrentCCLevel();
  const unlocked = BUILDINGS.command_center.levels[ccLvl].unlocks.troop_unlock || [];
  const availableToTrain = getAvailableTroops(G.base.buildings);

  let troopsHtml = '';
  for (const troopId of unlocked) {
    const td = TROOPS[troopId];
    const canTrain = availableToTrain.includes(troopId);
    const full = (usedSpace + td.space) > totalCap;
    
    const minCost = td.cost.mineral || 0;
    const oxyCost = td.cost.oxygen || 0;
    const eneCost = td.cost.energy || 0;
    const affordable = (G.base.resources.mineral >= minCost) && 
                       (G.base.resources.oxygen >= oxyCost) && 
                       (G.base.resources.energy >= eneCost);

    troopsHtml += `
      <div class="troop-card-modern ${canTrain ? '' : 'locked'}" data-type="${troopId}" onclick="${canTrain ? `trainTroop('${troopId}')` : `notify('${t('need_barracks')}', 'info')`}">
        <span class="tc-info-btn" onclick="event.stopPropagation(); showTroopInfo('${troopId}')">ⓘ</span>
        <img src="${td.asset}" class="tc-card-img">
        <div class="tc-cost-bar" style="color:${affordable ? '#fff' : 'var(--c-danger)'}">
          ${minCost > 0 ? `<img src="mineral_icon.svg" class="inline-icon">${fmtNum(minCost)} ` : ''}
          ${oxyCost > 0 ? `<img src="oxygen_icon.svg" class="inline-icon">${fmtNum(oxyCost)} ` : ''}
          ${eneCost > 0 ? `<img src="energy_icon.svg" class="inline-icon">${fmtNum(eneCost)} ` : ''}
          ${!minCost && !oxyCost && !eneCost ? 'Grátis' : ''}
        </div>
        ${full && canTrain ? '<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; border-radius:15px; font-size:10px; color:#ff4466; font-weight:bold; pointer-events:none;">CHEIO</div>' : ''}
      </div>
    `;
  }
  troopsGrid.innerHTML = troopsHtml;
}

function renderTroopsTabContent() {
  const grid = gel('trained-troops-grid-modern');
  if (!grid) return;

  const troops = G.base.troops || {};
  let html = '';
  let hasTroops = false;

  for (const [id, count] of Object.entries(troops)) {
    if (count <= 0) continue;
    hasTroops = true;
    const td = TROOPS[id];
    html += `
      <div class="trained-card-modern">
        <img src="${td.asset}" class="tc-img">
        <div class="tc-count-label">x${count}</div>
      </div>
    `;
  }

  if (!hasTroops) {
    grid.innerHTML = `<div style="grid-column:1/-1; color:#555; text-align:center; padding:40px; font-size:12px;">Nenhuma tropa treinada.</div>`;
  } else {
    grid.innerHTML = html;
  }
}

window.speedUpTotalTraining = function() {
  const queue = G.base.queue || [];
  if (queue.length === 0) return;

  let totalCost = 0;
  const now = Date.now();
  queue.forEach(it => {
    const rem = Math.max(0, (it.finishTime - now) / 1000);
    totalCost += Math.max(1, Math.ceil(rem / 60));
  });

  if ((G.base.gems || 0) < totalCost) {
    notify(t('not_enough_gems'), 'error');
    return;
  }

  G.base.gems -= totalCost;
  queue.forEach(it => { it.finishTime = now; });
  
  processOfflineQueue();
  renderTroopsPanel();
  updateHUD();
  saveData();
  notify('⚡ Todas as tropas estão prontas!', 'success');
};

window.showTroopInfo = function(troopId) {
  const td = TROOPS[troopId];
  if (!td) return;
  
  let html = `<ul style="list-style:none; padding:0; margin:0;">
    <li>❤️ <b>${t('hp')}:</b> ${td.hp}</li>
    <li>⚔️ <b>${t('damage')}:</b> ${td.damage}</li>
    <li>📏 <b>${t('range')}:</b> ${td.range || 'Corpo a corpo'}</li>
    <li>🏕️ <b>${t('capacity')}:</b> ${td.space}</li>
    <li>⏱️ <b>${t('training_time')}:</b> ${fmtTime(td.trainTime)}</li>
    <li style="margin-top:10px; color:#888; font-size:11px;">${t(troopId + '_desc')}</li>
  </ul>`;

  gel('info-modal-title').textContent = t(troopId);
  gel('info-modal-desc').innerHTML = html;
  gel('info-modal').classList.add('visible');
};

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
    nameChangeBtn = `<button onclick="promptChangeName()" style="margin-left:8px; background:rgba(46,204,113,0.2); border:1px solid var(--c-gem); border-radius:6px; color:var(--c-gem); font-size:9px; padding:3px 8px; cursor:pointer; font-family:var(--font-hd); vertical-align:middle;"><img src="gems_icon.svg" class="inline-icon"> 100</button>`;
  }

  content.innerHTML = `
    <img src="cc_lvl${ccLvl}.png" class="info-cc-img" alt="CC">
    <div class="info-cc-label">${t('command_center')} ${t('level')} ${ccLvl} · ${themes[ccLvl]}</div>
    ${adminBtn}
    <div style="text-align:center; margin-bottom:10px; font-size:10px; color:rgba(255,255,255,0.4);">UID: ${G.pid}</div>
    <div style="padding:0 16px; margin-bottom:12px; background:rgba(255,255,255,0.03); border-radius:12px; margin:0 16px 12px;">
      <div style="font-family:var(--font-hd); font-size:9px; color:#888; letter-spacing:2px; padding:10px 0 6px" data-t="storage">💼 ARMAZENAMENTO</div>
      <div style="display:flex; flex-direction:column; gap:6px; padding-bottom:10px;">
        <div style="display:flex; justify-content:space-between; font-size:11px;"><span><img src="mineral_icon.svg" class="inline-icon"> ${t('mineral')}</span><span style="color:var(--c-mineral)">${fmtNum(G.base.resources?.mineral)} / ${fmtNum(maxMin)}</span></div>
        <div style="display:flex; justify-content:space-between; font-size:11px;"><span><img src="oxygen_icon.svg" class="inline-icon"> ${t('oxygen')}</span><span style="color:var(--c-oxygen)">${fmtNum(G.base.resources?.oxygen)} / ${fmtNum(maxOxy)}</span></div>
        <div style="display:flex; justify-content:space-between; font-size:11px;"><span><img src="energy_icon.svg" class="inline-icon"> ${t('energy')}</span><span style="color:var(--c-energy)">${fmtNum(G.base.resources?.energy)} / ${fmtNum(maxEne)}</span></div>
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
    <button class="btn-auth" onclick="resetTutorial()" style="width:100%; margin-bottom: 10px; font-size:12px; background:var(--c-gold); color:black;" data-t="reset_tutorial">Reiniciar Tutorial</button>
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
  
  // Considerar tropas já em treinamento na fila
  const queueSpace = (G.base.queue || []).reduce((acc, item) => {
    return acc + (TROOPS[item.type]?.space || 0);
  }, 0);

  if (used + queueSpace + td.space > cap) { 
    notify(t('need_camp') || 'Capacidade dos acampamentos insuficiente!', 'error'); 
    return; 
  }
  
  const minCost = td.cost.mineral || 0;
  const oxyCost = td.cost.oxygen || 0;
  const eneCost = td.cost.energy || 0;

  if (G.base.resources.mineral < minCost || G.base.resources.oxygen < oxyCost || G.base.resources.energy < eneCost) {
    notify(t('insufficient_resources'), 'error'); return;
  }
  
  G.base.resources.mineral -= minCost;
  G.base.resources.oxygen  -= oxyCost;
  G.base.resources.energy  -= eneCost;

  if (!G.base.queue) G.base.queue = [];
  const finishTime = Date.now() + td.trainTime * 1000;
  G.base.queue.push({ type, finishTime });
  setTimeout(() => finishTraining(type, finishTime), td.trainTime * 1000);

  updateHUD();
  saveData();
  notify(`${t('training')} ${t(type)}... (${fmtTime(td.trainTime)})`, 'info');

  if (!G.base.tutorialTroopCount) G.base.tutorialTroopCount = 0;
  if ((G.base.tutorialStep || 0) === 16) {
    G.base.tutorialTroopCount++;
    if (G.base.tutorialTroopCount >= 8) advanceTutorialIf(16);
  }
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
    if (G.ui.panel === 'troops') renderTroopsPanel();
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
  
  const interval = 8 * 3600 * 1000; // 8 horas
  const count = Math.floor(diff / interval);
  
  if (count > 0) {
    const currentRocks = (G.base.buildings || []).filter(b => b.type === 'lunar_rock').length;
    const maxToSpawn = Math.max(0, 10 - currentRocks);
    let spawned = 0;

    for (let i = 0; i < count && spawned < maxToSpawn; i++) {
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
  const target = gel(name + '-screen');
  if (target) {
    target.classList.remove('hidden');
    // Força um reflow
    void target.offsetWidth;
  }
  G.ui.screen = name;

  if (name !== 'game') {
    const arrow = gel('tutorial-arrow');
    if (arrow) arrow.classList.add('hidden');
    if (tutorialArrowInterval) {
      clearTimeout(tutorialArrowInterval);
      clearInterval(tutorialArrowInterval);
    }
  }
  
  // Pequeno delay para garantir renderização antes de disparar eventos dependentes de layout
  setTimeout(() => {
    if (name === 'game') {
      forceCloseAllUI();
      if (typeof buildTerrain === 'function') buildTerrain();
    }
  }, 10);
}

function forceCloseAllUI() {
  // Fecha modais unificados
  const modal = gel('unified-modal');
  if (modal) modal.classList.remove('visible');
  
  // Fecha sobreposições de busca
  document.querySelectorAll('.opp-screen-overlay').forEach(el => el.classList.remove('visible'));
  
  // Fecha chat clã se aberto
  const chat = gel('clan-chat-overlay');
  if (chat) chat.classList.remove('visible');
  
  // Esconde controles de visita
  const visit = gel('visit-controls');
  if (visit) visit.style.display = 'none';

  // Fecha popup de construção
  hideBldPopup();
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
  advanceTutorialIf(18);
  startMatchmaking();
}

async function startMatchmaking() {
  const screen = gel('opponent-screen');
  screen.classList.add('visible');
  const area = gel('matchmaking-area');
  if (!area) return;

  // USER REQUEST: Limite de 5 ataques por hora
  if (!G.base.lastAttackReset) G.base.lastAttackReset = Date.now();
  if (!G.base.attackCount) G.base.attackCount = 0;

  const now = Date.now();
  const hour = 3600000;
  if (now - G.base.lastAttackReset >= hour) {
    G.base.attackCount = 0;
    G.base.lastAttackReset = now;
    saveData();
  }

  if (G.base.attackCount >= 5) {
    const nextReset = G.base.lastAttackReset + hour;
    const waitMs = nextReset - now;
    const waitMin = Math.ceil(waitMs / 60000);
    area.innerHTML = `
      <div class="mm-status">
        <div style="font-size:40px; margin-bottom:10px;">⏳</div>
        <div style="color:var(--c-danger); font-weight:bold;">Limite de ataques atingido!</div>
        <div style="font-size:12px; margin-top:5px;">Você pode fazer 5 ataques por hora.<br>Próximo ataque disponível em <b>${waitMin} min</b>.</div>
      </div>
      <button class="mm-btn" onclick="gel('opponent-screen').classList.remove('visible')">VOLTAR</button>
    `;
    return;
  }

  // Check own shield
  if (G.base.shieldUntil && G.base.shieldUntil > Date.now()) {
    const rem = Math.ceil((G.base.shieldUntil - Date.now()) / 3600000);
    area.innerHTML = `<div class="mm-status">🛡️ Você está protegido por ${rem}h<br><small>Atacar remove sua proteção!</small></div>
      <button class="mm-btn" onclick="confirmAttackWithShield()">⚔️ ATACAR MESMO ASSIM</button>`;
    return;
  }

  area.innerHTML = `<div class="mm-status"><div class="mm-spinner"></div>Procurando oponente...</div>`;

  if (!G.db) {
    area.innerHTML = `<div class="mm-status">⚠️ Configure o Firebase para jogar online!</div>
      <button class="mm-btn" onclick="(function(){var s=document.getElementById('opponent-screen');s.classList.remove('visible');s.classList.add('hidden');})()" data-t="back">← Voltar</button>`;
    return;
  }

  try {
    const myEnergy = G.base.resources?.energy || 0;
    if (myEnergy < 10) {
      area.innerHTML = `<div class="mm-status" style="color:var(--c-energy)"><img src="energy_icon.svg" class="inline-icon"> Energia insuficiente para buscar (10 necessária)</div>
        <button class="mm-btn" onclick="closePanels()">FECHAR</button>`;
      return;
    }

    // Cobrar energia
    G.base.resources.energy -= 10;
    updateHUD();
    saveData();

    const myCC = getCurrentCCLevel();
    // Query CC ±1 level
    let snap = await G.db.collection('users')
      .where('ccLevel', '>=', Math.max(1, myCC - 1))
      .where('ccLevel', '<=', myCC + 1)
      .limit(30).get();
      
    let pool = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.uid !== G.pid && (p.buildings||[]).length > 0
        && !(p.shieldUntil && p.shieldUntil > Date.now()));
    
    // Fallback: se não achar no range, pegar qualquer um (mas preferir CC próximo)
    if (pool.length === 0) {
      const snap2 = await G.db.collection('users').limit(50).get();
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
    if ((G.base.tutorialStep || 0) === 19) {
       // Fictitious base for tutorial
       G._pendingOpponent = {
         playerName: 'Base de Treinamento',
         trophies: 0,
         ccLevel: 1,
         buildings: [
           { id: 'tut-cc', type: 'command_center', level: 1, x: 9, y: 9, hp: 500, maxHp: 500 },
           { id: 'tut-min', type: 'mineral_extractor', level: 1, x: 12, y: 9, hp: 200, maxHp: 200 }
         ],
         resources: { mineral: 500, oxygen: 500 }
       };
    }
    const finalOp = G._pendingOpponent;
    const finalLeague = getLeague(finalOp.trophies || 0);

    area.innerHTML = `
      <div class="mm-found" data-t="opponent_found">${t('opponent_found') || '⚔️ Oponente Encontrado!'}</div>
      <div class="opp-card mm-card">
        <div class="opp-avatar" style="background:linear-gradient(135deg,${finalLeague.color}44,${finalLeague.color}22)">${(finalOp.playerName||'C')[0].toUpperCase()}</div>
        <div class="opp-info">
          <div class="opp-name">${finalOp.playerName || 'Colono'}</div>
          <div class="opp-stats">${finalLeague.emoji} ${finalLeague.name} · CC${finalOp.ccLevel||1} · 🏆${finalOp.trophies||0}</div>
          <div class="opp-stats">${(finalOp.buildings||[]).length} construções · <img src="mineral_icon.svg" class="inline-icon">${fmtNum(finalOp.resources?.mineral||0)} <img src="oxygen_icon.svg" class="inline-icon">${fmtNum(finalOp.resources?.oxygen||0)}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button id="mm-confirm-btn" class="mm-btn" onclick="advanceTutorialIf(19); confirmMatchmaking()" data-t="attack_btn">${t('attack') || '⚔️ ATACAR!'}</button>
        <button class="mm-btn mm-btn-skip" onclick="startMatchmaking()" data-t="next_btn"><img src="energy_icon.svg" class="inline-icon"> 10 · ${t('next') || 'Próximo'}</button>
      </div>`;
  } catch (e) {
    area.innerHTML = `<div style="color:var(--c-danger);text-align:center;font-size:12px">Erro: ${e.message}</div>
      <button class="mm-btn" onclick="startMatchmaking()">🔄 TENTAR NOVAMENTE</button>`;
  }
}

function confirmMatchmaking() {
  if (!G._pendingOpponent) return;
  
  const myTroops = G.base.troops || {};
  const totalT   = Object.values(myTroops).reduce((a, c) => a + c, 0);
  if (totalT === 0) { 
    notify(t('train_troops_first'), 'error'); 
    return; 
  }

  G.base.shieldUntil = 0;
  const screen = gel('opponent-screen');
  screen.classList.remove('visible');
  screen.classList.add('hidden');
  
  // Incrementar contador de ataques
  G.base.attackCount = (G.base.attackCount || 0) + 1;
  saveData();

  launchBattle(G._pendingOpponent);
  G._pendingOpponent = null;
}

function confirmAttackWithShield() {
  G.base.shieldUntil = 0;
  saveData();
  startMatchmaking();
}

// ============================================================
// MODERN BATTLE SYSTEM (V2)
// ============================================================
let battleRequest = null;
let bCanvas, bCtx;

function launchBattle(opponent) {
  if (!opponent) return;
  
  const myTroops = G.base.troops || {};
  const totalT   = Object.values(myTroops).reduce((a, c) => a + c, 0);
  if (totalT === 0) { notify(t('train_troops_first'), 'error'); return; }

  forceCloseAllUI();
  switchScreen('attack');
  
  // Garantir que o container tenha dimensões antes de configurar o canvas
  requestAnimationFrame(() => {
    bCanvas = gel('battle-canvas');
    if (!bCanvas) return;
    bCtx    = bCanvas.getContext('2d');
    const container = gel('battle-container');
    
    // Forçar dimensões reais do container
    const rect = container.getBoundingClientRect();
    bCanvas.width  = rect.width || window.innerWidth;
    bCanvas.height = rect.height || (window.innerHeight - 175); // Desconto do HUD e DeployBar
    
    const scaleX = bCanvas.width  / (GRID_W * CELL_SIZE);
    const scaleY = bCanvas.height / (GRID_H * CELL_SIZE);
    const scale  = Math.min(scaleX, scaleY) * 1.5 || 0.8; // USER REQUEST: Zoom inicial maior
    const offX   = (bCanvas.width  - GRID_W * CELL_SIZE * scale) / 2;
    const offY   = (bCanvas.height - GRID_H * CELL_SIZE * scale) / 2;

    const bldArray = (opponent.buildings || []).map(b => {
      const def = BUILDINGS[b.type];
      if (!def) return null;
      const lvl = def.levels[b.level] || def.levels[1];
      return { ...b, curHp: lvl.hp, maxHp: lvl.hp, alive: true, atkTimer: 0 };
    }).filter(b => b !== null && b.type !== 'lunar_rock');

    G.battle = {
      opponent,
      buildings: bldArray,
      troops: [],
      deployPool: { ...myTroops },
      selectedTroop: null,
      startTime: Date.now(),
      duration: 180,
      destroyed: 0,
      totalBld: bldArray.length,
      phase: 'deploy',
      projectiles: [],
      explosions: [],
      scale, offX, offY,
      baseScale: scale, baseOffX: offX, baseOffY: offY,
      userZoom: 1.0,
      lootedMin: 0,
      lootedOxy: 0,
      totalStealMin: Math.floor((opponent.resources?.mineral || 0) * 0.3),
      totalStealOxy: Math.floor((opponent.resources?.oxygen || 0) * 0.3),
      timer: 180,
      lastTick: Date.now(),
      isPanning: false,
      lastX: 0,
      lastY: 0
    };

    // Redistribuir loot
    const storages = G.battle.buildings.filter(b => {
      const def = BUILDINGS[b.type];
      return def?.isStorage || def?.isResource || b.type === 'command_center';
    });
    const count = storages.length || 1;
    storages.forEach(b => {
      b.lMin = Math.floor(G.battle.totalStealMin / count);
      b.lOxy = Math.floor(G.battle.totalStealOxy / count);
    });

    renderDeployBar();
    updateBattleUI();
    
    // Remover listeners antigos se houver
    bCanvas.removeEventListener('mousedown', handleBattleInput);
    bCanvas.removeEventListener('touchstart', handleBattleInput);
    bCanvas.removeEventListener('mousemove', handleBattleMove);
    bCanvas.removeEventListener('touchmove', handleBattleMove);
    window.removeEventListener('mouseup', handleBattleEnd);
    window.removeEventListener('touchend', handleBattleEnd);
    
    bCanvas.addEventListener('mousedown', handleBattleInput);
    bCanvas.addEventListener('touchstart', handleBattleInput, { passive: false });
    bCanvas.addEventListener('mousemove', handleBattleMove);
    bCanvas.addEventListener('touchmove', handleBattleMove, { passive: false });
    window.addEventListener('mouseup', handleBattleEnd);
    window.addEventListener('touchend', handleBattleEnd);

    if (battleRequest) cancelAnimationFrame(battleRequest);
    battleLoop();
    notify(t('deploy_tip'), 'info');
  });
}

function handleBattleMove(e) {
  const bs = G.battle;
  if (!bs || !bs.isPanning) return;
  
  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
  
  const dx = clientX - bs.lastX;
  const dy = clientY - bs.lastY;
  
  bs.offX += dx;
  bs.offY += dy;
  
  bs.lastX = clientX;
  bs.lastY = clientY;
  
  // Limites básicos para não fugir demais
  const margin = 200 * bs.scale;
  const gridW = GRID_W * CELL_SIZE * bs.scale;
  const gridH = GRID_H * CELL_SIZE * bs.scale;
  
  if (bs.offX > bCanvas.width - margin) bs.offX = bCanvas.width - margin;
  if (bs.offX < -gridW + margin) bs.offX = -gridW + margin;
  if (bs.offY > bCanvas.height - margin) bs.offY = bCanvas.height - margin;
  if (bs.offY < -gridH + margin) bs.offY = -gridH + margin;
  
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) bs.moved = true;
}



function handleBattleInput(e) {
  const bs = G.battle;
  if (!bs) return;
  if (e.type === 'touchstart') e.preventDefault();
  
  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
  
  bs.isPanning = true;
  bs.moved = false;
  bs.lastX = clientX;
  bs.lastY = clientY;
  
  // Se for apenas clique (mousedown curto), o deploy acontece no handleBattleEnd?
  // Na verdade, para jogos de estratégia, o deploy costuma ser no mousedown se não arrastar.
  // Mas para simplificar pan, vamos fazer o deploy no 'mouseup' através de um novo handler
}

function handleBattleEnd(e) {
  const bs = G.battle;
  if (!bs) return;
  
  if (bs.isPanning && !bs.moved) {
    const rect = bCanvas.getBoundingClientRect();
    // Pegar as coordenadas do evento final ou usar as últimas conhecidas
    const clientX = (e.type === 'touchend' || e.type === 'touchcancel') ? bs.lastX : e.clientX;
    const clientY = (e.type === 'touchend' || e.type === 'touchcancel') ? bs.lastY : e.clientY;
    
    deployTroop(clientX - rect.left, clientY - rect.top);
  }
  
  bs.isPanning = false;
}

function deployTroop(px, py) {
  const bs = G.battle;
  if (!bs || bs.phase === 'end') return;
  const type = bs.selectedTroop;
  if (!type) return;
  if (bs.deployPool[type] <= 0) return;

  const { offX, offY, scale } = bs;
  const gx = (px - offX) / (CELL_SIZE * scale);
  const gy = (py - offY) / (CELL_SIZE * scale);

  // Impedir deploy em cima de edifícios inimigos
  for (const b of bs.buildings) {
    if (!b.alive) continue;
    const bsz = BUILDINGS[b.type]?.size || 1;
    if (gx >= b.x && gx < b.x + bsz && gy >= b.y && gy < b.y + bsz) {
      notify('Posição inválida: Edifício detectado!', 'error');
      return;
    }
  }

  const td = TROOPS[type];
  bs.troops.push({
    id: genId(), type, x: gx, y: gy,
    hp: td.hp, maxHp: td.hp, targetId: null, atkTimer: 0, alive: true,
    angle: 0
  });

  bs.deployPool[type]--;
  bs.phase = 'fight';
  renderDeployBar();
  gel('battle-msg').style.display = 'none';
}

function renderDeployBar() {
  const bar = gel('troops-deploy-bar');
  if (!bar) return;
  bar.innerHTML = '';
  
  Object.entries(G.battle.deployPool).forEach(([type, count]) => {
    if (count <= 0) return;
    const td = TROOPS[type];
    const card = document.createElement('div');
    card.className = `deploy-card ${G.battle.selectedTroop === type ? 'selected' : ''}`;
    card.onclick = () => {
      G.battle.selectedTroop = type;
      renderDeployBar();
    };
    
    // USER REQUEST: Usar asset da tropa em vez de emoji
    const imgKey = type === 'star_warrior' ? 'star_warrior.png' : `${type}_sprite.png`;
    
    card.innerHTML = `
      <div class="dc-emoji">
        <img src="${imgKey}" style="width:32px; height:32px; object-fit:contain;">
      </div>
      <div class="dc-count">${count}</div>
    `;
    bar.appendChild(card);
  });
}

function updateBattleUI() {
  const bs = G.battle;
  if (!bs) return;
  
  const pct = Math.floor((bs.destroyed / bs.totalBld) * 100);
  gel('atk-pct').textContent = `${pct}%`;
  gel('atk-pct-fill').style.width = `${pct}%`;
  
  gel('loot-min').textContent = fmtNum(bs.lootedMin);
  gel('loot-oxy').textContent = fmtNum(bs.lootedOxy);
  
  const m = Math.floor(bs.timer / 60);
  const s = Math.floor(bs.timer % 60);
  gel('atk-timer').textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function battleLoop() {
  const bs = G.battle;
  if (!bs) return;
  
  const now = Date.now();
  const dt = (now - bs.lastTick) / 1000;
  bs.lastTick = now;

  if (bs.phase !== 'end') {
    processBattleLogic(dt);
    updateBattleUI();
  }

  drawBattleFrame();
  
  if (bs.phase !== 'end' || bs.explosions.length > 0) {
    battleRequest = requestAnimationFrame(battleLoop);
  }
}

function processBattleLogic(dt) {
  const bs = G.battle;
  
  // Timer
  bs.timer -= dt;
  if (bs.timer <= 0) { endBattle(); return; }

  // Troops logic
  bs.troops.forEach(t => {
    if (!t.alive) return;
    const td = TROOPS[t.type];
    
    // Find target
    let target = bs.buildings.find(b => b.id === t.targetId && b.alive);
    if (!target) {
      target = findBestTarget(t, bs.buildings, td.priority);
      t.targetId = target ? target.id : null;
    }

    if (target) {
      const bsz = BUILDINGS[target.type]?.size || 1;
      const tx = target.x + bsz/2, ty = target.y + bsz/2;
      const dx = tx - t.x, dy = ty - t.y;
      const dist = Math.hypot(dx, dy);

      if (dist > td.range) {
        // Move
        t.x += (dx / dist) * td.speed * dt;
        t.y += (dy / dist) * td.speed * dt;
        t.angle = Math.atan2(dy, dx);
      } else {
        // Attack
        t.atkTimer += dt;
        if (t.atkTimer >= 1.0) {
          t.atkTimer = 0;
          target.curHp -= td.damage;
          bs.projectiles.push({ x1:t.x, y1:t.y, x2:tx, y2:ty, life:0.3, color:td.color });
          if (target.curHp <= 0) {
            target.alive = false;
            bs.destroyed++;
            if (target.lMin) bs.lootedMin += target.lMin;
            if (target.lOxy) bs.lootedOxy += target.lOxy;
            createExplosion(tx, ty);
            if (bs.destroyed >= bs.totalBld) endBattle();
          }
        }
      }
    }
  });

  // Defenses logic
  bs.buildings.forEach(b => {
    if (!b.alive) return;
    const def = BUILDINGS[b.type];
    if (!def || !def.isDefense) return;
    const lvl = def.levels[b.level];
    if (!lvl) return;

    b.atkTimer += dt;
    if (b.atkTimer >= 1.5) {
      const bsz = def.size || 1;
      const cx = b.x + bsz/2, cy = b.y + bsz/2;
      const nearest = bs.troops.find(t => t.alive && Math.hypot(t.x-cx, t.y-cy) <= (lvl.range || 5));
      if (nearest) {
        b.atkTimer = 0;
        nearest.hp -= (lvl.damage || 50);
        bs.projectiles.push({ x1:cx, y1:cy, x2:nearest.x, y2:nearest.y, life:0.3, color:'#ff4466' });
        if (nearest.hp <= 0) {
          nearest.alive = false;
          createExplosion(nearest.x, nearest.y);
        }
      }
    }
  });

  // Projectiles & Particles
  bs.projectiles = bs.projectiles.filter(p => {
    p.life -= dt;
    return p.life > 0;
  });
  bs.explosions = bs.explosions.filter(e => {
    e.life -= dt;
    return e.life > 0;
  });
}

function findBestTarget(troop, buildings, priority) {
  const alive = buildings.filter(b => b.alive);
  if (alive.length === 0) return null;
  
  let pool = alive;
  if (priority === 'defense') {
    const defs = alive.filter(b => BUILDINGS[b.type]?.isDefense);
    if (defs.length > 0) pool = defs;
  } else if (priority === 'resource') {
    const res = alive.filter(b => BUILDINGS[b.type]?.isResource || BUILDINGS[b.type]?.isStorage);
    if (res.length > 0) pool = res;
  }

  let best = null, minDist = Infinity;
  pool.forEach(b => {
    const bsz = BUILDINGS[b.type]?.size || 1;
    const d = Math.hypot(b.x + bsz/2 - troop.x, b.y + bsz/2 - troop.y);
    if (d < minDist) { minDist = d; best = b; }
  });
  return best;
}

function createExplosion(x, y) {
  for (let i = 0; i < 8; i++) {
    G.battle.explosions.push({
      x: x + (Math.random() - 0.5),
      y: y + (Math.random() - 0.5),
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 0.5, maxLife: 0.5,
      size: 5 + Math.random() * 10
    });
  }
}

function drawBattleFrame() {
  const bs = G.battle;
  if (!bs) return;
  const W = bCanvas.width, H = bCanvas.height;
  const { scale, offX, offY } = bs;

  // Draw Moon Background (Igual ao da base)
  if (!window.battleCraters) {
    const rng = mulberry32(123);
    window.battleCraters = [];
    for (let i = 0; i < 30; i++)
      window.battleCraters.push({ cx: rng() * W, cy: rng() * H, r: 10 + rng() * 40, d: 0.2 + rng() * 0.5 });
  }

  // Desenha fundo escuro
  bCtx.fillStyle = '#1e1e2e';
  bCtx.fillRect(0,0,W,H);

  // Desenha crateras de fundo
  for (const c of window.battleCraters) {
    const g = bCtx.createRadialGradient(c.cx - c.r*0.3, c.cy - c.r*0.3, 0, c.cx, c.cy, c.r);
    g.addColorStop(0, `rgba(100,100,120,${c.d * 0.3})`);
    g.addColorStop(1, `rgba(0,0,0,0)`);
    bCtx.beginPath(); bCtx.arc(c.cx, c.cy, c.r, 0, Math.PI*2);
    bCtx.fillStyle = g; bCtx.fill();
  }

  // Draw Moon Surface (Onde fica a grade)
  const gridW = GRID_W * CELL_SIZE * scale;
  const gridH = GRID_H * CELL_SIZE * scale;
  
  // Gradiente radial para a superfície lunar
  const surfG = bCtx.createRadialGradient(offX + gridW/2, offY + gridH/2, 0, offX + gridW/2, offY + gridH/2, gridW*0.7);
  surfG.addColorStop(0, '#505060');
  surfG.addColorStop(1, '#343444');
  bCtx.fillStyle = surfG;
  bCtx.fillRect(offX, offY, gridW, gridH);

  // Draw Grid/Floor
  bCtx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
  bCtx.lineWidth = 1;
  for (let i = 0; i <= GRID_W; i++) {
    const x = offX + i * CELL_SIZE * scale;
    bCtx.beginPath(); bCtx.moveTo(x, offY); bCtx.lineTo(x, offY + gridH); bCtx.stroke();
  }
  for (let j = 0; j <= GRID_H; j++) {
    const y = offY + j * CELL_SIZE * scale;
    bCtx.beginPath(); bCtx.moveTo(offX, y); bCtx.lineTo(offX + gridW, y); bCtx.stroke();
  }

  // Draw Buildings
  bs.buildings.forEach(b => {
    if (!b.alive) return;
    const def = BUILDINGS[b.type];
    const bsz = def.size || 1;
    const sx = offX + b.x * CELL_SIZE * scale;
    const sy = offY + b.y * CELL_SIZE * scale;
    const sSize = bsz * CELL_SIZE * scale;

    const img = bldImgCache[def.getAsset(b.level)];
    if (img?.complete) {
      bCtx.drawImage(img, sx, sy, sSize, sSize);
    } else {
      bCtx.fillStyle = 'rgba(255,255,255,0.1)';
      bCtx.fillRect(sx, sy, sSize, sSize);
    }

    // Health Bar
    if (b.curHp < b.maxHp) {
      const barW = sSize * 0.8;
      const barX = sx + sSize * 0.1;
      const barY = sy - 5;
      bCtx.fillStyle = '#444';
      bCtx.fillRect(barX, barY, barW, 4);
      bCtx.fillStyle = '#44FF88';
      bCtx.fillRect(barX, barY, barW * (b.curHp / b.maxHp), 4);
    }
  });

  // Draw Troops
  bs.troops.forEach(t => {
    if (!t.alive) return;
    const sx = offX + t.x * CELL_SIZE * scale;
    const sy = offY + t.y * CELL_SIZE * scale;
    const tr = 15 * scale;

    bCtx.save();
    bCtx.translate(sx, sy);
    bCtx.rotate(t.angle);
    
    const td = TROOPS[t.type];
    const imgKey = t.type === 'star_warrior' ? 'star_warrior.png' : `${t.type}_sprite.png`;
    const img = troopImgCache[imgKey];
    if (img?.complete) {
      bCtx.drawImage(img, -tr, -tr, tr*2, tr*2);
    } else {
      bCtx.fillStyle = td.color;
      bCtx.beginPath(); bCtx.arc(0,0,tr,0,Math.PI*2); bCtx.fill();
    }
    bCtx.restore();

    // HP
    if (t.hp < t.maxHp) {
      bCtx.fillStyle = '#444';
      bCtx.fillRect(sx - 10*scale, sy - tr - 5, 20*scale, 3);
      bCtx.fillStyle = '#44FF88';
      bCtx.fillRect(sx - 10*scale, sy - tr - 5, 20*scale * (t.hp / t.maxHp), 3);
    }
  });

  // Draw Projectiles
  bCtx.lineWidth = 2;
  bs.projectiles.forEach(p => {
    const x1 = offX + p.x1 * CELL_SIZE * scale;
    const y1 = offY + p.y1 * CELL_SIZE * scale;
    const x2 = offX + p.x2 * CELL_SIZE * scale;
    const y2 = offY + p.y2 * CELL_SIZE * scale;
    bCtx.strokeStyle = p.color;
    bCtx.globalAlpha = p.life / 0.3;
    bCtx.beginPath(); bCtx.moveTo(x1, y1); bCtx.lineTo(x2, y2); bCtx.stroke();
  });
  bCtx.globalAlpha = 1;

  // Draw Explosions
  bs.explosions.forEach(e => {
    bCtx.fillStyle = `rgba(255, ${100 + 155 * (e.life/e.maxLife)}, 0, ${e.life/e.maxLife})`;
    bCtx.beginPath();
    bCtx.arc(offX + e.x * CELL_SIZE * scale, offY + e.y * CELL_SIZE * scale, e.size * scale, 0, Math.PI*2);
    bCtx.fill();
    e.x += e.vx * 0.01;
    e.y += e.vy * 0.01;
  });
}

function surrenderBattle() {
  if (confirm("Deseja realmente recuar da batalha?")) endBattle();
}

async function endBattle() {
  const bs = G.battle;
  if (!bs || bs.phase === 'end') return;
  bs.phase = 'end';

  const pct = Math.floor((bs.destroyed / bs.totalBld) * 100);
  let stars = 0;
  if (pct >= 50) stars = 1;
  if (bs.buildings.find(b => b.type === 'command_center' && !b.alive)) stars = Math.max(stars, 1) + 1;
  if (pct === 100) stars = 3;

  const won = stars > 0;
  
  // Trophies logic
  const myT = G.base.trophies || 0;
  const oppT = bs.opponent.trophies || 0;
  let tGain = 0;
  if (won) {
    tGain = Math.floor(15 + (stars * 5) + Math.max(0, (oppT - myT) / 10));
  } else {
    tGain = -Math.floor(10 + Math.max(0, (myT - oppT) / 10));
  }

  // Update base
  G.base.trophies = Math.max(0, (G.base.trophies || 0) + tGain);
  G.base.resources.mineral = Math.min(G.base.resources.mineral + bs.lootedMin, getStorageCapacity(G.base.buildings, 'mineral'));
  G.base.resources.oxygen  = Math.min(G.base.resources.oxygen  + bs.lootedOxy, getStorageCapacity(G.base.buildings, 'oxygen'));

  // Consume ALL deployed troops (USER REQUEST)
  Object.keys(bs.deployPool).forEach(type => {
    // Total original - what's left in deployPool
    const originalCount = G.base.troops[type] || 0;
    const remainingInPool = bs.deployPool[type] || 0;
    // We already subtracted killed troops in some logic? No, let's do it clean:
    // Any troop that was deployed (original - remainingInPool) is lost.
    // However, the current code logic might be confusing. 
    // Let's assume deployPool is what wasn't used yet.
    // So troops used = (Original before battle) - (Remaining in deployPool)
    // Actually, launchBattle copies G.base.troops to bs.deployPool.
    // So G.base.troops[type] should be updated to match the remaining bs.deployPool.
    G.base.troops[type] = remainingInPool;
  });

  // Sync with Firebase
  if (G.db && (bs.opponent.uid || bs.opponent.id)) {
    try {
      const oppRef = G.db.collection('users').doc(bs.opponent.uid || bs.opponent.id);
      const oppDoc = await oppRef.get();
      if (oppDoc.exists) {
        const od = oppDoc.data();
        const oTrophyLoss = won ? Math.floor(tGain * 0.8) : 0;
        await oppRef.update({
          trophies: Math.max(0, (od.trophies || 0) - oTrophyLoss),
          'resources.mineral': Math.max(0, (od.resources?.mineral || 0) - bs.lootedMin),
          'resources.oxygen': Math.max(0, (od.resources?.oxygen || 0) - bs.lootedOxy),
          shieldUntil: Date.now() + (won ? 3600000 * 12 : 0)
        });
      }
    } catch (e) { console.warn("Opponent sync failed:", e); }
  }

  G.base.totalDestroyed = (G.base.totalDestroyed || 0) + bs.destroyed;
  if (won) {
    G.base.totalWins = (G.base.totalWins || 0) + 1;
    advanceTutorialIf(20);
  }

  await saveData();

  // Show results
  gel('res-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  gel('res-title').textContent = won ? 'VITÓRIA!' : 'DERROTA';
  gel('res-title').style.color = won ? 'var(--c-success)' : 'var(--c-danger)';
  gel('res-pct').textContent = `${pct}%`;
  gel('res-bld').textContent = `${bs.destroyed}/${bs.totalBld}`;
  gel('res-trophy').textContent = (tGain >= 0 ? '+' : '') + tGain;
  gel('res-trophy').style.color = tGain >= 0 ? 'var(--c-success)' : 'var(--c-danger)';
  gel('res-min').textContent = fmtNum(bs.lootedMin);
  gel('res-oxy').textContent = fmtNum(bs.lootedOxy);
  
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
  advanceTutorialIf(5);

  // If it was an upgrade in progress, complete it now
  if (b.upgradeFinish && b.upgradeFinish > Date.now()) {
    const nextLevel = b.level + 1;
    b.upgradeFinish = 0;
    finishUpgrade(bId, nextLevel);
  } else if (b.buildFinish && b.buildFinish > Date.now()) {
    b.buildFinish = 0;
    refreshBldEl(bId);
    notify('<img src="energy_icon.svg" class="inline-icon"> Construção concluída instantaneamente!', 'success');
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
  notify('<img src="energy_icon.svg" class="inline-icon"> Tropa pronta instantaneamente!', 'success');
}

function renderShopPanel() {
  const grid = gel('shop-grid');
  if (!grid) return;
  const items = [
    { gems: 100,  desc: 'Carga de Satélite', price: 'R$ 4,90',  icon: '<img src="gems_icon.svg" class="inline-icon">' },
    { gems: 550,  desc: 'Pilha Lunar',      price: 'R$ 19,90', icon: '<img src="gems_icon.svg" class="inline-icon">' },
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
// INTERACTIVE TUTORIAL
// ============================================================
let tutorialArrowInterval = null;

function showTutorial() {
  if (G.base.tutorialDone) return;
  
  // Verificação inicial do estado da base para pular passos já concluídos
  let step = G.base.tutorialStep || 0;
  
  const hasMineral = getBuildingCountOfType('mineral_extractor') > 0;
  const hasOxygen = getBuildingCountOfType('oxygen_extractor') > 0;
  const hasBarracks = getBuildingCountOfType('barracks') > 0;
  const hasCamp = getBuildingCountOfType('camp') > 0;
  
  const usedSpace = getTotalTroopSpace(G.base.troops);
  const queueSpace = (G.base.queue || []).reduce((acc, it) => acc + (TROOPS[it.type]?.space || 0), 0);
  const hasTroops = (usedSpace + queueSpace) >= 3;

  if (step < 6 && hasMineral) step = 6;
  if (step < 9 && hasOxygen) step = 9;
  if (step < 12 && hasBarracks) step = 12;
  if (step < 15 && hasCamp) step = 15;
  if (step < 18 && hasTroops) step = 18;

  G.base.tutorialStep = step;
  
  const dialog = gel('tutorial-dialog');
  if (dialog) {
    dialog.classList.remove('hidden');
    dialog.classList.add('visible');
  }
  updateTutorialStep();
}

function updateTutorialStep() {

  const textEl = gel('tutorial-text');
  const arrow = gel('tutorial-arrow');
  const btn = gel('tutorial-next-btn');
  
  if (arrow) arrow.classList.add('hidden');
  if (btn) btn.style.display = 'none';

  if (tutorialArrowInterval) {
    clearTimeout(tutorialArrowInterval);
    clearInterval(tutorialArrowInterval);
    tutorialArrowInterval = null;
  }

  checkTutorialAutoAdvance();
  const step = G.base.tutorialStep || 0;
  
  const dialog = gel('tutorial-dialog');
  if (!G.base.tutorialDone && dialog) {
    dialog.classList.remove('hidden');
    dialog.classList.add('visible');
  } else {
    closeTutorialDialog();
  }

  if (step === 0) {
    textEl.textContent = t('tut_step0');
    btn.style.display = 'block';
    btn.textContent = t('continue');
  } else if (step === 1) {
    textEl.textContent = t('tut_step1');
    pointArrowToElement('nav-build', 'top');
  } else if (step === 2) {
    textEl.textContent = t('tut_step2');
    pointArrowToBuildingCard('mineral_extractor');
  } else if (step === 3 || step === 10 || step === 13) {
    textEl.textContent = t('tut_step3');
    pointArrowToGhost();
  } else if (step === 4 || step === 8 || step === 11 || step === 14) {
    // After placement: instruct to speedup
    textEl.textContent = t('tut_step4');
    pointArrowToLastBuilding();
  } else if (step === 5 || step === 9 || step === 12 || step === 15) {
    textEl.textContent = t('tut_step5');
    pointArrowToElement('popup-speedup', 'top');
  } else if (step === 6) {
    textEl.textContent = t('tut_step6');
    pointArrowToElement('nav-build', 'top');
  } else if (step === 7) {
    textEl.textContent = t('tut_step7');
    pointArrowToBuildingCard('oxygen_extractor');
  } else if (step === 16) {
    textEl.textContent = t('tut_step9');
    pointArrowToElement('nav-build', 'top');
  } else if (step === 17) {
    textEl.textContent = t('tut_step10');
    pointArrowToBuildingCard('barracks');
  } else if (step === 19) {
    textEl.textContent = t('tut_step12');
    pointArrowToElement('nav-build', 'top');
  } else if (step === 20) {
    textEl.textContent = t('tut_step13');
    pointArrowToBuildingCard('camp');
  } else if (step === 15) {
    textEl.textContent = t('tut_step15');
    pointArrowToElement('nav-troops', 'top');
  } else if (step === 16) {
    textEl.textContent = t('tut_step16');
    pointArrowToBuildingCard('drone'); 
  } else if (step === 17) {
    textEl.textContent = t('tut_step17');
    pointArrowToElement('ttab-troops', 'bottom');
  } else if (step === 18) {
    textEl.textContent = t('tut_step18');
    pointArrowToElement('btn-attack-modern', 'top');
  } else if (step === 19) {
    textEl.textContent = t('tut_step19');
    pointArrowToElement('mm-confirm-btn', 'bottom');
  } else if (step === 20) {
    textEl.textContent = t('tut_step20');
  } else if (step === 21) {
    textEl.textContent = t('tut_step21');
    if (btn) {
      btn.style.display = 'block';
      btn.textContent = t('tut_finish');
    }
  } else if (step > 21) {
    closeTutorial();
  }
}


function nextTutorialStep() {
  G.base.tutorialStep = (G.base.tutorialStep || 0) + 1;
  saveData();
  updateTutorialStep();
}

function advanceTutorialIf(step) {
  if (!G.base.tutorialDone && (G.base.tutorialStep || 0) === step) {
    nextTutorialStep();
  }
}

function skipTutorial() {
  G.base.tutorialStep = 99;
  G.base.tutorialDone = true;
  saveData();
  closeTutorial();
  notify("Tutorial pulado com sucesso!", "info");
}

function checkTutorialAutoAdvance() {
  const step = G.base.tutorialStep || 0;
  if (G.base.tutorialDone) return;

  // Detecção de construções concluídas (ou em andamento)
  const hasMineral = getBuildingCountOfType('mineral_extractor') > 0;
  const hasOxygen = getBuildingCountOfType('oxygen_extractor') > 0;
  const hasBarracks = getBuildingCountOfType('barracks') > 0;
  const hasCamp = getBuildingCountOfType('camp') > 0;

  if (step === 3 && hasMineral) nextTutorialStep();
  if (step === 8 && hasOxygen) nextTutorialStep();
  if (step === 11 && hasBarracks) nextTutorialStep();
  if (step === 14 && hasCamp) nextTutorialStep();

  // Detecção de UI
  const mmVisible = gel('opponent-screen')?.classList.contains('visible');
  if (step === 18 && mmVisible) nextTutorialStep();

  if (step === 1 && G.ui.panel === 'build') {
    nextTutorialStep(); // Painel abriu
  } else if (step === 2 && G.ui.mode === 'build') {
    nextTutorialStep(); // Entrou no modo construção
  } else if (step === 6 && G.ui.panel === 'build') {
    nextTutorialStep();
  } else if (step === 7 && G.ui.mode === 'build' && G.ui.buildType === 'oxygen_extractor') {
    nextTutorialStep();
  } else if (step === 9 && G.ui.panel === 'build') {
    nextTutorialStep();
  } else if (step === 10 && G.ui.mode === 'build' && G.ui.buildType === 'barracks') {
    nextTutorialStep();
  } else if (step === 12 && G.ui.panel === 'build') {
    nextTutorialStep();
  } else if (step === 13 && G.ui.mode === 'build' && G.ui.buildType === 'camp') {
    nextTutorialStep();
  } else if (step === 15 && G.ui.panel === 'troops') {
    nextTutorialStep();
  }
}

function closeTutorial() {
  closeTutorialDialog();
  G.base.tutorialDone = true;
  saveData();
}

function closeTutorialDialog() {
  const dialog = gel('tutorial-dialog');
  const arrow = gel('tutorial-arrow');
  if (dialog) {
    dialog.classList.remove('visible');
    dialog.classList.add('hidden');
  }
  if (arrow) arrow.classList.add('hidden');
  if (tutorialArrowInterval) {
    clearInterval(tutorialArrowInterval);
    clearTimeout(tutorialArrowInterval);
    tutorialArrowInterval = null;
  }
}

function pointArrowToElement(id, direction='top') {
  if (G.ui.screen !== 'game') return; // NUNCA mostrar seta fora da tela de jogo
  const el = gel(id);
  if (!el || el.offsetParent === null) {
    tutorialArrowInterval = setTimeout(() => pointArrowToElement(id, direction), 200);
    return;
  }
  const arrow = gel('tutorial-arrow');
  if (arrow) arrow.classList.remove('hidden');
  
  tutorialArrowInterval = setInterval(() => {
    if (G.ui.screen !== 'game') {
      clearInterval(tutorialArrowInterval);
      if (arrow) arrow.classList.add('hidden');
      return;
    }
    const rect = el.getBoundingClientRect();
    if (arrow) {
      arrow.style.left = (rect.left + rect.width / 2 - 20) + 'px';
      arrow.style.top = (rect.top - 50) + 'px';
      // Seta apontando pra baixo para o FAB
      arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="#00D4FF" width="40" height="40"><path d="M12 21l-8-8h5V3h6v10h5z"/></svg>`;
    }
  }, 50);
}

function pointArrowToBuildingCard(bldId) {
  const cards = document.querySelectorAll('.build-card-new, .troop-card-modern');
  let target = null;
  for (let c of cards) {
    if (c.dataset.type === bldId) { target = c; break; }
  }
  if (!target || target.offsetParent === null) {
    if (tutorialArrowInterval) { clearInterval(tutorialArrowInterval); clearTimeout(tutorialArrowInterval); tutorialArrowInterval = null; }
    tutorialArrowInterval = setTimeout(() => pointArrowToBuildingCard(bldId), 250);
    return;
  }
  const arrow = gel('tutorial-arrow');
  if (arrow) arrow.classList.remove('hidden');
  if (tutorialArrowInterval) { clearInterval(tutorialArrowInterval); tutorialArrowInterval = null; }
  tutorialArrowInterval = setInterval(() => {
    if (G.ui.screen !== 'game') {
      clearInterval(tutorialArrowInterval);
      if (arrow) arrow.classList.add('hidden');
      return;
    }
    const rect = target.getBoundingClientRect();
    if (arrow) {
      arrow.style.left = (rect.left + rect.width / 2 - 20) + 'px';
      arrow.style.top = (rect.top - 44) + 'px';
      arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="#00D4FF" width="40" height="40"><path d="M12 21l-8-8h5V3h6v10h5z"/></svg>`;
    }
  }, 60);
}

function pointArrowToGhost() {
  const arrow = gel('tutorial-arrow');
  if (arrow) arrow.classList.remove('hidden');

  if (tutorialArrowInterval) { clearInterval(tutorialArrowInterval); tutorialArrowInterval = null; }
  tutorialArrowInterval = setInterval(() => {
    if (G.ui.screen !== 'game' || (!G.ui.buildMode && !G.ui.moveMode)) {
      clearInterval(tutorialArrowInterval);
      if (arrow) arrow.classList.add('hidden');
      return;
    }
    // Track the ghost DOM element directly
    const ghost = gel('bld-ghost');
    if (ghost && ghost.style.display !== 'none') {
      const rect = ghost.getBoundingClientRect();
      if (arrow) {
        arrow.style.left = (rect.left + rect.width / 2 - 20) + 'px';
        arrow.style.top = (rect.top - 50) + 'px';
        arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="#00D4FF" width="40" height="40"><path d="M12 21l-8-8h5V3h6v10h5z"/></svg>`;
      }
    }
  }, 40);
}

function pointArrowToLastBuilding() {
  const b = G.base.buildings[G.base.buildings.length - 1];
  if (!b) return;
  pointArrowToBuilding(b.id);
}

function pointArrowToBuilding(bId) {
  const el = gel('bld-' + bId);
  if (!el || el.offsetParent === null) {
    if (tutorialArrowInterval) { clearInterval(tutorialArrowInterval); tutorialArrowInterval = null; }
    tutorialArrowInterval = setTimeout(() => pointArrowToBuilding(bId), 250);
    return;
  }
  const arrow = gel('tutorial-arrow');
  if (arrow) arrow.classList.remove('hidden');
  if (tutorialArrowInterval) { clearInterval(tutorialArrowInterval); tutorialArrowInterval = null; }
  tutorialArrowInterval = setInterval(() => {
    if (G.ui.screen !== 'game') {
      clearInterval(tutorialArrowInterval);
      if (arrow) arrow.classList.add('hidden');
      return;
    }
    const rect = el.getBoundingClientRect();
    if (arrow) {
      arrow.style.left = (rect.left + rect.width / 2 - 20) + 'px';
      arrow.style.top = (rect.top - 50) + 'px';
      arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="#00D4FF" width="40" height="40"><path d="M12 21l-8-8h5V3h6v10h5z"/></svg>`;
    }
  }, 60);
}

// ============================================================
// LABORATORY MODAL
// ============================================================
function showLabModal() {
  const ccLvl = getCurrentCCLevel();
  if (ccLvl < 3) { notify('O Laboratório requer CC nível 3!', 'error'); return; }
  
  const lab = G.base.buildings.find(b => b.type === 'laboratory');
  if (!lab) { notify('Construa o Laboratório primeiro!', 'error'); return; }
  if (bldInProgress(lab)) { notify('O Laboratório está sendo construído ou melhorado!', 'error'); return; }

  const labLvl = lab.level;

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
          <span class="lab-upg-cost"><img src="energy_icon.svg" class="inline-icon"> ${fmtNum(upg.energyCost)} <img src="mineral_icon.svg" class="inline-icon"> ${fmtNum(upg.mineralCost)}</span>
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
  console.log('Engine: Inciando...');
  spawnLoginStars();
  setLoadProgress(10);

  try {
    await preloadAssets();
    preloadExtraAssets(); // Background load levels 2+
    setLoadProgress(35);
  } catch (e) {
    console.error('Assets preload failed:', e);
    // Continue anyway to avoid hanging
  }
  
  const hasFirebase = initFirebase();
  console.log('Firebase status:', hasFirebase);

  if (!hasFirebase) {
    console.log('Modo: DEMO');
    createStarterBase();
    G.base.playerName = 'Demo';
    completeInitialization('demo');
    return;
  }

  let authResolved = false;

  // Timeout fallback — if auth never fires (e.g. network issue), go to login
  const authTimeout = setTimeout(() => {
    if (!authResolved) {
      console.warn('Auth timeout — redirecting to login');
      setLoadProgress(100);
      switchScreen('login');
    }
  }, 10000);

  G.auth.onAuthStateChanged(async user => {
    if (authResolved) return;
    authResolved = true;
    clearTimeout(authTimeout);

    console.log('Auth state change:', user ? user.uid : 'null');
    if (user) {
      G.user = user;
      G.pid  = user.uid;
      setLoadProgress(55);
      try {
        await loadData();
        G.base.ccLevel = getCurrentCCLevel();
        setLoadProgress(80);
        completeInitialization('online');
      } catch (e) {
        console.error('Failed to load user data:', e);
        createStarterBase();
        completeInitialization('error-fallback');
      }
    } else {
      updateUILanguage();
      setLoadProgress(100);
      setTimeout(() => switchScreen('login'), 500);
    }
  });
}

function completeInitialization(mode) {
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
    if (mode === 'demo') {
      notify('Modo demo: configure firebase-config.js para jogar online!', 'info');
    }
    if (!G.base.tutorialDone) setTimeout(showTutorial, 1000);
    console.log('Engine: Pronto (' + mode + ')');
  }, 600);
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

async function joinClan(clanId, clanName) {
  if (!G.db || !G.user) { notify('Firebase necessário.', 'error'); return; }
  if (G.base.clanId) { notify('Você já está em um clã!', 'error'); return; }
  
  try {
    const clanRef = G.db.collection('clans').doc(clanId);
    const doc = await clanRef.get();
    if (!doc.exists) { notify('Clã não encontrado.', 'error'); return; }
    
    const clanData = doc.data();
    if (clanData.members && clanData.members.length >= 20) {
      notify('Este clã já atingiu o limite de 20 membros!', 'error');
      return;
    }

    await clanRef.update({
      members: firebase.firestore.FieldValue.arrayUnion(G.pid)
    });
    G.base.clanId = clanId;
    G.base.clanName = clanName;
    await saveData();
    notify(t('clan_joined'), 'success');
    
    // Auto switch to My Clan tab in the new UI
    if (window.switchClanSubtab) window.switchClanSubtab('my');
    refreshSocialUI();
  } catch (e) { notify('Erro ao entrar no clã.', 'error'); }
}

async function leaveClan() {
  if (!G.db || !G.base.clanId) return;
  if (!confirm('Deseja mesmo sair do clã?')) return;
  try {
    const clanId = G.base.clanId;
    const clanRef = G.db.collection('clans').doc(clanId);
    const clanDoc = await clanRef.get();
    
    if (clanDoc.exists) {
      await clanRef.update({
        members: firebase.firestore.FieldValue.arrayRemove(G.pid)
      });
    }
  } catch (e) { 
    console.warn('Erro ao atualizar membros no Firestore, mas limpando localmente:', e);
  } finally {
    G.base.clanId = null;
    G.base.clanName = null;
    if (clanUnsubscribe) { clanUnsubscribe(); clanUnsubscribe = null; }
    await saveData();
    notify('Você saiu do clã.', 'info');
    refreshSocialUI();
  }
}

window.switchClanSubtab = function(sub) {
  document.querySelectorAll('#m-content-clan .s-subtab').forEach(t => t.classList.remove('active'));
  gel('cs-tab-' + sub)?.classList.add('active');

  document.querySelectorAll('#m-content-clan .social-sub-content').forEach(c => c.style.display = 'none');
  gel('cs-content-' + sub).style.display = 'block';

  if (sub === 'my') renderMyClanTab();
  if (sub === 'search') modernSearchClans();
};

window.renderMyClanTab = function() {
  refreshSocialUI();
};

window.modernSearchClans = async function() {
  if (!G.db) return;
  const input = gel('modern-clan-search-input');
  const query = input ? input.value.trim() : '';
  
  const resultEl = gel('modern-clan-search-results');
  if (!resultEl) return;
  
  resultEl.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Buscando Clãs...</div>';
  
  try {
    let q = G.db.collection('clans').limit(10);
    if (query) {
      q = G.db.collection('clans').where('name', '==', query).limit(10);
    }
    
    const snap = await q.get();
    let html = '';
    snap.forEach(doc => {
      const c = doc.data();
      const safeName = (c.name || 'Clã').replace(/'/g, "\\'");
      const isMember = (c.members || []).includes(G.pid);
      
      html += `
        <div class="social-player-card">
          <div class="sp-avatar" style="background:var(--c-gold); color:#000;">${(c.name || 'C')[0].toUpperCase()}</div>
          <div class="sp-info">
            <span class="sp-name">${c.name}</span>
            <span class="sp-meta">Membros: ${(c.members || []).length}</span>
          </div>
          <div class="sp-actions">
            ${isMember ? 
              `<button class="btn-sp-visit" disabled style="opacity:0.6;">JÁ É MEMBRO</button>` : 
              `<button class="btn-sp-visit" onclick="joinClan('${doc.id}', '${safeName}')">ENTRAR NO CLÃ</button>`
            }
          </div>
        </div>
      `;
    });
    resultEl.innerHTML = html || `<div style="text-align:center;padding:20px;color:#888;">Nenhum clã encontrado.</div>`;
  } catch (e) { 
    console.error(e);
    resultEl.innerHTML = '<div style="color:var(--c-danger);text-align:center;">Erro na busca.</div>'; 
  }
};

window.modernCreateClan = function() {
  const name = gel('modern-create-clan-input').value.trim();
  if (!name || name.length < 3) { notify('Nome muito curto!', 'error'); return; }
  
  createClan();
};

window.toggleClanChat = function() {
  if (!canAccessClans()) {
    notify('Chat do clã bloqueado!', 'error');
    return;
  }
  const overlay = gel('clan-chat-overlay');
  if (overlay.style.display === 'none' || !overlay.style.display) {
    overlay.style.display = 'flex';
    refreshSocialUI(); // Ensure chat is loaded
  } else {
    overlay.style.display = 'none';
  }
};

window.sendModernClanMessage = function() {
  const input = gel('clan-chat-input-modern');
  if (!input) return;
  
  // Envia a mensagem diretamente usando a lógica central
  sendClanMessage(input.value);
  input.value = '';
};

// Override existing renderers to use modern IDs
const oldRenderClanChat = window.renderClanChat;
window.renderClanChat = function(msgs) {
  const box = gel('clan-chat-box-modern');
  if (!box) return;
  box.innerHTML = msgs.map(m => {
    const isMine = m.senderId === G.pid;
    const nameColor = isMine ? '#00D4FF' : '#5D8AA8'; // Azul claro para mim, azul escuro para outros
    return `
      <div class="chat-msg ${isMine ? 'mine' : 'other'}" style="opacity:0.8; font-size:9px; margin-bottom:5px; padding:2px 0;">
        <div class="chat-msg-sender" style="color:${nameColor}; font-weight:bold; font-size:8.5px; margin-bottom:1px;">${m.senderName}</div>
        <div class="chat-msg-text" style="color:rgba(255,255,255,0.9); line-height:1.2;">${m.text}</div>
      </div>
    `;
  }).join('');
  box.scrollTop = box.scrollHeight;
};

async function refreshSocialUI() {
  if (!G.user) return;
  const clanId = G.base.clanId;
  const myClanActive = gel('my-clan-active');
  const myClanNone = gel('my-clan-none');
  
  if (clanId) {
    if (myClanActive) myClanActive.style.display = 'block';
    if (myClanNone) myClanNone.style.display = 'none';
    loadClanData(clanId);
    renderMyClanMembers(clanId);
    if (gel('active-clan-name-modern')) gel('active-clan-name-modern').textContent = G.base.clanName;
  } else {
    if (myClanActive) myClanActive.style.display = 'none';
    if (myClanNone) myClanNone.style.display = 'block';
  }
}

window.renderMyClanMembers = async function(clanId) {
  const list = gel('my-clan-members-list');
  if (!list || !G.db) return;
  
  try {
    const clanDoc = await G.db.collection('clans').doc(clanId).get();
    if (!clanDoc.exists) {
      console.warn('Clã não encontrado no Firestore. Limpando dados do usuário.');
      G.base.clanId = null;
      G.base.clanName = null;
      await saveData();
      refreshSocialUI();
      return;
    }
    const members = clanDoc.data().members || [];
    
    // In a real app we'd fetch all member details. For now, placeholders or stored data.
    list.innerHTML = `<div style="text-align:center;padding:10px;color:#888;">Carregando membros...</div>`;
    
    let html = '';
    for (const mid of members) {
      const userDoc = await G.db.collection('users').doc(mid).get();
      if (!userDoc.exists) continue;
      const p = userDoc.data() || { playerName: 'Membro', trophies: 0, ccLevel: 1 };
      const league = getLeague(p.trophies || 0);
      html += `
        <div class="social-player-card">
          <div class="sp-avatar" style="background:${league.color}">${(p.playerName || 'M')[0].toUpperCase()}</div>
          <div class="sp-info">
            <span class="sp-name">${p.playerName}${mid === G.pid ? ' (Você)' : ''}</span>
            <span class="sp-meta">CC Nível ${p.ccLevel || 1} <span>${league.name}</span></span>
          </div>
          <div class="sp-trophy">🏆 ${p.trophies || 0}</div>
        </div>
      `;
    }
    list.innerHTML = html || '<div style="text-align:center;padding:20px;color:#888;">Sem membros.</div>';
  } catch (e) { 
    console.error('Erro ao carregar membros do clã:', e);
    list.innerHTML = 'Erro ao carregar membros.'; 
  }
};

async function createClan() {
  const nameInput = gel('modern-create-clan-input') || gel('new-clan-name');
  if (!nameInput) return;
  const name = nameInput.value.trim();
  
  if (!name || name.length < 3) { notify('Nome muito curto! (Mínimo 3 letras)', 'error'); return; }
  if (!G.db) { notify('Firebase não configurado.', 'error'); return; }
  if (G.base.clanId) { notify('Você já está em um clã!', 'error'); return; }

  const minerals = G.base.resources?.mineral || 0;
  if (minerals < 1000) {
    notify('Minério insuficiente! (Custo: 1.000 <img src="mineral_icon.svg" class="inline-icon">)', 'error');
    return;
  }

  try {
    notify('Criando clã...', 'info');
    const clanRef = await G.db.collection('clans').add({
      name: name,
      owner: G.pid,
      members: [G.pid],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    G.base.resources.mineral -= 1000;
    G.base.clanId = clanRef.id;
    G.base.clanName = name;
    
    await saveData();
    notify('Clã criado com sucesso!', 'success');
    
    nameInput.value = '';
    
    if (window.switchClanSubtab) window.switchClanSubtab('my');
    refreshSocialUI();
    updateHUD();
  } catch (e) { 
    console.error('CreateClan Error:', e);
    notify('Erro na criação do clã.', 'error'); 
  }
}

async function loadClanData(clanId) {
  if (!G.db) return;
  gel('active-clan-name').textContent = G.base.clanName || 'Carregando...';
  if (window.clanUnsubscribe) window.clanUnsubscribe();
  window.clanUnsubscribe = G.db.collection('clans').doc(clanId).collection('messages')
    .orderBy('time', 'desc').limit(30)
    .onSnapshot(snap => {
      const msgs = [];
      snap.forEach(doc => msgs.push(doc.data()));
      renderClanChat(msgs.reverse());
    });
}

function renderClanChat(msgs) {
  window.renderClanChat(msgs);
}

async function sendClanMessage(forcedText) {
  const input = gel('clan-chat-input-modern') || gel('clan-chat-input');
  const text = (forcedText !== undefined) ? forcedText.trim() : (input ? input.value.trim() : '');
  
  if (!text || !G.base.clanId || !G.db) return;
  try {
    await G.db.collection('clans').doc(G.base.clanId).collection('messages').add({
      senderId: G.pid,
      senderName: G.base.playerName,
      text: text,
      time: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (input) input.value = '';
  } catch (e) { console.error(e); }
}

function enterVisitMode() {
  G.ui.screen = 'visit';
  const hud = gel('hud'); if (hud) hud.style.display = 'none';
  const fabGroup = gel('fab-group'); if (fabGroup) fabGroup.style.display = 'none';
  const visitName = gel('visit-player-name'); if (visitName) visitName.textContent = G.visiting.playerName || 'Colono';
  const visitCtrl = gel('visit-controls'); if (visitCtrl) visitCtrl.style.display = 'flex';
  buildTerrain();
  renderBuildingsLayer(G.visiting.buildings);
  centerMap();
}

function returnToHome() {
  G.visiting = null; G.ui.screen = 'game';
  const hud = gel('hud'); if (hud) hud.style.display = 'flex';
  const fabGroup = gel('fab-group'); if (fabGroup) fabGroup.style.display = 'flex';
  const visitCtrl = gel('visit-controls'); if (visitCtrl) visitCtrl.style.display = 'none';
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

function centerMap() {
  const mc = gel('map-container'); if (!mc) return;
  mc.scrollLeft = (GRID_W * CELL_SIZE - mc.clientWidth)  / 2;
  mc.scrollTop  = (GRID_H * CELL_SIZE - mc.clientHeight) / 2;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}



/* ========== UNIFIED MODERN MODAL LOGIC ========== */
function canAccessClans() {
  const ccLvl = getCurrentCCLevel();
  const hasClanTower = (G.base.buildings || []).some(b => b.type === 'clan_tower' && !bldInProgress(b));
  return ccLvl >= 4 && hasClanTower;
}

window.openUnifiedModal = function(initialTab = 'profile') {
  gel('unified-modal').classList.add('visible');
  switchModernTab(initialTab);
};

window.closeUnifiedModal = function() {
  gel('unified-modal').classList.remove('visible');
};

window.switchModernTab = function(tab) {
  if (tab === 'clan' && !canAccessClans()) {
    notify('Acesso bloqueado! Requer CC Nível 4 e Torre do Clã construída.', 'error');
    switchModernTab('profile');
    return;
  }

  document.querySelectorAll('.m-tab').forEach(t => t.classList.remove('active'));
  gel('tab-m-' + tab)?.classList.add('active');

  document.querySelectorAll('.modern-tab-content').forEach(c => c.style.display = 'none');
  gel('m-content-' + tab).style.display = 'block';

  if (tab === 'profile') updateModernProfileUI();
  if (tab === 'social') switchSocialSubtab('search');
  if (tab === 'clan') switchClanSubtab('my');
};

window.updateModernProfileUI = function() {
  const grid = gel('m-profile-grid');
  const storage = gel('m-profile-storage');
  if (!grid || !storage) return;

  const ccLvl = getCurrentCCLevel();
  const isAdmin = G.user?.email === 'admin@colonyclash.com';
  const league = getLeague(G.base.trophies);



  // Left & Center
  grid.innerHTML = `
    <div class="profile-left">
      <div class="profile-cc-lvl">CC Nível ${ccLvl}</div>
      <img src="cc_lvl${ccLvl}.png" class="profile-cc-img">
      <div class="profile-uid-row">
        <span class="p-uid-text">UID: ${G.pid}</span>
        <button class="btn-copy-uid" onclick="copyUID()">COPIAR UID</button>
      </div>
    </div>
    <div class="profile-center">
      <div class="profile-user-row">
        <span class="profile-name">${G.base.playerName || 'Colono'}</span>
        <div class="profile-gems-badge"><img src="gems_icon.svg" class="inline-icon"> ${G.base.gems || 0}</div>
      </div>
      <div class="profile-clan-box">
        <div class="p-clan-avatar">${(G.base.clanName || 'C')[0].toUpperCase()}</div>
        <div class="p-clan-info">
          <span class="p-clan-name">${G.base.clanName || 'Nenhum Clã'}</span>
          <span class="p-clan-mems">${G.base.clanId ? 'Membro Ativo' : 'Sem membros'}</span>
        </div>
      </div>
      ${isAdmin ? `<button class="btn-admin-panel" onclick="document.getElementById('admin-panel').classList.remove('hidden'); closeUnifiedModal();">ABRIR PAINEL ADMIN</button>` : ''}
    </div>
    <div class="profile-right">
      <span class="p-league-label">LIGA ATUAL</span>
      <span class="p-league-name" style="color:${league.color}">${league.name}</span>
      <div class="p-trophy-badge">🏆 ${G.base.trophies || 0}</div>
    </div>
  `;

  // Storage
  const blds = G.base.buildings || [];
  const res = G.base.resources || { mineral: 0, oxygen: 0, energy: 0 };
  const caps = {
    mineral: getStorageCapacity(blds, 'mineral'),
    oxygen: getStorageCapacity(blds, 'oxygen'),
    energy: getStorageCapacity(blds, 'energy')
  };

  storage.innerHTML = `
    <div class="p-storage-title">ARMAZENAMENTO</div>
    ${['mineral', 'oxygen', 'energy'].map(type => {
      const pct = Math.min(100, (res[type] / caps[type]) * 100);
      const color = type === 'mineral' ? 'var(--c-mineral)' : type === 'oxygen' ? 'var(--c-oxygen)' : 'var(--c-energy)';
      return `
        <div class="p-storage-row">
          <span class="ps-label">${t(type)}</span>
          <div class="ps-bar-wrap">
            <div class="ps-bar-fill" style="width:${pct}%; background:${color}"></div>
          </div>
          <span class="ps-val" style="color:${color}">${fmtNum(res[type])} / ${fmtNum(caps[type])}</span>
        </div>
      `;
    }).join('')}
  `;
};

window.switchSocialSubtab = function(sub) {
  document.querySelectorAll('.s-subtab').forEach(t => t.classList.remove('active'));
  gel('ss-tab-' + sub)?.classList.add('active');

  document.querySelectorAll('.social-sub-content').forEach(c => c.style.display = 'none');
  gel('ss-content-' + sub).style.display = 'block';

  if (sub === 'friends') renderModernFriendsList();
};

window.modernSearchPlayers = async function() {
  const query = gel('modern-search-input').value.trim();
  if (!query || !G.db) return;
  
  const results = gel('modern-search-results');
  results.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Buscando...</div>';
  
  try {
    // USER REQUEST: Buscar por nome OU por UID
    let snap = await G.db.collection('users').where('playerName', '==', query).limit(10).get();
    
    // Se não achou por nome, tenta por UID
    if (snap.empty) {
      const doc = await G.db.collection('users').doc(query).get();
      if (doc.exists) {
        // Criar um "mock" de snapshot
        snap = { docs: [doc], forEach: (cb) => cb(doc) };
      }
    }

    let html = '';
    snap.forEach(doc => {
      const p = doc.data();
      if (doc.id === G.pid) return;
      const pName = p.playerName || 'Colono';
      const league = getLeague(p.trophies || 0);
      html += `
        <div class="social-player-card">
          <div class="sp-avatar" style="background:${league.color}">${pName[0].toUpperCase()}</div>
          <div class="sp-info">
            <span class="sp-name">${pName}</span>
            <span class="sp-meta">CC Nível ${p.ccLevel || 1} <span>${league.name}</span></span>
            <span style="font-size:9px; color:#666;">UID: ${doc.id}</span>
          </div>
          <div class="sp-actions">
            <button class="btn-sp-visit" onclick="visitPlayer('${doc.id}')">VISITAR</button>
            <button class="btn-sp-add" onclick="addFriend('${doc.id}', '${pName.replace(/'/g, "\\'")}')">ADD AMIGO</button>
          </div>
        </div>
      `;
    });
    results.innerHTML = html || `<div style="text-align:center;padding:20px;color:#888;">${t('no_results')}</div>`;
  } catch (e) { results.innerHTML = '<div style="text-align:center;padding:20px;color:#FF4466;">Erro na busca.</div>'; }
};

window.renderModernFriendsList = function() {
  const list = gel('modern-friends-list');
  if (!list) return;
  const friends = G.base.friends || [];
  
  if (friends.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Sua lista de amigos está vazia.</div>';
    return;
  }

  // Note: For a real app, you'd fetch latest trophies/CC for each friend. 
  // Here we use stored data or placeholders for simplicity in this turn.
  list.innerHTML = friends.map(f => `
    <div class="social-player-card">
      <div class="sp-avatar">${(f.name || 'C')[0].toUpperCase()}</div>
      <div class="sp-info">
        <span class="sp-name">${f.name}</span>
        <span class="sp-meta">CC Nível ? <span>Amigo</span></span>
      </div>
      <div class="sp-trophy">🏆 ${f.trophies || '?'}</div>
      <button class="btn-sp-visit" onclick="visitPlayer('${f.id}')">VISITAR</button>
    </div>
  `).join('');
};



window.copyUID = function() {
  navigator.clipboard.writeText(G.pid).then(() => {
    notify('UID copiado para a área de transferência!', 'success');
  });
};

window.resetTutorial = function() {
  if (!confirm(t('confirm_reset_tutorial'))) return;
  G.base.tutorialStep = 0;
  G.base.tutorialDone = false;
  closePanels();
  saveData();
  showTutorial();
  notify("Tutorial reiniciado!", "success");
};

// Override old functions to close the new modal
const oldVisitPlayer = window.visitPlayer;
window.visitPlayer = async function(pid) {
  closeUnifiedModal();
  if (typeof visitPlayer === 'function') {
     // Use the existing global visitPlayer logic
     const results = await G.db.collection('users').doc(pid).get();
     if (results.exists) {
        const data = results.data();
        G.visiting = { pid, playerName: data.playerName, buildings: data.buildings || [] };
        enterVisitMode();
     }
  }
};

window.addEventListener('resize', () => {
  if (G.battle && G.ui.screen === 'attack' && bCanvas) {
    const container = gel('battle-container');
    if (container) {
      bCanvas.width = container.clientWidth;
      bCanvas.height = container.clientHeight;
    }
  }
});

function showCCPath() {
  const ccDef = BUILDINGS.command_center;
  const currentLvl = getCurrentCCLevel();
  const body = gel('cc-path-body');
  if (!body) return;

  let html = '';
  for (let i = 1; i <= ccDef.maxLevel; i++) {
    const lvl = ccDef.levels[i];
    const isCurrent = i === currentLvl;
    
    html += `
      <div class="cc-path-item ${isCurrent ? 'current' : ''}">
        ${isCurrent ? '<div style="position:absolute; top:10px; right:15px; font-size:10px; color:var(--c-gold); font-weight:bold;">ATUAL</div>' : ''}
        <div class="cc-path-header">
          <div class="cc-path-lvl">${t('command_center')} Nível ${i}</div>
        </div>
        <div class="cc-path-unlocks">
          <div class="cc-path-novelty">✨ ${lvl.novelty || 'Novas tecnologias'}</div>
          <p style="margin:5px 0;">HP: ${lvl.hp} · ${lvl.desc}</p>
          <div class="cc-path-list">
            <div class="cc-unlock-tag">🪖 ${lvl.unlocks.troop_unlock.map(t).join(', ')}</div>
            <div class="cc-unlock-tag">🏗️ Nív. Máx Edifícios: ${lvl.unlocks.max_building_level}</div>
            <div class="cc-unlock-tag">⚒️ Quartel Máx: ${lvl.unlocks.barracks_max_level}</div>
          </div>
          <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:5px;">
            ${Object.entries(lvl.unlocks.buildings).map(([type, count]) => {
              if (count === 0) return '';
              return `<span class="cc-bld-tag">${count}x ${t(type)}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  body.innerHTML = html;
  gel('cc-path-modal').classList.add('visible');
}
