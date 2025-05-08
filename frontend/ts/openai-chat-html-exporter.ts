// OpenAI 拦截器，用于捕获对话记录并自动导出为HTML

// 定义接口
interface ToolCall {
    function?: {
        name?: string;
        arguments?: string;
    };
    id?: string;
    type?: string;
    index?: number;
}

interface FormattedToolCall {
    function_name: string;
    function_args: any;
}

interface Message {
    role: string;
    content: string | MessageContent[];
    tool_calls?: ToolCall[];
}

interface MessageContent {
    type: string;
    text?: string;
    image_url?: {
        url: string;
        detail?: string;
    };
}

interface AssistantMessage {
    content: string;
    tool_calls: FormattedToolCall[];
}

interface OpenAIResponse {
    choices?: Array<{
        message?: {
            content?: string;
            tool_calls?: ToolCall[];
        };
        delta?: {
            content?: string;
            tool_calls?: ToolCall[];
        };
        finish_reason?: string;
    }>;
    tee?: () => [any, any];
}

interface OpenAIRequestParams {
    messages: Message[];
    stream?: boolean;
    tools?: any[];
    // 其他可能的参数
}

interface StreamToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

// 定义用户增强消息类型
interface EnhancedUserMessage {
    text: string | MessageContent[];
    tools?: any[];
}

class OpenaiChatHtmlExporter {
    processedMessageCount: number;
    htmlFile: string | null;
    htmlContent: string;
    htmlFilename: string;
    previousMessagesCount: number; // 记录上一次对话的消息数量
    isFirstConversation: boolean; // 是否是第一次对话
    step: number; // 记录对话步骤

    constructor() {
        this.processedMessageCount = 0;
        this.htmlFile = null;
        this.htmlContent = '';
        this.htmlFilename = '';
        this.previousMessagesCount = 0;
        this.isFirstConversation = true;
        this.step = 0;

        // 创建一个初始HTML文件
        this.createHtmlFile();
    }

    // 处理用户消息并添加到HTML
    processUserMessages(messages: Message[], tools?: any[]): void {
        if (!messages || !Array.isArray(messages)) return;

        try {
            // 判断是否是新对话
            const isNewConversation = this.isNewConversation(messages);

            // 如果是新的对话但不是第一次对话，添加分隔线
            if (isNewConversation && !this.isFirstConversation) {
                this.step += 1;
                this.appendDividerToHtml(`———Step ${this.step}———`);
                this.processedMessageCount = 0; // 重置消息计数器
            }

            if (isNewConversation) {
                this.previousMessagesCount = messages.length;
                this.isFirstConversation = false;
            } else {
                // 更新最近一次消息数量
                this.previousMessagesCount = Math.max(this.previousMessagesCount, messages.length);
            }

            // 仅处理新消息
            for (let i = this.processedMessageCount; i < messages.length; i++) {
                const message = messages[i];
                if (!message) {
                    continue
                }

                try {
                    // 检查是否是最后一条用户消息并且存在tools字段
                    if (message.role === "user" && i === messages.length - 1 && tools && tools.length > 0) {
                        // 创建包含tools字段的增强消息内容
                        const enhancedContent = {
                            text: message.content,
                            tools: tools
                        };

                        if (Array.isArray(message.content)) {
                            // 如果原始内容是数组，则处理多部分内容
                            const processedParts = message.content.map(part => {
                                try {
                                    switch (part.type) {
                                        case 'image_url':
                                            return this.processImageContent(part.image_url);
                                        case 'text':
                                            return this.processTextContent(String(part.text || ''));
                                        default:
                                            return this.processContent(JSON.stringify(part));
                                    }
                                } catch (err) {
                                    console.warn(`处理消息部分时出错 (type: ${part.type}):`, err);
                                    return JSON.stringify(part);
                                }
                            }).filter(Boolean);

                            // 添加处理后的多部分内容和tools信息
                            this.appendMessageToHtml(message.role, {
                                text: processedParts.join('\n'),
                                tools: tools
                            });
                        } else {
                            // 处理普通文本内容并添加tools信息
                            this.appendMessageToHtml(message.role, {
                                text: message.content,
                                tools: tools
                            });
                        }
                    } else {
                        // 处理普通消息（无tools）
                        if (Array.isArray(message.content)) {
                            // 处理多部分内容
                            const processedParts = message.content.map(part => {
                                try {
                                    switch (part.type) {
                                        case 'image_url':
                                            return this.processImageContent(part.image_url);
                                        case 'text':
                                            return this.processTextContent(String(part.text || ''));
                                        default:
                                            return this.processContent(JSON.stringify(part));
                                    }
                                } catch (err) {
                                    console.warn(`处理消息部分时出错 (type: ${part.type}):`, err);
                                    return JSON.stringify(part);
                                }
                            }).filter(Boolean);

                            this.appendMessageToHtml(message.role, processedParts.join('\n'));
                        } else {
                            // 处理普通文本内容
                            this.appendMessageToHtml(
                                message.role,
                                this.processTextContent(String(message.content || ''))
                            );
                        }
                    }

                    this.processedMessageCount++;
                } catch (err) {
                    console.warn('处理单条消息时出错:', err);
                    // 继续处理下一条消息
                }
            }
        } catch (err) {
            console.error('处理消息列表时出错:', err);
            // 不抛出错误，确保不影响原始功能
        }
    }

    // 判断是否是新会话
    isNewConversation(messages: Message[]): boolean {
        if (this.previousMessagesCount === 0) {
            return true;
        }

        // 如果消息数量不符合递增规律，可能是新会话
        return messages.length < this.previousMessagesCount + 1;
    }

    // 添加分隔符到HTML
    appendDividerToHtml(text: string): void {
        const dividerHtml = `<div class="divider">${text}</div>`;
        this.htmlContent += dividerHtml;
        this.saveHtmlToFile();
    }

    // 处理文本内容
    processTextContent(text: string): string {
        if (!text) return '';

        try {
            // 检测是否包含HTML结构
            const containsHtml = /<[a-z][\s\S]*>/i.test(text);

            if (containsHtml) {
                // 如果包含HTML结构，直接作为代码块展示
                return `<pre><code class="language-html">${this.escapeHtml(text)}</code></pre>`;
            }

            // 处理普通文本，包括可能的其他代码块、内联代码等
            return this.processContent(text);
        } catch (error) {
            console.warn('处理文本内容失败:', error);
            return this.escapeHtml(text);
        }
    }

    // 处理图片内容
    processImageContent(imageUrl?: { url: string; detail?: string }): string {
        if (!imageUrl || !imageUrl.url) return '';

        try {
            return `<div class="image-container">
          <img src="${imageUrl.url}" alt="用户上传的图片" 
               title="图片详细度: ${imageUrl.detail || 'standard'}"
               style="max-width: 100%; height: auto;"
          />
        </div>`;
        } catch (err) {
            console.warn('处理图片内容时出错:', err);
            return '';
        }
    }

    // 处理普通内容（非HTML）
    processContent(content: string | object): string {
        if (!content) return '';

        try {
            // 如果content是对象，转换为字符串
            if (typeof content === 'object') {
                content = JSON.stringify(content, null, 2);
            }

            let processed = content;

            // 处理代码块
            processed = this.detectCodeBlocks(processed);

            // 处理内联代码
            processed = this.detectInlineCode(processed);

            return processed;
        } catch (error) {
            console.warn('处理内容失败:', error);
            return this.escapeHtml(typeof content === 'string' ? content : JSON.stringify(content));
        }
    }

    // 处理AI响应并添加到HTML
    processAIResponse(response: OpenAIResponse): void {
        if (!response || !response.choices || response.choices.length === 0) return;

        const aiMessage = response.choices[0].message;
        if (!aiMessage) return;

        // 构建AI响应对象
        const assistantMessage: AssistantMessage = {
            content: aiMessage.content || "",
            tool_calls: this.formatToolCalls(aiMessage.tool_calls || [])
        };

        // 添加到HTML
        this.appendMessageToHtml("assistant", assistantMessage);
        this.processedMessageCount++;
        
        // 如果有工具输出，处理工具输出
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            assistantMessage.tool_calls.forEach(toolCall => {
                if (toolCall.function_name === 'shell' && toolCall.function_args.output) {
                    this.appendToolOutput(toolCall.function_args.output);
                }
            });
        }

        // 完成当前对话，关闭并重新创建HTML文件
        this.closeHtmlFile();
    }

    // 处理流式响应的完整内容
    processStreamCompletionResponse(fullContent: string, allToolCalls: ToolCall[]): void {
        // 构建AI响应对象
        const assistantMessage: AssistantMessage = {
            content: fullContent || "",
            tool_calls: this.formatToolCalls(allToolCalls || [])
        };

        // 添加到HTML
        this.appendMessageToHtml("assistant", assistantMessage);
        this.processedMessageCount++;
        
        // 如果有工具输出，处理工具输出
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            assistantMessage.tool_calls.forEach(toolCall => {
                if (toolCall.function_name === 'shell' && toolCall.function_args.output) {
                    this.appendToolOutput(toolCall.function_args.output);
                }
            });
        }

        // 完成当前对话，关闭并重新创建HTML文件
        this.closeHtmlFile();
    }

    // 记录错误信息
    logError(errorMessage: string): void {
        this.appendMessageToHtml("system", `错误: ${errorMessage}`);
        this.processedMessageCount++;
        this.closeHtmlFile();
    }

    // 添加工具输出
    appendToolOutput(output: string): void {
        // 简化工具输出，直接添加到 HTML 内容中
        const toolHtml = `<div class="tool">${this.escapeHtml(output)}</div>`;
        this.htmlContent += toolHtml;
        this.saveHtmlToFile();
    }

    // 创建新的HTML文件
    createHtmlFile(): void {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const htmlFilename = `ai-conversation-${timestamp}.html`;

        // 创建HTML头部
        const htmlHeader = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI对话历史</title>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
            <style>
                :root {
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
                
                .message > div {
                    margin: 12px 0;
                }
                
                .message p {
                    margin: 8px 0;
                }
                
                .message > *:first-child {
                    margin-top: 0;
                }
                
                .message > *:last-child {
                    margin-bottom: 0;
                }
                .user {
                    background-color: var(--color-user-bg);
                    margin-right: 10%;
                    position: relative;
                    align-self: flex-start;
                    max-width: 90%;
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
                
                .assistant {
                    background-color: var(--color-assistant-bg);
                    margin-left: 10%;
                    position: relative;
                    align-self: flex-end;
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
  
                .system {
                    background-color: var(--color-system-bg);
                    margin: 16px 0;
                    position: relative;
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
                
                .divider:before {
                    left: 0;
                }
                
                .divider:after {
                    right: 0;
                }
  
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
                .tool-call-header {
                    margin: 0;
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
  
                .tool-call-container {
                    margin: 10px 0;
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }
                
                .tool-call-header + pre {
                    margin-top: 0;
                    margin-bottom: 0;
                    border-top: none;
                    border-top-left-radius: 0;
                    border-top-right-radius: 0;
                    box-shadow: none;
                }
                
                /* 工具调用代码部分 */
                .tool-call-container pre {
                    margin: 0;
                    padding: 12px 14px;
                }
  
                .tools-container {
                    margin: 14px 0;
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                }
                
                .tools-header {
                    margin: 14px 0 0 0;
                    display: flex;
                    align-items: center;
                    padding: 10px 14px;
                    background-color: var(--color-code-bg);
                    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
                    font-weight: 500;
                    color: var(--color-text);
                    border: 1px solid var(--color-border);
                    border-bottom: none;
                }
                
                .tools-header + pre {
                    margin-top: 0;
                    border-top: none;
                    border-top-left-radius: 0;
                    border-top-right-radius: 0;
                }
  
                h1 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-bottom: 32px;
                    text-align: center;
                    letter-spacing: -0.015em;
                    color: var(--color-text);
                }
                /* 图片样式 */
                img {
                    max-width: 100%;
                    border-radius: var(--radius-sm);
                    margin: 12px 0;
                    display: block;
                    border: 1px solid var(--color-border);
                }
                /* 图片容器，用于限制最大高度 */
                .image-container {
                    max-height: 400px;
                    overflow: auto;
                    margin: 14px 0;
                    border-radius: var(--radius-sm);
                }
                /* tool 样式 */
                .tool {
                    background-color: var(--color-code-bg);
                    margin: 8px 0;
                    position: relative;
                    padding: 16px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--color-border);
                    box-shadow: var(--shadow-sm);
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
                    font-size: 13.5px;
                    line-height: 1.5;
                    color: var(--color-text);
                    overflow-x: auto;
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
                    z-index: 1;
                }
                
                /* HTML代码样式 */
                .html-code {
                    background-color: var(--color-code-bg);
                    border-radius: var(--radius-sm);
                    margin: 14px 0;
                    padding: 14px 16px;
                    overflow-x: auto;
                }
                
                .html-code code {
                    font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
                    font-size: 13.5px;
                    line-height: 1.5;
                    color: var(--color-text);
                }
                
                .html-code .token.tag {
                    color: var(--color-accent);
                }
                
                .html-code .token.attr-name {
                    color: #9cdcfe;
                }
                
                .html-code .token.attr-value {
                    color: #ce9178;
                }
                
                .html-code .token.punctuation {
                    color: #808080;
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
  
                /* 移动设备响应式调整 */
                @media (max-width: 600px) {
                    body {
                        padding: 20px 12px;
                    }
                    
                    .message {
                        margin: 16px 0;
                        padding: 12px 14px;
                    }
                    
                    pre {
                        padding: 12px;
                    }
                }
                
                /* Grok风格的代码高亮 */
                .hljs {
                    background-color: var(--color-code-bg);
                    color: var(--color-text);
                    border-radius: var(--radius-sm);
                }
                
                /* JSON键名 */
                .hljs-attr, 
                .hljs-attribute {
                    color: #5c6bc0;
                    font-weight: 500;
                }
                
                /* JSON字符串值 */
                .hljs-string {
                    color: #43a047;
                }
                
                /* JSON数值 */
                .hljs-number {
                    color: #e57373;
                }
                
                /* JSON布尔值和null */
                .hljs-literal {
                    color: #f57c00;
                }
                
                /* JSON符号（花括号、方括号、逗号、冒号等） */
                .hljs-punctuation {
                    color: #9e9e9e;
                }

                /* 用户消息中的工具图标 */
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
            </style>
            <!-- 使用代码高亮库 -->
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/json.min.js"></script>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    // 创建工具信息弹出层
                    const popupContainer = document.createElement('div');
                    popupContainer.className = 'tools-popup';
                    popupContainer.innerHTML = '<span class="tools-popup-close" title="关闭">&times;</span>' +
                        '<div class="tools-popup-title">可用工具列表</div>' +
                        '<div class="tools-popup-content">' +
                        '<pre><code class="language-json"></code></pre>' +
                        '</div>';
                    document.body.appendChild(popupContainer);
                    
                    // 关闭按钮事件
                    popupContainer.querySelector('.tools-popup-close').addEventListener('click', function() {
                        popupContainer.classList.remove('tools-popup-visible');
                    });
                    
                    // 初始化所有工具图标的点击事件
                    function initToolsIcons() {
                        document.querySelectorAll('.tools-icon').forEach(function(icon) {
                            if (!icon.dataset.initialized) {
                                icon.dataset.initialized = 'true';
                                icon.addEventListener('click', handleToolIconClick);
                            }
                        });
                    }
                    
                    // 工具图标点击处理函数
                    function handleToolIconClick(e) {
                        const icon = e.currentTarget;
                        const message = icon.closest('.message');
                        const toolsData = message.querySelector('.tools-data');
                        
                        if (toolsData) {
                            // 获取工具数据
                            const toolsJson = toolsData.getAttribute('data-tools');
                            
                            // 填充弹出层内容
                            const codeElement = popupContainer.querySelector('code');
                            codeElement.textContent = toolsJson;
                            
                            // 应用语法高亮
                            if (typeof hljs !== 'undefined') {
                                hljs.highlightElement(codeElement);
                            }
                            
                            // 定位弹出层
                            const iconRect = icon.getBoundingClientRect();
                            popupContainer.style.top = iconRect.bottom + 5 + 'px';
                            popupContainer.style.right = window.innerWidth - iconRect.right + 'px';
                            
                            // 显示弹出层
                            popupContainer.classList.add('tools-popup-visible');
                            
                            // 调整位置，确保在视窗内
                            adjustPopupPosition(popupContainer);
                            
                            // 阻止事件冒泡
                            e.stopPropagation();
                        }
                    }
                    
                    // 调整弹出框位置，确保在视窗内
                    function adjustPopupPosition(popup) {
                        const rect = popup.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const viewportWidth = window.innerWidth;
                        
                        // 检查是否超出底部边界
                        if (rect.bottom > viewportHeight) {
                            // 如果弹出框太大，则将其放到顶部附近
                            if (rect.height > viewportHeight * 0.6) {
                                popup.style.top = '20px';
                            } else {
                                const overflowBottom = rect.bottom - viewportHeight;
                                popup.style.top = parseInt(popup.style.top || '0') - overflowBottom - 10 + 'px';
                            }
                        }
                        
                        // 检查是否超出右侧边界
                        if (rect.right > viewportWidth) {
                            popup.style.right = '10px';
                            popup.style.left = 'auto';
                        }
                        
                        // 检查是否超出左侧边界
                        if (rect.left < 0) {
                            popup.style.left = '10px';
                            popup.style.right = 'auto';
                        }
                    }
                    
                    // 点击文档其他区域关闭弹出框
                    document.addEventListener('click', function(e) {
                        if (!e.target.closest('.tools-popup') && !e.target.closest('.tools-icon')) {
                            popupContainer.classList.remove('tools-popup-visible');
                        }
                    });
                    
                    // 窗口大小改变时重新调整弹出框的位置
                    window.addEventListener('resize', function() {
                        if (popupContainer.classList.contains('tools-popup-visible')) {
                            adjustPopupPosition(popupContainer);
                        }
                    });
                    
                    // 初始化现有图标
                    initToolsIcons();
                    
                    // 使用 MutationObserver 监听 DOM 变化，处理动态添加的工具图标
                    const observer = new MutationObserver(function(mutations) {
                        let hasNewIcons = false;
                        
                        mutations.forEach(function(mutation) {
                            if (mutation.type === 'childList') {
                                const icons = mutation.target.querySelectorAll('.tools-icon:not([data-initialized])');
                                if (icons.length > 0) {
                                    hasNewIcons = true;
                                }
                            }
                        });
                        
                        if (hasNewIcons) {
                            initToolsIcons();
                        }
                    });
                    
                    // 开始观察 DOM 变化
                    observer.observe(document.body, { 
                        childList: true, 
                        subtree: true 
                    });

                    if (typeof hljs !== 'undefined') {
                        hljs.configure({
                            languages: ['json', 'javascript', 'python', 'bash', 'html', 'css'],
                            ignoreUnescapedHTML: true
                        });
                        hljs.highlightAll();
                        
                        // 初始化所有JSON代码块
                        document.querySelectorAll('pre code.language-json').forEach(function(block) {
                            hljs.highlightElement(block);
                        });
                    }
                });
            </script>
        </head>
        <body>
            <h1>AI对话历史</h1>
            <div id="conversation">
      `;

        // 保存HTML文件头部
        this.htmlContent = htmlHeader;
        this.htmlFilename = htmlFilename;
        this.htmlFile = this.htmlFilename;

        // 保存到文件系统（如果是在Node.js环境）或下载（如果是在浏览器环境）
        this.saveHtmlToFile();
    }

    // 关闭HTML文件
    closeHtmlFile(): void {
        if (!this.htmlFile) return;

        // 添加HTML尾部
        const htmlFooter = `
            </div>
        </body>
        </html>
      `;

        this.htmlContent += htmlFooter;

        // 保存完整的HTML
        this.saveHtmlToFile(true);
    }

    // 添加消息到HTML
    appendMessageToHtml(role: string, content: string | AssistantMessage | EnhancedUserMessage): void {
        let messageHtml = `<div class="message ${role}">`;

        if (role === "user" || role === "system") {
            // 用户或系统消息
            if (typeof content === 'string') {
                // 直接添加内容，不做额外转义
                messageHtml += content;
            } else {
                // 处理增强消息对象
                const enhancedMessage = content as EnhancedUserMessage;
                if (enhancedMessage.text) {
                    // 文本内容
                    messageHtml += typeof enhancedMessage.text === 'string' 
                        ? this.processTextContent(enhancedMessage.text)
                        : 'Complex content';
                }
                
                // 添加工具信息（如果存在）
                if (enhancedMessage.tools && enhancedMessage.tools.length > 0) {
                    const toolsJson = JSON.stringify(enhancedMessage.tools, null, 2);
                    messageHtml += `
                        <svg class="tools-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="查看可用工具">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14 16l3 3 3-3m0 0v-8" />
                        </svg>
                        <div class="tools-data" data-tools="${this.escapeHtml(toolsJson)}" style="display:none;"></div>
                    `;
                }
            }
        } else {
            // AI响应
            if (typeof content === 'object') {
                // 主要文本内容
                const assistantMessage = content as AssistantMessage;
                messageHtml += assistantMessage.content || "";

                // 工具调用
                if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                    assistantMessage.tool_calls.forEach(toolCall => {
                        messageHtml += `<div class="tool-call-container"><div class="tool-call-header"><svg class="tool-call-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg><div class="tool-call-title">Tool | ${toolCall.function_name}</div></div><pre><code>${this.formatJson(toolCall.function_args)}</code></pre></div>`;
                    });
                }
            } else {
                messageHtml += content;
            }
        }

        messageHtml += "</div>";

        // 添加到HTML内容
        this.htmlContent += messageHtml;

        // 保存当前状态
        this.saveHtmlToFile();
    }

    // 保存HTML到文件
    saveHtmlToFile(isComplete: boolean = false): void {
        try {
            // 在Node.js环境中
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                try {
                    const fs = require('fs');
                    const path = require('path');

                    // 创建logs目录（如果不存在）
                    const logsDir = path.join(process.cwd(), 'logs');
                    if (!fs.existsSync(logsDir)) {
                        fs.mkdirSync(logsDir, {recursive: true});
                    }

                    // 构建完整的文件路径
                    const filePath = path.join(logsDir, this.htmlFilename);

                    // 写入文件
                    fs.writeFileSync(filePath, this.htmlContent, 'utf8');

                    if (isComplete) {
                        console.log(`HTML文件已保存: ${filePath}`);
                    }
                } catch (error) {
                    console.warn('保存HTML文件失败:', error);
                    // 不抛出错误，确保不影响原始功能
                }
            }
        } catch (error) {
            console.warn('保存文件过程出错:', error);
            // 不抛出错误，确保不影响原始功能
        }
    }


    // 格式化工具调用
    formatToolCalls(toolCalls: ToolCall[]): FormattedToolCall[] {
        if (!toolCalls || !Array.isArray(toolCalls)) return [];

        return toolCalls.map(toolCall => {
            let functionArgs: any = {};
            try {
                functionArgs = JSON.parse(toolCall.function?.arguments || '{}');
            } catch (e) {
                functionArgs = toolCall.function?.arguments || {};
            }

            return {
                function_name: toolCall.function?.name || 'unknown',
                function_args: functionArgs
            };
        });
    }

    // 辅助函数：HTML转义
    escapeHtml(text: string): string {
        if (!text) return '';
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // 检测并处理代码块
    detectCodeBlocks(text: string): string {
        const lines = text.split('\n');
        let inCodeBlock = false;
        let language = '';
        let codeContent: string[] = [];
        let result: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('```') && !inCodeBlock) {
                inCodeBlock = true;
                language = line.substring(3).trim() || 'plaintext';
            } else if (line.startsWith('```') && inCodeBlock) {
                inCodeBlock = false;
                const code = codeContent.join('\n');
                result.push(`<pre><code class="language-${language}">${code}</code></pre>`);
                codeContent = [];
            } else if (inCodeBlock) {
                // 代码块内的内容不需要额外转义，因为已经在外层转义过了
                codeContent.push(line);
            } else {
                result.push(line);
            }
        }

        // 处理未闭合的代码块
        if (codeContent.length > 0) {
            result.push(`<pre><code class="language-plaintext">${codeContent.join('\n')}</code></pre>`);
        }

        return result.join('\n');
    }

    // 检测并处理内联代码
    detectInlineCode(text: string): string {
        const parts = text.split('`');
        let result: string[] = [];

        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) {  // 奇数索引是代码
                result.push(`<code>${parts[i]}</code>`);
            } else {
                result.push(parts[i]);
            }
        }

        return result.join('');
    }

    // 格式化JSON
    formatJson(obj: any): string {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return String(obj);
        }
    }
}

// OpenAI 客户端类型定义
interface OpenAIClient {
    chat: {
        completions: {
            create: (...args: any[]) => Promise<any>;
        };
    };
}

// 创建带拦截器的OpenAI客户端
export function createChatExporterOpenAI(OpenAIClass: any, config: any): any {
    const originalInstance = new OpenAIClass(config) as OpenAIClient;

    // 存储原始的 chat.completions.create 方法
    const originalCreate = originalInstance.chat.completions.create.bind(originalInstance.chat.completions);

    // 拦截 chat.completions.create 方法
    originalInstance.chat.completions.create = async function (...args: any[]): Promise<any> {
        // 保存原始请求参数
        const originalRequest = args[0] as OpenAIRequestParams;

        try {
            // 创建拦截器实例（如果还没有）
            if (!(originalInstance as any)._interceptor) {
                (originalInstance as any)._interceptor = new OpenaiChatHtmlExporter();
            }

            const interceptor = (originalInstance as any)._interceptor as OpenaiChatHtmlExporter;

            // 尝试记录用户消息，但不影响原始请求
            try {
                interceptor.processUserMessages(originalRequest.messages, originalRequest.tools);
            } catch (loggingError) {
                console.warn('记录用户消息时出错:', loggingError);
                // 继续执行，不影响原始请求
            }

            // 调用原始方法，使用原始参数
            const response = await originalCreate(originalRequest);

            // 尝试记录AI响应，但不影响响应返回
            try {
                // 检查是否为流式响应
                if (originalRequest.stream === true) {
                    // 流被消费前先复制它，使用 tee() 方法分割流
                    const [stream1, stream2] = response.tee();

                    // 使用异步IIFE在后台处理一个流的副本
                    (async () => {
                        try {
                            // 处理流式响应
                            let fullContent = "";
                            let allToolCalls: ToolCall[] = [];
                            let currentToolCalls: Record<number, StreamToolCall> = {}; // 用于收集同一工具调用的不同部分

                            // 使用 for await 迭代流式响应的一个副本
                            for await (const part of stream1) {
                                if (part.choices && part.choices.length > 0) {
                                    const choice = part.choices[0];
                                    const delta = choice.delta || {};

                                    // 处理文本内容
                                    if (delta.content != null) {
                                        fullContent += delta.content;
                                    }

                                    // 处理工具调用
                                    if (delta.tool_calls && delta.tool_calls.length > 0) {
                                        for (const toolCall of delta.tool_calls) {
                                            const toolIndex = toolCall.index || 0;

                                            // 如果是新的工具调用索引，初始化结构
                                            if (!currentToolCalls[toolIndex]) {
                                                currentToolCalls[toolIndex] = {
                                                    id: toolCall.id || "",
                                                    type: toolCall.type || "function",
                                                    function: {
                                                        name: "",
                                                        arguments: ""
                                                    }
                                                };
                                            }

                                            // 更新工具调用信息
                                            if (toolCall.function) {
                                                if (toolCall.function.name) {
                                                    currentToolCalls[toolIndex].function.name += toolCall.function.name;
                                                }
                                                if (toolCall.function.arguments) {
                                                    currentToolCalls[toolIndex].function.arguments += toolCall.function.arguments;
                                                }
                                            }
                                        }
                                    }

                                    // 检查是否完成
                                    if (choice.finish_reason != null) {
                                        // 收集所有完成的工具调用
                                        for (const toolCall of Object.values(currentToolCalls)) {
                                            if (toolCall.function.name) { // 仅添加有名称的工具调用
                                                allToolCalls.push(toolCall);
                                            }
                                        }
                                    }
                                }
                            }

                            // 处理流式响应的完整内容
                            interceptor.processStreamCompletionResponse(fullContent, allToolCalls);
                        } catch (err) {
                            console.warn('处理流式响应时出错:', err);
                            // 错误处理不会影响原始流的消费
                        }
                    })();

                    // 返回原始流的另一个副本给调用方
                    return stream2;
                } else {
                    // 处理普通响应
                    interceptor.processAIResponse(response);
                    return response;
                }
            } catch (loggingError) {
                console.warn('记录AI响应时出错:', loggingError);
                // 继续执行，不影响响应返回
                return response;
            }
        } catch (error) {
            // 如果是API调用错误，尝试记录错误但不影响错误传播
            try {
                if ((originalInstance as any)._interceptor) {
                    ((originalInstance as any)._interceptor as OpenaiChatHtmlExporter).logError((error as Error).toString());
                }
            } catch (loggingError) {
                console.warn('记录错误信息时出错:', loggingError);
            }

            // 抛出原始错误
            throw error;
        }
    };

    // 添加拦截器访问器，确保不影响原始实例的其他功能
    return new Proxy(originalInstance, {
        get(target: any, prop: string | symbol) {
            // 只处理 interceptor 属性，其他属性保持原样
            if (prop === 'interceptor') {
                try {
                    if (!target._interceptor) {
                        target._interceptor = new OpenaiChatHtmlExporter();
                    }
                    return target._interceptor;
                } catch (error) {
                    console.warn('创建拦截器实例时出错:', error);
                    return null;
                }
            }
            return target[prop];
        }
    });
} 