import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle2, XCircle, Clock, TrendingUp, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface BatchReplacementMonitorProps {
  jobId?: string;
}

export function BatchReplacementMonitor({ jobId }: BatchReplacementMonitorProps) {
  const { toast } = useToast();

  // Fetch job status
  const { data: job, isLoading } = useQuery({
    queryKey: ['citation-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from('citation_replacement_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      return query.state.data?.status === 'running' ? 5000 : false;
    },
    enabled: !!jobId
  });

  // Fetch recent replacements
  const { data: recentReplacements } = useQuery({
    queryKey: ['recent-replacements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dead_link_replacements')
        .select('*')
        .eq('status', 'applied')
        .order('applied_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      return job?.status === 'running' ? 5000 : false;
    },
    enabled: !!jobId
  });

  if (!jobId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            No Active Job
          </CardTitle>
          <CardDescription>
            Start a batch replacement job to monitor progress here
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Not Found</CardTitle>
          <CardDescription>The specified job could not be found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const progressPercentage = job.progress_total > 0 
    ? Math.round((job.progress_current / job.progress_total) * 100) 
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500"><Activity className="h-3 w-3 mr-1 animate-pulse" />Running</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateRate = () => {
    if (!job.started_at || job.progress_current === 0) return 0;
    const startTime = new Date(job.started_at).getTime();
    const now = Date.now();
    const minutesElapsed = (now - startTime) / (1000 * 60);
    return minutesElapsed > 0 ? (job.progress_current / minutesElapsed).toFixed(1) : 0;
  };

  const calculateETA = () => {
    const rate = parseFloat(calculateRate().toString());
    if (rate === 0 || job.status !== 'running') return null;
    const remaining = job.progress_total - job.progress_current;
    const minutesRemaining = remaining / rate;
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = Math.round(minutesRemaining % 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const isOfficialSource = (url: string) => {
    const officialDomains = ['gov.es', 'gov.uk', 'boe.es', 'aena.es', 'ine.es', 'bde.es', 'spain.info'];
    return officialDomains.some(domain => url.includes(domain));
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Batch Replacement Progress
              </CardTitle>
              <CardDescription>
                Job started {job.started_at && formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}
              </CardDescription>
            </div>
            {getStatusBadge(job.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{job.progress_current} / {job.progress_total} ({progressPercentage}%)</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Auto-Applied</p>
              <p className="text-2xl font-bold text-green-600">{job.auto_applied_count}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Manual Review</p>
              <p className="text-2xl font-bold text-yellow-600">{job.manual_review_count}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-red-600">{job.failed_count}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Articles Processed</p>
              <p className="text-2xl font-bold">{job.articles_processed}</p>
            </div>
          </div>

          {/* Rate & ETA */}
          {job.status === 'running' && (
            <div className="flex items-center gap-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  <span className="font-medium">{calculateRate()}</span> citations/min
                </span>
              </div>
              {calculateETA() && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">
                    ETA: <span className="font-medium">{calculateETA()}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Completion Summary */}
          {job.status === 'completed' && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
              <h4 className="font-medium text-green-900 dark:text-green-100">Job Completed Successfully!</h4>
              <p className="text-sm text-green-800 dark:text-green-200">
                Completed {job.completed_at && formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}
              </p>
              <Button 
                onClick={() => toast({
                  title: "Next Step",
                  description: "Go to AI Tools and run the 'Backfill Inline Citations' to apply these replacements to your articles."
                })}
                className="mt-2"
              >
                View Next Steps
              </Button>
            </div>
          )}

          {/* Error Message */}
          {job.error_message && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{job.error_message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      {recentReplacements && recentReplacements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Replacements</CardTitle>
            <CardDescription>Last 10 citations that were replaced</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReplacements.map((replacement) => (
                <div key={replacement.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{replacement.original_source || 'Unknown Source'}</p>
                      {isOfficialSource(replacement.replacement_url) && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          Official
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{replacement.original_url}</span>
                      <span>→</span>
                      <a 
                        href={replacement.replacement_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary truncate"
                      >
                        <span className="truncate">{replacement.replacement_url}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                    {replacement.confidence_score && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Confidence:</span>
                        <Badge variant="secondary">{(replacement.confidence_score * 10).toFixed(1)}/10</Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
