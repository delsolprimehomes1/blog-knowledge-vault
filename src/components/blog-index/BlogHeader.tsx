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
      <div className="relative z-10 text-center px-4 animate-fade-in">
        <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
          LATEST BLOG FOR RENT AND BUY
        </h1>
      </div>
    </header>
  );
};
