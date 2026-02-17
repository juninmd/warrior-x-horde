// Mock dependencies
import { vi } from 'vitest';

// Mock Canvas API
class CanvasRenderingContext2DMock {
  canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  fillRect = vi.fn();
  clearRect = vi.fn();
  getImageData = vi.fn(() => ({ data: new Uint8ClampedArray(4) }));
  putImageData = vi.fn();
  createImageData = vi.fn(() => ({ data: new Uint8ClampedArray(4) }));
  setTransform = vi.fn();
  drawImage = vi.fn();
  save = vi.fn();
  restore = vi.fn();
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  closePath = vi.fn();
  stroke = vi.fn();
  translate = vi.fn();
  scale = vi.fn();
  rotate = vi.fn();
  arc = vi.fn();
  fill = vi.fn();
  measureText = vi.fn(() => ({ width: 0 }));
  fillText = vi.fn();
  strokeText = vi.fn();
  createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
  createRadialGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
  clip = vi.fn();
  roundRect = vi.fn();
  ellipse = vi.fn();
  strokeRect = vi.fn();
  quadraticCurveTo = vi.fn();
  bezierCurveTo = vi.fn();
  globalAlpha = 1;
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '';
  textAlign = 'left';
  textBaseline = 'alphabetic';
  shadowColor = '';
  shadowBlur = 0;
  shadowOffsetX = 0;
  shadowOffsetY = 0;
  setLineDash = vi.fn();
}

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn(function(this: HTMLCanvasElement, contextId: string) {
    if (contextId === '2d') {
        // @ts-ignore
        return new CanvasRenderingContext2DMock(this);
    }
    return null;
}) as any;

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => '');

// Mock AudioContext
window.AudioContext = vi.fn().mockImplementation(() => ({
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { value: 0 } })),
  createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
  destination: {},
  currentTime: 0,
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
}));

// Mock Audio Element
window.HTMLAudioElement.prototype.play = vi.fn().mockReturnValue(Promise.resolve());
window.HTMLAudioElement.prototype.pause = vi.fn();
window.HTMLAudioElement.prototype.load = vi.fn();
window.HTMLAudioElement.prototype.cloneNode = vi.fn(function() { return this; });

// Mock requestAnimationFrame
window.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16);
});
window.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock LocalStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    key: vi.fn((index) => Object.keys(store)[index] || null),
    length: 0
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Navigator Vibrate
Object.defineProperty(navigator, 'vibrate', { value: vi.fn() });

// Mock Image
global.Image = class {
  onload: () => void = () => {};
  src: string = '';
  width: number = 0;
  height: number = 0;
} as any;

// Ensure gameCanvas exists for game.ts top-level execution
if (!document.getElementById('gameCanvas')) {
    const canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    document.body.appendChild(canvas);
}

// Mock Pointer Events if not present (JSDOM might lack full pointer support)
if (!window.PointerEvent) {
  // @ts-ignore
  window.PointerEvent = class extends MouseEvent {
      constructor(type: string, params: any) {
          super(type, params);
      }
  } as any;
}
