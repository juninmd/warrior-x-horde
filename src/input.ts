import { createBullet } from './entities';
import { activateSuperCannon } from './abilities';
import { setupMobileInput } from './input/mobileInput';
import { setupDesktopInput } from './input/desktopInput';
import { Entities } from './types';

export const keys: Record<string, boolean> = {};
let isMobile = /Mobi|Android/i.test(navigator.userAgent);

export function setupInput(entities: Entities, canvas: HTMLCanvasElement): void {
  document.getElementById("superCannon")?.addEventListener("touchstart", () => {
    activateSuperCannon();
  });

  document.getElementById("superCannon")?.addEventListener("click", () => {
    activateSuperCannon();
  });

  if (isMobile) {
    setupMobileInput(entities, canvas);
  } else {
    setupDesktopInput(entities, canvas);
  }
}

export function processShooting(entities: Entities): void {
  if (entities.allies.length === 0) return;

  const now = Date.now();

  entities.allies.forEach(ally => {
    if (now - ally.lastShotTime >= ally.fireRate) {
      entities.bullets.push(createBullet(ally, false));
      ally.lastShotTime = now;
    }
  });
}