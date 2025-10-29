import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, XCircle, AlertCircle, TrendingUp, TrendingDown,
  Download, Loader2, ExternalLink, Shield
} from "lucide-react";
import { toast } from "sonner";

interface ComplianceReport {
  summary: {
    totalArticles: number;
    totalCitations: number;
    approvedCitations: number;
    nonApprovedCitations: number;
    competitorCitations: number;
    governmentSourcesCount: number;
    healthyCitations: number;
    brokenCitations: number;
    unreachableCitations: number;
    complianceScore: number;
    governmentSourcePercentage: string;
    activeAlerts: number;
  };
  byCategory: Array<{
    category: string;
    count: number;
    percentage: string;
  }>;
  violations: Array<{
    articleId: string;
    articleTitle: string;
    articleSlug: string;
    citationUrl: string;
    violationType: string;
    severity: string;
  }>;
  recommendations: string[];
  metadata: {
    generatedAt: string;
    totalApprovedDomains: number;
    reportVersion: string;
  };
}

export const CitationComplianceReport = () => {
  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["citation-compliance-report"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-citation-compliance-report");
      if (error) throw error;
      return data.report as ComplianceReport;
    },
  });

  const exportReport = () => {
    if (!report) return;
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citation-compliance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Report exported successfully");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating Compliance Report...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Citation Compliance Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to generate report. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { summary, byCategory, violations, recommendations, metadata } = report;
  const scoreColor = summary.complianceScore >= 90 ? 'text-green-600' : 
                     summary.complianceScore >= 75 ? 'text-orange-600' : 
                     'text-destructive';

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Citation Compliance Report</h2>
          <p className="text-sm text-muted-foreground">
            Generated {new Date(metadata.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Executive Summary
          </CardTitle>
          <CardDescription>
            Overall compliance health across {summary.totalArticles} published articles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Compliance Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compliance Score</span>
                <span className={`text-2xl font-bold ${scoreColor}`}>
                  {summary.complianceScore}%
                </span>
              </div>
              <Progress value={summary.complianceScore} className="h-2" />
              {summary.complianceScore >= 90 && (
                <p className="text-xs text-green-600">✅ Excellent compliance</p>
              )}
              {summary.complianceScore >= 75 && summary.complianceScore < 90 && (
                <p className="text-xs text-orange-600">⚠️ Good, but room for improvement</p>
              )}
              {summary.complianceScore < 75 && (
                <p className="text-xs text-destructive">🚫 Needs immediate attention</p>
              )}
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Citations</p>
                <p className="text-2xl font-bold">{summary.totalCitations}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{summary.approvedCitations}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Gov Sources</p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.governmentSourcesCount}
                  <span className="text-sm ml-1">({summary.governmentSourcePercentage}%)</span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-orange-600">{summary.activeAlerts}</p>
              </div>
            </div>

            {/* Critical Issues */}
            {(summary.competitorCitations > 0 || summary.nonApprovedCitations > 0) && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Critical Issues:</strong>
                  {summary.competitorCitations > 0 && (
                    <> {summary.competitorCitations} competitor citation{summary.competitorCitations !== 1 ? 's' : ''}</>
                  )}
                  {summary.competitorCitations > 0 && summary.nonApprovedCitations > 0 && ', '}
                  {summary.nonApprovedCitations > 0 && (
                    <> {summary.nonApprovedCitations} non-approved domain{summary.nonApprovedCitations !== 1 ? 's' : ''}</>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Actionable Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Citations by Category */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Citations by Category</CardTitle>
          <CardDescription>
            Distribution across {metadata.totalApprovedDomains} approved domains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {byCategory.slice(0, 10).map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cat.category.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">
                    {cat.count} ({cat.percentage}%)
                  </span>
                </div>
                <Progress value={parseFloat(cat.percentage)} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Violations */}
      {violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Active Violations ({violations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {violations.slice(0, 20).map((violation, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={violation.severity === 'critical' ? 'destructive' : 'default'}>
                          {violation.violationType.replace(/_/g, ' ')}
                        </Badge>
                        {violation.severity === 'critical' && <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                      <p className="text-sm font-medium">{violation.articleTitle}</p>
                      {violation.citationUrl && (
                        <a 
                          href={violation.citationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 break-all mt-1"
                        >
                          {violation.citationUrl}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/admin/article-editor?id=${violation.articleId}`, '_blank')}
                    >
                      Fix
                    </Button>
                  </div>
                </div>
              ))}
              {violations.length > 20 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing top 20 of {violations.length} violations
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>🏥 Citation Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{summary.healthyCitations}</p>
              <p className="text-xs text-muted-foreground">Healthy</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{summary.brokenCitations}</p>
              <p className="text-xs text-muted-foreground">Broken</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-2xl font-bold">{summary.unreachableCitations}</p>
              <p className="text-xs text-muted-foreground">Unreachable</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
