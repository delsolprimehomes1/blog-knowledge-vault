import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Info, X } from "lucide-react";
import { FunnelStage } from "@/types/blog";

interface Article {
  id: string;
  headline: string;
  category: string;
  funnel_stage: string;
}

interface FunnelCTASectionProps {
  funnelStage: FunnelStage;
  articles: Article[] | undefined;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}

export const FunnelCTASection = ({
  funnelStage,
  articles,
  selectedIds,
  onSelectedIdsChange,
}: FunnelCTASectionProps) => {
  if (funnelStage === "BOFU") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funnel CTA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-accent rounded-lg">
            <Info className="h-5 w-5 mt-0.5 text-primary" />
            <div>
              <p className="font-medium">Chatbot CTA Active</p>
              <p className="text-sm text-muted-foreground mt-1">
                Bottom of funnel articles will display the chatbot for direct conversions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const targetStage = funnelStage === "TOFU" ? "MOFU" : "BOFU";
  const maxSelection = funnelStage === "TOFU" ? 2 : 1;
  const filteredArticles = articles?.filter(a => a.funnel_stage === targetStage) || [];

  const toggleArticle = (articleId: string) => {
    if (selectedIds.includes(articleId)) {
      onSelectedIdsChange(selectedIds.filter(id => id !== articleId));
    } else if (selectedIds.length < maxSelection) {
      onSelectedIdsChange([...selectedIds, articleId]);
    }
  };

  const selectedArticles = filteredArticles.filter(a => selectedIds.includes(a.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel CTA Articles</CardTitle>
        <p className="text-sm text-muted-foreground">
          {funnelStage === "TOFU" 
            ? "Select 2 MOFU articles to drive readers deeper into the funnel."
            : "Select 1 BOFU article to move readers toward conversion."}
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
          {filteredArticles.map((article) => {
            const isSelected = selectedIds.includes(article.id);
            const canSelect = selectedIds.length < maxSelection || isSelected;

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

        {filteredArticles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No {targetStage} articles available yet.
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          {selectedIds.length} of {maxSelection} article{maxSelection > 1 ? 's' : ''} selected
        </p>
      </CardContent>
    </Card>
  );
};
