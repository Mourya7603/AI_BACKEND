// routes/interview.js
import express from 'express';
import { callAI } from '../config/ai.js';

const router = express.Router();

// Generate interview questions
router.post('/question', async (req, res) => {
  try {
    const candidateProfile = req.body;
    
    console.log('📝 Generating questions with Gemini AI for:', {
      role: candidateProfile.job_role,
      experience: candidateProfile.years_experience,
      skills: candidateProfile.technical_keywords
    });
    
    const prompt = createInterviewPrompt(candidateProfile);
    console.log('🤖 Sending prompt to Gemini AI...');
    
    const response = await callAI(prompt, { 
      jsonMode: true,
      temperature: 0.8
    });
    
    console.log('✅ AI response received');
    
    let questions;
    try {
      questions = JSON.parse(response);
      console.log(`✅ Generated ${questions.questions?.length || 0} questions using Gemini AI`);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }
    
    res.json(questions);
    
  } catch (error) {
    console.error('❌ Interview question error:', error);
    res.status(500).json({ 
      error: 'Failed to generate questions',
      details: error.message,
      fallback: 'Using enhanced mock data'
    });
  }
});

// Provide feedback on answers
router.post('/feedback', async (req, res) => {
  try {
    const { question, userAnswer, profile } = req.body;
    
    console.log('📝 Generating feedback with Gemini AI...');
    
    const prompt = createFeedbackPrompt(question, userAnswer, profile);
    const response = await callAI(prompt, { 
      jsonMode: true,
      temperature: 0.5
    });
    
    console.log('✅ Feedback generated with Gemini AI');
    
    const feedback = JSON.parse(response);
    res.json(feedback);
    
  } catch (error) {
    console.error('❌ Feedback generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate feedback',
      details: error.message
    });
  }
});

// Enhanced prompt engineering for Gemini
function createInterviewPrompt(profile) {
  return `
You are an expert technical interviewer specializing in ${profile.job_role} positions. 
Generate relevant, practical interview questions based on the candidate's profile.

CANDIDATE PROFILE:
- Desired Role: ${profile.job_role}
- Years of Experience: ${profile.years_experience}
- Technical Skills: ${profile.technical_keywords.join(', ')}
- Company Type: ${profile.company_type}
- Interview Round: ${profile.interview_round}
- Focus Area: ${profile.focus_area || 'General technical concepts'}

INSTRUCTIONS:
Generate 3-4 interview questions with these specifications:
1. Questions should be appropriate for ${profile.years_experience} years of experience
2. Focus on ${profile.interview_round} interview topics
3. Include practical, real-world scenarios
4. Provide helpful hints that guide without giving away answers
5. Set realistic time limits (3-7 minutes)
6. List 4-6 expected keywords/concepts for evaluation
7. Categorize by appropriate difficulty

OUTPUT FORMAT (JSON ONLY - no other text):
{
  "questions": [
    {
      "id": "unique_id_1",
      "question": "Clear, concise interview question here",
      "hint": "Helpful guidance for the candidate",
      "time_limit_minutes": 5,
      "difficulty": "easy|medium|hard",
      "category": "${profile.interview_round}",
      "expected_keywords": ["keyword1", "keyword2", "keyword3", "keyword4"]
    }
  ],
  "feedback_rubric": {
    "excellent": "Description of what constitutes an excellent answer",
    "good": "Description of what constitutes a good answer",
    "needs_improvement": "Description of what needs improvement"
  }
}

Make the questions practical and relevant to real-world ${profile.job_role} responsibilities.
`;
}

function createFeedbackPrompt(question, userAnswer, profile) {
  return `
You are an expert interview coach providing constructive, specific feedback.

QUESTION: ${question.question}
CATEGORY: ${question.category}
DIFFICULTY: ${question.difficulty}
EXPECTED KEYWORDS: ${question.expected_keywords.join(', ')}

USER'S ANSWER: 
${userAnswer}

CANDIDATE PROFILE:
- Role: ${profile.job_role}
- Experience: ${profile.years_experience} years
- Skills: ${profile.technical_keywords.join(', ')}

INSTRUCTIONS FOR FEEDBACK:
1. Provide specific, actionable feedback
2. Identify 2-3 strengths in the answer
3. Suggest 2-3 concrete improvements
4. Consider the candidate's experience level
5. Be encouraging but honest
6. Score based on completeness, accuracy, and relevance to expected keywords
7. Calculate keyword match percentage based on expected keywords covered

OUTPUT FORMAT (JSON ONLY - no other text):
{
  "assessment": "Overall assessment (2-3 sentences)",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvement_suggestion": "Specific suggestions for improvement (2-3 sentences)",
  "score": 8,
  "keyword_match": 85
}

Provide feedback that helps the candidate improve their interview skills.
`;
}

export default router;