#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取 CSS 文件
const cssPath = path.join(__dirname, '..', 'src', 'styles.css');
const outputPath = path.join(__dirname, '..', 'src', 'styles.ts');

try {
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // 转义字符串中的反引号和美元符号
    const escapedCss = cssContent
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');

    // 生成 TypeScript 模块
    const tsContent = `// 此文件由 scripts/generate-css-module.js 自动生成
// 请不要手动编辑此文件，而是修改 src/styles.css

export const CSS_CONTENT = \`${escapedCss}\`;

export default CSS_CONTENT;
`;

    fs.writeFileSync(outputPath, tsContent, 'utf8');
    console.log('✅ 成功生成 styles.ts 模块');

} catch (error) {
    console.error('❌ 生成 CSS 模块失败:', error.message);
    process.exit(1);
}
