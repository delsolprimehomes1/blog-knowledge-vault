import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Wrench } from "lucide-react";
import type { PublishValidationReport } from "@/lib/validatePublishReadiness";
import type { BlogArticle } from "@/types/blog";
import type { AutoFixReport } from "@/lib/autoFixPublishIssues";

interface BulkPublishValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: Partial<BlogArticle>[];
  validationResults: Map<string, PublishValidationReport>;
  onConfirmPublish: () => void;
  onAutoFix: () => void;
  isPublishing: boolean;
  isAutoFixing?: boolean;
  autoFixProgress?: number;
  autoFixResults?: AutoFixReport[];
}

export function BulkPublishValidationModal({
  open,
  onOpenChange,
  articles,
  validationResults,
  onConfirmPublish,
  onAutoFix,
  isPublishing,
  isAutoFixing = false,
  autoFixProgress = 0,
  autoFixResults = [],
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
  const hasFixableIssues = blockedArticles.length > 0;
  
  // Calculate auto-fix summary
  const fixSuccessCount = autoFixResults.filter(r => r.fixesApplied.length > 0 && !r.stillBlocked).length;
  const fixFailedCount = autoFixResults.filter(r => r.stillBlocked).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Publish Validation Results</DialogTitle>
          <DialogDescription>
            {autoFixResults.length > 0 
              ? `Auto-fix completed: ${fixSuccessCount} fixed, ${fixFailedCount} still blocked`
              : `Review validation results before publishing ${totalPublishable} article(s)`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Auto-fix progress indicator */}
        {isAutoFixing && (
          <div className="space-y-2 p-4 bg-muted rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Auto-fixing issues...</span>
            </div>
            <Progress value={autoFixProgress} />
            <p className="text-xs text-muted-foreground">
              Processing articles ({Math.round(autoFixProgress)}% complete)
            </p>
          </div>
        )}

        {/* Auto-fix results summary */}
        {autoFixResults.length > 0 && !isAutoFixing && (
          <div className="space-y-2 p-4 bg-muted rounded-lg mb-4">
            <div className="font-semibold">Auto-Fix Results</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>{fixSuccessCount} articles fixed</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>{fixFailedCount} still blocked</span>
              </div>
            </div>
          </div>
        )}

        {/* Auto-fix CTA */}
        {hasFixableIssues && !isAutoFixing && autoFixResults.length === 0 && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <Wrench className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Auto-Fix Available</div>
                <p className="text-sm text-muted-foreground mt-1">
                  We can automatically fix most issues: missing H1 headings, reviewer assignments, 
                  low-authority citations, and missing internal links.
                </p>
                <Button 
                  onClick={onAutoFix} 
                  variant="default" 
                  size="sm" 
                  className="mt-3"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Auto-Fix All Issues
                </Button>
              </div>
            </div>
          </div>
        )}

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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPublishing || isAutoFixing}>
            Cancel
          </Button>
          <Button
            onClick={onConfirmPublish}
            disabled={totalPublishable === 0 || isPublishing || isAutoFixing}
          >
            {isPublishing 
              ? "Publishing..." 
              : `Publish ${totalPublishable} Article${totalPublishable !== 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
