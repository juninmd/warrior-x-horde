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
  clear(): void {
    this.buckets.clear();
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
        if (!this.buckets.has(key)) {
          this.buckets.set(key, []);
        }
        this.buckets.get(key)!.push(item);
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
        if (bucket) {
          for (const item of bucket) {
            results.add(item);
          }
        }
      }
    }

    return Array.from(results);
  }
}
