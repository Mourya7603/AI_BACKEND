// routes/tools.js
import express from 'express';
import { callAI } from '../config/ai.js';

const router = express.Router();

// Mock database - in production, use real database
let userWatchlist = [];
let userLeaves = { taken: 0, remaining: 12 }; // Default 12 days annual leave

// Available tools
const tools = {
  searchMovies: async (args) => {
    const movies = await getMovieDatabase();
    const query = args.query?.toLowerCase() || '';
    
    const results = movies.filter(movie => 
      movie.title.toLowerCase().includes(query) ||
      movie.genre.toLowerCase().includes(query) ||
      movie.director.toLowerCase().includes(query) ||
      movie.cast.some(actor => actor.toLowerCase().includes(query))
    );
    
    return {
      success: true,
      results: results.slice(0, args.limit || 10),
      total: results.length
    };
  },

  addToWatchlist: async (args) => {
    const movies = await getMovieDatabase();
    const movie = movies.find(m => m.id === args.movie_id);
    
    if (!movie) {
      return { success: false, error: "Movie not found" };
    }
    
    if (!userWatchlist.find(m => m.id === args.movie_id)) {
      userWatchlist.push(movie);
    }
    
    return { 
      success: true, 
      movie: movie.title,
      action: "added_to_watchlist",
      watchlist_count: userWatchlist.length
    };
  },

  removeFromWatchlist: async (args) => {
    const initialLength = userWatchlist.length;
    userWatchlist = userWatchlist.filter(m => m.id !== args.movie_id);
    
    return { 
      success: true, 
      action: "removed_from_watchlist",
      removed: initialLength > userWatchlist.length,
      watchlist_count: userWatchlist.length
    };
  },

  getWatchlist: async () => {
    return {
      success: true,
      watchlist: userWatchlist,
      count: userWatchlist.length
    };
  },

  getRecommendations: async (args) => {
    const movies = await getMovieDatabase();
    const genre = args.genre?.toLowerCase();
    const limit = args.limit || 5;
    
    let recommendations = movies;
    
    if (genre) {
      recommendations = movies.filter(m => 
        m.genre.toLowerCase().includes(genre)
      );
    }
    
    // Simple recommendation logic - in production, use better algorithm
    recommendations = recommendations
      .filter(m => !userWatchlist.find(wm => wm.id === m.id)) // Not already in watchlist
      .sort((a, b) => b.rating - a.rating) // Highest rated first
      .slice(0, limit);
    
    return {
      success: true,
      recommendations,
      based_on: genre ? `genre: ${genre}` : 'popular movies'
    };
  },

  calculateLeave: async (args) => {
    const taken = args.days || 0;
    const remaining = Math.max(0, userLeaves.remaining - taken);
    
    // Update user leave balance (in real app, this would be in database)
    userLeaves.taken += taken;
    userLeaves.remaining = remaining;
    
    return {
      success: true,
      taken: userLeaves.taken,
      remaining,
      message: taken > 0 ? 
        `After taking ${taken} days, you have ${remaining} days remaining` :
        `You have ${remaining} days remaining out of ${userLeaves.taken + remaining} total`
    };
  },

  getLeaveBalance: async () => {
    return {
      success: true,
      ...userLeaves,
      total: userLeaves.taken + userLeaves.remaining
    };
  }
};

// Main execution endpoint
router.post('/execute', async (req, res) => {
  try {
    const { userQuery } = req.body;
    
    if (!userQuery) {
      return res.status(400).json({ error: 'User query is required' });
    }

    // Step 1: Create execution plan
    const plan = await createExecutionPlan(userQuery);
    
    // Step 2: Execute each step
    const executionSteps = [];
    for (const step of plan.steps) {
      const result = await executeToolCall(step);
      executionSteps.push({
        ...step,
        ...result,
        timestamp: new Date().toISOString()
      });
      
      // Stop execution if a step fails (unless it's optional)
      if (!result.success && !step.optional) {
        break;
      }
    }
    
    // Step 3: Generate final response
    const finalResult = await generateFinalResponse(userQuery, executionSteps);
    
    res.json({
      success: true,
      user_query: userQuery,
      execution_steps: executionSteps,
      final_result: finalResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({ 
      error: 'Failed to execute plan',
      details: error.message 
    });
  }
});

// Get available tools
router.get('/tools', (req, res) => {
  const toolList = Object.keys(tools).map(toolName => ({
    name: toolName,
    description: getToolDescription(toolName)
  }));
  
  res.json({ tools: toolList });
});

// Helper functions
async function createExecutionPlan(userQuery) {
  const prompt = `
Analyze the user's request and create a step-by-step execution plan using the available tools.

USER QUERY: "${userQuery}"

AVAILABLE TOOLS:
- searchMovies({query: "string", limit: number}) - Search movies by title, genre, or actor
- addToWatchlist({movie_id: "string"}) - Add a movie to watchlist
- removeFromWatchlist({movie_id: "string"}) - Remove movie from watchlist  
- getWatchlist() - Get current watchlist
- getRecommendations({genre: "string", limit: number}) - Get movie recommendations
- calculateLeave({days: number}) - Calculate remaining leave days
- getLeaveBalance() - Check current leave balance

INSTRUCTIONS:
1. Break down complex requests into individual steps
2. Use the most appropriate tools for each step
3. Include necessary arguments
4. Handle potential errors gracefully
5. Return valid JSON only

OUTPUT FORMAT:
{
  "steps": [
    {
      "function": "tool_name",
      "arguments": { ... },
      "purpose": "description of what this step accomplishes",
      "optional": boolean
    }
  ]
}
  `;

  const response = await callAI(prompt, { jsonMode: true, temperature: 0.3 });
  return JSON.parse(response);
}

async function executeToolCall(step) {
  const { function: toolName, arguments: args } = step;
  
  if (!tools[toolName]) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
      result: null
    };
  }

  try {
    const result = await tools[toolName](args);
    return {
      success: true,
      result,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      result: null
    };
  }
}

async function generateFinalResponse(userQuery, executionSteps) {
  const successfulSteps = executionSteps.filter(step => step.success);
  const results = successfulSteps.map(step => step.result);
  
  if (successfulSteps.length === 0) {
    return "I couldn't complete your request. Please try again with a different query.";
  }

  const prompt = `
You are a helpful assistant. Create a natural, friendly response based on the executed steps.

USER'S ORIGINAL QUERY: "${userQuery}"

EXECUTION RESULTS:
${JSON.stringify(results, null, 2)}

INSTRUCTIONS:
1. Summarize what was accomplished
2. Present the results in a user-friendly way
3. Keep it concise but informative
4. Use natural language, not JSON
5. If there were any failures, mention them politely

RESPONSE:
  `;

  return await callAI(prompt, { temperature: 0.7 });
}

function getToolDescription(toolName) {
  const descriptions = {
    searchMovies: "Search movies by title, genre, director, or actor",
    addToWatchlist: "Add a movie to your personal watchlist",
    removeFromWatchlist: "Remove a movie from your watchlist",
    getWatchlist: "Get your current watchlist",
    getRecommendations: "Get movie recommendations based on genre",
    calculateLeave: "Calculate remaining leave days after taking time off",
    getLeaveBalance: "Check your current leave balance"
  };
  
  return descriptions[toolName] || "No description available";
}

// Mock movie database
async function getMovieDatabase() {
  return [
    {
      id: "m1",
      title: "Inception",
      genre: "Sci-Fi",
      year: 2010,
      rating: 8.8,
      director: "Christopher Nolan",
      cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page"],
      runtime_min: 148
    },
    {
      id: "m2", 
      title: "Interstellar",
      genre: "Sci-Fi",
      year: 2014,
      rating: 8.6,
      director: "Christopher Nolan",
      cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
      runtime_min: 169
    },
    {
      id: "m3",
      title: "The Dark Knight",
      genre: "Action",
      year: 2008, 
      rating: 9.0,
      director: "Christopher Nolan",
      cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
      runtime_min: 152
    },
    {
      id: "m4",
      title: "La La Land",
      genre: "Romance",
      year: 2016,
      rating: 8.0,
      director: "Damien Chazelle", 
      cast: ["Ryan Gosling", "Emma Stone", "John Legend"],
      runtime_min: 128
    },
    {
      id: "m5",
      title: "The Social Network",
      genre: "Drama",
      year: 2010,
      rating: 7.7,
      director: "David Fincher",
      cast: ["Jesse Eisenberg", "Andrew Garfield", "Justin Timberlake"],
      runtime_min: 120
    }
  ];
}

export default router;