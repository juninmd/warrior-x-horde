import { createBullet } from './entities';
import { activateSuperCannon } from './abilities';
import { setupMobileInput } from './input/mobileInput';
import { setupDesktopInput } from './input/desktopInput';
import { Entities } from './types';
import { gameState } from './gameState';
import { handleShopClick } from './ui/shopUI';

export const keys: Record<string, boolean> = {};
export let isShooting = false;
export function setShooting(value: boolean) {
  isShooting = value;
}
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

