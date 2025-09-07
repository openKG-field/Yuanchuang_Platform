import axios from 'axios';

// 使用 Vite 代理的 OpenAI 兼容接口（已在 vite.config.ts 配置 /api/ai -> openai.qiniu.com/v1/chat/completions）
const API_URL = '/api/ai';
const API_KEY = import.meta.env.VITE_API_KEY;

export const getAIResponse = async (message: string) => {
  try {
    const response = await axios.post(
      API_URL,
      {
        model: 'deepseek-r1',
        messages: [
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
      }
    );
    const content = response.data?.choices?.[0]?.message?.content?.trim();
    return content || 'AI 暂无回答。';
  } catch (error) {
    console.error('Error fetching AI response:', error);
    return '对不起，我无法处理你的请求。';
  }
};