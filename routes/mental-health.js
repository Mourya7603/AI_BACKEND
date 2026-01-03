// routes/mental-health.js
import express from 'express';
import { callAI } from '../config/ai.js'; // Import from ai.js, not openrouter-ai.js

const router = express.Router();

// AI Mental Health Chat
router.post('/chat', async (req, res) => {
  try {
    const { message, mood, context = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }

    console.log('🧠 Mental health chat request, mood:', mood);

    // Crisis detection
    const crisisKeywords = [
      'suicide', 'kill myself', 'want to die', 'end my life', 
      'hurting myself', 'self harm', 'cant go on'
    ];
    
    const isCrisis = crisisKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (isCrisis) {
      return res.json({
        success: true,
        response: `I can hear that you're in tremendous pain right now, and I'm deeply concerned. Please reach out immediately:\n\n📞 National Suicide Prevention Lifeline: 988 (24/7, free, confidential)\n📱 Crisis Text Line: Text HOME to 741741\n\nYou deserve support and care. These lines are staffed by trained professionals who want to help you through this difficult time.`,
        isCrisis: true
      });
    }

    // Create compassionate prompt
    const prompt = `You are a compassionate, empathetic AI mental health supporter. The user is feeling at ${mood}/10 mood level.

Previous conversation context (last 3 messages):
${context.length > 0 ? context.join('\n') : 'No previous context'}

User's current message: "${message}"

Respond with:
1. Validate their feelings with empathy
2. Show understanding without judgment
3. Ask an open-ended question to encourage sharing
4. Keep the tone warm and supportive
5. Suggest healthy coping strategies if appropriate
6. Remind them it's okay to seek professional help
7. Never give medical advice or diagnoses

Format your response naturally, as if talking to a friend who needs support.`;

    // CORRECTED: Use callAI function from ai.js
    const response = await callAI(prompt, {
      model: 'anthropic/claude-3-haiku', // Good for compassionate responses
      temperature: 0.8,
      max_tokens: 500
    });

    res.json({
      success: true,
      response: response.trim(),
      isCrisis: false
    });

  } catch (error) {
    console.error('❌ Mental health chat error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process mental health request',
      message: error.message 
    });
  }
});

// Wellness tool guidance
router.post('/tool', async (req, res) => {
  try {
    const { tool, userMood } = req.body;
    
    const toolPrompts = {
      breathe: `Guide the user through a 4-7-8 breathing exercise. Their current mood is ${userMood}/10. 
                Provide gentle, step-by-step guidance. Start with preparation, then guide through 4 cycles.
                Use calming language.`,
      
      ground: `Guide the user through a 5-4-3-2-1 grounding exercise. Their mood is ${userMood}/10.
               Help them identify 5 things they can see, 4 things they can touch, 
               3 things they can hear, 2 things they can smell, 1 thing they can taste.
               Make it engaging and specific.`,
      
      gratitude: `Help the user practice gratitude. Their mood is ${userMood}/10.
                  Encourage them to think of 3 specific things they're grateful for today.
                  Explain why gratitude helps mental health. Make it personal and meaningful.`,
      
      meditate: `Guide a 3-minute mindfulness meditation. User's mood is ${userMood}/10.
                 Focus on breath awareness, body scan, and present moment awareness.
                 Use soothing, gentle instructions.`
    };

    const prompt = toolPrompts[tool] || toolPrompts.breathe;
    
    // CORRECTED: Use callAI function from ai.js
    const guidance = await callAI(prompt, {
      model: 'openai/gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 300
    });

    res.json({
      success: true,
      tool: tool,
      guidance: guidance.trim(),
      userMood: userMood
    });

  } catch (error) {
    console.error('❌ Wellness tool error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate tool guidance'
    });
  }
});

// Mood analysis
router.post('/mood-analysis', async (req, res) => {
  try {
    const { moodHistory, currentMood } = req.body;
    
    const prompt = `Analyze this user's mood data:
    Current mood: ${currentMood}/10
    Recent mood history: ${JSON.stringify(moodHistory)}
    
    Provide:
    1. Brief mood pattern analysis
    2. 2-3 gentle suggestions for mood improvement
    3. Encouraging message
    
    Keep it positive, actionable, and non-judgmental.`;
    
    // CORRECTED: Use callAI function from ai.js
    const analysis = await callAI(prompt, {
      model: 'openai/gpt-3.5-turbo',
      temperature: 0.6,
      max_tokens: 300
    });

    res.json({
      success: true,
      analysis: analysis.trim(),
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Mood analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze mood data'
    });
  }
});

export default router;