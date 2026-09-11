import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  createdAt?: any;
}

const usersRef = collection(db, "users");

export const createUserProfile = async (
  uid: string,
  name: string,
  email: string
) => {
  await setDoc(
    doc(db, "users", uid),
    {
      uid,
      name,
      email,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const subscribeToUsers = (
  callback: (users: AppUser[]) => void
) => {
  return onSnapshot(usersRef, (snapshot) => {
    const users = snapshot.docs.map(
      (document) => document.data() as AppUser
    );

    callback(users);
  });
};