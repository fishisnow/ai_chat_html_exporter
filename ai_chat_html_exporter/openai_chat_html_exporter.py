from datetime import datetime
import json
from .html_generator import HtmlGenerator

import httpx
from openai import AsyncOpenAI


class ChatLoggerTransport(httpx.AsyncBaseTransport, HtmlGenerator):
    """拦截 OpenAI API 请求和响应的传输层"""

    def __init__(
            self,
            wrapped_transport: httpx.AsyncBaseTransport,
            output_dir: str = "logs",
    ):
        """初始化日志拦截器

        Args:
            wrapped_transport: 被包装的原始传输层
            output_dir: 日志输出目录
            auto_open: 是否自动打开生成的HTML文件
        """
        HtmlGenerator.__init__(self, output_dir=output_dir)
        self.wrapped_transport = wrapped_transport
        self.html_file = self.create_html_file()
        self._processed_message_count = 0

    async def handle_async_request(self, request):
        """处理异步请求，拦截 chat/completions 请求"""

        # 获取原始响应
        response = await self.wrapped_transport.handle_async_request(request)

        # 只处理 chat completions 相关的请求
        if "/chat/completions" in request.url.path:
            try:
                # 解析请求体
                request_body = json.loads(request.content.decode('utf-8'))
                messages = request_body.get("messages", [])
                
                # 添加未处理的新消息
                for i in range(self._processed_message_count, len(messages)):
                    message = messages[i]
                    role = message["role"]
                    content = message["content"]
                    self.append_message(role, content)
                    # 更新计数器
                    self._processed_message_count += 1

                # 解析响应体
                response_body = json.loads(await response.aread())
                
                # 记录助手回复
                if response_body.get("choices") and len(response_body["choices"]) > 0:
                    choice = response_body["choices"][0]
                    message = choice.get("message", {})
                    
                    assistant_message = {
                        "response": message.get("content", ""),
                        "tool_calls": self._format_tool_calls(message.get("tool_calls", [])),
                    }

                    self.append_message("assistant", assistant_message)
                    # 更新计数器
                    self._processed_message_count += 1

                    self.close_html_file()
            except Exception as e:
                print(f"日志记录器出错: {e}")

        return response

    def _format_tool_calls(self, tool_calls: list) -> list:
        """格式化工具调用信息"""
        result = []
        for tool_call in tool_calls:
            result.append({
                'function_name': tool_call['function']['name'],
                'function_args': json.loads(tool_call['function']['arguments'])
            })
        return result
    

# 创建一个装饰器函数
def with_html_logger(func):
    import functools
    import inspect
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if inspect.iscoroutinefunction(func):
            async def async_wrapper():
                client = await func(*args, **kwargs)
                return OpenAIChatLogger(output_dir="logs").patch_client(client)

            return async_wrapper()
        else:
            client = func(*args, **kwargs)
            return OpenAIChatLogger(output_dir="logs").patch_client(client)

    return wrapper


class OpenAIChatLogger:
    """OpenAI 聊天日志记录器"""

    def __init__(self, output_dir: str = "logs", auto_open: bool = True):
        """初始化日志记录器

        Args:
            output_dir: 日志输出目录
            auto_open: 是否自动打开生成的HTML文件
        """
        self.output_dir = output_dir
        self.auto_open = auto_open

    def create_client(self, **kwargs) -> AsyncOpenAI:
        """创建带有日志记录功能的 OpenAI 客户端

        Args:
            **kwargs: 传递给 AsyncOpenAI 的参数

        Returns:
            配置了日志记录的 AsyncOpenAI 客户端
        """
        client = AsyncOpenAI(**kwargs)

        original_transport = client._client._transport

        logger_transport = ChatLoggerTransport(
            original_transport,
            output_dir=self.output_dir,
        )

        client._client._transport = logger_transport

        return client

    def patch_client(self, client: AsyncOpenAI) -> AsyncOpenAI:
        """为现有的 OpenAI 客户端添加日志记录功能

        Args:
            client: 现有的 OpenAI 客户端

        Returns:
            配置了日志记录的 OpenAI 客户端
        """
        # 获取原始传输层
        original_transport = client._client._transport

        # 创建日志传输层
        logger_transport = ChatLoggerTransport(
            original_transport,
            output_dir=self.output_dir,
        )

        # 替换传输层
        client._client._transport = logger_transport
        return client
