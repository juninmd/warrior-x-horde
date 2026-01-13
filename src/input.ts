// input.ts - Sistema de input (mouse/touch)
import { GameState } from './types';
import { activateSuperCannon } from './shooting';

let mouseX = 0;
let isDragging = false;
let gameStateRef: GameState | null = null;
let currentScale = 1;

// Virtual Joystick
export class VirtualJoystick {
  active: boolean = false;
  startX: number = 0;
  startY: number = 0;
  currentX: number = 0;
  currentY: number = 0;
  maxRadius: number = 50;

  start(x: number, y: number) {
    this.active = true;
    this.startX = x;
    this.startY = y;
    this.currentX = x;
    this.currentY = y;
  }

  move(x: number, y: number) {
    if (!this.active) return;
    this.currentX = x;
    this.currentY = y;
  }

  end() {
    this.active = false;
  }

  getDeltaX(): number {
    if (!this.active) return 0;
    const dx = this.currentX - this.startX;
    // Clamp to maxRadius for normalized feel, but return raw delta for direct mapping if needed
    // For this game, we want direct mapping or relative movement
    return dx;
  }
}

export const virtualJoystick = new VirtualJoystick();

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
      // Check if touch is not on UI elements (like Super Cannon button)
      const target = e.target as HTMLElement;
      if (target.tagName !== 'BUTTON') {
        e.preventDefault();
      }
    }

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const canvasX = screenToCanvasX(touch.clientX, canvas.getBoundingClientRect());

      // Update mouseX directly for absolute positioning (original behavior)
      mouseX = canvasX;
      isDragging = true;

      // Start virtual joystick for relative movement options if we add them later
      virtualJoystick.start(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (gameStateRef && !gameStateRef.isGameOver) {
       e.preventDefault();
    }

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const canvasX = screenToCanvasX(touch.clientX, canvas.getBoundingClientRect());

      // Update mouseX directly
      mouseX = canvasX;
      isDragging = true;

      virtualJoystick.move(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
    virtualJoystick.end();
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
