import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { db } from "./firebase";

export type SenderType = 'user' | 'ai';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderEmail: string;
  text: string;
  createdAt: any;
  type: SenderType;
  meta?: any;
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
  text: string,
  type: SenderType = 'user',
  meta?: any,
) => {
  if (!text.trim()) return;

  await addDoc(
    getMessagesRef(chatId),
    {
      senderId,
      senderEmail,
      text: text.trim(),
      createdAt: serverTimestamp(),
      type,
      ...(meta ? { meta } : {}),
    }
  );
};


export const updateMessage = async (
  chatId: string,
  msgId: string,
  messageData: Partial<ChatMessage>,
) => {
  const messageRef = doc(db, 'chats', chatId, 'messages', msgId);

  // await updateDoc(messageRef, {
  //   senderId: messageData.senderId,
  //   senderEmail: messageData.senderEmail,
  //   text: messageData.text,
  //   updatedAt: serverTimestamp(),
  //   type: messageData.type,
  //   ...(messageData.meta ? { meta: messageData.meta } : {}),
  // });

  const snapshot = await getDoc(messageRef);

  if (!snapshot.exists()) {
    console.log('Message document does not exist');
    return;
  }

  await setDoc(
    messageRef,
    {
      ...messageData,
      // senderId: messageData.senderId,
      // senderEmail: messageData.senderEmail,
      // text: messageData.text,
      // updatedAt: serverTimestamp(),
      // type: messageData.type,
      // ...(messageData.meta ? { meta: messageData.meta } : {}),
    },
    { merge: true },
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