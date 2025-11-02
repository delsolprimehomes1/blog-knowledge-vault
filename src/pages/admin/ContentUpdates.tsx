import { AdminLayout } from "@/components/AdminLayout";
import { lazy, Suspense, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, CheckCircle2, AlertTriangle, Image } from "lucide-react";
import { toast } from "sonner";

// Lazy load the heavy ContentFreshnessPanel component
const ContentFreshnessPanel = lazy(() => 
  import("@/components/admin/ContentFreshnessPanel").then(module => ({
    default: module.ContentFreshnessPanel
  }))
);

const ContentUpdates = () => {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [isDiagramBackfilling, setIsDiagramBackfilling] = useState(false);
  const [diagramBackfillResult, setDiagramBackfillResult] = useState<any>(null);

  const handleBackfillInternalLinks = async () => {
    try {
      setIsBackfilling(true);
      setBackfillResult(null);
      
      const BATCH_SIZE = 25;
      
      // First, check how many articles need processing
      const { count } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .or('internal_links.is.null,internal_links.eq.[]');
      
      const totalArticles = count || 0;
      if (totalArticles === 0) {
        toast.info("✅ No articles need internal links");
        setBackfillResult({
          success: true,
          total_articles: 0,
          success_count: 0,
          error_count: 0
        });
        return;
      }

      const totalBatches = Math.ceil(totalArticles / BATCH_SIZE);
      
      toast.info(`🔗 Processing ${totalArticles} articles in ${totalBatches} batches...`, {
        description: "Each batch takes ~30 seconds"
      });

      let totalSuccess = 0;
      let totalErrors = 0;
      let allErrors: any[] = [];
      
      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const offset = batchNum * BATCH_SIZE;
        
        toast.info(`Processing batch ${batchNum + 1}/${totalBatches}...`, {
          description: `Articles ${offset + 1}-${Math.min(offset + BATCH_SIZE, totalArticles)}`
        });
        
        const { data, error } = await supabase.functions.invoke('backfill-internal-links', {
          body: { 
            limit: BATCH_SIZE, 
            offset 
          }
        });
        
        if (error) throw error;
        
        totalSuccess += data.success_count || 0;
        totalErrors += data.error_count || 0;
        if (data.errors) allErrors.push(...data.errors);
        
        // Wait 2 seconds between batches to avoid rate limits
        if (batchNum < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      const finalResult = {
        success: true,
        total_articles: totalArticles,
        success_count: totalSuccess,
        error_count: totalErrors,
        errors: allErrors.slice(0, 10)
      };
      
      setBackfillResult(finalResult);
      
      toast.success(`✅ Internal links backfill complete!`, {
        description: `${totalSuccess}/${totalArticles} articles updated successfully${totalErrors > 0 ? ` (${totalErrors} errors)` : ''}`
      });
    } catch (error) {
      console.error('Backfill error:', error);
      toast.error("❌ Failed to backfill internal links", {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      setBackfillResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleBackfillDiagrams = async () => {
    try {
      setIsDiagramBackfilling(true);
      setDiagramBackfillResult(null);
      
      toast.info("🎨 Starting diagram backfill...", {
        description: "This may take 30+ minutes for 200+ articles"
      });

      const { data, error } = await supabase.functions.invoke('backfill-diagrams', {
        body: {}
      });

      if (error) throw error;

      setDiagramBackfillResult(data);
      
      if (data.success) {
        toast.success(`✅ Diagram backfill complete!`, {
          description: `${data.success_count}/${data.total_articles} diagrams generated successfully`
        });
      } else {
        toast.error("❌ Backfill failed", {
          description: data.error
        });
      }
    } catch (error) {
      console.error('Diagram backfill error:', error);
      toast.error("❌ Failed to backfill diagrams", {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsDiagramBackfilling(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Content Updates Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and maintain content freshness for optimal AI citation likelihood.
          </p>
        </div>

        {/* Internal Links Backfill Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Internal Links Backfill
            </CardTitle>
            <CardDescription>
              Auto-populate internal links for all articles missing them using AI-powered link discovery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This tool will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Find all published articles with 0 internal links</li>
                <li>Generate 5-8 relevant internal links per article using AI</li>
                <li>Update the internal_links field in the database</li>
                <li>Process articles in batches to avoid rate limits</li>
              </ul>
            </div>

            {backfillResult && (
              <Alert className={backfillResult.success ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}>
                <div className="flex items-start gap-2">
                  {backfillResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  )}
                  <AlertDescription className="text-sm">
                    <div className="font-semibold mb-1">
                      {backfillResult.success ? "Backfill Complete" : "Backfill Failed"}
                    </div>
                    <div className="space-y-1">
                      {backfillResult.total_articles !== undefined && (
                        <p>Total articles processed: {backfillResult.total_articles}</p>
                      )}
                      {backfillResult.success_count !== undefined && (
                        <p className="text-green-600 dark:text-green-400">
                          ✅ Successfully updated: {backfillResult.success_count}
                        </p>
                      )}
                      {backfillResult.error_count > 0 && (
                        <p className="text-red-600 dark:text-red-400">
                          ❌ Errors: {backfillResult.error_count}
                        </p>
                      )}
                      {backfillResult.error && (
                        <p className="text-red-600 dark:text-red-400">
                          Error: {backfillResult.error}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <Button 
              onClick={handleBackfillInternalLinks}
              disabled={isBackfilling}
              size="lg"
              className="w-full"
            >
              {isBackfilling ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Backfilling Internal Links...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Run Internal Links Backfill
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Diagram Backfill Section */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              AI Diagram Generation Backfill
            </CardTitle>
            <CardDescription>
              Auto-generate funnel-stage-aware diagrams with full metadata for all articles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This tool will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Find all published articles without diagrams</li>
                <li>Generate BOFU → Flowcharts | MOFU → Comparisons | TOFU → Timelines</li>
                <li>Include AI-generated alt text, caption, and description for each diagram</li>
                <li>Process in batches of 3 with delays to respect rate limits</li>
                <li>⏱️ Estimated time: ~5 minutes per run (30-35 articles each)</li>
              </ul>
            </div>

            {diagramBackfillResult && (
              <Alert className={diagramBackfillResult.success ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}>
                <div className="flex items-start gap-2">
                  {diagramBackfillResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  )}
                  <AlertDescription className="text-sm">
                    <div className="font-semibold mb-1">
                      {diagramBackfillResult.success ? "Diagram Backfill Complete" : "Backfill Failed"}
                    </div>
                    <div className="space-y-1">
                      {diagramBackfillResult.total_articles !== undefined && (
                        <p>Total articles processed: {diagramBackfillResult.total_articles}</p>
                      )}
                      {diagramBackfillResult.success_count !== undefined && (
                        <p className="text-green-600 dark:text-green-400">
                          ✅ Diagrams generated: {diagramBackfillResult.success_count}
                        </p>
                      )}
                      {diagramBackfillResult.error_count > 0 && (
                        <p className="text-red-600 dark:text-red-400">
                          ❌ Errors: {diagramBackfillResult.error_count}
                        </p>
                      )}
                      {diagramBackfillResult.errors && diagramBackfillResult.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            View Errors ({diagramBackfillResult.errors.length})
                          </summary>
                          <pre className="text-xs mt-2 p-2 bg-muted rounded max-h-40 overflow-auto">
                            {JSON.stringify(diagramBackfillResult.errors, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <Button 
              onClick={handleBackfillDiagrams}
              disabled={isDiagramBackfilling}
              size="lg"
              className="w-full"
              variant="secondary"
            >
              {isDiagramBackfilling ? (
                <>
                  <span className="animate-spin mr-2">🎨</span>
                  Generating Diagrams... (This takes ~5min per run)
                </>
              ) : (
                <>
                  <Image className="mr-2 h-4 w-4" />
                  Run Diagram Backfill
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Lazy-loaded Content Freshness Panel with Suspense */}
        <Suspense
          fallback={
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-64" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-40" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </div>
            </Card>
          }
        >
          <ContentFreshnessPanel />
        </Suspense>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
          <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
            Content Refresh Best Practices
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• Update articles every 90 days minimum to maintain "fresh" status</li>
            <li>• Prioritize BOFU articles (buying guides, legal processes) for updates</li>
            <li>• Update statistics with current year data (property prices, tax rates, visa requirements)</li>
            <li>• Verify all external citations are still accessible and relevant</li>
            <li>• Add new FAQs based on recent user questions or policy changes</li>
            <li>• Update date_modified field to signal freshness to search engines and AI systems</li>
            <li>• Add update notes explaining what changed for internal tracking</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ContentUpdates;
