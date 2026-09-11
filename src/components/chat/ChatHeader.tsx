import {
  Hash,
  Sparkles,
  UserRound,
} from "lucide-react";

interface ChatHeaderProps {
  title: string;
  description: string;
  isDirectMessage?: boolean;
}

export default function ChatHeader({
  title,
  description,
  isDirectMessage = false,
}: ChatHeaderProps) {
  return (
    <header className="chat-header">

      <div className="chat-title">

        <div className="chat-title-icon">

          {isDirectMessage ? (
            <UserRound size={19} />
          ) : (
            <Hash size={19} />
          )}

        </div>

        <div>

          <h2>
            {title}
          </h2>

          <p>
            {description}
          </p>

        </div>

      </div>


      <div className="chat-header-actions">

        <button className="ai-persona-button">

          <Sparkles size={15} />

          <span>
            AI Assistant
          </span>

          <span className="coming-soon">
            Soon
          </span>

        </button>


        <div className="status">

          <span className="status-dot" />

          Online

        </div>

      </div>

    </header>
  );
}