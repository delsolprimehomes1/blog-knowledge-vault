import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Article {
  id: string;
  headline: string;
  category: string;
}

interface RelatedArticlesSectionProps {
  articles: Article[] | undefined;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}

export const RelatedArticlesSection = ({
  articles,
  selectedIds,
  onSelectedIdsChange,
}: RelatedArticlesSectionProps) => {
  const toggleArticle = (articleId: string) => {
    if (selectedIds.includes(articleId)) {
      onSelectedIdsChange(selectedIds.filter(id => id !== articleId));
    } else if (selectedIds.length < 7) {
      onSelectedIdsChange([...selectedIds, articleId]);
    }
  };

  const selectedArticles = articles?.filter(a => selectedIds.includes(a.id)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Articles</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select 5-7 related articles to show at the end of this article.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedArticles.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            {selectedArticles.map((article) => (
              <Badge key={article.id} variant="secondary" className="gap-2">
                {article.headline}
                <button
                  type="button"
                  onClick={() => toggleArticle(article.id)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {articles?.map((article) => {
            const isSelected = selectedIds.includes(article.id);
            const canSelect = selectedIds.length < 7 || isSelected;

            return (
              <div
                key={article.id}
                className={`flex items-start gap-3 p-3 border rounded-lg ${
                  !canSelect ? "opacity-50" : "cursor-pointer hover:bg-accent"
                }`}
                onClick={() => canSelect && toggleArticle(article.id)}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={!canSelect}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{article.headline}</p>
                  <p className="text-xs text-muted-foreground">{article.category}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">
          {selectedIds.length} of 5-7 articles selected
        </p>
      </CardContent>
    </Card>
  );
};
