import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Sitemap = () => {
  const [sitemapXml, setSitemapXml] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["sitemap-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("slug, date_modified, date_published, language, canonical_url")
        .eq("status", "published")
        .order("date_modified", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (articles) {
      const baseUrl = "https://delsolprimehomes.com";
      
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- About Page -->
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Blog Index -->
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Blog Articles (${articles.length} total) -->
${articles.map(article => {
  const lastmod = article.date_modified || article.date_published || new Date().toISOString();
  return `  <url>
    <loc>${baseUrl}/blog/${article.slug}</loc>
    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
}).join('\n')}
  
</urlset>`;

      setSitemapXml(sitemap);
    }
  }, [articles]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sitemapXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sitemapXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const missingCanonicals = articles?.filter(a => !a.canonical_url).length || 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Dynamic Sitemap Generator
          </CardTitle>
          <CardDescription>
            Auto-generated sitemap.xml with all {articles?.length || 0} published articles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Alerts */}
          {isLoading ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Loading articles from database...</AlertDescription>
            </Alert>
          ) : articles && articles.length > 0 ? (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  ✅ Sitemap includes {articles.length} published articles
                  {missingCanonicals > 0 && (
                    <span className="text-yellow-600 ml-2">
                      ⚠️ {missingCanonicals} articles missing canonical URLs
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleCopy} variant="outline">
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download sitemap.xml
                </Button>
              </div>

              {/* Preview */}
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {sitemapXml}
                </pre>
              </div>

              {/* Instructions */}
              <Alert>
                <AlertDescription>
                  <strong>Next Steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Download the sitemap.xml file</li>
                    <li>Replace the existing public/sitemap.xml with this version</li>
                    <li>Deploy to production</li>
                    <li>Submit to Google Search Console at <code className="text-xs bg-background px-1 rounded">https://search.google.com/search-console</code></li>
                  </ol>
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No published articles found in database</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Sitemap;
