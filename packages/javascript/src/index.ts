import * as fs from 'fs';
import * as path from 'path';
import { CSS_CONTENT } from './styles';

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
    name?: string;
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
            }, message.name);
        } else {
            this.appendMessageToHtml(message.role, {
                text: message.content,
                tools: tools
            }, message.name);
        }
    }

    private processRegularMessage(message: Message): void {
        if (Array.isArray(message.content)) {
            const processedParts = message.content
                .map(part => this.processMessagePart(part))
                .filter(Boolean);

            this.appendMessageToHtml(message.role, processedParts.join('\n'), message.name);
        } else {
            this.appendMessageToHtml(
                message.role,
                this.processTextContent(String(message.content || '')),
                message.name
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
        // 直接使用导入的 CSS 内容
        return `<style>\n${CSS_CONTENT}\n${this.options.customStyles || ''}\n</style>`;
    }


    private generateScript(): string {
        return `<script>
            document.addEventListener('DOMContentLoaded', function() {
                // 全局弹出层，只创建一次
                const popupContainer = document.createElement('div');
                popupContainer.className = 'tools-popup';
                popupContainer.innerHTML = \`
                    <span class="tools-popup-close" title="关闭">&times;</span>
                    <div class="tools-popup-title">可用工具列表</div>
                    <div class="tools-popup-content">
                        <pre><code class="language-json"></code></pre>
                    </div>
                \`;
                document.body.appendChild(popupContainer);
                
                // 关闭按钮事件
                popupContainer.querySelector('.tools-popup-close').addEventListener('click', function() {
                    popupContainer.classList.remove('tools-popup-visible');
                });
                
                // 初始化所有工具图标的点击事件
                function initToolsIcons() {
                    document.querySelectorAll('.tools-icon').forEach(icon => {
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
                        if (window.hljs) {
                            hljs.highlightElement(codeElement);
                        }
                        
                        // 定位弹出层
                        const iconRect = icon.getBoundingClientRect();
                        popupContainer.style.top = \`\${iconRect.bottom + 5}px\`;
                        popupContainer.style.right = \`\${window.innerWidth - iconRect.right}px\`;
                        
                        // 显示弹出层
                        popupContainer.classList.add('tools-popup-visible');
                        
                        // 调整位置
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
                            popup.style.top = \`\${parseInt(popup.style.top || '0') - overflowBottom - 10}px\`;
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
                
                // 使用MutationObserver监听DOM变化，处理动态添加的工具图标
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
                
                // 开始观察DOM变化
                observer.observe(document.getElementById('conversation'), { 
                    childList: true, 
                    subtree: true 
                });
                
                // 初始化代码高亮
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
    private appendMessageToHtml(role: string, content: string | AssistantMessage | EnhancedUserMessage, name?: string): void {
        let messageHtml = name
            ? `<div class="message ${role}" data-name="${this.escapeHtml(name)}">`
            : `<div class="message ${role}">`;

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
                            <svg class="tool-call-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                            </svg>
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