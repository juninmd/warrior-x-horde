// input.ts - Sistema de input (mouse/touch)
import { Entities } from './types';

let mouseX = 0;
let isDragging = false;

export function getMouseX(): number {
  return mouseX;
}

export function setupInput(canvas: HTMLCanvasElement): void {
  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    mouseX = e.clientX - canvas.getBoundingClientRect().left;
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      mouseX = e.clientX - canvas.getBoundingClientRect().left;
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
    e.preventDefault();
    isDragging = true;
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    }
  }, { passive: false });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isDragging && e.touches.length > 0) {
      mouseX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
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
  });
}

export function initializeMousePosition(canvasWidth: number): void {
  mouseX = canvasWidth / 2;
}
