import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const CitationComplianceDashboard = () => {
  const { data: recentReports, isLoading } = useQuery({
    queryKey: ['citation-hygiene-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citation_hygiene_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: articlesStats } = useQuery({
    queryKey: ['articles-citation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, external_citations, has_dead_citations')
        .eq('status', 'published');
      
      if (error) throw error;
      
      const totalArticles = data.length;
      const articlesWithCitations = data.filter(a => 
        a.external_citations && (a.external_citations as any[]).length > 0
      ).length;
      const articlesWithDeadCitations = data.filter(a => a.has_dead_citations).length;
      
      return { totalArticles, articlesWithCitations, articlesWithDeadCitations };
    },
  });

  const { data: replacementStats } = useQuery({
    queryKey: ['replacement-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citation_replacement_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      const totalAutoApplied = data.reduce((sum, job) => sum + (job.auto_applied_count || 0), 0);
      const totalManualReview = data.reduce((sum, job) => sum + (job.manual_review_count || 0), 0);
      const totalBlocked = data.reduce((sum, job) => sum + (job.blocked_competitor_count || 0), 0);
      
      return { totalAutoApplied, totalManualReview, totalBlocked, recentJobs: data };
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading compliance data...</div>;
  }

  const latestReport = recentReports?.[0];
  const previousReport = recentReports?.[1];

  const complianceScore = latestReport?.compliance_score || 0;
  const previousScore = previousReport?.compliance_score || 0;
  const scoreChange = complianceScore - previousScore;
  const isImprovement = scoreChange > 0;

  const violationsRemoved = (previousReport?.banned_citations_found || 0) - (latestReport?.banned_citations_found || 0);
  const articlesCleanedCount = latestReport?.articles_cleaned || 0;
  const replacementsApplied = latestReport?.clean_replacements_applied || 0;

  return (
    <div className="space-y-6">
      {/* Header Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            {isImprovement ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceScore.toFixed(1)}%</div>
            <Progress value={complianceScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {isImprovement ? '+' : ''}{scoreChange.toFixed(1)}% from previous scan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violations Removed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{violationsRemoved}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {replacementsApplied} automated replacements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles Cleaned</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{articlesCleanedCount}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Out of {articlesStats?.totalArticles || 0} total articles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Violations</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestReport?.banned_citations_found || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {latestReport?.articles_with_violations || 0} articles affected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Before/After Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Before Cleanup</CardTitle>
            <CardDescription>
              {previousReport ? new Date(previousReport.scan_date).toLocaleDateString() : 'No previous scan'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Violations</span>
              <Badge variant="destructive">{previousReport?.banned_citations_found || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Affected Articles</span>
              <Badge variant="destructive">{previousReport?.articles_with_violations || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Compliance Score</span>
              <Badge variant="secondary">{previousScore.toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>After Cleanup</CardTitle>
            <CardDescription>
              {latestReport ? new Date(latestReport.scan_date).toLocaleDateString() : 'No recent scan'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Violations</span>
              <Badge variant={latestReport?.banned_citations_found === 0 ? "default" : "destructive"}>
                {latestReport?.banned_citations_found || 0}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Affected Articles</span>
              <Badge variant={latestReport?.articles_with_violations === 0 ? "default" : "destructive"}>
                {latestReport?.articles_with_violations || 0}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Compliance Score</span>
              <Badge variant="default">{complianceScore.toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Offenders Removed */}
      {latestReport?.top_offenders && (latestReport.top_offenders as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Domains Cleaned</CardTitle>
            <CardDescription>Most frequently removed competitor domains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(latestReport.top_offenders as any[]).slice(0, 10).map((offender: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="text-sm font-mono">{offender.domain}</span>
                  </div>
                  <Badge variant="destructive">{offender.count} citations</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Violations by Language */}
      {latestReport?.violations_by_language && (
        <Card>
          <CardHeader>
            <CardTitle>Violations by Language</CardTitle>
            <CardDescription>Remaining violations breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(latestReport.violations_by_language as Record<string, number>).map(([lang, count]) => (
                <div key={lang} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{lang}</span>
                    <span className="font-medium">{count} violations</span>
                  </div>
                  <Progress value={(count / (latestReport.banned_citations_found || 1)) * 100} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Alert */}
      {latestReport?.banned_citations_found === 0 ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Perfect compliance!</strong> No competitor citations detected. All articles are clean.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {latestReport?.banned_citations_found} violations still active. Run batch replacement to clean remaining citations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
