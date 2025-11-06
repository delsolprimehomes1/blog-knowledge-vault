import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, Shield, AlertTriangle, Play, FileText, 
  CheckCircle, XCircle, Clock 
} from "lucide-react";
import { CitationComplianceReport } from "@/components/admin/CitationComplianceReport";

const CitationSweepDashboard = () => {
  const [isScanRunning, setScanRunning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);

  const runComprehensiveScan = async () => {
    setScanRunning(true);
    try {
      toast.info("Starting comprehensive citation scan...");
      
      // Step 1: Run scan-banned-citations
      const { data: scanData, error: scanError } = await supabase.functions.invoke(
        "scan-banned-citations"
      );
      
      if (scanError) throw scanError;
      
      setScanResults(scanData);
      toast.success(`Scan complete! Found ${scanData.totalViolations} violations across ${scanData.articlesWithViolations} articles`);
      
      // Automatically show the report
      setShowReport(true);
      
    } catch (error: any) {
      console.error("Scan error:", error);
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setScanRunning(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Citation Compliance Sweep</h1>
          <p className="text-muted-foreground">
            Comprehensive scan and cleanup of competitor citations across all blog articles
          </p>
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Scan Control Panel
            </CardTitle>
            <CardDescription>
              Run comprehensive scans to identify and track competitor citations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Updated Blacklist:</strong> Added 6 new competitor domains including thegoldenpartners.com, spainlifeexclusive.com, oasismarbella.com, movetomalagaspain.com, globalpropertyguide.com, and lexidy.com.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-3">
              <Button
                onClick={runComprehensiveScan}
                disabled={isScanRunning}
                size="lg"
              >
                {isScanRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning All Articles...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Comprehensive Scan
                  </>
                )}
              </Button>
              
              {scanResults && (
                <Button
                  variant="outline"
                  onClick={() => setShowReport(!showReport)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showReport ? 'Hide' : 'Show'} Detailed Report
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scan Results Summary */}
        {scanResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Scan Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Articles Scanned</p>
                  <p className="text-2xl font-bold">{scanResults.totalArticles}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Citations Checked</p>
                  <p className="text-2xl font-bold">{scanResults.totalCitations}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Violations Found</p>
                  <p className="text-2xl font-bold text-destructive">{scanResults.totalViolations}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Articles Affected</p>
                  <p className="text-2xl font-bold text-orange-600">{scanResults.articlesWithViolations}</p>
                </div>
              </div>

              {scanResults.topOffenders && scanResults.topOffenders.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-medium">Top Offending Domains:</h4>
                  <div className="flex flex-wrap gap-2">
                    {scanResults.topOffenders.slice(0, 10).map((offender: any, idx: number) => (
                      <Badge key={idx} variant="destructive">
                        {offender.domain} ({offender.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Detailed Compliance Report */}
        {showReport && (
          <div className="space-y-6">
            <CitationComplianceReport />
          </div>
        )}

        {/* Next Steps Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 list-decimal list-inside text-sm">
              <li>
                <strong>Review scan results</strong> - Check the detailed report for all violations
              </li>
              <li>
                <strong>Navigate to Citation Compliance page</strong> - Use the batch replacement tools to fix violations
              </li>
              <li>
                <strong>Apply replacements</strong> - Run batch-replace-banned-citations for automated cleanup
              </li>
              <li>
                <strong>Verify changes</strong> - Re-run scan to confirm zero violations
              </li>
              <li>
                <strong>Enable monitoring</strong> - Set up scheduled citation hygiene to prevent future violations
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CitationSweepDashboard;
