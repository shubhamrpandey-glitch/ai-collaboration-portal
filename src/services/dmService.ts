import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

export const getDirectChatId = (
  uid1: string,
  uid2: string
) => {
  return `dm_${[uid1, uid2].sort().join("_")}`;
};

export const createDirectChat = async (
  uid1: string,
  uid2: string
) => {
  const chatId = getDirectChatId(uid1, uid2);

  const chatRef = doc(
    db,
    "chats",
    chatId
  );

  await setDoc(
    chatRef,
    {
      type: "direct",
      members: [uid1, uid2],
      createdAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  return chatId;
};