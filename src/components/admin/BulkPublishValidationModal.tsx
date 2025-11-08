import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { PublishValidationReport } from "@/lib/validatePublishReadiness";
import type { BlogArticle } from "@/types/blog";

interface BulkPublishValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: Partial<BlogArticle>[];
  validationResults: Map<string, PublishValidationReport>;
  onConfirmPublish: () => void;
  isPublishing: boolean;
}

export function BulkPublishValidationModal({
  open,
  onOpenChange,
  articles,
  validationResults,
  onConfirmPublish,
  isPublishing,
}: BulkPublishValidationModalProps) {
  const readyArticles = articles.filter(a => validationResults.get(a.id!)?.isReady);
  const warningArticles = articles.filter(a => {
    const result = validationResults.get(a.id!);
    return result?.canPublishWithWarnings && !result?.isReady;
  });
  const blockedArticles = articles.filter(a => {
    const result = validationResults.get(a.id!);
    return !result?.isReady && !result?.canPublishWithWarnings;
  });

  const totalPublishable = readyArticles.length + warningArticles.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Publish Validation Results</DialogTitle>
          <DialogDescription>
            Review validation results before publishing {totalPublishable} article(s)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex items-center gap-2 p-4 border rounded-lg bg-success/10">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <div className="text-2xl font-bold">{readyArticles.length}</div>
              <div className="text-sm text-muted-foreground">Ready</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 border rounded-lg bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <div className="text-2xl font-bold">{warningArticles.length}</div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 border rounded-lg bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <div className="text-2xl font-bold">{blockedArticles.length}</div>
              <div className="text-sm text-muted-foreground">Blocked</div>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <Accordion type="single" collapsible className="w-full">
            {/* Ready Articles */}
            {readyArticles.length > 0 && (
              <AccordionItem value="ready">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="font-semibold">Ready to Publish ({readyArticles.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {readyArticles.map(article => (
                      <div key={article.id} className="p-3 border rounded-lg bg-success/5">
                        <div className="font-medium">{article.headline}</div>
                        <div className="text-sm text-muted-foreground">{article.slug}</div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Warning Articles */}
            {warningArticles.length > 0 && (
              <AccordionItem value="warnings">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="font-semibold">Can Publish with Warnings ({warningArticles.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {warningArticles.map(article => {
                      const result = validationResults.get(article.id!);
                      return (
                        <div key={article.id} className="p-3 border rounded-lg bg-warning/5">
                          <div className="font-medium">{article.headline}</div>
                          <div className="text-sm text-muted-foreground mb-2">{article.slug}</div>
                          {result?.warnings && result.warnings.length > 0 && (
                            <div className="space-y-1">
                              {result.warnings.slice(0, 3).map((warning, idx) => (
                                <div key={idx} className="text-xs text-warning flex items-start gap-1">
                                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span>{warning}</span>
                                </div>
                              ))}
                              {result.warnings.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{result.warnings.length - 3} more warnings
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Blocked Articles */}
            {blockedArticles.length > 0 && (
              <AccordionItem value="blocked">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="font-semibold">Cannot Publish ({blockedArticles.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {blockedArticles.map(article => {
                      const result = validationResults.get(article.id!);
                      return (
                        <div key={article.id} className="p-3 border rounded-lg bg-destructive/5">
                          <div className="font-medium">{article.headline}</div>
                          <div className="text-sm text-muted-foreground mb-2">{article.slug}</div>
                          {result?.blockers && result.blockers.length > 0 && (
                            <div className="space-y-1">
                              {result.blockers.map((blocker, idx) => (
                                <div key={idx} className="text-xs text-destructive flex items-start gap-1">
                                  <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span>{blocker}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Section breakdown */}
                          <div className="mt-2 pt-2 border-t space-y-1">
                            {Object.entries(result?.sections || {}).map(([section, data]) => (
                              !data.passed && data.issues.length > 0 && (
                                <div key={section} className="text-xs">
                                  <Badge variant="destructive" className="mr-2">{section}</Badge>
                                  {data.issues.join(', ')}
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPublishing}>
            Cancel
          </Button>
          <Button
            onClick={onConfirmPublish}
            disabled={totalPublishable === 0 || isPublishing}
          >
            {isPublishing ? "Publishing..." : `Publish ${totalPublishable} Article${totalPublishable !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
