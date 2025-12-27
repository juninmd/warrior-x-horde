# Crowd Runner - Warrior X Horde - AI Coding Instructions

## Project Overview
Mobile-first crowd runner game built with TypeScript and Canvas2D. The player controls an army that grows/shrinks by passing through gates, battling enemy hordes automatically. Inspired by games like "Count Masters" and "Mob Control".

## Architecture

### Core Game Loop (`src/game.ts`)
Entry point with `requestAnimationFrame` loop: input → spawn → movement → collision → render.

### State Management
- **`gameState.ts`**: Single mutable object for game state (level, score, speed, battle status)
- **`types.ts`**: All TypeScript interfaces (`Army`, `Soldier`, `EnemyHorde`, `Gate`, `Boss`)
- **`entities`** object: Runtime entity collections (`playerArmy`, `enemyHordes[]`, `gates[]`, `bullets[]`)

### Module Organization
```
src/types.ts       - All interfaces and type definitions
src/gameState.ts   - Global mutable game state
src/entities.ts    - Factory functions for creating entities
src/renderer.ts    - All Canvas2D drawing logic with 3D perspective
src/collisions.ts  - Gate effects, battle system, boss damage
src/movement.ts    - Army formation, entity scrolling
src/spawner.ts     - Gate pairs, enemy hordes, boss spawning
src/input.ts       - Mouse drag / touch / keyboard controls
```

### Data Flow
1. **Input** - Mouse drag or keyboard moves army horizontally
2. **Spawning** - Gates and hordes spawn above screen, scroll down
3. **Movement** - All entities scroll down, army maintains formation
4. **Collision** - Gates apply effects, hordes trigger auto-battle
5. **Rendering** - 3D perspective with depth sorting

## Key Conventions

### Entity Creation
Factory functions in `src/entities.ts`:
- `createPlayerArmy(width, height)` - Initial 5 soldiers
- `addSoldiersToArmy(army, count)` - Add soldiers in formation
- `multiplySoldiersInArmy(army, multiplier)` - Multiply army
- `createEnemyHorde(width, y, count)` - Enemy group
- `createGatePair(width, y)` - Two gates side by side

### Gate Types
```typescript
type: 'add' | 'multiply' | 'subtract' | 'divide'
// Green = add, Blue = multiply, Red = subtract, Purple = divide
```

### Soldier Formation
Soldiers arrange in concentric circles around `army.centerX/centerY` with smooth interpolation.

### Battle System
When player army collides with enemy horde:
- 1v1 casualties each frame
- Dead soldiers removed from both sides
- Screen shake effect on collision

## Development Commands
```bash
pnpm dev        # Start Vite dev server
pnpm build      # Production build
pnpm typecheck  # TypeScript validation
```

## Adding New Features

### New Gate Type
1. Add type to `Gate.type` union in `types.ts`
2. Handle creation in `createGate()` in `entities.ts`
3. Add effect in `applyGateEffect()` in `collisions.ts`
4. Add color/text in `drawGate()` in `renderer.ts`

### New Visual Effect
1. Add to floating texts: `addFloatingText(text, x, y, color)`
2. Or add custom drawing in `renderer.ts`

### New Entity Type
1. Add interface to `types.ts`
2. Add to `Entities` interface
3. Create factory function in `entities.ts`
4. Add drawing logic in `renderer.ts`
5. Add collision logic in `collisions.ts`
6. Add spawning logic in `spawner.ts`

## Code Style
- ESLint with TypeScript strict rules
- Comments in Portuguese are acceptable
- Prefer `const` over `let`
- Use factory functions for entity creation
