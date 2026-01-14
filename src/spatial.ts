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
