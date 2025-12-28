// input.ts - Sistema de input (mouse/touch)
import { GameState } from './types';
import { activateSuperCannon } from './shooting';

let mouseX = 0;
let isDragging = false;
let gameStateRef: GameState | null = null;
let currentScale = 1;

export function getMouseX(): number {
  return mouseX;
}

export function setGameStateRef(gs: GameState): void {
  gameStateRef = gs;
}

export function setInputScale(scale: number): void {
  currentScale = scale;
}

// Converter coordenadas da tela para coordenadas do canvas
function screenToCanvasX(screenX: number, canvasRect: DOMRect): number {
  return (screenX - canvasRect.left) / currentScale;
}

export function setupInput(canvas: HTMLCanvasElement): void {
  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    mouseX = screenToCanvasX(e.clientX, canvas.getBoundingClientRect());
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      mouseX = screenToCanvasX(e.clientX, canvas.getBoundingClientRect());
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  // Touch events
  canvas.addEventListener('touchstart', (e) => {
    // Não prevenir default aqui para permitir que game.ts trate o game over
    if (gameStateRef && !gameStateRef.isGameOver) {
      e.preventDefault();
    }
    isDragging = true;
    if (e.touches.length > 0) {
      mouseX = screenToCanvasX(e.touches[0].clientX, canvas.getBoundingClientRect());
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDragging && e.touches.length > 0) {
      mouseX = screenToCanvasX(e.touches[0].clientX, canvas.getBoundingClientRect());
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Keyboard events for desktop
  document.addEventListener('keydown', (e) => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const step = 30;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      mouseX = Math.max(0, mouseX - step);
      isDragging = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      mouseX = Math.min(canvas.width, mouseX + step);
      isDragging = true;
    }
    // Super Cannon - Spacebar
    if (e.key === ' ' && gameStateRef) {
      e.preventDefault();
      activateSuperCannon(gameStateRef);
    }
  });
}

export function initializeMousePosition(canvasWidth: number): void {
  mouseX = canvasWidth / 2;
}
