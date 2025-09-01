# AI Chat HTML Exporter

[中文](#中文版本) | [English](README_en.md)

一个专业的 AI 对话历史导出工具，将您与 AI 的对话智能转换为精美 HTML 文件。

**🌟 多语言支持**: 同时提供 Python 和 JavaScript/TypeScript 两种实现

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)

## ✨ 核心亮点

- 🚀 **极简集成** - 仅需一行代码，轻松收集 AI 对话日志
- 🔍 **透明调试** - 直观了解 AI Agent 的行为过程
- 💎 **精美展示** - 响应式界面设计，代码语法高亮，JSON 数据格式化
- 🌐 **即时预览** - 支持浏览器中实时查看对话历史
- 🎨 **图片支持** - 自动识别对话中的 base64 和 URL 图片
- 🛠 **多平台支持** - 同时支持 Python 和 JavaScript/TypeScript
- 🌈 **多框架兼容** - 支持 LangChain、OpenAI API、以及前端环境

## 📁 项目结构

```
ai-chat-html-exporter/
├── ai_chat_html_exporter/          # Python 实现
│   ├── __init__.py
│   ├── html_generator.py
│   ├── langchain_chat_html_exporter.py
│   └── openai_chat_html_exporter.py
├── packages/
│   └── javascript/                 # JavaScript/TypeScript 实现
│       ├── src/
│       ├── dist/
│       ├── examples/
│       └── package.json
├── images/
├── setup.py                        # Python 包配置
├── package.json                    # 根目录 workspace 配置
└── README.md
```

## 🚀 快速开始

### Python 版本

适用于 Python 后端、LangChain 项目、数据科学环境等。

#### 安装

```bash
pip install ai-chat-html-exporter
```

#### LangChain 集成

```python
from ai_chat_html_exporter import HtmlExportCallbackHandler
from langchain_openai import AzureChatOpenAI

# 创建导出器实例
llm = AzureChatOpenAI(
    model="gpt-4",
    callbacks=[HtmlExportCallbackHandler()]  # 只需添加这一行
)

# 对话内容会自动保存到 logs 目录下的精美 HTML 文件中
```

#### OpenAI API 集成

```python
from ai_chat_html_exporter.openai_chat_html_exporter import with_html_logger
from openai import AsyncOpenAI

@with_html_logger  # 只需添加这个装饰器
def get_openai_client():
    return AsyncOpenAI(api_key=api_key)
```

### JavaScript/TypeScript 版本

适用于 Node.js 后端、前端应用、浏览器环境等。

#### 安装

```bash
npm install ai-chat-html-exporter
```

#### 基础用法

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
```

#### 浏览器中使用

```html
<script src="https://unpkg.com/ai-chat-html-exporter/dist/index.umd.js"></script>
<script>
  const openai = AiChatHtmlExporter.createChatExporterOpenAI(OpenAI, {
    apiKey: 'your-api-key',
  });
</script>
```

## 📋 版本对比

| 特性 | Python 版本 | JavaScript/TypeScript 版本 |
|------|-------------|---------------------------|
| **环境支持** | Python 3.12+ | Node.js 14+ / 浏览器 |
| **框架集成** | LangChain, OpenAI Python SDK | OpenAI JavaScript SDK |
| **安装方式** | `pip install` | `npm install` |
| **类型支持** | 部分类型提示 | 完整 TypeScript 支持 |
| **浏览器支持** | ❌ | ✅ |
| **流式响应** | ✅ | ✅ |
| **工具调用** | ✅ | ✅ |
| **自定义样式** | ✅ | ✅ |
| **多格式构建** | ❌ | ESM/CJS/UMD |

## 📊 输出效果展示

![对话历史展示](images/example.png)

生成的 HTML 文件包含：
- 📝 完整的对话历史记录
- 🎨 优雅的消息样式和布局
- 💻 代码语法高亮显示
- 🔧 工具调用的详细信息
- 📱 响应式移动端适配
- 🌙 可自定义的主题样式

## 🔧 配置选项

### Python 配置

```python
# 自定义输出目录
from ai_chat_html_exporter import HtmlExportCallbackHandler
exporter = HtmlExportCallbackHandler(output_dir="my_chat_logs")
```

### JavaScript 配置

```typescript
const openai = createChatExporterOpenAI(OpenAI, config, {
  outputDir: 'chat-exports',
  enableFileOutput: true,
  customStyles: `
    .message { border-radius: 15px; }
    .user { background: #e3f2fd; }
  `
});
```

## 📦 详细文档

- **Python 版本**: 查看当前文档的详细说明
- **JavaScript/TypeScript 版本**: 查看 [`packages/javascript/README.md`](packages/javascript/README.md)

## 🛠 开发指南

### Python 开发

```bash
# 克隆仓库
git clone https://github.com/yourusername/ai-chat-html-exporter.git
cd ai-chat-html-exporter

# 安装 Python 依赖
pip install -e .
```

### JavaScript 开发

```bash
# 进入 JavaScript 包目录
cd packages/javascript

# 安装依赖
npm install

# 构建
npm run build

# 开发模式
npm run dev
```

## 📄 系统要求

### Python 版本
- Python >= 3.12
- langchain-core >= 0.1.0
- openai >= 1.6.1

### JavaScript 版本
- Node.js >= 14.0.0
- 现代浏览器 (Chrome 60+, Firefox 55+, Safari 12+)

## 🔜 未来规划

- [ ] LangChain JavaScript 集成支持
- [ ] 更多 AI 框架的集成（Anthropic、Cohere 等）
- [ ] 实时对话预览功能
- [ ] 对话数据的结构化导出（JSON、CSV）
- [ ] 多主题样式模板

## 🤝 参与贡献

我们欢迎各种形式的贡献！

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [项目文档](https://github.com/yourusername/ai-chat-html-exporter)
- [问题反馈](https://github.com/yourusername/ai-chat-html-exporter/issues)
- [Python 示例](examples/python/)
- [JavaScript 示例](packages/javascript/examples/)

---

如果这个项目对您有帮助，请给它一个 ⭐️！
