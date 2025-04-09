// OpenAI 拦截器，用于捕获对话记录并自动导出为HTML
class OpenAIInterceptor {
  constructor(originalInstance) {
    this.originalInstance = originalInstance;
    this.conversations = [];
    this.processedMessageCount = 0;
    this.htmlFile = null;
    
    // 定义样式
    this.baseStyles = `
      body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f7f7f8;
          line-height: 1.6;
          color: #374151;
      }
      .message {
          margin: 20px 0;
          padding: 16px 20px;
          border-radius: 16px;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 15px;
          line-height: 1.5;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transition: all 0.2s ease;
      }
      
      .message:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
          background-color: #e9f2ff;
          margin-right: 15%;
          border: 1px solid #d1e3ff;
          position: relative;
      }
      
      .user:before {
          content: "用户";
          position: absolute;
          top: -10px;
          left: 12px;
          background: #4b7bec;
          color: white;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 10px;
      }
      
      .assistant {
          background-color: #ffffff;
          margin-left: 15%;
          border: 1px solid #e5e7eb;
          position: relative;
      }
      
      .assistant:before {
          content: "AI";
          position: absolute;
          top: -10px;
          left: 12px;
          background: #45aaf2;
          color: white;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 10px;
      }

      .system {
          background-color: #f0f9ff;
          margin: 20px 0;
          border: 1px solid #bae6fd;
          position: relative;
          font-style: italic;
      }
      
      .system:before {
          content: "系统";
          position: absolute;
          top: -10px;
          left: 12px;
          background: #0ea5e9;
          color: white;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 10px;
      }

      pre {
          background-color: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 12px 0;
          font-family: 'Menlo', 'Consolas', monospace;
          font-size: 14px;
          line-height: 1.4;
          border: 1px solid #e5e7eb;
      }
      code {
          font-family: 'Menlo', 'Consolas', monospace;
          background-color: #f3f4f6;
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 14px;
      }
      .tool-call-header {
          margin: 12px 0 0 0;
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background-color: #f1f5f9;
          border-radius: 6px 6px 0 0;
          font-weight: 500;
          color: #334155;
      }
      
      .tool-call-icon {
          width: 16px;
          height: 16px;
          margin-right: 8px;
          color: #475569;
      }
      
      .tool-call-title {
          font-size: 0.9em;
          font-weight: 600;
      }

      .tool-call-container {
          margin: 12px 0;
      }
      
      .tool-call-header + pre {
          margin-top: 0;
          border-top-left-radius: 0;
          border-top-right-radius: 0;
      }

      h1 {
          color: #111827;
          font-size: 1.5em;
          font-weight: 600;
          margin-bottom: 24px;
          text-align: center;
      }
      /* 图片样式 */
      img {
          max-width: 100%;
          border-radius: 8px;
          margin: 8px 0;
          display: block;
      }
      /* 图片容器，用于限制最大高度 */
      .image-container {
          max-height: 400px;
          overflow: auto;
          margin: 12px 0;
      }
    `;
    
    this.additionalStyles = `
      .html-code {
          background-color: #1e1e1e;
          border-radius: 6px;
          margin: 10px 0;
          padding: 15px;
          overflow-x: auto;
      }
      
      .html-code code {
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 14px;
          line-height: 1.5;
          color: #d4d4d4;
      }
      
      .html-code .token.tag {
          color: #569cd6;
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
          margin: 10px 0;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #e9ecef;
      }
      
      .image-container img {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: 4px;
      }
    `;
    
    this.setupInterceptors();
    
    // 创建一个初始HTML文件
    this.createHtmlFile();
  }

  setupInterceptors() {
    // 拦截 chat.completions.create 方法
    const originalCreate = this.originalInstance.chat.completions.create;
    this.originalInstance.chat.completions.create = async (...args) => {
      const startTime = new Date();
      
      try {
        // 保存请求数据
        const request = args[0];
        
        // 记录用户消息 (在调用API之前)
        this.processUserMessages(request.messages);
        
        // 调用原始方法
        const response = await originalCreate.apply(this.originalInstance.chat.completions, args);
        
        // 记录AI响应
        this.processAIResponse(response);
        
        return response;
      } catch (error) {
        // 记录错误
        this.logError(error.toString());
        
        throw error;
      }
    };
  }

  // 处理用户消息并添加到HTML
  processUserMessages(messages) {
    if (!messages || !Array.isArray(messages)) return;
    
    // 仅处理新消息
    for (let i = this.processedMessageCount; i < messages.length; i++) {
      const message = messages[i];
      
      try {
        // 检查content是否为数组
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
              console.warn('处理消息部分时出错:', err);
              return '';
            }
          }).filter(Boolean); // 移除空值
          
          this.appendMessageToHtml(message.role, processedParts.join('\n'));
        } else {
          // 处理普通文本内容
          this.appendMessageToHtml(message.role, this.processTextContent(String(message.content || '')));
        }
        
        this.processedMessageCount++;
      } catch (err) {
        console.error('处理消息时出错:', err);
      }
    }
  }

  // 处理文本内容
  processTextContent(text) {
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
  processImageContent(imageUrl) {
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
  processContent(content) {
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
      return this.escapeHtml(content);
    }
  }

  // 处理AI响应并添加到HTML
  processAIResponse(response) {
    if (!response || !response.choices || response.choices.length === 0) return;
    
    const aiMessage = response.choices[0].message;
    if (!aiMessage) return;
    
    // 构建AI响应对象
    const assistantMessage = {
      content: aiMessage.content || "",
      tool_calls: this.formatToolCalls(aiMessage.tool_calls || [])
    };
    
    // 添加到HTML
    this.appendMessageToHtml("assistant", assistantMessage);
    this.processedMessageCount++;
    
    // 完成当前对话，关闭并重新创建HTML文件
    this.closeHtmlFile();
    this.createHtmlFile();
  }

  // 记录错误信息
  logError(errorMessage) {
    this.appendMessageToHtml("system", `错误: ${errorMessage}`);
    this.processedMessageCount++;
    this.closeHtmlFile();
    this.createHtmlFile();
  }

  // 创建新的HTML文件
  createHtmlFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const htmlFilename = `ai-conversation-${timestamp}.html`;
    
    // 创建HTML头部
    const htmlHeader = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>AI对话历史</title>
          <style>
              ${this.baseStyles}
              ${this.additionalStyles}
          </style>
          <!-- 使用更好的代码高亮库 -->
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-tomorrow.min.css">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/prism.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-markup.min.js"></script>
          <script>
              // 确保代码高亮在动态内容加载后执行
              document.addEventListener('DOMContentLoaded', (event) => {
                  if (typeof Prism !== 'undefined') {
                      Prism.highlightAll();
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
  closeHtmlFile() {
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
  appendMessageToHtml(role, content) {
    if (!this.htmlFile) {
      this.createHtmlFile();
    }
    
    let messageHtml = `<div class="message ${role}">`;
    
    if (role === "user" || role === "system") {
      // 用户或系统消息，直接添加内容，不做额外转义
      messageHtml += content;
    } else {
      // AI响应
      if (typeof content === 'object') {
        // 主要文本内容
        messageHtml += content.content || "";
        
        // 工具调用
        if (content.tool_calls && content.tool_calls.length > 0) {
          content.tool_calls.forEach(toolCall => {
            messageHtml += `
              <div class="tool-call-container">
                <div class="tool-call-header">
                  <svg class="tool-call-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                  </svg>
                  <div class="tool-call-title">Tool | ${toolCall.function_name}</div>
                </div>
                <pre><code>${this.formatJson(toolCall.function_args)}</code></pre>
              </div>
            `;
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
  saveHtmlToFile(isComplete = false) {
    // 在Node.js环境中
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fs = require('fs');
        const path = require('path');
        
        // 创建logs目录（如果不存在）
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        
        // 构建完整的文件路径
        const filePath = path.join(logsDir, this.htmlFilename);
        
        // 写入文件
        fs.writeFileSync(filePath, this.htmlContent, 'utf8');
        
        // 仅在完成时打印日志
        if (isComplete) {
          console.log(`HTML文件已保存: ${filePath}`);
        }
      } catch (error) {
        console.error('保存HTML文件失败:', error);
      }
    }
    // 在浏览器环境中
    else if (typeof window !== 'undefined') {
      // 仅在对话完成时下载文件
      if (isComplete) {
        const blob = new Blob([this.htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = this.htmlFilename;
        a.click();
        
        URL.revokeObjectURL(url);
        
        console.log(`HTML文件已保存: ${this.htmlFilename}`);
      }
    }
  }

  // 格式化工具调用
  formatToolCalls(toolCalls) {
    if (!toolCalls || !Array.isArray(toolCalls)) return [];
    
    return toolCalls.map(toolCall => {
      let functionArgs = {};
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
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  // 检测并处理代码块
  detectCodeBlocks(text) {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let language = '';
    let codeContent = [];
    let result = [];

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
  detectInlineCode(text) {
    const parts = text.split('`');
    let result = [];
    
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
  formatJson(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  }

  // 保存对话记录到localStorage (可选功能)
  saveConversations() {
    try {
      localStorage.setItem('ai-chat-history', JSON.stringify(this.conversations));
    } catch (e) {
      console.warn('无法保存AI对话历史到localStorage', e);
    }
  }

  getConversations() {
    return this.conversations;
  }
}

// 创建带拦截器的OpenAI客户端
export function createInterceptedOpenAI(OpenAIClass, config) {
  const originalInstance = new OpenAIClass(config);
  
  // 存储原始的 chat.completions.create 方法
  const originalCreate = originalInstance.chat.completions.create.bind(originalInstance.chat.completions);
  
  // 拦截 chat.completions.create 方法
  originalInstance.chat.completions.create = async function(...args) {
    // 确保请求参数是有效的
    const request = args[0];
    if (!request || !request.messages) {
      throw new Error('Invalid request: messages array is required');
    }

    // 验证并清理消息内容
    request.messages = request.messages.map(msg => {
      // 确保消息格式正确
      if (!msg.role || !msg.content) {
        throw new Error('Invalid message format: role and content are required');
      }

      // 如果content是数组，确保每个元素都是有效的
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content.map(part => {
            if (part.type === 'text') {
              return {
                type: 'text',
                text: String(part.text || '') // 确保text是字符串
              };
            }
            if (part.type === 'image_url') {
              return {
                type: 'image_url',
                image_url: {
                  url: String(part.image_url?.url || ''),
                  detail: part.image_url?.detail || 'auto'
                }
              };
            }
            // 如果是未知类型，转换为text类型
            return {
              type: 'text',
              text: JSON.stringify(part)
            };
          })
        };
      }

      // 如果content是字符串，确保它是有效的
      return {
        role: msg.role,
        content: String(msg.content || '')
      };
    });

    // 创建拦截器实例（如果还没有）
    if (!originalInstance._interceptor) {
      originalInstance._interceptor = new OpenAIInterceptor(originalInstance);
    }
    
    const interceptor = originalInstance._interceptor;
    const startTime = new Date();
    
    try {
      // 记录用户消息 (在调用API之前)
      interceptor.processUserMessages(request.messages);
      
      // 调用原始方法
      const response = await originalCreate(request);
      
      // 记录AI响应
      interceptor.processAIResponse(response);
      
      return response;
    } catch (error) {
      // 记录错误
      interceptor.logError(error.toString());
      
      throw error;
    }
  };
  
  // 添加拦截器访问器
  return new Proxy(originalInstance, {
    get(target, prop) {
      if (prop === 'interceptor') {
        if (!target._interceptor) {
          target._interceptor = new OpenAIInterceptor(target);
        }
        return target._interceptor;
      }
      return target[prop];
    }
  });
}