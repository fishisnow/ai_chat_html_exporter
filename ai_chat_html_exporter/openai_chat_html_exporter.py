import logging
from datetime import datetime
import json
from .html_generator import HtmlGenerator

import httpx
from openai import AsyncOpenAI, OpenAI, AsyncAzureOpenAI, AzureOpenAI


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
        self._previous_messages_count = 0  # 记录上一次对话的消息数量
        self._is_first_conversation = True  # 是否是第一次对话
        self._step = 0  # 记录对话步骤

    def _process_request(self, request_content, response_body):
        """处理请求和响应内容"""
        try:
            # 解析请求体
            request_body = json.loads(request_content.decode('utf-8'))
            messages = request_body.get("messages", [])
            tools = request_body.get("tools", [])

            # 判断是否是新对话
            is_new_conversation = self._is_new_conversation(messages)

            # 如果是新的对话但不是第一次对话，添加分隔线
            if is_new_conversation and not self._is_first_conversation:
                self._step += 1
                self.append_divider(f"———Step {self._step}———")
                self._processed_message_count = 0  # 重置消息计数器

            if is_new_conversation:
                self._previous_messages_count = len(messages)
                self._is_first_conversation = False
            else:
                # 更新最近一次消息数量
                self._previous_messages_count = max(self._previous_messages_count, len(messages))

            # 添加未处理的新消息
            for i in range(self._processed_message_count, len(messages)):
                message = messages[i]
                role = message["role"]
                content = message["content"]

                # 如果是最后一条用户消息并且存在tools字段，添加tools信息
                if role == "user" and i == len(messages) - 1 and tools:
                    # 创建包含tools字段的消息内容
                    enhanced_content = {
                        "text": content,
                        "tools": tools
                    }
                    self.append_message(role, enhanced_content)
                else:
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

    def _is_new_conversation(self, messages: list) -> bool:
        if self._previous_messages_count == 0:
            return True

        # 如果消息数量不符合递增规律，可能是新会话
        if len(messages) < self._previous_messages_count + 1:
            return True

        return False

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
            # 检查是否为 SSE 流式响应, azure 是流式的
            if "text/event-stream" in response.headers.get("content-type", ""):
                response_content = await response.aread()
                # 处理 SSE 流式响应
                message_content, tool_calls = self._process_sse_response(response_content)

                # 构造与标准 OpenAI 响应格式相匹配的结构
                standard_response = {
                    "choices": [{
                        "message": {
                            "content": message_content,
                            "tool_calls": tool_calls
                        }
                    }]
                }

                self._process_request(request.content, standard_response)
            else:
                response_body = json.loads(await response.aread())
                self._process_request(request.content, response_body)

        return response

    def _process_sse_response(self, response_content: bytes) -> tuple:
        """处理 SSE 格式的流式响应，提取 assistant 的内容和工具调用
        
        Args:
            response_content: SSE 格式的原始响应内容
            
        Returns:
            提取并合并后的消息内容以及工具调用列表的元组
        """
        try:
            # 解码为文本
            response_text = response_content.decode('utf-8')
            # 按 SSE 的数据块分割
            chunks = response_text.split("data: ")
            full_content = ""
            all_tool_calls = []
            current_tool_calls = {}  # 用于收集同一工具调用的不同部分

            for chunk in chunks:
                if not chunk.strip() or chunk.strip() == "[DONE]":
                    continue

                try:
                    # 解析 JSON 数据块
                    data = json.loads(chunk.strip())
                    # 提取内容
                    if "choices" in data and len(data["choices"]) > 0:
                        choice = data["choices"][0]
                        delta = choice.get("delta", {})

                        # 处理文本内容
                        if "content" in delta and delta["content"] is not None:
                            full_content += delta["content"]

                        # 处理工具调用
                        if "tool_calls" in delta and delta["tool_calls"]:
                            for tool_call in delta["tool_calls"]:
                                tool_index = tool_call.get("index", 0)

                                # 如果是新的工具调用索引，初始化结构
                                if tool_index not in current_tool_calls:
                                    current_tool_calls[tool_index] = {
                                        "id": tool_call.get("id", ""),
                                        "type": tool_call.get("type", "function"),
                                        "function": {
                                            "name": "",
                                            "arguments": ""
                                        }
                                    }

                                # 更新工具调用信息
                                if "function" in tool_call:
                                    function = tool_call["function"]
                                    if "name" in function:
                                        current_tool_calls[tool_index]["function"]["name"] += function["name"]
                                    if "arguments" in function:
                                        current_tool_calls[tool_index]["function"]["arguments"] += function["arguments"]

                        # 检查是否完成
                        if choice.get("finish_reason") is not None:
                            # 收集所有完成的工具调用
                            for tool_call in current_tool_calls.values():
                                if tool_call["function"]["name"]:  # 仅添加有名称的工具调用
                                    all_tool_calls.append(tool_call)
                except json.JSONDecodeError:
                    logging.warning(f"can not parse SSE chunk: {chunk}")
                    continue

            # 转换工具调用格式
            formatted_tool_calls = []
            for tool_call in all_tool_calls:
                try:
                    # 确保参数是有效的 JSON 字符串
                    args_str = tool_call["function"]["arguments"]
                    formatted_tool_calls.append({
                        "function": {
                            "name": tool_call["function"]["name"],
                            "arguments": args_str
                        }
                    })
                except json.JSONDecodeError:
                    logging.warning(f"can not format tool_call: {tool_call}")
                    formatted_tool_calls.append({
                        "function": {
                            "name": tool_call["function"]["name"],
                            "arguments": "{}"  # 使用空对象作为默认值
                        }
                    })

            return full_content, formatted_tool_calls
        except Exception as e:
            print(f"处理 Azure OpenAI 流式响应时出错: {e}")
            return "", []


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
            if "text/event-stream" in response.headers.get("content-type", ""):
                response_content = response.aread()
                # 处理 SSE 流式响应
                message_content, tool_calls = self._process_sse_response(response_content)

                # 构造与标准 OpenAI 响应格式相匹配的结构
                standard_response = {
                    "choices": [{
                        "message": {
                            "content": message_content,
                            "tool_calls": tool_calls
                        }
                    }]
                }

                self._process_request(request.content, standard_response)
            else:
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

    def patch_client(self,
                     client: AsyncOpenAI | OpenAI) -> AsyncOpenAI | OpenAI:
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
