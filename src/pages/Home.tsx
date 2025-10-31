import { Link } from "react-router-dom";
import { BookOpen, HelpCircle, FileText, MessageCircle, ArrowRight } from "lucide-react";
import { SchemaMeta } from "@/components/SchemaMeta";
import { generateAllHomeSchemas } from "@/lib/homeSchemaGenerator";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { GoogleBusinessWidget } from "@/components/home/GoogleBusinessWidget";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { FeatureCards } from "@/components/home/FeatureCards";

interface NavigationPillProps {
  title: string;
  path: string;
  icon: React.ElementType;
  delay: number;
}

const NavigationPill = ({ title, path, icon: Icon, delay }: NavigationPillProps) => (
  <Link
    to={path}
    className="group relative p-4 md:p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 
               hover:bg-white/10 hover:border-primary/50 transition-all duration-500 animate-fade-in-up
               min-h-[48px] flex items-center justify-center"
    style={{ animationDelay: `${delay}ms` }}
    aria-label={`Navigate to ${title}`}
  >
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 md:gap-3">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0" />
        <span className="text-white font-semibold text-base md:text-lg">{title}</span>
      </div>
      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-white/60 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
    </div>
  </Link>
);

const Home = () => {
  const schemas = generateAllHomeSchemas();
  
  const navigationLinks = [
    { title: "About Us", path: "/about", icon: BookOpen },
    { title: "FAQ", path: "/faq", icon: HelpCircle },
    { title: "Blog", path: "/blog", icon: FileText },
    { title: "Q&A", path: "/qa", icon: MessageCircle },
  ];

  return (
    <>
      <SchemaMeta
        title="Del Sol Prime Homes | Costa del Sol Real Estate Experts"
        description="Licensed real estate agency specializing in Costa del Sol luxury properties. 35+ years expertise, multilingual support, verified by industry experts."
        canonical="https://delsolprimehomes.com/"
        ogTitle="Del Sol Prime Homes | Costa del Sol Real Estate Experts"
        ogDescription="35+ years of expertise guiding investors, homeowners, and dreamers along Spain's southern coast."
        ogImage="https://delsolprimehomes.com/images/costa-del-sol-beauty.jpg"
        schemas={Object.values(schemas)}
      />

      <div className="min-h-screen relative overflow-hidden">
        {/* Hero Section with Auto-Rotating Background Carousel */}
        <div className="relative min-h-screen w-full">
          <HeroCarousel>
            {/* Logo - Fixed Top Left */}
            <div className="fixed top-4 left-4 md:top-6 md:left-8 z-50">
              <img
                src="/images/delsol-logo.png"
                alt="Del Sol Prime Homes - Lifestyle Meets Property Investment on Costa del Sol"
                width={250}
                height={80}
                className="h-10 md:h-14 lg:h-20 w-auto drop-shadow-2xl"
              />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 md:px-8 pt-20 md:pt-0">
              {/* Headline */}
              <h1 className="speakable-headline font-headline text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 
                           font-bold text-white text-center mb-4 md:mb-6 animate-fade-in-up leading-[1.1] tracking-tight
                           drop-shadow-2xl max-w-5xl"
                  style={{
                    textShadow: '0 0 40px rgba(212, 165, 116, 0.3), 0 0 80px rgba(212, 165, 116, 0.1)'
                  }}>
                Discover Your Dream Home on the
                <br />
                <span className="text-primary">Costa del Sol</span>
              </h1>

              {/* Subheadline */}
              <p className="speakable-summary text-base sm:text-lg md:text-xl lg:text-2xl text-white/95 
                          text-center max-w-3xl mb-8 md:mb-12 animate-fade-in-up leading-relaxed
                          drop-shadow-xl px-4" 
                 style={{ animationDelay: '200ms' }}>
                Expert-verified luxury properties | 35+ years of excellence | Multilingual support for international buyers
              </p>

              {/* CTA Button */}
              <Link
                to="/blog"
                className="mb-10 md:mb-12 px-6 md:px-8 py-3 md:py-4 bg-primary hover:bg-primary/90 text-white 
                         font-semibold text-base md:text-lg rounded-full
                         hover:scale-105 
                         transition-all duration-300 animate-fade-in-up
                         min-h-[48px] flex items-center gap-2 pointer-events-auto"
                style={{ 
                  animationDelay: '400ms',
                  boxShadow: '0 0 30px rgba(212, 165, 116, 0.3), 0 20px 60px rgba(0, 0, 0, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(212, 165, 116, 0.5), 0 20px 80px rgba(0, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(212, 165, 116, 0.3), 0 20px 60px rgba(0, 0, 0, 0.4)';
                }}
              >
                Explore Properties
                <ArrowRight className="w-5 h-5" />
              </Link>

              {/* Navigation Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl w-full mb-16 md:mb-0 pointer-events-auto">
                {navigationLinks.map((link, index) => (
                  <NavigationPill
                    key={link.path}
                    title={link.title}
                    path={link.path}
                    icon={link.icon}
                    delay={600 + index * 100}
                  />
                ))}
              </div>
            </div>
          </HeroCarousel>
        </div>

        {/* Below-the-Fold Content */}
        <div className="relative z-10 bg-gradient-to-b from-black via-[#0A0A0A] to-black">
          {/* Feature Cards Section */}
          <div className="py-16 md:py-24">
            <FeatureCards />
          </div>

          {/* Testimonials Section */}
          <div className="py-8 md:py-16">
            <TestimonialsSection />
          </div>

          {/* Google Business Widget */}
          <div className="py-8 md:py-16 flex justify-center px-4">
            <GoogleBusinessWidget />
          </div>

          {/* Footer */}
          <div className="py-8 text-center">
            <p className="text-sm text-white/60">
              © 2025 Del Sol Prime Homes. Expert Verified | AI-First Site Architecture.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
