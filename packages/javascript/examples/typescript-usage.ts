import OpenAI from 'openai';
import { createChatExporterOpenAI, OpenaiChatHtmlExporter } from '../src/index.js';

// 类型安全的配置
interface ChatConfig {
  apiKey: string;
  model: string;
  temperature: number;
}

const config: ChatConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-3.5-turbo',
  temperature: 0.7
};

// 创建带有导出功能的 OpenAI 客户端
const openai = createChatExporterOpenAI(OpenAI, {
  apiKey: config.apiKey,
}, {
  outputDir: 'typescript-logs',
  enableFileOutput: true,
  customStyles: `
    .message { 
      border-radius: 15px; 
      margin: 15px 0;
    }
    .user { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .assistant { 
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }
  `
});

async function typeScriptExample(): Promise<void> {
  try {
    console.log('🚀 TypeScript 示例开始...');
    
    // 基本对话
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { 
          role: 'system', 
          content: '你是一个专业的 TypeScript 开发助手。' 
        },
        { 
          role: 'user', 
          content: '请解释 TypeScript 中的泛型，并给一个实用的例子。' 
        },
      ],
      temperature: config.temperature,
    });

    console.log('✅ AI 回复已生成');
    console.log('📄 回复内容:', response.choices[0].message.content?.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

async function advancedExample(): Promise<void> {
  try {
    console.log('\n🔧 高级示例：函数调用...');
    
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { 
          role: 'user', 
          content: '帮我创建一个 TypeScript 项目的基本配置文件。' 
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'create_config_file',
            description: '创建配置文件',
            parameters: {
              type: 'object',
              properties: {
                filename: { 
                  type: 'string', 
                  description: '文件名' 
                },
                content: { 
                  type: 'string', 
                  description: '文件内容' 
                },
                type: {
                  type: 'string',
                  enum: ['tsconfig', 'package', 'eslint'],
                  description: '配置文件类型'
                }
              },
              required: ['filename', 'content', 'type']
            }
          }
        }
      ],
      temperature: 0.3,
    });

    console.log('✅ 函数调用示例完成');
    
    if (response.choices[0].message.tool_calls) {
      console.log('🔧 检测到工具调用:', response.choices[0].message.tool_calls.length, '个');
    }
    
  } catch (error) {
    console.error('❌ 高级示例错误:', error);
  }
}

async function directExporterExample(): Promise<void> {
  try {
    console.log('\n📝 直接使用导出器示例...');
    
    // 直接使用导出器类
    const exporter = new OpenaiChatHtmlExporter({
      outputDir: 'direct-export',
      enableFileOutput: true,
      customStyles: `
        .user { background: #2196f3; color: white; }
        .assistant { background: #4caf50; color: white; }
        .system { background: #ff9800; color: white; }
      `
    });

    // 模拟对话数据
    const messages = [
      { role: 'user', content: '你好，我想学习 TypeScript。' },
      { role: 'assistant', content: 'TypeScript 是 JavaScript 的超集，添加了静态类型检查...' },
      { role: 'user', content: '能给我一些学习建议吗？' }
    ];

    // 处理消息
    exporter.processUserMessages(messages);
    
    // 模拟 AI 响应
    const mockResponse = {
      choices: [{
        message: {
          content: '当然！以下是一些 TypeScript 学习建议：\n\n1. 从基础语法开始\n2. 理解类型系统\n3. 学习泛型和接口\n4. 实践项目开发',
          tool_calls: []
        }
      }]
    };
    
    exporter.processAIResponse(mockResponse);
    
    console.log('✅ 直接导出器示例完成');
    
  } catch (error) {
    console.error('❌ 直接导出器错误:', error);
  }
}

// 主函数
async function main(): Promise<void> {
  if (!config.apiKey) {
    console.error('❌ 请设置 OPENAI_API_KEY 环境变量');
    process.exit(1);
  }

  try {
    await typeScriptExample();
    await advancedExample();
    await directExporterExample();
    
    console.log('\n🎉 所有示例执行完成！');
    console.log('📁 生成的 HTML 文件保存在 typescript-logs/ 和 direct-export/ 目录中');
    
  } catch (error) {
    console.error('❌ 主程序错误:', error);
  }
}

// 运行示例
main().catch(console.error); 