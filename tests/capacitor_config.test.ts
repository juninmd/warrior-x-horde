import { describe, it, expect } from 'vitest';
import config from '../capacitor.config';

describe('capacitor config', () => {
  it('points to the vite build output with a valid app id', () => {
    expect(config.webDir).toBe('dist');
    expect(config.appId).toMatch(/^[a-z]+(\.[a-z0-9]+)+$/);
    expect(config.appName).toBeTruthy();
  });
});
