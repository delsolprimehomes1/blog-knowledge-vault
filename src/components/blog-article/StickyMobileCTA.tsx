import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Phone, X } from "lucide-react";

export const StickyMobileCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (scrollPosition > 1000) {
        setHasScrolled(true);
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible || !hasScrolled) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 animate-slide-in-up pb-safe">
      <div className="glass border-t-2 border-white/30 shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 p-5">
        <button
          onClick={() => {
            setIsVisible(false);
            setHasScrolled(false);
          }}
          className="absolute top-3 right-3 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <div className="flex gap-3">
          <Button
            asChild
            className="flex-1 ripple-container bg-gradient-to-r from-primary to-[hsl(42_58%_50%)] text-white rounded-full px-6 py-4 font-bold shadow-xl shadow-primary/40 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 min-h-[56px]"
          >
            <a href="/properties?near=malaga-airport">
              <Home className="h-5 w-5 mr-2" />
              <span>Explore Homes</span>
            </a>
          </Button>
          
          <Button
            asChild
            variant="outline"
            className="flex-1 border-2 border-primary text-primary rounded-full px-5 py-3 font-bold hover:bg-primary/10 hover:scale-[1.02] active:scale-95 transition-all duration-300 min-h-[56px]"
          >
            <a href="/contact">
              <Phone className="h-5 w-5 mr-2" />
              <span>Talk to Us</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};