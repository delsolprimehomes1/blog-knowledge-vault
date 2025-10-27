import { MapPin, Phone, Mail, Home, BookOpen, Users, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

export const BlogFooter = () => {
  return (
    <footer className="relative mt-16 border-t border-border/40">
      <div className="glass-dark rounded-t-3xl overflow-hidden">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">DelSol Prime Homes</h3>
              <p className="text-sm text-white/90 leading-relaxed">
                Your trusted partner for premium properties on the beautiful Costa del Sol. 
                We specialize in helping you find your dream home in Spain's most desirable coastal region.
              </p>
              <div className="flex gap-3 pt-2">
                {/* Social media icons can be added here when available */}
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Quick Links</h3>
              <nav className="flex flex-col space-y-3">
                <Link 
                  to="/"
                  className="group flex items-center gap-2 text-sm text-white/90 hover:text-primary transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span className="group-hover:translate-x-1 transition-transform">Properties</span>
                </Link>
                <Link 
                  to="/blog"
                  className="group flex items-center gap-2 text-sm text-white/90 hover:text-primary transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="group-hover:translate-x-1 transition-transform">Blog</span>
                </Link>
                <Link 
                  to="/about"
                  className="group flex items-center gap-2 text-sm text-white/90 hover:text-primary transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span className="group-hover:translate-x-1 transition-transform">About Us</span>
                </Link>
                <Link 
                  to="/"
                  className="group flex items-center gap-2 text-sm text-white/90 hover:text-primary transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="group-hover:translate-x-1 transition-transform">Contact</span>
                </Link>
              </nav>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Contact Us</h3>
              <div className="flex flex-col space-y-4">
                <div className="group flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-white/90 leading-relaxed">
                      Calle Alfonso XIII, 6-1º<br />
                      Fuengirola<br />
                      Costa del Sol, Spain
                    </p>
                  </div>
                </div>

                <a 
                  href="tel:+34613578416"
                  className="group flex items-center gap-3 text-sm text-white/90 hover:text-primary transition-colors"
                >
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="group-hover:translate-x-1 transition-transform">
                    +34 613 578 416
                  </span>
                </a>

                <a 
                  href="mailto:info@delsolprimehomes.com"
                  className="group flex items-center gap-3 text-sm text-white/90 hover:text-primary transition-colors break-all"
                >
                  <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="group-hover:translate-x-1 transition-transform">
                    info@delsolprimehomes.com
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Copyright Bar */}
          <div className="mt-12 pt-8 border-t border-border/40">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-white/70 text-center md:text-left">
                © 2025 DelSol Prime Homes. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-white/70">
                <Link to="/privacy-policy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms-of-service" className="hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
