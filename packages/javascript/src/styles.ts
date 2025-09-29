// 此文件由 scripts/generate-css-module.js 自动生成
// 请不要手动编辑此文件，而是修改 src/styles.css

export const CSS_CONTENT = `:root {
    --color-text: #1a1a1a;
    --color-background: #ffffff;
    --color-accent: #0070f3;
    --color-border: #f0f0f0;
    --color-card: #ffffff;
    --color-user-bg: #f9fafb;
    --color-assistant-bg: #ffffff;
    --color-system-bg: #f9f9f9;
    --color-code-bg: #f7f7f7;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.03);
    --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.05);
    --radius-sm: 6px;
    --radius-md: 10px;
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

body {
    font-family: var(--font-sans);
    max-width: 768px;
    margin: 0 auto;
    padding: 40px 16px;
    background-color: var(--color-background);
    line-height: 1.6;
    color: var(--color-text);
    font-size: 15px;
}

.message {
    margin: 20px 0;
    padding: 16px 18px;
    border-radius: var(--radius-md);
    white-space: pre-wrap;
    word-wrap: break-word;
    font-size: 15px;
    line-height: 1.6;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
    position: relative;
    border: 1px solid var(--color-border);
}

.message:hover {
    box-shadow: var(--shadow-md);
}

.user {
    background-color: var(--color-user-bg);
    margin-right: 10%;
    max-width: 90%;
    padding-right: 36px;
}

.user:before {
    content: "用户";
    position: absolute;
    top: -8px;
    left: 12px;
    background: #f2f2f2;
    color: #666;
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 500;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--color-border);
}

/* 有名字的用户消息样式 */
.user[data-name]:before {
    content: "用户 - " attr(data-name);
}

.assistant {
    background-color: var(--color-assistant-bg);
    margin-left: 10%;
    max-width: 90%;
}

.assistant:before {
    content: "AI";
    position: absolute;
    top: -8px;
    left: 12px;
    background: #e9e9e9;
    color: #666;
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 500;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--color-border);
}

/* 有名字的AI消息样式 */
.assistant[data-name]:before {
    content: "AI - " attr(data-name);
}

.system {
    background-color: var(--color-system-bg);
    margin: 16px 0;
    font-style: italic;
}

.system:before {
    content: "系统";
    position: absolute;
    top: -8px;
    left: 12px;
    background: #ececec;
    color: #666;
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 500;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--color-border);
}

/* 有名字的系统消息样式 */
.system[data-name]:before {
    content: "系统 - " attr(data-name);
}

.divider {
    text-align: center;
    margin: 30px 0;
    font-weight: 600;
    color: #666;
    position: relative;
    font-size: 16px;
}

.divider:before,
.divider:after {
    content: "";
    position: absolute;
    top: 50%;
    width: 30%;
    height: 1px;
    background-color: var(--color-border);
}

.divider:before { left: 0; }
.divider:after { right: 0; }

pre {
    background-color: var(--color-code-bg);
    padding: 14px 16px;
    border-radius: var(--radius-sm);
    overflow-x: auto;
    margin: 14px 0;
    font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
    font-size: 13.5px;
    line-height: 1.5;
    border: 1px solid var(--color-border);
}

code {
    font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
    background-color: var(--color-code-bg);
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 13.5px;
}

h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 32px;
    text-align: center;
    letter-spacing: -0.015em;
    color: var(--color-text);
}

.image-container {
    margin: 14px 0;
    padding: 12px;
    background: var(--color-code-bg);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
}

.image-container img {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 4px;
}

.tool-call-container {
    margin: 10px 0;
    border-radius: var(--radius-sm);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
}

.tool-call-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--color-code-bg);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    font-weight: 500;
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-bottom: none;
}

.tools-icon {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    color: #999;
    opacity: 0.7;
    transition: all 0.2s ease;
    background-color: var(--color-background);
    padding: 3px;
    border-radius: 4px;
    box-shadow: var(--shadow-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    border: 1px solid var(--color-border);
}

.tools-icon:hover {
    opacity: 1;
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
}

/* 工具信息弹出层 */
.tools-popup {
    display: none;
    position: fixed;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 14px;
    width: 400px;
    max-width: 90vw;
    max-height: 60vh;
    overflow: hidden;
    z-index: 100;
    box-shadow: var(--shadow-md);
}

.tools-popup-content {
    height: calc(60vh - 60px);
    overflow: hidden;
}

.tools-popup pre {
    margin: 0;
    white-space: pre-wrap;
    padding: 12px;
    border-radius: var(--radius-sm);
    background-color: var(--color-code-bg);
    font-size: 13px;
    overflow: auto;
    height: 100%;
    border: none;
}

.tools-popup code {
    background: transparent;
    padding: 0;
    font-size: 13px;
}

.tools-popup-visible {
    display: block;
    animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}

/* 关闭按钮 */
.tools-popup-close {
    position: absolute;
    top: 8px;
    right: 10px;
    cursor: pointer;
    font-size: 16px;
    color: #999;
    line-height: 1;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--color-code-bg);
    transition: all 0.2s ease;
}

.tools-popup-close:hover {
    background-color: var(--color-border);
}

/* 工具信息标题 */
.tools-popup-title {
    font-size: 13px;
    font-weight: 500;
    color: #666;
    margin: 0 0 12px 0;
    padding: 0 20px 8px 0;
    border-bottom: 1px solid var(--color-border);
    line-height: 1.5;
}

/* 工具调用图标 */
.tool-call-icon {
    width: 14px;
    height: 14px;
    margin-right: 8px;
    color: var(--color-text);
    opacity: 0.75;
}

.tool-call-title {
    font-size: 0.85em;
    font-weight: 500;
    color: #666;
}

.tool-call-header + pre {
    margin-top: 0;
    border-top: none;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    box-shadow: none;
}

/* 消息内容文本 */
.content-text {
    display: inline;
}

/* 添加 tool 消息的样式 */
.tool {
    background-color: var(--color-code-bg);
    margin: 16px 0;
    position: relative;
}

.tool:before {
    content: "Tool";
    position: absolute;
    top: -8px;
    left: 12px;
    background: #ececec;
    color: #666;
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 500;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--color-border);
}

/* 有名字的工具消息样式 */
.tool[data-name]:before {
    content: "Tool - " attr(data-name);
}

@media (max-width: 600px) {
    .tools-popup {
        width: calc(100vw - 32px);
        max-height: 70vh;
    }

    .tools-popup pre {
        max-height: calc(70vh - 50px);
    }

    body { padding: 20px 12px; }
    .message { margin: 16px 0; padding: 12px 14px; }
    pre { padding: 12px; }
} `;

export default CSS_CONTENT;
