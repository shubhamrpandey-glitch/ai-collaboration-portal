import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app, "asia-south1");

interface AskGeminiResponse {
  text: string;
  model: string;
}

export const askGemini = async (prompt: string): Promise<AskGeminiResponse> => {
  const callable = httpsCallable<
    { prompt: string },
    AskGeminiResponse
  >(functions, "askGemini");

  const result = await callable({ prompt });

  return result.data;
};