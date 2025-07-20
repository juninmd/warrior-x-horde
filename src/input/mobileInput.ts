
import { Entities } from '../types';
import { processShooting } from '../input';

let autoShootInterval: number | null = null;

function startAutoShooting(entities: Entities): void {
  if (autoShootInterval === null) {
    autoShootInterval = window.setInterval(() => {
      processShooting(entities);
    }, 100); // Atira automaticamente a cada 100ms
  }
}

export function setupMobileInput(entities: Entities, canvas: HTMLCanvasElement): void {
  startAutoShooting(entities);
  canvas.addEventListener("touchstart", (e: TouchEvent) => handleTouchMove(e, entities, canvas));
}

function handleTouchMove(e: TouchEvent, entities: Entities, canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const touch = e.touches[0];
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;

  if (entities.allies.length > 0) {
    const mainPlayer = entities.allies[0];
    mainPlayer.x = x - mainPlayer.width / 2;
    mainPlayer.y = y - mainPlayer.height / 2;
  }
}
