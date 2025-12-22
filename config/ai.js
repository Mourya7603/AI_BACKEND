// config/ai.js - UPDATED
import { 
  generateContent, 
  healthCheck, 
  getAvailableModels, 
  isInitialized,
  initializeOpenRouter 
} from './openrouter-simple.js';

// Enhanced mock data
class EnhancedMock {
  async generateQuestions(profile) {
    console.log('🔧 Using enhanced mock questions');
    
    return {
      questions: [
        {
          id: "1",
          question: `What are the main advantages of using ${profile.technical_keywords[0] || 'React'} for ${profile.job_role}?`,
          hint: "Consider component reusability, ecosystem, performance, and developer experience",
          time_limit_minutes: 4,
          difficulty: profile.years_experience > 3 ? "medium" : "easy",
          category: profile.interview_round || "technical",
          expected_keywords: ["components", "reusability", "ecosystem", "performance", ...profile.technical_keywords.slice(0, 3)]
        }
      ],
      feedback_rubric: {
        excellent: "Comprehensive answer with practical examples and clear explanations",
        good: "Covers main concepts adequately but lacks depth",
        needs_improvement: "Missing key concepts or contains significant gaps"
      }
    };
  }

  async generateResponse(prompt, jsonMode = false) {
    console.log('🔧 Enhanced Mock: Generating response');
    
    if (jsonMode && prompt.includes('interview')) {
      const profile = this.extractProfileFromPrompt(prompt);
      const questions = await this.generateQuestions(profile);
      return JSON.stringify(questions);
    }
    
    return "Enhanced mock response";
  }

  extractProfileFromPrompt(prompt) {
    // Your existing extraction logic
    return {
      job_role: 'Frontend Developer',
      years_experience: 2,
      technical_keywords: ['React', 'JavaScript'],
      interview_round: 'technical',
      company_type: 'startup'
    };
  }
}

const enhancedMock = new EnhancedMock();

// Initialize OpenRouter on first use
let initializationAttempted = false;

const ensureOpenRouterInitialized = () => {
  if (!initializationAttempted && process.env.OPENROUTER_API_KEY) {
    console.log('🚀 Attempting to initialize OpenRouter...');
    initializeOpenRouter();
    initializationAttempted = true;
  }
  return isInitialized();
};

// Main AI caller function
export const callAI = async (prompt, options = {}) => {
  const { jsonMode = false, model } = options;

  console.log('\n🎯 AI Provider: Processing request...');
  
  // Try to initialize OpenRouter if not already done
  const openRouterReady = ensureOpenRouterInitialized();
  console.log('🔑 OpenRouter Initialized:', openRouterReady);

  if (openRouterReady) {
    try {
      console.log('🚀 Using OpenRouter...');
      const result = await generateContent(prompt, options);
      console.log('✅ OpenRouter request successful');
      return result;
    } catch (error) {
      console.error('❌ OpenRouter request failed:', error.message);
      console.log('🔧 Falling back to enhanced mock data');
      return await enhancedMock.generateResponse(prompt, jsonMode);
    }
  } else {
    console.log('🔧 OpenRouter not available, using enhanced mock data');
    return await enhancedMock.generateResponse(prompt, jsonMode);
  }
};

// Export for debug endpoints
export { healthCheck, getAvailableModels, isInitialized, ensureOpenRouterInitialized };