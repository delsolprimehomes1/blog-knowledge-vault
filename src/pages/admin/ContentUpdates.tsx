import { AdminLayout } from "@/components/AdminLayout";
import { ContentFreshnessPanel } from "@/components/admin/ContentFreshnessPanel";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link2, CheckCircle2, AlertTriangle, Image } from "lucide-react";
import { toast } from "sonner";

const ContentUpdates = () => {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [isDiagramBackfilling, setIsDiagramBackfilling] = useState(false);
  const [diagramBackfillResult, setDiagramBackfillResult] = useState<any>(null);

  const handleBackfillInternalLinks = async () => {
    try {
      setIsBackfilling(true);
      setBackfillResult(null);
      
      toast.info("🔗 Starting internal links backfill...", {
        description: "This may take several minutes for large article counts"
      });

      const { data, error } = await supabase.functions.invoke('backfill-internal-links', {
        body: {}
      });

      if (error) throw error;

      setBackfillResult(data);
      
      if (data.success) {
        toast.success(`✅ Internal links backfill complete!`, {
          description: `${data.success_count}/${data.total_articles} articles updated successfully`
        });
      } else {
        toast.error("❌ Backfill failed", {
          description: data.error
        });
      }
    } catch (error) {
      console.error('Backfill error:', error);
      toast.error("❌ Failed to backfill internal links", {
        description: error instanceof Error ? error.message : 'Unknown error'
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
                <li>Process in batches of 5 with delays to respect rate limits</li>
                <li>⏱️ Estimated time: ~30 minutes for 200+ articles</li>
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
                  Generating Diagrams... (This takes ~30min)
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

        <ContentFreshnessPanel />

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
