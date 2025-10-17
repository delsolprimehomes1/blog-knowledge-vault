import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { OptimizedImage } from "@/components/OptimizedImage";
import { prefetchArticle, prefetchImage } from "@/lib/prefetch";

interface ArticleCardProps {
  article: {
    id: string;
    slug: string;
    headline: string;
    category: string;
    language: string;
    featured_image_url: string;
    date_published: string;
    read_time: number;
    meta_description: string;
  };
  author: {
    name: string;
    photo_url: string;
  } | null;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  nl: "🇳🇱",
  fr: "🇫🇷",
  pl: "🇵🇱",
  sv: "🇸🇪",
  da: "🇩🇰",
  hu: "🇭🇺",
};

export const ArticleCard = ({ article, author }: ArticleCardProps) => {
  const excerpt = article.meta_description.length > 100 
    ? article.meta_description.substring(0, 100) + "..." 
    : article.meta_description;

  const imageUrl = article.featured_image_url || 
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=338&fit=crop';

  const handleMouseEnter = () => {
    // Prefetch article and featured image on hover
    prefetchArticle(article.slug);
    if (article.featured_image_url) {
      prefetchImage(article.featured_image_url);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Image failed to load:', {
      url: imageUrl,
      article: article.headline,
      slug: article.slug
    });
    e.currentTarget.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=338&fit=crop';
  };

  return (
    <Card 
      className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
      onMouseEnter={handleMouseEnter}
    >
      <CardContent className="p-0">
        <div className="relative overflow-hidden aspect-video">
          <OptimizedImage
            src={imageUrl}
            alt={article.headline}
            width={600}
            height={338}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={handleImageError}
          />
          <Badge className="absolute top-3 left-3" variant="secondary">
            {article.category}
          </Badge>
          <div className="absolute top-3 right-3 text-2xl">
            {LANGUAGE_FLAGS[article.language]}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h3 className="text-xl font-bold line-clamp-2 min-h-[3.5rem]">
            {article.headline}
          </h3>

          {author && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={author.photo_url} alt={author.name} />
                <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{author.name}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(article.date_published).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{article.read_time} min</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-3">
            {excerpt}
          </p>

          <Button asChild className="w-full">
            <Link to={`/blog/${article.slug}`}>
              Read Article
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
