from setuptools import setup, find_packages

setup(
    name="ai_chat_html_exporter",
    version="1.0.3.post1",
    packages=find_packages(),
    install_requires=[
        "langchain-core>=0.3.0",
        "python-dotenv>=1.0.0",
        "openai>=1.6.1",
    ],
    author="fishisnow",
    author_email="fishisnow2021@gmail.com",
    description="A tool to export AI chat history to HTML with syntax highlighting",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/fishisnow/ai-chat-html-exporter",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.12",
)