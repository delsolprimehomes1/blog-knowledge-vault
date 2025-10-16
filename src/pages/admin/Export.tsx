import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Database, FileText, Users } from "lucide-react";
import { toast } from "sonner";

const Export = () => {
  const [exporting, setExporting] = useState(false);

  const { data: articles } = useQuery({
    queryKey: ["export-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: authors } = useQuery({
    queryKey: ["export-authors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["export-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const exportData = (data: any, filename: string) => {
    setExporting(true);
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${filename} exported successfully`);
    } catch (error) {
      toast.error("Export failed");
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const exportAll = () => {
    setExporting(true);
    try {
      const allData = {
        articles,
        authors,
        categories,
        exported_at: new Date().toISOString(),
        version: "1.0",
      };
      exportData(allData, "complete_backup");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Export Data</h1>
          <p className="text-muted-foreground">
            Download your content as JSON for backup or migration purposes
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Complete Backup
              </CardTitle>
              <CardDescription>
                Export all articles, authors, and categories in one file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={exportAll} 
                disabled={exporting || !articles}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Complete Backup
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Articles Only
              </CardTitle>
              <CardDescription>
                Export only blog articles ({articles?.length || 0} articles)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => exportData(articles, "articles")}
                disabled={exporting || !articles}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Articles
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Authors Only
              </CardTitle>
              <CardDescription>
                Export only authors ({authors?.length || 0} authors)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => exportData(authors, "authors")}
                disabled={exporting || !authors}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Authors
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Categories Only
              </CardTitle>
              <CardDescription>
                Export only categories ({categories?.length || 0} categories)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => exportData(categories, "categories")}
                disabled={exporting || !categories}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Categories
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Export Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Exported files are in JSON format for easy import/migration</p>
            <p>• Files include all fields and metadata</p>
            <p>• Complete backup includes timestamp and version information</p>
            <p>• Recommended: Export complete backup weekly</p>
            <p>• Store exports in a secure location</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Export;
