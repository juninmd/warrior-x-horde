// spatial.ts - Sistema de Particionamento Espacial para Otimização de Colisões

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpatialRef = any;

export interface SpatialItem {
  x: number;
  y: number;
  width: number;
  height: number;
  ref: SpatialRef; // Referência ao objeto original (Soldier, MiniBoss, etc)
}

export class SpatialHashGrid {
  private cellSize: number;
  private buckets: Map<string, SpatialItem[]>;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
    this.buckets = new Map();
  }

  // Limpar a grid (deve ser chamado a cada frame antes de popular)
  // OTIMIZAÇÃO: Reutiliza arrays existentes para evitar Garbage Collection
  clear(): void {
    for (const bucket of this.buckets.values()) {
      bucket.length = 0;
    }
  }

  // Inserir um item na grid
  insert(item: SpatialItem): void {
    const minCol = Math.floor(item.x / this.cellSize);
    const maxCol = Math.floor((item.x + item.width) / this.cellSize);
    const minRow = Math.floor(item.y / this.cellSize);
    const maxRow = Math.floor((item.y + item.height) / this.cellSize);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col}:${row}`;
        let bucket = this.buckets.get(key);
        if (!bucket) {
          bucket = [];
          this.buckets.set(key, bucket);
        }
        bucket.push(item);
      }
    }
  }

  // Buscar itens próximos a uma área
  query(x: number, y: number, width: number, height: number): SpatialItem[] {
    const results = new Set<SpatialItem>();

    const minCol = Math.floor(x / this.cellSize);
    const maxCol = Math.floor((x + width) / this.cellSize);
    const minRow = Math.floor(y / this.cellSize);
    const maxRow = Math.floor((y + height) / this.cellSize);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col}:${row}`;
        const bucket = this.buckets.get(key);
        if (bucket && bucket.length > 0) {
          for (let i = 0; i < bucket.length; i++) {
             results.add(bucket[i]);
          }
        }
      }
    }

    return Array.from(results);
  }
}
