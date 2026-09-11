import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export interface Channel {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt?: any;
}

const channelsRef = collection(db, "channels");

const defaultChannels = [
  {
    id: "general",
    name: "General",
    description: "Team collaboration",
  },
  {
    id: "project-alpha",
    name: "Project Alpha",
    description: "Project discussion",
  },
  {
    id: "hr-team",
    name: "HR Team",
    description: "HR discussions",
  },
];

/* ============================
   INITIALIZE DEFAULT CHANNELS
============================ */

export const initializeDefaultChannels = async (
  userId: string
) => {
  for (const channel of defaultChannels) {
    const channelRef = doc(
      db,
      "channels",
      channel.id
    );

    const snapshot = await getDoc(channelRef);

    if (!snapshot.exists()) {
      await setDoc(channelRef, {
        name: channel.name,
        description: channel.description,
        createdBy: userId,
        createdAt: serverTimestamp(),
      });
    }
  }
};

/* ============================
   CREATE CHANNEL
============================ */

export const createChannel = async (
  name: string,
  description: string,
  userId: string
) => {
  const channelId = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!channelId) {
    throw new Error("Invalid channel name");
  }

  const channelRef = doc(
    db,
    "channels",
    channelId
  );

  const existingChannel = await getDoc(channelRef);

  if (existingChannel.exists()) {
    throw new Error(
      "A channel with this name already exists."
    );
  }

  await setDoc(channelRef, {
    name: name.trim(),
    description: description.trim(),
    createdBy: userId,
    createdAt: serverTimestamp(),
  });

  return channelId;
};

/* ============================
   REAL-TIME CHANNELS
============================ */

export const subscribeToChannels = (
  callback: (channels: Channel[]) => void
) => {
  return onSnapshot(
    channelsRef,
    (snapshot) => {
      const channels = snapshot.docs
        .map(
          (document) =>
            ({
              id: document.id,
              ...document.data(),
            }) as Channel
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      callback(channels);
    },
    (error) => {
      console.error(
        "Channel listener error:",
        error
      );
    }
  );
};