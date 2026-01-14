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
  // Boss Atmosphere
  bossActive: boolean;
  bossAtmosphereIntensity: number;
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
  isSuper?: boolean; // Super guerreiro
  personalFireRate?: number; // Fire rate individual (para super guerreiros)
  type: 'normal' | 'bazooka' | 'rambo' | 'laser';
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
  type: 'normal' | 'armored' | 'speed' | 'spiky';
}

export interface Gate {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'add' | 'multiply' | 'subtract' | 'divide' | 'firerate' | 'damage' | 'superwarrior';
  value: number;
  color: string;
  side: 'left' | 'right';
  passed: boolean;
  customText?: string;
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

export interface MysteryBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
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
  spawnTime: number; // Timestamp de quando o boss spawnou
  isMoving: boolean; // Se já começou a se mover
  type: 'normal' | 'beast' | 'machine' | 'demon' | 'mothership' | 'slime' | 'eye' | 'spider' | 'skull' | 'ghost' | 'crystal'; // Tipo de boss
  vx?: number; // Velocidade horizontal (para mothership)
  vy?: number; // Velocidade vertical (para mothership)
}

export interface Entities {
  playerArmy: Army;
  enemyHordes: EnemyHorde[];
  gates: Gate[];
  weapons: Weapon[];
  mysteryBoxes: MysteryBox[];
  bullets: Bullet[];
  boss: Boss | null;
  miniBosses: MiniBoss[];
}

// Limites de entidades para performance
export const MAX_HEROES = 20000; // Aumentado para 20k
export const MAX_ENEMIES = 20000;

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}
