interface BlogHeaderProps {
  totalCount: number;
}

export const BlogHeader = ({ totalCount }: BlogHeaderProps) => {
  return (
    <header className="text-center space-y-4 mb-12">
      <h1 className="text-4xl md:text-5xl font-bold">
        Del Sol Prime Homes Blog
      </h1>
      <p className="text-xl text-muted-foreground">
        Expert insights on Costa del Sol real estate
      </p>
      <p className="text-sm text-muted-foreground">
        {totalCount} {totalCount === 1 ? 'article' : 'articles'} available
      </p>
    </header>
  );
};
