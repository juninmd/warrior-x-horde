// spatial.ts - Sistema de Particionamento Espacial para Otimização de Colisões

// Flattened structure to avoid allocations
export interface SpatialItem {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  horde?: any;
  _lastQueryId?: number;
}

export class SpatialHashGrid {
  private cellSize: number;
  private cols: number;
  private rows: number;
  private buckets: SpatialItem[][];

  // Object Pool for SpatialItems
  private pool: SpatialItem[];
  private poolIndex: number;

  // Grid bounds for indexing
  private width: number;
  private height: number;
  private xOffset: number; // To handle x < 0
  private yOffset: number; // To handle y < 0

  constructor(cellSize: number = 120, width: number = 800, height: number = 2000) {
    this.cellSize = cellSize;
    this.width = width;
    this.height = height;

    // Calculate grid dimensions including margins
    // Center the play area (approx 480x800) within the grid
    this.xOffset = width / 2;
    this.yOffset = 200; // Allow some space above 0

    this.cols = Math.ceil((width + this.xOffset * 2) / cellSize);
    this.rows = Math.ceil((height + this.yOffset * 2) / cellSize);

    this.buckets = new Array(this.cols * this.rows);
    for (let i = 0; i < this.buckets.length; i++) {
      this.buckets[i] = [];
    }

    this.pool = [];
    this.poolIndex = 0;

    // Pre-allocate some items in pool
    for(let i=0; i<500; i++) {
        this.pool.push({ x:0, y:0, width:0, height:0, type:'', obj:null });
    }
  }

  // Get item from pool
  private getFromPool(
    x: number,
    y: number,
    width: number,
    height: number,
    type: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    horde?: any
  ): SpatialItem {
    if (this.poolIndex >= this.pool.length) {
      // Expand pool
      this.pool.push({ x, y, width, height, type, obj, horde });
      return this.pool[this.poolIndex++];
    }

    const item = this.pool[this.poolIndex++];
    item.x = x;
    item.y = y;
    item.width = width;
    item.height = height;
    item.type = type;
    item.obj = obj;
    item.horde = horde;
    return item;
  }

  // Limpar a grid (deve ser chamado a cada frame antes de popular)
  // OTIMIZAÇÃO: Reutiliza arrays existentes para evitar Garbage Collection
  clear(): void {
    this.poolIndex = 0;
    for (let i = 0; i < this.buckets.length; i++) {
      this.buckets[i].length = 0;
    }
  }

  private getBucketIndex(col: number, row: number): number {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return -1;
    return row * this.cols + col;
  }

  // Inserir um item na grid
  insert(
    x: number,
    y: number,
    width: number,
    height: number,
    type: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    horde?: any
  ): void {
    // Map coordinates to grid indices
    // Add offsets to handle negative coordinates or center alignment logic

    const minCol = Math.floor((x + this.xOffset) / this.cellSize);
    const maxCol = Math.floor((x + width + this.xOffset) / this.cellSize);
    const minRow = Math.floor((y + this.yOffset) / this.cellSize);
    const maxRow = Math.floor((y + height + this.yOffset) / this.cellSize);

    // Get a pooled item ONCE
    const item = this.getFromPool(x, y, width, height, type, obj, horde);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const idx = this.getBucketIndex(col, row);
        if (idx !== -1) {
            this.buckets[idx].push(item);
        }
      }
    }
  }

  // Buscar itens próximos a uma área
  // OTIMIZAÇÃO: Suporta um array de saída opcional para evitar alocações (GC)
  query(x: number, y: number, width: number, height: number, outArray?: SpatialItem[]): SpatialItem[] {
    // We can't return a Set or new Array easily without allocation.
    // But updateBullets iterates this list immediately.
    // We can populate a reused array and return it.
    // Or return an iterator?
    // Returning a new array is safer for now, but to optimize we could pass a target array.
    // For now, let's keep array return but optimize creation.

    const results: SpatialItem[] = outArray || [];
    if (outArray) {
      outArray.length = 0;
    }

    // Simple deduplication using a unique ID per frame?
    // Or just Set. A temporary Set is cleaner logic-wise.
    // Performance-wise, Set iteration is slower than Array.
    // Since we check collision, duplicate checks are wasteful but not fatal (idempotent damage?).
    // No, damage is NOT idempotent (hp -= damage).
    // So we MUST return unique items.

    // We can tag items with a queryId to avoid duplicates without a Set.
    // Add queryId to SpatialItem.

    const queryId = this.queryIdCounter++;

    const minCol = Math.floor((x + this.xOffset) / this.cellSize);
    const maxCol = Math.floor((x + width + this.xOffset) / this.cellSize);
    const minRow = Math.floor((y + this.yOffset) / this.cellSize);
    const maxRow = Math.floor((y + height + this.yOffset) / this.cellSize);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const idx = this.getBucketIndex(col, row);
        if (idx !== -1) {
          const bucket = this.buckets[idx];
          for (let i = 0; i < bucket.length; i++) {
             const item = bucket[i];
             if (item._lastQueryId !== queryId) {
                 item._lastQueryId = queryId;
                 results.push(item);
             }
          }
        }
      }
    }

    return results;
  }

  private queryIdCounter = 0;
}
