// Add this to your routes/interview.js or create a new file routes/chat.js
import express from 'express';
import { callAI } from '../config/ai.js';

const router = express.Router();

// Chat completion endpoint
router.post('/completion', async (req, res) => {
  try {
    const { message, mode = 'general' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('🤖 Chat completion request:', { mode, messageLength: message.length });

    let systemPrompt = "";
    
    // Different system prompts based on mode
    switch (mode) {
      case 'interview':
        systemPrompt = `You are an expert interview coach. Help the user with interview preparation, answer questions about interview techniques, and provide guidance.`;
        break;
      case 'hr':
        systemPrompt = `You are an HR assistant. Answer questions about company policies, leaves, benefits, and HR procedures.`;
        break;
      case 'movies':
        systemPrompt = `You are a movie expert. Help users find movies, manage watchlists, and provide recommendations.`;
        break;
      case 'code':
        systemPrompt = `You are a coding assistant. Help with programming questions, debugging, and best practices.`;
        break;
      default:
        systemPrompt = `You are a helpful AI assistant. Provide accurate, helpful, and friendly responses to the user's queries.`;
    }

    const prompt = `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`;

    const response = await callAI(prompt, {
      temperature: 0.7,
      max_tokens: 500
    });

    res.json({
      success: true,
      response: response,
      mode: mode,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat completion error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate response',
      details: error.message
    });
  }
});

// Chat history endpoint (for storing/retrieving chat history)
router.post('/history', async (req, res) => {
  try {
    const { userId, messages } = req.body;
    
    // In production, store in database
    // For now, just acknowledge receipt
    console.log('💾 Chat history saved for user:', userId);
    
    res.json({
      success: true,
      message: 'Chat history saved',
      count: messages?.length || 0
    });

  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save chat history'
    });
  }
});

export default router;