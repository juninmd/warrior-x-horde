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

// Haptic feedback
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore errors if vibration is not supported or allowed
    }
  }
}

// Converter coordenadas da tela para coordenadas do canvas
function screenToCanvasX(screenX: number, canvasRect: DOMRect): number {
  return (screenX - canvasRect.left) / currentScale;
}

function screenToCanvasY(screenY: number, canvasRect: DOMRect): number {
  return (screenY - canvasRect.top) / currentScale;
}

export function setupInput(canvas: HTMLCanvasElement): void {
  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = screenToCanvasX(e.clientX, rect);

    // Enable joystick for mouse too (great for desktop/testing)
    const canvasY = screenToCanvasY(e.clientY, rect);
    virtualJoystick.start(mouseX, canvasY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const rect = canvas.getBoundingClientRect();
      mouseX = screenToCanvasX(e.clientX, rect);

      const canvasY = screenToCanvasY(e.clientY, rect);
      virtualJoystick.move(mouseX, canvasY);
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    virtualJoystick.end();
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    virtualJoystick.end();
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
      const rect = canvas.getBoundingClientRect();
      const canvasX = screenToCanvasX(touch.clientX, rect);
      const canvasY = screenToCanvasY(touch.clientY, rect);

      // Update mouseX directly for absolute positioning (original behavior)
      mouseX = canvasX;
      isDragging = true;

      // Start virtual joystick with CANVAS coordinates
      virtualJoystick.start(canvasX, canvasY);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (gameStateRef && !gameStateRef.isGameOver) {
       e.preventDefault();
    }

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const canvasX = screenToCanvasX(touch.clientX, rect);
      const canvasY = screenToCanvasY(touch.clientY, rect);

      // Update mouseX directly
      mouseX = canvasX;
      isDragging = true;

      virtualJoystick.move(canvasX, canvasY);
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
