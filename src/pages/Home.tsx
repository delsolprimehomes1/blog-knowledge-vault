import { Link } from "react-router-dom";
import { BookOpen, HelpCircle, FileText, MessageCircle, ArrowRight } from "lucide-react";
import { SchemaMeta } from "@/components/SchemaMeta";
import { generateAllHomeSchemas } from "@/lib/homeSchemaGenerator";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { GoogleBusinessWidget } from "@/components/home/GoogleBusinessWidget";

interface NavigationPillProps {
  title: string;
  path: string;
  icon: React.ElementType;
  delay: number;
}

const NavigationPill = ({ title, path, icon: Icon, delay }: NavigationPillProps) => (
  <Link
    to={path}
    className="group relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 
               hover:bg-white/10 hover:border-primary/50 transition-all duration-500 animate-fade-in-up"
    style={{ animationDelay: `${delay}ms` }}
    aria-label={`Navigate to ${title}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 text-primary" />
        <span className="text-white font-semibold text-lg">{title}</span>
      </div>
      <ArrowRight className="w-5 h-5 text-white/60 group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
        ogImage="https://delsolprimehomes.com/logo.png"
        schemas={Object.values(schemas)}
      />

      <div className="min-h-screen relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#1A1A1A] to-[#0A0A0A]">
          {/* Subtle animated overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,165,116,0.05),transparent_50%)] animate-pulse-slow" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 md:px-8">
          {/* Headline */}
          <h1 className="speakable-headline font-headline text-4xl md:text-6xl lg:text-8xl font-bold text-white text-center mb-6 animate-fade-in-up leading-tight">
            Costa del Sol Real Estate.
            <br />
            <span className="text-primary">Refined. Verified. Trusted.</span>
          </h1>

          {/* Subheadline */}
          <p className="speakable-summary text-xl md:text-2xl text-white/90 text-center max-w-3xl mb-12 animate-fade-in-up leading-relaxed">
            35+ years of expertise guiding investors, homeowners, and dreamers along Spain's southern coast.
          </p>

          {/* Navigation Pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mb-16">
            {navigationLinks.map((link, index) => (
              <NavigationPill
                key={link.path}
                title={link.title}
                path={link.path}
                icon={link.icon}
                delay={index * 100}
              />
            ))}
          </div>

          {/* Testimonials Section */}
          <TestimonialsSection />

          {/* Google Business Widget */}
          <div className="mb-16">
            <GoogleBusinessWidget />
          </div>

          {/* Footer */}
          <p className="text-sm text-white/60 text-center">
            © 2025 Del Sol Prime Homes. Expert Verified | AI-First Site Architecture.
          </p>
        </div>
      </div>
    </>
  );
};

export default Home;
