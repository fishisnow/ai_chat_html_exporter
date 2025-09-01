# AI Chat HTML Exporter (JavaScript/TypeScript)

一个用于拦截 OpenAI 聊天对话并自动导出为美观 HTML 文件的 JavaScript/TypeScript 库。

> 这是 [ai-chat-html-exporter](https://github.com/yourusername/ai-chat-html-exporter) 项目的 JavaScript/TypeScript 实现。如果您在寻找 Python 版本，请查看[根目录](../../README.md)。

## 特性

- 🚀 **零配置**：开箱即用，无需复杂设置
- 🎨 **美观样式**：内置精美的对话界面样式
- 🔧 **TypeScript 支持**：完整的类型定义
- 📱 **响应式设计**：支持移动端和桌面端
- 🌈 **语法高亮**：支持代码块语法高亮
- 🛠 **工具调用支持**：完整支持 OpenAI 工具调用
- 📄 **多格式支持**：支持 ESM、CommonJS 和 UMD
- 🌐 **跨平台**：Node.js 和浏览器环境

## 安装

```bash
npm install ai-chat-html-exporter
```

或者使用 yarn：

```bash
yarn add ai-chat-html-exporter
```

## 快速开始

### TypeScript/ES6

```typescript
import OpenAI from 'openai';
import { createChatExporterOpenAI } from 'ai-chat-html-exporter';

// 创建带有导出功能的 OpenAI 客户端
const openai = createChatExporterOpenAI(OpenAI, {
  apiKey: process.env.OPENAI_API_KEY,
});

// 正常使用 OpenAI API，对话会自动导出为 HTML
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
});

console.log(response.choices[0].message.content);
```

### CommonJS

```javascript
const OpenAI = require('openai');
const { createChatExporterOpenAI } = require('ai-chat-html-exporter');

const openai = createChatExporterOpenAI(OpenAI, {
  apiKey: process.env.OPENAI_API_KEY,
});
```

### 浏览器 UMD

```html
<script src="https://unpkg.com/ai-chat-html-exporter/dist/index.umd.js"></script>
<script>
  const openai = AiChatHtmlExporter.createChatExporterOpenAI(OpenAI, {
    apiKey: 'your-api-key',
  });
</script>
```

## 配置选项

```typescript
interface ExporterOptions {
  outputDir?: string;        // 输出目录，默认 'logs'
  enableFileOutput?: boolean; // 是否启用文件输出，默认 true
  customStyles?: string;     // 自定义 CSS 样式
}

const openai = createChatExporterOpenAI(OpenAI, {
  apiKey: process.env.OPENAI_API_KEY,
}, {
  outputDir: 'chat-exports',
  enableFileOutput: true,
  customStyles: `
    .message { border-radius: 15px; }
    .user { background: #e3f2fd; }
  `
});
```

## 高级用法

### 直接使用导出器类

```typescript
import { OpenaiChatHtmlExporter } from 'ai-chat-html-exporter';

const exporter = new OpenaiChatHtmlExporter({
  outputDir: 'my-exports',
  customStyles: '/* 自定义样式 */'
});

// 手动处理消息
exporter.processUserMessages([
  { role: 'user', content: 'Hello!' }
]);

// 处理 AI 响应
exporter.processAIResponse(response);
```

### 流式响应支持

库完全支持 OpenAI 的流式响应：

```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
// 对话会自动保存为 HTML 文件
```

### 工具调用支持

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'What\'s the weather like?' }],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather information',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' }
          }
        }
      }
    }
  ]
});
// 工具调用信息会在 HTML 中完整展示
```

## API 文档

### `createChatExporterOpenAI(OpenAIClass, config, exporterOptions?)`

创建带有对话导出功能的 OpenAI 客户端。

**参数:**
- `OpenAIClass`: OpenAI 客户端类
- `config`: OpenAI 配置对象
- `exporterOptions`: 可选的导出器配置

**返回:**
- 增强的 OpenAI 客户端实例

### `OpenaiChatHtmlExporter`

对话导出器类。

**构造函数:**
- `constructor(options?: ExporterOptions)`

**主要方法:**
- `processUserMessages(messages, tools?)`: 处理用户消息
- `processAIResponse(response)`: 处理 AI 响应
- `processStreamCompletionResponse(content, toolCalls)`: 处理流式响应
- `logError(errorMessage)`: 记录错误信息

## 输出示例

生成的 HTML 文件包含：

- 📝 对话历史记录
- 🎨 优雅的消息样式
- 💻 代码语法高亮
- 🔧 工具调用详情
- 📱 响应式布局
- 🌙 可自定义主题

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Node.js 兼容性

- Node.js 14.0.0+

## 与 Python 版本的关系

这个 JavaScript/TypeScript 库是 [ai-chat-html-exporter](https://github.com/yourusername/ai-chat-html-exporter) 项目的前端实现。该项目同时提供：

- **Python 版本**：支持 LangChain 和 OpenAI Python SDK
- **JavaScript/TypeScript 版本**：支持 Node.js 和浏览器环境

两个版本生成相同格式的 HTML 文件，您可以根据项目需求选择合适的版本。

## 开发

```bash
# 进入 JavaScript 包目录
cd packages/javascript

# 安装依赖
npm install

# 构建
npm run build

# 开发模式
npm run dev

# 验证构建
npm run validate
```

## 示例

查看 `examples/` 目录获取更多使用示例：

- `basic-usage.js` - 基础用法示例
- `typescript-usage.ts` - TypeScript 高级示例

## 许可证

MIT License - 详见项目根目录的 [LICENSE](../../LICENSE) 文件。

## 贡献

欢迎提交 Issue 和 Pull Request！请参考项目根目录的贡献指南。

## 更新日志

### 1.0.0
- 初始版本发布
- 支持基本的对话导出功能
- TypeScript 支持
- 多种构建格式支持

## 相关链接

- [项目主页](https://github.com/yourusername/ai-chat-html-exporter)
- [Python 版本文档](../../README.md)
- [问题反馈](https://github.com/yourusername/ai-chat-html-exporter/issues) 