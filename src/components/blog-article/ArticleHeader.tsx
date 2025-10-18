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
    <header className="space-y-6 md:space-y-8 mb-12 animate-fade-in-up">
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

      {Object.keys(translations).length > 0 && (
        <div className="flex items-center gap-2 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-white/20 rounded-2xl px-4 py-2 shadow-lg w-fit">
          <Languages className="h-4 w-4 text-primary" />
          <Select value={article.language} onValueChange={(lang) => navigate(`/blog/${translations[lang]}`)}>
            <SelectTrigger className="w-[180px] border-0 bg-transparent">
              <SelectValue>
                <span className="font-medium">{currentLang?.flag} {currentLang?.name}</span>
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

      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight line-clamp-2 md:line-clamp-none" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        {article.headline}
      </h1>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-6 md:gap-8">
        {author && (
          <div className="flex items-center gap-4 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 rounded-2xl p-4 shadow-lg border border-white/20">
            <Avatar className="h-20 w-20 ring-4 ring-primary/10">
              <AvatarImage src={author.photo_url} alt={author.name} />
              <AvatarFallback className="text-xl">{author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Written by</p>
              <p className="font-semibold text-base">{author.name}</p>
              <p className="text-sm text-muted-foreground">{author.job_title}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {article.date_published && (
            <Badge variant="outline" className="backdrop-blur-md bg-white/60 dark:bg-gray-900/60 border-white/20 shadow-md gap-2 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">{new Date(article.date_published).toLocaleDateString()}</span>
            </Badge>
          )}
          {article.date_modified && (
            <Badge variant="outline" className="backdrop-blur-md bg-white/60 dark:bg-gray-900/60 border-white/20 shadow-md gap-2 px-3 py-1.5">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Updated {new Date(article.date_modified).toLocaleDateString()}</span>
            </Badge>
          )}
          {article.read_time && (
            <Badge variant="outline" className="backdrop-blur-md bg-white/60 dark:bg-gray-900/60 border-white/20 shadow-md gap-2 px-3 py-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">{article.read_time} min read</span>
            </Badge>
          )}
        </div>

        {reviewer && (
          <Badge variant="secondary" className="backdrop-blur-md bg-primary/10 border-primary/20 gap-2 px-4 py-2 shadow-md">
            <Avatar className="h-6 w-6 ring-2 ring-white">
              <AvatarImage src={reviewer.photo_url} alt={reviewer.name} />
              <AvatarFallback className="text-xs">{reviewer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">Reviewed by {reviewer.name}, {reviewer.job_title}</span>
          </Badge>
        )}
      </div>
    </header>
  );
};
