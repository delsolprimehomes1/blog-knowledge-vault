import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Save, Download, Loader2, ExternalLink, Search } from "lucide-react";
import { useState } from "react";

interface BulkActionsProps {
  onPublishAll: () => Promise<void>;
  onSaveAllAsDrafts: () => Promise<void>;
  onExportCluster: () => void;
  onFixAllCitations?: () => Promise<void>;
  onAutoFixSlugs?: () => Promise<void>;
  onFindCitations?: () => Promise<void>;
  articleCount: number;
  citationsNeeded: number;
  duplicateSlugsCount?: number;
  articlesWithoutCitations?: number;
  isFindingCitations?: boolean;
}

export const BulkActions = ({
  onPublishAll,
  onSaveAllAsDrafts,
  onExportCluster,
  onFixAllCitations,
  onAutoFixSlugs,
  onFindCitations,
  articleCount,
  citationsNeeded,
  duplicateSlugsCount = 0,
  articlesWithoutCitations = 0,
  isFindingCitations = false,
}: BulkActionsProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setLoading(action);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="sticky bottom-0 z-10 shadow-lg border-t-2">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">{articleCount} articles</span> in this cluster
          </div>
          <div className="flex gap-2">
            {duplicateSlugsCount > 0 && onAutoFixSlugs && (
              <Button
                variant="destructive"
                onClick={() => handleAction("slugs", onAutoFixSlugs)}
                disabled={loading !== null}
              >
                {loading === "slugs" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Auto-Fix {duplicateSlugsCount} Duplicate Slug{duplicateSlugsCount !== 1 ? 's' : ''}
              </Button>
            )}
            {citationsNeeded > 0 && onFixAllCitations && (
              <Button
                variant="secondary"
                onClick={() => handleAction("citations", onFixAllCitations)}
                disabled={loading !== null}
              >
                {loading === "citations" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Fix {citationsNeeded} Citation{citationsNeeded !== 1 ? 's' : ''}
              </Button>
            )}
            {articlesWithoutCitations > 0 && onFindCitations && (
              <Button
                variant="default"
                onClick={() => handleAction("findCitations", onFindCitations)}
                disabled={loading !== null || isFindingCitations}
                className="bg-primary hover:bg-primary/90"
              >
                {loading === "findCitations" || isFindingCitations ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Find Citations for {articlesWithoutCitations} Article{articlesWithoutCitations !== 1 ? 's' : ''}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onExportCluster}
              disabled={loading !== null || isFindingCitations}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Cluster
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction("draft", onSaveAllAsDrafts)}
              disabled={loading !== null || isFindingCitations}
            >
              {loading === "draft" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save All as Drafts
            </Button>
            <Button
              onClick={() => handleAction("publish", onPublishAll)}
              disabled={loading !== null || isFindingCitations}
            >
              {loading === "publish" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Publish All {articleCount} Articles
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
