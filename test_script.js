let entities = {
  weapons: [
    { id: 1, passed: true, y: 1500 },
    { id: 2, passed: false, y: 0 }
  ]
};

for (let i = entities.weapons.length - 1; i >= 0; i--) {
  const w = entities.weapons[i];
  if (w.passed || w.y >= 1000) {
      const last = entities.weapons.pop();
      if (last && i < entities.weapons.length) {
          entities.weapons[i] = last;
      }
  }
}
console.log(entities.weapons);
