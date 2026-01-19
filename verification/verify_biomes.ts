
import { getBiomeColors } from '../src/utils';
import { THEMES } from '../src/constants';

console.log('Verifying Biome System...');

// Test Levels 1-10
for (let i = 1; i <= 10; i++) {
  const theme = getBiomeColors(i);
  if (!theme) {
    console.error(`ERROR: Theme not found for Level ${i}`);
    process.exit(1);
  }
  if (theme.name !== THEMES[i].name) {
    console.error(`ERROR: Theme mismatch for Level ${i}. Expected ${THEMES[i].name}, got ${theme.name}`);
    process.exit(1);
  }
  console.log(`Level ${i}: ${theme.name} - OK`);
}

// Test Levels > 10 (Cycling)
const level11Theme = getBiomeColors(11);
if (level11Theme.name !== THEMES[1].name) {
    console.error(`ERROR: Level 11 should cycle to Grasslands. Got ${level11Theme.name}`);
    process.exit(1);
}
console.log(`Level 11: ${level11Theme.name} (Cycles to 1) - OK`);

const level12Theme = getBiomeColors(12);
if (level12Theme.name !== THEMES[2].name) {
    console.error(`ERROR: Level 12 should cycle to Desert. Got ${level12Theme.name}`);
    process.exit(1);
}
console.log(`Level 12: ${level12Theme.name} (Cycles to 2) - OK`);

// Test Procedural Cycling Formula Logic
// Level 20 -> Theme 10
const level20Theme = getBiomeColors(20);
if (level20Theme.name !== THEMES[10].name) {
    console.error(`ERROR: Level 20 should cycle to Alien. Got ${level20Theme.name}`);
    process.exit(1);
}
console.log(`Level 20: ${level20Theme.name} (Cycles to 10) - OK`);

// Level 21 -> Theme 1
const level21Theme = getBiomeColors(21);
if (level21Theme.name !== THEMES[1].name) {
    console.error(`ERROR: Level 21 should cycle to Grasslands. Got ${level21Theme.name}`);
    process.exit(1);
}
console.log(`Level 21: ${level21Theme.name} (Cycles to 1) - OK`);

console.log('SUCCESS: All biome verification tests passed.');
process.exit(0);
