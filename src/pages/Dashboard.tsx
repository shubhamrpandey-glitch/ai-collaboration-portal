import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  ThumbsDown,
  ThumbsUp,
  Sparkles,
  Upload,
  FileText,
  X,
} from "lucide-react";
import Markdown from 'react-markdown';

import { useAuth } from "../context/AuthContext";

import Sidebar, { type AIPersona } from "../components/layout/Sidebar/Sidebar";
import ChatHeader from "../components/chat/ChatHeader";

import {
  sendMessage,
  subscribeToMessages,
  type ChatMessage,
} from "../services/chatService";

import { createDirectChat } from "../services/dmService";
import { askGemini, type AISource } from "../services/aiService";

import type { AppUser } from "../services/userService";
import type { Channel } from "../services/channelService";
import { type KnowledgeDocument } from "../services/knowledgeService";

export default function Dashboard() {
  const { user } = useAuth();
 const errorResponse = "Sorry, I couldn't generate a response. Please try again.";
  /* ============================
     ACTIVE CHAT
  ============================ */

  const [activeChatId, setActiveChatId] =
    useState("general");

  const [selectedChannel, setSelectedChannel] =
    useState<Channel | null>(null);

  const [selectedUser, setSelectedUser] =
    useState<AppUser | null>(null);

  /* ============================
     MESSAGES
  ============================ */

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [message, setMessage] =
    useState("");

  const [sending, setSending] =
    useState(false);

  /* ============================
     AI ASSISTANT
  ============================ */

  interface AIConversation {
    id: string;
    prompt: string;
    response: string;
    sources: AISource[];
    useKnowledgeVault: boolean;
    feedback: "up" | "down" | null;
  }

  const [aiConversations, setAIConversations] =
    useState<AIConversation[]>([]);

  const [aiThinking, setAIThinking] =
    useState(false);

  const [aiPersona, setAIPersona] =
    useState<AIPersona>("General Assistant");

  const [useKnowledgeVault, setUseKnowledgeVault] = useState(false);

  const [showKnowledgeVault, setShowKnowledgeVault] = useState(false);

  const [knowledgeDocument, setKnowledgeDocument] =
    useState<KnowledgeDocument | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'auto',
      block: 'end',
    });
  }, [messages]);

  /* ============================
     MESSAGE SUBSCRIPTION
  ============================ */

  useEffect(() => {
    setMessages([]);

    const unsubscribe =
      subscribeToMessages(
        activeChatId,
        (newMessages) => {
          setMessages(newMessages);
        }
      );

    return () => unsubscribe();
  }, [activeChatId]);

  /* ============================
     SELECT CHANNEL
  ============================ */

  const handleSelectChannel = (
    channel: Channel
  ) => {
    setSelectedChannel(channel);
    setSelectedUser(null);
    setActiveChatId(channel.id);
    setMessages([]);
  };

  /* ============================
     SELECT GENERAL
  ============================ */

  const handleSelectGeneral = () => {
    setSelectedChannel(null);
    setSelectedUser(null);
    setActiveChatId("general");
    setMessages([]);
  };

  /* ============================
     SELECT USER / DIRECT MESSAGE
  ============================ */

  const handleSelectUser = async (
    selected: AppUser
  ) => {
    if (!user) return;

    try {
      const chatId =
        await createDirectChat(
          user.uid,
          selected.uid
        );

      setSelectedUser(selected);
      setSelectedChannel(null);
      setActiveChatId(chatId);
      setMessages([]);
    } catch (error) {
      console.error(
        "Error creating direct chat:",
        error
      );
    }
  };

  /* ============================
     SEND MESSAGE
  ============================ */

  const handleSend = async () => {
    if (
      !user ||
      !message.trim() ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);

      await sendMessage(
        activeChatId,
        user.uid,
        user.email || "Unknown User",
        message
      );

      setMessage("");
    } catch (error) {
      console.error(
        "Error sending message:",
        error
      );
    } finally {
      setSending(false);
    }
  };

  const handleSendAI = async (message: string, meta?: any) => {
    if (!user || !message.trim() || sending) {
      return;
    }

    try {
      setSending(true);

      await sendMessage(
        activeChatId,
        user.uid,
        'AI Assistant (Gemini)',
        message,
        'ai',
        meta, // Meta data for AI message
      );

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  /* ============================
     ASK AI
  ============================ */

  const handleAskAI = async () => {
    if (!user || !message.trim() || aiThinking) {
      return;
    }

    const prompt = message.trim();
    const conversationId =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    try {
      await handleSend();

      setAIThinking(true);

      const personaInstruction = {
        "General Assistant":
          "Act as a helpful general-purpose assistant.",
        "Code Expert":
          "Act as a senior software engineer. Give precise technical explanations, code examples when useful, and practical debugging advice.",
        "Project Manager":
          "Act as an experienced project manager. Focus on objectives, priorities, risks, dependencies, owners, and actionable next steps.",
        "Technical Writer":
          "Act as a technical writer. Produce clear, structured, professional documentation that is easy to understand.",
        "Data Analyst":
          "Act as a data analyst. Focus on patterns, key insights, assumptions, and actionable conclusions.",
      }[aiPersona];

      const response = await askGemini(
        `${personaInstruction}\n\nUser request:\n${prompt}`,
        useKnowledgeVault
      );

      await handleSendAI(response.text, {
        id: conversationId,
        prompt,
        response:
          response.text ||
          "I couldn't generate a response.",
        sources: Array.from(
          new Map(
            (response.sources ?? []).map((source) => [
              source.title,
              source,
            ])
          ).values()
        ),
        useKnowledgeVault,
        feedback: null,
      });

      // setAIConversations((previous) => [
      //   ...previous,
      //   {
      //     id: conversationId,
      //     prompt,
      //     response:
      //       response.text ||
      //       "I couldn't generate a response.",
      //     sources: Array.from(
      //       new Map(
      //         (response.sources ?? []).map((source) => [
      //           source.title,
      //           source,
      //         ])
      //       ).values()
      //     ),
      //     useKnowledgeVault,
      //     feedback: null,
      //   },
      // ]);

      setMessage("");
    } catch (error) {
      console.error(
        "AI request failed:",
        error
      );
      await handleSendAI(errorResponse, {
        id: conversationId,
        prompt,
        response:errorResponse,
          
        sources: [],
        useKnowledgeVault,
        feedback: null,
      });

      // setAIConversations(
      //   (previous) => [
      //   ...previous,
      //   {
      //     id: conversationId,
      //     prompt,
      //     response:errorResponse,
           
      //     sources: [],
      //     useKnowledgeVault,
      //     feedback: null,
      //   },
      // ]);
      setMessage('');
    } finally {
      setAIThinking(false);
    }
  };

  const handleAIFeedback = async (
    message: ChatMessage,
    feedback: "up" | "down"
  ) => {
    // setAIConversations((previous) =>
    //   previous.map((conversation) =>
    //     conversation.id === id
    //       ? {
    //           ...conversation,
    //           feedback:
    //             conversation.feedback === feedback
    //               ? null
    //               : feedback,
    //         }
    //       : conversation
    //   )
    // );

    //
    // if (!user) {
    //   return;
    // }

    // try {
    //   await updateMessage(activeChatId, message.id, {
    //     meta: {
    //       ...message.meta,
    //       feedback: message.meta?.feedback === feedback ? null : feedback,
    //     },
    //   });
    // } catch (error) {
    //   console.error('updateMessage request failed:', error);
    // }

    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === message.id
          ? {
              ...msg,
              meta: {
                ...msg.meta,
                feedback: message.meta?.feedback === feedback ? null : feedback,
              },
            }
          : msg,
      ),
    );
  };

  /* ============================
     AI TOOL CALLBACKS
  ============================ */

  const handlePromptSelect = (prompt: string) => {
    setMessage(prompt);
  };

  const handlePersonaSelect = (persona: AIPersona) => {
    setAIPersona(persona);
  };

  const handleOpenAI = () => {
    const input = document.querySelector<HTMLInputElement>(
      ".message-input"
    );

    input?.focus();
  };

  /* ============================
     KEYBOARD HANDLER
  ============================ */

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ============================
     AVATAR INITIAL
  ============================ */

  const getInitial = (
    value: string | null | undefined
  ) => {
    return (
      value?.charAt(0).toUpperCase() ||
      "U"
    );
  };

  const handleUploadClick = () => {
    setShowKnowledgeVault(true);
  };

  /* ============================
     CHAT TYPE
  ============================ */

  const isDirectMessage =
    !!selectedUser;

  /* ============================
     CHAT TITLE
  ============================ */

  const chatTitle = isDirectMessage
    ? selectedUser?.name || "Direct Message"
    : selectedChannel?.name ||
      "General";

  /* ============================
     CHAT DESCRIPTION
  ============================ */

  const chatDescription =
    isDirectMessage
      ? "Direct message"
      : selectedChannel?.description ||
        "Team collaboration";

  /* ============================
     EMPTY STATE
  ============================ */

  const emptyStateTitle =
    isDirectMessage
      ? `Start a conversation with ${selectedUser?.name}`
      : `Welcome to ${
          selectedChannel?.name ||
          "General"
        }`;

  const emptyStateDescription =
    isDirectMessage
      ? "Send a private message."
      : selectedChannel?.description ||
        "Start a conversation with your team.";

  /* ============================
     INPUT PLACEHOLDER
  ============================ */

  const inputPlaceholder =
    isDirectMessage
      ? `Message ${selectedUser?.name}...`
      : `Message #${
          selectedChannel?.name ||
          "general"
        }...`;

  /* ============================
     RENDER
  ============================ */

  return (
    <div className="chat-page">

      {/* ============================
          SIDEBAR
      ============================ */}

      <Sidebar
        onSelectUser={handleSelectUser}
        onSelectGeneral={handleSelectGeneral}
        onSelectChannel={handleSelectChannel}
        onAskGemini={handleOpenAI}
        onPromptSelect={handlePromptSelect}
        onPersonaSelect={handlePersonaSelect}
        showKnowledgeVault={showKnowledgeVault}
        setShowKnowledgeVault={setShowKnowledgeVault}
        setKnowledgeDocument={setKnowledgeDocument}
      />

      {/* ============================
          CHAT AREA
      ============================ */}

      <main className="chat-area">

        {/* ============================
            CHAT HEADER
        ============================ */}

        <ChatHeader
          title={chatTitle}
          description={chatDescription}
          isDirectMessage={
            isDirectMessage
          }
        />

        {/* ============================
            AI ASSISTANT
        ============================ */}

        {false && (aiConversations.length > 0 || aiThinking) && (
          <div
            style={{
              padding: "18px 28px 0",
              overflowY: "auto",
            }}
          >
            {aiConversations.map((conversation) => (
              <div
                key={conversation.id}
                style={{
                  maxWidth: "900px",
                  margin: "0 auto 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      background: "#eef2ff",
                      color: "#1f2937",
                      fontSize: "14px",
                    }}
                  >
                    {conversation.prompt}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      minWidth: "34px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#eef2ff",
                      color: "#6366f1",
                    }}
                  >
                    <Sparkles size={17} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "13px",
                        }}
                      >
                        AI Assistant
                      </strong>

                      <span
                        style={{
                          fontSize: "11px",
                          color: "#8a94a6",
                        }}
                      >
                        Gemini
                      </span>

                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "999px",
                          background:
                            conversation.useKnowledgeVault
                              ? "#eef2ff"
                              : "#f3f4f6",
                          color:
                            conversation.useKnowledgeVault
                              ? "#4f46e5"
                              : "#6b7280",
                          fontWeight: 600,
                        }}
                      >
                        {conversation.useKnowledgeVault
                          ? "Knowledge Vault"
                          : "General AI"}
                      </span>
                    </div>

                    <div
                      style={{
                        padding: "12px 14px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        background: "#ffffff",
                        color: "#374151",
                        fontSize: "14px",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {conversation.response}
                    </div>

                    {conversation.sources.length > 0 && (
                      <div
                        style={{
                          marginTop: "12px",
                          paddingTop: "10px",
                          borderTop: "1px solid #e5e7eb",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#6b7280",
                            marginBottom: "7px",
                          }}
                        >
                          Sources
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {conversation.sources.map((source, index) => {
                            const sourceUrl = source.url || source.uri;
                            const isWebUri =
                              sourceUrl.startsWith("http://") ||
                              sourceUrl.startsWith("https://");

                            return isWebUri ? (
                              <a
                                key={`${source.uri}-${index}`}
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "7px",
                                  width: "fit-content",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  background: "#f5f5ff",
                                  color: "#4f46e5",
                                  textDecoration: "none",
                                  fontSize: "12px",
                                }}
                              >
                                <span aria-hidden="true">📄</span>
                                <span>{source.title}</span>
                              </a>
                            ) : (
                              <div
                                key={`${source.uri}-${index}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "7px",
                                  width: "fit-content",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  background: "#f5f5ff",
                                  color: "#4f46e5",
                                  fontSize: "12px",
                                }}
                                title={source.uri}
                              >
                                <span aria-hidden="true">📄</span>
                                <span>{source.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "8px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleAIFeedback(
                            conversation.id,
                            "up"
                          )
                        }
                        aria-label="Helpful response"
                        title="Helpful"
                        style={{
                          border: "none",
                          background:
                            conversation.feedback === "up"
                              ? "#eef2ff"
                              : "transparent",
                          color:
                            conversation.feedback === "up"
                              ? "#6366f1"
                              : "#6b7280",
                          padding: "6px",
                          borderRadius: "7px",
                          cursor: "pointer",
                        }}
                      >
                        <ThumbsUp size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleAIFeedback(
                            conversation.id,
                            "down"
                          )
                        }
                        aria-label="Unhelpful response"
                        title="Not helpful"
                        style={{
                          border: "none",
                          background:
                            conversation.feedback === "down"
                              ? "#fef2f2"
                              : "transparent",
                          color:
                            conversation.feedback === "down"
                              ? "#dc2626"
                              : "#6b7280",
                          padding: "6px",
                          borderRadius: "7px",
                          cursor: "pointer",
                        }}
                      >
                        <ThumbsDown size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {aiThinking && (
              <div
                style={{
                  maxWidth: "900px",
                  margin: "0 auto 18px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    minWidth: "34px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#eef2ff",
                    color: "#6366f1",
                  }}
                >
                  <Sparkles size={17} />
                </div>

                <span>
                  AI Assistant is thinking...
                </span>

                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-flex",
                    gap: "3px",
                  }}
                >
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* ============================
            MESSAGES
        ============================ */}

        <div className="messages">

          {messages.length === 0 ? (

            <div className="empty-state">

              <div>

                <div className="empty-state-icon">
                  <MessageSquare
                    size={25}
                  />
                </div>

                <h3>
                  {emptyStateTitle}
                </h3>

                <p>
                  {emptyStateDescription}
                </p>

              </div>

            </div>

          ) : (

            messages.map((msg) => {

              const isMine =
                msg.type === 'user' && 
                msg.senderId ===
                user?.uid;

              const isAIMessage = msg.type === 'ai';

              return (
                <div
                  key={msg.id}
                  className={
                    isMine
                      ? "message mine"
                      : "message"
                  }
                >

                  {/* AVATAR */}

                  {
                    isAIMessage ? (
                      <div
                        className="mt-25"
                        style={{
                          width: "34px",
                          height: "34px",
                          minWidth: "34px",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#eef2ff",
                          color: "#6366f1",
                        }}
                      >
                        <Sparkles size={17} />
                      </div>
                     ) : (
                        <div className="message-avatar mt-25">
                          {getInitial(
                            msg.senderEmail
                          )}
                        </div>)
                  }  

                  {/* MESSAGE */}

                  <div className="message-content">

                    <div className="message-header">

                      <span className="message-sender">
                        {isMine
                          ? "You"
                          : msg.senderEmail}
                      </span>

                      {isAIMessage && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "999px",
                            background:
                              msg.meta?.useKnowledgeVault
                                ? "#eef2ff"
                                : "#f3f4f6",
                            color:
                              msg.meta?.useKnowledgeVault
                                ? "#4f46e5"
                                : "#6b7280",
                            fontWeight: 600,
                          }}
                        >
                          {msg.meta?.useKnowledgeVault
                            ? "Knowledge Vault"
                            : "General AI"}
                        </span>
                      )}

                    </div>

                    <div className="message-bubble markdown-content">
                      {/* {msg.text} */}
                      {isAIMessage ? (
                        <Markdown>
                          {msg.text}
                        </Markdown>) : msg.text}
                    </div>

                    {isAIMessage && (
                      <>
                        {msg.meta?.sources && msg.meta?.sources.length > 0 && (
                          <div
                            style={{
                              marginTop: "12px",
                              paddingTop: "10px",
                              borderTop: "1px solid #e5e7eb",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#6b7280",
                                marginBottom: "7px",
                              }}
                            >
                              Sources
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                              }}
                            >
                              {msg.meta?.sources.map((source: any, index: number) => {
                                const sourceUrl = source.url || source.uri;
                                const isWebUri =
                                  sourceUrl.startsWith("http://") ||
                                  sourceUrl.startsWith("https://");

                                return isWebUri ? (
                                  <a
                                    key={`${source.uri}-${index}`}
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "7px",
                                      width: "fit-content",
                                      padding: "6px 8px",
                                      borderRadius: "6px",
                                      background: "#f5f5ff",
                                      color: "#4f46e5",
                                      textDecoration: "none",
                                      fontSize: "12px",
                                    }}
                                  >
                                    <span aria-hidden="true">📄</span>
                                    <span>{source.title}</span>
                                  </a>
                                ) : (
                                  <div
                                    key={`${source.uri}-${index}`}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "7px",
                                      width: "fit-content",
                                      padding: "6px 8px",
                                      borderRadius: "6px",
                                      background: "#f5f5ff",
                                      color: "#4f46e5",
                                      fontSize: "12px",
                                    }}
                                    title={source.uri}
                                  >
                                    <span aria-hidden="true">📄</span>
                                    <span>{source.title}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginTop: "8px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleAIFeedback(
                                msg,
                                "up"
                              )
                            }
                            aria-label="Helpful response"
                            title="Helpful"
                            style={{
                              border: "none",
                              background:
                                msg.meta?.feedback === "up"
                                  ? "#eef2ff"
                                  : "transparent",
                              color:
                                msg.meta?.feedback === "up"
                                  ? "#6366f1"
                                  : "#6b7280",
                              padding: "6px",
                              borderRadius: "7px",
                              cursor: "pointer",
                            }}
                          >
                            <ThumbsUp size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleAIFeedback(
                                msg,
                                "down"
                              )
                            }
                            aria-label="Unhelpful response"
                            title="Not helpful"
                            style={{
                              border: "none",
                              background:
                                msg.meta?.feedback === "down"
                                  ? "#fef2f2"
                                  : "transparent",
                              color:
                                msg.meta?.feedback === "down"
                                  ? "#dc2626"
                                  : "#6b7280",
                              padding: "6px",
                              borderRadius: "7px",
                              cursor: "pointer",
                            }}
                          >
                            <ThumbsDown size={15} />
                          </button>
                        </div>
                      </>
                    )}

                  </div>

                </div>
              );
            })

          )}

          {aiThinking && (
            <div
              style={{
                // maxWidth: "900px",
                width: "100%",
                margin: "0 auto 18px",
                display: "flex",
                gap: "12px",
                alignItems: "center",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  minWidth: "34px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#eef2ff",
                  color: "#6366f1",
                }}
              >
                <Sparkles size={17} />
              </div>

              <span>
                AI Assistant is thinking...
              </span>

              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  gap: "3px",
                }}
              >
                <span>•</span>
                <span>•</span>
                <span>•</span>
              </span>
            </div>
          )}

          {/* Always keep this as the last element */}
          <div ref={messagesEndRef} />
        </div>

        {/* ============================
            MESSAGE INPUT
        ============================ */}

        <div className="message-input-area">

          {/* ============================
              AI MODE SELECTOR
          ============================ */}

          <div
            style={{
              // maxWidth: "900px",
              width: "100%",
              margin: "0 auto 8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <button
              type="button"
              onClick={() => setUseKnowledgeVault(false)}
              disabled={aiThinking || sending}
              style={{
                border: "1px solid #dfe3f0",
                borderRadius: "8px",
                padding: "6px 10px",
                background:
                  !useKnowledgeVault
                    ? "#eef2ff"
                    : "#ffffff",
                color:
                  !useKnowledgeVault
                    ? "#4f46e5"
                    : "#6b7280",
                fontSize: "12px",
                fontWeight: 600,
                cursor:
                  aiThinking || sending
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              ✨ General AI
            </button>

            <button
              type="button"
              onClick={() => setUseKnowledgeVault(true)}
              disabled={aiThinking || sending}
              style={{
                border: "1px solid #dfe3f0",
                borderRadius: "8px",
                padding: "6px 10px",
                background:
                  useKnowledgeVault
                    ? "#eef2ff"
                    : "#ffffff",
                color:
                  useKnowledgeVault
                    ? "#4f46e5"
                    : "#6b7280",
                fontSize: "12px",
                fontWeight: 600,
                cursor:
                  aiThinking || sending
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              📚 Knowledge Vault
            </button>

            <span
              style={{
                marginLeft: "4px",
                fontSize: "11px",
                color: "#8a94a6",
              }}
            >
              {useKnowledgeVault
                ? "Answers can use uploaded documents"
                : "Ask Gemini anything"}
            </span>

            {/* KNOWLEDGE DOCUMENT */}
            {useKnowledgeVault && knowledgeDocument && (
              <div className="file-attachment">
                <FileText className="file-icon" size={18} />
                <span>{knowledgeDocument.name}</span>

                <button
                  className="file-remove"
                  onClick={() => setKnowledgeDocument(null)}
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>

          <div className="message-input-wrapper">

            <input
              className="message-input"
              type="text"
              placeholder={
                inputPlaceholder
              }
              value={message}
              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }
              onKeyDown={handleKeyDown}
              disabled={sending || aiThinking}
            />

            {useKnowledgeVault && (
              <button
                className="upload-button"
                type="button"
                onClick={handleUploadClick}
                disabled={
                  aiThinking ||
                  sending
                }
              >
                <Upload size={18} strokeWidth={2} />
                <span>Upload</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAskAI}
              disabled={
                !message.trim() ||
                aiThinking ||
                sending
              }
              aria-label="Ask AI"
              title="Ask Gemini"
              style={{
                height: "36px",
                padding: "0 13px",
                borderRadius: "8px",
                border: "1px solid #dfe3f0",
                background:
                  message.trim() && !aiThinking
                    ? "#ffffff"
                    : "#f5f6f8",
                color:
                  message.trim() && !aiThinking
                    ? "#6366f1"
                    : "#9ca3af",
                cursor:
                  message.trim() && !aiThinking
                    ? "pointer"
                    : "not-allowed",
                fontWeight: 600,
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Sparkles size={15} />
              {aiThinking ? "Thinking..." : "Ask AI"}
            </button>

            <button
              type="button"
              className="send-button"
              onClick={handleSend}
              disabled={
                !message.trim() ||
                sending
              }
              aria-label="Send message"
            >
              <Send size={17} />
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}