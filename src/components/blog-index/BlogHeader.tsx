import bgImage from "@/assets/costa-del-sol-bg.jpg";

interface BlogHeaderProps {
  totalCount: number;
}

export const BlogHeader = ({ totalCount }: BlogHeaderProps) => {
  return (
    <header className="relative w-full h-[60vh] min-h-[500px] flex items-center justify-center -mx-4 md:-mx-8 mb-16">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white">
          LATEST BLOG FOR RENT AND BUY
        </h1>
      </div>
    </header>
  );
};
