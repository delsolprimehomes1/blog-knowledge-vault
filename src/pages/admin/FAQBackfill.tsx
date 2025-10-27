import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function FAQBackfill() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: Array<{ id: string; headline: string; error: string }>;
  } | null>(null);

  // Fetch articles without FAQs
  const { data: articlesNeedingFAQs, isLoading } = useQuery({
    queryKey: ["articles-without-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, headline, status, faq_entities")
        .eq("status", "published")
        .or("faq_entities.is.null,faq_entities.eq.[]");

      if (error) throw error;
      return data || [];
    },
  });

  const handleGenerateFAQs = async () => {
    if (!articlesNeedingFAQs || articlesNeedingFAQs.length === 0) {
      toast.info("All articles already have FAQs!");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setResults(null);

    try {
      // Prepare articles for batch processing
      const articles = articlesNeedingFAQs.map(a => ({
        id: a.id,
        headline: a.headline,
      }));

      // Fetch full article data
      const { data: fullArticles, error: fetchError } = await supabase
        .from("blog_articles")
        .select("id, headline, detailed_content, meta_description, language, funnel_stage")
        .in("id", articles.map(a => a.id));

      if (fetchError) throw fetchError;

      toast.info(`Starting FAQ generation for ${fullArticles.length} articles...`);

      // Call the backfill edge function
      const { data, error } = await supabase.functions.invoke("backfill-article-faqs", {
        body: { 
          articles: fullArticles,
          batch_mode: true 
        },
      });

      if (error) throw error;

      // Update progress
      setProgress(100);

      // Set results
      const summary = data.summary || {
        successful: 0,
        failed: 0,
        total: fullArticles.length,
      };

      setResults({
        total: summary.total,
        successful: summary.successful,
        failed: summary.failed,
        skipped: 0,
        errors: data.errors || [],
      });

      if (summary.successful > 0) {
        toast.success(`Successfully generated FAQs for ${summary.successful} articles!`);
      }

      if (summary.failed > 0) {
        toast.error(`Failed to generate FAQs for ${summary.failed} articles`);
      }

    } catch (error) {
      console.error("FAQ generation error:", error);
      toast.error("Failed to generate FAQs", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">🤖 FAQ Auto-Generation</h1>
          <p className="text-muted-foreground">
            Automatically generate FAQ sections with JSON-LD schema for all published articles
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              FAQ Coverage Status
            </CardTitle>
            <CardDescription>
              Articles with and without FAQ schema markup
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-6 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Articles with FAQs
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {articlesNeedingFAQs ? (
                      <>{100 - articlesNeedingFAQs.length}</>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div className="p-6 border rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Articles needing FAQs
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-amber-600">
                    {articlesNeedingFAQs?.length || 0}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>How it works</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              This tool uses AI to automatically generate relevant FAQ sections for all published
              articles that don't have them yet. Each FAQ includes:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>3-5 relevant question-answer pairs</li>
              <li>JSON-LD FAQPage schema markup for search engines</li>
              <li>Speakable schema for voice assistants</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              ⚡ New articles will automatically get FAQs when published!
            </p>
          </AlertDescription>
        </Alert>

        {/* Generation Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Generate FAQs</CardTitle>
            <CardDescription>
              Generate FAQ sections for all articles missing them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGenerateFAQs}
              disabled={isGenerating || !articlesNeedingFAQs || articlesNeedingFAQs.length === 0}
              size="lg"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating FAQs...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate FAQs for {articlesNeedingFAQs?.length || 0} Articles
                </>
              )}
            </Button>

            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Results Summary */}
            {results && (
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold text-lg">Generation Results</h3>
                
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/30">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Successful</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {results.successful}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/30">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Failed</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {results.failed}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Total</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {results.total}
                    </div>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 text-sm text-destructive">
                      Failed Articles:
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {results.errors.map((err, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/30 text-sm">
                          <div className="font-medium">{err.headline}</div>
                          <div className="text-xs text-muted-foreground mt-1">{err.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto-generation Info */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              ⚡ Automatic FAQ Generation
            </CardTitle>
            <CardDescription>
              FAQs are now generated automatically for new articles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When you publish a new article, FAQs will be automatically generated in the background.
              You don't need to manually trigger generation for new content!
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
