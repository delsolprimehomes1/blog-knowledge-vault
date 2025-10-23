import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface AffectedArticle {
  articleId: string;
  slug: string;
  headline: string;
  replacements: number;
}

interface ChangePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalUrl: string;
  replacementUrl: string;
  confidenceScore?: number;
  affectedArticles: AffectedArticle[];
  onConfirm: () => void;
  isApplying: boolean;
}

export const ChangePreviewModal = ({
  open,
  onOpenChange,
  originalUrl,
  replacementUrl,
  confidenceScore,
  affectedArticles,
  onConfirm,
  isApplying
}: ChangePreviewModalProps) => {
  const totalReplacements = affectedArticles.reduce((sum, article) => sum + article.replacements, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Confirm Citation Replacement</DialogTitle>
          <DialogDescription>
            Review the changes that will be made to your articles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Comparison */}
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Original URL (broken):</p>
              <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                <p className="text-sm font-mono break-all text-destructive">{originalUrl}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Replacement URL:</p>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-900">
                <p className="text-sm font-mono break-all text-green-700 dark:text-green-300">{replacementUrl}</p>
              </div>
            </div>
            {confidenceScore !== undefined && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm text-muted-foreground">
                  Confidence Score: <Badge variant="default">{confidenceScore}%</Badge>
                </p>
              </div>
            )}
          </div>

          {/* Impact Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Impact Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Articles to Update:</p>
                <p className="text-2xl font-bold">{affectedArticles.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Replacements:</p>
                <p className="text-2xl font-bold">{totalReplacements}</p>
              </div>
            </div>
          </div>

          {/* Affected Articles List */}
          <div>
            <h4 className="font-semibold mb-2">Affected Articles:</h4>
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-4 space-y-2">
                {affectedArticles.map((article) => (
                  <div key={article.articleId} className="flex items-start justify-between p-2 hover:bg-muted rounded-md">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{article.headline}</p>
                      <p className="text-xs text-muted-foreground">/{article.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{article.replacements} replacement{article.replacements !== 1 ? 's' : ''}</Badge>
                      <Link to={`/admin/article-editor/${article.slug}`} target="_blank">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Safety Notice */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Safety:</strong> A backup will be created before applying changes. You can rollback within 24 hours if needed.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isApplying}>
            {isApplying ? 'Applying...' : 'Confirm & Apply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
