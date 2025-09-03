// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.test.ts'],
        coverage: {
            provider: 'v8',  // 添加 provider 配置，使用 v8 或 istanbul
            reporter: ['text', 'json', 'html'],
        },
    },
});