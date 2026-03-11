const { performance } = require('perf_hooks');

function fastRemove(array, index) {
  if (index < 0 || index >= array.length) return;
  const lastIndex = array.length - 1;
  if (index !== lastIndex) {
    array[index] = array[lastIndex];
  }
  array.pop();
}

const ITEMS_COUNT = 100000;
const REMOVE_COUNT = 50000;

function runBenchmark() {
  console.log(`Starting benchmark: Removing ${REMOVE_COUNT} items from array of size ${ITEMS_COUNT}`);

  // Test splice
  let arrSplice = Array.from({ length: ITEMS_COUNT }, (_, i) => i);
  let indicesToRemove = Array.from({ length: REMOVE_COUNT }, () => Math.floor(Math.random() * (arrSplice.length / 2)));

  const startSplice = performance.now();
  for (let i = 0; i < REMOVE_COUNT; i++) {
    // We modify array length during loop, so generating index on the fly based on current length is safer
    const idx = Math.floor(Math.random() * arrSplice.length);
    arrSplice.splice(idx, 1);
  }
  const endSplice = performance.now();
  console.log(`splice took: ${(endSplice - startSplice).toFixed(2)} ms`);

  // Test fastRemove
  let arrFastRemove = Array.from({ length: ITEMS_COUNT }, (_, i) => i);

  const startFastRemove = performance.now();
  for (let i = 0; i < REMOVE_COUNT; i++) {
    const idx = Math.floor(Math.random() * arrFastRemove.length);
    fastRemove(arrFastRemove, idx);
  }
  const endFastRemove = performance.now();
  console.log(`fastRemove took: ${(endFastRemove - startFastRemove).toFixed(2)} ms`);

  console.log(`Improvement: ${((endSplice - startSplice) / (endFastRemove - startFastRemove)).toFixed(2)}x faster`);
}

runBenchmark();