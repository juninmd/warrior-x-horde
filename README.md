# Warrior X Horde

[![CI](https://github.com/juninmd/warrior-x-horde/actions/workflows/ci.yml/badge.svg)](https://github.com/juninmd/warrior-x-horde/actions/workflows/ci.yml)
[![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?logo=netlify)](https://warrior-x-horde.netlify.app/)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

> **[Jogue agora!](https://warrior-x-horde.netlify.app/)** - Jogo de ação estilo Survivor-like onde você controla um exército de soldados contra hordas de zumbis.

## Sobre

Jogo web em TypeScript (Vite) renderizado em Canvas 2D, com camada WebGL via PixiJS v8 para sprites e fallback automático para Canvas 2D quando não há WebGL. Você conduz um exército por 10 capítulos, atravessa portais que alteram o exército, enfrenta chefes com fases, escolhe perks após cada chefe e compra itens na loja. Também empacotável como app Android via Capacitor.

## Funcionalidades

- **Gameplay Survivor-like:** hordas progressivas, 10 capítulos com biomas e chefes de 3 fases
- **Portais e barris:** benefícios (Reinforcement, Buff, Health) e penalidades (Nerf)
- **Super Cannon**, loja, perks empilháveis e skins de herói
- **Otimização:** object pooling, sprite caching, hashing espacial
- **Mobile:** toque, Wake Lock API, PWA e build Android (Capacitor)
- **Áudio dinâmico:** Web Audio API

## Como jogar

| Tecla | Ação |
|-------|------|
| WASD / Setas | Movimento |
| Clique / Toque | Atirar |
| Espaço | Super Cannon |
| P / Esc | Pausar |

Dicas: priorize barris de benefício, guarde o Super Cannon para ondas difíceis e mantenha-se em movimento.

## Screenshot

Capturas geradas pelos testes E2E (Playwright), versionadas em `docs/screenshots/`:

![Tela inicial](docs/screenshots/01-start-screen.png)
![Gameplay](docs/screenshots/02-gameplay.png)

## Requisitos

- Node.js 22 (versão usada no CI)
- pnpm 10.33.2 (campo `packageManager` do `package.json`; o CI usa `--frozen-lockfile` com `pnpm-lock.yaml`)
- Opcional: Android Studio para `cap:android`

## Instalação

```bash
pnpm install
```

## Configuração

Não há variáveis de ambiente obrigatórias. Apenas uma opcional, para os testes E2E:

| Variável | Uso |
|----------|-----|
| `PW_CHROMIUM` | Caminho de um binário Chromium customizado para o Playwright |

## Uso

```bash
pnpm run dev        # servidor de desenvolvimento (Vite, http://localhost:5173)
pnpm run build      # tsc --noEmit + vite build (saída em dist/)
pnpm run preview    # serve o build
pnpm run cap:sync   # build + cap sync (Capacitor)
pnpm run cap:android  # cap:sync + abre o Android Studio
```

## Testes, lint e tipos

```bash
pnpm run lint        # eslint src
pnpm run typecheck   # tsc --noEmit
pnpm test            # vitest (modo watch); use `pnpm exec vitest run` para execução única
pnpm run coverage    # vitest run --coverage, thresholds de 100% (linhas, funções, branches, statements)
pnpm run e2e         # Playwright (tests/e2e); sobe `npm run dev` sozinho
pnpm run e2e:shots   # E2E só no projeto chromium (gera capturas)
```

## Gates de CI

| Workflow | O que checa |
|----------|-------------|
| `ci.yml` (CI) | `pnpm install --frozen-lockfile`, lint, typecheck, coverage (100%), build e E2E Playwright; sobe o relatório como artefato |
| `validate.yml` (Validate) | Workflow reutilizável `juninmd/base-actions` (`reusable-validate.yml`), inclui checagem de arquivos de segredo versionados |
| `security.yml` (Security Scan) | Workflow reutilizável `juninmd/base-actions` (`reusable-security-scan.yml`); push na master, semanal e manual |
| `docker.yml` (Build and Push Docker Image) | Build e push da imagem via `reusable-docker-build.yml`; push na master e manual |

## Estrutura

```
warrior-x-horde/
├── src/                 # Código do jogo (game.ts, renderer.ts, pixi-layer.ts, boss-ai.ts, ...)
├── public/              # Sprites e áudio
├── tests/               # Testes unitários (Vitest)
│   └── e2e/             # Testes E2E (Playwright)
├── docs/screenshots/    # Capturas de tela
├── android/             # Projeto Capacitor Android
└── Dockerfile           # Build Vite servido por nginx
```

## Licença

ISC
