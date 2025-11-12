import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  FileCheck2, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Image as ImageIcon,
  Globe,
  Clock,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminLayout } from "@/components/AdminLayout";

export default function SitemapHealth() {
  const [isValidating, setIsValidating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch latest validation
  const { data: latestValidation, isLoading } = useQuery({
    queryKey: ['latest-sitemap-validation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sitemap_validations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch active alerts
  const { data: activeAlerts } = useQuery({
    queryKey: ['sitemap-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sitemap_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch validation history
  const { data: validationHistory } = useQuery({
    queryKey: ['sitemap-validation-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sitemap_validations')
        .select('id, created_at, health_score, coverage_percentage')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  // Run validation mutation
  const runValidation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('validate-sitemap', {
        body: { automated: false }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Sitemap validation completed successfully");
      queryClient.invalidateQueries({ queryKey: ['latest-sitemap-validation'] });
      queryClient.invalidateQueries({ queryKey: ['sitemap-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['sitemap-validation-history'] });
    },
    onError: (error: any) => {
      toast.error(`Validation failed: ${error.message}`);
    },
    onSettled: () => {
      setIsValidating(false);
    }
  });

  const handleRunValidation = () => {
    setIsValidating(true);
    runValidation.mutate();
  };

  const getScoreBadge = (score: number) => {
    if (score >= 95) return { variant: "default" as const, label: "A+", color: "text-green-600" };
    if (score >= 85) return { variant: "secondary" as const, label: "B", color: "text-blue-600" };
    if (score >= 75) return { variant: "secondary" as const, label: "C", color: "text-yellow-600" };
    return { variant: "destructive" as const, label: "F", color: "text-red-600" };
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'critical') return 'destructive';
    if (severity === 'warning') return 'secondary';
    return 'default';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const scoreBadge = latestValidation ? getScoreBadge(latestValidation.health_score) : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sitemap Health Monitor</h1>
            <p className="text-muted-foreground">
              Track sitemap coverage, quality, and technical validation
            </p>
          </div>
          <Button onClick={handleRunValidation} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            {isValidating ? 'Validating...' : 'Run Validation'}
          </Button>
        </div>

        {activeAlerts && activeAlerts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {activeAlerts.length} active alert{activeAlerts.length > 1 ? 's' : ''} require attention
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="coverage">Coverage</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {latestValidation ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                      <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${scoreBadge?.color}`}>
                          {latestValidation.health_score}/100
                        </div>
                        <Badge variant={scoreBadge?.variant}>{scoreBadge?.label}</Badge>
                      </div>
                      <Progress value={latestValidation.health_score} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{latestValidation.coverage_percentage}%</div>
                      <p className="text-xs text-muted-foreground">
                        {latestValidation.articles_in_sitemap} of {latestValidation.total_published_articles} articles
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeAlerts?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Requires attention
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Last Validated</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">
                        {new Date(latestValidation.created_at).toLocaleDateString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(latestValidation.created_at).toLocaleTimeString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                    <CardDescription>Actionable improvements for your sitemap</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {latestValidation.recommendations && Array.isArray(latestValidation.recommendations) && latestValidation.recommendations.length > 0 ? (
                      latestValidation.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                          <Badge variant={getSeverityBadge(rec.severity)}>
                            {rec.severity}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium">{rec.message}</p>
                            <p className="text-sm text-muted-foreground">{rec.action}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>No issues found. Your sitemap is in excellent condition!</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileCheck2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No validation data yet</p>
                  <p className="text-muted-foreground mb-4">Run your first validation to get started</p>
                  <Button onClick={handleRunValidation} disabled={isValidating}>
                    Run First Validation
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="coverage" className="space-y-4">
            {latestValidation && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Published Articles</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{latestValidation.total_published_articles}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>In Sitemap</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{latestValidation.articles_in_sitemap}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Missing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">
                        {Array.isArray(latestValidation.missing_article_slugs) ? latestValidation.missing_article_slugs.length : 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {Array.isArray(latestValidation.missing_article_slugs) && latestValidation.missing_article_slugs.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Missing Articles</CardTitle>
                      <CardDescription>
                        These published articles are not in the sitemap
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.isArray(latestValidation.missing_article_slugs) && latestValidation.missing_article_slugs.map((slug: string) => (
                          <div key={slug} className="flex items-center justify-between p-2 border rounded">
                            <code className="text-sm">{slug}</code>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            {latestValidation && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Last Modified Dates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>With lastmod:</span>
                        <span className="font-bold">{latestValidation.articles_with_lastmod}</span>
                      </div>
                      <Progress 
                        value={(latestValidation.articles_with_lastmod / latestValidation.articles_in_sitemap) * 100} 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Image Sitemap</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>With images:</span>
                        <span className="font-bold">{latestValidation.articles_with_images}</span>
                      </div>
                      <Progress 
                        value={(latestValidation.articles_with_images / latestValidation.articles_in_sitemap) * 100} 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Priority Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>With priority:</span>
                        <span className="font-bold">{latestValidation.articles_with_priority}</span>
                      </div>
                      <Progress 
                        value={(latestValidation.articles_with_priority / latestValidation.articles_in_sitemap) * 100} 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Change Frequency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>With changefreq:</span>
                        <span className="font-bold">{latestValidation.articles_with_changefreq}</span>
                      </div>
                      <Progress 
                        value={(latestValidation.articles_with_changefreq / latestValidation.articles_in_sitemap) * 100} 
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            {latestValidation && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>XML Valid</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {latestValidation.xml_is_valid ? (
                          <>
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                            <span className="text-green-600 font-bold">Valid</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-6 w-6 text-red-600" />
                            <span className="text-red-600 font-bold">Invalid</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Total URLs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{latestValidation.total_urls}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>File Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{latestValidation.sitemap_file_size_kb} KB</div>
                      <p className="text-xs text-muted-foreground">Max: 50 MB</p>
                    </CardContent>
                  </Card>
                </div>

                {latestValidation.xml_validation_errors && Array.isArray(latestValidation.xml_validation_errors) && latestValidation.xml_validation_errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Validation Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.isArray(latestValidation.xml_validation_errors) && latestValidation.xml_validation_errors.map((error: string, idx: number) => (
                          <Alert key={idx} variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {activeAlerts && activeAlerts.length > 0 ? (
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <Card key={alert.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Badge variant={getSeverityBadge(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                  <p className="text-lg font-medium">No active alerts</p>
                  <p className="text-muted-foreground">Your sitemap is healthy!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {validationHistory && validationHistory.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Validation History</CardTitle>
                  <CardDescription>Recent sitemap health checks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {validationHistory.map((validation) => {
                      const badge = getScoreBadge(validation.health_score);
                      return (
                        <div key={validation.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {new Date(validation.created_at).toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Coverage: {validation.coverage_percentage}%
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${badge.color}`}>
                              {validation.health_score}
                            </span>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No history yet</p>
                  <p className="text-muted-foreground">Run validations to build history</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
