import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle, CheckCircle2, RefreshCw, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const CitationHealthWidget = () => {
  const navigate = useNavigate();

  const { data: latestReport, isLoading, refetch } = useQuery({
    queryKey: ['latest-hygiene-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citation_hygiene_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: activeAlerts } = useQuery({
    queryKey: ['active-compliance-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citation_compliance_alerts')
        .select('id')
        .is('resolved_at', null);

      if (error) throw error;
      return data?.length || 0;
    },
  });

  const handleManualScan = async () => {
    toast.info("Manual scan not yet implemented - use scheduled nightly scan");
  };

  const complianceScore = latestReport?.compliance_score || 0;
  const violationsFound = latestReport?.banned_citations_found || 0;
  const lastScanTime = latestReport?.scan_date 
    ? formatDistanceToNow(new Date(latestReport.scan_date), { addSuffix: true })
    : 'Never';

  const getScoreBadge = () => {
    if (complianceScore >= 95) {
      return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Excellent</Badge>;
    }
    if (complianceScore >= 85) {
      return <Badge className="gap-1 bg-blue-600"><TrendingUp className="h-3 w-3" /> Good</Badge>;
    }
    if (complianceScore >= 70) {
      return <Badge className="gap-1 bg-amber-500"><AlertCircle className="h-3 w-3" /> Needs Attention</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Critical</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Citation Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Citation Health
          </div>
          {getScoreBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold">{complianceScore}%</div>
            <div className="text-xs text-muted-foreground">Compliance Score</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-600">{activeAlerts || 0}</div>
            <div className="text-xs text-muted-foreground">Active Violations</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last Scan</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-medium">{lastScanTime}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Violations Found</span>
            <span className="font-medium">{violationsFound}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Next Scan</span>
            <span className="font-medium">Tonight 3:00 AM UTC</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleManualScan}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Run Scan
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate('/admin/citation-sanitization')}
            className="flex-1"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
