// server.js - UPDATED FOR OPENROUTER
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure dotenv FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 Environment check on startup:');
console.log('- OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('- OPENROUTER_API_KEY length:', process.env.OPENROUTER_API_KEY?.length || 0);
console.log('- NODE_ENV:', process.env.NODE_ENV);

// Now import routes after environment is configured
import interviewRoutes from './routes/interview.js';
import ragRoutes from './routes/rag.js';
import toolsRoutes from './routes/tools.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/interview', interviewRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/tools', toolsRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    openrouter_configured: !!process.env.OPENROUTER_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoints for OpenRouter
app.get('/api/debug/ai-status', async (req, res) => {
  // Import here to ensure environment is loaded
  const { openrouterAI } = await import('./config/openrouter-ai.js');
  
  const status = {
    openrouter_configured: !!process.env.OPENROUTER_API_KEY,
    openrouter_initialized: !!openrouterAI,
    openrouter_api_key_length: process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.length : 0,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  if (openrouterAI) {
    try {
      const health = await openrouterAI.healthCheck();
      status.openrouter_health = health;
      status.available_models = openrouterAI.getAvailableModels();
    } catch (error) {
      status.openrouter_health = false;
      status.openrouter_error = error.message;
    }
  }

  res.json(status);
});

app.get('/api/debug/test-openrouter', async (req, res) => {
  // Import here to ensure environment is loaded
  const { openrouterAI } = await import('./config/openrouter-ai.js');
  
  if (!openrouterAI) {
    return res.status(400).json({
      success: false,
      error: 'OpenRouter not initialized',
      reason: 'Check your OPENROUTER_API_KEY in .env file'
    });
  }

  try {
    const model = req.query.model || 'openai/gpt-4o';
    const testPrompt = "Generate one interview question for a Frontend Developer. Return JSON: {\"question\": \"string\", \"category\": \"technical\"}";
    const response = await openrouterAI.generateContent(testPrompt, { 
      jsonMode: true,
      model: model
    });
    
    res.json({
      success: true,
      response: JSON.parse(response),
      provider: 'OpenRouter',
      model_used: model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      provider: 'OpenRouter'
    });
  }
});

app.get('/api/debug/openrouter-models', async (req, res) => {
  const { openrouterAI } = await import('./config/openrouter-ai.js');
  
  if (!openrouterAI) {
    return res.status(400).json({
      success: false,
      error: 'OpenRouter not initialized'
    });
  }

  res.json({
    available_models: openrouterAI.getAvailableModels(),
    default_model: 'openai/gpt-4o',
    timestamp: new Date().toISOString()
  });
});

// Test multiple models endpoint
app.get('/api/debug/test-all-models', async (req, res) => {
  const { openrouterAI } = await import('./config/openrouter-ai.js');
  
  if (!openrouterAI) {
    return res.status(400).json({
      success: false,
      error: 'OpenRouter not initialized'
    });
  }

  try {
    const testModels = [
      'openai/gpt-3.5-turbo',
      'openai/gpt-4o',
      'anthropic/claude-3-haiku',
      'google/gemini-pro'
    ];

    const results = [];
    
    for (const model of testModels) {
      try {
        console.log(`Testing model: ${model}`);
        const testPrompt = "Say just 'SUCCESS' if working.";
        const response = await openrouterAI.generateContent(testPrompt, { 
          model: model,
          temperature: 0.1
        });
        
        results.push({
          model: model,
          status: 'success',
          response: response,
          working: response.includes('SUCCESS')
        });
      } catch (error) {
        results.push({
          model: model,
          status: 'error',
          error: error.message,
          working: false
        });
      }
    }

    res.json({
      success: true,
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: ['interview', 'rag', 'tools'],
    ai_provider: 'OpenRouter'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Backend Server running on port ${PORT}`);
  console.log(`🔑 OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🌐 Site URL: ${process.env.OPENROUTER_SITE_URL || 'http://localhost:5000'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Debug endpoints:`);
  console.log(`   - AI Status: http://localhost:${PORT}/api/debug/ai-status`);
  console.log(`   - Test OpenRouter: http://localhost:${PORT}/api/debug/test-openrouter`);
  console.log(`   - Available Models: http://localhost:${PORT}/api/debug/openrouter-models`);
  console.log(`🎯 Ready to receive requests!`);
});