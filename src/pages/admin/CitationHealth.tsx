import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
  Clock,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface CitationHealth {
  id: string;
  url: string;
  source_name: string;
  last_checked_at: string;
  status: 'healthy' | 'broken' | 'redirected' | 'slow' | 'unreachable';
  http_status_code: number | null;
  response_time_ms: number;
  redirect_url: string | null;
  times_verified: number;
  times_failed: number;
}

interface DeadLinkReplacement {
  id: string;
  original_url: string;
  original_source: string;
  replacement_url: string;
  replacement_source: string;
  replacement_reason: string;
  confidence_score: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const CitationHealth = () => {
  const queryClient = useQueryClient();
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  // Fetch citation health data
  const { data: healthData, isLoading } = useQuery({
    queryKey: ["citation-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_citation_health")
        .select("*")
        .order("last_checked_at", { ascending: false });

      if (error) throw error;
      return data as CitationHealth[];
    },
  });

  // Fetch replacement suggestions
  const { data: replacements } = useQuery({
    queryKey: ["dead-link-replacements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dead_link_replacements")
        .select("*")
        .eq("status", "pending")
        .order("confidence_score", { ascending: false });

      if (error) throw error;
      return data as DeadLinkReplacement[];
    },
  });

  // Run health check mutation
  const runHealthCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-citation-health");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Citation health check complete!", {
        description: `Checked ${data.checked} citations. Found ${data.broken} broken links.`,
      });
      queryClient.invalidateQueries({ queryKey: ["citation-health"] });
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
    },
    onError: (error) => {
      toast.error("Health check failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  // Approve replacement mutation
  const approveReplacement = useMutation({
    mutationFn: async (replacementId: string) => {
      const { error } = await supabase
        .from("dead_link_replacements")
        .update({ status: "approved" })
        .eq("id", replacementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Replacement approved");
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
    },
  });

  // Reject replacement mutation
  const rejectReplacement = useMutation({
    mutationFn: async (replacementId: string) => {
      const { error } = await supabase
        .from("dead_link_replacements")
        .update({ status: "rejected" })
        .eq("id", replacementId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Replacement rejected");
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
    },
  });

  const handleRunHealthCheck = async () => {
    setIsRunningCheck(true);
    try {
      await runHealthCheck.mutateAsync();
    } finally {
      setIsRunningCheck(false);
    }
  };

  // Calculate statistics
  const stats = healthData?.reduce(
    (acc, item) => {
      acc.total++;
      switch (item.status) {
        case 'healthy': acc.healthy++; break;
        case 'broken': acc.broken++; break;
        case 'redirected': acc.redirected++; break;
        case 'slow': acc.slow++; break;
        case 'unreachable': acc.unreachable++; break;
      }
      return acc;
    },
    { total: 0, healthy: 0, broken: 0, redirected: 0, slow: 0, unreachable: 0 }
  ) || { total: 0, healthy: 0, broken: 0, redirected: 0, slow: 0, unreachable: 0 };

  const healthPercentage = stats.total > 0
    ? Math.round((stats.healthy / stats.total) * 100)
    : 0;

  const getStatusBadge = (status: CitationHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Healthy</Badge>;
      case 'broken':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Broken</Badge>;
      case 'redirected':
        return <Badge className="bg-amber-600"><ArrowRight className="mr-1 h-3 w-3" />Redirected</Badge>;
      case 'slow':
        return <Badge className="bg-orange-600"><Clock className="mr-1 h-3 w-3" />Slow</Badge>;
      case 'unreachable':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Unreachable</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Citation Health</h1>
            <p className="text-muted-foreground">
              Monitor and maintain the quality of external citations
            </p>
          </div>
          <Button
            onClick={handleRunHealthCheck}
            disabled={isRunningCheck}
            size="lg"
          >
            {isRunningCheck ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Run Health Check Now
              </>
            )}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Citations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Being tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                healthPercentage >= 90 ? 'text-green-600' : 
                healthPercentage >= 70 ? 'text-amber-600' : 
                'text-red-600'
              }`}>
                {healthPercentage}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.healthy} of {stats.total} healthy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Broken Links</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.broken + stats.unreachable}
              </div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Replacements</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {replacements?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
        </div>

        {/* Replacement Suggestions */}
        {replacements && replacements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Suggested Replacements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>AI-Powered Suggestions</AlertTitle>
                <AlertDescription>
                  These replacement citations were found automatically. Review and approve to apply them to affected articles.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {replacements.map((replacement) => (
                  <Card key={replacement.id} className="border-l-4 border-l-amber-600">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Original (Broken):</span>
                              <div className="flex items-center gap-2 mt-1">
                                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                <a
                                  href={replacement.original_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-red-600 hover:underline truncate"
                                >
                                  {replacement.original_url}
                                </a>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Source: {replacement.original_source}
                              </p>
                            </div>

                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Suggested Replacement:</span>
                              <div className="flex items-center gap-2 mt-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <a
                                  href={replacement.replacement_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline truncate"
                                >
                                  {replacement.replacement_url}
                                </a>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Source: {replacement.replacement_source}
                              </p>
                            </div>

                            <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="text-sm"><strong>Reason:</strong> {replacement.replacement_reason}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">
                                  Confidence: {replacement.confidence_score}%
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Suggested {formatDistanceToNow(new Date(replacement.created_at))} ago
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => approveReplacement.mutate(replacement.id)}
                              disabled={approveReplacement.isPending}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectReplacement.mutate(replacement.id)}
                              disabled={rejectReplacement.isPending}
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Citation Health Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Citations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HTTP Code</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Last Checked</TableHead>
                  <TableHead>Success Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthData?.map((citation) => (
                  <TableRow key={citation.id}>
                    <TableCell>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline flex items-center gap-1 max-w-xs truncate"
                      >
                        {citation.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">{citation.source_name}</TableCell>
                    <TableCell>{getStatusBadge(citation.status)}</TableCell>
                    <TableCell className="text-sm">
                      {citation.http_status_code || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {citation.response_time_ms}ms
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(citation.last_checked_at))} ago
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={
                        citation.times_verified / (citation.times_verified + citation.times_failed) >= 0.9
                          ? 'text-green-600'
                          : 'text-amber-600'
                      }>
                        {Math.round(
                          (citation.times_verified / (citation.times_verified + citation.times_failed)) * 100
                        )}%
                      </span>
                      <span className="text-muted-foreground ml-1">
                        ({citation.times_verified}/{citation.times_verified + citation.times_failed})
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CitationHealth;
