
import { describe, it, expect, vi } from 'vitest';
import { ObjectPool } from '../src/pool';

describe('ObjectPool Edge Cases', () => {
    it('should warn when releasing an item already in the pool', () => {
        const pool = new ObjectPool<{ id: number }>(
            () => ({ id: 0 }),
            (o) => { o.id = 0; }
        );

        const item = pool.get();
        pool.release(item);

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        pool.release(item); // Double release

        expect(consoleSpy).toHaveBeenCalledWith('ObjectPool: Attempted to release item already in pool', item);
        consoleSpy.mockRestore();
    });
});
