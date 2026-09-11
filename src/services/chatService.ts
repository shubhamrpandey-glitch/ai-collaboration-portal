import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderEmail: string;
  text: string;
  createdAt: any;
  type: "user" | "ai";
}

const getMessagesRef = (chatId: string) => {
  return collection(
    db,
    "chats",
    chatId,
    "messages"
  );
};

export const sendMessage = async (
  chatId: string,
  senderId: string,
  senderEmail: string,
  text: string
) => {
  if (!text.trim()) return;

  await addDoc(
    getMessagesRef(chatId),
    {
      senderId,
      senderEmail,
      text: text.trim(),
      createdAt: serverTimestamp(),
      type: "user",
    }
  );
};

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void
) => {
  const messagesQuery = query(
    getMessagesRef(chatId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      ) as ChatMessage[];

      callback(messages);
    },
    (error) => {
      console.error(
        `Realtime listener failed for chat ${chatId}:`,
        error
      );
    }
  );
};