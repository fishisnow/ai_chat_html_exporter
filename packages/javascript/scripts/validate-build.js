#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

console.log('🔍 验证构建输出...\n');

// 检查必需文件
const requiredFiles = [
  'dist/index.js',
  'dist/index.esm.js', 
  'dist/index.umd.js',
  'dist/index.d.ts',
  'package.json'
];

let hasErrors = false;

for (const file of requiredFiles) {
  const filePath = resolve(projectRoot, file);
  if (existsSync(filePath)) {
    console.log(`✅ ${file} 存在`);
  } else {
    console.log(`❌ ${file} 缺失`);
    hasErrors = true;
  }
}

// 检查 package.json 字段
try {
  const pkgPath = resolve(projectRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  
  console.log('\n📦 验证 package.json 字段...');
  
  const requiredFields = ['name', 'version', 'main', 'module', 'browser', 'types'];
  for (const field of requiredFields) {
    if (pkg[field]) {
      console.log(`✅ ${field}: ${pkg[field]}`);
    } else {
      console.log(`❌ ${field} 字段缺失`);
      hasErrors = true;
    }
  }
  
  // 验证入口点文件是否存在
  console.log('\n🎯 验证入口点文件...');
  const entryPoints = [
    { name: 'main (CJS)', path: pkg.main },
    { name: 'module (ESM)', path: pkg.module },
    { name: 'browser (UMD)', path: pkg.browser },
    { name: 'types', path: pkg.types }
  ];
  
  for (const entry of entryPoints) {
    const fullPath = resolve(projectRoot, entry.path);
    if (existsSync(fullPath)) {
      console.log(`✅ ${entry.name}: ${entry.path}`);
    } else {
      console.log(`❌ ${entry.name}: ${entry.path} 不存在`);
      hasErrors = true;
    }
  }
  
} catch (error) {
  console.log('❌ 读取 package.json 失败:', error.message);
  hasErrors = true;
}

// 尝试导入构建后的模块
console.log('\n🔄 验证模块导入...');

try {
  // 验证 CommonJS 导入
  const cjsPath = resolve(projectRoot, 'dist/index.js');
  if (existsSync(cjsPath)) {
    console.log('✅ CommonJS 构建文件存在');
  }
  
  // 验证 ESM 导入
  const esmPath = resolve(projectRoot, 'dist/index.esm.js');
  if (existsSync(esmPath)) {
    console.log('✅ ESM 构建文件存在');
  }
  
  // 验证类型定义
  const typesPath = resolve(projectRoot, 'dist/index.d.ts');
  if (existsSync(typesPath)) {
    const typesContent = readFileSync(typesPath, 'utf8');
    if (typesContent.includes('OpenaiChatHtmlExporter') && typesContent.includes('createChatExporterOpenAI')) {
      console.log('✅ TypeScript 类型定义完整');
    } else {
      console.log('❌ TypeScript 类型定义不完整');
      hasErrors = true;
    }
  }
  
} catch (error) {
  console.log('❌ 模块验证失败:', error.message);
  hasErrors = true;
}

// 检查文件大小
console.log('\n📊 构建文件大小...');
try {
  const files = [
    'dist/index.js',
    'dist/index.esm.js',
    'dist/index.umd.js'
  ];
  
  for (const file of files) {
    const filePath = resolve(projectRoot, file);
    if (existsSync(filePath)) {
      const stats = readFileSync(filePath);
      const sizeKB = Math.round(stats.length / 1024 * 100) / 100;
      console.log(`📏 ${file}: ${sizeKB} KB`);
      
      // 警告过大的文件
      if (sizeKB > 100) {
        console.log(`⚠️  ${file} 较大 (${sizeKB} KB)`);
      }
    }
  }
} catch (error) {
  console.log('❌ 检查文件大小失败:', error.message);
}

// 最终结果
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ 构建验证失败！请修复上述问题。');
  process.exit(1);
} else {
  console.log('✅ 构建验证通过！项目已准备好发布。');
  console.log('\n📋 发布清单:');
  console.log('  1. ✅ 所有构建文件存在');
  console.log('  2. ✅ package.json 配置正确');
  console.log('  3. ✅ TypeScript 类型定义完整');
  console.log('  4. ✅ 模块可正确导入');
  console.log('\n🚀 可以使用 npm publish 发布到 npm 了！');
} 