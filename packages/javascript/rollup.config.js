import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { readFileSync, copyFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

const external = [
    ...Object.keys(pkg.peerDependencies || {}),
    'fs',
    'path'
];

// 复制 CSS 文件的插件
function copyAssets() {
    return {
        name: 'copy-assets',
        generateBundle() {
            try {
                // 确保 dist 目录存在
                mkdirSync('dist', { recursive: true });
                // 复制 CSS 文件
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
    copyAssets()
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
            exports: 'named'
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