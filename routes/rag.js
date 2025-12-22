// routes/rag.js
import express from 'express';
import { callAI } from '../config/ai.js';

const router = express.Router();

// Knowledge Base - In production, this would be a database
const knowledgeBase = [
  {
    policy: "Employees are entitled to 12 days of casual leave per calendar year.",
    source: "Company Handbook, Section 4.1",
    tags: ["casual leaves", "cl", "short leave", "urgent leave", "time off"]
  },
  {
    policy: "Employees can avail up to 10 days of paid sick leave annually with medical proof.",
    source: "Company Handbook, Section 4.2",
    tags: ["sick leave", "sl", "medical leave", "illness", "doctor"]
  },
  {
    policy: "Earned leave accrues at 1.5 days per month worked, up to 18 days per year.",
    source: "Company Handbook, Section 4.3",
    tags: ["earned leave", "el", "vacation", "annual leave", "holiday"]
  },
  {
    policy: "Female employees are entitled to 26 weeks of paid maternity leave.",
    source: "Company Handbook, Section 4.4",
    tags: ["maternity leave", "pregnancy", "childbirth", "mother"]
  },
  {
    policy: "Male employees are entitled to 10 days of paid paternity leave within 3 months of childbirth.",
    source: "Company Handbook, Section 4.5",
    tags: ["paternity leave", "father", "newborn", "childbirth", "parent"]
  },
  {
    policy: "Medical certificate is required for sick leaves exceeding 3 consecutive days.",
    source: "Company Handbook, Section 4.6",
    tags: ["medical certificate", "sick leave", "doctor note", "proof"]
  },
  {
    policy: "Leave application must be submitted at least 7 days in advance for planned leaves.",
    source: "Company Handbook, Section 4.7",
    tags: ["leave application", "advance notice", "planned leave", "approval"]
  }
];

// Query endpoint
router.post('/query', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Find best matching policy
    const matchedEntry = findBestMatch(question);
    
    if (!matchedEntry) {
      return res.json({
        answer: "I don't have information about that in our policy database. Please contact HR for specific queries.",
        source: "none",
        confidence: 0,
        relevant_policy: null
      });
    }

    // Generate natural language response using AI
    const prompt = `
You are an HR assistant. Answer the employee's question using ONLY the provided policy information.

EMPLOYEE QUESTION: "${question}"

RELEVANT POLICY: "${matchedEntry.policy}"
POLICY SOURCE: ${matchedEntry.source}

INSTRUCTIONS:
1. Answer in a friendly, helpful tone
2. Use ONLY the policy information provided
3. Do not add any extra information or assumptions
4. Keep the answer concise and clear
5. If the question can't be fully answered with the policy, say what you can answer

ANSWER:
    `;

    const aiResponse = await callAI(prompt, { temperature: 0.3 });
    
    res.json({
      answer: aiResponse.trim(),
      source: matchedEntry.source,
      confidence: 0.9,
      relevant_policy: matchedEntry.policy
    });

  } catch (error) {
    console.error('RAG query error:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      details: error.message 
    });
  }
});

// Get all policies (for frontend display)
router.get('/policies', (req, res) => {
  res.json({
    policies: knowledgeBase.map(entry => ({
      policy: entry.policy,
      source: entry.source,
      tags: entry.tags
    }))
  });
});

// Helper function to find best matching policy
function findBestMatch(query) {
  const queryLower = query.toLowerCase();
  
  // First pass: exact tag matching
  for (const entry of knowledgeBase) {
    if (entry.tags.some(tag => queryLower.includes(tag.toLowerCase()))) {
      return entry;
    }
  }
  
  // Second pass: keyword matching
  const queryWords = queryLower.split(/\W+/).filter(word => word.length > 2);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const entry of knowledgeBase) {
    const entryText = (entry.policy + ' ' + entry.tags.join(' ')).toLowerCase();
    let score = 0;
    
    for (const word of queryWords) {
      if (entryText.includes(word)) {
        score += 1;
      }
    }
    
    // Bonus for exact phrase matches
    if (entry.policy.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  
  return bestScore > 0 ? bestMatch : null;
}

export default router;