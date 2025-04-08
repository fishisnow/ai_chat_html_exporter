from datetime import datetime
import json
from .html_generator import HtmlGenerator

import httpx
from openai import AsyncOpenAI, OpenAI


class LoggerTransport(HtmlGenerator):
    """OpenAI API 请求和响应的基础传输层"""

    def __init__(
            self,
            wrapped_transport,
            output_dir: str = "logs",
    ):
        """初始化日志拦截器

        Args:
            wrapped_transport: 被包装的原始传输层
            output_dir: 日志输出目录
        """
        HtmlGenerator.__init__(self, output_dir=output_dir)
        self.wrapped_transport = wrapped_transport
        self.html_file = self.create_html_file()
        self._processed_message_count = 0

    def _process_request(self, request_content, response_body):
        """处理请求和响应内容"""
        try:
            # 解析请求体
            request_body = json.loads(request_content.decode('utf-8'))
            messages = request_body.get("messages", [])
            
            # 添加未处理的新消息
            for i in range(self._processed_message_count, len(messages)):
                message = messages[i]
                role = message["role"]
                content = message["content"]
                self.append_message(role, content)
                # 更新计数器
                self._processed_message_count += 1

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

    def _format_tool_calls(self, tool_calls: list) -> list:
        """格式化工具调用信息"""
        result = []
        for tool_call in tool_calls:
            result.append({
                'function_name': tool_call['function']['name'],
                'function_args': json.loads(tool_call['function']['arguments'])
            })
        return result


class AsyncChatLoggerTransport(httpx.AsyncBaseTransport, LoggerTransport):
    """异步 OpenAI API 请求和响应的传输层"""

    def __init__(
            self,
            wrapped_transport: httpx.AsyncBaseTransport,
            output_dir: str = "logs",
    ):
        LoggerTransport.__init__(self, wrapped_transport, output_dir)

    async def handle_async_request(self, request):
        """处理异步请求，拦截 chat/completions 请求"""
        # 获取原始响应
        response = await self.wrapped_transport.handle_async_request(request)

        # 只处理 chat completions 相关的请求
        if "/chat/completions" in request.url.path:
            response_body = json.loads(await response.aread())
            self._process_request(request.content, response_body)

        return response


class SyncChatLoggerTransport(httpx.BaseTransport, LoggerTransport):
    """同步 OpenAI API 请求和响应的传输层"""

    def __init__(
            self,
            wrapped_transport: httpx.BaseTransport,
            output_dir: str = "logs",
    ):
        LoggerTransport.__init__(self, wrapped_transport, output_dir)

    def handle_request(self, request):
        """处理同步请求，拦截 chat/completions 请求"""
        # 获取原始响应
        response = self.wrapped_transport.handle_request(request)

        # 只处理 chat completions 相关的请求
        if "/chat/completions" in request.url.path:
            response_body = json.loads(response.read())
            self._process_request(request.content, response_body)

        return response
    

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

    def __init__(self, output_dir: str = "logs"):
        """初始化日志记录器

        Args:
            output_dir: 日志输出目录
            auto_open: 是否自动打开生成的HTML文件
        """
        self.output_dir = output_dir



    def patch_client(self, client: AsyncOpenAI | OpenAI) -> AsyncOpenAI | OpenAI:
        """为现有的 OpenAI 客户端添加日志记录功能

        Args:
            client: 现有的 OpenAI 客户端

        Returns:
            配置了日志记录的 OpenAI 客户端
        """
        # 获取原始传输层
        original_transport = client._client._transport

        if isinstance(client, AsyncOpenAI):
            logger_transport = AsyncChatLoggerTransport(
                original_transport,
                output_dir=self.output_dir,
            )
        elif isinstance(client, OpenAI):
            logger_transport = SyncChatLoggerTransport(
                original_transport,
                output_dir=self.output_dir,
            )
        else:
            raise TypeError(f"不支持的客户端类型: {type(client)}")

        # 替换传输层
        client._client._transport = logger_transport
        return client
