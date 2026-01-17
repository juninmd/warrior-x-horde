// spatial.ts - Sistema de Particionamento Espacial para Otimização de Colisões
import { Soldier, EnemyHorde, MiniBoss, Boss } from './types';

export class SpatialHashGrid {
  private cells: Map<string, Soldier[]>;
  private cellSize: number;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  // Limpar a grid (chamar todo frame antes de preencher)
  clear(): void {
    this.cells.clear();
  }

  // Adicionar um soldado à grid
  insert(soldier: Soldier): void {
    if (!soldier.isAlive) return;

    // Determinar em quais células o soldado está (pode estar em mais de uma se estiver na borda)
    // Para simplificar e ganhar performance, vamos usar apenas o ponto central
    // Se precisarmos de precisão absoluta nas bordas, teríamos que calcular min/max bounds
    const cellKey = this.getKey(soldier.x, soldier.y);

    if (!this.cells.has(cellKey)) {
      this.cells.set(cellKey, []);
    }
    this.cells.get(cellKey)!.push(soldier);
  }

  // Adicionar todos os inimigos das hordas
  insertEnemies(hordes: EnemyHorde[]): void {
    for (const horde of hordes) {
      if (!horde.isActive) continue;
      // Só inserir se a horda estiver "visível" ou próxima da tela
      // Otimização: Não processar hordas muito longe (-500 ou > 1500)
      if (horde.y < -500 || horde.y > 1500) continue;

      for (const soldier of horde.soldiers) {
        this.insert(soldier);
      }
    }
  }

  // Adicionar MiniBoss (tratado como um "Soldier" grande para colisão simplificada aqui,
  // mas idealmente a colisão de miniboss é separada. Se quisermos usar a grid,
  // precisaríamos de uma interface comum. Por enquanto, focamos em Soldiers vs Bullets)

  // Obter inimigos próximos a um ponto
  query(x: number, y: number): Soldier[] {
    const key = this.getKey(x, y);
    return this.cells.get(key) || [];
  }

  // Obter inimigos em uma área (verificando células adjacentes também)
  // Útil para balas rápidas ou áreas de explosão
  queryArea(x: number, y: number, radius: number): Soldier[] {
    const results: Soldier[] = [];
    const checkedKeys = new Set<string>();

    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        if (checkedKeys.has(key)) continue;
        checkedKeys.add(key);

        const cellSoldiers = this.cells.get(key);
        if (cellSoldiers) {
          for (const soldier of cellSoldiers) {
            results.push(soldier);
          }
        }
      }
    }

    return results;
  }

  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }
}

// Instância global da grid para ser usada pelo jogo
export const enemyGrid = new SpatialHashGrid(120); // Células de 120px (tamanho razoável para densidade)

export interface SpatialItem {
  x: number;
  y: number;
  width: number;
  height: number;
  ref: any; // Referência ao objeto original (Soldier, MiniBoss, etc)
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
