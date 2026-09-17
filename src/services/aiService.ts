import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app, "asia-south1");

export interface AISource {
  title: string;
  uri: string;
  url: string;
}

export interface AskGeminiResponse {
  text: string;
  model: string;
  sources: AISource[];
}

export interface AskGeminiRequest {
  prompt: string;
  useKnowledgeVault?: boolean;
}

export const askGemini = async (
  prompt: string,
  useKnowledgeVault = false
): Promise<AskGeminiResponse> => {
  const callable = httpsCallable<
    AskGeminiRequest,
    AskGeminiResponse
  >(functions, "askGemini");

  const result = await callable({
    prompt,
    useKnowledgeVault,
  });

  return result.data;
};