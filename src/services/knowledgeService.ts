import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { db, app } from "./firebase";
import { getStorage } from "firebase/storage";

const storage = getStorage(app);

export type KnowledgeStatus =
  | "uploading"
  | "uploaded"
  | "ingestion_pending"
  | "ingesting"
  | "ready"
  | "failed";

export interface KnowledgeDocument {
  id: string;
  name: string;
  size: number;
  contentType: string;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  status: KnowledgeStatus;
  createdAt?: any;
}

const knowledgeRef = collection(db, "knowledgeDocuments");

export const uploadKnowledgeDocument = (
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
) =>
  new Promise<KnowledgeDocument>((resolve, reject) => {
    const storagePath =
      `knowledge/${userId}/${Date.now()}-${file.name}`;

    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(
      storageRef,
      file,
      {
        contentType:
          file.type || "application/octet-stream",
      }
    );

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred /
            snapshot.totalBytes) *
          100;

        onProgress?.(Math.round(progress));
      },
      reject,
      async () => {
        try {
          const downloadUrl =
            await getDownloadURL(
              uploadTask.snapshot.ref
            );

          const documentRef = await addDoc(
            knowledgeRef,
            {
              name: file.name,
              size: file.size,
              contentType:
                file.type ||
                "application/octet-stream",
              storagePath,
              downloadUrl,
              uploadedBy: userId,
              status: "ingestion_pending",
              createdAt: serverTimestamp(),
            }
          );

          resolve({
            id: documentRef.id,
            name: file.name,
            size: file.size,
            contentType:
              file.type ||
              "application/octet-stream",
            storagePath,
            downloadUrl,
            uploadedBy: userId,
            status: "ingestion_pending",
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });

export const subscribeToKnowledgeDocuments = (
  userId: string,
  callback: (documents: KnowledgeDocument[]) => void
) => {
  const documentsQuery = query(
    knowledgeRef,
    where("uploadedBy", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    documentsQuery,
    (snapshot) => {
      const documents = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as KnowledgeDocument[];

      callback(documents);
    },
    (error) => {
      console.error(
        "Knowledge Vault listener failed:",
        error
      );
    }
  );
};
