import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogArticle } from "@/types/blog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Globe, Plus, AlertCircle, CheckCircle2, Shield, RefreshCw, Rocket, Sparkles, Activity, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { validateSchemaRequirements } from "@/lib/schemaGenerator";
import { toast } from "sonner";
import { useState } from "react";
import { ContentFreshnessPanel } from "@/components/admin/ContentFreshnessPanel";
import { CitationHealthWidget } from "@/components/admin/CitationHealthWidget";
import { SitemapHealthWidget } from "@/components/admin/SitemapHealthWidget";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isRebuilding, setIsRebuilding] = useState(false);

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ["articles-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*");
      
      if (error) throw error;
      if (!data) return [];

      return data as unknown as BlogArticle[];
    },
  });

  // Fetch latest hygiene report for dashboard widget
  const { data: latestHygieneReport } = useQuery({
    queryKey: ['dashboard-hygiene-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citation_hygiene_reports')
        .select('*')
        .order('scan_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Loading statistics...</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
                <h2 className="text-2xl font-bold">Unable to Load Dashboard</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {error instanceof Error 
                    ? error.message 
                    : "There was a problem loading dashboard statistics. Please try again."}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Reload Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  // Calculate statistics
  const stats = {
    draft: articles?.filter(a => a.status === 'draft').length || 0,
    published: articles?.filter(a => a.status === 'published').length || 0,
    archived: articles?.filter(a => a.status === 'archived').length || 0,
    tofu: articles?.filter(a => a.funnel_stage === 'TOFU').length || 0,
    mofu: articles?.filter(a => a.funnel_stage === 'MOFU').length || 0,
    bofu: articles?.filter(a => a.funnel_stage === 'BOFU').length || 0,
  };

  // Count by language
  const languageCounts = articles?.reduce((acc, article) => {
    acc[article.language] = (acc[article.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', de: 'German', nl: 'Dutch',
    fr: 'French', pl: 'Polish', sv: 'Swedish', da: 'Danish', hu: 'Hungarian'
  };

  // Calculate schema health
  const schemaHealth = articles?.reduce((acc, article) => {
    const validationErrors = validateSchemaRequirements(article);
    const hasErrors = validationErrors.some(e => e.severity === 'error');
    if (!hasErrors) acc.valid++;
    else acc.needsAttention++;
    return acc;
  }, { valid: 0, needsAttention: 0 });

  const schemaHealthScore = articles && articles.length > 0
    ? Math.round((schemaHealth!.valid / articles.length) * 100)
    : 0;

  // Calculate FAQ statistics
  const faqStats = articles?.reduce((acc, article) => {
    const hasFAQs = article.faq_entities && Array.isArray(article.faq_entities) && article.faq_entities.length > 0;
    if (hasFAQs) {
      acc.withFAQs++;
      acc.totalFAQs += article.faq_entities.length;
    } else {
      acc.withoutFAQs++;
    }
    return acc;
  }, { withFAQs: 0, withoutFAQs: 0, totalFAQs: 0 });

  const faqCoverage = articles && articles.length > 0
    ? Math.round((faqStats!.withFAQs / articles.length) * 100)
    : 0;

  const handleRebuildSite = async () => {
    setIsRebuilding(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-rebuild');
      
      if (error) throw error;
      
      toast.success('Site rebuild triggered!', {
        description: 'Static pages will regenerate in 5-10 minutes',
      });
      
      console.log('Rebuild response:', data);
    } catch (error) {
      console.error('Rebuild error:', error);
      toast.error('Failed to trigger rebuild', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your blog content
            </p>
          </div>
          <Button onClick={() => navigate('/admin/articles/new')} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create New Article
          </Button>
        </div>

        {/* SSG Status Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Static Site Generation</CardTitle>
            <Rocket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-primary">
                {stats.published}
              </div>
              <span className="text-xs text-muted-foreground">static pages</span>
            </div>
            <Button 
              onClick={handleRebuildSite} 
              disabled={isRebuilding}
              size="sm"
              className="w-full"
            >
              {isRebuilding ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Rebuilding...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rebuild Static Pages
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Regenerate static HTML for all published articles
            </p>
          </CardContent>
        </Card>

        {/* Status Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Draft Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Work in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Published Articles</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
              <p className="text-xs text-muted-foreground">Live content</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Archived Articles</CardTitle>
              <FileText className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.archived}</div>
              <p className="text-xs text-muted-foreground">Old content</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Schema Health</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className={`text-2xl font-bold ${
                  schemaHealthScore >= 90 ? 'text-green-600' : 
                  schemaHealthScore >= 70 ? 'text-amber-600' : 
                  'text-red-600'
                }`}>
                  {schemaHealthScore}%
                </div>
                {schemaHealthScore === 100 && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {schemaHealth?.needsAttention ? (
                  <>{schemaHealth.needsAttention} article{schemaHealth.needsAttention !== 1 ? 's' : ''} need{schemaHealth.needsAttention === 1 ? 's' : ''} attention</>
                ) : (
                  'All schemas valid'
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Stage Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Articles by Funnel Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">TOFU (Top of Funnel)</span>
                  <span className="text-2xl font-bold text-blue-600">{stats.tofu}</span>
                </div>
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${articles ? (stats.tofu / articles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">MOFU (Middle of Funnel)</span>
                  <span className="text-2xl font-bold text-amber-600">{stats.mofu}</span>
                </div>
                <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-600 rounded-full"
                    style={{ width: `${articles ? (stats.mofu / articles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">BOFU (Bottom of Funnel)</span>
                  <span className="text-2xl font-bold text-green-600">{stats.bofu}</span>
                </div>
                <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 rounded-full"
                    style={{ width: `${articles ? (stats.bofu / articles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Citation Health Widget */}
        <CitationHealthWidget />

        {/* Citation Hygiene Details (kept for historical data) */}
        {latestHygieneReport && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Citation Hygiene Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestHygieneReport ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground">Compliance Score</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`text-2xl font-bold ${
                        latestHygieneReport.compliance_score >= 90 ? 'text-green-600' : 
                        latestHygieneReport.compliance_score >= 70 ? 'text-yellow-600' : 
                        'text-destructive'
                      }`}>
                        {latestHygieneReport.compliance_score}%
                      </div>
                      {latestHygieneReport.compliance_score >= 90 ? (
                        <Badge variant="default" className="bg-green-600">Clean</Badge>
                      ) : (
                        <Badge variant="destructive">Action Needed</Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground">Violations</div>
                    <div className="text-2xl font-bold text-destructive mt-1">
                      {latestHygieneReport.banned_citations_found}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Scan</span>
                    <span className="font-medium">
                      {new Date(latestHygieneReport.scan_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Articles Scanned</span>
                    <span className="font-medium">{latestHygieneReport.total_articles_scanned}</span>
                  </div>
                  {latestHygieneReport.clean_replacements_applied > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Auto-Fixed</span>
                      <span className="font-medium text-green-600">
                        {latestHygieneReport.clean_replacements_applied}
                      </span>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => navigate('/admin/citation-sanitization')}
                  size="sm"
                  className="w-full"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  View Full Report
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compliance Status</span>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    No Scans Yet
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Run your first citation hygiene scan to monitor competitor domains
                </p>
                <Button 
                  onClick={() => navigate('/admin/citation-sanitization')}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Run First Scan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* FAQ Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              FAQ Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-6 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Articles with FAQs
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {faqStats?.withFAQs || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {faqCoverage}% coverage
                </div>
              </div>

              <div className="p-6 border rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Missing FAQs
                </div>
                <div className="text-3xl font-bold text-amber-600">
                  {faqStats?.withoutFAQs || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {faqStats?.withoutFAQs ? 'Need generation' : 'All covered'}
                </div>
              </div>

              <div className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Total FAQs
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {faqStats?.totalFAQs || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Avg: {articles && articles.length > 0 ? ((faqStats?.totalFAQs || 0) / articles.length).toFixed(1) : 0} per article
                </div>
              </div>
            </div>

            {faqStats && faqStats.withoutFAQs > 0 && (
              <Button 
                onClick={() => navigate('/admin/faq-backfill')}
                className="w-full mt-4"
                variant="outline"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate FAQs for {faqStats.withoutFAQs} Articles
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Content Freshness Monitor */}
        <ContentFreshnessPanel />

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Articles by Language
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {languageCounts && Object.entries(languageCounts).map(([lang, count]) => (
                <div key={lang} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{languageNames[lang] || lang.toUpperCase()}</span>
                  <span className="text-lg font-bold text-primary">{count}</span>
                </div>
              ))}
              {(!languageCounts || Object.keys(languageCounts).length === 0) && (
                <p className="text-sm text-muted-foreground col-span-3">No articles yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
