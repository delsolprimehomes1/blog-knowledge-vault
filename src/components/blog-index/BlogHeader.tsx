import bgImage from "@/assets/costa-del-sol-bg.jpg";

interface BlogHeaderProps {
  totalCount: number;
}

export const BlogHeader = ({ totalCount }: BlogHeaderProps) => {
  return (
    <header className="relative w-full min-h-[50vh] md:min-h-[60vh] flex items-center justify-center -mx-4 md:-mx-8 mb-8 md:mb-12">
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
      <div className="relative z-10 text-center px-6 py-8 sm:py-0 animate-fade-in space-y-3 sm:space-y-4 md:space-y-6">
        <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-tight speakable-summary">
          Costa del Sol Property Blog
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto blog-hero-description speakable-summary">
          <span className="sm:hidden">Expert insights on buying property in Costa del Sol. Real estate trends, legal procedures, and investment opportunities.</span>
          <span className="hidden sm:inline">Your comprehensive guide to buying property in Costa del Sol, Spain. Expert insights on real estate market trends, legal procedures, investment opportunities, and lifestyle tips for international buyers.</span>
        </p>
      </div>
    </header>
  );
};
