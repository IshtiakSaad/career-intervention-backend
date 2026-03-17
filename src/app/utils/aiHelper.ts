import OpenAI from "openai";
import { envVars } from "../config/env";
import { AppError } from "../errorHelpers/app-error";
import httpStatus from "http-status";

// Initialize OpenAI client with OpenRouter configuration
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: envVars.OPENROUTER_API_KEY,
});

/**
 * Helper to call the AI model using OpenRouter.
 * Uses the default free routing provided by OpenRouter.
 */
export const getAiCompletion = async (systemPrompt: string, userMessage: string) => {
  try {
    const completion = await openai.chat.completions.create({
      // "openrouter/free" automatically routes to the best available free model
      model: "openrouter/free", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content?.trim() || "[]";
  } catch (error: any) {
    console.error("AI Helper Error:", error.message);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `AI completion failed: ${error.message}`
    );
  }
};
