// @ts-check

// Sprites para barris e zumbis
export const barrelSprites = ['buff', 'nerf', 'reinforcement', 'health', 'shield'].reduce((acc: Record<string, HTMLImageElement>, key) => {
  acc[key] = new Image();
  acc[key].src = new URL(`/sprites/barrel_reinforcement.png`, import.meta.url).href;
  return acc;
}, {});

export const zombieSprites = ['normal', 'fast', 'tank', 'spitter'].reduce((acc: Record<string, HTMLImageElement>, key) => {
  acc[key] = new Image();
  acc[key].src = `/sprites/zombie_${key}.png`;
  return acc;
}, {});

export const warriorSprite = new Image();
warriorSprite.src = new URL(`/sprites/hero.png`, import.meta.url).href; // 3 frames, 64x64 each, top-down soldier