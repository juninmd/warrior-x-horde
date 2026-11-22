# AGENTS.md

Warrior X Horde: top-down survival shooter in TypeScript, played in the browser and packaged for Android with Capacitor.

## Stack

- TypeScript (strict), Vite, PixiJS v8 (WebGL layer), Canvas2D fallback
- Tests: Vitest with JSDOM, Playwright for E2E
- Package manager: pnpm 10.33.2 (`packageManager`), Node 22 in CI
- Mobile: Capacitor (`capacitor.config.ts`, `android/`)

## Commands

- Install: `pnpm install` (CI: `pnpm install --frozen-lockfile`)
- Dev: `pnpm run dev`
- Build: `pnpm run build` (`tsc --noEmit && vite build`)
- Lint: `pnpm run lint` (`eslint src`)
- Typecheck: `pnpm run typecheck`
- Test: `pnpm test` (watch) or `pnpm run coverage` (single run, 100% thresholds)
- E2E: `pnpm run e2e` (Playwright, `tests/e2e`)
- Android: `pnpm run cap:android` (build, sync, open Android Studio)

## Structure

- `src/game.ts`: game loop (`deltaTime` physics and rendering)
- `src/renderer.ts`: canvas drawing, `spriteCache`, background cache
- `src/pixi-layer.ts`: Pixi sprites for soldiers, hordes, bullets, particles
- `src/gameState.ts`: singleton `gameState`; `src/types.ts`: shared interfaces
- `src/entities.ts`: factories for soldiers, hordes, gates, enemies
- `src/boss-ai.ts`, `src/enemy-ai.ts`, `src/perks.ts`, `src/shop*.ts`, `src/rewards.ts`: game systems
- `src/*-art.ts`: procedural sprites (soldiers, bosses, biomes, gates), painted once and cached
- `src/hud.ts`, `src/ui-*.ts`: canvas HUD and DOM menus
- `tests/`: unit tests, `sim_invariants.test.ts` (headless bot sim), `tests/e2e`
- `docs/screenshots/`: sample screenshots. `ROADMAP.md`: planned work

## Conventions

- Lint: ESLint with the standard config. Typecheck runs strict.
- Coverage: 100% lines, functions, branches and statements. Keep it at 100%.
- Use `v8 ignore` only for visual-only code that JSDOM cannot verify (gradients, audio fallbacks), with a short reason.
- Performance: avoid `new` inside loops. Use the existing pools (`Soldier`, `Particle`, `FloatingText`) and reused module-level arrays. Prefer `OffscreenCanvas` for static heavy rendering.
- Keep rules in code: boss and perk hooks go through `getMods()`; rewards go through `src/rewards.ts` only.

## Gotchas

- Do not commit `.env`, keys or `.pem` files. Never print secrets.
- `window.__wxh` (cheats, `goToLevel`, `forceBoss`, `killBoss`) exists only in DEV builds. E2E relies on it.
- `pixi.js/unsafe-eval` is imported because of the CSP. Keep it.
- Canvas layers stack in `.game-canvas-wrapper`: `#gameCanvas` < `#pixiCanvas` < `#hudCanvas`. Without WebGL, the Canvas2D path runs.
- Right column and bottom-left are reserved for the DOM shop rail and the SUPER button.
- E2E screenshots go to `test-results/screenshots`. Set `PW_CHROMIUM` to use a custom Chromium binary.

<!-- base-actions-main-policy -->
## GitHub Actions — padrão obrigatório (@main)

- Referencie as actions internas sempre pelo branch, nunca por SHA:
  - `uses: juninmd/base-actions/<action>@main`
  - `uses: juninmd/base-actions/.github/workflows/<arquivo>.yml@main`
- Não fixe `@<sha>` em `juninmd/base-actions`: a atualização é centralizada no
  `main` e passa a valer no próximo run.
- PRs cujos checks não iniciam por billing/spending limit são mesclados pelo bot central
  `juninmd/base-actions/.github/workflows/auto-merge-billing-blocked.yml`.
  Para impedir o merge automático de um PR, aplique a label `do-not-merge`.
