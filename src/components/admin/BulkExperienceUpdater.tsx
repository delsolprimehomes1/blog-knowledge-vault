import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const BulkExperienceUpdater = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleBulkUpdate = async () => {
    if (!confirm('This will update articles containing "15 years" to "35 years". Continue?')) {
      return;
    }

    try {
      setIsUpdating(true);
      setResults(null);
      toast.info("Starting bulk update...");

      const { data, error } = await supabase.functions.invoke('bulk-update-experience-years', {
        body: {}
      });

      if (error) throw error;

      setResults(data);
      
      if (data.summary.successfully_updated > 0) {
        toast.success(
          `✅ Successfully updated ${data.summary.successfully_updated} articles!`,
          { duration: 5000 }
        );
      }

      if (data.summary.errors > 0) {
        toast.error(
          `⚠️ ${data.summary.errors} articles failed to update`,
          { duration: 5000 }
        );
      }

    } catch (error: any) {
      console.error('Bulk update failed:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Update: Experience Years (15 → 35)</CardTitle>
        <CardDescription>
          Update all articles to change Hans Beeckman's experience from "15 years" to "35 years"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Articles containing "15 years" will be updated to "35 years".
            This will update the detailed_content field and log changes in content_updates table.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleBulkUpdate} 
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Articles...
            </>
          ) : (
            'Run Bulk Update (15 → 35 years)'
          )}
        </Button>

        {results && (
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{results.summary.successfully_updated}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Updated</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{results.summary.errors}</p>
                <p className="text-xs text-red-600 dark:text-red-500">Errors</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-2xl font-bold">{results.summary.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg p-3">
              <h4 className="font-semibold mb-2">Update Details:</h4>
              {results.details.map((item: any, idx: number) => (
                <div key={idx} className="text-xs py-2 border-b last:border-0">
                  <div className="flex items-start gap-2">
                    {item.status === 'updated' && <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />}
                    {item.status === 'error' && <XCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />}
                    {item.status === 'skipped' && <AlertCircle className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="font-medium">{item.headline}</p>
                      <p className="text-muted-foreground">{item.slug}</p>
                      {item.changes && (
                        <p className="text-green-600 dark:text-green-400 mt-1">{item.changes.join(', ')}</p>
                      )}
                      {item.error && (
                        <p className="text-red-600 dark:text-red-400 mt-1">Error: {item.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
