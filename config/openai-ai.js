// config/openrouter-ai.js
import { OpenRouter } from '@openrouter/sdk';

class OpenRouterAI {
  constructor() {
    try {
      console.log('🔍 OpenRouter Constructor - Checking API key...');
      
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
      }
      
      console.log('🚀 Initializing OpenRouter...');
      this.openrouter = new OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5000',
          'X-Title': process.env.OPENROUTER_SITE_NAME || 'AI Interview Coach',
        },
      });
      
      // Available models on OpenRouter
      this.availableModels = [
        'openai/gpt-4',
        'openai/gpt-4o',
        'openai/gpt-3.5-turbo',
        'anthropic/claude-3-opus',
        'anthropic/claude-3-sonnet',
        'anthropic/claude-3-haiku',
        'google/gemini-pro',
        'meta-llama/llama-3-70b-instruct',
        'mistralai/mistral-7b-instruct'
      ];
      
      // Default model - using GPT-4o for best performance
      this.defaultModel = 'openai/gpt-4o';
      
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
        enhancedPrompt = `${prompt}\n\nPlease respond with valid JSON only. Do not include any markdown formatting, code blocks, or additional text outside the JSON. The JSON must be parseable.`;
      }

      console.log('📤 Sending prompt to OpenRouter...');
      console.log(`🔧 Using model: ${model}`);
      
      const completion = await this.openrouter.chat.send({
        model: model,
        messages: [
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: temperature,
        max_tokens: 4000,
        stream: false,
      });

      let text = completion.choices[0].message.content;
      
      console.log('📥 Raw OpenRouter response received, length:', text.length);
      console.log('🔍 Model used:', completion.model);
      console.log('💰 Tokens used:', completion.usage?.total_tokens || 'unknown');
      
      text = this.cleanResponse(text, jsonMode);
      
      console.log('✅ OpenRouter: Response generated successfully');
      return text;
      
    } catch (error) {
      console.error('❌ OpenRouter Generation Error:', error);
      
      // Provide specific error information
      if (error.status === 401) {
        throw new Error(`OpenRouter API key invalid. Please check your OPENROUTER_API_KEY.`);
      } else if (error.status === 429) {
        throw new Error(`OpenRouter rate limit exceeded. Please try again later.`);
      } else if (error.status === 403) {
        throw new Error(`OpenRouter access forbidden. Check your API permissions.`);
      } else {
        throw new Error(`OpenRouter failed: ${error.message}`);
      }
    }
  }

  cleanResponse(text, jsonMode) {
    // Remove markdown code blocks
    let cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    cleaned = cleaned.replace(/```/g, '');
    
    if (jsonMode) {
      // Try to extract JSON if response contains extra text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
      
      // Validate JSON
      try {
        JSON.parse(cleaned);
        console.log('✅ JSON response is valid');
      } catch (parseError) {
        console.warn('⚠️ JSON parsing issue, cleaning response...');
        // Try to fix common JSON issues
        cleaned = cleaned
          .replace(/(\w+):/g, '"$1":') // Add quotes to keys
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/'/g, '"'); // Replace single quotes with double quotes
      }
    }
    
    return cleaned;
  }

  async healthCheck() {
    try {
      const completion = await this.openrouter.chat.send({
        model: 'openai/gpt-3.5-turbo', // Use cheaper model for health check
        messages: [
          {
            role: "user",
            content: "Say just 'OK' if you're working."
          }
        ],
        max_tokens: 5,
        stream: false,
      });
      
      return completion.choices[0].message.content.includes('OK');
    } catch (error) {
      console.error('❌ OpenRouter health check failed:', error.message);
      return false;
    }
  }

  // Get available models
  getAvailableModels() {
    return this.availableModels;
  }
}

// Export with error handling
let openrouterInstance = null;
try {
  console.log('🔧 Starting OpenRouter initialization...');
  openrouterInstance = new OpenRouterAI();
  console.log('🎉 OpenRouter instance created successfully');
} catch (error) {
  console.log('⚠️ OpenRouter not initialized:', error.message);
  console.log('🔧 Application will use enhanced mock data');
  openrouterInstance = null;
}

export const openrouterAI = openrouterInstance;