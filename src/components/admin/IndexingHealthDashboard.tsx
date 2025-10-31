import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Link, 
  FileText,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

export const IndexingHealthDashboard = () => {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);

  // Fetch articles with indexing issues
  const { data: articles, isLoading, refetch } = useQuery({
    queryKey: ["indexing-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, canonical_url, date_published, date_modified, status, language")
        .eq("status", "published");
      
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: articles?.length || 0,
    withCanonical: articles?.filter(a => a.canonical_url).length || 0,
    missingCanonical: articles?.filter(a => !a.canonical_url).length || 0,
    recentlyUpdated: articles?.filter(a => {
      const daysSince = a.date_modified 
        ? Math.floor((Date.now() - new Date(a.date_modified).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return daysSince <= 7;
    }).length || 0,
    needsFreshness: articles?.filter(a => {
      const daysSince = a.date_modified 
        ? Math.floor((Date.now() - new Date(a.date_modified).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return daysSince > 90;
    }).length || 0,
  };

  const handleBackfillCanonicals = async (dryRun: boolean = false) => {
    setIsBackfilling(true);
    setBackfillResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-canonical-urls', {
        body: { dryRun }
      });

      if (error) throw error;

      setBackfillResult(data);
      toast.success(data.message);
      
      if (!dryRun) {
        refetch();
      }
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast.error(`Backfill failed: ${error.message}`);
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Published articles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canonical URLs</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withCanonical}</div>
            <p className="text-xs text-muted-foreground">
              {stats.missingCanonical > 0 ? (
                <span className="text-yellow-600">
                  ⚠️ {stats.missingCanonical} missing
                </span>
              ) : (
                "✅ All configured"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentlyUpdated}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Refresh</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.needsFreshness}</div>
            <p className="text-xs text-muted-foreground">
              {stats.needsFreshness > 0 ? "90+ days old" : "All fresh"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Canonical URL Backfill */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Canonical URL Management
          </CardTitle>
          <CardDescription>
            Ensure all articles have proper canonical URLs for Google Search Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.missingCanonical > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Action Required:</strong> {stats.missingCanonical} articles are missing canonical URLs.
                This causes duplicate content issues in Google Search Console.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={() => handleBackfillCanonicals(true)}
              disabled={isBackfilling}
              variant="outline"
            >
              {isBackfilling ? "Processing..." : "Dry Run (Preview)"}
            </Button>
            <Button 
              onClick={() => handleBackfillCanonicals(false)}
              disabled={isBackfilling || stats.missingCanonical === 0}
            >
              {isBackfilling ? "Processing..." : `Backfill ${stats.missingCanonical} Canonical URLs`}
            </Button>
          </div>

          {backfillResult && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>{backfillResult.message}</strong></p>
                  <div className="text-sm">
                    <Badge variant="secondary">{backfillResult.updated} Updated</Badge>
                    <Badge variant="outline" className="ml-2">{backfillResult.skipped} Skipped</Badge>
                    {backfillResult.failed > 0 && (
                      <Badge variant="destructive" className="ml-2">{backfillResult.failed} Failed</Badge>
                    )}
                  </div>
                  {backfillResult.results?.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">View Sample Results</summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(backfillResult.results, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            SEO Tools & Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="/sitemap" target="_blank">
              <FileText className="mr-2 h-4 w-4" />
              Generate Sitemap.xml
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
              <Globe className="mr-2 h-4 w-4" />
              Google Search Console
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Rich Results Test
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Articles List */}
      {articles && articles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Article Status</CardTitle>
            <CardDescription>
              Review canonical URLs and indexing readiness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {articles.slice(0, 20).map(article => (
                <div 
                  key={article.id} 
                  className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{article.headline}</p>
                    <p className="text-xs text-muted-foreground truncate">/blog/{article.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {article.canonical_url ? (
                      <Badge variant="secondary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Canonical
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Missing
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {articles.length > 20 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing 20 of {articles.length} articles
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
