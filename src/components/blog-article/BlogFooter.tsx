import { MapPin, Phone, Mail, Home, BookOpen, Users, MessageSquare, Facebook, Twitter, Instagram, Linkedin, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const BlogFooter = () => {
  const { elementRef, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer ref={elementRef as React.RefObject<HTMLElement>} className="relative mt-8 overflow-hidden">
      {/* Gradient background layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background/90" />
      
      {/* Top accent line with gradient */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="relative glass-premium">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Company Info */}
            <div className="space-y-3">
              <h3 className="text-xl font-display font-bold bg-gradient-to-r from-primary via-white to-primary bg-clip-text text-transparent">
                DelSol Prime Homes
              </h3>
              <p className="text-xs text-white/80 leading-relaxed">
                Your trusted partner for premium properties on the beautiful Costa del Sol. 
                We specialize in helping you find your dream home in Spain's most desirable coastal region.
              </p>
              <div className="flex gap-3 pt-1">
                <a href="#" className="group relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 hover-scale">
                  <Facebook className="w-3.5 h-3.5 text-white/70 group-hover:text-primary transition-colors" />
                </a>
                <a href="#" className="group relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 hover-scale">
                  <Twitter className="w-3.5 h-3.5 text-white/70 group-hover:text-primary transition-colors" />
                </a>
                <a href="#" className="group relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 hover-scale">
                  <Instagram className="w-3.5 h-3.5 text-white/70 group-hover:text-primary transition-colors" />
                </a>
                <a href="#" className="group relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 hover-scale">
                  <Linkedin className="w-3.5 h-3.5 text-white/70 group-hover:text-primary transition-colors" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white font-display">Quick Links</h3>
              <nav className="flex flex-col space-y-3">
                <Link 
                  to="/"
                  className="group flex items-center gap-3 text-sm text-white/80 hover:text-primary transition-all duration-300 hover-scale origin-left"
                >
                  <div className="p-1 rounded-md bg-white/5 group-hover:bg-primary/20 transition-colors">
                    <Home className="w-3 h-3" />
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform">Properties</span>
                </Link>
                <Link 
                  to="/blog"
                  className="group flex items-center gap-3 text-sm text-white/80 hover:text-primary transition-all duration-300 hover-scale origin-left"
                >
                  <div className="p-1 rounded-md bg-white/5 group-hover:bg-primary/20 transition-colors">
                    <BookOpen className="w-3 h-3" />
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform">Blog</span>
                </Link>
                <Link 
                  to="/"
                  className="group flex items-center gap-3 text-sm text-white/80 hover:text-primary transition-all duration-300 hover-scale origin-left"
                >
                  <div className="p-1 rounded-md bg-white/5 group-hover:bg-primary/20 transition-colors">
                    <Users className="w-3 h-3" />
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform">About Us</span>
                </Link>
                <Link 
                  to="/"
                  className="group flex items-center gap-3 text-sm text-white/80 hover:text-primary transition-all duration-300 hover-scale origin-left"
                >
                  <div className="p-1 rounded-md bg-white/5 group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform">Contact</span>
                </Link>
              </nav>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white font-display">Contact Us</h3>
              <div className="flex flex-col space-y-4">
                <div className="group flex items-start gap-3 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all duration-300">
                  <div className="p-1.5 rounded-md bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  </div>
                  <div className="text-xs">
                    <p className="text-white/80 leading-relaxed">
                      Calle Alfonso XIII, 6-1º<br />
                      Fuengirola<br />
                      Costa del Sol, Spain
                    </p>
                  </div>
                </div>

                <a 
                  href="tel:+34613578416"
                  className="group flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all duration-300 hover-scale"
                >
                  <div className="p-1.5 rounded-md bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  </div>
                  <span className="text-xs text-white/80 group-hover:text-primary transition-colors">
                    +34 613 578 416
                  </span>
                </a>

                <a 
                  href="mailto:info@delsolprimehomes.com"
                  className="group flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all duration-300 hover-scale break-all"
                >
                  <div className="p-1.5 rounded-md bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  </div>
                  <span className="text-xs text-white/80 group-hover:text-primary transition-colors">
                    info@delsolprimehomes.com
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Copyright Bar */}
          <div className="mt-6 pt-4 relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-white/60 text-center md:text-left">
                © 2025 DelSol Prime Homes. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-white/60">
                <Link to="/" className="hover:text-primary transition-colors hover-scale">
                  Privacy Policy
                </Link>
                <Link to="/" className="hover:text-primary transition-colors hover-scale">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 p-2.5 rounded-full bg-primary/90 hover:bg-primary text-white shadow-lg hover-glow transition-all duration-300 hover-scale z-50 backdrop-blur-sm border border-white/10"
        aria-label="Back to top"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </footer>
  );
};
