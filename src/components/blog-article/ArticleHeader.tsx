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
    <header className="space-y-6 mb-8">
      <Breadcrumb>
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
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <Select value={article.language} onValueChange={(lang) => navigate(`/blog/${translations[lang]}`)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                {currentLang?.flag} {currentLang?.name}
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

      <h1 className="text-4xl md:text-5xl font-bold leading-tight">{article.headline}</h1>

      <div className="flex flex-wrap items-center gap-4">
        {author && (
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={author.photo_url} alt={author.name} />
              <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Written by</p>
              <p className="font-medium">{author.name}, {author.job_title}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {article.date_published && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(article.date_published).toLocaleDateString()}</span>
            </div>
          )}
          {article.date_modified && (
            <div className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              <span>Updated {new Date(article.date_modified).toLocaleDateString()}</span>
            </div>
          )}
          {article.read_time && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{article.read_time} min read</span>
            </div>
          )}
        </div>

        {reviewer && (
          <Badge variant="secondary" className="gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={reviewer.photo_url} alt={reviewer.name} />
              <AvatarFallback>{reviewer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            Reviewed by {reviewer.name}, {reviewer.job_title}
          </Badge>
        )}
      </div>
    </header>
  );
};
