
import { Entities } from '../types';
import { setShooting } from '../input';
import { gameState } from '../gameState';
import { handleShopClick } from '../ui/shopUI';

export function setupMobileInput(entities: Entities, canvas: HTMLCanvasElement): void {
  canvas.addEventListener("touchstart", (e: TouchEvent) => {
    if (gameState.isShopOpen) {
      handleShopClick(e as unknown as MouseEvent, entities, gameState);
    } else {
      handleTouchStart(e, entities, canvas);
    }
  });
  canvas.addEventListener("touchmove", (e: TouchEvent) => handleTouchMove(e, entities, canvas));
  canvas.addEventListener("touchend", () => handleTouchEnd());

  // Add a button for mobile to open/close the shop
  const shopButton = Object.assign(document.createElement("button"), {
    innerText: "Shop",
    style: "position: absolute; bottom: 20px; left: 20px; padding: 10px 20px; font-size: 16px; z-index: 100;",
  });
  document.body.appendChild(shopButton);

  shopButton.addEventListener("click", () => {
    gameState.isShopOpen = !gameState.isShopOpen;
  });
}

function handleTouchStart(e: TouchEvent, entities: Entities, canvas: HTMLCanvasElement): void {
  setShooting(true);
  if (entities.allies.length > 0) {
    entities.allies[0].animationState = 'shooting';
  }
  handleTouchMove(e, entities, canvas);
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

function handleTouchEnd(): void {
  setShooting(false);
  if (entities.allies.length > 0) {
    entities.allies[0].animationState = 'idle';
  }
}
