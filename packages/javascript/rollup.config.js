import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

const external = [
    ...Object.keys(pkg.peerDependencies || {}),
    'fs',
    'path'
];

const commonPlugins = [
    resolve({
        preferBuiltins: true
    }),
    commonjs(),
    typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/*.test.*', '**/*.spec.*']
    })
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