import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogArticle } from "@/types/blog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Globe, Plus, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";

const Dashboard = () => {
  const navigate = useNavigate();

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

        {/* Status Stats */}
        <div className="grid gap-4 md:grid-cols-3">
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
