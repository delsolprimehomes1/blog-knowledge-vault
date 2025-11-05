import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, AlertTriangle, RefreshCw, Trash2, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CitationHygieneReport } from "@/components/admin/CitationHygieneReport";

const CitationSanitization = () => {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);

  // Fetch citation compliance alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["citation-sanitization-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("citation_compliance_alerts")
        .select("*")
        .eq("alert_type", "competitor_citation")
        .is("resolved_at", null)
        .order("detected_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Scan for banned citations
  const scanMutation = useMutation({
    mutationFn: async () => {
      setIsScanning(true);
      const { data, error } = await supabase.functions.invoke("scan-banned-citations");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setScanResults(data);
      queryClient.invalidateQueries({ queryKey: ["citation-sanitization-alerts"] });
      toast.success("Scan complete!", {
        description: `Found ${data.bannedCitationsFound} banned citations in ${data.affectedArticles} articles`,
      });
    },
    onError: (error: Error) => {
      toast.error("Scan failed", { description: error.message });
    },
    onSettled: () => {
      setIsScanning(false);
    },
  });

  // Batch replace banned citations
  const replaceMutation = useMutation({
    mutationFn: async () => {
      setIsReplacing(true);
      const articleIds = [...new Set(alerts?.map(a => a.article_id) || [])];
      
      const { data, error } = await supabase.functions.invoke("batch-replace-banned-citations", {
        body: { articleIds },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["citation-sanitization-alerts"] });
      toast.success("Replacement complete!", {
        description: `Auto-applied: ${data.autoApplied}, Manual review: ${data.manualReview}`,
      });
    },
    onError: (error: Error) => {
      toast.error("Replacement failed", { description: error.message });
    },
    onSettled: () => {
      setIsReplacing(false);
    },
  });

  // Dismiss alert
  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("citation_compliance_alerts")
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: "Manually dismissed",
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["citation-sanitization-alerts"] });
      toast.success("Alert dismissed");
    },
  });

  const bannedCount = alerts?.length || 0;
  const affectedArticles = new Set(alerts?.map(a => a.article_id)).size;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Citation Sanitization
            </h1>
            <p className="text-muted-foreground mt-1">
              Remove competitor domains from all citations
            </p>
          </div>
        </div>

        <Tabs defaultValue="violations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="violations">Active Violations</TabsTrigger>
            <TabsTrigger value="hygiene">Domain Hygiene</TabsTrigger>
          </TabsList>

          <TabsContent value="violations" className="space-y-6">

        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Banned Citations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{bannedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {affectedArticles} articles affected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Compliance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {scanResults?.totalArticles 
                  ? Math.round(((scanResults.totalArticles - affectedArticles) / scanResults.totalArticles) * 100)
                  : 100}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {scanResults?.totalArticles ? `${scanResults.totalArticles - affectedArticles} clean articles` : 'Run scan'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Last Scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {scanResults?.timestamp 
                  ? new Date(scanResults.timestamp).toLocaleString()
                  : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {scanResults?.totalCitationsScanned 
                  ? `${scanResults.totalCitationsScanned} citations checked`
                  : 'No data'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Scan Results Summary */}
        {scanResults && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">Scan Results:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Articles: {scanResults.totalArticles}</div>
                  <div>Citations Scanned: {scanResults.totalCitationsScanned}</div>
                  <div>Violations Found: {scanResults.bannedCitationsFound}</div>
                  <div>Unique Domains: {Object.keys(scanResults.violationsByDomain || {}).length}</div>
                </div>
                {scanResults.topOffenders?.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium text-xs mb-1">Top Offending Domains:</div>
                    <div className="flex flex-wrap gap-1">
                      {scanResults.topOffenders.map((offender: any) => (
                        <Badge key={offender.domain} variant="destructive" className="text-xs">
                          {offender.domain} ({offender.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Actions</CardTitle>
            <CardDescription>
              Scan for violations and automatically replace banned citations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={() => scanMutation.mutate()}
                disabled={isScanning}
                size="lg"
                variant="outline"
                className="flex-1"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Scan All Articles
                  </>
                )}
              </Button>

              <Button
                onClick={() => replaceMutation.mutate()}
                disabled={isReplacing || bannedCount === 0}
                size="lg"
                className="flex-1"
              >
                {isReplacing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Replacing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Auto-Replace All ({bannedCount})
                  </>
                )}
              </Button>
            </div>

            {isReplacing && (
              <div className="space-y-2">
                <Progress value={33} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Processing citations... This may take several minutes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Violations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Active Violations</CardTitle>
            <CardDescription>
              {bannedCount > 0 
                ? `${bannedCount} banned citations requiring attention`
                : 'No banned citations found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : bannedCount === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-3" />
                <h3 className="text-lg font-semibold mb-1">All Clean!</h3>
                <p className="text-sm text-muted-foreground">
                  No banned competitor citations found
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Citation URL</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts?.slice(0, 50).map((alert) => {
                    const domain = new URL(alert.citation_url).hostname.replace('www.', '');
                    return (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">
                          <a 
                            href={`/admin/articles/${alert.article_id}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-1"
                          >
                            {alert.article_title}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs">
                          <a 
                            href={alert.citation_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {alert.citation_url}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-xs">
                            {domain}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(alert.detected_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dismissMutation.mutate(alert.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="hygiene" className="space-y-6">
            <CitationHygieneReport />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default CitationSanitization;
