import { AdminLayout } from "@/components/AdminLayout";
import { lazy, Suspense, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, CheckCircle2, AlertTriangle, Image, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { useBrokenLinksDetection } from "@/hooks/useBrokenLinksDetection";

// Lazy load the heavy ContentFreshnessPanel component
const ContentFreshnessPanel = lazy(() => 
  import("@/components/admin/ContentFreshnessPanel").then(module => ({
    default: module.ContentFreshnessPanel
  }))
);

const ContentUpdates = () => {
  const queryClient = useQueryClient();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [isDiagramBackfilling, setIsDiagramBackfilling] = useState(false);
  const [diagramBackfillResult, setDiagramBackfillResult] = useState<any>(null);
  const [isDeletingDiagrams, setIsDeletingDiagrams] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: number;
    errors: number;
    total: number;
  } | null>(null);
  const [isFixingCanonicals, setIsFixingCanonicals] = useState(false);
  const [canonicalFixResult, setCanonicalFixResult] = useState<any>(null);
  const [isFixingBrokenLinks, setIsFixingBrokenLinks] = useState(false);
  const [brokenLinksFixResult, setBrokenLinksFixResult] = useState<any>(null);

  // Detect broken links
  const { data: brokenLinksStats, isLoading: isLoadingBrokenLinks, refetch: refetchBrokenLinks } = useBrokenLinksDetection();

  // Query to count articles with diagrams
  const { data: articlesWithDiagrams = 0 } = useQuery({
    queryKey: ['articles-with-diagrams'],
    queryFn: async () => {
      const { count } = await supabase
        .from('blog_articles')
        .select('*', { count: 'exact', head: true })
        .or('diagram_url.not.is.null,diagram_alt.not.is.null,diagram_caption.not.is.null,diagram_description.not.is.null');
      return count || 0;
    }
  });

  const handleBackfillInternalLinks = async () => {
    try {
      setIsBackfilling(true);
      setBackfillResult(null);
      
      const BATCH_SIZE = 5;
      
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
        
        // Wait 5 seconds between batches to avoid rate limits
        if (batchNum < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
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
    setIsDiagramBackfilling(true);
    setDiagramBackfillResult(null);
    
    try {
      toast.info("Starting diagram generation...");
      
      const { data, error } = await supabase.functions.invoke('backfill-diagrams', {
        body: {}
      });

      if (error) throw error;

      setDiagramBackfillResult({
        success: data.success_count || 0,
        errors: data.error_count || 0,
        total: data.total_processed || 0
      });

      if (data.error_count > 0) {
        toast.warning(`Diagram generation completed with ${data.error_count} errors`);
      } else {
        toast.success(`Successfully generated diagrams for ${data.success_count} articles`);
      }

      await queryClient.invalidateQueries({ queryKey: ['blog-articles'] });
    } catch (error) {
      console.error('Error backfilling diagrams:', error);
      toast.error("Failed to generate diagrams");
    } finally {
      setIsDiagramBackfilling(false);
    }
  };

  const handleFixCanonicalUrls = async () => {
    setIsFixingCanonicals(true);
    setCanonicalFixResult(null);
    
    try {
      toast.info("Standardizing canonical URLs to delsolprimehomes.com...");
      
      const { data, error } = await supabase.functions.invoke('backfill-canonical-urls', {
        body: { dryRun: false }
      });

      if (error) throw error;

      setCanonicalFixResult(data);

      if (data.failed > 0) {
        toast.warning(`Canonical URL fix completed with ${data.failed} errors`);
      } else {
        toast.success(`✅ ${data.updated} canonical URLs standardized to delsolprimehomes.com`);
      }

      await queryClient.invalidateQueries({ queryKey: ['blog-articles'] });
    } catch (error) {
      console.error('Error fixing canonical URLs:', error);
      toast.error("Failed to fix canonical URLs");
      setCanonicalFixResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsFixingCanonicals(false);
    }
  };

  const handleBulkDeleteDiagrams = async () => {
    setIsDeletingDiagrams(true);
    setDeleteResult(null);
    
    try {
      toast.info("Deleting all diagrams...");
      
      const { data, error } = await supabase.functions.invoke('bulk-delete-diagrams', {
        body: {}
      });

      if (error) throw error;

      setDeleteResult({
        success: data.success_count || 0,
        errors: data.error_count || 0,
        total: data.total_processed || 0
      });

      if (data.error_count > 0) {
        toast.warning(`Deletion completed with ${data.error_count} errors`);
      } else {
        toast.success(`Successfully deleted diagrams from ${data.success_count} articles`);
      }

      await queryClient.invalidateQueries({ queryKey: ['blog-articles'] });
    } catch (error) {
      console.error('Error deleting diagrams:', error);
      toast.error("Failed to delete diagrams");
    } finally {
      setIsDeletingDiagrams(false);
    }
  };

  const handleFixBrokenLinks = async () => {
    setIsFixingBrokenLinks(true);
    setBrokenLinksFixResult(null);
    
    try {
      toast.info("🔗 Removing broken internal links...", {
        description: "This should take 30-60 seconds"
      });
      
      const { data, error } = await supabase.functions.invoke('remove-broken-internal-links', {
        body: {}
      });

      if (error) throw error;

      setBrokenLinksFixResult(data);

      if (!data.success) {
        toast.error(`❌ Failed to remove broken links`, {
          description: data.error || 'Unknown error'
        });
      } else {
        toast.success(`✅ Removed ${data.totalLinksRemoved} broken links!`, {
          description: `Updated ${data.articlesUpdated} articles`
        });
        // Refresh broken links detection
        await refetchBrokenLinks();
      }

      // Refetch broken links stats and article data
      await refetchBrokenLinks();
      await queryClient.invalidateQueries({ queryKey: ['blog-articles'] });
    } catch (error) {
      console.error('Error fixing broken links:', error);
      toast.error("Failed to fix broken links", {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      setBrokenLinksFixResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsFixingBrokenLinks(false);
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

        {/* Broken Internal Links Fix Section */}
        <Card className="border-destructive/30 bg-gradient-to-br from-destructive/10 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Broken Internal Links Detected
            </CardTitle>
            <CardDescription>
              Fix truncated slugs in the "Related Reading" section that cause 404 errors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingBrokenLinks ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-destructive/5 p-4 rounded-lg border border-destructive/20">
                    <div className="text-2xl font-bold text-destructive">
                      {brokenLinksStats?.totalBrokenLinks || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Broken Links Found</div>
                  </div>
                  <div className="bg-destructive/5 p-4 rounded-lg border border-destructive/20">
                    <div className="text-2xl font-bold text-destructive">
                      {brokenLinksStats?.articlesAffected || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Articles Affected</div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>Problem:</strong> Truncated slugs in internal_links JSONB field causing 404 errors</p>
                  <p><strong>Solution:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Scan all articles for broken internal link slugs</li>
                    <li>Remove broken links immediately (no regeneration)</li>
                    <li>Update internal_links field with only valid links</li>
                    <li>Fast processing - completes in 30-60 seconds</li>
                  </ul>
                </div>

                {brokenLinksFixResult && (
                  <Alert className={brokenLinksFixResult.success ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}>
                    <div className="flex items-start gap-2">
                      {brokenLinksFixResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                      )}
                      <AlertDescription className="text-sm">
                        <div className="font-semibold mb-1">
                          {brokenLinksFixResult.success ? "Broken Links Removed!" : "Removal Failed"}
                        </div>
                        <div className="space-y-1">
                          {brokenLinksFixResult.totalArticlesProcessed !== undefined && (
                            <p>Total articles scanned: {brokenLinksFixResult.totalArticlesProcessed}</p>
                          )}
                          {brokenLinksFixResult.articlesUpdated !== undefined && (
                            <p className="text-green-600 dark:text-green-400">
                              ✅ Articles updated: {brokenLinksFixResult.articlesUpdated}
                            </p>
                          )}
                          {brokenLinksFixResult.totalLinksRemoved !== undefined && (
                            <p className="text-green-600 dark:text-green-400">
                              🔗 Broken links removed: {brokenLinksFixResult.totalLinksRemoved}
                            </p>
                          )}
                          {brokenLinksFixResult.error && (
                            <p className="text-red-600 dark:text-red-400">
                              Error: {brokenLinksFixResult.error}
                            </p>
                          )}
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleFixBrokenLinks}
                    disabled={isFixingBrokenLinks || (brokenLinksStats?.totalBrokenLinks || 0) === 0}
                    size="lg"
                    className="flex-1"
                    variant="destructive"
                  >
                    {isFixingBrokenLinks ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Removing Broken Links...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove All {brokenLinksStats?.totalBrokenLinks || 0} Broken Links
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => refetchBrokenLinks()}
                    disabled={isLoadingBrokenLinks}
                    size="lg"
                    variant="outline"
                  >
                    {isLoadingBrokenLinks ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Refresh"
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

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

        {/* Canonical URLs Fix Section */}
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Fix Canonical URLs
            </CardTitle>
            <CardDescription>
              Standardize all canonical URLs to use delsolprimehomes.com (without www)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>This tool will:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Find all published articles with incorrect canonical URLs</li>
                <li>Update URLs to format: https://delsolprimehomes.com/blog/&#123;slug&#125;</li>
                <li>Fix articles pointing to delsolhomes.com (wrong domain)</li>
                <li>Remove www. prefix from URLs</li>
                <li>Process all articles in batches of 10</li>
              </ul>
            </div>

            {canonicalFixResult && (
              <Alert className={canonicalFixResult.success ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}>
                <div className="flex items-start gap-2">
                  {canonicalFixResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  )}
                  <AlertDescription className="text-sm">
                    <div className="font-semibold mb-1">
                      {canonicalFixResult.success ? "Canonical URLs Fixed" : "Fix Failed"}
                    </div>
                    <div className="space-y-1">
                      {canonicalFixResult.totalArticles !== undefined && (
                        <p>Total articles checked: {canonicalFixResult.totalArticles}</p>
                      )}
                      {canonicalFixResult.updated !== undefined && (
                        <p className="text-green-600 dark:text-green-400">
                          ✅ URLs updated: {canonicalFixResult.updated}
                        </p>
                      )}
                      {canonicalFixResult.skipped !== undefined && (
                        <p className="text-muted-foreground">
                          ⏭️ Already correct: {canonicalFixResult.skipped}
                        </p>
                      )}
                      {canonicalFixResult.failed > 0 && (
                        <p className="text-red-600 dark:text-red-400">
                          ❌ Errors: {canonicalFixResult.failed}
                        </p>
                      )}
                      {canonicalFixResult.error && (
                        <p className="text-red-600 dark:text-red-400">
                          Error: {canonicalFixResult.error}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <Button 
              onClick={handleFixCanonicalUrls}
              disabled={isFixingCanonicals}
              size="lg"
              className="w-full"
            >
              {isFixingCanonicals ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing Canonical URLs...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Standardize Canonical URLs
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

        {/* Bulk Delete AI Diagrams */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Bulk Delete AI Diagrams
            </CardTitle>
            <CardDescription>
              Remove all AI-generated diagrams from articles. This will clear diagram URLs, alt text, captions, and descriptions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This action cannot be undone. All diagram data will be permanently removed from affected articles.
              </AlertDescription>
            </Alert>

            {articlesWithDiagrams > 0 && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>{articlesWithDiagrams}</strong> articles currently have diagram data
                </p>
              </div>
            )}

            {deleteResult && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Deletion Complete</AlertTitle>
                <AlertDescription>
                  Successfully deleted diagrams from <strong>{deleteResult.success}</strong> articles
                  {deleteResult.errors > 0 && ` (${deleteResult.errors} errors)`}
                </AlertDescription>
              </Alert>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isDeletingDiagrams || articlesWithDiagrams === 0}
                  className="w-full"
                >
                  {isDeletingDiagrams ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting Diagrams...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Diagrams ({articlesWithDiagrams})
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete diagram data from <strong>{articlesWithDiagrams}</strong> articles.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDeleteDiagrams}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete All Diagrams
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
