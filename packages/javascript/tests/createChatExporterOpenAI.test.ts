// createChatExporterOpenAI.test.ts

import { createChatExporterOpenAI } from '../src';
import OpenAI, { AzureOpenAI } from "openai";
import { vi, expect, test, describe, beforeAll } from 'vitest';

// 模拟 OpenAI API 请求
vi.mock('openai', () => {
    const mockCreate = vi.fn().mockImplementation(async (params: any) => {
        if (params.stream) {
            return {
                tee: () => {
                    const createMockStream = () => ({
                        [Symbol.asyncIterator]: async function* () {
                            yield { choices: [{ delta: { content: '这是' } }] };
                            yield { choices: [{ delta: { content: '流式' } }] };
                            yield { choices: [{ delta: { content: '响应' } }] };
                            yield { choices: [{ finish_reason: 'stop' }] };
                        }
                    });
                    return [createMockStream(), createMockStream()];
                }
            };
        }

        return {
            choices: [{ message: { content: '这是模拟的 AI 响应', role: 'assistant' } }]
        };
    });

    // 标准 OpenAI 客户端模拟
    const MockOpenAI = vi.fn().mockImplementation((config: any) => ({
        chat: {
            completions: {
                create: mockCreate
            }
        }
    }));

    // Azure OpenAI 客户端模拟
    const MockAzureOpenAI = vi.fn().mockImplementation((config: any) => ({
        chat: {
            completions: {
                create: mockCreate
            }
        }
    }));

    // 保持与真实导出相同的接口
    return {
        default: MockOpenAI,
        AzureOpenAI: MockAzureOpenAI
    };
});

describe('createChatExporterOpenAI', () => {
    const openaiConfig = {
        apiKey: 'test-key',
        baseURL: 'https://api.openai.com/v1'
    };

    const azureConfig = {
        apiKey: 'azure-key',
        baseURL: 'https://your-resource-name.openai.azure.com',
        apiVersion: '2023-05-15'
    };

    const exporterOptions = { enableFileOutput: false };

    test('应该能正常创建标准 OpenAI 客户端', async () => {
        const client = createChatExporterOpenAI(OpenAI, openaiConfig, exporterOptions);

        // 验证客户端结构
        expect(client).toBeDefined();
        expect(client.chat).toBeDefined();
        expect(client.chat.completions).toBeDefined();
        expect(typeof client.chat.completions.create).toBe('function');

        // 测试调用 create 方法
        const response = await client.chat.completions.create({
            messages: [{ role: 'user', content: '你好' }]
        });

        expect(response).toBeDefined();
        expect(response.choices).toBeDefined();
        expect(response.choices[0].message.content).toBe('这是模拟的 AI 响应');
    });

    test('应该能正常创建 Azure OpenAI 客户端', async () => {
        const client = createChatExporterOpenAI(AzureOpenAI, azureConfig, exporterOptions);

        // 验证客户端结构
        expect(client).toBeDefined();
        expect(client.chat).toBeDefined();
        expect(client.chat.completions).toBeDefined();
        expect(typeof client.chat.completions.create).toBe('function');

        // 测试调用 create 方法
        const response = await client.chat.completions.create({
            messages: [{ role: 'user', content: '你好' }]
        });

        expect(response).toBeDefined();
        expect(response.choices).toBeDefined();
        expect(response.choices[0].message.content).toBe('这是模拟的 AI 响应');
    });

    test('应该能处理流式响应', async () => {
        const client = createChatExporterOpenAI(OpenAI, openaiConfig, exporterOptions);

        // 测试流式响应
        const stream = await client.chat.completions.create({
            messages: [{ role: 'user', content: '你好' }],
            stream: true
        });

        expect(stream).toBeDefined();

        // 验证流可以正常迭代
        let content = '';
        for await (const chunk of stream) {
            if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                content += chunk.choices[0].delta.content;
            }
        }

        expect(content).toBe('这是流式响应');
    });
});