import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {getFirestore} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";
import {GoogleAuth} from "google-auth-library";
import {onInit} from "firebase-functions/v2/core";
import {GoogleGenAI} from "@google/genai";

initializeApp();


const firestore = getFirestore();

const PROJECT_ID = "gcp-spb13-g9";

const RAG_LOCATION = "asia-south1";
const GEMINI_LOCATION = "global";

const RAG_CORPUS =
  `projects/${PROJECT_ID}/locations/${RAG_LOCATION}/` +
  "ragCorpora/4611686018427387904";

const RAG_API_BASE =
  `https://${RAG_LOCATION}-aiplatform.googleapis.com/v1`;

let auth: GoogleAuth;
let ai: GoogleGenAI;

onInit(() => {
  auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: GEMINI_LOCATION,
    httpOptions: {
      apiVersion: "v1",
    },
  });
});

export const ingestKnowledgeDocument = onDocumentCreated(
  {
    document: "knowledgeDocuments/{documentId}",
    region: RAG_LOCATION,
  },
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      return;
    }

    const document = snapshot.data();
    const storagePath = document.storagePath;

    if (
      typeof storagePath !== "string" ||
      !storagePath.startsWith("knowledge/")
    ) {
      await snapshot.ref.update({
        status: "failed",
        ingestionError: "Invalid Knowledge Vault storage path.",
      });
      return;
    }

    try {
      await snapshot.ref.update({
        status: "ingesting",
        ingestionStartedAt: new Date(),
      });

      const client = await auth.getClient();
      const accessTokenResponse = await client.getAccessToken();
      const accessToken = accessTokenResponse.token;

      if (!accessToken) {
        throw new Error("Could not obtain Google Cloud access token.");
      }

      const bucket = `${PROJECT_ID}.firebasestorage.app`;
      const gcsUri = `gs://${bucket}/${storagePath}`;

      const importResponse = await fetch(
        `${RAG_API_BASE}/${RAG_CORPUS}/ragFiles:import`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            importRagFilesConfig: {
              gcsSource: {
                uris: [gcsUri],
              },
            },
          }),
        }
      );

      if (!importResponse.ok) {
        const errorText = await importResponse.text();
        throw new Error(
          `RAG import request failed (${importResponse.status}): ${errorText}`
        );
      }

      const operation = await importResponse.json();

      if (!operation.name) {
        throw new Error(
          "RAG import did not return a long-running operation."
        );
      }

      let completedOperation: any = operation;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (completedOperation.done) {
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 2000)
        );

        const pollTokenResponse =
          await client.getAccessToken();
        const pollToken = pollTokenResponse.token;

        if (!pollToken) {
          throw new Error(
            "Could not obtain access token while polling RAG import."
          );
        }

        const pollResponse = await fetch(
          `${RAG_API_BASE}/${operation.name}`,
          {
            headers: {
              Authorization: `Bearer ${pollToken}`,
            },
          }
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          throw new Error(
            `RAG operation polling failed (${pollResponse.status})
            : ${errorText}`
          );
        }

        completedOperation = await pollResponse.json();
      }

      if (!completedOperation.done) {
        throw new Error(
          "RAG ingestion is still running after the maximum wait time."
        );
      }

      if (completedOperation.error) {
        throw new Error(
          completedOperation.error.message ||
            "RAG ingestion failed."
        );
      }

      await snapshot.ref.update({
        status: "ready",
        ingestionCompletedAt: new Date(),
        ingestionError: null,
      });
    } catch (error) {
      console.error(
        "Knowledge Vault ingestion failed:",
        error
      );

      await snapshot.ref.update({
        status: "failed",
        ingestionError:
          error instanceof Error ?
            error.message :
            "Unknown ingestion error.",
      });
    }
  }
);

const sleep = async (milliseconds: number) => {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

const isRetryable429 = (error: unknown) => {
  if (!error) {
    return false;
  }

  const errorText =
    error instanceof Error ?
      error.message :
      JSON.stringify(error);

  return (
    errorText.includes("429") ||
    errorText.includes("RESOURCE_EXHAUSTED")
  );
};

export const askGemini = onCall(
  {
    region: RAG_LOCATION,
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to use the AI assistant."
      );
    }

    const prompt = request.data?.prompt;

    const useKnowledgeVault =
      request.data?.useKnowledgeVault === true;

    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new HttpsError(
        "invalid-argument",
        "A non-empty prompt is required."
      );
    }

    if (
      request.data?.useKnowledgeVault !== undefined &&
      typeof request.data.useKnowledgeVault !== "boolean"
    ) {
      throw new HttpsError(
        "invalid-argument",
        "useKnowledgeVault must be a boolean."
      );
    }

    try {
      const ragTool = {
        retrieval: {
          vertexRagStore: {
            ragResources: [
              {
                ragCorpus: RAG_CORPUS,
              },
            ],
            ragRetrievalConfig: {
              topK: 3,
              filter: {
                vectorDistanceThreshold: 0.5,
              },
            },
          },
        },
      };

      const contentPrompt = useKnowledgeVault ?
        `Use the Knowledge 
        Vault documents when they are relevant to the user's request.

If the requested information cannot be 
found in the Knowledge Vault, clearly say that 
it was not found in the uploaded documents. 
Do not invent document-based information.

${prompt.trim()}` :
        prompt.trim();

      console.log(
        `askGemini: mode=${
          useKnowledgeVault ?
            "knowledge-vault" :
            "general"
        }`
      );
      let response;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          console.log(
            `askGemini: Gemini attempt ${attempt + 1}/3`
          );

          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contentPrompt,

            ...(useKnowledgeVault ?
              {
                config: {
                  tools: [ragTool],
                },
              } :
              {}),
          });

          break;
        } catch (error) {
          if (!isRetryable429(error) || attempt === 2) {
            throw error;
          }

          const baseDelay = 2000 * 2 ** attempt;
          const jitter = Math.floor(Math.random() * 1000);
          const delay = baseDelay + jitter;

          console.log(
            "askGemini: Gemini returned 429. " +
      `Retrying in ${delay}ms.`
          );

          await sleep(delay);
        }
      }

      if (!response) {
        throw new Error(
          "Gemini did not return a response."
        );
      }
      console.log(
        "askGemini: Gemini response received"
      );

      const groundingChunks =
        useKnowledgeVault ?
          response.candidates?.[0]
            ?.groundingMetadata
            ?.groundingChunks ?? [] :
          [];

      const retrievedContexts =
        groundingChunks
          .map(
            (chunk) =>
              chunk.retrievedContext
          )
          .filter(
            (context) =>
              !!context && !!context.uri
          );

      const sources = await Promise.all(
        retrievedContexts.map(
          async (context) => {
            const uri = context?.uri ?? "";

            let storagePath = "";

            if (uri.startsWith("gs://")) {
              const firstSlash =
                uri.indexOf("/", 5);

              storagePath =
                firstSlash >= 0 ?
                  uri.slice(
                    firstSlash + 1
                  ) :
                  "";
            }

            let title =
              context?.title ??
              "Knowledge Vault document";

            let downloadUrl = "";

            if (storagePath) {
              const snapshot =
                await firestore
                  .collection(
                    "knowledgeDocuments"
                  )
                  .where(
                    "storagePath",
                    "==",
                    storagePath
                  )
                  .limit(1)
                  .get();

              if (!snapshot.empty) {
                const document =
                  snapshot.docs[0].data();

                title =
                  document.name || title;

                downloadUrl =
                  document.downloadUrl || "";
              }
            }

            if (/^\d{13}-/.test(title)) {
              title = title.replace(
                /^\d{13}-/,
                ""
              );
            }

            return {
              title,
              uri,
              url:
                downloadUrl || uri,
            };
          }
        )
      );

      const uniqueSources =
        sources.filter(
          (source, index, array) =>
            array.findIndex(
              (item) =>
                item.uri === source.uri
            ) === index
        );

      return {
        text: response.text ?? "",
        model: "gemini-2.5-flash",

        sources: useKnowledgeVault ?
          uniqueSources :
          [],
      };
    } catch (error) {
      console.error(
        "Gemini request failed:",
        error instanceof Error ?
          error.message :
          error
      );

      throw new HttpsError(
        "internal",
        error instanceof Error ?
          error.message :
          "The AI assistant could not generate a response."
      );
    }
  }
);
