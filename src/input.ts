// input.ts - Sistema de input (mouse/touch)
import { GameState } from './types';
import { activateSuperCannon } from './shooting';

let mouseX = 0;
let isDragging = false;
let gameStateRef: GameState | null = null;
let currentScale = 1;
let activeTouchId: number | null = null;

// Virtual Joystick
export class VirtualJoystick {
  active: boolean = false;
  alpha: number = 0;
  startX: number = 0;
  startY: number = 0;
  currentX: number = 0;
  currentY: number = 0;
  maxRadius: number = 50;
  deadZone: number = 5; // Pixels de movimento ignorados

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
    /* v8 ignore next 2 */
    if (!this.active) return 0;
    const dx = this.currentX - this.startX;
    if (Math.abs(dx) < this.deadZone) return 0;
    return dx;
  }
}

export const virtualJoystick = new VirtualJoystick();

// Variaveis para controle relativo (Touch)
let touchStartX = 0;
let armyStartX = 0;

export function getMouseX(): number {
  return mouseX;
}

export function setGameStateRef(gs: GameState): void {
  gameStateRef = gs;
}

export function setInputScale(scale: number): void {
  currentScale = scale;
}

export function resetInput(): void {
  activeTouchId = null;
  isDragging = false;
  virtualJoystick.end();
}

// Converter coordenadas da tela para coordenadas do canvas
function screenToCanvasX(screenX: number, canvasRect: DOMRect): number {
  return (screenX - canvasRect.left) / currentScale;
}

export function vibrate(ms: number): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignore vibration errors
      /* v8 ignore next 2 */
    }
  }
}

export function setupInput(canvas: HTMLCanvasElement): void {
  // Mouse events (Desktop - Absolute positioning is fine/expected for mouse)
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

  // Touch events (Mobile - Relative positioning for better experience)
  // Robust multi-touch handling: Track specific finger ID
  canvas.addEventListener('touchstart', (e) => {
    // Não prevenir default aqui para permitir que game.ts trate o game over
    if (gameStateRef && !gameStateRef.isGameOver) {
      // Check if touch is not on UI elements (like Super Cannon button)
      const target = e.target as HTMLElement;
      if (target.tagName !== 'BUTTON') {
        e.preventDefault();
      }
    }

    // Only accept a new touch if we aren't already dragging
    if (activeTouchId === null && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      activeTouchId = touch.identifier;

      const rect = canvas.getBoundingClientRect();
      const touchX = screenToCanvasX(touch.clientX, rect);

      touchStartX = touchX;
      armyStartX = mouseX; // Anchor to current position
      isDragging = true;

      // Start virtual joystick for visualization
      virtualJoystick.start(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (gameStateRef && !gameStateRef.isGameOver) {
       e.preventDefault(); // Stop scrolling/zooming
    }

    if (activeTouchId !== null) {
      // Find the active touch
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          const touch = e.changedTouches[i];
          const rect = canvas.getBoundingClientRect();
          const currentTouchX = screenToCanvasX(touch.clientX, rect);

          // Relative movement
          const delta = currentTouchX - touchStartX;

          // Sensitivity factor (1.2 for slightly faster response than finger)
          const sensitivity = 1.2;

          let newX = armyStartX + delta * sensitivity;

          // Clamp to screen bounds
          newX = Math.max(0, Math.min(canvas.width, newX));

          mouseX = newX;

          // Joystick visual update
          /* v8 ignore next 2 */
          virtualJoystick.move(touch.clientX, touch.clientY);
          break;
        }
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (activeTouchId !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        /* v8 ignore start */
        if (e.changedTouches[i].identifier === activeTouchId) {
          activeTouchId = null;
          isDragging = false;
          virtualJoystick.end();
          break;
        }
        /* v8 ignore stop */
      }
    }
  });

  /* v8 ignore start */
  canvas.addEventListener('touchcancel', (e) => {
    if (activeTouchId !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          activeTouchId = null;
          isDragging = false;
          virtualJoystick.end();
          break;
        }
      }
    }
  });
  /* v8 ignore stop */

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
