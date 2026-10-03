# Jules Agent Protocol & Knowledge Base

This file serves as the "Living Memory" for Jules and other agents working on this repository. It contains coding conventions, architectural insights, and a roadmap for future improvements.

## 🧠 Codebase Memory & Insights

### Architecture
- **Game Loop:** The core loop is in `src/game.ts`, handling physics updates (`deltaTime`) and rendering.
- **Rendering:** `src/renderer.ts` handles all canvas drawing. It uses a `spriteCache` for soldiers and particles to optimize performance.
- **State Management:** `src/gameState.ts` holds the singleton `gameState` object. `src/types.ts` defines all interfaces.
- **Pixi Layer:** `src/pixi-layer.ts` (PixiJS v8, WebGL) draws soldiers, hordes, bullets, particles and trail as sprites using the `spriteCache` canvases as textures. Layers are stacked in `.game-canvas-wrapper`: `#gameCanvas` (2D world) < `#pixiCanvas` < `#hudCanvas` (HUD/effects). `renderer.setWorldLayer()` enables it; without WebGL the pure Canvas2D path is used. Imports `pixi.js/unsafe-eval` because of the CSP.
- **Mobile (Capacitor):** `capacitor.config.ts`, `android/`. Run `npm run cap:android` (build + sync + open Android Studio).
- **E2E:** `npm run e2e` (Playwright, `tests/e2e`); screenshots in `test-results/screenshots`, samples in `docs/screenshots`. Set `PW_CHROMIUM` to use a custom Chromium binary.
- **Boss AI:** `src/boss-ai.ts` – 3 HP phases (66%/33%), telegraphed volleys (`aimed`/`fan`/`rain`), enemy bullets (`isEnemy`, `vx`) that kill soldiers (`resolveEnemyBullets`). Names/taunts in `src/boss-lore.ts`.
- **Story:** `src/story.ts` – 10 chapters (one per level), chapter/boss banners (`#storyBanner`), victory/defeat epilogues.
- **Perks:** `src/perks.ts` (8 stackable run upgrades: damage, fire rate, shield, coins, reinforcements, armor, super cooldown, combo) + `src/ui-perks.ts` (pick 1 of 3 after each boss; pauses the run). Hooks: `getMods()` in shooting/collisions/boss-ai.
- **Enemy archetypes:** `entities.createEnemyUnit` (runner/tank/spitter by level) + `src/enemy-ai.ts` (spitters fire aimed acid, capped at 24 bullets in flight).
- **Weather:** `src/weather.ts` – per-biome ambient particles + color grade, drawn in front of the action (`renderWeather`).
- **Cinematic:** `src/cinematic.ts` – typewriter intro (auto once on first real visit; `#storyBtn` replays). Radio calls from Cmdt. Vega at 50% of each level (`story.ts`).
- **Character art:** `src/soldier-art.ts` – procedural, supersampled (`SPRITE_SS`=2) soldiers (4 weapons, Super, 11 skin styles) and zombies (base/runner/tank/spitter), cached per key by `renderer.renderSoldierToCache`. Sprites are displayed at 1/SS (2D: `drawSoldier3D`, Pixi: `scale / SPRITE_SS`).
- **Boss art:** `src/boss-art.ts` – 9 chapter bosses + 4 elite mini-bosses painted once into cached 2x sprites (+ white flash variant); idle bob/breath in `renderer-boss.drawPaintedBoss`. The final Mothership still uses the older vector art.
- **Scenery:** `src/biome-art.ts` – sky, horizon landmarks, ground texture and road wear per biome, painted into a 2x background cache (`renderer.updateBackgroundCache`). Deterministic (seeded per biome).
- **Dev hook:** `window.__wxh` (DEV only) exposes state/cheats for e2e (`goToLevel`, `forceBoss`, `killBoss`, `setCoins`...).
- **Entities:** `src/entities.ts` contains factory functions for creating game objects (soldiers, hordes, gates).
- **Skins:** `src/skins.ts` holds the hero skin catalog + persisted selection (`crowdHeroSkin`, unlock by high score); `src/ui-skins.ts` renders the start-screen picker. The chosen `primary` color drives `createPlayerArmy` and is pre-rendered into the sprite cache.
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
