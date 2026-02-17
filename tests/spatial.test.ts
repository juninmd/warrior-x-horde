import { describe, it, expect } from 'vitest';
import { SpatialHashGrid } from '../src/spatial';

describe('SpatialHashGrid', () => {
  it('should initialize correctly', () => {
    const grid = new SpatialHashGrid(100);
    expect(grid).toBeDefined();
  });

  it('should insert and query items', () => {
    const grid = new SpatialHashGrid(100);
    const obj = { id: 1 };
    grid.insert(50, 50, 10, 10, 'test', obj);

    const nearby = grid.query(40, 40, 30, 30);
    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby[0].obj).toBe(obj);
    expect(nearby[0].type).toBe('test');
    expect(nearby[0].x).toBe(50);
  });

  it('should handle items spanning multiple cells', () => {
    const grid = new SpatialHashGrid(100);
    const obj = { id: 1 };
    // Spans from 50 (col 0 + offset) to 150 (col 1 + offset)
    grid.insert(50, 50, 100, 10, 'test', obj);

    // Query col 0 area
    const nearby1 = grid.query(0, 0, 10, 10);
    expect(nearby1.length).toBeGreaterThan(0);
    expect(nearby1[0].obj).toBe(obj);

    // Query col 1 area
    const nearby2 = grid.query(140, 50, 10, 10);
    expect(nearby2.length).toBeGreaterThan(0);
    expect(nearby2[0].obj).toBe(obj);
  });

  it('should clear the grid', () => {
    const grid = new SpatialHashGrid(100);
    grid.insert(50, 50, 10, 10, 'test', {});

    grid.clear();
    const nearby = grid.query(0, 0, 100, 100);
    expect(nearby.length).toBe(0);
  });

  it('should return unique items when querying multiple cells', () => {
    const grid = new SpatialHashGrid(100);
    const obj = { id: 1 };
    // Occupies multiple cells
    grid.insert(50, 50, 100, 10, 'test', obj);

    // Query area covering multiple cells where the item is present
    const nearby = grid.query(0, 0, 200, 100);
    expect(nearby.length).toBe(1);
    expect(nearby[0].obj).toBe(obj);
  });

  it('should reuse objects from pool', () => {
    const grid = new SpatialHashGrid(100);

    // First insertion
    grid.insert(10, 10, 10, 10, 'A', {});
    const items1 = grid.query(0, 0, 100, 100);
    const item1 = items1[0];

    grid.clear();

    // Second insertion
    grid.insert(20, 20, 10, 10, 'B', {});
    const items2 = grid.query(0, 0, 100, 100);
    const item2 = items2[0];

    // Should be the same object instance (reused)
    expect(item1).toBe(item2);
    expect(item2.type).toBe('B');
    expect(item2.x).toBe(20);
  });

  it('should handle out of bounds queries safely', () => {
    const grid = new SpatialHashGrid(100);
    const nearby = grid.query(-1000, -1000, 10, 10);
    expect(nearby).toEqual([]);
  });

  it('should ignore insertions completely out of bounds', () => {
    const grid = new SpatialHashGrid(100);
    // Way out of bounds
    grid.insert(-5000, -5000, 10, 10, 'test', {});

    // Query everywhere
    const nearby = grid.query(-5000, -5000, 10000, 10000);
    expect(nearby.length).toBe(0);
  });

  it('should expand pool when limit is reached', () => {
    const grid = new SpatialHashGrid(100);
    // Initial pool size is 500. Insert 501 items.
    for (let i = 0; i < 505; i++) {
        grid.insert(0, 0, 10, 10, 'test', { id: i });
    }

    const items = grid.query(0, 0, 100, 100);
    expect(items.length).toBe(505);
  });
});
