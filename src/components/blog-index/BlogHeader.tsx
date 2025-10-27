import bgImage from "@/assets/costa-del-sol-bg.jpg";

interface BlogHeaderProps {
  totalCount: number;
}

export const BlogHeader = ({ totalCount }: BlogHeaderProps) => {
  return (
    <header className="relative w-full min-h-[70vh] md:min-h-[60vh] flex items-center justify-center -mx-4 md:-mx-8 mb-12 md:mb-16">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url(${bgImage})`,
          objectPosition: 'center 40%'
        }}
      />
      
      {/* Enhanced Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 animate-fade-in space-y-6">
        <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight speakable-summary">
          Costa del Sol Property Blog
        </h1>
        <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto blog-hero-description speakable-summary">
          Your comprehensive guide to buying property in Costa del Sol, Spain. Expert insights on real estate market trends, legal procedures, investment opportunities, and lifestyle tips for international buyers.
        </p>
      </div>
    </header>
  );
};
