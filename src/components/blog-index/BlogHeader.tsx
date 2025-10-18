import logo from "@/assets/logo.png";

interface BlogHeaderProps {
  totalCount: number;
}

export const BlogHeader = ({ totalCount }: BlogHeaderProps) => {
  return (
    <header className="text-center space-y-6 mb-12">
      <img 
        src={logo} 
        alt="Del Sol Prime Homes" 
        className="h-24 md:h-32 mx-auto"
      />
      <h1 className="text-4xl md:text-5xl font-bold">
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
