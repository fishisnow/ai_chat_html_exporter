import json
import os
import asyncio
from datetime import datetime
import html
import re
import webbrowser
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
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

                # 记录用户消息
                if messages and messages[-1]["role"] == "user":
                    self.conversation.append({"role": "user", "content": messages[-1]["content"]})

                # 解析响应体
                response_body = json.loads(await response.aread())

                # 记录助手回复
                if response_body.get("choices") and len(response_body["choices"]) > 0:
                    choice = response_body["choices"][0]
                    message = choice.get("message", {})

                    assistant_message = {
                        "role": "assistant",
                        "content": message.get("content", ""),
                        "tool_calls": message.get("tool_calls", [])
                    }

                    self.conversation.append(assistant_message)

                    # 导出对话为HTML
                    self._export_to_html()
            except Exception as e:
                print(f"日志记录器出错: {e}")

        return response


    def _export_to_html(self) -> None:
        """导出对话历史到 HTML 文件"""
        if not self.html_file:
            self.html_file = self.create_html_file()

        # 先清空文件内容
        with open(self.html_file, "w", encoding="utf-8") as f:
            f.write("")

        # 重新创建基本框架
        self.html_file = self.create_html_file()

        # 添加所有对话内容
        for message in self.conversation:
            self.append_message(message["role"], message["content"])

        # 关闭文件
        self.close_html_file()


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