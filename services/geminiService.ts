import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Safely initialize the client only if key exists (handled in UI if missing)
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getChessHint = async (fen: string, turn: 'w' | 'b'): Promise<string> => {
  if (!ai) {
    throw new Error("API Key is missing.");
  }

  const color = turn === 'w' ? 'White' : 'Black';
  
  const prompt = `
    You are a Chess Grandmaster. 
    Analyze the following chess position in FEN (Forsyth-Edwards Notation): "${fen}".
    It is ${color}'s turn.
    
    1. Suggest the single best move for ${color}.
    2. Briefly explain the strategic reasoning behind this move in 2-3 sentences.
    3. Keep it concise and helpful for a casual player.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No advice available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I couldn't analyze the board right now. Please try again.";
  }
};
