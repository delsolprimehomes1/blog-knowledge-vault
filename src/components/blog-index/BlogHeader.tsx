import logo from "@/assets/logo.png";

interface BlogHeaderProps {
  totalCount: number;
}

export const BlogHeader = ({ totalCount }: BlogHeaderProps) => {
  return (
    <header className="text-center space-y-6 mb-12">
      <div className="inline-block bg-blue-900/30 backdrop-blur-sm rounded-2xl p-6 shadow-[0_0_60px_rgba(30,58,138,0.6)]">
        <img 
          src={logo} 
          alt="Del Sol Prime Homes" 
          className="h-32 md:h-40"
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
