import { useEffect, useState } from "react";
import {
  Bot,
  ChevronDown,
  FileText,
  Hash,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Users,
  X,
  Sparkles,
  Code2,
  BriefcaseBusiness,
  PenLine,
  BarChart3,
} from "lucide-react";

import {
  createChannel,
  initializeDefaultChannels,
  subscribeToChannels,
  type Channel,
} from "../../../services/channelService";

import { logoutUser } from "../../../services/authService";
import { useAuth } from "../../../context/AuthContext";
import { uploadKnowledgeDocument } from "../../../services/knowledgeService";

import {
  subscribeToUsers,
  type AppUser,
} from "../../../services/userService";

export type AIPersona =
  | "General Assistant"
  | "Code Expert"
  | "Project Manager"
  | "Technical Writer"
  | "Data Analyst";

interface SidebarProps {
  onSelectUser?: (user: AppUser) => void;
  onSelectGeneral?: () => void;
  onSelectChannel?: (channel: Channel) => void;
  onAskGemini?: () => void;
  onPromptSelect?: (prompt: string) => void;
  onPersonaSelect?: (persona: AIPersona) => void;
}

export default function Sidebar({
  onSelectUser,
  onSelectGeneral,
  onSelectChannel,
  onAskGemini,
  onPromptSelect,
  onPersonaSelect,
}: SidebarProps) {
  const { user } = useAuth();

  /* ============================
     USERS
  ============================ */

  const [users, setUsers] = useState<AppUser[]>([]);

  /* ============================
     CHANNELS
  ============================ */

  const [channels, setChannels] = useState<Channel[]>([]);

  /* ============================
     CHANNEL MODAL STATE
  ============================ */

  const [channelState, setChannelState] = useState({
    showCreateChannel: false,
    channelName: "",
    channelDescription: "",
    channelError: "",
    creatingChannel: false,
  });

  /* ============================
     LOAD USERS
  ============================ */

  useEffect(() => {
    const unsubscribe = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
    });

    return () => unsubscribe();
  }, []);

  /* ============================
     LOAD CHANNELS
  ============================ */

  useEffect(() => {
    const unsubscribe = subscribeToChannels((updatedChannels) => {
      setChannels(updatedChannels);
    });

    return () => unsubscribe();
  }, []);

  /* ============================
     INITIALIZE DEFAULT CHANNELS
  ============================ */

  useEffect(() => {
    if (!user) return;

    initializeDefaultChannels(user.uid).catch((error) => {
      console.error("Error initializing channels:", error);
    });
  }, [user]);

  /* ============================
     HELPERS
  ============================ */

  const getInitial = (
    value: string | null | undefined
  ) => {
    return value?.charAt(0).toUpperCase() || "U";
  };

  const otherUsers = users.filter(
    (otherUser) => otherUser.uid !== user?.uid
  );

  /* ============================
     CREATE CHANNEL
  ============================ */

  const handleCreateChannel = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!user) return;

    const name = channelState.channelName.trim();
    const description =
      channelState.channelDescription.trim();

    /* Clear previous error */
    setChannelState((prev) => ({
      ...prev,
      channelError: "",
    }));

    /* Validate name */
    if (!name) {
      setChannelState((prev) => ({
        ...prev,
        channelError:
          "Please enter a channel name.",
      }));

      return;
    }

    try {
      setChannelState((prev) => ({
        ...prev,
        creatingChannel: true,
      }));

      await createChannel(
        name,
        description,
        user.uid
      );

      /* Reset modal */
      setChannelState({
        showCreateChannel: false,
        channelName: "",
        channelDescription: "",
        channelError: "",
        creatingChannel: false,
      });
    } catch (error: any) {
      console.error(
        "Error creating channel:",
        error
      );

      setChannelState((prev) => ({
        ...prev,
        channelError:
          error?.message ||
          "Unable to create channel.",
        creatingChannel: false,
      }));
    }
  };

  /* ============================
     OPEN CREATE CHANNEL MODAL
  ============================ */

  const openCreateChannelModal = () => {
    setChannelState((prev) => ({
      ...prev,
      showCreateChannel: true,
      channelError: "",
    }));
  };

  /* ============================
     CLOSE CREATE CHANNEL MODAL
  ============================ */

  const closeCreateChannelModal = () => {
    if (channelState.creatingChannel) return;

    setChannelState((prev) => ({
      ...prev,
      showCreateChannel: false,
      channelError: "",
    }));
  };

  /* ============================
     CHANNEL NAME CHANGE
  ============================ */

  const handleChannelNameChange = (
    value: string
  ) => {
    setChannelState((prev) => ({
      ...prev,
      channelName: value,
      channelError: "",
    }));
  };

  /* ============================
     CHANNEL DESCRIPTION CHANGE
  ============================ */

  const handleChannelDescriptionChange = (
    value: string
  ) => {
    setChannelState((prev) => ({
      ...prev,
      channelDescription: value,
    }));
  };

  /* ============================
     AI TOOLS STATE
  ============================ */

  const [showPromptGallery, setShowPromptGallery] =
    useState(false);

  const [showPersonaPicker, setShowPersonaPicker] =
    useState(false);

  const [showKnowledgeVault, setShowKnowledgeVault] =
    useState(false);

  const [knowledgeFile, setKnowledgeFile] =
    useState<File | null>(null);

  const [knowledgeProgress, setKnowledgeProgress] =
    useState(0);

  const [knowledgeUploading, setKnowledgeUploading] =
    useState(false);

  const [knowledgeStatus, setKnowledgeStatus] =
    useState("");

  const [selectedPersona, setSelectedPersona] =
    useState<AIPersona>("General Assistant");

  const promptGroups = [
    {
      label: "Summarize",
      prompt:
        "Summarize the following text in concise bullet points:",
    },
    {
      label: "Brainstorm",
      prompt:
        "Brainstorm practical ideas for the following topic:",
    },
    {
      label: "Explain code",
      prompt:
        "Explain the following code step by step and suggest improvements:",
    },
    {
      label: "Write email",
      prompt:
        "Write a professional email about the following:",
    },
    {
      label: "Analyze data",
      prompt:
        "Analyze the following data and highlight key insights:",
    },
    {
      label: "Action items",
      prompt:
        "Turn the following discussion into clear action items with owners and priorities:",
    },
  ];

  const personas: {
    name: AIPersona;
    description: string;
    icon: typeof Bot;
  }[] = [
    {
      name: "General Assistant",
      description: "Helpful everyday AI assistant",
      icon: Sparkles,
    },
    {
      name: "Code Expert",
      description: "Coding, debugging and architecture",
      icon: Code2,
    },
    {
      name: "Project Manager",
      description: "Plans, tasks and project execution",
      icon: BriefcaseBusiness,
    },
    {
      name: "Technical Writer",
      description: "Clear technical documentation",
      icon: PenLine,
    },
    {
      name: "Data Analyst",
      description: "Data interpretation and insights",
      icon: BarChart3,
    },
  ];

  const handlePersonaSelect = (persona: AIPersona) => {
    setSelectedPersona(persona);
    setShowPersonaPicker(false);
    onPersonaSelect?.(persona);
    onAskGemini?.();
  };

  const handlePromptSelect = (prompt: string) => {
    setShowPromptGallery(false);
    onPromptSelect?.(prompt);
    onAskGemini?.();
  };

  const handleKnowledgeUpload = async () => {
    if (!user || !knowledgeFile || knowledgeUploading) {
      return;
    }

    try {
      setKnowledgeUploading(true);
      setKnowledgeProgress(0);
      setKnowledgeStatus("Uploading document...");

      await uploadKnowledgeDocument(
        knowledgeFile,
        user.uid,
        (progress) => setKnowledgeProgress(progress)
      );

      setKnowledgeStatus(
        "Uploaded successfully. Ingestion is pending."
      );
      setKnowledgeFile(null);
    } catch (error) {
      console.error(
        "Knowledge Vault upload failed:",
        error
      );
      setKnowledgeStatus(
        "Upload failed. Please try again."
      );
    } finally {
      setKnowledgeUploading(false);
    }
  };

  /* ============================
     RENDER
  ============================ */

  return (
    <aside className="sidebar">

      {/* ============================
          WORKSPACE HEADER
      ============================ */}

      <div className="sidebar-header">
        <button
          type="button"
          className="workspace-button"
        >
          <div className="brand-icon">
            <MessageCircle size={17} />
          </div>

          <div className="workspace-info">
            <span className="brand-text">
              AI Collaboration
            </span>

            <span className="workspace-label">
              Workspace
            </span>
          </div>

          <ChevronDown
            size={15}
            className="workspace-chevron"
          />
        </button>
      </div>

      <div className="sidebar-content">

        {/* ============================
            SEARCH
        ============================ */}

        <button
          type="button"
          className="sidebar-search"
        >
          <Search size={16} />

          <span>Search</span>

          <kbd>/</kbd>
        </button>

        {/* ============================
            CHANNELS
        ============================ */}

        <div className="sidebar-section">

          <div className="sidebar-section-header">
            <span className="sidebar-section-title">
              Channels
            </span>

            <button
              type="button"
              className="section-action"
              aria-label="Add channel"
              onClick={openCreateChannelModal}
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="sidebar-items">

            {channels.map((channel) => (
              <button
                type="button"
                key={channel.id}
                className="sidebar-item"
                onClick={() =>
                  onSelectChannel?.(channel)
                }
              >
                <Hash size={17} />

                <span>
                  {channel.name}
                </span>
              </button>
            ))}

          </div>
        </div>

        {/* ============================
            DIRECT MESSAGES
        ============================ */}

        <div className="sidebar-section">

          <div className="sidebar-section-header">
            <span className="sidebar-section-title">
              Direct Messages
            </span>

            <button
              type="button"
              className="section-action"
              aria-label="New message"
            >
              <Plus size={14} />
            </button>
          </div>

          {otherUsers.length === 0 ? (
            <div className="no-users">
              No other users yet
            </div>
          ) : (
            otherUsers.map((otherUser) => (
              <button
                type="button"
                className="sidebar-item"
                key={otherUser.uid}
                onClick={() =>
                  onSelectUser?.(otherUser)
                }
              >
                <span className="presence-avatar">
                  {getInitial(otherUser.name)}
                </span>

                <span className="sidebar-item-text">
                  {otherUser.name ||
                    "Unnamed User"}
                </span>
              </button>
            ))
          )}
        </div>

        {/* ============================
            AI TOOLS
        ============================ */}

        <div className="sidebar-section">

          <div className="sidebar-section-header">
            <span className="sidebar-section-title">
              AI Tools
            </span>
          </div>

          <button
            type="button"
            className="sidebar-item ai-item"
            onClick={onAskGemini}
          >
            <Bot size={17} />

            <span>Ask Gemini</span>

            <span className="ai-new-badge">
              AI
            </span>
          </button>

          <button
            type="button"
            className="sidebar-item"
            onClick={() => setShowPersonaPicker(true)}
          >
            <Sparkles size={17} />

            <span>AI Persona</span>

            <span
              className="notification-badge"
              title={selectedPersona}
            >
              {selectedPersona === "General Assistant"
                ? "G"
                : selectedPersona
                    .split(" ")
                    .map((word) => word[0])
                    .join("")}
            </span>
          </button>

          <button
            type="button"
            className="sidebar-item"
            onClick={() => setShowPromptGallery(true)}
          >
            <Bot size={17} />

            <span>Prompt Gallery</span>
          </button>

          <button
            type="button"
            className="sidebar-item"
            onClick={() => setShowKnowledgeVault(true)}
          >
            <FileText size={17} />

            <span>Knowledge Vault</span>

            <span className="notification-badge">
              3
            </span>
          </button>

        </div>

        {/* ============================
            WORKSPACE
        ============================ */}

        <div className="sidebar-section">

          <div className="sidebar-section-header">
            <span className="sidebar-section-title">
              Workspace
            </span>
          </div>

          <button
            type="button"
            className="sidebar-item"
          >
            <Users size={17} />

            <span>Team Members</span>
          </button>

          <button
            type="button"
            className="sidebar-item"
          >
            <Settings size={17} />

            <span>Settings</span>
          </button>

        </div>

      </div>

      {/* ============================
          USER PROFILE
      ============================ */}

      <div className="sidebar-footer">

        <div className="user-profile">

          <div className="avatar">
            {getInitial(
              user?.displayName ||
                user?.email
            )}
          </div>

          <div className="user-details">

            <div className="user-name">
              {user?.displayName ||
                user?.email}
            </div>

            <div className="user-email">
              <span className="profile-status-dot" />
              Online
            </div>

          </div>

          <button
            type="button"
            className="profile-menu-button"
            aria-label="Profile menu"
          >
            <ChevronDown size={15} />
          </button>

        </div>

        <button
          type="button"
          className="logout-button"
          onClick={logoutUser}
        >
          <LogOut size={15} />

          <span>Sign out</span>
        </button>

      </div>

      {/* ============================
          AI PERSONA MODAL
      ============================ */}

      {showPersonaPicker && (
        <div
          className="modal-overlay"
          onClick={() => setShowPersonaPicker(false)}
        >
          <div
            className="create-channel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Choose AI Persona</h2>
                <p>
                  Select how Gemini should approach your request.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowPersonaPicker(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="create-channel-form">
              {personas.map((persona) => {
                const Icon = persona.icon;

                return (
                  <button
                    key={persona.name}
                    type="button"
                    onClick={() =>
                      handlePersonaSelect(persona.name)
                    }
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px",
                      marginBottom: "8px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      background:
                        selectedPersona === persona.name
                          ? "#eef2ff"
                          : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Icon size={18} />

                    <span>
                      <strong style={{ display: "block" }}>
                        {persona.name}
                      </strong>
                      <small>{persona.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================
          PROMPT GALLERY MODAL
      ============================ */}

      {showPromptGallery && (
        <div
          className="modal-overlay"
          onClick={() => setShowPromptGallery(false)}
        >
          <div
            className="create-channel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Prompt Gallery</h2>
                <p>
                  Start with a ready-to-use AI prompt.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowPromptGallery(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="create-channel-form">
              {promptGroups.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    handlePromptSelect(item.prompt)
                  }
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    marginBottom: "8px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    background: "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                  <span
                    style={{
                      display: "block",
                      marginTop: "4px",
                      fontSize: "12px",
                      fontWeight: 400,
                      color: "#6b7280",
                    }}
                  >
                    {item.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================
          KNOWLEDGE VAULT MODAL
      ============================ */}

      {showKnowledgeVault && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!knowledgeUploading) {
              setShowKnowledgeVault(false);
              setKnowledgeFile(null);
              setKnowledgeProgress(0);
              setKnowledgeStatus("");
            }
          }}
        >
          <div
            className="create-channel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Knowledge Vault</h2>
                <p>
                  Upload documents for future AI knowledge-base ingestion.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                disabled={knowledgeUploading}
                onClick={() => {
                  setShowKnowledgeVault(false);
                  setKnowledgeFile(null);
                  setKnowledgeProgress(0);
                  setKnowledgeStatus("");
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="create-channel-form">
              <div className="form-group">
                <label>
                  Document
                </label>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.csv"
                  disabled={knowledgeUploading}
                  onChange={(e) =>
                    setKnowledgeFile(
                      e.target.files?.[0] || null
                    )
                  }
                />
              </div>

              {knowledgeFile && (
                <div
                  style={{
                    padding: "12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "13px",
                  }}
                >
                  <strong>{knowledgeFile.name}</strong>
                  <div
                    style={{
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    {(knowledgeFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              )}

              {knowledgeUploading && (
                <div>
                  <div
                    style={{
                      height: "7px",
                      background: "#e5e7eb",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${knowledgeProgress}%`,
                        height: "100%",
                        background: "#6366f1",
                        transition: "width .2s ease",
                      }}
                    />
                  </div>

                  <small>
                    Uploading {knowledgeProgress}%
                  </small>
                </div>
              )}

              {knowledgeStatus && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "#f5f7ff",
                    color: "#4b5563",
                    fontSize: "13px",
                  }}
                >
                  {knowledgeStatus}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel"
                  disabled={knowledgeUploading}
                  onClick={() => {
                    setShowKnowledgeVault(false);
                    setKnowledgeFile(null);
                    setKnowledgeProgress(0);
                    setKnowledgeStatus("");
                  }}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="modal-create"
                  disabled={
                    !knowledgeFile ||
                    knowledgeUploading
                  }
                  onClick={handleKnowledgeUpload}
                >
                  {knowledgeUploading
                    ? "Uploading..."
                    : "Upload to Vault"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================
          CREATE CHANNEL MODAL
      ============================ */}

      {channelState.showCreateChannel && (
        <div
          className="modal-overlay"
          onClick={closeCreateChannelModal}
        >
          <div
            className="create-channel-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>
                <h2>Create a channel</h2>

                <p>
                  Create a space for your team
                  to collaborate.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  closeCreateChannelModal
                }
                aria-label="Close"
              >
                <X size={18} />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleCreateChannel}
              className="create-channel-form"
            >

              {/* CHANNEL NAME */}

              <div className="form-group">

                <label>
                  Channel name
                </label>

                <div className="channel-name-input">

                  <Hash size={17} />

                  <input
                    type="text"
                    placeholder="e.g. Marketing"
                    value={
                      channelState.channelName
                    }
                    onChange={(e) =>
                      handleChannelNameChange(
                        e.target.value
                      )
                    }
                    autoFocus
                  />

                </div>

              </div>

              {/* DESCRIPTION */}

              <div className="form-group">

                <label>
                  Description
                  <span>Optional</span>
                </label>

                <input
                  className="channel-description-input"
                  type="text"
                  placeholder="What is this channel about?"
                  value={
                    channelState.channelDescription
                  }
                  onChange={(e) =>
                    handleChannelDescriptionChange(
                      e.target.value
                    )
                  }
                />

              </div>

              {/* ERROR */}

              {channelState.channelError && (
                <div className="channel-error">
                  {channelState.channelError}
                </div>
              )}

              {/* ACTIONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="modal-cancel"
                  onClick={
                    closeCreateChannelModal
                  }
                  disabled={
                    channelState.creatingChannel
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-create"
                  disabled={
                    channelState.creatingChannel
                  }
                >
                  {channelState.creatingChannel
                    ? "Creating..."
                    : "Create channel"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </aside>
  );
}