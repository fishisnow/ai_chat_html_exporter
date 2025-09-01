import * as fs from 'fs';
import * as path from 'path';

// 类型定义
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
    [key: string]: any;
}

interface StreamToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

interface EnhancedUserMessage {
    text: string | MessageContent[];
    tools?: any[];
}

interface ExporterOptions {
    outputDir?: string;
    enableFileOutput?: boolean;
    customStyles?: string;
}

/**
 * OpenAI 聊天对话 HTML 导出器
 * 拦截 OpenAI API 调用并自动将对话导出为美观的 HTML 文件
 */
export class OpenaiChatHtmlExporter {
    private processedMessageCount: number;
    private htmlFile: string | null;
    private htmlContent: string;
    private htmlFilename: string;
    private previousMessagesCount: number;
    private isFirstConversation: boolean;
    private step: number;
    private options: ExporterOptions;

    constructor(options: ExporterOptions = {}) {
        this.processedMessageCount = 0;
        this.htmlFile = null;
        this.htmlContent = '';
        this.htmlFilename = '';
        this.previousMessagesCount = 0;
        this.isFirstConversation = true;
        this.step = 0;
        this.options = {
            outputDir: 'logs',
            enableFileOutput: true,
            customStyles: '',
            ...options
        };

        // 创建初始HTML文件
        this.createHtmlFile();
    }

    /**
     * 处理用户消息并添加到HTML
     */
    processUserMessages(messages: Message[], tools?: any[]): void {
        if (!messages || !Array.isArray(messages)) return;

        try {
            const isNewConversation = this.isNewConversation(messages);

            if (isNewConversation && !this.isFirstConversation) {
                this.step += 1;
                this.appendDividerToHtml(`———Step ${this.step}———`);
                this.processedMessageCount = 0;
            }

            if (isNewConversation) {
                this.previousMessagesCount = messages.length;
                this.isFirstConversation = false;
            } else {
                this.previousMessagesCount = Math.max(this.previousMessagesCount, messages.length);
            }

            // 仅处理新消息
            for (let i = this.processedMessageCount; i < messages.length; i++) {
                const message = messages[i];
                if (!message) continue;

                try {
                    this.processMessage(message, i, messages.length, tools);
                    this.processedMessageCount++;
                } catch (err) {
                    console.warn('处理单条消息时出错:', err);
                }
            }
        } catch (err) {
            console.error('处理消息列表时出错:', err);
        }
    }

    private processMessage(message: Message, index: number, totalLength: number, tools?: any[]): void {
        const isLastUserMessage = message.role === "user" && index === totalLength - 1;
        const hasTools = tools && tools.length > 0;

        if (isLastUserMessage && hasTools) {
            this.processUserMessageWithTools(message, tools);
        } else {
            this.processRegularMessage(message);
        }
    }

    private processUserMessageWithTools(message: Message, tools: any[]): void {
        if (Array.isArray(message.content)) {
            const processedParts = message.content
                .map(part => this.processMessagePart(part))
                .filter(Boolean);

            this.appendMessageToHtml(message.role, {
                text: processedParts.join('\n'),
                tools: tools
            });
        } else {
            this.appendMessageToHtml(message.role, {
                text: message.content,
                tools: tools
            });
        }
    }

    private processRegularMessage(message: Message): void {
        if (Array.isArray(message.content)) {
            const processedParts = message.content
                .map(part => this.processMessagePart(part))
                .filter(Boolean);

            this.appendMessageToHtml(message.role, processedParts.join('\n'));
        } else {
            this.appendMessageToHtml(
                message.role,
                this.processTextContent(String(message.content || ''))
            );
        }
    }

    private processMessagePart(part: MessageContent): string {
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
    }

    /**
     * 判断是否是新会话
     */
    private isNewConversation(messages: Message[]): boolean {
        if (this.previousMessagesCount === 0) {
            return true;
        }
        return messages.length < this.previousMessagesCount + 1;
    }

    /**
     * 添加分隔符到HTML
     */
    private appendDividerToHtml(text: string): void {
        const dividerHtml = `<div class="divider">${text}</div>`;
        this.htmlContent += dividerHtml;
        this.saveHtmlToFile();
    }

    /**
     * 处理文本内容
     */
    private processTextContent(text: string): string {
        if (!text) return '';

        try {
            const containsHtml = /<[a-z][\s\S]*>/i.test(text);

            if (containsHtml) {
                return `<pre><code class="language-html">${this.escapeHtml(text)}</code></pre>`;
            }

            return this.processContent(text);
        } catch (error) {
            console.warn('处理文本内容失败:', error);
            return this.escapeHtml(text);
        }
    }

    /**
     * 处理图片内容
     */
    private processImageContent(imageUrl?: { url: string; detail?: string }): string {
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

    /**
     * 处理普通内容
     */
    private processContent(content: string | object): string {
        if (!content) return '';

        try {
            if (typeof content === 'object') {
                content = JSON.stringify(content, null, 2);
            }

            let processed = content;
            processed = this.detectCodeBlocks(processed);
            processed = this.detectInlineCode(processed);

            return processed;
        } catch (error) {
            console.warn('处理内容失败:', error);
            return this.escapeHtml(typeof content === 'string' ? content : JSON.stringify(content));
        }
    }

    /**
     * 处理AI响应
     */
    processAIResponse(response: OpenAIResponse): void {
        if (!response || !response.choices || response.choices.length === 0) return;

        const aiMessage = response.choices[0].message;
        if (!aiMessage) return;

        const assistantMessage: AssistantMessage = {
            content: aiMessage.content || "",
            tool_calls: this.formatToolCalls(aiMessage.tool_calls || [])
        };

        this.appendMessageToHtml("assistant", assistantMessage);
        this.processedMessageCount++;
        
        this.handleToolOutputs(assistantMessage.tool_calls);
        this.closeHtmlFile();
    }

    /**
     * 处理流式响应的完整内容
     */
    processStreamCompletionResponse(fullContent: string, allToolCalls: ToolCall[]): void {
        const assistantMessage: AssistantMessage = {
            content: fullContent || "",
            tool_calls: this.formatToolCalls(allToolCalls || [])
        };

        this.appendMessageToHtml("assistant", assistantMessage);
        this.processedMessageCount++;
        
        this.handleToolOutputs(assistantMessage.tool_calls);
        this.closeHtmlFile();
    }

    private handleToolOutputs(toolCalls: FormattedToolCall[]): void {
        if (toolCalls && toolCalls.length > 0) {
            toolCalls.forEach(toolCall => {
                if (toolCall.function_name === 'shell' && toolCall.function_args.output) {
                    this.appendToolOutput(toolCall.function_args.output);
                }
            });
        }
    }

    /**
     * 记录错误信息
     */
    logError(errorMessage: string): void {
        this.appendMessageToHtml("system", `错误: ${errorMessage}`);
        this.processedMessageCount++;
        this.closeHtmlFile();
    }

    /**
     * 添加工具输出
     */
    private appendToolOutput(output: string): void {
        const toolHtml = `<div class="tool">${this.escapeHtml(output)}</div>`;
        this.htmlContent += toolHtml;
        this.saveHtmlToFile();
    }

    /**
     * 创建新的HTML文件
     */
    private createHtmlFile(): void {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const htmlFilename = `ai-conversation-${timestamp}.html`;

        this.htmlContent = this.generateHtmlHeader();
        this.htmlFilename = htmlFilename;
        this.htmlFile = this.htmlFilename;

        this.saveHtmlToFile();
    }

    private generateHtmlHeader(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI对话历史</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    ${this.generateStyles()}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/json.min.js"></script>
    ${this.generateScript()}
</head>
<body>
    <h1>AI对话历史</h1>
    <div id="conversation">`;
    }

    private generateStyles(): string {
        const baseStyles = `<style>
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

            @media (max-width: 600px) {
                body { padding: 20px 12px; }
                .message { margin: 16px 0; padding: 12px 14px; }
                pre { padding: 12px; }
            }

            ${this.options.customStyles || ''}
        </style>`;

        return baseStyles;
    }

    private generateScript(): string {
        return `<script>
            document.addEventListener('DOMContentLoaded', function() {
                if (typeof hljs !== 'undefined') {
                    hljs.configure({
                        languages: ['json', 'javascript', 'python', 'bash', 'html', 'css'],
                        ignoreUnescapedHTML: true
                    });
                    hljs.highlightAll();
                }
            });
        </script>`;
    }

    /**
     * 关闭HTML文件
     */
    private closeHtmlFile(): void {
        if (!this.htmlFile) return;

        const htmlFooter = `    </div>
</body>
</html>`;

        this.htmlContent += htmlFooter;
        this.saveHtmlToFile(true);
    }

    /**
     * 添加消息到HTML
     */
    private appendMessageToHtml(role: string, content: string | AssistantMessage | EnhancedUserMessage): void {
        let messageHtml = `<div class="message ${role}">`;

        if (role === "user" || role === "system") {
            messageHtml += this.processUserSystemMessage(content as string | EnhancedUserMessage);
        } else {
            messageHtml += this.processAssistantMessage(content as string | AssistantMessage);
        }

        messageHtml += "</div>";
        this.htmlContent += messageHtml;
        this.saveHtmlToFile();
    }

    private processUserSystemMessage(content: string | EnhancedUserMessage): string {
        if (typeof content === 'string') {
            return content;
        }

        const enhancedMessage = content as EnhancedUserMessage;
        let html = '';

        if (enhancedMessage.text) {
            html += typeof enhancedMessage.text === 'string' 
                ? this.processTextContent(enhancedMessage.text)
                : 'Complex content';
        }

        if (enhancedMessage.tools && enhancedMessage.tools.length > 0) {
            const toolsJson = JSON.stringify(enhancedMessage.tools, null, 2);
            html += `<svg class="tools-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="查看可用工具">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 16l3 3 3-3m0 0v-8" />
            </svg>
            <div class="tools-data" data-tools="${this.escapeHtml(toolsJson)}" style="display:none;"></div>`;
        }

        return html;
    }

    private processAssistantMessage(content: string | AssistantMessage): string {
        if (typeof content === 'object') {
            const assistantMessage = content as AssistantMessage;
            let html = assistantMessage.content || "";

            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                assistantMessage.tool_calls.forEach(toolCall => {
                    html += `<div class="tool-call-container">
                        <div class="tool-call-header">
                            <div class="tool-call-title">Tool | ${toolCall.function_name}</div>
                        </div>
                        <pre><code>${this.formatJson(toolCall.function_args)}</code></pre>
                    </div>`;
                });
            }

            return html;
        }

        return content;
    }

    /**
     * 保存HTML到文件
     */
    private saveHtmlToFile(isComplete: boolean = false): void {
        if (!this.options.enableFileOutput) return;

        try {
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                try {
                    const logsDir = path.join(process.cwd(), this.options.outputDir!);
                    if (!fs.existsSync(logsDir)) {
                        fs.mkdirSync(logsDir, { recursive: true });
                    }

                    const filePath = path.join(logsDir, this.htmlFilename);
                    fs.writeFileSync(filePath, this.htmlContent, 'utf8');

                    if (isComplete) {
                        console.log(`HTML文件已保存: ${filePath}`);
                    }
                } catch (error) {
                    console.warn('保存HTML文件失败:', error);
                }
            }
        } catch (error) {
            console.warn('保存文件过程出错:', error);
        }
    }

    /**
     * 格式化工具调用
     */
    private formatToolCalls(toolCalls: ToolCall[]): FormattedToolCall[] {
        if (!toolCalls || !Array.isArray(toolCalls)) return [];

        return toolCalls.map(toolCall => {
            let functionArgs: any = {};
            try {
                functionArgs = JSON.parse(toolCall.function?.arguments || '{}');
            } catch (e) {
                console.log("formatToolCalls parse tool args failed, err:" + e);
                functionArgs = toolCall.function?.arguments || {};
            }

            return {
                function_name: toolCall.function?.name || 'unknown',
                function_args: functionArgs
            };
        });
    }

    /**
     * HTML转义
     */
    private escapeHtml(text: string): string {
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

    /**
     * 检测并处理代码块
     */
    private detectCodeBlocks(text: string): string {
        const lines = text.split('\n');
        let inCodeBlock = false;
        let language = '';
        const codeContent: string[] = [];
        const result: string[] = [];

        for (const line of lines) {
            if (line.startsWith('```') && !inCodeBlock) {
                inCodeBlock = true;
                language = line.substring(3).trim() || 'plaintext';
            } else if (line.startsWith('```') && inCodeBlock) {
                inCodeBlock = false;
                const code = codeContent.join('\n');
                result.push(`<pre><code class="language-${language}">${code}</code></pre>`);
                codeContent.length = 0;
            } else if (inCodeBlock) {
                codeContent.push(line);
            } else {
                result.push(line);
            }
        }

        if (codeContent.length > 0) {
            result.push(`<pre><code class="language-plaintext">${codeContent.join('\n')}</code></pre>`);
        }

        return result.join('\n');
    }

    /**
     * 检测并处理内联代码
     */
    private detectInlineCode(text: string): string {
        const parts = text.split('`');
        const result: string[] = [];

        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1) {
                result.push(`<code>${parts[i]}</code>`);
            } else {
                result.push(parts[i]);
            }
        }

        return result.join('');
    }

    /**
     * 格式化JSON
     */
    private formatJson(obj: any): string {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (_) {
            return String(obj);
        }
    }
}

// OpenAI 客户端接口
interface OpenAIClient {
    chat: {
        completions: {
            create: (...args: any[]) => Promise<any>;
        };
    };
}

/**
 * 创建带有对话导出功能的 OpenAI 客户端
 * @param OpenAIClass OpenAI 客户端类
 * @param config 配置对象
 * @param exporterOptions 导出器选项
 * @returns 增强的 OpenAI 客户端实例
 */
export function createChatExporterOpenAI(
    OpenAIClass: any, 
    config: any, 
    exporterOptions?: ExporterOptions
): any {
    const originalInstance = new OpenAIClass(config) as OpenAIClient;
    const originalCreate = originalInstance.chat.completions.create.bind(originalInstance.chat.completions);

    originalInstance.chat.completions.create = async function (...args: any[]): Promise<any> {
        const originalRequest = args[0] as OpenAIRequestParams;

        try {
            if (!(originalInstance as any)._interceptor) {
                (originalInstance as any)._interceptor = new OpenaiChatHtmlExporter(exporterOptions);
            }

            const interceptor = (originalInstance as any)._interceptor as OpenaiChatHtmlExporter;

            try {
                interceptor.processUserMessages(originalRequest.messages, originalRequest.tools);
            } catch (loggingError) {
                console.warn('记录用户消息时出错:', loggingError);
            }

            const response = await originalCreate(originalRequest);

            try {
                if (originalRequest.stream === true) {
                    const [stream1, stream2] = response.tee();

                    (async () => {
                        try {
                            let fullContent = "";
                            const allToolCalls: ToolCall[] = [];
                            const currentToolCalls: Record<number, StreamToolCall> = {};

                            for await (const part of stream1) {
                                if (part.choices && part.choices.length > 0) {
                                    const choice = part.choices[0];
                                    const delta = choice.delta || {};

                                    if (delta.content != null) {
                                        fullContent += delta.content;
                                    }

                                    if (delta.tool_calls && delta.tool_calls.length > 0) {
                                        for (const toolCall of delta.tool_calls) {
                                            const toolIndex = toolCall.index || 0;

                                            if (!currentToolCalls[toolIndex]) {
                                                currentToolCalls[toolIndex] = {
                                                    id: toolCall.id || "",
                                                    type: toolCall.type || "function",
                                                    function: { name: "", arguments: "" }
                                                };
                                            }

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

                                    if (choice.finish_reason != null) {
                                        for (const toolCall of Object.values(currentToolCalls)) {
                                            if (toolCall.function.name) {
                                                allToolCalls.push(toolCall);
                                            }
                                        }
                                    }
                                }
                            }

                            interceptor.processStreamCompletionResponse(fullContent, allToolCalls);
                        } catch (err) {
                            console.warn('处理流式响应时出错:', err);
                        }
                    })();

                    return stream2;
                } else {
                    interceptor.processAIResponse(response);
                    return response;
                }
            } catch (loggingError) {
                console.warn('记录AI响应时出错:', loggingError);
                return response;
            }
        } catch (error) {
            try {
                if ((originalInstance as any)._interceptor) {
                    ((originalInstance as any)._interceptor as OpenaiChatHtmlExporter).logError((error as Error).toString());
                }
            } catch (loggingError) {
                console.warn('记录错误信息时出错:', loggingError);
            }

            throw error;
        }
    };

    return new Proxy(originalInstance, {
        get(target: any, prop: string | symbol) {
            if (prop === 'interceptor') {
                try {
                    if (!target._interceptor) {
                        target._interceptor = new OpenaiChatHtmlExporter(exporterOptions);
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

// 默认导出
export default { OpenaiChatHtmlExporter, createChatExporterOpenAI }; 