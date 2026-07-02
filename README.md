# Warrior X Horder

[![CI](https://github.com/juninmd/warrior-x-horde/actions/workflows/ci.yml/badge.svg)](https://github.com/juninmd/warrior-x-horde/actions/workflows/ci.yml)
[![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?logo=netlify)](https://warrior-x-horde.netlify.app/)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

> **[Jogue agora!](https://warrior-x-horde.netlify.app/)** - Jogo de ação estilo Survivor-like onde você controla um guerreiro enfrentando hordas de zumbis.

## Sobre

Warrior X Horder é um jogo de ação desenvolvido em TypeScript com renderização Canvas. Você controla um guerreiro que deve sobreviver a ondas de zumbis, coletando power-ups, barris de benefícios e utilizando canhões poderosos.

## Funcionalidades

- **Gameplay Survivor-like:** Ondas infinitas de zumbis com dificuldade progressiva
- **Power-ups:** Barris de benefício (Reinforcement, Buff, Health) e barris de penalidade (Nerf)
- **Sistema de Canhões:** Super Cannon para ondas difíceis e chefes
- **Otimização:** Object pooling, sprite caching, hashing espacial
- **Mobile:** Suporte a toque e Wake Lock API
- **Áudio Dinâmico:** Efeitos sonoros com Web Audio API

## Como Jogar

| Tecla | Ação |
|-------|------|
| WASD / Setas | Movimento |
| Clique / Toque | Atirar |
| Espaço | Super Cannon |

## Dicas

- Priorize barris de benefício (Reinforcement, Buff, Health)
- Use o Super Cannon estrategicamente em ondas difíceis
- Mantenha-se em movimento para evitar hordas

## Tech Stack

- **Engine:** HTML5 Canvas + TypeScript
- **Build:** Vite
- **Testes:** Vitest + Playwright
- **CI:** GitHub Actions
- **Deploy:** Netlify
- **Linter:** ESLint

## Como usar

```bash
npm install
npm run dev        # Desenvolvimento
npm run build      # Produção
npm test           # Testes
npm run coverage   # Cobertura
npm run lint       # Lint
```

## Estrutura

```
warrior-x-horder/
├── src/
│   ├── game.ts          # Game loop principal
│   ├── renderer.ts      # Renderização Canvas
│   ├── gameState.ts     # Gerenciamento de estado
│   ├── entities.ts      # Fábrica de entidades
│   ├── collisions.ts    # Sistema de colisão
│   ├── spatial.ts       # Hashing espacial
│   └── types.ts         # Interfaces TypeScript
├── public/
│   ├── sprites/         # Sprites do jogo
│   └── audio/           # Efeitos sonoros
├── tests/               # Testes E2E
└── tests/               # Testes unitários (Vitest)
```

## Licença

ISC
