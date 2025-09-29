import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { readFileSync, copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

const external = [
    ...Object.keys(pkg.peerDependencies || {}),
    'fs',
    'path'
];

// 生成 CSS 模块的插件
function generateCssModule() {
    return {
        name: 'generate-css-module',
        buildStart() {
            try {
                // 运行 CSS 模块生成脚本
                execSync('node scripts/generate-css-module.js', { stdio: 'inherit' });
            } catch (error) {
                console.warn('⚠️ 生成 CSS 模块失败:', error.message);
            }
        },
        generateBundle() {
            try {
                // 确保 dist 目录存在
                mkdirSync('dist', { recursive: true });
                // 复制 CSS 文件（保持向后兼容）
                copyFileSync('src/styles.css', 'dist/styles.css');
                console.log('✅ 已复制 styles.css 到 dist/');
            } catch (error) {
                console.warn('⚠️ 复制 CSS 文件失败:', error.message);
            }
        }
    };
}

const commonPlugins = [
    resolve({
        preferBuiltins: true
    }),
    commonjs(),
    typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/*.test.*', '**/*.spec.*']
    }),
    generateCssModule()
];

export default [
    // ESM build
    {
        input: 'src/index.ts',
        output: {
            file: pkg.module,
            format: 'es',
            sourcemap: true
        },
        external,
        plugins: commonPlugins
    },
    // CommonJS build
    {
        input: 'src/index.ts',
        output: {
            file: pkg.main,
            format: 'cjs',
            sourcemap: true,
            exports: 'named',
            interop: 'auto'
        },
        external,
        plugins: commonPlugins
    },
    // UMD build for browsers
    {
        input: 'src/index.ts',
        output: {
            file: pkg.browser,
            format: 'umd',
            name: 'AiChatHtmlExporter',
            sourcemap: true,
            globals: {
                'openai': 'OpenAI'
            }
        },
        external: ['openai'],
        plugins: [
            resolve({
                browser: true,
                preferBuiltins: false
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                exclude: ['**/*.test.*', '**/*.spec.*']
            })
        ]
    }
]; 