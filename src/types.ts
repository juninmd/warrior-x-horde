// types.ts - Sistema de Crowd Runner

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'explosion' | 'trail' | 'spark' | 'star';
}

export interface GameState {
  isGameOver: boolean;
  isVictory: boolean;
  isStarted: boolean;
  isPaused: boolean;
  currentLevel: number;
  score: number;
  highScore: number;
  coins: number;
  gameSpeed: number;
  baseGameSpeed: number;
  distanceTraveled: number;
  levelDistance: number;
  isBattling: boolean;
  battleTimer: number;
  screenShakeActive: boolean;
  screenShakeIntensity: number;
  screenShakeDuration: number;
  screenShakeTimer: number;
  lastFrameTime: number;
  // Super Cannon
  superCannonActive: boolean;
  superCannonTimer: number;
  superCannonDuration: number;
  superCannonCooldown: number;
  superCannonLastUsed: number;
  superCannonReady: boolean;
  superCannonDamageMultiplier: number;
  // Combo system
  combo: number;
  comboTimer: number;
  maxCombo: number;
}

export interface Soldier {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  isAlive: boolean;
  animOffset: number;
  hp: number;
  maxHp: number;
}

export interface Army {
  soldiers: Soldier[];
  centerX: number;
  centerY: number;
  targetX: number;
  color: string;
  isPlayer: boolean;
  fireRate: number;
  lastShotTime: number;
  damage: number;
}

export interface EnemyHorde {
  id: number;
  soldiers: Soldier[];
  count: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  speed: number;
  isActive: boolean;
  isMini?: boolean; // Mini-boss horde
}

export interface MiniBoss {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  isActive: boolean;
  color: string;
}

export interface Gate {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'add' | 'multiply' | 'subtract' | 'divide' | 'firerate' | 'damage' | 'speed';
  value: number;
  color: string;
  side: 'left' | 'right';
  passed: boolean;
}

export interface Weapon {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rifle' | 'shotgun' | 'minigun' | 'rocket';
  damage: number;
  fireRate: number;
  passed: boolean;
}

export interface Bullet {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  isEnemy: boolean;
}

export interface Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  isActive: boolean;
  color: string;
}

export interface Entities {
  playerArmy: Army;
  enemyHordes: EnemyHorde[];
  gates: Gate[];
  weapons: Weapon[];
  bullets: Bullet[];
  boss: Boss | null;
  miniBosses: MiniBoss[];
}

// Limites de entidades para performance
export const MAX_HEROES = 1000;
export const MAX_ENEMIES = 20000;

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}
