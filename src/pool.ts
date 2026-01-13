// pool.ts - Generic Object Pool

export class ObjectPool<T> {
  private items: T[] = [];
  private factory: () => T;
  private reset: (item: T) => void;

  constructor(factory: () => T, reset: (item: T) => void) {
    this.factory = factory;
    this.reset = reset;
  }

  public get(): T {
    if (this.items.length > 0) {
      const item = this.items.pop()!;
      this.reset(item);
      return item;
    }
    return this.factory();
  }

  public release(item: T): void {
    this.items.push(item);
  }

  public size(): number {
    return this.items.length;
  }
}
