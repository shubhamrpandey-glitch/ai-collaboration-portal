import {onCall, HttpsError} from "firebase-functions/v2/https";
import {GoogleGenAI} from "@google/genai";

const ai = new GoogleGenAI({
  enterprise: true,
  project: "gcp-spb13-g9",
  location: "global",
  apiVersion: "v1",
});

export const askGemini = onCall(
  {
    region: "asia-south1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to use the AI assistant."
      );
    }

    const prompt = request.data?.prompt;

    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new HttpsError(
        "invalid-argument",
        "A non-empty prompt is required."
      );
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt.trim(),
      });

      return {
        text: response.text ?? "",
        model: "gemini-2.5-flash",
      };
    } catch (error) {
      console.error("Gemini request failed:", error);

      throw new HttpsError(
        "internal",
        "The AI assistant could not generate a response."
      );
    }
  }
);
