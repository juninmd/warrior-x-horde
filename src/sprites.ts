// @ts-check

// Sprites para barris e zumbis
export const barrelSprites = ['buff', 'nerf', 'reinforcement', 'health', 'shield'].reduce((acc: Record<string, HTMLImageElement>, key) => {
  acc[key] = new Image();
  acc[key].src = `./src/assets/sprites/barrel_reinforcement.png`;
  return acc;
}, {});

export const zombieSprites = ['normal', 'fast', 'tank', 'spitter'].reduce((acc: Record<string, HTMLImageElement>, key) => {
  acc[key] = new Image();
  acc[key].src = `./src/assets/sprites/zombie_${key}.png`;
  return acc;
}, {});

export const warriorSprite = new Image();
warriorSprite.src = `./src/assets/sprites/hero.png`; // 3 frames, 64x64 each, top-down soldier