import html
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, List, Dict


class HtmlGenerator:
    """HTML 生成和导出工具，可复用于不同的日志收集场景"""
    
    def __init__(self, output_dir: str = "logs"):
        """初始化 HTML 生成器
        
        Args:
            output_dir: 输出目录，默认为 "logs"
        """
        self.output_dir = output_dir
        self.html_file = None
        
        # 确保输出目录存在
        Path(output_dir).mkdir(exist_ok=True)
    
    def create_html_file(self) -> str:
        """创建新的 HTML 文件并添加基本样式"""
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>AI对话历史</title>
            <style>
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
                    position: relative;
                    overflow: visible;
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
                
                #conversation {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    width: 100%;
                }
                
                .user {
                    background-color: #e9f2ff;
                    margin-right: 15%;
                    border: 1px solid #d1e3ff;
                    position: relative;
                    align-self: flex-start;
                    max-width: 85%;
                    padding-right: 40px; /* 为工具图标预留空间 */
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
                    align-self: flex-end;
                    max-width: 85%;
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

                /* 添加 tool 消息的样式 */
                .tool {
                    background-color: #f3f4f6;
                    margin: 20px 0;
                    border: 1px solid #d1d5db;
                    position: relative;
                }
                
                .tool:before {
                    content: "Tool";
                    position: absolute;
                    top: -10px;
                    left: 12px;
                    background: #6366f1;
                    color: white;
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 10px;
                }
                
                /* 用户消息中的工具图标 */
                .tools-icon {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    width: 22px;
                    height: 22px;
                    cursor: pointer;
                    color: #4b7bec;
                    opacity: 0.7;
                    transition: all 0.2s ease;
                    background-color: rgba(255, 255, 255, 0.8);
                    padding: 3px;
                    border-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                }
                
                .tools-icon:hover {
                    opacity: 1;
                    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
                    transform: translateY(-1px);
                }
                
                /* 工具信息弹出层 */
                .tools-popup {
                    display: none;
                    position: fixed;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 10px;
                    width: 400px;
                    max-width: 90vw;
                    max-height: 60vh;
                    overflow: hidden;
                    z-index: 100;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
                }
                
                .tools-popup-content {
                    height: calc(60vh - 60px);
                    overflow: hidden;
                }
                
                .tools-popup pre {
                    margin: 0;
                    white-space: pre-wrap;
                    padding: 8px;
                    border-radius: 6px;
                    background-color: #f8f9fa;
                    border: 1px solid #f0f0f0;
                    font-size: 13px;
                    overflow: auto;
                    height: 100%;
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
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                /* 关闭按钮 */
                .tools-popup-close {
                    position: absolute;
                    top: 8px;
                    right: 10px;
                    cursor: pointer;
                    font-size: 18px;
                    color: #9ca3af;
                    line-height: 1;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                }
                
                .tools-popup-close:hover {
                    color: #4b5563;
                    background-color: #f3f4f6;
                }

                /* 工具信息标题 */
                .tools-popup-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #4b7bec;
                    margin: 0 0 8px 0;
                    padding: 0 20px 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                    line-height: 1.5;
                }
                
                /* 响应式调整 */
                @media (max-width: 600px) {
                    .tools-popup {
                        width: calc(100vw - 40px);
                        max-height: 70vh;
                    }
                    
                    .tools-popup pre {
                        max-height: calc(70vh - 50px);
                    }
                }

                /* 消息内容文本 */
                .content-text {
                    display: inline;
                }
            </style>
            <!-- 引入代码高亮库 -->
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
            <script>hljs.highlightAll();</script>
            <script>
            document.addEventListener('DOMContentLoaded', function() {
                // 全局弹出层，只创建一次
                const popupContainer = document.createElement('div');
                popupContainer.className = 'tools-popup';
                popupContainer.innerHTML = `
                    <span class="tools-popup-close" title="关闭">&times;</span>
                    <div class="tools-popup-title">可用工具列表</div>
                    <div class="tools-popup-content">
                        <pre><code class="language-json"></code></pre>
                    </div>
                `;
                document.body.appendChild(popupContainer);
                
                // 关闭按钮事件
                popupContainer.querySelector('.tools-popup-close').addEventListener('click', function() {
                    popupContainer.classList.remove('tools-popup-visible');
                });
                
                // 添加点击事件委托到父元素
                document.getElementById('conversation').addEventListener('click', function(e) {
                    // 检查是否点击了工具图标
                    if (e.target.classList.contains('tools-icon') || e.target.closest('.tools-icon')) {
                        const icon = e.target.closest('.tools-icon');
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
                            popupContainer.style.top = `${iconRect.bottom + 5}px`;
                            popupContainer.style.right = `${window.innerWidth - iconRect.right}px`;
                            
                            // 显示弹出层
                            popupContainer.classList.add('tools-popup-visible');
                            
                            // 调整位置
                            adjustPopupPosition(popupContainer);
                        }
                    }
                });
                
                // 初始化时检查所有用户消息内容高度
                setTimeout(() => {
                    document.querySelectorAll('.message.user').forEach(message => {
                        // 移除空格、换行符等空白字符，检查消息是否为空
                        const text = message.textContent.trim();
                        if (!text || text.length === 0) {
                            message.style.padding = '5px 20px';
                        }
                    });
                }, 100);
                
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
                            popup.style.top = `${parseInt(popup.style.top || '0') - overflowBottom - 10}px`;
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
            });
            </script>
        </head>
        <body>
            <h1>AI对话历史</h1>
            <div id="conversation">
        """

        # 创建新的HTML文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        html_file = os.path.join(self.output_dir, f"conversation_{timestamp}.html")

        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        self.html_file = html_file
        return html_file

    def _escape_html(self, text: str) -> str:
        """转义 HTML 特殊字符"""
        return html.escape(str(text))

    def _process_content(self, content: Any) -> str:
        """处理内容中的代码和图片"""
        try:
            if not content:
                return ''
            
            # 处理多模态内容（列表形式）
            if isinstance(content, list):
                processed_parts = []
                for part in content:
                    if isinstance(part, dict):
                        # 处理图片
                        if part.get('type') == 'image_url':
                            image_url = part.get('image_url', {}).get('url', '')
                            if image_url:
                                # 使用统一的图片处理格式
                                processed_parts.append(f'<div class="image-container"><img src="{image_url}" alt="图片"></div>')
                        # 处理文本
                        elif part.get('type') == 'text':
                            text = part.get('text', '')
                            processed_text = self._escape_html(text)
                            processed_text = self._detect_code_blocks(processed_text)
                            processed_text = self._detect_inline_code(processed_text)
                            processed_parts.append(processed_text)
                        else:
                            # 处理其他类型
                            processed_parts.append(self._escape_html(str(part)))
                return '\n'.join(processed_parts)
            
            # 处理字符串内容
            elif isinstance(content, str):
                processed = self._escape_html(content)
                processed = self._detect_code_blocks(processed)
                # 对于普通字符串，保留图片检测，因为可能包含图片链接
                processed = self._detect_images(processed)
                processed = self._detect_inline_code(processed)
                return f'<span class="content-text">{processed}</span>'
            
            # 处理带有text字段的字典内容（用于增强型用户消息）
            elif isinstance(content, dict) and 'text' in content:
                text_content = content.get('text', '')
                return self._process_content(text_content)
            
            # 处理其他类型（字典等）
            else:
                # 转为 JSON 字符串
                content_str = json.dumps(content, ensure_ascii=False, indent=2)
                return f'<pre><code>{self._escape_html(content_str)}</code></pre>'
            
        except Exception as e:
            print(f"处理内容时出错: {e}")
            # 返回转义后的原始内容
            return html.escape(str(content))

    def _detect_code_blocks(self, text: str) -> str:
        """检测并高亮代码块"""
        lines = text.split('\n')
        in_code_block = False
        language = ''
        code_content = []
        result = []

        for line in lines:
            if line.startswith('```') and not in_code_block:
                in_code_block = True
                language = line[3:].strip() or 'plaintext'
            elif line.startswith('```') and in_code_block:
                in_code_block = False
                highlighted_code = f'<pre><code class="language-{language}">{"\n".join(code_content)}</code></pre>'
                result.append(highlighted_code)
                code_content = []
            elif in_code_block:
                code_content.append(line)
            else:
                result.append(line)

        return '\n'.join(result)

    def _detect_images(self, text: str) -> str:
        """检测并替换图片URL和Base64图片为img标签"""
        # 处理普通图片URL
        url_pattern = r'(https?://\S+\.(?:png|jpg|jpeg|gif|webp))'
        text = re.sub(url_pattern, r'<div class="image-container"><img src="\1" alt="图片"></div>', text)

        # 处理Base64编码的图片
        base64_pattern = r'(data:image/(?:png|jpg|jpeg|gif|webp);base64,[a-zA-Z0-9+/]+={0,2})'
        return re.sub(base64_pattern, r'<div class="image-container"><img src="\1" alt="Base64图片"></div>', text)

    def _detect_inline_code(self, text: str) -> str:
        """检测内联代码"""
        parts = text.split('`')
        result = []
        for i, part in enumerate(parts):
            if i % 2 == 1:  # 奇数部分是代码
                result.append(f'<code>{part}</code>')
            else:
                result.append(part)
        return ''.join(result)

    def _format_tool_calls(self, tool_calls: list) -> list:
        """格式化工具调用信息"""
        result = []
        
        for tool_call in tool_calls:
            if isinstance(tool_call, dict):
                # 处理API响应中的原始JSON格式
                function_name = tool_call.get("function", {}).get("name", "unknown")
                try:
                    function_args = json.loads(tool_call.get("function", {}).get("arguments", "{}"))
                except:
                    function_args = tool_call.get("function", {}).get("arguments", {})
            else:
                # 处理其他可能的格式
                function_name = getattr(getattr(tool_call, "function", {}), "name", "unknown")
                try:
                    function_args = json.loads(getattr(getattr(tool_call, "function", {}), "arguments", "{}"))
                except:
                    function_args = getattr(getattr(tool_call, "function", {}), "arguments", {})
            
            result.append({
                'function_name': function_name,
                'function_args': function_args
            })
            
        return result

    def append_message(self, role: str, content: Any) -> None:
        """将新的对话内容追加到 HTML 文件中"""
        if not self.html_file:
            self.create_html_file()
            
        message_html = f'<div class="message {role}">'

        if role == "user" or role == "system":
            # 用户消息直接展示
            message_html += self._process_content(content)
            
            # 如果用户消息有tools字段，添加一个图标
            if isinstance(content, dict) and content.get('tools'):
                tools_json = json.dumps(content.get('tools'), indent=2, ensure_ascii=False)
                message_html += f'''
                <svg class="tools-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="查看可用工具">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14 16l3 3 3-3m0 0v-8" />
                </svg>
                '''
                
                # 将工具数据存储为自定义数据属性，而不是直接在DOM中
                message_html += f'<div class="tools-data" data-tools="{self._escape_html(tools_json)}" style="display:none;"></div>'
        else:
            # AI 响应消息
            if isinstance(content, dict):
                # 展示主要响应文本
                content_text = content.get('content', content.get('response', ''))
                message_html += self._process_content(content_text)

                # 如果有工具调用，单独展示
                tool_calls = content.get('tool_calls', [])
                if tool_calls:
                    for tool_call in tool_calls:
                        message_html += f'<div class="tool-call-container"><div class="tool-call-header"><svg class="tool-call-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg><div class="tool-call-title">Tool | {tool_call["function_name"]}</div></div><pre><code>{json.dumps(tool_call["function_args"], indent=2, ensure_ascii=False)}</code></pre></div>'
            else:
                message_html += self._process_content(content)

        message_html += "</div>"

        with open(self.html_file, "a", encoding="utf-8") as f:
            f.write(message_html)

    def close_html_file(self) -> None:
        """关闭 HTML 文件"""
        if not self.html_file:
            return
            
        with open(self.html_file, "a", encoding="utf-8") as f:
            f.write("""
            </div>
            <script>hljs.highlightAll();</script>
        </body>
        </html>
        """)


    def export_conversation(self, conversation: List[Dict]) -> None:
        """导出完整对话历史到 HTML 文件
        
        Args:
            conversation: 对话历史列表，每个元素应包含 role 和 content
        """
        # 创建新文件
        self.create_html_file()
        
        # 添加所有对话内容
        for message in conversation:
            self.append_message(
                message["role"], 
                message["content"] if message["role"] == "user" else message
            )
        
        # 关闭文件
        self.close_html_file() 

    def append_divider(self, title: str = ""):
        """添加分隔线到对话中
        
        Args:
            title: 分隔线标题
        """
        if self.html_file:
            divider_html = f"""
            <div class="conversation-divider" style="text-align: center; margin: 20px 0; color: #6b7280; font-size: 14px;">
                <span style="display: inline-block; position: relative; padding: 0 10px; background: #f7f7f8;">
                    <span style="border-top: 1px solid #d1d5db; position: absolute; top: 50%; left: 0; width: 100%; z-index: -1;"></span>
                    {html.escape(title)}
                </span>
            </div>
            """
            with open(self.html_file, "a", encoding="utf-8") as f:
                f.write(divider_html)