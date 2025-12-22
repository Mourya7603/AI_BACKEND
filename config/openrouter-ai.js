// config/openrouter-ai.js - FIXED VERSION
import { OpenRouter } from '@openrouter/sdk';

class OpenRouterAI {
  constructor() {
    try {
      console.log('🔍 OpenRouter Constructor - Starting initialization...');
      
      // Check if API key exists
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
      }

      // Validate API key format
      const apiKey = process.env.OPENROUTER_API_KEY.trim();
      if (!apiKey.startsWith('sk-or-')) {
        throw new Error('OPENROUTER_API_KEY format is invalid. Should start with "sk-or-"');
      }

      console.log('🚀 Initializing OpenRouter with API key...');
      
      const config = {
        apiKey: apiKey,
      };

      // Add optional headers if they exist
      if (process.env.OPENROUTER_SITE_URL || process.env.OPENROUTER_SITE_NAME) {
        config.defaultHeaders = {};
        
        if (process.env.OPENROUTER_SITE_URL) {
          config.defaultHeaders['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;
        }
        
        if (process.env.OPENROUTER_SITE_NAME) {
          config.defaultHeaders['X-Title'] = process.env.OPENROUTER_SITE_NAME;
        }
      }

      this.openrouter = new OpenRouter(config);
      
      // Available models
      this.availableModels = [
        'openai/gpt-3.5-turbo',
        'openai/gpt-4',
        'openai/gpt-4o', 
        'anthropic/claude-3-haiku',
        'anthropic/claude-3-sonnet',
        'google/gemini-pro'
      ];
      
      this.defaultModel = 'openai/gpt-3.5-turbo';
      
      console.log('✅ OpenRouter initialized successfully');
      console.log(`🔧 Default model: ${this.defaultModel}`);
      
    } catch (error) {
      console.error('❌ OpenRouter initialization failed:', error.message);
      throw error;
    }
  }

  async generateContent(prompt, options = {}) {
    try {
      console.log('🤖 OpenRouter: Generating content...');
      
      const { 
        jsonMode = false, 
        temperature = 0.7,
        model = this.defaultModel 
      } = options;
      
      let enhancedPrompt = prompt;
      if (jsonMode) {
        enhancedPrompt = `${prompt}\n\nPlease respond with valid JSON only. Do not include any markdown formatting or additional text.`;
      }

      console.log(`📤 Sending to ${model}...`);
      
      const completion = await this.openrouter.chat.send({
        model: model,
        messages: [{ role: "user", content: enhancedPrompt }],
        temperature: temperature,
        max_tokens: 2000,
        stream: false,
      });

      let text = completion.choices[0].message.content;
      
      console.log('📥 Response received, length:', text.length);
      
      text = this.cleanResponse(text, jsonMode);
      
      console.log('✅ OpenRouter: Success');
      return text;
      
    } catch (error) {
      console.error('❌ OpenRouter Error:', error.message);
      throw new Error(`OpenRouter: ${error.message}`);
    }
  }

  cleanResponse(text, jsonMode) {
    let cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    
    if (jsonMode) {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];
      
      try {
        JSON.parse(cleaned);
      } catch (error) {
        console.warn('⚠️ JSON cleanup needed');
        cleaned = cleaned.replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
      }
    }
    
    return cleaned;
  }

  async healthCheck() {
    try {
      const response = await this.generateContent("Say just 'OK' if working.", { max_tokens: 5 });
      return response.includes('OK');
    } catch (error) {
      console.error('Health check failed:', error.message);
      return false;
    }
  }

  getAvailableModels() {
    return this.availableModels;
  }
}

// SIMPLIFIED INITIALIZATION - Remove the complex try/catch
let openrouterInstance = null;

if (process.env.OPENROUTER_API_KEY) {
  try {
    console.log('🎯 Initializing OpenRouter AI...');
    openrouterInstance = new OpenRouterAI();
    console.log('🚀 OpenRouter AI Ready!');
  } catch (error) {
    console.error('❌ Failed to initialize OpenRouter:', error.message);
    openrouterInstance = null;
  }
} else {
  console.log('⚠️ OpenRouter: No API key found in environment');
}

export const openrouterAI = openrouterInstance;