
interface BlogHeaderProps {
  totalCount: number;
}

export const BlogHeader = ({ totalCount }: BlogHeaderProps) => {
  return (
    <header className="text-center space-y-6 mb-12">
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
