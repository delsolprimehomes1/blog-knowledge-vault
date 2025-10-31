import { AdminLayout } from "@/components/AdminLayout";
import { CitationComplianceReport as Report } from "@/components/admin/CitationComplianceReport";
import { ReplacementHistoryPanel } from "@/components/admin/ReplacementHistoryPanel";
import { NonApprovedCitationsPanel } from "@/components/admin/NonApprovedCitationsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CitationComplianceReport = () => {
  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <Tabs defaultValue="report" className="space-y-6">
          <TabsList>
            <TabsTrigger value="report">Compliance Report</TabsTrigger>
            <TabsTrigger value="non-approved">Non-Approved Citations</TabsTrigger>
            <TabsTrigger value="history">Replacement History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="report" className="space-y-6">
            <Report />
          </TabsContent>

          <TabsContent value="non-approved" className="space-y-6">
            <NonApprovedCitationsPanel />
          </TabsContent>
          
          <TabsContent value="history" className="space-y-6">
            <ReplacementHistoryPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default CitationComplianceReport;
