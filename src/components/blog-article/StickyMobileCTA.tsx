import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Phone, X } from "lucide-react";

export const StickyMobileCTA = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 animate-slide-in-up pb-safe">
      <div className="glass border-t border-white/20 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 p-4">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <div className="flex gap-3">
          <Button
            asChild
            className="flex-1 ripple-container bg-gradient-to-r from-primary to-[hsl(42_58%_50%)] text-white rounded-full px-6 py-3.5 font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <a href="/properties?near=malaga-airport">
              <Home className="h-4 w-4 mr-2" />
              <span className="text-sm">Explore Homes</span>
            </a>
          </Button>
          
          <Button
            asChild
            variant="outline"
            className="flex-1 border-2 border-primary text-primary rounded-full px-4 py-2.5 font-semibold hover:bg-primary/10 transition-all duration-300"
          >
            <a href="/contact">
              <Phone className="h-4 w-4 mr-2" />
              <span className="text-sm">Talk to Us</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};