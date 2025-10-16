interface Message {
  text: string;
  isBot: boolean;
  timestamp: Date;
  quickReplies?: Array<{ label: string; value: string }>;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          message.isBot
            ? "bg-accent text-accent-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        <p className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
};
