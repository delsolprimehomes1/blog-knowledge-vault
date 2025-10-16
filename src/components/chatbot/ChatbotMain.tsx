import { useState } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "./ChatWindow";
import { useChatbot } from "./useChatbot";

interface ChatbotMainProps {
  articleSlug: string;
  language: string;
}

const ChatbotMain = ({ articleSlug, language }: ChatbotMainProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const chatbot = useChatbot(articleSlug, language);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl animate-pulse hover:animate-none z-50"
          size="icon"
        >
          <MessageCircle className="h-7 w-7" />
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full border-2 border-white" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-6 right-6 w-full max-w-[400px] h-[600px] md:w-[400px] md:h-[600px] bg-background border rounded-lg shadow-2xl flex flex-col z-50 md:max-h-[600px] max-h-screen">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
            <h3 className="font-semibold">Chat with Del Sol Homes Expert</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ChatWindow chatbot={chatbot} />

          {/* Powered by AI badge */}
          <div className="text-center text-xs text-muted-foreground py-2 border-t">
            Powered by AI
          </div>
        </div>
      )}

      {/* Minimized indicator */}
      {isOpen && isMinimized && (
        <Button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-6 shadow-lg z-50"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Chat
        </Button>
      )}
    </>
  );
};

export default ChatbotMain;
