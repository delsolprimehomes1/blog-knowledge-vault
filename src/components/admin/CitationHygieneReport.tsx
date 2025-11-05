import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export const CitationHygieneReport = () => {
  const { data: latestReport, isLoading, refetch } = useQuery({
    queryKey: ['latest-hygiene-report'],
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

  const { data: historicalReports } = useQuery({
    queryKey: ['hygiene-reports-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citation_hygiene_reports')
        .select('*')
        .order('scan_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const downloadReport = () => {
    if (!latestReport) return;
    
    const dataStr = JSON.stringify(latestReport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `citation-hygiene-report-${format(new Date(latestReport.scan_date), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getComplianceBadge = (score: number) => {
    if (score >= 90) return <Badge variant="default" className="bg-green-600">🟢 {score}%</Badge>;
    if (score >= 70) return <Badge variant="secondary" className="bg-yellow-600">🟡 {score}%</Badge>;
    return <Badge variant="destructive">🔴 {score}%</Badge>;
  };

  const getNextScanTime = () => {
    if (!latestReport?.next_scan_scheduled) return 'Not scheduled';
    const nextScan = new Date(latestReport.next_scan_scheduled);
    const now = new Date();
    const diffMs = nextScan.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) return 'Overdue';
    return `in ${diffHours}h ${diffMinutes}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Domain Hygiene Report</CardTitle>
          <CardDescription>Loading latest scan results...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!latestReport) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hygiene reports found. Run a scan to generate the first report.
        </AlertDescription>
      </Alert>
    );
  }

  const topOffenders = latestReport.top_offenders as Array<{ domain: string; count: number }> || [];

  return (
    <div className="space-y-6">
      {/* Latest Report Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">🧹 Domain Hygiene Report</CardTitle>
              <CardDescription>
                {format(new Date(latestReport.scan_date), 'MMMM d, yyyy h:mm a')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={downloadReport} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Articles Scanned</div>
              <div className="text-2xl font-bold">🔍 {latestReport.total_articles_scanned}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Citations Scanned</div>
              <div className="text-2xl font-bold">📋 {latestReport.total_citations_scanned}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Banned Domains</div>
              <div className="text-2xl font-bold text-destructive">🚫 {latestReport.banned_citations_found}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Articles Affected</div>
              <div className="text-2xl font-bold">⚠️ {latestReport.articles_with_violations}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Replacements Applied</div>
              <div className="text-2xl font-bold text-green-600">✅ {latestReport.clean_replacements_applied}</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Articles Cleaned</div>
              <div className="text-2xl font-bold">🏁 {latestReport.articles_cleaned}</div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Compliance Score</div>
              {getComplianceBadge(latestReport.compliance_score)}
            </div>
          </div>

          {topOffenders.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">🔝 Top Offenders</h4>
              <div className="space-y-1">
                {topOffenders.slice(0, 5).map((offender, idx) => (
                  <div key={offender.domain} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                    <span>
                      {idx + 1}. {offender.domain}
                    </span>
                    <Badge variant="outline">{offender.count} citations</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">📅 Next Scan</div>
            <div className="font-semibold">{getNextScanTime()}</div>
          </div>

          <div className="text-xs text-muted-foreground">
            ⏱️ Scan Duration: {latestReport.scan_duration_ms}ms
          </div>
        </CardContent>
      </Card>

      {/* Historical Reports */}
      {historicalReports && historicalReports.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Report History</CardTitle>
            <CardDescription>Previous scan results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historicalReports.map((report) => {
                const prevReport = historicalReports[historicalReports.indexOf(report) + 1];
                const trend = prevReport 
                  ? report.banned_citations_found - prevReport.banned_citations_found
                  : 0;

                return (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">
                        {format(new Date(report.scan_date), 'MMM d, yyyy h:mm a')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {report.total_articles_scanned} articles • {report.banned_citations_found} violations
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {trend !== 0 && (
                        <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {Math.abs(trend)}
                        </div>
                      )}
                      {getComplianceBadge(report.compliance_score)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
