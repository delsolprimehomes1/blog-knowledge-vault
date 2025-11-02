import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Download, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/utils/analytics";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-new.png";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();

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

  // Prefetch blog articles on hover for instant loading
  const handleBlogHover = () => {
    queryClient.prefetchQuery({
      queryKey: ["blog-articles", "all", "all", "", 1],
      queryFn: async () => {
        const { data, count } = await supabase
          .from("blog_articles")
          .select(`
            id,
            slug,
            headline,
            category,
            language,
            featured_image_url,
            date_published,
            status,
            meta_description,
            funnel_stage,
            read_time,
            authors!blog_articles_author_id_fkey(name, photo_url)
          `, { count: 'exact' })
          .eq("status", "published")
          .order("date_published", { ascending: false })
          .range(0, 8);
        
        return { articles: data, total: count || data?.length || 0 };
      },
    });
  };

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
            to="/"
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
              to="/blog"
              onMouseEnter={handleBlogHover}
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg font-medium text-sm md:text-base",
                "transition-all duration-200",
                isActive("/blog")
                  ? "text-primary bg-primary/10"
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              )}
            >
              Blog
            </NavLink>

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

            <NavLink
              to="/faq"
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg font-medium text-sm md:text-base",
                "transition-all duration-200",
                isActive("/faq")
                  ? "text-primary bg-primary/10"
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              )}
            >
              FAQ
            </NavLink>

            <NavLink
              to="/qa"
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg font-medium text-sm md:text-base",
                "transition-all duration-200",
                isActive("/qa")
                  ? "text-primary bg-primary/10"
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              )}
            >
              Q&A
            </NavLink>

            <NavLink
              to="/case-studies"
              className={cn(
                "px-4 md:px-6 py-2 rounded-lg font-medium text-sm md:text-base",
                "transition-all duration-200",
                isActive("/case-studies")
                  ? "text-primary bg-primary/10"
                  : "text-foreground/70 hover:text-primary hover:bg-primary/5"
              )}
            >
              Case Studies
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
                  to="/blog"
                  onMouseEnter={handleBlogHover}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg font-medium text-lg",
                    "transition-all duration-200",
                    isActive("/blog")
                      ? "text-primary bg-primary/10"
                      : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                  )}
                >
                  Blog
                </NavLink>

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

                <NavLink
                  to="/faq"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg font-medium text-lg",
                    "transition-all duration-200",
                    isActive("/faq")
                      ? "text-primary bg-primary/10"
                      : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                  )}
                >
                  FAQ
                </NavLink>

                <NavLink
                  to="/qa"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg font-medium text-lg",
                    "transition-all duration-200",
                    isActive("/qa")
                      ? "text-primary bg-primary/10"
                      : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                  )}
                >
                  Q&A
                </NavLink>

                <NavLink
                  to="/case-studies"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg font-medium text-lg",
                    "transition-all duration-200",
                    isActive("/case-studies")
                      ? "text-primary bg-primary/10"
                      : "text-foreground/70 hover:text-primary hover:bg-primary/5"
                  )}
                >
                  Case Studies
                </NavLink>

                <Button
                  type="button"
                  onClick={(e) => {
                    handleDownload(e);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full px-6 py-3 rounded-full font-semibold text-base",
                    "bg-gradient-to-r from-primary to-[hsl(42_58%_50%)]",
                    "text-white shadow-md shadow-primary/30",
                    "hover:shadow-xl hover:scale-105 hover:shadow-primary/40",
                    "transition-all duration-300",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <Download className="w-5 h-5" />
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
