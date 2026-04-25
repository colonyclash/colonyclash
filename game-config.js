'use strict';
// ============================================================
// COLONY CLASH - Game Configuration
// ============================================================

const CELL_SIZE = 68;
const GRID_W = 22;
const GRID_H = 22;

// ---- Building Definitions ----
const BUILDINGS = {
  command_center: {
    id: 'command_center', name: 'Centro de Comando',
    size: 2, isDefense: false, isResource: false,
    maxLevel: 3,
    levels: [null,
      {
        hp: 2500, buildTime: 10, cost: { mineral: 0, oxygen: 0 },
        theme: 'iron', desc: 'O coração da sua colônia lunar. Tema: Ferro.',
        unlocks: {
          buildings: {
            mineral_extractor: 2, oxygen_extractor: 2, solar_panel: 1,
            barracks: 1, camp: 1, turret: 2,
            mineral_storage: 1, oxygen_storage: 1, energy_storage: 1
          },
          barracks_max_level: 1,
          troop_unlock: ['drone'],
          max_building_level: 1
        }
      },
      {
        hp: 4000, buildTime: 900, cost: { mineral: 5000, oxygen: 2500 },
        theme: 'energy', desc: 'Centro expandido com núcleo de energia. Tema: Energia.',
        unlocks: {
          buildings: {
            mineral_extractor: 3, oxygen_extractor: 3, solar_panel: 2,
            barracks: 1, camp: 2, turret: 3,
            mineral_storage: 2, oxygen_storage: 2, energy_storage: 2
          },
          barracks_max_level: 2,
          troop_unlock: ['drone', 'robot'],
          max_building_level: 2
        }
      },
      {
        hp: 6000, buildTime: 1800, cost: { mineral: 15000, oxygen: 8000 },
        theme: 'gold', desc: 'Supremo centro de comando banhado a ouro. Tema: Ouro.',
        unlocks: {
          buildings: {
            mineral_extractor: 4, oxygen_extractor: 4, solar_panel: 3,
            barracks: 1, camp: 3, turret: 4, laboratory: 1, railgun: 1,
            mineral_storage: 2, oxygen_storage: 2, energy_storage: 2
          },
          barracks_max_level: 3,
          troop_unlock: ['drone', 'robot', 'tank'],
          max_building_level: 3
        }
      }
    ],
    getAsset: (lvl) => `cc_lvl${lvl}.png`,
  },
  mineral_extractor: {
    id: 'mineral_extractor', name: 'Extrator de Minério',
    size: 1, isDefense: false, isResource: true, resourceType: 'mineral',
    maxLevel: 3,
    levels: [null,
      { hp: 400, buildTime: 10,  cost: { mineral: 100,  oxygen: 0    }, production: 8,  desc: 'Extrai minério do subsolo lunar.' },
      { hp: 600, buildTime: 900,  cost: { mineral: 800,  oxygen: 300  }, production: 20, desc: 'Perfuração aprimorada com sensores sísmicos.' },
      { hp: 900, buildTime: 1800, cost: { mineral: 4000, oxygen: 1500 }, production: 45, desc: 'Extração de alta intensidade com IA integrada.' }
    ],
    getAsset: (lvl) => `mineral_extractor_lvl${lvl}.png`,
  },
  oxygen_extractor: {
    id: 'oxygen_extractor', name: 'Extrator de Oxigênio',
    size: 1, isDefense: false, isResource: true, resourceType: 'oxygen',
    maxLevel: 3,
    levels: [null,
      { hp: 350, buildTime: 10,  cost: { mineral: 150,  oxygen: 0    }, production: 6,  desc: 'Extrai oxigênio do regolito lunar.' },
      { hp: 550, buildTime: 900,  cost: { mineral: 1200, oxygen: 500  }, production: 15, desc: 'Filtros de alta eficiência com dupla câmara.' },
      { hp: 800, buildTime: 1800, cost: { mineral: 6000, oxygen: 2500 }, production: 35, desc: 'Eletrólise lunar avançada com rendimento máximo.' }
    ],
    getAsset: (lvl) => `oxygen_extractor_lvl${lvl}.png`,
  },
  solar_panel: {
    id: 'solar_panel', name: 'Painel Solar',
    size: 1, isDefense: false, isResource: true, resourceType: 'energy',
    maxLevel: 3,
    levels: [null,
      { hp: 200, buildTime: 10,  cost: { mineral: 200,  oxygen: 100  }, production: 40,  desc: 'Energia solar máxima sem atmosfera.' },
      { hp: 350, buildTime: 900,  cost: { mineral: 1500, oxygen: 600  }, production: 90,  desc: 'Painel de alta voltagem com rastreamento solar.' },
      { hp: 500, buildTime: 1800, cost: { mineral: 5000, oxygen: 2000 }, production: 200, desc: 'Megapainel fotovoltaico de fusão quântica.' }
    ],
    getAsset: (lvl) => `solar_panel_lvl${lvl}.png`,
  },
  barracks: {
    id: 'barracks', name: 'Quartel',
    size: 1, isDefense: false, isResource: false,
    maxLevel: 3,
    levels: [null,
      { hp: 500,  buildTime: 10,  cost: { mineral: 500,   oxygen: 200  }, desc: 'Treina Drones de combate.',                    availableTroops: ['drone'] },
      { hp: 750,  buildTime: 900,  cost: { mineral: 3000,  oxygen: 1200 }, desc: 'Treina Drones e Robôs de batalha.',            availableTroops: ['drone', 'robot'] },
      { hp: 1000, buildTime: 1800, cost: { mineral: 10000, oxygen: 4000 }, desc: 'Treina todas as tropas, incluindo Tanques.', availableTroops: ['drone', 'robot', 'tank'] }
    ],
    getAsset: (lvl) => `barracks_lvl${lvl}.png`,
  },
  camp: {
    id: 'camp', name: 'Acampamento',
    size: 1, isDefense: false, isResource: false,
    maxLevel: 3,
    levels: [null,
      { hp: 300, buildTime: 10,  cost: { mineral: 250,  oxygen: 100  }, capacity: 10, desc: 'Acomoda até 10 unidades de tropa.' },
      { hp: 450, buildTime: 900,  cost: { mineral: 1500, oxygen: 600  }, capacity: 15, desc: 'Acomoda até 15 unidades de tropa.' },
      { hp: 650, buildTime: 1800, cost: { mineral: 5000, oxygen: 2000 }, capacity: 20, desc: 'Acomoda até 20 unidades de tropa.' }
    ],
    getAsset: (lvl) => `camp_lvl${lvl}.png`,
  },
  turret: {
    id: 'turret', name: 'Torreta',
    size: 1, isDefense: true, isResource: false,
    maxLevel: 3,
    levels: [null,
      { hp: 600,  buildTime: 10,  cost: { mineral: 700,   oxygen: 300  }, damage: 25,  range: 3, rate: 1.0, desc: 'Defesa automática de curto alcance.' },
      { hp: 900,  buildTime: 900,  cost: { mineral: 4000,  oxygen: 1500 }, damage: 55,  range: 4, rate: 0.8, desc: 'Torreta aprimorada com mira assistida.' },
      { hp: 1200, buildTime: 1800, cost: { mineral: 12000, oxygen: 5000 }, damage: 100, range: 5, rate: 0.6, desc: 'Torreta de plasma de alta cadência.' }
    ],
    getAsset: (lvl) => `defense_turret_lvl${lvl}.png`,
  },
  laboratory: {
    id: 'laboratory', name: 'Laboratório',
    size: 1, isDefense: false, isResource: false,
    isLaboratory: true,
    maxLevel: 3,
    levels: [null,
      { hp: 800,  buildTime: 10,  cost: { mineral: 15000, oxygen: 7000  }, desc: 'Pesquisa melhorias básicas para suas tropas. (Requer CC3)' },
      { hp: 1000, buildTime: 900,  cost: { mineral: 30000, oxygen: 15000 }, desc: 'Laboratório avançado. Melhorias de nível 2. (Requer CC3)' },
      { hp: 1400, buildTime: 1800, cost: { mineral: 60000, oxygen: 30000 }, desc: 'Laboratório supremo. Melhorias de nível 3. (Requer CC3)' }
    ],
    getAsset: (lvl) => `laboratory_lvl${lvl}.png`,
  },
  railgun: {
    id: 'railgun', name: 'Railgun',
    size: 1, isDefense: true, isResource: false,
    maxLevel: 3,
    levels: [null,
      { hp: 1200, buildTime: 10,  cost: { mineral: 25000, oxygen: 10000 }, damage: 300, range: 8, rate: 0.25, desc: 'Canhão eletromagnético de longo alcance.' },
      { hp: 1800, buildTime: 900,  cost: { mineral: 50000, oxygen: 20000 }, damage: 500, range: 9, rate: 0.30, desc: 'Railgun aprimorado de alta precisão.' },
      { hp: 2400, buildTime: 1800, cost: { mineral: 90000, oxygen: 40000 }, damage: 800, range: 10, rate: 0.40, desc: 'Railgun supremo com mira quântica.' }
    ],
    getAsset: (lvl) => `turret_railgun_lvl${lvl}.png`,
  },
  // ---- STORAGES ----
  mineral_storage: {
    id: 'mineral_storage', name: 'Armazém de Minério',
    size: 1, isDefense: false, isResource: false, isStorage: true, storageType: 'mineral',
    maxLevel: 3,
    levels: [null,
      { hp: 500, buildTime: 10,  cost: { mineral: 300,  oxygen: 0   }, storageBonus: 3000,  desc: '+3.000 de capacidade de minério.' },
      { hp: 700, buildTime: 900,  cost: { mineral: 2000, oxygen: 500 }, storageBonus: 6000,  desc: '+6.000 de capacidade de minério.' },
      { hp: 950, buildTime: 1800, cost: { mineral: 8000, oxygen: 2000 }, storageBonus: 12000, desc: '+12.000 de capacidade de minério.' }
    ],
    getAsset: (lvl) => `mineral_storage_lvl${lvl}.png`,
  },
  oxygen_storage: {
    id: 'oxygen_storage', name: 'Armazém de Oxigênio',
    size: 1, isDefense: false, isResource: false, isStorage: true, storageType: 'oxygen',
    maxLevel: 3,
    levels: [null,
      { hp: 500, buildTime: 10,  cost: { mineral: 300,  oxygen: 0   }, storageBonus: 3000,  desc: '+3.000 de capacidade de oxigênio.' },
      { hp: 700, buildTime: 900,  cost: { mineral: 2000, oxygen: 500 }, storageBonus: 6000,  desc: '+6.000 de capacidade de oxigênio.' },
      { hp: 950, buildTime: 1800, cost: { mineral: 8000, oxygen: 2000 }, storageBonus: 12000, desc: '+12.000 de capacidade de oxigênio.' }
    ],
    getAsset: (lvl) => `oxygen_storage_lvl${lvl}.png`,
  },
  energy_storage: {
    id: 'energy_storage', name: 'Armazém de Energia',
    size: 1, isDefense: false, isResource: false, isStorage: true, storageType: 'energy',
    maxLevel: 3,
    levels: [null,
      { hp: 500, buildTime: 10,  cost: { mineral: 300,  oxygen: 0   }, storageBonus: 3000,  desc: '+3.000 de capacidade de energia.' },
      { hp: 700, buildTime: 900,  cost: { mineral: 2000, oxygen: 500 }, storageBonus: 6000,  desc: '+6.000 de capacidade de energia.' },
      { hp: 950, buildTime: 1800, cost: { mineral: 8000, oxygen: 2000 }, storageBonus: 12000, desc: '+12.000 de capacidade de energia.' }
    ],
    getAsset: (lvl) => `energy_storage_lvl${lvl}.png`,
  },
  lunar_rock: {
    id: 'lunar_rock', name: 'Rocha Lunar',
    size: 1, isDefense: false, isResource: false, isObstacle: true,
    maxLevel: 1,
    levels: [null,
      { hp: 10, buildTime: 0, cost: { mineral: 100 }, desc: 'Uma rocha lunar obstruindo o terreno. Remova para ganhar recompensas.' }
    ],
    getAsset: (lvl, id) => {
      const n = (id ? (parseInt(id.toString().slice(-4), 36) % 3) : 0) + 1;
      return `lunar_rock${n}.png`;
    }
  }
};

// ---- Troop Research Upgrades ----
const TROOP_UPGRADES = {
  drone: {
    name: 'Drone',
    emoji: '🛸',
    upgrades: [
      { level: 1, name: 'Reforço de Blindagem',    energyCost: 500,  mineralCost: 2000, desc: 'Drone com +20% de HP.',       stat: 'hp',     bonus: 0.20, labLevel: 1 },
      { level: 2, name: 'Atirador Aprimorado',     energyCost: 1000, mineralCost: 5000, desc: 'Drone com +30% de dano.',     stat: 'damage', bonus: 0.30, labLevel: 1 },
      { level: 3, name: 'Propulsão Quântica',      energyCost: 2000, mineralCost: 10000, desc: 'Drone com +50% de velocidade.', stat: 'speed', bonus: 0.50, labLevel: 2 }
    ]
  },
  robot: {
    name: 'Robô',
    emoji: '🤖',
    upgrades: [
      { level: 1, name: 'Núcleo de Titânio',      energyCost: 800,  mineralCost: 3000, desc: 'Robô com +25% de HP.',        stat: 'hp',     bonus: 0.25, labLevel: 1 },
      { level: 2, name: 'Punhos de Plasma',        energyCost: 1500, mineralCost: 7000, desc: 'Robô com +35% de dano.',      stat: 'damage', bonus: 0.35, labLevel: 2 },
      { level: 3, name: 'Modo Berserk',            energyCost: 3000, mineralCost: 15000, desc: 'Robô com +40% de velocidade.', stat: 'speed', bonus: 0.40, labLevel: 3 }
    ]
  },
  tank: {
    name: 'Tanque',
    emoji: '🚀',
    upgrades: [
      { level: 1, name: 'Blindagem Reforçada',     energyCost: 1200, mineralCost: 5000, desc: 'Tanque com +30% de HP.',      stat: 'hp',     bonus: 0.30, labLevel: 1 },
      { level: 2, name: 'Canhão Orbital',          energyCost: 2500, mineralCost: 12000, desc: 'Tanque com +40% de dano.',   stat: 'damage', bonus: 0.40, labLevel: 2 },
      { level: 3, name: 'Motor de Fusão',          energyCost: 5000, mineralCost: 25000, desc: 'Tanque com +25% de velocidade.', stat: 'speed', bonus: 0.25, labLevel: 3 }
    ]
  }
};

// ---- Troop Definitions ----
const TROOPS = {
  drone: {
    id: 'drone', name: 'Drone', space: 1,
    hp: 100, damage: 20, speed: 2.0, range: 1.4, trainTime: 30,
    cost: { mineral: 60, oxygen: 30 },
    color: '#00BFFF', emoji: '🛸',
    desc: 'Rápido e ágil. Prioridade: defesas.',
    priority: 'defense'
  },
  robot: {
    id: 'robot', name: 'Robô', space: 2,
    hp: 300, damage: 60, speed: 1.2, range: 1.2, trainTime: 120,
    cost: { mineral: 200, oxygen: 120 },
    color: '#9B59B6', emoji: '🤖',
    desc: 'Resistente. Ataca qualquer estrutura.',
    priority: 'any'
  },
  tank: {
    id: 'tank', name: 'Tanque', space: 5,
    hp: 1000, damage: 200, speed: 0.6, range: 2.0, trainTime: 300,
    cost: { mineral: 800, oxygen: 500 },
    color: '#E67E22', emoji: '🚀',
    desc: 'Blindado e devastador. Prioridade: recursos.',
    priority: 'resource'
  }
};

// ---- Helper Functions ----
function getCCLevel(buildings) {
  const cc = (buildings || []).find(b => b.type === 'command_center');
  return cc ? cc.level : 1;
}

function getCountOf(buildings, type) {
  return (buildings || []).filter(b => b.type === type).length;
}

function getUnlocksForCC(ccLvl) {
  return BUILDINGS.command_center.levels[ccLvl]?.unlocks || {};
}

function getMaxAllowed(buildings, type) {
  const ccLvl = getCCLevel(buildings);
  return getUnlocksForCC(ccLvl).buildings?.[type] || 0;
}

function canBuildMore(buildings, type) {
  if (type === 'command_center') return false;
  return getCountOf(buildings, type) < getMaxAllowed(buildings, type);
}

function getTotalCampCapacity(buildings) {
  let total = 0;
  for (const b of (buildings || [])) {
    if (b.type === 'camp' && !isBuildingInProgress(b)) {
      total += BUILDINGS.camp.levels[b.level]?.capacity || 0;
    }
  }
  return total;
}

function getTotalTroopSpace(troops) {
  let total = 0;
  for (const [type, count] of Object.entries(troops || {})) {
    total += (TROOPS[type]?.space || 0) * (count || 0);
  }
  return total;
}

function getBarracksLevel(buildings) {
  const b = (buildings || []).find(b => b.type === 'barracks' && !isBuildingInProgress(b));
  return b ? b.level : 0;
}

function getAvailableTroops(buildings) {
  const lvl = getBarracksLevel(buildings);
  if (!lvl) return [];
  return BUILDINGS.barracks.levels[lvl]?.availableTroops || [];
}

function isBuildingInProgress(b) {
  return (b.buildFinish && b.buildFinish > Date.now()) ||
         (b.upgradeFinish && b.upgradeFinish > Date.now());
}

// ---- Storage Capacity Helpers ----
function getStorageCapacity(buildings, type) {
  // Base capacity from CC level
  const ccLvl = getCCLevel(buildings);
  // USER REQUEST: Mineral 5000, Oxygen 3000, Energy 2000 at level 1
  const baseMin = 5000 * ccLvl;
  const baseOxy = 3000 * ccLvl;
  const baseEne = 2000 * ccLvl;

  let bonus = 0;
  const storageType = type + '_storage';
  for (const b of (buildings || [])) {
    if (b.type === storageType && !isBuildingInProgress(b)) {
      bonus += BUILDINGS[storageType]?.levels[b.level]?.storageBonus || 0;
    }
  }
  if (type === 'mineral') return baseMin + bonus;
  if (type === 'oxygen')  return baseOxy + bonus;
  if (type === 'energy')  return baseEne + bonus;
  return 0;
}

function getLaboratoryLevel(buildings) {
  const b = (buildings || []).find(b => b.type === 'laboratory' && !isBuildingInProgress(b));
  return b ? b.level : 0;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function fmtNum(n) {
  n = Math.floor(n || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

function fmtTime(s) {
  s = Math.ceil(s);
  if (s <= 0) return '0s';
  if (s < 60) return s + 's';
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60 > 0 ? s % 60 + 's' : ''}`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60) > 0 ? Math.floor((s % 3600) / 60) + 'm' : ''}`;
}

// ---- League System ----
const LEAGUES = [
  { id: 0, name: 'Ferro',    emoji: '⚙️',  min: 0,    max: 399,   color: '#9E9E9E', gemReward: 0,    shieldHours: 8  },
  { id: 1, name: 'Bronze',   emoji: '🥉',  min: 400,  max: 799,   color: '#CD7F32', gemReward: 20,   shieldHours: 10 },
  { id: 2, name: 'Prata',    emoji: '🥈',  min: 800,  max: 1299,  color: '#C0C0C0', gemReward: 50,   shieldHours: 10 },
  { id: 3, name: 'Ouro',     emoji: '🥇',  min: 1300, max: 1999,  color: '#FFD700', gemReward: 100,  shieldHours: 12 },
  { id: 4, name: 'Platina',  emoji: '💠',  min: 2000, max: 2999,  color: '#00D4FF', gemReward: 200,  shieldHours: 12 },
  { id: 5, name: 'Diamante', emoji: '💎',  min: 3000, max: 4499,  color: '#B9F2FF', gemReward: 500,  shieldHours: 14 },
  { id: 6, name: 'Lendário', emoji: '👑',  min: 4500, max: Infinity, color: '#FF8C00', gemReward: 1000, shieldHours: 16 }
];

function getLeague(trophies) {
  let league = LEAGUES[0];
  for (const l of LEAGUES) { if ((trophies || 0) >= l.min) league = l; else break; }
  return league;
}

function getLeagueById(id) { return LEAGUES[id] || LEAGUES[0]; }

// Matchmaking range: ±200 trophies, min 3 opponents
function getMatchmakingRange(trophies) {
  return { min: Math.max(0, trophies - 200), max: trophies + 200 };
}

// ---- Internationalization (i18n) ----
const TRANSLATIONS = {
  pt: {
    lang_name: "Português",
    loading: "Carregando",
    conquer_moon: "Conquiste a Lua",
    login: "Entrar",
    register: "Cadastrar",
    email: "E-mail",
    password: "Senha",
    username: "Nome de usuário",
    confirm_password: "Confirmar senha",
    create_account: "CRIAR CONTA",
    or: "ou",
    login_google: "Entrar com Google",
    colono: "Colono",
    build: "BUILD",
    attack: "ATTACK",
    troops: "TROOPS",
    shop: "LOJA",
    profile: "PERFIL",
    settings: "CONFIG",
    available_buildings: "🏗️ Construções Disponíveis",
    manage_troops: "🪖 Gerenciar Tropas",
    capacity: "Capacidade",
    in_training: "Em Treinamento",
    information: "📊 Informações",
    crystal_shop: "💎 Loja de Cristais",
    shop_desc: "Cristais permitem acelerar construções e tropas. Em breve compra disponível!",
    upgrade: "⬆ Melhorar",
    laboratory: "🔬 Laboratório",
    speedup: "⚡ ACELERAR",
    move: "↔ Mover",
    destroy: "🗑 Remover",
    confirm: "CONFIRMAR",
    cancel: "CANCELAR",
    search_opponent: "⚔️ Busca de Oponente",
    back: "← Voltar",
    battle_label: "⚔️ BATALHA LUNAR",
    deploy_tip: "Selecione uma tropa e toque no mapa",
    victory: "VITÓRIA",
    defeat: "DERROTA",
    continue: "CONTINUAR",
    admin_panel: "🛡️ PAINEL ADMIN",
    fill_resources: "Ganhar 1 Bilhão de Recursos",
    max_cc: "Elevar CC p/ Nível Máximo",
    assign_player: "ATRIBUIR A JOGADOR",
    send: "ENVIAR",
    close: "FECHAR",
    welcome: "BEM-VINDO À COLÔNIA LUNAR!",
    tutorial_start: "ENTENDIDO — COMEÇAR! 🚀",
    tutorial_tip: "💡 Dica: Construa Armazéns para aumentar sua capacidade de recursos!",
    lab_title: "LABORATÓRIO — Pesquisa de Tropas",
    lang_select: "Idioma",
    logout: "Sair da Conta",
    level: "Nível",
    hp: "Vida",
    cost: "Custo",
    time: "Tempo",
    theme: "Tema",
    building: "Construindo",
    upgrading: "Melhorando",
    storage: "Armazenamento",
    mineral: "Minério",
    oxygen: "Oxigênio",
    energy: "Energia",
    buildings: "Construções",
    ferro: "Ferro",
    bronze: "Bronze",
    prata: "Prata",
    ouro: "Ouro",
    platina: "Platina",
    diamante: "Diamante",
    lendario: "Lendário",
    command_center: "Centro de Comando",
    command_center_desc: "O coração da sua colônia lunar.",
    mineral_extractor: "Extrator de Minério",
    mineral_extractor_desc: "Extrai minério do subsolo lunar.",
    oxygen_extractor: "Extrator de Oxigênio",
    oxygen_extractor_desc: "Extrai oxigênio do regolito lunar.",
    solar_panel: "Painel Solar",
    solar_panel_desc: "Energia solar máxima sem atmosfera.",
    barracks: "Quartel",
    barracks_desc: "Treina tropas para o combate.",
    camp: "Acampamento",
    camp_desc: "Acomoda unidades de tropa.",
    turret: "Torreta",
    turret_desc: "Defesa automática de curto alcance.",
    laboratory_desc: "Pesquisa melhorias para tropas.",
    railgun: "Railgun",
    railgun_desc: "Canhão eletromagnético de longo alcance.",
    mineral_storage: "Armazém de Minério",
    mineral_storage_desc: "Aumenta a capacidade de minério.",
    oxygen_storage: "Armazém de Oxigênio",
    oxygen_storage_desc: "Aumenta a capacidade de oxigênio.",
    energy_storage: "Armazém de Energia",
    energy_storage_desc: "Aumenta a capacidade de energia.",
    drone: "Drone",
    drone_desc: "Rápido e ágil. Prioridade: defesas.",
    robot: "Robô",
    robot_desc: "Resistente. Ataca qualquer estrutura.",
    tank: "Tanque",
    tank_desc: "Blindado e devastador. Prioridade: recursos.",
    train: "TREINAR",
    locked: "Bloqueado",
    opponent_found: "⚔️ Oponente Encontrado!",
    attack_btn: "⚔️ ATACAR!",
    next_btn: "🔄 Outro",
    build_camp_tip: "Construa um Acampamento para abrigar tropas!",
    tutorial_step5: "Melhore o CC para nível 2 e 3 para desbloquear mais construções.",
    tutorial_step6: "No CC nível 3 o Laboratório é desbloqueado — pesquise melhorias de tropas com ⚡ Energia."
  },
  en: {
    lang_name: "English",
    loading: "Loading",
    conquer_moon: "Conquer the Moon",
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    username: "Username",
    confirm_password: "Confirm Password",
    create_account: "CREATE ACCOUNT",
    or: "or",
    login_google: "Login with Google",
    colono: "Colonist",
    build: "BUILD",
    attack: "ATTACK",
    troops: "TROOPS",
    shop: "SHOP",
    profile: "PROFILE",
    settings: "CONFIG",
    available_buildings: "🏗️ Available Buildings",
    manage_troops: "🪖 Manage Troops",
    capacity: "Capacity",
    in_training: "In Training",
    information: "📊 Information",
    crystal_shop: "💎 Crystal Shop",
    shop_desc: "Crystals allow you to speed up buildings and troops. Purchase available soon!",
    upgrade: "⬆ Upgrade",
    laboratory: "🔬 Laboratory",
    speedup: "⚡ SPEED UP",
    move: "↔ Move",
    destroy: "🗑 Demolish",
    confirm: "CONFIRM",
    cancel: "CANCEL",
    search_opponent: "⚔️ Search Opponent",
    back: "← Back",
    battle_label: "⚔️ LUNAR BATTLE",
    deploy_tip: "Select a troop and tap on the map",
    victory: "VICTORY",
    defeat: "DEFEAT",
    continue: "CONTINUE",
    admin_panel: "🛡️ ADMIN PANEL",
    fill_resources: "Get 1 Billion Resources",
    max_cc: "Max Out CC Level",
    assign_player: "ASSIGN TO PLAYER",
    send: "SEND",
    close: "CLOSE",
    welcome: "WELCOME TO THE MOON COLONY!",
    tutorial_start: "UNDERSTOOD — START! 🚀",
    tutorial_tip: "💡 Tip: Build Storages to increase your resource capacity!",
    lab_title: "LABORATORY — Troop Research",
    lang_select: "Language",
    logout: "Logout",
    level: "Level",
    hp: "HP",
    cost: "Cost",
    time: "Time",
    theme: "Theme",
    building: "Building",
    upgrading: "Upgrading",
    storage: "Storage",
    mineral: "Mineral",
    oxygen: "Oxygen",
    energy: "Energy",
    buildings: "Buildings",
    ferro: "Iron",
    bronze: "Bronze",
    prata: "Silver",
    ouro: "Gold",
    platina: "Platinum",
    diamante: "Diamond",
    lendario: "Legendary",
    command_center: "Command Center",
    command_center_desc: "The heart of your lunar colony.",
    mineral_extractor: "Mineral Extractor",
    mineral_extractor_desc: "Extracts mineral from the lunar subsoil.",
    oxygen_extractor: "Oxygen Extractor",
    oxygen_extractor_desc: "Extracts oxygen from the lunar regolith.",
    solar_panel: "Solar Panel",
    solar_panel_desc: "Maximum solar energy without atmosphere.",
    barracks: "Barracks",
    barracks_desc: "Trains troops for combat.",
    camp: "Camp",
    camp_desc: "Acomodates troop units.",
    turret: "Turret",
    turret_desc: "Automatic short-range defense.",
    laboratory_desc: "Researches troop upgrades.",
    railgun: "Railgun",
    railgun_desc: "Long-range electromagnetic cannon.",
    mineral_storage: "Mineral Storage",
    mineral_storage_desc: "Increases mineral capacity.",
    oxygen_storage: "Oxygen Storage",
    oxygen_storage_desc: "Increases oxygen capacity.",
    energy_storage: "Energy Storage",
    energy_storage_desc: "Increases energy capacity.",
    drone: "Drone",
    drone_desc: "Fast and agile. Priority: defenses.",
    robot: "Robot",
    robot_desc: "Resistant. Attacks any structure.",
    tank: "Tank",
    tank_desc: "Armored and devastating. Priority: resources.",
    train: "TRAIN",
    locked: "Locked",
    opponent_found: "⚔️ Opponent Found!",
    attack_btn: "⚔️ ATTACK!",
    next_btn: "🔄 Next",
    build_camp_tip: "Build a Camp to house troops!",
    tutorial_step5: "Upgrade CC to level 2 and 3 to unlock more buildings.",
    tutorial_step6: "At CC level 3 the Laboratory is unlocked — research troop upgrades with ⚡ Energy."
  },
  es: {
    lang_name: "Español",
    loading: "Cargando",
    conquer_moon: "Conquista la Luna",
    login: "Entrar",
    register: "Registrarse",
    email: "Correo",
    password: "Contraseña",
    username: "Nombre de usuario",
    confirm_password: "Confirmar contraseña",
    create_account: "CREAR CUENTA",
    or: "o",
    login_google: "Entrar con Google",
    colono: "Colono",
    build: "BUILD",
    attack: "ATTACK",
    troops: "TROOPS",
    shop: "TIENDA",
    profile: "PERFIL",
    settings: "CONFIG",
    available_buildings: "🏗️ Edificios Disponibles",
    manage_troops: "🪖 Gestionar Tropas",
    capacity: "Capacidad",
    in_training: "En Entrenamiento",
    information: "📊 Información",
    crystal_shop: "💎 Tienda de Cristales",
    shop_desc: "Los cristales permiten acelerar construcciones y tropas. ¡Compra disponible pronto!",
    upgrade: "⬆ Mejorar",
    laboratory: "🔬 Laboratorio",
    speedup: "⚡ ACELERAR",
    move: "↔ Mover",
    destroy: "🗑 Demoler",
    confirm: "CONFIRMAR",
    cancel: "CANCELAR",
    search_opponent: "⚔️ Buscar Oponente",
    back: "← Volver",
    battle_label: "⚔️ BATALLA LUNAR",
    deploy_tip: "Selecciona una tropa y toca el mapa",
    victory: "VICTORIA",
    defeat: "DERROTA",
    continue: "CONTINUAR",
    admin_panel: "🛡️ PANEL ADMIN",
    fill_resources: "Ganar 1 Billón de Recursos",
    max_cc: "Elevar CC a Nivel Máximo",
    assign_player: "ASIGNAR A JUGADOR",
    send: "ENVIAR",
    close: "CERRAR",
    welcome: "¡BIENVENIDO A LA COLONIA LUNAR!",
    tutorial_start: "ENTENDIDO — ¡EMPEZAR! 🚀",
    tutorial_tip: "💡 Consejo: ¡Construye Almacenes para aumentar tu capacidad de recursos!",
    lab_title: "LABORATORIO — Investigación de Tropas",
    lang_select: "Idioma",
    logout: "Cerrar Sesión",
    level: "Nivel",
    hp: "Vida",
    cost: "Costo",
    time: "Tiempo",
    theme: "Tema",
    building: "Construyendo",
    upgrading: "Mejorando",
    storage: "Almacenamiento",
    mineral: "Mineral",
    oxygen: "Oxígeno",
    energy: "Energía",
    buildings: "Edificios",
    ferro: "Hierro",
    bronze: "Bronce",
    prata: "Plata",
    ouro: "Oro",
    platina: "Platino",
    diamante: "Diamante",
    lendario: "Legendario",
    command_center: "Centro de Comando",
    command_center_desc: "El corazón de tu colonia lunar.",
    mineral_extractor: "Extractor de Mineral",
    mineral_extractor_desc: "Extrae mineral del subsuelo lunar.",
    oxygen_extractor: "Extractor de Oxígeno",
    oxygen_extractor_desc: "Extrae oxígeno del regolito lunar.",
    solar_panel: "Panel Solar",
    solar_panel_desc: "Energía solar máxima sin atmósfera.",
    barracks: "Cuartel",
    barracks_desc: "Entrena tropas para el combate.",
    camp: "Campamento",
    camp_desc: "Acomoda unidades de tropa.",
    turret: "Torreta",
    turret_desc: "Defensa automática de corto alcance.",
    laboratory_desc: "Investiga mejoras para tropas.",
    railgun: "Railgun",
    railgun_desc: "Cañón electromagnético de largo alcance.",
    mineral_storage: "Almacén de Mineral",
    mineral_storage_desc: "Aumenta la capacidad de mineral.",
    oxygen_storage: "Almacén de Oxígeno",
    oxygen_storage_desc: "Aumenta la capacidad de oxígeno.",
    energy_storage: "Almacén de Energía",
    energy_storage_desc: "Aumenta la capacidad de energía.",
    drone: "Drone",
    drone_desc: "Rápido y ágil. Prioridad: defensas.",
    robot: "Robot",
    robot_desc: "Resistente. Ataca cualquier estructura.",
    tank: "Tanque",
    tank_desc: "Blindado y devastador. Prioridad: recursos.",
    train: "ENTRENAR",
    locked: "Bloqueado",
    opponent_found: "⚔️ ¡Oponente Encontrado!",
    attack_btn: "⚔️ ¡ATACAR!",
    next_btn: "🔄 Otro",
    build_camp_tip: "¡Construye un Campamento para albergar tropas!",
    tutorial_step5: "Mejora el CC a nivel 2 y 3 para desbloquear más edificios.",
    tutorial_step6: "En el nivel 3 del CC se desbloquea el Laboratorio — investiga mejoras de tropas con ⚡ Energía."
  }
};

let currentLang = localStorage.getItem('colony_clash_lang') || 'pt';

function t(key) {
  return TRANSLATIONS[currentLang]?.[key] || key;
}

function setLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    currentLang = lang;
    localStorage.setItem('colony_clash_lang', lang);
    if (typeof updateUILanguage === 'function') updateUILanguage();
  }
}
