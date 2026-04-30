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
    maxLevel: 4,
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
            mineral_storage: 2, oxygen_storage: 2, energy_storage: 2,
            clan_tower: 0
          },
          barracks_max_level: 3,
          troop_unlock: ['drone', 'robot', 'tank'],
          max_building_level: 3
        }
      },
      {
        hp: 9000, buildTime: 3600, cost: { mineral: 25000, oxygen: 25000 },
        theme: 'platinum', desc: 'Base de platina com tecnologia de clãs. Tema: Platina.',
        unlocks: {
          buildings: {
            mineral_extractor: 6, oxygen_extractor: 6, solar_panel: 5,
            barracks: 1, camp: 4, turret: 6, laboratory: 1, railgun: 2,
            mineral_storage: 3, oxygen_storage: 3, energy_storage: 3,
            clan_tower: 1
          },
          barracks_max_level: 4,
          troop_unlock: ['drone', 'robot', 'tank', 'star_warrior'],
          max_building_level: 4
        }
      }
    ],
    getAsset: (lvl) => `cc_lvl${lvl}.png`,
  },
  mineral_extractor: {
    id: 'mineral_extractor', name: 'Extrator de Minério',
    size: 1, isDefense: false, isResource: true, resourceType: 'mineral',
    maxLevel: 4,
    levels: [null,
      { hp: 400, buildTime: 10,  cost: { mineral: 100,  oxygen: 0    }, production: 8,  desc: 'Extrai minério do subsolo lunar.' },
      { hp: 600, buildTime: 900,  cost: { mineral: 800,  oxygen: 300  }, production: 20, desc: 'Perfuração aprimorada com sensores sísmicos.' },
      { hp: 900, buildTime: 1800, cost: { mineral: 4000, oxygen: 1500 }, production: 45, desc: 'Extração de alta intensidade com IA integrada.' },
      { hp: 1300, buildTime: 3600, cost: { mineral: 12000, oxygen: 5000 }, production: 100, desc: 'Megabroca de diamante com núcleo de fusão.' }
    ],
    getAsset: (lvl) => `mineral_extractor_lvl${lvl}.png`,
  },
  oxygen_extractor: {
    id: 'oxygen_extractor', name: 'Extrator de Oxigênio',
    size: 1, isDefense: false, isResource: true, resourceType: 'oxygen',
    maxLevel: 4,
    levels: [null,
      { hp: 350, buildTime: 10,  cost: { mineral: 150,  oxygen: 0    }, production: 6,  desc: 'Extrai oxigênio do regolito lunar.' },
      { hp: 550, buildTime: 900,  cost: { mineral: 1200, oxygen: 500  }, production: 15, desc: 'Filtros de alta eficiência com dupla câmara.' },
      { hp: 800, buildTime: 1800, cost: { mineral: 6000, oxygen: 2500 }, production: 35, desc: 'Eletrólise lunar avançada com rendimento máximo.' },
      { hp: 1200, buildTime: 3600, cost: { mineral: 18000, oxygen: 8000 }, production: 80, desc: 'Sifão atmosférico de alta pressão.' }
    ],
    getAsset: (lvl) => `oxygen_extractor_lvl${lvl}.png`,
  },
  solar_panel: {
    id: 'solar_panel', name: 'Painel Solar',
    size: 1, isDefense: false, isResource: true, resourceType: 'energy',
    maxLevel: 4,
    levels: [null,
      { hp: 200, buildTime: 10,  cost: { mineral: 200,  oxygen: 0  }, production: 40,  desc: 'Energia solar máxima sem atmosfera.' },
      { hp: 350, buildTime: 900,  cost: { mineral: 1500, oxygen: 600  }, production: 90,  desc: 'Painel de alta voltagem com rastreamento solar.' },
      { hp: 500, buildTime: 1800, cost: { mineral: 5000, oxygen: 2000 }, production: 200, desc: 'Megapainel fotovoltaico de fusão quântica.' },
      { hp: 800, buildTime: 3600, cost: { mineral: 15000, oxygen: 6000 }, production: 500, desc: 'Matriz de energia de antimatéria solar.' }
    ],
    getAsset: (lvl) => `solar_panel_lvl${lvl}.png`,
  },
  barracks: {
    id: 'barracks', name: 'Quartel',
    size: 1, isDefense: false, isResource: false,
    maxLevel: 4,
    levels: [null,
      { hp: 500,  buildTime: 10,  cost: { mineral: 500,   oxygen: 0  }, desc: 'Treina Drones de combate.',                    availableTroops: ['drone'] },
      { hp: 750,  buildTime: 900,  cost: { mineral: 3000,  oxygen: 1200 }, desc: 'Treina Drones e Robôs de batalha.',            availableTroops: ['drone', 'robot'] },
      { hp: 1000, buildTime: 1800, cost: { mineral: 10000, oxygen: 4000 }, desc: 'Treina todas as tropas, incluindo Tanques.', availableTroops: ['drone', 'robot', 'tank'] },
      { hp: 1500, buildTime: 3600, cost: { mineral: 30000, oxygen: 12000 }, desc: 'Elite militar. Treina Guerreiros Estelares.', availableTroops: ['drone', 'robot', 'tank', 'star_warrior'] }
    ],
    getAsset: (lvl) => `barracks_lvl${lvl}.png`,
  },
  camp: {
    id: 'camp', name: 'Acampamento',
    size: 1, isDefense: false, isResource: false,
    maxLevel: 4,
    levels: [null,
      { hp: 300, buildTime: 10,  cost: { mineral: 250,  oxygen: 0  }, capacity: 10, desc: 'Acomoda até 10 unidades de tropa.' },
      { hp: 450, buildTime: 900,  cost: { mineral: 1500, oxygen: 600  }, capacity: 15, desc: 'Acomoda até 15 unidades de tropa.' },
      { hp: 650, buildTime: 1800, cost: { mineral: 5000, oxygen: 2000 }, capacity: 20, desc: 'Acomoda até 20 unidades de tropa.' },
      { hp: 900, buildTime: 3600, cost: { mineral: 15000, oxygen: 6000 }, capacity: 30, desc: 'Mega-alojamento para 30 unidades.' }
    ],
    getAsset: (lvl) => `camp_lvl${lvl}.png`,
  },
  turret: {
    id: 'turret', name: 'Torreta',
    size: 1, isDefense: true, isResource: false,
    maxLevel: 4,
    levels: [null,
      { hp: 600,  buildTime: 10,  cost: { mineral: 700,   oxygen: 0  }, damage: 25,  range: 3, rate: 1.0, desc: 'Defesa automática de curto alcance.' },
      { hp: 900,  buildTime: 900,  cost: { mineral: 4000,  oxygen: 1500 }, damage: 55,  range: 4, rate: 0.8, desc: 'Torreta aprimorada com mira assistida.' },
      { hp: 1200, buildTime: 1800, cost: { mineral: 12000, oxygen: 5000 }, damage: 100, range: 5, rate: 0.6, desc: 'Torreta de plasma de alta cadência.' },
      { hp: 1800, buildTime: 3600, cost: { mineral: 30000, oxygen: 12000 }, damage: 180, range: 6, rate: 0.5, desc: 'Torreta pesada de feixe contínuo.' }
    ],
    getAsset: (lvl) => `defense_turret_lvl${lvl}.png`,
  },
  laboratory: {
    id: 'laboratory', name: 'Laboratório',
    size: 1, isDefense: false, isResource: false,
    isLaboratory: true,
    maxLevel: 4,
    levels: [null,
      { hp: 800,  buildTime: 10,  cost: { mineral: 500, oxygen: 0  }, desc: 'Pesquisa melhorias básicas para suas tropas. (Requer CC3)' },
      { hp: 1000, buildTime: 900,  cost: { mineral: 3000, oxygen: 500 }, desc: 'Laboratório avançado. Melhorias de nível 2. (Requer CC3)' },
      { hp: 1400, buildTime: 1800, cost: { mineral: 6000, oxygen: 1500 }, desc: 'Laboratório supremo. Melhorias de nível 3. (Requer CC3)' },
      { hp: 2000, buildTime: 3600, cost: { mineral: 12000, oxygen: 4000 }, desc: 'Pesquisa avançada de nível 4. (Requer CC4)' }
    ],
    getAsset: (lvl) => `laboratory_lvl${lvl}.png`,
  },
  railgun: {
    id: 'railgun', name: 'Railgun',
    size: 1, isDefense: true, isResource: false,
    maxLevel: 4,
    levels: [null,
      { hp: 1200, buildTime: 10,  cost: { mineral: 1000, oxygen: 0 }, damage: 150, range: 5, rate: 0.25, desc: 'Canhão eletromagnético de longo alcance.' },
      { hp: 1800, buildTime: 900,  cost: { mineral: 3000, oxygen: 1000 }, damage: 200, range: 6, rate: 0.25, desc: 'Railgun aprimorado de alta precisão.' },
      { hp: 2400, buildTime: 1800, cost: { mineral: 7500, oxygen: 3000 }, damage: 250, range: 7, rate: 0.25, desc: 'Railgun supremo com mira quântica.' },
      { hp: 3500, buildTime: 3600, cost: { mineral: 18000, oxygen: 8000 }, damage: 300, range: 8, rate: 0.25, desc: 'Destruidor orbital de railgun.' }
    ],
    getAsset: (lvl) => `turret_railgun_lvl${lvl}.png`,
  },
  // ---- STORAGES ----
  mineral_storage: {
    id: 'mineral_storage', name: 'Armazém de Minério',
    size: 1, isDefense: false, isResource: false, isStorage: true, storageType: 'mineral',
    maxLevel: 4,
    levels: [null,
      { hp: 500, buildTime: 10,  cost: { mineral: 300,  oxygen: 0   }, storageBonus: 3000,  desc: '+3.000 de capacidade de minério.' },
      { hp: 700, buildTime: 900,  cost: { mineral: 2000, oxygen: 500 }, storageBonus: 6000,  desc: '+6.000 de capacidade de minério.' },
      { hp: 950, buildTime: 1800, cost: { mineral: 8000, oxygen: 2000 }, storageBonus: 12000, desc: '+12.000 de capacidade de minério.' },
      { hp: 1500, buildTime: 3600, cost: { mineral: 25000, oxygen: 10000 }, storageBonus: 30000, desc: '+30.000 de capacidade de minério.' }
    ],
    getAsset: (lvl) => `mineral_storage_lvl${lvl}.png`,
  },
  oxygen_storage: {
    id: 'oxygen_storage', name: 'Armazém de Oxigênio',
    size: 1, isDefense: false, isResource: false, isStorage: true, storageType: 'oxygen',
    maxLevel: 4,
    levels: [null,
      { hp: 500, buildTime: 10,  cost: { mineral: 300,  oxygen: 0   }, storageBonus: 3000,  desc: '+3.000 de capacidade de oxigênio.' },
      { hp: 700, buildTime: 900,  cost: { mineral: 2000, oxygen: 500 }, storageBonus: 6000,  desc: '+6.000 de capacidade de oxigênio.' },
      { hp: 950, buildTime: 1800, cost: { mineral: 8000, oxygen: 2000 }, storageBonus: 12000, desc: '+12.000 de capacidade de oxigênio.' },
      { hp: 1500, buildTime: 3600, cost: { mineral: 25000, oxygen: 10000 }, storageBonus: 30000, desc: '+30.000 de capacidade de oxigênio.' }
    ],
    getAsset: (lvl) => `oxygen_storage_lvl${lvl}.png`,
  },
  energy_storage: {
    id: 'energy_storage', name: 'Armazém de Energia',
    size: 1, isDefense: false, isResource: false, isStorage: true, storageType: 'energy',
    maxLevel: 4,
    levels: [null,
      { hp: 500, buildTime: 10,  cost: { mineral: 300,  oxygen: 0   }, storageBonus: 3000,  desc: '+3.000 de capacidade de energia.' },
      { hp: 700, buildTime: 900,  cost: { mineral: 2000, oxygen: 500 }, storageBonus: 6000,  desc: '+6.000 de capacidade de energia.' },
      { hp: 950, buildTime: 1800, cost: { mineral: 8000, oxygen: 2000 }, storageBonus: 12000, desc: '+12.000 de capacidade de energia.' },
      { hp: 1500, buildTime: 3600, cost: { mineral: 25000, oxygen: 10000 }, storageBonus: 30000, desc: '+30.000 de capacidade de energia.' }
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
  },
  clan_tower: {
    id: 'clan_tower', name: 'Torre do Clã',
    size: 1, isDefense: false, isResource: false,
    maxLevel: 1,
    levels: [null,
      { hp: 1500, buildTime: 10, cost: { mineral: 1000, oxygen: 0 }, desc: 'Centro de comunicação para clãs e amigos.' }
    ],
    getAsset: (lvl) => `clan_tower_lvl1.png`,
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
  },
  star_warrior: {
    name: 'Guerreiro Estelar',
    emoji: '⚔️',
    upgrades: [
      { level: 1, name: 'Armadura de Neutronio', energyCost: 10000, mineralCost: 40000, desc: 'Guerreiro com +25% de HP.', stat: 'hp', bonus: 0.25, labLevel: 2 },
      { level: 2, name: 'Sabre de Antimatéria', energyCost: 25000, mineralCost: 100000, desc: 'Guerreiro com +35% de dano.', stat: 'damage', bonus: 0.35, labLevel: 3 },
      { level: 3, name: 'Reflexos Galácticos', energyCost: 50000, mineralCost: 200000, desc: 'Guerreiro com +40% de velocidade.', stat: 'speed', bonus: 0.40, labLevel: 4 }
    ]
  }
};

// ---- Troop Definitions ----
const TROOPS = {
  drone: {
    id: 'drone', name: 'Drone', emoji: '🛸',
    hp: 150, damage: 20, speed: 1.5, range: 1.2,
    cost: { mineral: 0, oxygen: 0, energy: 50 }, trainTime: 10, color: '#00D4FF', priority: 'any', space: 1
  },
  robot: {
    id: 'robot', name: 'Robô de Batalha', emoji: '🤖',
    hp: 400, damage: 45, speed: 1.0, range: 1.0,
    cost: { mineral: 0, oxygen: 0, energy: 100 }, trainTime: 15, color: '#44FF88', priority: 'defense', space: 2
  },
  tank: {
    id: 'tank', name: 'Tanque Lunar', emoji: '🚜',
    hp: 1200, damage: 80, speed: 0.6, range: 4.0,
    cost: { mineral: 0, oxygen: 0, energy: 200 }, trainTime: 20, color: '#FFD700', priority: 'defense', space: 4
  },
  star_warrior: {
    id: 'star_warrior', name: 'Guerreiro Estelar', emoji: '👨‍🚀',
    hp: 800, damage: 120, speed: 1.2, range: 3.5,
    cost: { mineral: 0, oxygen: 0, energy: 250 }, trainTime: 30, color: '#FF4466', priority: 'any', space: 6
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
    star_warrior: "Guerreiro Estelar",
    star_warrior_desc: "Guerreiro de elite das estrelas. Alta resistência e dano.",
    clan_tower: "Torre do Clã",
    clan_tower_desc: "Comunicação com clãs e amigos.",
    train: "TREINAR",
    locked: "Bloqueado",
    opponent_found: "⚔️ Oponente Encontrado!",
    attack_btn: "⚔️ ATACAR!",
    next_btn: "🔄 Outro",
    build_camp_tip: "Construa um Acampamento para abrigar tropas!",
    tutorial_step5: "Melhore o CC para nível 2 e 3 para desbloquear mais construções.",
    tutorial_step6: "No CC nível 3 o Laboratório é desbloqueado — pesquise melhorias de tropas com ⚡ Energia.",
    mission_title: "MISSÕES",
    current_mission_label: "MISSÃO ATUAL",
    current_mission_badge: "Missão Atual",
    next_missions_label: "PRÓXIMAS MISSÕES",
    claim_reward: "RESGATAR",
    claimed: "RESGATADO",
    reward_locked: "RECOMPENSA BLOQUEADA",
    gems_unit: "JOIAS",
    earn_reward: "GANHAR",
    all_missions_done: "Todas as missões concluídas!",
    mission_0: "CONSTRUIR 2 EXTRATORES DE MINÉRIOS",
    mission_1: "CONSTRUIR 2 EXTRATORES DE OXIGÊNIO",
    mission_2: "CONSTRUIR 3 PAINÉIS SOLARES",
    mission_3: "CONSTRUIR UM QUARTEL",
    mission_4: "CONSTRUIR 2 ACAMPAMENTOS",
    mission_5: "GANHAR UM ATAQUE USANDO DRONE ROBÔ",
    mission_6: "MELHORAR CENTRO DE COMANDO PARA NÍVEL 2",
    mission_7: "CONSTRUIR 3 TORRETAS DE DEFESA",
    mission_8: "CONSTRUIR UM LABORATÓRIO",
    mission_9: "GANHAR 5 ATAQUES TOTAIS",
    mission_10: "MELHORAR CENTRO DE COMANDO PARA NÍVEL 3",
    mission_11: "DESTRUIR 10 EDIFÍCIOS INIMIGOS NO TOTAL",
    mission_12: "TREINAR 10 DRONES",
    mission_13: "VENÇA 3 BATALHAS SEGUIDAS",
    mission_14: "REMOVA 1 ROCHA LUNAR",
    mission_15: "PESQUISAR 3 MELHORIAS DE TROPA NO LABORATÓRIO",
    next: "Próximo",
    ready: "pronto",
    admin_access_denied: "Acesso negado",
    admin_resources_gain: "Modo Admin: Ganhou recursos!",
    admin_cc_max: "Modo Admin: CC no Nível Máximo!",
    max_builders_reached: "Você já tem o máximo de astronautas (4)!",
    new_builder_hired: "Novo astronauta contratado! 👨‍🚀",
    all_builders_busy: "Todos os astronautas estão ocupados!",
    insufficient_minerals: "Minério insuficiente!",
    removing_obstacle: "Removendo rocha lunar...",
    obstacle_removed: "Rocha removida!",
    invalid_position: "Escolha uma posição válida!",
    building_limit_reached: "Limite atingido! Melhore o CC.",
    insufficient_resources: "Recursos insuficientes!",
    need_barracks: "Construa um Quartel para treinar tropas!",
    need_camp: "Construa um Acampamento para abrigar tropas!",
    not_enough_gems: "Gemas insuficientes!",
    name_changed_once: "Você já alterou seu nome uma vez!",
    name_too_short: "Nome muito curto! (mín. 3 letras)",
    name_changed_success: "Nome da colônia alterado!",
    train_troops_first: "Treine tropas antes de atacar!",
    enemy_base_empty: "Base inimiga vazia!",
    select_troop_deploy: "Selecione uma tropa!",
    reward_claimed_success: "Recompensa resgatada!",
    training: "Treinando",
    upgrade_cancelled: "Melhoria cancelada!",
    confirm_cancel_upgrade: "Deseja cancelar a melhoria? Você receberá 50% dos recursos de volta.",
    confirm_name_change: "Deseja alterar o nome para {name} por 100 gemas?",
    clan_title: "CLÃS & AMIGOS",
    create_clan: "CRIAR CLÃ",
    search_players: "BUSCAR JOGADORES",
    visit: "VISITAR",
    chat: "CHAT",
    members: "MEMBROS",
    clan_name_placeholder: "Nome do Clã...",
    player_name_placeholder: "Nome do Jogador...",
    join: "ENTRAR",
    leave: "SAIR",
    clan_created: "Clã criado com sucesso!",
    clan_joined: "Você entrou no clã!",
    visiting_player: "Visitando base de {name}...",
    friends: "AMIGOS",
    add_friend: "Adicionar Amigo",
    friend_added: "Amigo adicionado!",
    no_results: "Nenhum resultado encontrado.",
    under_attack_shield_tip: "Atacar remove sua proteção!",
    protected_for: "Você está protegido por",
    insufficient_energy_search: "Energia insuficiente para buscar",
    no_opponents_available: "Nenhum oponente disponível.",
    try_again_later: "Tente novamente mais tarde!",
    try_again_btn: "TENTAR NOVAMENTE",
    production: "Produção",
    damage: "Dano",
    range: "Alcance",
    end_battle: "RECUAR",
    return_base: "RETORNAR À BASE",
    destruction: "Destruição",
    trophies: "Troféus"
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
    star_warrior: "Star Warrior",
    star_warrior_desc: "Elite star warrior. High resistance and damage.",
    clan_tower: "Clan Tower",
    clan_tower_desc: "Communication with clans and friends.",
    train: "TRAIN",
    locked: "Locked",
    opponent_found: "⚔️ Opponent Found!",
    attack_btn: "⚔️ ATTACK!",
    next_btn: "🔄 Next",
    build_camp_tip: "Build a Camp to house troops!",
    tutorial_step5: "Upgrade CC to level 2 and 3 to unlock more buildings.",
    tutorial_step6: "At CC level 3 the Laboratory is unlocked — research troop upgrades with ⚡ Energy.",
    mission_title: "MISSIONS",
    current_mission_label: "CURRENT MISSION",
    current_mission_badge: "Current Mission",
    next_missions_label: "NEXT MISSIONS",
    claim_reward: "CLAIM",
    claimed: "CLAIMED",
    reward_locked: "REWARD LOCKED",
    gems_unit: "GEMS",
    earn_reward: "EARN",
    all_missions_done: "All missions completed!",
    mission_0: "BUILD 2 MINERAL EXTRACTORS",
    mission_1: "BUILD 2 OXYGEN EXTRACTORS",
    mission_2: "BUILD 3 SOLAR PANELS",
    mission_3: "BUILD A BARRACKS",
    mission_4: "BUILD 2 CAMPS",
    mission_5: "WIN AN ATTACK USING ROBOT DRONE",
    mission_6: "UPGRADE COMMAND CENTER TO LEVEL 2",
    mission_7: "BUILD 3 DEFENSE TURRETS",
    mission_8: "BUILD A LABORATORY",
    mission_9: "WIN 5 TOTAL ATTACKS",
    mission_10: "UPGRADE COMMAND CENTER TO LEVEL 3",
    mission_11: "DESTROY 10 ENEMY BUILDINGS IN TOTAL",
    mission_12: "TRAIN 10 DRONES",
    mission_13: "WIN 3 BATTLES IN A ROW",
    mission_14: "REMOVE 1 LUNAR ROCK",
    mission_15: "RESEARCH 3 TROOP UPGRADES IN THE LAB",
    next: "Next",
    ready: "ready",
    admin_access_denied: "Access denied",
    admin_resources_gain: "Admin Mode: Resources gained!",
    admin_cc_max: "Admin Mode: CC Maxed Out!",
    max_builders_reached: "You already have the maximum number of astronauts (4)!",
    new_builder_hired: "New astronaut hired! 👨‍🚀",
    all_builders_busy: "All astronauts are busy!",
    insufficient_minerals: "Insufficient minerals!",
    removing_obstacle: "Removing lunar rock...",
    obstacle_removed: "Rock removed!",
    invalid_position: "Choose a valid position!",
    building_limit_reached: "Limit reached! Upgrade CC.",
    insufficient_resources: "Insufficient resources!",
    need_barracks: "Build a Barracks to train troops!",
    need_camp: "Build a Camp to house troops!",
    not_enough_gems: "Insufficient gems!",
    name_changed_once: "You have already changed your name once!",
    name_too_short: "Name too short! (min. 3 letters)",
    name_changed_success: "Colony name changed!",
    train_troops_first: "Train troops before attacking!",
    enemy_base_empty: "Enemy base empty!",
    select_troop_deploy: "Select a troop!",
    reward_claimed_success: "Reward claimed!",
    training: "Training",
    upgrade_cancelled: "Upgrade cancelled!",
    confirm_cancel_upgrade: "Do you want to cancel the upgrade? You will get 50% of the resources back.",
    confirm_name_change: "Do you want to change the name to {name} for 100 gems?",
    clan_title: "CLANS & FRIENDS",
    create_clan: "CREATE CLAN",
    search_players: "SEARCH PLAYERS",
    visit: "VISIT",
    chat: "CHAT",
    members: "MEMBERS",
    clan_name_placeholder: "Clan Name...",
    player_name_placeholder: "Player Name...",
    join: "JOIN",
    leave: "LEAVE",
    clan_created: "Clan created successfully!",
    clan_joined: "You joined the clan!",
    visiting_player: "Visiting {name}'s base...",
    friends: "FRIENDS",
    add_friend: "Add Friend",
    friend_added: "Friend added!",
    no_results: "No results found.",
    under_attack_shield_tip: "Attacking removes your protection!",
    protected_for: "You are protected for",
    insufficient_energy_search: "Insufficient energy to search",
    no_opponents_available: "No opponents available.",
    try_again_later: "Try again later!",
    try_again_btn: "TRY AGAIN",
    production: "Production",
    damage: "Damage",
    range: "Range",
    end_battle: "RETREAT",
    return_base: "RETURN TO BASE",
    destruction: "Destruction",
    trophies: "Trophies"
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
    star_warrior: "Guerrero Estelar",
    star_warrior_desc: "Guerrero de élite de las estrellas. Alta resistencia y daño.",
    clan_tower: "Torre del Clan",
    clan_tower_desc: "Comunicación con clanes y amigos.",
    train: "ENTRENAR",
    locked: "Bloqueado",
    opponent_found: "⚔️ ¡Oponente Encontrado!",
    attack_btn: "⚔️ ¡ATACAR!",
    next_btn: "🔄 Otro",
    build_camp_tip: "¡Construye un Campamento para albergar tropas!",
    tutorial_step5: "Mejora el CC a nivel 2 y 3 para desbloquear más edificios.",
    tutorial_step6: "En el nivel 3 del CC se desbloquea el Laboratorio — investiga mejoras de tropas con ⚡ Energía.",
    mission_title: "MISIONES",
    current_mission_label: "MISIÓN ACTUAL",
    current_mission_badge: "Misión Actual",
    next_missions_label: "PRÓXIMAS MISIONES",
    claim_reward: "RECLAMAR",
    claimed: "RECLAMADO",
    reward_locked: "RECOMPENSA BLOQUEADA",
    gems_unit: "GEMAS",
    earn_reward: "GANAR",
    all_missions_done: "¡Todas las misiones completadas!",
    mission_0: "CONSTRUIR 2 EXTRACTORES DE MINERAL",
    mission_1: "CONSTRUIR 2 EXTRACTORES DE OXÍGENO",
    mission_2: "CONSTRUIR 3 PANELES SOLARES",
    mission_3: "CONSTRUIR UN CUARTEL",
    mission_4: "CONSTRUIR 2 CAMPAMENTOS",
    mission_5: "GANAR UN ATAQUE USANDO DRONE ROBOT",
    mission_6: "MEJORAR CENTRO DE COMANDO A NIVEL 2",
    mission_7: "CONSTRUIR 3 TORRETAS DE DEFENSA",
    mission_8: "CONSTRUIR UN LABORATORIO",
    mission_9: "GANAR 5 ATAQUES TOTALES",
    mission_10: "MEJORAR CENTRO DE COMANDO A NIVEL 3",
    mission_11: "DESTRUIR 10 EDIFICIOS ENEMIGOS EN TOTAL",
    mission_12: "ENTRENAR 10 DRONES",
    mission_13: "GANA 3 BATALLAS SEGUIDAS",
    mission_14: "ELIMINA 1 ROCA LUNAR",
    mission_15: "INVESTIGAR 3 MEJORAS DE TROPA EN EL LABORATORIO",
    next: "Siguiente",
    ready: "listo",
    admin_access_denied: "Acceso denegado",
    admin_resources_gain: "Modo Admin: ¡Recursos ganados!",
    admin_cc_max: "Modo Admin: ¡CC al Nivel Máximo!",
    max_builders_reached: "¡Ya tienes el máximo de astronautas (4)!",
    new_builder_hired: "¡Nuevo astronauta contratado! 👨‍🚀",
    all_builders_busy: "¡Todos los astronautas están ocupados!",
    insufficient_minerals: "¡Minerales insuficientes!",
    removing_obstacle: "Eliminando roca lunar...",
    obstacle_removed: "¡Roca eliminada!",
    invalid_position: "¡Elige una posición válida!",
    building_limit_reached: "¡Límite alcanzado! Mejora el CC.",
    insufficient_resources: "¡Recursos insuficientes!",
    need_barracks: "¡Construye un Cuartel para entrenar tropas!",
    need_camp: "¡Construye un Campamento para albergar tropas!",
    not_enough_gems: "¡Gemas insuficientes!",
    name_changed_once: "¡Ya has cambiado tu nombre una vez!",
    name_too_short: "¡Nombre muy corto! (mín. 3 letras)",
    name_changed_success: "¡Nombre de la colonia cambiado!",
    train_troops_first: "¡Entrena tropas antes de atacar!",
    enemy_base_empty: "¡Base enemiga vacía!",
    select_troop_deploy: "¡Selecciona una tropa!",
    reward_claimed_success: "¡Recompensa reclamada!",
    training: "Entrenando",
    upgrade_cancelled: "¡Mejora cancelada!",
    confirm_cancel_upgrade: "¿Deseas cancelar la mejora? Recibirás el 50% de los recursos de vuelta.",
    confirm_name_change: "¿Deseas cambiar el nombre a {name} por 100 gemas?",
    clan_title: "CLANES Y AMIGOS",
    create_clan: "CREAR CLAN",
    search_players: "BUSCAR JUGADORES",
    visit: "VISITAR",
    chat: "CHAT",
    members: "MIEMBROS",
    clan_name_placeholder: "Nombre del Clan...",
    player_name_placeholder: "Nombre del Jugador...",
    join: "UNIRSE",
    leave: "SALIR",
    clan_created: "¡Clan creado con éxito!",
    clan_joined: "¡Te has unido al clan!",
    visiting_player: "Visitando la base de {name}...",
    friends: "AMIGOS",
    add_friend: "Añadir Amigo",
    friend_added: "¡Amigo añadido!",
    no_results: "No se encontraron resultados.",
    under_attack_shield_tip: "¡Atacar elimina tu protección!",
    protected_for: "Estás protegido por",
    insufficient_energy_search: "Energía insuficiente para buscar",
    no_opponents_available: "No hay oponentes disponibles.",
    try_again_later: "¡Inténtalo más tarde!",
    try_again_btn: "REINTENTAR",
    production: "Producción",
    damage: "Daño",
    range: "Alcance",
    end_battle: "RETIRARSE",
    return_base: "VOLVER A LA BASE",
    destruction: "Destrucción",
    trophies: "Trofeos"
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
