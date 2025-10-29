import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ComplianceAlert {
  id: string;
  alert_type: 'non_approved' | 'competitor' | 'broken_link' | 'missing_gov_source';
  severity: 'critical' | 'warning' | 'info';
  citation_url: string;
  article_id: string;
  article_title: string;
  detected_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  auto_suggested_replacement: string | null;
}

export const CitationComplianceAlerts = () => {
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["citation-compliance-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("citation_compliance_alerts")
        .select("*")
        .is("resolved_at", null)
        .order("severity", { ascending: true })
        .order("detected_at", { ascending: false });
      
      if (error) throw error;
      return data as ComplianceAlert[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const resolveAlert = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("citation_compliance_alerts")
        .update({ 
          resolved_at: new Date().toISOString(),
          resolution_notes: notes 
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert resolved");
      queryClient.invalidateQueries({ queryKey: ["citation-compliance-alerts"] });
      setResolvingId(null);
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Critical</Badge>;
      case 'warning':
        return <Badge variant="default" className="gap-1 bg-orange-600 hover:bg-orange-700"><AlertTriangle className="h-3 w-3" />Warning</Badge>;
      case 'info':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />Info</Badge>;
      default:
        return null;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'competitor':
        return '🚫 Competitor Link';
      case 'non_approved':
        return '⚠️ Non-Approved Domain';
      case 'broken_link':
        return '🔗 Broken Link';
      case 'missing_gov_source':
        return '🏛️ Missing Gov Source';
      default:
        return type;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'competitor':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'non_approved':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'broken_link':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'missing_gov_source':
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Compliance Alerts...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const criticalCount = alerts?.filter(a => a.severity === 'critical').length || 0;
  const warningCount = alerts?.filter(a => a.severity === 'warning').length || 0;
  const infoCount = alerts?.filter(a => a.severity === 'info').length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {criticalCount > 0 ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : warningCount > 0 ? (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            Citation Compliance Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} Critical</Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-orange-600 hover:bg-orange-700">{warningCount} Warnings</Badge>
            )}
            {infoCount > 0 && (
              <Badge variant="secondary">{infoCount} Info</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!alerts || alerts.length === 0 ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              ✅ All citations are compliant! No active alerts.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {criticalCount > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>URGENT:</strong> {criticalCount} critical issue{criticalCount !== 1 ? 's' : ''} requiring immediate action
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getAlertIcon(alert.alert_type)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-sm">{getAlertTypeLabel(alert.alert_type)}</strong>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Article: <strong>{alert.article_title}</strong>
                        </p>
                        {alert.citation_url && (
                          <a 
                            href={alert.citation_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 break-all"
                          >
                            {alert.citation_url}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/admin/article-editor?id=${alert.article_id}`, '_blank')}
                    >
                      Fix in Editor
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setResolvingId(alert.id);
                        resolveAlert.mutate({ 
                          id: alert.id, 
                          notes: 'Manually dismissed by admin' 
                        });
                      }}
                      disabled={resolvingId === alert.id}
                    >
                      {resolvingId === alert.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Dismiss'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
