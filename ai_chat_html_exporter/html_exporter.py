import asyncio
from datetime import datetime
import html
import json
import os
import webbrowser
from pathlib import Path

from langchain.callbacks import StdOutCallbackHandler


class HtmlExporter(StdOutCallbackHandler):
    """将 AI 对话历史导出为 HTML 文件的回调处理器"""

    def __init__(
            self,
            output_dir: str = "logs",
            auto_open: bool = True
    ):
        """初始化导出器
        
        Args:
            output_dir: 输出目录，默认为 "logs"
            auto_open: 是否自动在浏览器中打开生成的 HTML 文件
        """
        super().__init__()
        self.output_dir = output_dir
        self.auto_open = auto_open
        self.html_file = self._create_html_file()

    def _create_html_file(self) -> str:
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
                    max-width: 800px;  /* 减小最大宽度 */
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9f9f9;
                    line-height: 1.6;
                }
                .message {
                    margin: 20px 0;
                    padding: 20px;  /* 增加内边距 */
                    border-radius: 12px;  /* 增加圆角 */
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);  /* 优化阴影 */
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                .user {
                    background-color: #e3f2fd;
                    margin-right: 10%;  /* 减小右边距 */
                    border: 1px solid #bbdefb;  /* 添加边框 */
                }
                .assistant {
                    background-color: #ffffff;
                    margin-left: 10%;  /* 减小左边距 */
                    border: 1px solid #e0e0e0;
                }
                .timestamp {
                    font-size: 0.8em;
                    color: #888;
                    margin-bottom: 8px;
                }
                pre {
                    background-color: #f8f9fa;
                    padding: 12px;
                    border-radius: 6px;
                    overflow-x: auto;
                    margin: 10px 0;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    border: 1px solid #eee;
                }
                .tool-calls {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                }
                .tool-calls-title {
                    font-size: 0.9em;
                    color: #666;
                    margin-bottom: 8px;
                }
                h1 {
                    color: #2c3e50;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 15px;
                    margin-bottom: 30px;
                    text-align: center;  /* 居中标题 */
                }
            </style>
        </head>
        <body>
            <h1>AI对话历史</h1>
            <div id="conversation">
        """

        # 确保输出目录存在
        Path(self.output_dir).mkdir(exist_ok=True)

        # 创建新的HTML文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        html_file = os.path.join(self.output_dir, f"conversation_{timestamp}.html")

        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        return html_file

    def _escape_html(self, text: str) -> str:
        """转义 HTML 特殊字符"""
        return html.escape(text)

    def _format_json_for_html(self, json_data) -> str:
        """将 JSON 数据格式化为带颜色的 HTML"""
        if isinstance(json_data, str):
            return f'<span class="json-string">"{self._escape_html(json_data)}"</span>'
        elif isinstance(json_data, bool):
            return f'<span class="json-boolean">{str(json_data).lower()}</span>'
        elif isinstance(json_data, (int, float)):
            return f'<span class="json-number">{json_data}</span>'
        elif json_data is None:
            return '<span class="json-null">null</span>'
        elif isinstance(json_data, dict):
            items = []
            for key, value in json_data.items():
                items.append(
                    f'<span class="json-key">"{self._escape_html(key)}"</span>: {self._format_json_for_html(value)}')
            return '{' + ', '.join(items) + '}'
        elif isinstance(json_data, list):
            items = [self._format_json_for_html(item) for item in json_data]
            return '[' + ', '.join(items) + ']'
        return str(json_data)

    def _append_to_html(self, role: str, content: any) -> None:
        """将新的对话内容追加到 HTML 文件中"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        message_html = f"""
            <div class="message {role}">
                <div class="timestamp">{timestamp}</div>
        """

        if role == "user":
            # 用户消息直接展示
            message_html += f"<pre>{self._escape_html(content)}</pre>"
        else:
            # AI 响应消息
            if isinstance(content, dict):
                # 展示主要响应文本
                message_html += f"<div>{self._escape_html(content['response'])}</div>"

                # 如果有工具调用，单独展示
                if content.get('tool_calls'):
                    message_html += """
                        <div class="tool-calls">
                            <div class="tool-calls-title">工具调用:</div>
                            <pre>{}</pre>
                        </div>
                    """.format(self._format_json_for_html(content['tool_calls']))
            else:
                message_html += f"<div>{self._escape_html(content)}</div>"

        message_html += "</div>"

        with open(self.html_file, "a", encoding="utf-8") as f:
            f.write(message_html)

    def _close_html_file(self) -> None:
        """关闭 HTML 文件"""
        with open(self.html_file, "a", encoding="utf-8") as f:
            f.write("""
            </div>
        </body>
        </html>
        """)

    def on_llm_start(self, serialized, prompts, **kwargs) -> None:
        """当 LLM 开始处理时调用"""
        user_message = prompts[0]
        self._append_to_html("user", user_message)

    def on_llm_end(self, response, **kwargs) -> None:
        """当 LLM 结束处理时调用"""
        assistant_message = {
            "response": response.generations[0][0].text,
            "tool_calls": self._format_tool_calls(
                response.generations[0][0].message.additional_kwargs.get('tool_calls', []))
        }
        self._append_to_html("assistant", assistant_message)

    def on_chain_end(self, outputs, **kwargs) -> None:
        """当链式处理结束时调用"""
        self._close_html_file()
        if self.auto_open:
            webbrowser.open(f"file://{os.path.abspath(self.html_file)}")

    def _format_tool_calls(self, tool_calls: list) -> list:
        """格式化工具调用信息"""
        result = []
        for tool_call in tool_calls:
            result.append({
                'function_name': tool_call['function']['name'],
                'function_args': json.loads(tool_call['function']['arguments'])
            })
        return result

    def get_callback(self) -> 'HtmlExporter':
        """获取回调实例"""
        return self
