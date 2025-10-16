import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { QuickReplies } from "./QuickReplies";
import { ContactForm } from "./ContactForm";
import { ChatbotHook } from "./useChatbot";

interface ChatWindowProps {
  chatbot: ChatbotHook;
}

export const ChatWindow = ({ chatbot }: ChatWindowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, input, setInput, sendMessage, handleQuickReply, currentStep } = chatbot;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
    }
  };

  return (
    <>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          
          {currentStep === "contact_form" && (
            <ContactForm chatbot={chatbot} />
          )}
        </div>
      </ScrollArea>

      {currentStep !== "contact_form" && currentStep !== "complete" && (
        <>
          {messages[messages.length - 1]?.quickReplies && (
            <QuickReplies
              options={messages[messages.length - 1].quickReplies!}
              onSelect={handleQuickReply}
            />
          )}

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </>
  );
};
