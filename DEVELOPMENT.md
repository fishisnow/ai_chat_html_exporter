# 开发指南

本文档说明如何开发和维护这个多语言 AI Chat HTML Exporter 项目。

## 项目架构

本项目采用多语言、多包的架构设计：

```
ai-chat-html-exporter/
├── ai_chat_html_exporter/          # Python 包实现
│   ├── __init__.py
│   ├── html_generator.py
│   ├── langchain_chat_html_exporter.py
│   └── openai_chat_html_exporter.py
├── packages/
│   └── javascript/                 # JavaScript/TypeScript 包实现
│       ├── src/
│       │   └── index.ts
│       ├── dist/                   # 构建输出
│       ├── examples/               # 使用示例
│       ├── scripts/                # 构建脚本
│       └── package.json
├── images/                         # 文档图片
├── setup.py                        # Python 包配置
├── package.json                    # Workspace 根配置
└── README.md                       # 主文档
```

## 开发环境设置

### Python 开发环境

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/ai-chat-html-exporter.git
cd ai-chat-html-exporter

# 2. 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# 或 .venv\Scripts\activate  # Windows

# 3. 安装开发依赖
pip install -e .
pip install -r requirements-dev.txt  # 如果有的话
```

### JavaScript 开发环境

```bash
# 1. 确保 Node.js >= 14.0.0
node --version

# 2. 安装 JavaScript 包依赖
cd packages/javascript
npm install

# 3. 或者从根目录安装
npm run install:js
```

## 开发工作流

### Python 包开发

```bash
# 运行 Python 测试
python -m pytest tests/

# 检查代码格式
black ai_chat_html_exporter/
flake8 ai_chat_html_exporter/

# 构建 Python 包
python setup.py sdist bdist_wheel

# 发布到 PyPI
twine upload dist/*
```

### JavaScript 包开发

```bash
# 进入 JavaScript 包目录
cd packages/javascript

# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 验证构建
npm run validate

# 发布到 npm
npm publish
```

### 从根目录管理

根目录的 `package.json` 提供了统一的管理脚本：

```bash
# JavaScript 相关命令
npm run build:js       # 构建 JavaScript 包
npm run dev:js         # 开发模式
npm run clean:js       # 清理构建文件
npm run validate:js    # 验证构建
npm run publish:js     # 发布到 npm

# 构建所有包
npm run build:all

# 清理所有构建文件
npm run clean:all
```

## 代码规范

### Python 代码规范

- 遵循 PEP 8 编码规范
- 使用 Black 进行代码格式化
- 使用 flake8 进行代码检查
- 添加类型提示（推荐使用 mypy）

### JavaScript/TypeScript 代码规范

- 使用 TypeScript 进行开发
- 遵循项目的 ESLint 配置
- 保持一致的代码风格
- 编写完整的类型定义

## 测试策略

### Python 测试

```bash
# 运行所有测试
python -m pytest

# 运行特定测试文件
python -m pytest tests/test_html_generator.py

# 生成覆盖率报告
python -m pytest --cov=ai_chat_html_exporter
```

### JavaScript 测试

```bash
cd packages/javascript

# 目前使用基本验证
npm run validate

# 未来可以添加：
# npm test           # 运行单元测试
# npm run test:e2e   # 运行集成测试
```

## 发布流程

### Python 包发布

1. 更新版本号（`setup.py` 中的 `version`）
2. 更新 CHANGELOG
3. 构建包：`python setup.py sdist bdist_wheel`
4. 测试包：`twine check dist/*`
5. 发布：`twine upload dist/*`

### JavaScript 包发布

1. 进入 JavaScript 包目录：`cd packages/javascript`
2. 更新版本号：`npm version patch|minor|major`
3. 构建和验证：`npm run build && npm run validate`
4. 发布：`npm publish`

### 同步发布两个包

推荐的发布流程：

```bash
# 1. 更新两个包的版本号
# 2. Python 包发布
python setup.py sdist bdist_wheel
twine upload dist/*

# 3. JavaScript 包发布
npm run build:js
npm run validate:js
npm run publish:js

# 4. 创建 Git 标签
git tag v1.0.1
git push origin v1.0.1
```

## 文档维护

### 主要文档文件

- `README.md` - 项目总览和多语言说明
- `packages/javascript/README.md` - JavaScript 包专用文档
- `DEVELOPMENT.md` - 开发指南（本文档）
- `PUBLISH.md` - 发布指南

### 文档更新原则

1. 保持两个实现的文档同步
2. 在主 README 中突出多语言支持
3. 各语言专用文档提供详细的使用说明
4. 示例代码要保持最新和可运行

## 版本管理策略

### 版本号同步

- Python 和 JavaScript 包使用相同的主版本号
- 小版本号可以独立递增
- 重大更新时同步发布

### 分支管理

```
main                 # 主分支，稳定版本
├── feature/python-* # Python 相关功能分支
├── feature/js-*     # JavaScript 相关功能分支
└── release/v*       # 发布分支
```

## 持续集成

### GitHub Actions 配置

建议设置以下 CI/CD 流程：

```yaml
# .github/workflows/test.yml
name: Test All Packages

on: [push, pull_request]

jobs:
  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v3
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install -e .
      - name: Run tests
        run: python -m pytest

  test-javascript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd packages/javascript && npm install
      - name: Build and validate
        run: |
          cd packages/javascript
          npm run build
          npm run validate
```

## 常见问题

### Q: 如何添加新功能？

A: 根据功能特性决定是否需要在两个实现中都添加，优先保证核心功能的一致性。

### Q: 两个包的功能差异如何处理？

A: 在文档中明确说明差异，并在 README 的对比表格中体现。

### Q: 如何确保 HTML 输出格式的一致性？

A: 
1. 使用相同的 CSS 样式
2. 保持相同的 HTML 结构
3. 定期测试两个实现的输出

### Q: 依赖管理策略？

A: 
- Python：保持最小依赖，主要依赖 langchain-core 和 openai
- JavaScript：使用 peerDependencies 处理 openai 依赖

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码前运行测试
4. 更新相关文档
5. 提交 Pull Request

### 代码审查要点

- 功能完整性
- 代码质量
- 测试覆盖率
- 文档更新
- 向后兼容性

## 发布计划

### v1.x 系列
- ✅ Python 基础实现
- ✅ JavaScript/TypeScript 实现
- ✅ 基础 HTML 导出功能
- ✅ 工具调用支持

### v2.x 系列
- [ ] LangChain JavaScript 集成
- [ ] 更多 AI 框架支持
- [ ] 实时预览功能

### v3.x 系列
- [ ] 多格式导出（JSON、CSV）
- [ ] 高级主题系统
- [ ] 插件架构 