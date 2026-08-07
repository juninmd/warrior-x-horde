const fs = require('fs');
let css = fs.readFileSync('src/style.css', 'utf-8');

// Fix backdrop-filter in .icon-btn
css = css.replace(/backdrop-filter: blur\(10px\);/g, 'backdrop-filter: blur(8px);');
css = css.replace(/-webkit-backdrop-filter: blur\(10px\);/g, '-webkit-backdrop-filter: blur(8px);');

// Fix transform: scale in buttons
css = css.replace(/\.game-over-btn:active {\n  transform: scale\(0.94\) !important;/g, '.game-over-btn:active {\n  transform: scale(0.92) !important;');
css = css.replace(/\.share-btn:active \{ transform: scale\(0.94\) !important; \}/g, '.share-btn:active { transform: scale(0.92) !important; }');
css = css.replace(/\.settings-close-btn:active \{ transform: scale\(0.94\) !important; \}/g, '.settings-close-btn:active { transform: scale(0.92) !important; }');

// Add specific active state for start btn if missing or fix existing
if (css.includes('.start-btn:active {')) {
  css = css.replace(/\.start-btn:active {[\s\S]*?}/, `.start-btn:active {\n  transform: translateY(2px) scale(0.92) !important;\n  background: linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%);\n  box-shadow: inset 0 6px 15px rgba(0, 0, 0, 0.55);\n}`);
}

fs.writeFileSync('src/style.css', css);
