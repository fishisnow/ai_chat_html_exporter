import json
from typing import Any, Optional
from uuid import UUID

from langchain_core.callbacks import StdOutCallbackHandler
from langchain_core.messages import BaseMessage

from .html_generator import HtmlGenerator


def _convert_message_role(type: str):
    if str(type).lower() == 'human':
        return 'user'
    elif str(type).lower() == 'ai':
        return 'assistant'
    return type


class HtmlExportCallbackHandler(StdOutCallbackHandler, HtmlGenerator):
    """将 AI 对话历史导出为 HTML 文件的回调处理器"""

    def __init__(
            self,
            output_dir: str = "logs",
    ):
        """初始化导出器

        Args:
            output_dir: 输出目录，默认为 "logs"
        """
        StdOutCallbackHandler.__init__(self)
        HtmlGenerator.__init__(self, output_dir=output_dir)
        self.html_file = None
        self.previous_messages_count = 0
        self.is_first_conversation = True
        self.step = 0
        self.html_file = self.create_html_file()

    def on_chat_model_start(
            self,
            serialized: dict[str, Any],
            messages: list[list[BaseMessage]],
            *,
            run_id: UUID,
            parent_run_id: Optional[UUID] = None,
            tags: Optional[list[str]] = None,
            metadata: Optional[dict[str, Any]] = None,
            **kwargs: Any,
    ) -> Any:
        """当聊天模型开始处理时调用"""
        current_messages = messages[0]
        # 根据消息数量判断是否是新的对话
        is_new_conversation = self._is_new_conversation(current_messages)

        # 如果是新的对话但不是第一次对话，添加分隔线
        if is_new_conversation and not self.is_first_conversation:
            self.step = self.step + 1
            self.append_divider(f"————————————Step {self.step}————————————")

        if is_new_conversation:
            self.previous_messages_count = len(current_messages)
            self.is_first_conversation = False
            for message in current_messages:
                self.append_message(_convert_message_role(message.type), message.content)
        else:
            last_message = current_messages[-1]
            self.append_message(_convert_message_role(last_message.type), last_message.content)
            self.previous_messages_count = self.previous_messages_count + 1

    def _is_new_conversation(self, messages: list[BaseMessage]) -> bool:
        """检查是否是新的对话轮次
        
        如果消息数量少于之前记录的数量，或者
        消息数量为1且是用户消息，则判断为新对话
        """
        # 如果当前消息数量少于之前记录的数量，可能是新会话
        if len(messages) != self.previous_messages_count + 1:
            return True

        # 如果只有一条用户消息，可能是新会话开始
        if self.previous_messages_count == 0:
            return True

        return False

    def on_llm_end(self, response: Any, **kwargs: Any) -> None:
        """当 LLM 结束处理时调用"""
        assistant_message = {
            "response": response.generations[0][0].text,
            "tool_calls": self._format_tool_calls(
                response.generations[0][0].message.additional_kwargs.get('tool_calls', []))
        }
        self.append_message("assistant", assistant_message)
        self.previous_messages_count = self.previous_messages_count + 1

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
