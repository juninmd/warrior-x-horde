let entities = {
  weapons: [
    { id: 1, passed: true, y: 1500 },
    { id: 2, passed: false, y: 0 }
  ]
};

function spawnWeapons(entities, canvasWidth) {
  // Remover armas que já passaram
  for (let i = entities.weapons.length - 1; i >= 0; i--) {
      const w = entities.weapons[i];
      if (w.passed || w.y >= 1000) {
          const last = entities.weapons.pop();
          if (last && i < entities.weapons.length) {
              entities.weapons[i] = last;
          }
      }
  }

  // Spawnar novas armas ocasionalmente
  if (Math.random() < 0.01 && entities.weapons.length < 2) {
    entities.weapons.push({ id: 99, x: 0, y: -100});
  }
}
Math.random = () => 0.005; // trigger new weapon spawn
spawnWeapons(entities, 500);
console.log(entities.weapons);
