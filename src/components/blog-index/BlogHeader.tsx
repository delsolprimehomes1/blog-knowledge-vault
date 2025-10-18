import logo from "@/assets/logo.png";

interface BlogHeaderProps {
  totalCount: number;
}

export const BlogHeader = ({ totalCount }: BlogHeaderProps) => {
  return (
    <header className="text-center space-y-6 mb-12">
      <div className="inline-flex items-center justify-center p-6 md:p-8 rounded-full bg-gradient-to-br from-[#0a1950] to-[#1e3a8a] shadow-xl mx-auto hover:shadow-2xl transition-all duration-300">
        <img 
          src={logo} 
          alt="Del Sol Prime Homes" 
          className="h-16 md:h-20 drop-shadow-lg"
        />
      </div>
      <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">
        Del Sol Prime Homes Blog
      </h1>
      <p className="text-xl text-muted-foreground">
        Expert insights on Costa del Sol real estate
      </p>
      <p className="text-base text-muted-foreground max-w-2xl mx-auto">
        Start with these foundational guides. Explore deeper topics through related articles within each post.
      </p>
    </header>
  );
};
