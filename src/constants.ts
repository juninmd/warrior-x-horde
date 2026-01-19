// constants.ts - Central Game Configuration

// --- Game Dimensions & Limits ---
export const BASE_WIDTH = 480;
export const BASE_HEIGHT = 800;
export const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

export const MAX_HEROES = 20000;
export const MAX_ENEMIES = 20000;
export const MAX_PARTICLES = 50;
export const MAX_RENDERED_SOLDIERS = 100;

// --- Colors ---
export const COLORS = {
  PLAYER: {
    NORMAL: '#4A90D9',
    BAZOOKA: '#27ae60',
    RAMBO: '#e74c3c', // Note: Same as enemy base, context matters
    LASER: '#00ffff',
    SUPER: '#FFD700',
    SHIELD: '#4A90D9',
  },
  ENEMY: {
    BASE: '#E74C3C',
    DARK: '#C0392B',
  },
  UI: {
    GLASS_BG: 'rgba(20, 20, 30, 0.6)',
    GLASS_BORDER: 'rgba(255, 255, 255, 0.2)',
    TEXT: '#FFFFFF',
    GOLD: '#FFD700',
    DANGER: '#FF0000',
    SUCCESS: '#2ECC71',
    INFO: '#3498DB',
    ACCENT: '#E91E63',
  },
  EFFECTS: {
    EXPLOSION: '#E74C3C',
    SPARK: '#FFD700',
    TRAIL: '#4A90D9',
  }
};

// --- Biome Configuration ---
export const BIOMES = {
  ALIEN: {
    minLevel: 10,
    colors: {
      sky: ['#1a0b2e', '#4a148c'],
      ground: ['#2e0b3d', '#4a148c'],
      road: ['#000000', '#1a1a1a'],
      tree: '#ff00ff'
    }
  },
  HELL: {
    minLevel: 7,
    colors: {
      sky: ['#300000', '#500000'],
      ground: ['#1a0500', '#3d0a00'],
      road: ['#2e0b0b', '#3d0a0a'],
      tree: '#800000'
    }
  },
  WASTELAND: {
    minLevel: 4,
    colors: {
      sky: ['#e67e22', '#f1c40f'],
      ground: ['#d35400', '#e67e22'],
      road: ['#7f8c8d', '#95a5a6'],
      tree: '#8e44ad'
    }
  },
  GRASSLANDS: {
    minLevel: 0,
    colors: {
      sky: ['#87CEEB', '#E0F4FF'],
      ground: ['#4A7C59', '#7CAC7C'],
      road: ['#3D3D3D', '#5A5A5A'],
      tree: '#2d5a2d'
    }
  }
};
