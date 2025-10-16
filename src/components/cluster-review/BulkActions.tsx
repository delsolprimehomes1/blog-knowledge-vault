import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Save, Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface BulkActionsProps {
  onPublishAll: () => Promise<void>;
  onSaveAllAsDrafts: () => Promise<void>;
  onExportCluster: () => void;
  articleCount: number;
}

export const BulkActions = ({
  onPublishAll,
  onSaveAllAsDrafts,
  onExportCluster,
  articleCount,
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
            <Button
              variant="outline"
              onClick={onExportCluster}
              disabled={loading !== null}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Cluster
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction("draft", onSaveAllAsDrafts)}
              disabled={loading !== null}
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
              disabled={loading !== null}
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
