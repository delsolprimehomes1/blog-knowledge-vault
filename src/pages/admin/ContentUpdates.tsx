import { AdminLayout } from "@/components/AdminLayout";
import { ContentFreshnessPanel } from "@/components/admin/ContentFreshnessPanel";

const ContentUpdates = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Content Updates Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and maintain content freshness for optimal AI citation likelihood.
          </p>
        </div>

        <ContentFreshnessPanel />

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
          <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
            Content Refresh Best Practices
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• Update articles every 90 days minimum to maintain "fresh" status</li>
            <li>• Prioritize BOFU articles (buying guides, legal processes) for updates</li>
            <li>• Update statistics with current year data (property prices, tax rates, visa requirements)</li>
            <li>• Verify all external citations are still accessible and relevant</li>
            <li>• Add new FAQs based on recent user questions or policy changes</li>
            <li>• Update date_modified field to signal freshness to search engines and AI systems</li>
            <li>• Add update notes explaining what changed for internal tracking</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ContentUpdates;
