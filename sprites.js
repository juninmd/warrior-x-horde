// @ts-check
// @ts-check
// Sprites para barris
export const barrelSprites = {
  buff: new Image(),
  nerf: new Image(),
  reinforcement: new Image(),
  health: new Image()
};

// Carregar imagens dos barris
barrelSprites.buff.src = './barrel_reinforcement.png';
barrelSprites.nerf.src = './barrel_reinforcement.png';
barrelSprites.reinforcement.src = './barrel_reinforcement.png';
barrelSprites.health.src = './barrel_reinforcement.png';

// Sprites para zumbis
export const zombieSprites = {
  normal: new Image(),
  fast: new Image(),
  tank: new Image(),
  spitter: new Image(),
};

// Carregar imagens dos zumbis
zombieSprites.normal.src = './zombie_normal.png';
zombieSprites.fast.src = './zombie_fast.png';
zombieSprites.tank.src = './zombie_tank.png';
zombieSprites.spitter.src = './zombie_spitter.png';

export const warriorSprite = new Image();
warriorSprite.src = "hero.png"; // 3 frames, 64x64 each, top-down soldier