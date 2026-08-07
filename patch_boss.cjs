const fs = require('fs');
let code = fs.readFileSync('src/renderer-boss.ts', 'utf-8');

if (!code.includes('import { QualityManager }')) {
    code = code.replace("import { BASE_WIDTH } from './constants';", "import { BASE_WIDTH } from './constants';\nimport { QualityManager } from './quality';");
}

code = code.replace(/ctx\.shadowColor = '([^']+)';\n\s*ctx\.shadowBlur = (\d+);/g, (match, color, blur) => {
    return `if (QualityManager.getInstance().settings.enableShadows) {\n    ctx.shadowColor = '${color}';\n    ctx.shadowBlur = ${blur};\n  }`;
});

code = code.replace(/ctx\.shadowBlur = 0;/g, `if (QualityManager.getInstance().settings.enableShadows) {\n    ctx.shadowBlur = 0;\n  }`);

fs.writeFileSync('src/renderer-boss.ts', code);
