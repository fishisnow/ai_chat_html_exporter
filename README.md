中文 | [English](README_en.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) &ensp;

# AI Chat HTML 导出器

一个专业的 AI 对话历史导出工具，将您与 AI 的对话智能转换为精美 HTML 文件，助力开发调试与 Prompt 观察。

![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![构建状态](https://img.shields.io/badge/构建-通过-brightgreen)
![许可证](https://img.shields.io/badge/许可证-MIT-green)
![Python](https://img.shields.io/badge/Python-3.10+-yellow)

## ✨ 核心亮点

- 🚀 **极简集成** - 仅需一行代码，轻松收集 AI 对话日志
- 🔍 **透明调试** - 直观了解 AI Agent 的行为过程，无需繁琐的 langsmith 配置
- 💎 **精美展示** - 响应式界面设计，代码语法高亮，JSON 数据格式化
- 🌐 **即时预览** - 支持浏览器中实时查看对话历史
- 🎨 **图片支持** - 自动识别对话中的 base64 和 URL 图片，展示图像内容
- 🛠 **多框架支持** - 完美兼容 LangChain 和 OpenAI API

## 📋 应用场景

- AI 应用开发调试过程中快速记录对话历史
- 收集和展示 AI 交互示例
- 保存重要的 AI 对话以供日后参考
- 分享 AI 对话成果给团队成员

## 🔧 安装方法

### 从 PyPI 安装
```bash
pip install ai-chat-html-exporter
```

### 本地开发安装
```bash
git clone https://github.com/yourusername/ai-chat-html-exporter.git
cd ai-chat-html-exporter
pip install -e .
```

## 🚀 快速上手

### LangChain 集成示例

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

### OpenAI API 集成示例
```python
from ai_chat_html_exporter.openai_chat_html_exporter import with_html_logger
from openai import AsyncOpenAI

@with_html_logger  # 只需添加这个装饰器
def get_openai_client(self):
    return AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
```

## ⚙️ 自定义配置

```python
# 自定义输出目录
from ai_chat_html_exporter import HtmlExportCallbackHandler
exporter = HtmlExportCallbackHandler(output_dir="my_chat_logs")

# 更多配置选项即将推出...
```

## 📊 输出效果展示

![对话历史展示](images/example.png)

## 📦 系统要求

- Python >= 3.10
- langchain-core >= 0.1.0
- python-dotenv >= 1.0.0
- openai >= 1.6.1

## 🔜 未来规划

- [ ] 支持更多的 AI 框架集成

## 🤝 参与贡献

我们欢迎各种形式的贡献！

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

也欢迎提交 Issue 反馈问题或建议！

## 📄 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [项目文档](https://github.com/yourusername/ai-chat-html-exporter)
- [问题反馈](https://github.com/yourusername/ai-chat-html-exporter/issues)
- [贡献指南](https://github.com/yourusername/ai-chat-html-exporter/blob/main/CONTRIBUTING.md)

---

如果这个项目对您有帮助，请给它一个⭐️！