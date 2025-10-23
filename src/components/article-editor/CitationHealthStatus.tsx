import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, ExternalLink, Clock, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CitationHealthStatusProps {
  articleId: string;
  externalCitations: Array<{ url: string; source: string }>;
}

interface CitationHealth {
  url: string;
  status: 'healthy' | 'broken' | 'redirected' | 'slow' | 'unreachable';
  http_status_code: number | null;
  last_checked_at: string;
  redirect_url: string | null;
}

export const CitationHealthStatus = ({ articleId, externalCitations }: CitationHealthStatusProps) => {
  // Fetch health status for this article's citations
  const { data: healthData } = useQuery({
    queryKey: ["citation-health", articleId],
    queryFn: async () => {
      if (!externalCitations || externalCitations.length === 0) return [];

      const urls = externalCitations.map(c => c.url);
      
      const { data, error } = await supabase
        .from("external_citation_health")
        .select("*")
        .in("url", urls);

      if (error) throw error;
      return data as CitationHealth[];
    },
    enabled: externalCitations && externalCitations.length > 0,
  });

  if (!externalCitations || externalCitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Citation Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No external citations added yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = {
    total: externalCitations.length,
    checked: healthData?.length || 0,
    healthy: healthData?.filter(h => h.status === 'healthy').length || 0,
    broken: healthData?.filter(h => h.status === 'broken' || h.status === 'unreachable').length || 0,
    redirected: healthData?.filter(h => h.status === 'redirected').length || 0,
    slow: healthData?.filter(h => h.status === 'slow').length || 0,
  };

  const getStatusIcon = (status: CitationHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'broken':
      case 'unreachable':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'redirected':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case 'slow':
        return <Clock className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusBadge = (status: CitationHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-600">Healthy</Badge>;
      case 'broken':
        return <Badge variant="destructive">Broken</Badge>;
      case 'redirected':
        return <Badge className="bg-amber-600">Redirected</Badge>;
      case 'slow':
        return <Badge className="bg-orange-600">Slow</Badge>;
      case 'unreachable':
        return <Badge variant="destructive">Unreachable</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Citation Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-muted rounded-lg">
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{stats.healthy}</div>
            <div className="text-xs text-muted-foreground">Healthy</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{stats.broken}</div>
            <div className="text-xs text-muted-foreground">Broken</div>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded-lg">
            <div className="text-lg font-bold text-amber-600">{stats.redirected}</div>
            <div className="text-xs text-muted-foreground">Redirected</div>
          </div>
        </div>

        {/* Broken Citations Alert */}
        {stats.broken > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {stats.broken} citation{stats.broken !== 1 ? 's' : ''} {stats.broken !== 1 ? 'are' : 'is'} broken or unreachable. 
              Check the Citation Health dashboard for replacement suggestions.
            </AlertDescription>
          </Alert>
        )}

        {/* Citation List */}
        <div className="space-y-2">
          {externalCitations.map((citation, index) => {
            const health = healthData?.find(h => h.url === citation.url);
            
            return (
              <div 
                key={index} 
                className="flex items-start justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {health ? getStatusIcon(health.status) : <div className="h-4 w-4" />}
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline truncate flex items-center gap-1"
                    >
                      {citation.source || citation.url}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                  {health && (
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(health.status)}
                      {health.http_status_code && (
                        <span className="text-xs text-muted-foreground">
                          HTTP {health.http_status_code}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Checked {formatDistanceToNow(new Date(health.last_checked_at))} ago
                      </span>
                    </div>
                  )}
                  {!health && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Not yet checked
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {stats.checked < stats.total && (
          <p className="text-xs text-muted-foreground text-center">
            {stats.total - stats.checked} citation{stats.total - stats.checked !== 1 ? 's' : ''} pending health check
          </p>
        )}
      </CardContent>
    </Card>
  );
};
