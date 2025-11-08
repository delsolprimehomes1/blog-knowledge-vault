import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const BofuArticleBackfill = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  // Query to check current status
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['bofu-backfill-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, cluster_id, related_cluster_articles, language')
        .eq('status', 'published')
        .eq('funnel_stage', 'BOFU');

      if (error) throw error;

      const total = data.length;
      const withoutCTA = data.filter(a => {
        const articles = a.related_cluster_articles;
        return !articles || (Array.isArray(articles) && articles.length === 0);
      }).length;
      const orphaned = data.filter(a => !a.cluster_id).length;
      const clustered = data.filter(a => a.cluster_id).length;

      return {
        total,
        withoutCTA,
        orphaned,
        clustered,
        articles: data
      };
    }
  });

  const runBackfill = async () => {
    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-bofu-related-articles');

      if (error) throw error;

      setResult(data);
      toast({
        title: "Backfill Complete",
        description: `Updated ${data.total_updated} BOFU articles with related reading CTAs`,
      });

      // Refetch status
      refetch();
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Backfill Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>BOFU Article Mid-CTA Backfill</CardTitle>
        <CardDescription>
          Populate "Related Reading" sections for BOFU articles without mid-article CTAs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold">{statusData?.total}</div>
            <div className="text-sm text-muted-foreground">Total BOFU</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{statusData?.withoutCTA}</div>
            <div className="text-sm text-muted-foreground">Without CTA</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold text-red-600">{statusData?.orphaned}</div>
            <div className="text-sm text-muted-foreground">Orphaned</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-2xl font-bold text-green-600">{statusData?.clustered}</div>
            <div className="text-sm text-muted-foreground">Clustered</div>
          </div>
        </div>

        {/* Strategy Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Backfill Strategy:</strong>
            <ul className="list-disc ml-4 mt-2 space-y-1 text-sm">
              <li><strong>Orphaned BOFU:</strong> Links to MOFU articles with same language + category</li>
              <li><strong>Clustered BOFU:</strong> Links to MOFU siblings within the same cluster</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={runBackfill} 
            disabled={isProcessing || statusData?.withoutCTA === 0}
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Backfill ({statusData?.withoutCTA} articles)
              </>
            )}
          </Button>

          <Button 
            onClick={() => refetch()} 
            variant="outline"
            disabled={isProcessing}
          >
            Refresh Status
          </Button>
        </div>

        {/* Result Display */}
        {result && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold text-green-900">Backfill Successful!</p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Orphaned BOFU linked: {result.orphaned_linked}</li>
                  <li>• Clustered BOFU linked: {result.clustered_linked}</li>
                  <li>• Total updated: {result.total_updated}</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Articles Without CTA */}
        {statusData?.withoutCTA > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Articles Needing Backfill:</h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {statusData.articles
                .filter((a: any) => {
                  const articles = a.related_cluster_articles;
                  return !articles || (Array.isArray(articles) && articles.length === 0);
                })
                .map((article: any) => (
                  <div key={article.id} className="p-3 border rounded text-sm">
                    <div className="font-medium">{article.headline}</div>
                    <div className="text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{article.language.toUpperCase()}</span>
                      {article.cluster_id ? (
                        <span className="text-green-600">• Has Cluster</span>
                      ) : (
                        <span className="text-red-600">• Orphaned</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
