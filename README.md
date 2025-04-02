# AI Chat HTML Exporter

一个用于将 AI 对话历史导出为美观 HTML 文件的 Python 工具。

## 功能特点

- 自动将 AI 对话历史保存为 HTML 文件
- 支持代码语法高亮
- 支持 JSON 数据格式化
- 美观的响应式界面
- 支持实时预览
- 自动在浏览器中打开生成的文件（可配置）

## 安装

### 从 PyPI 安装（尚未发布）
```bash
pip install ai-chat-html-exporter
```

### 本地安装

1. 克隆仓库
```bash
git clone https://github.com/yourusername/ai-chat-html-exporter.git
cd ai-chat-html-exporter
```

2. 开发模式安装
```bash
pip install -e .
```

或者构建并安装：
```bash
python setup.py sdist bdist_wheel
pip install dist/ai_chat_html_exporter-0.1.0.tar.gz
```

## 使用方法

```python
from ai_chat_html_exporter import HtmlExporter
from langchain_openai import AzureChatOpenAI

# 创建导出器实例
exporter = HtmlExporter(
    output_dir="logs",  # 可选：自定义输出目录
    auto_open=True      # 可选：是否自动打开生成的HTML文件
)

# 在 LangChain 中使用
llm = AzureChatOpenAI(
    model="gpt-4",
    callbacks=[exporter.get_callback()]
)

# 对话内容会自动保存到 logs 目录下的 HTML 文件中
```

## 配置选项

- `output_dir`: 输出目录，默认为 "logs"
- `auto_open`: 是否自动在浏览器中打开生成的 HTML 文件，默认为 True

## 输出示例

生成的 HTML 文件将包含：
- 时间戳记录
- 用户消息和 AI 响应的清晰区分
- 代码块和 JSON 的语法高亮
- 响应式布局，适配不同屏幕尺寸

## 依赖项

- Python >= 3.7
- langchain >= 0.1.0
- langchain-core >= 0.1.0
- langchain-openai >= 0.0.5
- pygments >= 2.15.0
- python-dotenv >= 1.0.0

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License