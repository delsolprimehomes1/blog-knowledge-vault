import { useState, useEffect } from "react";
import { MessageCircle, Phone, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FunnelStage } from "@/types/blog";
import { Button } from "@/components/ui/button";

interface FloatingCTAProps {
  funnelStage: FunnelStage;
  articleSlug?: string;
}

export const FloatingCTA = ({ funnelStage, articleSlug }: FloatingCTAProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if CTA was dismissed in this session
    const dismissedKey = `floating-cta-dismissed-${articleSlug || 'global'}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setIsDismissed(true);
      return;
    }

    // Show CTA after scrolling 500px
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, [articleSlug]);

  const handleDismiss = () => {
    const dismissedKey = `floating-cta-dismissed-${articleSlug || 'global'}`;
    sessionStorage.setItem(dismissedKey, "true");
    setIsDismissed(true);
  };

  const handleClick = () => {
    if (funnelStage === "BOFU") {
      navigate("/contact?type=consultation");
    } else {
      // For TOFU/MOFU - open chatbot or navigate to contact
      navigate("/contact");
    }
  };

  // Don't show floating CTA on BOFU pages
  if (funnelStage === "BOFU") return null;

  if (isDismissed || !isVisible) return null;

  return (
    <div
      className="
        hidden md:block fixed bottom-8 right-8 z-50
        animate-slide-in-right
      "
    >
      <div className="relative group">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 z-10 bg-background border border-border rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
          aria-label="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>

        {/* TOFU/MOFU: Subtle & Supportive */}
        <Button
          onClick={handleClick}
          className="
            px-5 py-3 rounded-full
            bg-white/80 dark:bg-gray-900/80 
            backdrop-blur-sm 
            border border-primary/20
            text-foreground
            shadow-lg hover:shadow-xl
            transition-all duration-300
            hover:scale-105
            hover:border-primary/40
          "
          size="lg"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">Chat with Expert Now</span>
        </Button>
      </div>
    </div>
  );
};
