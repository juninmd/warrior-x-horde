export interface GameState {
  isGameOver: boolean;
  currentWave: number;
  score: number;
  highScore: number;
  maxReinforcements: number;
  maxAllies: number;
  enemiesSpawned: number;
  enemiesKilled: number;
  enemiesKilledWave: number;
  enemiesRequiredForBoss: number;
  bossSpawnCooldown: number;
  maxBossSpawnCooldown: number;
  zombieSprintChance: number;
  zombieSprintCooldown: number;
  spawnRate: number;
  lastSpawnTime: number;
  difficultyMultiplier: number;
  waveStartTime: number;
  maxEnemies: number;
  BarrelTypes: Record<string, string>;
  isStarted: boolean;
  showBossWarning: boolean;
  superCannonActive: boolean;
  superCannonTimer: number;
  superCannonDuration: number;
  superCannonCooldown: number;
  superCannonLastUsed: number;
  superCannonReady: boolean;
  superCannonDamageMultiply: number;
}

/**
 * Interface para definir a estrutura dos sons do jogo
 */
export interface Sounds {
  gameStart: HTMLAudioElement;
  gameOver: HTMLAudioElement;
  gameMusic: HTMLAudioElement;
  bossMusic: HTMLAudioElement;
  playerShoot: HTMLAudioElement;
  nerf: HTMLAudioElement;
  buff_damage: HTMLAudioElement;
  buff_health: HTMLAudioElement;
  buff_firerate: HTMLAudioElement;
  buff_speed: HTMLAudioElement;
  buff_shield: HTMLAudioElement;
  playerHit: HTMLAudioElement;
  enemyHit: HTMLAudioElement;
  barrelPickup: HTMLAudioElement;
  bossHit: HTMLAudioElement;
  bossDeath: HTMLAudioElement;
  waveComplete: HTMLAudioElement;
  bossWarning: HTMLAudioElement;
  bossPhaseChange: HTMLAudioElement;
  bossSpawn: HTMLAudioElement;
  zombieGroan: HTMLAudioElement;
  zombieSprint: HTMLAudioElement;
  superCannon: HTMLAudioElement;
}

// export Interfaces
export interface Player {
  type: 'ally';
  isMainPlayer: boolean;
  x: number;
  offsetX: number;
  offsetY: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  bulletSpeed: number;
  bulletDamage: number;
  fireRate: number;
  lastShotTime: number;
  hp: number;
  shield: number;
  frameIndex: number;
  frameTimer: number;
  frameInterval: number;
  damageEffect: number;

}

export interface Enemy {
  zombieType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  hp: number;
  damageEffect: number;
  frameIndex: number;
  frameTimer: number;
  frameInterval: number;
  isZombie?: boolean;
  moveStyle?: string;
  canSprint?: boolean;
  sprintCooldown: number;
  sprintDuration: number;
  baseSpeed: number;
  isSprinting?: boolean;
}

export interface Boss {
  type: 'boss';
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  hp: number;
  maxHp: number;
  damageEffect: number;
  lastShot: number;
  bulletDelay: number;
  damage: number;
  frameIndex: number;
  frameTimer: number;
  frameInterval: number;
  bulletSpeed: number;
  bulletDamage: number;
}

export interface Barrel {
  type: 'barrel';
  barrelType: 'buff' | 'nerf' | 'reinforcement' | 'health' | 'shield';
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  hp: number;
}

export interface Bullet {
  type: 'bullet';
  isEnemy: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  damage: number;
}

export type EntityType = Player | Enemy | Boss | Barrel | Bullet;

export interface Entities {
  allies: Player[];
  bullets: Bullet[];
  enemies: Enemy[];
  boss: Boss | null;
  barrels: Barrel[];
}
