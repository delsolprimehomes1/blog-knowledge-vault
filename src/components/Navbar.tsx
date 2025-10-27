import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Download, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/utils/analytics";
import { toast } from "sonner";
import logo from "@/assets/logo-new.png";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDownload = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    try {
      toast.loading("Preparing your download...", { id: "pdf-download" });
      
      // Fetch the PDF as a blob
      const response = await fetch('/buyers-guide.pdf');
      if (!response.ok) {
        console.error('PDF file not found');
        toast.error("Download failed. Please try again.", { id: "pdf-download" });
        return;
      }
      
      // Create blob URL for download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = "Costa-Del-Sol-Property-Buyers-Guide-2025.pdf";
      document.body.appendChild(link);
      link.click();
      
      // Fallback: open in new tab if download doesn't work (e.g., in preview)
      setTimeout(() => {
        if (document.contains(link)) {
          window.open(url, '_blank');
        }
      }, 100);
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download started!", { id: "pdf-download" });

      trackEvent("download", {
        file_name: "buyers-guide",
        source: "navbar",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast.error("Download failed. Please try again.", { id: "pdf-download" });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 animate-slide-down",
        "border-b backdrop-blur-lg",
        isScrolled
          ? "bg-background/95 shadow-lg border-border"
          : "bg-background/80 shadow-md border-border/50"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link
            to="/blog"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <img
              src={logo}
              alt="Del Sol Prime Homes"
              className="h-10 md:h-12"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <NavLink
              to="/about"
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg font-medium text-sm md:text-base",
                "transition-all duration-200",
                isActive("/about")
                  ? "text-primary bg-primary/10"
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              )}
            >
              About
            </NavLink>

            <Button
              type="button"
              onClick={handleDownload}
              className={cn(
                "px-6 py-2.5 rounded-full font-semibold text-sm md:text-base",
                "bg-gradient-to-r from-primary to-[hsl(42_58%_50%)]",
                "text-white shadow-md shadow-primary/30",
                "hover:shadow-xl hover:scale-105 hover:shadow-primary/40",
                "transition-all duration-300",
                "flex items-center gap-2"
              )}
            >
              <Download className="w-4 h-4" />
              Download Buyers Guide
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Toggle mobile menu"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                <NavLink
                  to="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg font-medium text-lg",
                    "transition-all duration-200",
                    isActive("/about")
                      ? "text-primary bg-primary/10"
                      : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                  )}
                >
                  About
                </NavLink>

                <Button
                  type="button"
                  onClick={(e) => {
                    handleDownload(e);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "relative w-full px-6 py-4 rounded-2xl font-bold text-base overflow-hidden group",
                    "backdrop-blur-xl bg-white/10 dark:bg-black/10",
                    "before:absolute before:inset-0 before:rounded-2xl",
                    "before:bg-gradient-to-r before:from-primary/90 before:via-[hsl(42_58%_50%)]/90 before:to-primary/90",
                    "before:bg-[length:200%_100%] before:transition-all before:duration-700",
                    "hover:before:bg-[position:100%_0]",
                    "after:absolute after:inset-0 after:rounded-2xl after:p-[2px]",
                    "after:bg-gradient-to-r after:from-primary after:via-[hsl(42_58%_65%)] after:to-primary",
                    "after:bg-[length:200%_100%] after:animate-shimmer",
                    "after:-z-10",
                    "text-white relative z-10 tracking-wide",
                    "shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
                    "hover:shadow-[0_8px_40px_rgba(255,183,3,0.4),0_0_20px_rgba(255,183,3,0.3)]",
                    "dark:shadow-[0_8px_30px_rgba(255,183,3,0.2)]",
                    "dark:hover:shadow-[0_8px_50px_rgba(255,183,3,0.5),0_0_30px_rgba(255,183,3,0.4)]",
                    "transition-all duration-500 ease-out",
                    "active:scale-95 active:shadow-[0_4px_20px_rgba(255,183,3,0.3)]",
                    "hover:scale-[1.02] hover:-translate-y-0.5",
                    "flex items-center justify-center gap-3"
                  )}
                >
                  <Download className={cn(
                    "w-5 h-5 transition-all duration-300 ease-out",
                    "group-hover:animate-bounce group-active:scale-90"
                  )} />
                  Download Buyers Guide
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
