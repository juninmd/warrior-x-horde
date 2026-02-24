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
  type: 'explosion' | 'trail' | 'spark' | 'star' | 'shockwave' | 'debris' | 'hitmarker' | 'confetti';
  rotation?: number;
  rotationSpeed?: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  width: number;
  alpha: number;
}

export interface Trail {
  points: TrailPoint[];
  color: string;
  width: number;
  maxLength: number;
}

export interface GameState {
  isGameOver: boolean;
  isVictory: boolean;
  isStarted: boolean;
  isPaused: boolean;
  currentLevel: number;
  score: number;
  highScore: number;
  highScoreDistance: number;
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
  newRecordReached: boolean;
  damageFlash: number;
  lowArmyTriggered: boolean;
  hitStop: number;
  slowMoTimer: number;
  isDying: boolean; // Slow motion death phase
  nukeTimer: number;
  // Killstreak System
  killStreak: number;
  killStreakTimer: number;
  // Stats
  totalKills: number;
  runStartTime: number;
  nearMissCount: number;
  // Visuals
  whiteFlash: number;
  warpEffectTimer: number; // For level transitions
  // PWA
  deferredInstallPrompt: BeforeInstallPromptEvent | null;
  // Combo Tier (visual state)
  comboTier: number; // 0=None, 1=Double, 2=Multi, 3=Ultra, 4=Monster
  currentRank: string; // 'S', 'A', 'B', 'C', 'D'
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
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
  hitTimer?: number;
}

export interface Army {
  soldiers: Soldier[];
  aliveCount: number;
  centerX: number;
  centerY: number;
  targetX: number;
  color: string;
  isPlayer: boolean;
  fireRate: number;
  lastShotTime: number;
  damage: number;
  trail: Trail;
  scanIndex?: number; // For optimized shooting logic
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
  hp: number; // Shared HP for the horde
  maxHp: number;
  perfectClearEligible?: boolean;
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
  hitTimer?: number;
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
  cachedColors?: {
    light: string;
    dark: string;
  };
  cachedCanvas?: HTMLCanvasElement | OffscreenCanvas;
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
  hp: number;
  maxHp: number;
  passed: boolean;
  hitTimer?: number;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  passed: boolean;
  bounceOffset: number;
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
  hitTimer?: number;
}

export interface Entities {
  playerArmy: Army;
  enemyHordes: EnemyHorde[];
  gates: Gate[];
  weapons: Weapon[];
  mysteryBoxes: MysteryBox[];
  coins: Coin[];
  bullets: Bullet[];
  boss: Boss | null;
  miniBosses: MiniBoss[];
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
  vx: number;
  vy: number;
  gravity: number;
  style?: 'normal' | 'critical' | 'gold';
}
