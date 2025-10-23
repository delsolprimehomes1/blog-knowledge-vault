import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  BarChart3,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  validateMultipleArticles,
  getArticlesNeedingValidation,
  generateBatchValidationReport,
  calculateArticleLinkHealth,
} from "@/lib/articleLinkValidator";
import type { ArticleLinkValidation } from "@/lib/linkValidator";

export const BatchLinkValidator = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Map<string, ArticleLinkValidation | Error> | null>(null);
  const { toast } = useToast();

  const handleValidateAll = async () => {
    setIsValidating(true);
    setProgress(0);

    try {
      // Get articles that need validation (not validated in last 7 days)
      toast({
        title: "Finding articles...",
        description: "Checking which articles need validation",
      });

      const articleIds = await getArticlesNeedingValidation(7);

      if (articleIds.length === 0) {
        toast({
          title: "All Up to Date",
          description: "All published articles have been validated recently",
        });
        setIsValidating(false);
        return;
      }

      toast({
        title: "Validating Links",
        description: `Starting validation of ${articleIds.length} articles...`,
      });

      // Validate in batches
      const validationResults = new Map<string, ArticleLinkValidation | Error>();
      
      for (let i = 0; i < articleIds.length; i++) {
        const articleId = articleIds[i];
        
        try {
          const { validateArticleLinks } = await import("@/lib/articleLinkValidator");
          const result = await validateArticleLinks(articleId);
          validationResults.set(articleId, result);
        } catch (error) {
          validationResults.set(
            articleId,
            error instanceof Error ? error : new Error('Unknown error')
          );
        }

        // Update progress
        const newProgress = Math.round(((i + 1) / articleIds.length) * 100);
        setProgress(newProgress);

        // Rate limiting
        if (i < articleIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setResults(validationResults);

      const report = generateBatchValidationReport(validationResults);

      toast({
        title: "Validation Complete",
        description: `Validated ${report.successfulValidations}/${report.totalArticles} articles. Average score: ${report.averageScore}/100`,
      });

    } catch (error: any) {
      console.error('Batch validation error:', error);
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to validate articles",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const report = results ? generateBatchValidationReport(results) : null;

  const getGradeColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50";
    if (score >= 80) return "text-blue-600 bg-blue-50";
    if (score >= 70) return "text-yellow-600 bg-yellow-50";
    if (score >= 60) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Batch Link Validation
        </CardTitle>
        <CardDescription>
          Validate all published articles for link quality and accessibility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleValidateAll}
          disabled={isValidating}
          className="gap-2"
        >
          {isValidating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Validate All Articles
            </>
          )}
        </Button>

        {isValidating && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              {progress}% complete
            </p>
          </div>
        )}

        {report && (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              {/* Overall Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold">{report.totalArticles}</div>
                    <div className="text-xs text-muted-foreground">Total Articles</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className={`text-3xl font-bold ${getGradeColor(report.averageScore)}`}>
                      {report.averageScore}
                    </div>
                    <div className="text-xs text-muted-foreground">Average Score</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-600">{report.successfulValidations}</div>
                    <div className="text-xs text-muted-foreground">Validated</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-red-600">{report.failedValidations}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </CardContent>
                </Card>
              </div>

              {/* Issues Summary */}
              <div className="grid md:grid-cols-3 gap-4">
                <Alert variant={report.totalBrokenLinks > 0 ? "destructive" : "default"}>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{report.totalBrokenLinks}</strong> broken links
                  </AlertDescription>
                </Alert>
                <Alert variant={report.totalLanguageMismatches > 0 ? "destructive" : "default"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{report.totalLanguageMismatches}</strong> language mismatches
                  </AlertDescription>
                </Alert>
                <Alert variant={report.totalIrrelevantLinks > 0 ? "destructive" : "default"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{report.totalIrrelevantLinks}</strong> irrelevant links
                  </AlertDescription>
                </Alert>
              </div>

              {/* Articles Needing Attention */}
              {report.articlesNeedingAttention.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{report.articlesNeedingAttention.length}</strong> article(s) 
                    need immediate attention (score below 70)
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-3">
              {Array.from(results?.entries() || []).map(([articleId, result]) => {
                if (result instanceof Error) {
                  return (
                    <Card key={articleId} className="border-red-200 bg-red-50">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Validation Failed</span>
                        </div>
                        <p className="text-xs text-red-600 mt-1">{result.message}</p>
                      </CardContent>
                    </Card>
                  );
                }

                const health = calculateArticleLinkHealth(result);

                return (
                  <Card key={articleId}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{result.articleTopic}</h4>
                          <p className="text-xs text-muted-foreground">{result.articleSlug}</p>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {health.issues.map((issue, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                {issue}
                              </Badge>
                            ))}
                            {health.strengths.map((strength, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                ✓ {strength}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={getGradeColor(health.score)}>
                            {health.grade}
                          </Badge>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${getGradeColor(health.score)}`}>
                              {health.score}
                            </div>
                            <div className="text-xs text-muted-foreground">score</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}

        {!isValidating && !results && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Click "Validate All Articles" to check link quality across all published articles.
              This will validate articles that haven't been checked in the last 7 days.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
