import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkReplacementResult {
  replacementId: string;
  originalUrl: string;
  replacementUrl: string;
  articlesAffected: number;
  replacementCount: number;
}

interface BulkReplacementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  isProcessing: boolean;
  progress: number;
  results: BulkReplacementResult[];
  onConfirm: () => void;
}

export const BulkReplacementDialog = ({
  open,
  onOpenChange,
  selectedCount,
  isProcessing,
  progress,
  results,
  onConfirm
}: BulkReplacementDialogProps) => {
  const totalArticles = results.reduce((sum, r) => sum + r.articlesAffected, 0);
  const totalReplacements = results.reduce((sum, r) => sum + r.replacementCount, 0);
  const isComplete = results.length > 0 && results.length === selectedCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isComplete ? 'Bulk Replacement Complete' : 'Apply Bulk Replacements'}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? 'All selected replacements have been applied successfully'
              : `This will apply ${selectedCount} approved replacement${selectedCount !== 1 ? 's' : ''} to your articles`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isProcessing && !isComplete && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Bulk Action Summary</h4>
              <div className="text-sm space-y-1">
                <p>• <strong>{selectedCount}</strong> broken citation{selectedCount !== 1 ? 's' : ''} will be replaced</p>
                <p>• Articles will be automatically backed up for rollback</p>
                <p>• You can undo changes within 24 hours</p>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing replacements...</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Please wait while we update your articles
              </p>
            </div>
          )}

          {isComplete && (
            <div className="space-y-4">
              {/* Success Summary */}
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-300">Success!</h4>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Updated <strong>{totalArticles}</strong> article{totalArticles !== 1 ? 's' : ''} with{' '}
                      <strong>{totalReplacements}</strong> citation replacement{totalReplacements !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Results List */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">Replacement Details:</h4>
                <ScrollArea className="h-48 border rounded-md">
                  <div className="p-4 space-y-3">
                    {results.map((result, index) => (
                      <div key={result.replacementId} className="p-3 bg-muted rounded-md">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{result.originalUrl}</p>
                            <p className="text-xs text-green-600 truncate mt-1">→ {result.replacementUrl}</p>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {result.articlesAffected} article{result.articlesAffected !== 1 ? 's' : ''}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {result.replacementCount} replacement{result.replacementCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Rollback Notice */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    Rollback available for 24 hours in the "Applied Replacements" tab
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          {!isProcessing && !isComplete && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onConfirm}>
                Apply {selectedCount} Replacement{selectedCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {isComplete && (
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
