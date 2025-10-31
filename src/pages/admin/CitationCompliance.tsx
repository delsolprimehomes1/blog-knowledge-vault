import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  PlayCircle, 
  Download,
  RefreshCw,
  BarChart3,
  FileText
} from "lucide-react";
import { toast } from "sonner";

interface CitationStats {
  totalArticles: number;
  totalCitations: number;
  citationsWithYear: number;
  citationsWithoutYear: number;
  articlesWithLowCitations: number;
  articlesWithHighCitations: number;
  yearDistribution: Record<number, number>;
}

const CitationCompliance = () => {
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);

  // Fetch citation statistics
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["citation-compliance-stats"],
    queryFn: async () => {
      const { data: articles, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, external_citations")
        .eq("status", "published");

      if (error) throw error;

      const stats: CitationStats = {
        totalArticles: articles?.length || 0,
        totalCitations: 0,
        citationsWithYear: 0,
        citationsWithoutYear: 0,
        articlesWithLowCitations: 0,
        articlesWithHighCitations: 0,
        yearDistribution: {},
      };

      articles?.forEach((article: any) => {
        const citations = article.external_citations || [];
        stats.totalCitations += citations.length;

        if (citations.length < 2) stats.articlesWithLowCitations++;
        if (citations.length > 5) stats.articlesWithHighCitations++;

        citations.forEach((citation: any) => {
          if (citation.year) {
            stats.citationsWithYear++;
            stats.yearDistribution[citation.year] = (stats.yearDistribution[citation.year] || 0) + 1;
          } else {
            stats.citationsWithoutYear++;
          }
        });
      });

      return stats;
    },
  });

  // Backfill mutation
  const backfillMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      setIsBackfilling(true);
      const { data, error } = await supabase.functions.invoke("backfill-citation-years", {
        body: { dryRun },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setBackfillResult(data);
      if (!data.dryRun) {
        toast.success(`✅ ${data.message}`);
        refetch();
      } else {
        toast.info(`Preview: Would update ${data.citationsUpdated} citations`);
      }
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
      console.error(error);
    },
    onSettled: () => {
      setIsBackfilling(false);
    },
  });

  const handleBackfill = (dryRun: boolean) => {
    if (!dryRun) {
      const confirmed = confirm(
        "This will update citation years across all published articles. Continue?"
      );
      if (!confirmed) return;
    }
    backfillMutation.mutate(dryRun);
  };

  const compliancePercentage = stats
    ? Math.round((stats.citationsWithYear / stats.totalCitations) * 100)
    : 0;

  const getComplianceStatus = (percentage: number) => {
    if (percentage === 100) return { color: "text-green-600", label: "Excellent" };
    if (percentage >= 80) return { color: "text-blue-600", label: "Good" };
    if (percentage >= 50) return { color: "text-orange-600", label: "Needs Work" };
    return { color: "text-red-600", label: "Critical" };
  };

  const status = getComplianceStatus(compliancePercentage);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Citation Compliance Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Monitor and fix inline citation compliance for AEO/EEAT
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Compliance Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Compliance Score</span>
              <Badge variant={compliancePercentage === 100 ? "default" : "secondary"}>
                {compliancePercentage}%
              </Badge>
            </CardTitle>
            <CardDescription>
              Percentage of citations with publication year field
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={compliancePercentage} className="h-3" />
            <div className={`text-2xl font-bold ${status.color}`}>
              {status.label}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Articles</p>
                <p className="text-2xl font-bold">{stats?.totalArticles}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Citations</p>
                <p className="text-2xl font-bold">{stats?.totalCitations}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">With Year</p>
                <p className="text-2xl font-bold text-green-600">{stats?.citationsWithYear}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Missing Year</p>
                <p className="text-2xl font-bold text-red-600">{stats?.citationsWithoutYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="backfill" className="space-y-6">
          <TabsList>
            <TabsTrigger value="backfill">
              <PlayCircle className="h-4 w-4 mr-2" />
              Backfill Tool
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="backfill" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Intelligent Citation Year Backfill</CardTitle>
                <CardDescription>
                  Automatically populate missing year fields using URL analysis and article dates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.citationsWithoutYear === 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      ✅ All citations have year fields! No backfill needed.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {stats?.citationsWithoutYear} citations are missing year values.
                        The backfill tool will intelligently assign years based on:
                      </AlertDescription>
                    </Alert>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Extracting year from URL path (e.g., /2024/)</li>
                      <li>Using article's publication date</li>
                      <li>Using article's last modification date</li>
                      <li>Defaulting to 2024 for older content</li>
                    </ol>

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => handleBackfill(true)}
                        disabled={isBackfilling}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Preview Changes
                      </Button>
                      <Button
                        onClick={() => handleBackfill(false)}
                        disabled={isBackfilling}
                      >
                        {isBackfilling ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <PlayCircle className="h-4 w-4 mr-2" />
                        )}
                        Run Backfill
                      </Button>
                    </div>
                  </>
                )}

                {backfillResult && (
                  <Alert className="mt-4">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">{backfillResult.message}</div>
                      <div className="text-sm space-y-1">
                        <p>• Articles updated: {backfillResult.articlesUpdated}</p>
                        <p>• Citations fixed: {backfillResult.citationsUpdated}</p>
                        {backfillResult.errors && (
                          <p className="text-red-600">• Errors: {backfillResult.errors.length}</p>
                        )}
                      </div>
                      {backfillResult.sampleUpdates && backfillResult.sampleUpdates.length > 0 && (
                        <div className="mt-3 text-xs">
                          <p className="font-semibold mb-1">Sample updates:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {backfillResult.sampleUpdates.slice(0, 5).map((update: any, i: number) => (
                              <li key={i}>
                                {update.slug}: {update.citationsFixed} citations (via {update.method})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Citation Count Issues</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Articles with &lt; 2 citations</span>
                    <Badge variant="destructive">{stats?.articlesWithLowCitations}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Articles with &gt; 5 citations</span>
                    <Badge variant="secondary">{stats?.articlesWithHighCitations}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Year Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats?.yearDistribution || {})
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .slice(0, 5)
                      .map(([year, count]) => (
                        <div key={year} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{year}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={(count / stats!.totalCitations) * 100} className="h-2 w-24" />
                            <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default CitationCompliance;
