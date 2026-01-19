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
    RAMBO: '#e74c3c',
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

// --- Theme Configuration ---

export interface ThemeConfig {
  name: string;
  colors: {
    sky: string[];
    ground: string[];
    road: string[];
    tree: string;
    mountain: {
      near: string;
      far: string;
    };
    clouds: string;
  };
  celestial: {
    type: 'sun' | 'moon' | 'none';
    color: string;
    shadowColor?: string;
  };
  decorationType: 'tree' | 'cactus' | 'crystal' | 'candy_cane' | 'bubble' | 'rock' | 'pillar' | 'snowman' | 'mushroom' | 'star';
  groundType: 'grass' | 'sand' | 'snow' | 'grid' | 'cracked' | 'waves' | 'bubbles' | 'none';
  roadType: 'asphalt' | 'dirt' | 'ice' | 'holographic' | 'brick' | 'alien';
}

export const THEMES: Record<number, ThemeConfig> = {
  1: { // Grasslands
    name: 'Grasslands',
    colors: {
      sky: ['#87CEEB', '#E0F4FF'],
      ground: ['#4A7C59', '#7CAC7C'],
      road: ['#3D3D3D', '#5A5A5A'],
      tree: '#2d5a2d',
      mountain: { near: '#7BA3BD', far: '#A8C4D8' },
      clouds: 'rgba(255, 255, 255, 0.7)'
    },
    celestial: { type: 'sun', color: '#FDB813' },
    decorationType: 'tree',
    groundType: 'grass',
    roadType: 'asphalt'
  },
  2: { // Desert
    name: 'Desert',
    colors: {
      sky: ['#FFD700', '#FF8C00'],
      ground: ['#E6C229', '#D4AF37'],
      road: ['#8B4513', '#A0522D'],
      tree: '#228B22', // Cactus green
      mountain: { near: '#CD853F', far: '#DEB887' },
      clouds: 'rgba(255, 250, 240, 0.6)'
    },
    celestial: { type: 'sun', color: '#FF4500' },
    decorationType: 'cactus',
    groundType: 'sand',
    roadType: 'dirt'
  },
  3: { // Snow
    name: 'Snow',
    colors: {
      sky: ['#B0E0E6', '#F0F8FF'],
      ground: ['#F5F5F5', '#E0E0E0'],
      road: ['#708090', '#778899'],
      tree: '#2F4F4F', // Pine
      mountain: { near: '#B0C4DE', far: '#E6E6FA' },
      clouds: 'rgba(255, 255, 255, 0.8)'
    },
    celestial: { type: 'sun', color: '#FFFACD' },
    decorationType: 'snowman',
    groundType: 'snow',
    roadType: 'ice'
  },
  4: { // Toxic
    name: 'Toxic',
    colors: {
      sky: ['#556B2F', '#8FBC8F'],
      ground: ['#2E8B57', '#3CB371'],
      road: ['#2F4F4F', '#40E0D0'],
      tree: '#006400',
      mountain: { near: '#556B2F', far: '#8FBC8F' },
      clouds: 'rgba(0, 255, 0, 0.3)'
    },
    celestial: { type: 'sun', color: '#ADFF2F' },
    decorationType: 'mushroom',
    groundType: 'bubbles',
    roadType: 'asphalt'
  },
  5: { // Candy
    name: 'Candy',
    colors: {
      sky: ['#FF69B4', '#FFC0CB'],
      ground: ['#FFB6C1', '#FF69B4'],
      road: ['#DDA0DD', '#EE82EE'],
      tree: '#FF1493',
      mountain: { near: '#FF69B4', far: '#FFB6C1' },
      clouds: 'rgba(255, 240, 245, 0.8)'
    },
    celestial: { type: 'sun', color: '#FFFFE0' },
    decorationType: 'candy_cane',
    groundType: 'grass',
    roadType: 'brick'
  },
  6: { // Ocean / Underwater
    name: 'Ocean',
    colors: {
      sky: ['#00008B', '#00BFFF'],
      ground: ['#008080', '#20B2AA'],
      road: ['#4682B4', '#5F9EA0'],
      tree: '#00CED1', // Coral
      mountain: { near: '#4169E1', far: '#1E90FF' },
      clouds: 'rgba(255, 255, 255, 0.2)'
    },
    celestial: { type: 'moon', color: '#E0FFFF' },
    decorationType: 'bubble',
    groundType: 'waves',
    roadType: 'asphalt'
  },
  7: { // Hell
    name: 'Hell',
    colors: {
      sky: ['#300000', '#500000'],
      ground: ['#1a0500', '#3d0a00'],
      road: ['#2e0b0b', '#3d0a0a'],
      tree: '#800000',
      mountain: { near: '#400000', far: '#200000' },
      clouds: 'rgba(50, 0, 0, 0.5)'
    },
    celestial: { type: 'moon', color: '#FF4444', shadowColor: '#FF0000' },
    decorationType: 'rock',
    groundType: 'cracked',
    roadType: 'dirt'
  },
  8: { // Cyber
    name: 'Cyber',
    colors: {
      sky: ['#000000', '#000033'],
      ground: ['#000000', '#0a0a2a'],
      road: ['#111111', '#222222'],
      tree: '#00ff00', // Hologram tree
      mountain: { near: '#000080', far: '#000040' },
      clouds: 'rgba(0, 255, 255, 0.1)'
    },
    celestial: { type: 'moon', color: '#00FFFF', shadowColor: '#0000FF' },
    decorationType: 'pillar',
    groundType: 'grid',
    roadType: 'holographic'
  },
  9: { // Space
    name: 'Space',
    colors: {
      sky: ['#000000', '#0b3d91'],
      ground: ['#000000', '#1c1c1c'],
      road: ['#2F4F4F', '#708090'], // Moon surface
      tree: '#C0C0C0',
      mountain: { near: '#696969', far: '#2F4F4F' },
      clouds: 'rgba(255, 255, 255, 0.05)'
    },
    celestial: { type: 'sun', color: '#FFFFFF' },
    decorationType: 'star',
    groundType: 'none',
    roadType: 'asphalt'
  },
  10: { // Alien
    name: 'Alien',
    colors: {
      sky: ['#1a0b2e', '#4a148c'],
      ground: ['#2e0b3d', '#4a148c'],
      road: ['#000000', '#1a1a1a'],
      tree: '#ff00ff',
      mountain: { near: '#4a148c', far: '#2e0b3d' },
      clouds: 'rgba(255, 0, 255, 0.3)'
    },
    celestial: { type: 'moon', color: '#E0B0FF', shadowColor: '#E0B0FF' },
    decorationType: 'crystal',
    groundType: 'waves',
    roadType: 'alien'
  }
};
