const { performance } = require('perf_hooks');

const runs = 10000;
const gatesCount = 1000;
const gates = Array.from({ length: gatesCount }, (_, i) => ({ y: Math.random() * 2000 - 500 }));

function method1() {
    return Math.min(...gates.map(g => g.y));
}

function method2() {
    let min = Infinity;
    for (let i = 0; i < gates.length; i++) {
        if (gates[i].y < min) {
            min = gates[i].y;
        }
    }
    return min;
}

// Warmup
for (let i = 0; i < 1000; i++) {
    method1();
    method2();
}

const start1 = performance.now();
for (let i = 0; i < runs; i++) {
    method1();
}
const end1 = performance.now();

const start2 = performance.now();
for (let i = 0; i < runs; i++) {
    method2();
}
const end2 = performance.now();

console.log(`Method 1 (Math.min + map): ${end1 - start1} ms`);
console.log(`Method 2 (for loop): ${end2 - start2} ms`);
