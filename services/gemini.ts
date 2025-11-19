import { GoogleGenAI } from "@google/genai";
import { Commodity, InputMatrix } from "../types";

let ai: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (e) {
  console.error("Failed to initialize Gemini client", e);
}

export const analyzeEconomy = async (
  commodities: Commodity[],
  matrix: InputMatrix,
  r: number,
  prices: number[],
  isValid: boolean
): Promise<string> => {
  if (!ai) return "Gemini API Key not configured.";

  const systemDesc = commodities.map((c, idx) => {
    const inputs = matrix.map((row, i) => `${row[idx]} units of ${commodities[i].name}`).join(", ");
    return `Industry ${c.name}: Produces ${c.totalOutput}, uses inputs [${inputs}] and ${c.laborInput} labor.`;
  }).join("\n");

  const priceDesc = isValid 
    ? `Calculated Prices (in terms of wage unit): ${commodities.map((c, i) => `${c.name}: ${prices[i]?.toFixed(2)}`).join(", ")}`
    : "The system is currently invalid (prices did not converge or were negative), possibly because the profit rate 'r' is too high.";

  const prompt = `
    Act as Piero Sraffa, the economist. 
    Analyze the following "Production of Commodities by Means of Commodities" system:
    
    Current Rate of Profit (r): ${(r * 100).toFixed(1)}%
    
    ${systemDesc}
    
    ${priceDesc}
    
    Please provide a concise, insightful economic analysis (max 150 words). 
    Discuss:
    1. Is the system productive (surplus producing)?
    2. Identify if there are basic vs non-basic commodities if obvious.
    3. Comment on the relationship between the chosen profit rate and the prices.
    4. Use Sraffian terminology.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error(error);
    return "Error generating analysis. Please check API key and limits.";
  }
};