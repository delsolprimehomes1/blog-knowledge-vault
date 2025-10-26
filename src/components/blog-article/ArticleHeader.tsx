import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Clock, Calendar, RefreshCw, Languages } from "lucide-react";
import { BlogArticle, Author } from "@/types/blog";
import { useNavigate } from "react-router-dom";

interface ArticleHeaderProps {
  article: BlogArticle;
  author: Author | null;
  reviewer: Author | null;
  translations: Record<string, string>;
}

const LANGUAGE_FLAGS: Record<string, { flag: string; name: string }> = {
  en: { flag: "🇬🇧", name: "English" },
  es: { flag: "🇪🇸", name: "Spanish" },
  de: { flag: "🇩🇪", name: "German" },
  nl: { flag: "🇳🇱", name: "Dutch" },
  fr: { flag: "🇫🇷", name: "French" },
  pl: { flag: "🇵🇱", name: "Polish" },
  sv: { flag: "🇸🇪", name: "Swedish" },
  da: { flag: "🇩🇰", name: "Danish" },
  hu: { flag: "🇭🇺", name: "Hungarian" },
};

export const ArticleHeader = ({ article, author, reviewer, translations }: ArticleHeaderProps) => {
  const navigate = useNavigate();
  const currentLang = LANGUAGE_FLAGS[article.language];

  return (
    <header className="space-y-8 md:space-y-10 mb-16 animate-fade-in-up relative">
      {/* Hide breadcrumb on mobile */}
      <Breadcrumb className="hidden md:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/blog">Blog</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/blog/category/${article.category.toLowerCase()}`}>
              {article.category}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{article.headline}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Language selector - compact top-right */}
      {Object.keys(translations).length > 0 && (
        <div className="absolute top-0 right-0 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 rounded-2xl px-3 py-2 shadow-lg">
          <Select value={article.language} onValueChange={(lang) => navigate(`/blog/${translations[lang]}`)}>
            <SelectTrigger className="w-[140px] border-0 bg-transparent h-8">
              <SelectValue>
                <span className="text-sm font-medium">{currentLang?.flag}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={article.language}>
                {currentLang?.flag} {currentLang?.name}
              </SelectItem>
              {Object.entries(translations).map(([lang, slug]) => {
                const langData = LANGUAGE_FLAGS[lang];
                return (
                  <SelectItem key={lang} value={lang}>
                    {langData?.flag} {langData?.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Title - Large and flowing */}
      <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mt-8" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        {article.headline}
      </h1>

      {/* Author Card - Hero Element */}
      {author && (
        <div className="glass-premium rounded-3xl p-6 md:p-8 shadow-2xl border-2 border-transparent bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-900/90 dark:to-gray-900/70 hover:shadow-[0_10px_40px_rgba(42,58,50,0.15)] transition-all duration-500">
          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <span className="inline-block w-1 h-4 bg-gradient-to-b from-primary to-accent rounded-full"></span>
            Written by
          </p>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-4 ring-gradient-to-br from-primary to-accent shadow-lg">
              <AvatarImage src={author.photo_url} alt={author.name} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent text-white">
                {author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-bold text-xl md:text-2xl mb-1">{author.name}</p>
              <p className="text-base md:text-lg text-primary font-medium">{author.job_title}</p>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Meta Row */}
      <div className="flex flex-wrap items-center gap-3">
        {article.date_published && (
          <Badge variant="outline" className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-white/30 shadow-md gap-2 px-4 py-2">
            <Calendar className="h-4 w-4" style={{ color: 'hsl(42 58% 50%)' }} />
            <span className="text-sm font-medium">{new Date(article.date_published).toLocaleDateString()}</span>
          </Badge>
        )}
        {article.date_modified && article.date_published && article.date_modified !== article.date_published && (
          <Badge variant="outline" className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-white/30 shadow-md gap-2 px-4 py-2">
            <RefreshCw className="h-4 w-4" style={{ color: 'hsl(42 58% 50%)' }} />
            <span className="text-sm font-medium">Updated {new Date(article.date_modified).toLocaleDateString()}</span>
          </Badge>
        )}
        {article.read_time && (
          <Badge variant="outline" className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-white/30 shadow-md gap-2 px-4 py-2">
            <Clock className="h-4 w-4" style={{ color: 'hsl(42 58% 50%)' }} />
            <span className="text-sm font-medium">{article.read_time} min read</span>
          </Badge>
        )}
      </div>

      {/* Reviewer Card - Separate prominent element */}
      {reviewer && (
        <div className="backdrop-blur-md bg-primary/10 border-2 border-primary/20 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/30">
              <AvatarImage src={reviewer.photo_url} alt={reviewer.name} />
              <AvatarFallback className="text-sm bg-primary/20">{reviewer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Reviewed by</p>
              <p className="font-semibold text-base">{reviewer.name}</p>
              <p className="text-sm text-muted-foreground">{reviewer.job_title}</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
