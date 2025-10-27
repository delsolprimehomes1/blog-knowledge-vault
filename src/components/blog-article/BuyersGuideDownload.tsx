import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { FunnelStage } from "@/types/blog";
import { Button } from "@/components/ui/button";

interface BuyersGuideDownloadProps {
  funnelStage: FunnelStage;
  articleSlug?: string;
}

export const BuyersGuideDownload = ({ funnelStage, articleSlug }: BuyersGuideDownloadProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show on TOFU pages
  if (funnelStage !== "TOFU") return null;

  useEffect(() => {
    // Check if user has dismissed this before
    const storageKey = `buyers-guide-dismissed-${articleSlug || 'global'}`;
    const dismissed = sessionStorage.getItem(storageKey);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show button after scrolling 500px
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [articleSlug]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    const storageKey = `buyers-guide-dismissed-${articleSlug || 'global'}`;
    sessionStorage.setItem(storageKey, "true");
    setIsDismissed(true);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/buyers-guide.pdf';
    link.download = 'Costa-Del-Sol-Property-Buyers-Guide-2025.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isDismissed || !isVisible) return null;

  return (
    <div className="hidden md:block fixed right-8 top-1/2 -translate-y-1/2 z-50 animate-slide-in-right">
      <div className="relative group">
        {/* Dismiss button (appears on hover) */}
        <button
          onClick={handleDismiss}
          className="
            absolute -top-2 -right-2 z-10
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            w-6 h-6 rounded-full
            bg-gray-800 text-white
            flex items-center justify-center
            hover:bg-gray-700
          "
          aria-label="Dismiss download guide"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Download button with vertical text */}
        <Button
          onClick={handleDownload}
          className="
            flex flex-row items-center gap-3
            px-6 py-4 rounded-full
            bg-gray-900
            text-white font-bold text-sm tracking-wide
            shadow-xl shadow-black/30
            hover:shadow-2xl hover:scale-[1.03]
            transition-all duration-300
          "
          size="lg"
        >
          <span>Download Guide</span>
          <Download className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
