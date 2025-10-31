import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, RefreshCw, TrendingUp, PlayCircle } from "lucide-react";
import { ContentFreshnessReport } from "@/types/contentUpdates";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

export const ContentFreshnessPanel = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const { data: freshnessReport, isLoading, refetch } = useQuery({
    queryKey: ['content-freshness'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_freshness_report')
        .select('*')
        .order('days_since_update', { ascending: false });
      
      if (error) throw error;
      return data as ContentFreshnessReport[];
    }
  });

  const handleInitialize = async () => {
    setIsInitializing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('bulk-initialize-content-freshness');
      
      if (error) throw error;
      
      toast.success(`Initialized ${data.initialized} articles and created ${data.tracked} tracking entries.`);
      
      // Refresh the data
      await refetch();
    } catch (error) {
      console.error('Failed to initialize content freshness:', error);
      toast.error(error instanceof Error ? error.message : "Failed to initialize content freshness tracking.");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleBulkRefresh = async () => {
    const staleArticles = freshnessReport?.filter(
      (article) => article.freshness_status === 'never_updated' || article.freshness_status === 'stale'
    );

    if (!staleArticles || staleArticles.length === 0) {
      toast.info("No articles need updating");
      return;
    }

    toast.info(`Preparing to update ${staleArticles.length} articles. Please update each article manually.`);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </Card>
    );
  }

  const stats = {
    total: freshnessReport?.length || 0,
    fresh: freshnessReport?.filter((a) => a.freshness_status === 'fresh').length || 0,
    needsRefresh: freshnessReport?.filter((a) => a.freshness_status === 'needs_refresh').length || 0,
    stale: freshnessReport?.filter((a) => a.freshness_status === 'stale').length || 0,
    neverUpdated: freshnessReport?.filter((a) => a.freshness_status === 'never_updated').length || 0,
  };

  const getFreshnessBadge = (status: string) => {
    switch (status) {
      case 'fresh':
        return <Badge variant="default" className="bg-green-600">Fresh</Badge>;
      case 'needs_refresh':
        return <Badge variant="secondary">Needs Refresh</Badge>;
      case 'stale':
        return <Badge variant="destructive">Stale (90+ days)</Badge>;
      case 'never_updated':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Never Updated</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Content Freshness Monitor</h3>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleInitialize} variant="outline" size="sm" disabled={isInitializing}>
              <PlayCircle className="h-4 w-4 mr-2" />
              {isInitializing ? "Initializing..." : "Initialize Tracking"}
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Articles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.fresh}</div>
            <div className="text-sm text-muted-foreground">Fresh</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.needsRefresh}</div>
            <div className="text-sm text-muted-foreground">Needs Refresh</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.stale}</div>
            <div className="text-sm text-muted-foreground">Stale</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.neverUpdated}</div>
            <div className="text-sm text-muted-foreground">Never Updated</div>
          </div>
        </div>

        {(stats.stale > 0 || stats.neverUpdated > 0) && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Action Required: {stats.stale + stats.neverUpdated} Articles Need Updates
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                  Content freshness is critical for AI citation likelihood. Articles should be updated every 90 days.
                </p>
                <Button onClick={handleBulkRefresh} size="sm" className="bg-orange-600 hover:bg-orange-700">
                  View Update Plan
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Articles Requiring Attention
        </h4>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {freshnessReport
            ?.filter((article) => article.freshness_status !== 'fresh')
            .slice(0, 20)
            .map((article) => (
              <div key={article.id} className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/admin/articles/${article.id}/edit`}
                    className="font-medium hover:text-primary truncate block"
                  >
                    {article.headline}
                  </Link>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="uppercase">{article.language}</span>
                    <span>•</span>
                    <span>{Math.floor(article.days_since_update)} days since update</span>
                    {article.update_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{article.update_count} updates</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getFreshnessBadge(article.freshness_status)}
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};
