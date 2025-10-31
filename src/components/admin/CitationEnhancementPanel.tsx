import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  FileText,
  TrendingUp,
  Target,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface CitationDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface EnhancementStats {
  totalArticles: number;
  articlesBelow5: number;
  articlesAt5to7: number;
  articlesAbove7: number;
  averageCitations: number;
  targetComplianceRate: number;
  distribution: CitationDistribution[];
}

export const CitationEnhancementPanel = () => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<any>(null);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["citation-enhancement-stats"],
    queryFn: async () => {
      const { data: articles, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, external_citations")
        .eq("status", "published");

      if (error) throw error;

      const stats: EnhancementStats = {
        totalArticles: articles?.length || 0,
        articlesBelow5: 0,
        articlesAt5to7: 0,
        articlesAbove7: 0,
        averageCitations: 0,
        targetComplianceRate: 0,
        distribution: [
          { range: "0-2", count: 0, percentage: 0 },
          { range: "3-4", count: 0, percentage: 0 },
          { range: "5-7", count: 0, percentage: 0 },
          { range: "8+", count: 0, percentage: 0 },
        ],
      };

      let totalCitations = 0;

      articles?.forEach((article: any) => {
        const citationCount = (article.external_citations || []).length;
        totalCitations += citationCount;

        if (citationCount < 5) stats.articlesBelow5++;
        else if (citationCount >= 5 && citationCount <= 7) stats.articlesAt5to7++;
        else stats.articlesAbove7++;

        // Distribution
        if (citationCount <= 2) stats.distribution[0].count++;
        else if (citationCount <= 4) stats.distribution[1].count++;
        else if (citationCount <= 7) stats.distribution[2].count++;
        else stats.distribution[3].count++;
      });

      stats.averageCitations = stats.totalArticles > 0 
        ? parseFloat((totalCitations / stats.totalArticles).toFixed(1))
        : 0;

      stats.targetComplianceRate = stats.totalArticles > 0
        ? Math.round(((stats.articlesAt5to7 + stats.articlesAbove7) / stats.totalArticles) * 100)
        : 0;

      stats.distribution.forEach(range => {
        range.percentage = stats.totalArticles > 0
          ? Math.round((range.count / stats.totalArticles) * 100)
          : 0;
      });

      return stats;
    },
  });

  const enhanceMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      setIsEnhancing(true);
      const { data, error } = await supabase.functions.invoke("bulk-enhance-citations", {
        body: { dryRun, targetCitationCount: 6 },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setEnhancementResult(data);
      if (!data.dryRun) {
        toast.success(`✅ ${data.message}`);
        refetch();
      } else {
        toast.info(`Preview: Would add ${data.totalCitationsAdded} citations to ${data.articlesUpdated} articles`);
      }
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
      console.error(error);
    },
    onSettled: () => {
      setIsEnhancing(false);
    },
  });

  const handleEnhance = (dryRun: boolean) => {
    if (!dryRun) {
      const confirmed = confirm(
        `This will add 2-3 citations to ${stats?.articlesBelow5 || 0} articles below the 5-citation threshold.\n\nThis operation may take several minutes. Continue?`
      );
      if (!confirmed) return;
    }
    enhanceMutation.mutate(dryRun);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getComplianceStatus = (rate: number) => {
    if (rate >= 90) return { color: "text-green-600", label: "Excellent", variant: "default" as const };
    if (rate >= 70) return { color: "text-blue-600", label: "Good", variant: "secondary" as const };
    if (rate >= 50) return { color: "text-orange-600", label: "Needs Work", variant: "secondary" as const };
    return { color: "text-red-600", label: "Critical", variant: "destructive" as const };
  };

  const status = getComplianceStatus(stats?.targetComplianceRate || 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Citations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.averageCitations}</div>
            <p className="text-xs text-muted-foreground mt-1">Target: 5-7 per article</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Target Compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${status.color}`}>
              {stats?.targetComplianceRate}%
            </div>
            <Badge variant={status.variant} className="mt-2">{status.label}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Need Enhancement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats?.articlesBelow5}</div>
            <p className="text-xs text-muted-foreground mt-1">Articles with &lt;5 citations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Optimal Range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.articlesAt5to7}</div>
            <p className="text-xs text-muted-foreground mt-1">Articles with 5-7 citations</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Citation Distribution</CardTitle>
          <CardDescription>Number of citations per article across the site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats?.distribution.map((range) => (
            <div key={range.range} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{range.range} citations</span>
                <span className="text-muted-foreground">
                  {range.count} articles ({range.percentage}%)
                </span>
              </div>
              <Progress value={range.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Enhancement Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Bulk Citation Enhancement
          </CardTitle>
          <CardDescription>
            Automatically add 2-3 high-authority citations to articles below the 5-citation threshold
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats?.articlesBelow5 === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                ✅ All articles have sufficient citations! No enhancement needed.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <Target className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">📊 Enhancement Strategy</p>
                  <ul className="space-y-1 text-sm">
                    <li>• Target: {stats?.articlesBelow5} articles need additional citations</li>
                    <li>• Will add 2-3 citations per article (capped at 8 total)</li>
                    <li>• Sources: Government, news, academic, and organizational sites only</li>
                    <li>• Automatic year extraction and authority scoring</li>
                    <li>• Duplicate detection to avoid redundancy</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <Award className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-1">Expected Impact</p>
                  <p className="text-sm">
                    After enhancement: Average citations will increase from{" "}
                    <strong>{stats?.averageCitations}</strong> to{" "}
                    <strong className="text-green-600">
                      ~{(stats?.averageCitations + 1.5).toFixed(1)}
                    </strong>
                    , pushing compliance rate to <strong className="text-green-600">~90%</strong>
                  </p>
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleEnhance(true)}
                  disabled={isEnhancing}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Preview Changes (Dry Run)
                </Button>
                <Button
                  onClick={() => handleEnhance(false)}
                  disabled={isEnhancing}
                >
                  {isEnhancing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  Enhance {stats?.articlesBelow5} Articles
                </Button>
              </div>
            </>
          )}

          {enhancementResult && (
            <Alert className="mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">{enhancementResult.message}</div>
                <div className="text-sm space-y-1">
                  <p>• Total articles checked: {enhancementResult.totalArticlesChecked}</p>
                  <p>• Articles updated: {enhancementResult.articlesUpdated}</p>
                  <p>• Total citations added: {enhancementResult.totalCitationsAdded}</p>
                  <p>• Average per article: {enhancementResult.averageCitationsAdded}</p>
                  {enhancementResult.errors && enhancementResult.errors.length > 0 && (
                    <p className="text-orange-600">
                      • Warnings: {enhancementResult.errors.length} (some articles couldn't find suitable citations)
                    </p>
                  )}
                </div>
                {enhancementResult.sampleResults && enhancementResult.sampleResults.length > 0 && (
                  <div className="mt-3 text-xs">
                    <p className="font-semibold mb-1">Sample results:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {enhancementResult.sampleResults.map((result: any, i: number) => (
                        <li key={i}>
                          {result.slug}: {result.before} → {result.after} citations (+{result.added})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!enhancementResult.dryRun && enhancementResult.articlesUpdated > 0 && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                    <p className="font-semibold text-blue-900">🎯 Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800 mt-1">
                      <li>Run "Pre-render Citations" to inject into HTML</li>
                      <li>Trigger production rebuild</li>
                      <li>Verify in Google Rich Results Test</li>
                      <li>Monitor AI Citation Readiness score increase (+3 to +5 points)</li>
                    </ol>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
