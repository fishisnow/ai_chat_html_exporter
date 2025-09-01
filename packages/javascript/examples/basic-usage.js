const OpenAI = require('openai');
const { createChatExporterOpenAI } = require('../dist/index.js');

// 创建带有导出功能的 OpenAI 客户端
const openai = createChatExporterOpenAI(OpenAI, {
  apiKey: process.env.OPENAI_API_KEY,
}, {
  outputDir: 'chat-logs',
  enableFileOutput: true,
  customStyles: `
    .user { background: #e3f2fd; }
    .assistant { background: #f3e5f5; }
  `
});

async function basicExample() {
  try {
    console.log('发送消息到 OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: '你好，请介绍一下你自己。' },
      ],
      temperature: 0.7,
    });

    console.log('AI 回复:', response.choices[0].message.content);
    console.log('✅ 对话已自动保存为 HTML 文件');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

async function streamExample() {
  try {
    console.log('\n开始流式对话...');
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: '请写一首关于编程的短诗。' },
      ],
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      process.stdout.write(content);
      fullResponse += content;
    }

    console.log('\n✅ 流式对话已自动保存为 HTML 文件');
    
  } catch (error) {
    console.error('❌ 流式对话错误:', error.message);
  }
}

async function toolCallExample() {
  try {
    console.log('\n开始工具调用示例...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: '现在北京的天气怎么样？' },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: '获取指定城市的天气信息',
            parameters: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: '城市名称'
                },
                unit: {
                  type: 'string',
                  enum: ['celsius', 'fahrenheit'],
                  description: '温度单位'
                }
              },
              required: ['city']
            }
          }
        }
      ]
    });

    console.log('AI 回复:', response.choices[0].message.content);
    
    if (response.choices[0].message.tool_calls) {
      console.log('工具调用:', response.choices[0].message.tool_calls);
    }
    
    console.log('✅ 工具调用对话已自动保存为 HTML 文件');
    
  } catch (error) {
    console.error('❌ 工具调用错误:', error.message);
  }
}

// 运行示例
async function runExamples() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ 请设置 OPENAI_API_KEY 环境变量');
    process.exit(1);
  }

  await basicExample();
  await streamExample();
  await toolCallExample();
}

runExamples().catch(console.error); 