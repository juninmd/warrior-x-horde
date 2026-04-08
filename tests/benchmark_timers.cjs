const { performance } = require('perf_hooks');

const ITERATIONS = 10000;
const SOLDIERS_COUNT = 1000;

// Setup mock
const entities = {
    playerArmy: {
        soldiers: Array.from({ length: SOLDIERS_COUNT }, () => ({ hitTimer: 0 }))
    },
    enemyHordes: [
        {
            isActive: true,
            soldiers: Array.from({ length: SOLDIERS_COUNT }, () => ({ hitTimer: 0 }))
        }
    ],
    miniBosses: [],
    boss: null
};

const gameState = {
    activeHitEntities: []
};

// Hit a few
entities.playerArmy.soldiers[10].hitTimer = 10;
entities.enemyHordes[0].soldiers[50].hitTimer = 10;
gameState.activeHitEntities.push(entities.playerArmy.soldiers[10]);
gameState.activeHitEntities.push(entities.enemyHordes[0].soldiers[50]);

const dtFactor = 1;

function currentImplementation() {
    entities.playerArmy?.soldiers?.forEach(s => {
        if (s.hitTimer !== undefined && s.hitTimer > 0) s.hitTimer -= dtFactor;
    });
    entities.enemyHordes?.forEach(h => {
        if (h.isActive) {
            h.soldiers?.forEach(s => {
                if (s.hitTimer !== undefined && s.hitTimer > 0) s.hitTimer -= dtFactor;
            });
        }
    });
}

function optimizedImplementation() {
    const activeHits = gameState.activeHitEntities;
    if (activeHits) {
        for (let i = activeHits.length - 1; i >= 0; i--) {
            const entity = activeHits[i];
            if (entity.hitTimer !== undefined && entity.hitTimer > 0) {
                entity.hitTimer -= dtFactor;
            } else {
                activeHits[i] = activeHits[activeHits.length - 1];
                activeHits.pop();
            }
        }
    }
}

let start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    currentImplementation();
}
console.log('Current:', performance.now() - start, 'ms');

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    optimizedImplementation();
}
console.log('Optimized (O(K)):', performance.now() - start, 'ms');
