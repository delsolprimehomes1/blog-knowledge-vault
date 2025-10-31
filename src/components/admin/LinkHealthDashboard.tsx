import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Network,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Link as LinkIcon,
  FileWarning,
  RefreshCw,
} from "lucide-react";
import { calculateLinkDepth, generateDepthRecommendations } from "@/lib/linkDepthAnalyzer";
import { validateAllLinkPatterns, generatePatternComplianceReport } from "@/lib/linkPatternValidator";
import { useToast } from "@/hooks/use-toast";

export const LinkHealthDashboard = () => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch all published articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ["link-health-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, category, internal_links, link_depth, last_link_validation, funnel_stage, detailed_content")
        .eq("status", "published");

      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for link depth analysis
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("slug")
        .order("name");

      if (error) throw error;
      return data?.map(c => c.slug) || [];
    },
  });

  // Fetch active alerts
  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ["link-validation-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("link_validation_alerts")
        .select("*, blog_articles(slug, headline)")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Calculate link depth report
  const linkDepthReport = articles && categories
    ? calculateLinkDepth(articles as any, categories)
    : null;

  // Calculate pattern compliance
  const patternValidations = articles
    ? validateAllLinkPatterns(articles as any)
    : null;

  const complianceReport = patternValidations
    ? generatePatternComplianceReport(patternValidations)
    : null;

  const handleRunFullValidation = async () => {
    setIsAnalyzing(true);
    
    try {
      toast({
        title: "Running Full Validation",
        description: "This may take a few minutes...",
      });

      // Call batch validation edge function
      const { data, error } = await supabase.functions.invoke('batch-validate-all-links', {
        body: {},
      });

      if (error) throw error;

      toast({
        title: "Validation Complete",
        description: `Analyzed ${data?.articlesProcessed || 0} articles`,
      });

      refetchAlerts();

    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to run validation",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link Health Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Loading link health data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalArticles = articles?.length || 0;
  const articlesNeedingValidation = articles?.filter(
    a => !a.last_link_validation || 
    new Date(a.last_link_validation) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Link Health Dashboard
            </CardTitle>
            <CardDescription>
              Monitor internal link quality, depth, and compliance across all articles
            </CardDescription>
          </div>
          <Button
            onClick={handleRunFullValidation}
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Full Validation
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="depth">Link Depth</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold">{totalArticles}</div>
                  <div className="text-xs text-muted-foreground">Total Articles</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {linkDepthReport?.averageDepth.toFixed(1) || '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg. Link Depth</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {complianceReport?.averageComplianceScore || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Pattern Compliance</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {alerts?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Active Alerts</div>
                </CardContent>
              </Card>
            </div>

            {/* Validation Status */}
            {articlesNeedingValidation > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation Needed</AlertTitle>
                <AlertDescription>
                  {articlesNeedingValidation} article(s) haven't been validated in the last 7 days
                </AlertDescription>
              </Alert>
            )}

            {/* Link Depth Recommendations */}
            {linkDepthReport && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Link Depth Analysis</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1">
                    {generateDepthRecommendations(linkDepthReport).map((rec, idx) => (
                      <li key={idx} className="text-sm">• {rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Link Depth Tab */}
          <TabsContent value="depth" className="space-y-4">
            {linkDepthReport && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Maximum Depth:</span>
                    <Badge variant={linkDepthReport.maxDepth > 3 ? "destructive" : "default"}>
                      {linkDepthReport.maxDepth} clicks
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Average Depth:</span>
                    <Badge variant="outline">
                      {linkDepthReport.averageDepth} clicks
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Orphan Articles:</span>
                    <Badge variant={linkDepthReport.orphanArticles.length > 0 ? "destructive" : "default"}>
                      {linkDepthReport.orphanArticles.length}
                    </Badge>
                  </div>
                </div>

                {linkDepthReport.orphanArticles.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Orphan Articles Detected</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">These articles are not reachable from the homepage:</p>
                      <ul className="text-xs space-y-1">
                        {linkDepthReport.orphanArticles.slice(0, 5).map((url, idx) => (
                          <li key={idx}>• {url}</li>
                        ))}
                        {linkDepthReport.orphanArticles.length > 5 && (
                          <li>...and {linkDepthReport.orphanArticles.length - 5} more</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            {complianceReport && (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                      <div className="text-2xl font-bold">{complianceReport.fullyCompliant}</div>
                      <div className="text-xs text-muted-foreground">Fully Compliant</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <AlertTriangle className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
                      <div className="text-2xl font-bold">{complianceReport.partiallyCompliant}</div>
                      <div className="text-xs text-muted-foreground">Partially Compliant</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <XCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                      <div className="text-2xl font-bold">{complianceReport.nonCompliant}</div>
                      <div className="text-xs text-muted-foreground">Non-Compliant</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Missing Patterns</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Parent Category Links</span>
                      <Badge variant="outline">
                        {complianceReport.missingPatternCounts.parent_category} missing
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Related Article Links</span>
                      <Badge variant="outline">
                        {complianceReport.missingPatternCounts.related_article} missing
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Service/Conversion Links</span>
                      <Badge variant="outline">
                        {complianceReport.missingPatternCounts.service_link} missing
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-3">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert: any) => (
                <Alert
                  key={alert.id}
                  variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                >
                  {alert.severity === 'critical' ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle className="flex items-center gap-2">
                    {alert.alert_type.replace(/_/g, ' ').toUpperCase()}
                    <Badge variant="outline" className="text-xs">
                      {alert.severity}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    <p className="text-sm">{alert.message}</p>
                    {alert.blog_articles && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Article: {alert.blog_articles.slug}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              ))
            ) : (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>All Clear</AlertTitle>
                <AlertDescription>
                  No active link health alerts. All articles are in good condition.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
