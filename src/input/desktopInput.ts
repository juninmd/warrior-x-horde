
import { Entities } from '../types';
import { keys, setShooting } from '../input';
import { activateSuperCannon } from '../abilities';
import { toggleAudio } from '../audioManager';
import { canvas } from '../game';
import { gameState } from '../gameState';
import { handleShopClick } from '../ui/shopUI';

let currentEntities: Entities;

export function setupDesktopInput(entities: Entities, canvas: HTMLCanvasElement): void {
  currentEntities = entities;
  canvas.addEventListener("mousemove", (e: MouseEvent) => handleMouseMove(e, entities, canvas));
  canvas.addEventListener("mousedown", (e: MouseEvent) => handleMouseClick(e, entities));
  canvas.addEventListener("click", (e: MouseEvent) => {
    if (gameState.isShopOpen) {
      handleShopClick(e, entities, gameState);
    } else {
      handleMouseClick(e, entities);
    }
  });

  window.addEventListener("keydown", (e: KeyboardEvent) => handleKeyDown(e, entities));
  window.addEventListener("keyup", (e: KeyboardEvent) => handleKeyUp(e));
}

function handleKeyDown(e: KeyboardEvent, entities: Entities): void {
  keys[e.key] = true;

  if (e.key === 'm') {
    toggleAudio();
    e.preventDefault();
  }

  if (e.key === 'c' && entities.allies.length > 0) {
    activateSuperCannon();
  }

  if (e.key === ' ') {
    setShooting(true);
    if (entities.allies.length > 0) {
      entities.allies[0].animationState = 'shooting';
    }
  }

  if (e.key === 'p') {
    gameState.isShopOpen = !gameState.isShopOpen;
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  keys[e.key] = false;
  if (e.key === ' ') {
    setShooting(false);
    if (currentEntities.allies.length > 0) {
      currentEntities.allies[0].animationState = 'idle';
    }
  }
}

function handleMouseMove(e: MouseEvent, entities: Entities, canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  if (entities.allies.length > 0) {
    const mainPlayer = entities.allies[0];
    if (mainPlayer.width !== undefined && mainPlayer.height !== undefined) {
      mainPlayer.x = x - mainPlayer.width / 2;
      mainPlayer.y = y - mainPlayer.height / 2;
    }
  }
}

function handleMouseClick(e: MouseEvent, entities: Entities): void {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  if (entities.allies.length > 0) {
    const mainPlayer = entities.allies[0];
    mainPlayer.x = x - mainPlayer.width / 2;
    mainPlayer.y = y - mainPlayer.height / 2;
  }
}
