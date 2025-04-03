import json
from typing import Any, List

from langchain.callbacks import StdOutCallbackHandler

from .html_generator import HtmlGenerator


class HtmlExportCallbackHandler(StdOutCallbackHandler, HtmlGenerator):
    """将 AI 对话历史导出为 HTML 文件的回调处理器"""

    def __init__(
            self,
            output_dir: str = "logs",
    ):
        """初始化导出器

        Args:
            output_dir: 输出目录，默认为 "logs"
            auto_open: 是否自动在浏览器中打开生成的 HTML 文件
        """
        StdOutCallbackHandler.__init__(self)
        HtmlGenerator.__init__(self, output_dir=output_dir)
        self.html_file = self.create_html_file()

    def on_llm_start(self, serialized: Any, prompts: List[str], **kwargs: Any) -> None:
        """当 LLM 开始处理时调用"""
        user_message = prompts[0]
        self.append_message("user", user_message)

    def on_llm_end(self, response: Any, **kwargs: Any) -> None:
        """当 LLM 结束处理时调用"""
        assistant_message = {
            "response": response.generations[0][0].text,
            "tool_calls": self._format_tool_calls(
                response.generations[0][0].message.additional_kwargs.get('tool_calls', []))
        }
        self.append_message("assistant", assistant_message)

    def on_chain_end(self, outputs: Any, **kwargs: Any) -> None:
        """当链式处理结束时调用"""
        self.close_html_file()

    def _format_tool_calls(self, tool_calls: list) -> list:
        """格式化工具调用信息"""
        result = []
        for tool_call in tool_calls:
            result.append({
                'function_name': tool_call['function']['name'],
                'function_args': json.loads(tool_call['function']['arguments'])
            })
        return result

    def get_callback(self) -> 'HtmlExportCallbackHandler':
        """获取回调实例"""
        return self
