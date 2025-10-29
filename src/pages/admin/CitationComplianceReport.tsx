import { AdminLayout } from "@/components/AdminLayout";
import { CitationComplianceReport as Report } from "@/components/admin/CitationComplianceReport";

const CitationComplianceReport = () => {
  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <Report />
      </div>
    </AdminLayout>
  );
};

export default CitationComplianceReport;
