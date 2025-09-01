# 发布指南

本文档说明如何将 ai-chat-html-exporter 发布到 npm 公共库。

## 发布前检查清单

### 1. 确保项目信息正确

编辑 `package.json` 确保以下信息正确：

- `name`: 包名称
- `version`: 版本号（遵循语义化版本）
- `description`: 包描述
- `author`: 作者信息
- `repository`: 仓库地址
- `keywords`: 关键词

### 2. 构建和验证

```bash
# 清理之前的构建
npm run clean

# 构建项目
npm run build

# 验证构建结果
npm run validate
```

### 3. 测试本地安装

```bash
# 打包到本地文件
npm pack

# 测试安装（可选）
npm install ./ai-chat-html-exporter-1.0.0.tgz
```

## 发布步骤

### 1. 登录 npm

```bash
npm login
```

输入您的 npm 用户名、密码和邮箱。

### 2. 发布到公共库

```bash
# 发布
npm publish

# 如果是 scoped 包，需要指定公开
npm publish --access public
```

### 3. 验证发布成功

```bash
# 检查包信息
npm info ai-chat-html-exporter

# 测试安装
npm install ai-chat-html-exporter
```

## 版本管理

### 更新版本号

```bash
# 补丁版本 (1.0.0 -> 1.0.1)
npm version patch

# 小版本 (1.0.0 -> 1.1.0)
npm version minor

# 大版本 (1.0.0 -> 2.0.0)
npm version major
```

### 发布 beta 版本

```bash
# 设置 beta 版本
npm version prerelease --preid=beta

# 发布 beta 版本
npm publish --tag beta
```

## 自动化发布 (可选)

### GitHub Actions

可以创建 GitHub Actions 工作流来自动化发布过程：

```yaml
# .github/workflows/npm-publish.yml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build and validate
        run: npm run prepublishOnly
      
      - name: Publish to NPM
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 发布后任务

### 1. 创建 GitHub Release

在 GitHub 上创建对应的 Release，包含：
- 版本说明
- 变更日志
- 下载链接

### 2. 更新文档

- 更新 README.md
- 更新使用示例
- 更新 API 文档

### 3. 通知用户

- 在相关社区发布更新通知
- 更新项目博客或网站
- 发送邮件通知（如果有邮件列表）

## 回滚版本

如果发现问题需要回滚：

```bash
# 撤销发布（仅在发布后24小时内）
npm unpublish ai-chat-html-exporter@1.0.0

# 或者发布修复版本
npm version patch
npm publish
```

## 常见问题

### Q: 包名已被占用怎么办？
A: 
- 使用 scoped 包名：`@yourusername/ai-chat-html-exporter`
- 选择其他唯一的包名

### Q: 如何测试包在不同环境中的兼容性？
A: 
- 使用 `npm pack` 创建本地包进行测试
- 在不同的 Node.js 版本中测试
- 测试 CommonJS、ESM 和浏览器环境

### Q: 发布失败怎么办？
A: 
- 检查网络连接
- 确认 npm 账户权限
- 检查包名是否可用
- 查看详细错误信息

## 最佳实践

1. **遵循语义化版本**：主版本.次版本.修订版本
2. **保持向后兼容**：在小版本更新中避免破坏性变更
3. **详细的变更日志**：记录每次更新的具体内容
4. **完整的测试**：确保所有功能正常工作
5. **清晰的文档**：提供详细的使用说明和示例

## 相关链接

- [npm 官方文档](https://docs.npmjs.com/)
- [语义化版本规范](https://semver.org/)
- [npm 发布最佳实践](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages) 