
import { describe, it, expect } from 'vitest';
import { QualityManager } from '../src/quality';

describe('Quality Unknown', () => {
  it('should handle unknown quality setting gracefully', () => {
    const qm = QualityManager.getInstance();
    // @ts-ignore
    qm.setQuality('invalid_mode');
    // Should not crash and settings should remain (or default)
    expect(qm.settings).toBeDefined();
  });
});
