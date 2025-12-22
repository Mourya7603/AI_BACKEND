// config/openrouter-simple.js - UPDATED
import { OpenRouter } from '@openrouter/sdk';

console.log('🔧 Loading OpenRouter configuration module...');

// Don't initialize immediately - export a function to initialize later
let openrouterInstance = null;

export const initializeOpenRouter = () => {
  if (openrouterInstance) return openrouterInstance;
  
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('❌ OPENROUTER_API_KEY not found in environment');
      return null;
    }

    console.log('🎯 Initializing OpenRouter...');
    
    openrouterInstance = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5000',
        'X-Title': process.env.OPENROUTER_SITE_NAME || 'AI Interview Coach',
      },
    });
    
    console.log('✅ OpenRouter instance created successfully!');
    return openrouterInstance;
  } catch (error) {
    console.error('❌ Failed to create OpenRouter instance:', error.message);
    return null;
  }
};

// Simple wrapper functions
export const generateContent = async (prompt, options = {}) => {
  if (!openrouterInstance) {
    throw new Error('OpenRouter not initialized - call initializeOpenRouter() first');
  }

  const { jsonMode = false, model = 'openai/gpt-3.5-turbo', temperature = 0.7 } = options;
  
  let enhancedPrompt = prompt;
  if (jsonMode) {
    enhancedPrompt = `${prompt}\n\nPlease respond with valid JSON only.`;
  }

  try {
    console.log(`🤖 Generating with ${model}...`);
    const completion = await openrouterInstance.chat.send({
      model: model,
      messages: [{ role: "user", content: enhancedPrompt }],
      temperature: temperature,
      max_tokens: 2000,
      stream: false,
    });

    let text = completion.choices[0].message.content;
    
    // Clean response
    if (jsonMode) {
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];
    }
    
    console.log('✅ OpenRouter response generated');
    return text;
  } catch (error) {
    throw new Error(`OpenRouter: ${error.message}`);
  }
};

export const healthCheck = async () => {
  if (!openrouterInstance) return false;
  
  try {
    const response = await generateContent("Say just 'OK'", { max_tokens: 5 });
    return response.includes('OK');
  } catch (error) {
    return false;
  }
};

export const getAvailableModels = () => {
  return [
    'openai/gpt-3.5-turbo',
    'openai/gpt-4',
    'openai/gpt-4o', 
    'anthropic/claude-3-haiku',
    'anthropic/claude-3-sonnet',
    'google/gemini-pro'
  ];
};

export const isInitialized = () => !!openrouterInstance;