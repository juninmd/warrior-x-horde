import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupStartScreenInstallBtn } from '../src/ui-overlay';

// Mock vibrate since it is used in the click handler
vi.mock('../src/input', () => ({
  vibrate: vi.fn(),
}));

describe('UI Overlay Install Button', () => {
  let mockPrompt: any;
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.className = 'start-screen-content';
    document.body.appendChild(container);

    mockPrompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      preventDefault: vi.fn(),
    } as any;
  });

  it('should do nothing if start screen content is missing', () => {
    document.body.innerHTML = ''; // Remove container
    setupStartScreenInstallBtn(mockPrompt);
    expect(document.getElementById('startInstallBtn')).toBeNull();
  });

  it('should do nothing if deferredPrompt is missing', () => {
    setupStartScreenInstallBtn(null as any);
    expect(document.getElementById('startInstallBtn')).toBeNull();
  });

  it('should do nothing if button already exists', () => {
    const btn = document.createElement('button');
    btn.id = 'startInstallBtn';
    document.body.appendChild(btn);

    setupStartScreenInstallBtn(mockPrompt);
    // Should not have appended to container (so still on body only, or just check count)
    expect(document.querySelectorAll('#startInstallBtn').length).toBe(1);
  });

  it('should create and append install button', () => {
    setupStartScreenInstallBtn(mockPrompt);
    const btn = document.getElementById('startInstallBtn');
    expect(btn).not.toBeNull();
    expect(container.contains(btn)).toBe(true);
    expect(btn?.innerText).toContain('INSTALL APP');
  });

  it('should insert after start-btn if present', () => {
    const startBtn = document.createElement('button');
    startBtn.className = 'start-btn';
    container.appendChild(startBtn);

    // Add another element after startBtn to verify insertion order
    const footer = document.createElement('div');
    container.appendChild(footer);

    setupStartScreenInstallBtn(mockPrompt);

    const installBtn = document.getElementById('startInstallBtn');
    expect(startBtn.nextSibling).toBe(installBtn);
    expect(installBtn?.nextSibling).toBe(footer);
  });

  it('should handle click: prompt, userChoice, and remove', async () => {
    setupStartScreenInstallBtn(mockPrompt);
    const btn = document.getElementById('startInstallBtn') as HTMLButtonElement;

    // Mock console.log
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await btn.click();

    expect(mockPrompt.prompt).toHaveBeenCalled();
    // Wait for async click handler
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('accepted'));
    expect(document.getElementById('startInstallBtn')).toBeNull();

    logSpy.mockRestore();
  });
});
