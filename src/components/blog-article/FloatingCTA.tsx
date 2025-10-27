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

  if (isDismissed || !isVisible) return null;

  const isBOFU = funnelStage === "BOFU";

  return (
    <div
      className={`
        hidden md:block fixed bottom-8 right-8 z-50
        animate-slide-in-right
        ${isBOFU ? 'animate-pulse-slow' : ''}
      `}
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
        {!isBOFU && (
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
        )}

        {/* BOFU: Prominent & Conversion-Focused */}
        {isBOFU && (
          <div className="relative">
            {/* Pulsing ring animation */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse" />
            
            <Button
              onClick={handleClick}
              className="
                relative
                px-6 py-4 rounded-full
                bg-gradient-to-r from-primary to-[hsl(42_58%_50%)]
                text-white font-bold text-base
                shadow-2xl shadow-primary/40
                hover:shadow-[0_20px_60px_-10px_rgba(var(--primary-rgb),0.5)]
                transition-all duration-300
                hover:scale-105
              "
              size="lg"
            >
              <Phone className="w-5 h-5" />
              <span>Schedule Free Consultation</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
