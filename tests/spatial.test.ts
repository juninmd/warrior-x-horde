import { describe, it, expect } from 'vitest';
import { SpatialHashGrid, SpatialItem } from '../src/spatial';

describe('SpatialHashGrid', () => {
  it('should initialize correctly', () => {
    const grid = new SpatialHashGrid(100);
    expect(grid).toBeDefined();
  });

  it('should insert and query items', () => {
    const grid = new SpatialHashGrid(100);
    const item: SpatialItem = { x: 50, y: 50, width: 10, height: 10, ref: {} };
    grid.insert(item);

    const nearby = grid.query(40, 40, 30, 30);
    expect(nearby).toContain(item);
  });

  it('should handle items spanning multiple cells', () => {
    const grid = new SpatialHashGrid(100);
    // Spans from 50 (col 0) to 150 (col 1)
    const item: SpatialItem = { x: 50, y: 50, width: 100, height: 10, ref: {} };
    grid.insert(item);

    // Query col 0
    const nearby1 = grid.query(0, 0, 10, 10);
    expect(nearby1).toContain(item);

    // Query col 1
    const nearby2 = grid.query(140, 50, 10, 10);
    expect(nearby2).toContain(item);
  });

  it('should clear the grid', () => {
    const grid = new SpatialHashGrid(100);
    const item: SpatialItem = { x: 50, y: 50, width: 10, height: 10, ref: {} };
    grid.insert(item);

    grid.clear();
    const nearby = grid.query(0, 0, 100, 100);
    expect(nearby.length).toBe(0);
  });

  it('should return unique items when querying multiple cells', () => {
    const grid = new SpatialHashGrid(100);
    const item: SpatialItem = { x: 50, y: 50, width: 100, height: 10, ref: {} };
    grid.insert(item); // Occupies 0:0 and 1:0

    // Query area covering both cells
    const nearby = grid.query(0, 0, 200, 100);
    expect(nearby.length).toBe(1);
    expect(nearby[0]).toBe(item);
  });
});
