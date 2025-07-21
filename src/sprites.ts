// @ts-check

// Sprites para barris e zumbis
export const barrelSprites: Record<string, HTMLImageElement> = {
  reinforcement: new Image(),
  health: new Image(),
  buff_shield: new Image(),
  buff_damage: new Image(),
  buff_firerate: new Image(),
  nerf_damage: new Image(),
  nerf_firerate: new Image(),
  nerf_health: new Image(),
};

barrelSprites.reinforcement.src = new URL(`/sprites/barrel_reinforcement.png`, import.meta.url).href;
barrelSprites.health.src = new URL(`/sprites/barrel_health.png`, import.meta.url).href;
barrelSprites.buff_shield.src = new URL(`/sprites/barrel_buff.png`, import.meta.url).href;
barrelSprites.buff_damage.src = new URL(`/sprites/barrel_buff.png`, import.meta.url).href;
barrelSprites.buff_firerate.src = new URL(`/sprites/barrel_buff.png`, import.meta.url).href;
barrelSprites.nerf_damage.src = new URL(`/sprites/barrel_nerf.png`, import.meta.url).href;
barrelSprites.nerf_firerate.src = new URL(`/sprites/barrel_nerf.png`, import.meta.url).href;
barrelSprites.nerf_health.src = new URL(`/sprites/barrel_nerf.png`, import.meta.url).href;

export const zombieSprites: Record<string, Record<string, HTMLImageElement>> = {
  normal: {
    idle: new Image(),
    walk: new Image(),
    attack: new Image(),
    death: new Image(),
  },
  fast: {
    idle: new Image(),
    walk: new Image(),
    attack: new Image(),
    death: new Image(),
  },
  tank: {
    idle: new Image(),
    walk: new Image(),
    attack: new Image(),
    death: new Image(),
  },
  spitter: {
    idle: new Image(),
    walk: new Image(),
    attack: new Image(),
    death: new Image(),
  },
};

// Load generic zombie animations for all types
zombieSprites.normal.idle.src = new URL(`/Apocalypse Character Pack/Apocalypse Character Pack/Zombie/Idle.png`, import.meta.url).href;
zombieSprites.normal.walk.src = new URL(`/Apocalypse Character Pack/Apocalypse Character Pack/Zombie/Walk.png`, import.meta.url).href;
zombieSprites.normal.attack.src = new URL(`/Apocalypse Character Pack/Apocalypse Character Pack/Zombie/Attack.png`, import.meta.url).href;
zombieSprites.normal.death.src = new URL(`/Apocalypse Character Pack/Apocalypse Character Pack/Zombie/Death.png`, import.meta.url).href;

// For other zombie types, use the same generic animations for now
zombieSprites.fast.idle.src = zombieSprites.normal.idle.src;
zombieSprites.fast.walk.src = zombieSprites.normal.walk.src;
zombieSprites.fast.attack.src = zombieSprites.normal.attack.src;
zombieSprites.fast.death.src = zombieSprites.normal.death.src;

zombieSprites.tank.idle.src = zombieSprites.normal.idle.src;
zombieSprites.tank.walk.src = zombieSprites.normal.walk.src;
zombieSprites.tank.attack.src = zombieSprites.normal.attack.src;
zombieSprites.tank.death.src = zombieSprites.normal.death.src;

zombieSprites.spitter.idle.src = zombieSprites.normal.idle.src;
zombieSprites.spitter.walk.src = zombieSprites.normal.walk.src;
zombieSprites.spitter.attack.src = zombieSprites.normal.attack.src;
zombieSprites.spitter.death.src = zombieSprites.normal.death.src;

export const playerSprites: Record<string, HTMLImageElement> = {
  idle: new Image(),
  shoot: new Image(),
  death: new Image(),
};

playerSprites.idle.src = new URL(`/Apocalypse Character Pack/Apocalypse Character Pack/Player/Idle.png`, import.meta.url).href;
playerSprites.shoot.src = new URL(`/Apocalypse Character Pack/Apocalypse Character Pack/Player/Shoot.png`, import.meta.url).href;
playerSprites.death.src = new URL(`/Apocalypse Character Pack/Apocalypse Character Pack/Player/Death.png`, import.meta.url).href;

export function preloadImages(): Promise<void> {
  const imagePromises: Promise<HTMLImageElement>[] = [];

  const addImagePromise = (image: HTMLImageElement) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      if (image.complete) {
        resolve(image);
      } else {
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load image: ${image.src}`));
      }
    });
  };

  // Add barrel sprites
  for (const key in barrelSprites) {
    imagePromises.push(addImagePromise(barrelSprites[key]));
  }

  // Add zombie sprites
  for (const type in zombieSprites) {
    for (const anim in zombieSprites[type]) {
      imagePromises.push(addImagePromise(zombieSprites[type][anim]));
    }
  }

  // Add player sprites
  for (const key in playerSprites) {
    imagePromises.push(addImagePromise(playerSprites[key]));
  }

  return Promise.all(imagePromises).then(() => {
    console.log("All images preloaded successfully!");
  }).catch(error => {
    console.error("Error preloading images:", error);
    throw error; // Re-throw to propagate the error
  });
}
