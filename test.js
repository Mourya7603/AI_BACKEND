// test-openrouter-simple.js
import dotenv from 'dotenv';
import { OpenRouter } from '@openrouter/sdk';

// Load environment
dotenv.config();

console.log('🧪 Simple OpenRouter Test\n');
console.log('API Key:', process.env.OPENROUTER_API_KEY ? '✅ Found' : '❌ Missing');

async function testOpenRouter() {
  try {
    const openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    console.log('🚀 Testing API call...');
    
    const completion = await openrouter.chat.send({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Say just "SUCCESS" if working.',
        },
      ],
      max_tokens: 10,
      stream: false,
    });

    console.log('✅ SUCCESS! Response:', completion.choices[0].message.content);
    return true;
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    return false;
  }
}

testOpenRouter();