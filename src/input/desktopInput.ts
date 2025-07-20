
import { Entities } from '../types';
import { keys } from '../input';
import { activateSuperCannon } from '../abilities';
import { toggleAudio } from '../audioManager';
import { processShooting } from '../input';
import { canvas } from '../game';

export function setupDesktopInput(entities: Entities, canvas: HTMLCanvasElement): void {
  canvas.addEventListener("mousemove", (e: MouseEvent) => handleMouseMove(e, entities, canvas));
  canvas.addEventListener("mousedown", (e: MouseEvent) => handleMouseClick(e, entities));
  canvas.addEventListener("click", (e: MouseEvent) => handleMouseClick(e, entities));

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
    processShooting(entities);
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  keys[e.key] = false;
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
