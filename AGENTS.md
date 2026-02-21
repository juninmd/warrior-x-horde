# Jules Agent Protocol & Knowledge Base

This file serves as the "Living Memory" for Jules and other agents working on this repository. It contains coding conventions, architectural insights, and a roadmap for future improvements.

## 🧠 Codebase Memory & Insights

### Architecture
- **Game Loop:** The core loop is in `src/game.ts`, handling physics updates (`deltaTime`) and rendering.
- **Rendering:** `src/renderer.ts` handles all canvas drawing. It uses a `spriteCache` for soldiers and particles to optimize performance.
- **State Management:** `src/gameState.ts` holds the singleton `gameState` object. `src/types.ts` defines all interfaces.
- **Entities:** `src/entities.ts` contains factory functions for creating game objects (soldiers, hordes, gates).
- **Collision:** `src/collisions.ts` manages interactions (Army vs Horde, Army vs Gate). It uses optimized bounding box checks (`getArmyBounds`).
- **Optimization:**
    - **Object Pools:** Used for `Soldier`, `Particle`, and `FloatingText` to minimize GC.
    - **Reusable Arrays:** Module-level arrays (e.g., `tempAliveNormalSoldiers`) in `renderer.ts` reduce allocation per frame.
    - **Spatial Hashing:** `src/spatial.ts` implements a spatial grid for broader collision phases (though currently collisions uses brute-force O(N*M) with bounding box pre-checks).

### Coding Conventions
- **Language:** TypeScript (Strict mode).
- **Styling:** ESLint with standard config.
- **Testing:** Vitest with JSDOM. Coverage thresholds: 100% Lines, 100% Functions, 100% Branches, 100% Statements.
- **Performance:**
    - Avoid `new` inside loops. Use pools or reused objects/arrays.
    - Prefer `OffscreenCanvas` for static heavy rendering.
    - Use `v8 ignore` for visual-only code (rendering gradients, audio fallbacks) that JSDOM cannot verify.

### Key Learnings (Antigravity Audit)
- **Gate Rendering:** `drawGate` re-creates Linear and Radial gradients every frame. Optimization via caching (OffscreenCanvas) is planned.
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`) enforces rigorous testing and linting.
- **Mobile Optimization:** Input scaling (`scale` in `game.ts`) and Wake Lock API are implemented for mobile.

---

## 🗺️ Roadmap

### ⚡ Performance (Bolt)
- [x] **Soldier Caching:** Implemented via `spriteCache`.
- [x] **Gate Caching:** Cache `Gate` visuals to avoid per-frame gradient generation.
- [ ] **Collision Optimization:** Implement Spatial Partitioning (QuadTree or Grid) for Army vs Horde collisions if unit count increases significantly.

### 🎨 UX & Accessibility (Palette)
- [ ] **High Contrast Mode:** Add a setting for better visibility.
- [ ] **Screen Reader Support:** Add ARIA labels to canvas overlay buttons.

### 🛡️ Security (Sentinel)
- [ ] **Input Sanitization:** Ensure any future user input (e.g., name for leaderboard) is sanitized.

### 💡 Features (Spark)
- [ ] **New Biomes:** Procedurally generate themes beyond level 10.
- [ ] **Save Slots:** Allow multiple save files.

---

## 🛠️ Tooling & Commands
- **Install:** `npm install`
- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Test:** `npm test` (or `npm run coverage`)
