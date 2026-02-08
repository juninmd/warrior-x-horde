  // Debug Level Selector
  if (onLevelChangeCallback) {
      const debugContainer = document.createElement('div');
      debugContainer.style.cssText = 'margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 8px;';

      const lbl = document.createElement('span');
      lbl.innerText = '🔧 LEVEL';
      lbl.style.fontWeight = 'bold';
      lbl.style.fontSize = '14px';

      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.gap = '5px';

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.max = '50';
      input.value = String(gameState.currentLevel || 1);
      input.style.cssText = 'width: 50px; padding: 5px; border-radius: 4px; border: 1px solid #666; background: #333; color: #FFF; text-align: center;';

      const goBtn = document.createElement('button');
      goBtn.innerText = 'GO';
      goBtn.style.cssText = 'padding: 5px 10px; background: #9B59B6; border: none; border-radius: 4px; color: #FFF; cursor: pointer; font-weight: bold;';
      goBtn.onclick = () => {
          vibrate(20);
          const val = parseInt(input.value);
          if (val > 0 && onLevelChangeCallback) {
              onLevelChangeCallback(val);
              toggleSettingsMenu();
          }
      };

      controls.appendChild(input);
      controls.appendChild(goBtn);
      debugContainer.appendChild(lbl);
      debugContainer.appendChild(controls);
      content.appendChild(debugContainer);
  }
