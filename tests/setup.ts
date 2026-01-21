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
  quadraticCurveTo = vi.fn(); // Added this
  bezierCurveTo = vi.fn(); // Added this for future safety
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
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
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
  resume: vi.fn(),
  suspend: vi.fn(),
}));

// Mock Audio Element play
window.HTMLAudioElement.prototype.play = vi.fn().mockReturnValue(Promise.resolve());
window.HTMLAudioElement.prototype.pause = vi.fn();
window.HTMLAudioElement.prototype.cloneNode = vi.fn(function() { return this; }); // Return self for chaining

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
    })
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
