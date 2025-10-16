import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SEOPreviewSectionProps {
  metaTitle: string;
  metaDescription: string;
  featuredImageUrl: string;
  translations: Record<string, string>;
}

export const SEOPreviewSection = ({
  metaTitle,
  metaDescription,
  featuredImageUrl,
  translations,
}: SEOPreviewSectionProps) => {
  const titleLength = metaTitle.length;
  const descLength = metaDescription.length;
  
  const titleStatus = titleLength > 60 ? "error" : titleLength > 55 ? "warning" : "success";
  const descStatus = descLength > 160 ? "error" : descLength > 155 ? "warning" : "success";
  
  const hasImage = !!featuredImageUrl;
  const hasTranslations = Object.keys(translations).length > 0;
  
  const warnings = [];
  if (titleLength > 60) warnings.push("Title exceeds 60 characters and will be truncated in search results");
  if (descLength > 160) warnings.push("Description exceeds 160 characters and will be truncated in search results");
  if (!hasImage) warnings.push("Missing featured image - important for social sharing");
  if (!hasTranslations) warnings.push("No translations added - consider adding for multilingual SEO");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          SEO Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Google Search Preview */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Google Search Preview</h3>
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                delsol-primehomes.com › article › example-slug
              </div>
              <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                {metaTitle || "Your Meta Title Here"} | Del Sol Prime Homes
              </div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {metaDescription || "Your meta description will appear here. Make it compelling to encourage clicks from search results."}
              </div>
            </div>
          </div>
        </div>

        {/* Character Counts */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Title Length</span>
              <span className={`text-sm font-semibold ${
                titleStatus === "error" ? "text-red-600" : 
                titleStatus === "warning" ? "text-yellow-600" : 
                "text-green-600"
              }`}>
                {titleLength} / 60
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  titleStatus === "error" ? "bg-red-600" : 
                  titleStatus === "warning" ? "bg-yellow-600" : 
                  "bg-green-600"
                }`}
                style={{ width: `${Math.min((titleLength / 60) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Description Length</span>
              <span className={`text-sm font-semibold ${
                descStatus === "error" ? "text-red-600" : 
                descStatus === "warning" ? "text-yellow-600" : 
                "text-green-600"
              }`}>
                {descLength} / 160
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  descStatus === "error" ? "bg-red-600" : 
                  descStatus === "warning" ? "bg-yellow-600" : 
                  "bg-green-600"
                }`}
                style={{ width: `${Math.min((descLength / 160) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Validation Checklist */}
        <div>
          <h3 className="text-sm font-semibold mb-2">SEO Checklist</h3>
          <div className="space-y-2">
            <div className={`flex items-center gap-2 text-sm ${titleLength > 0 && titleLength <= 60 ? "text-green-600" : "text-muted-foreground"}`}>
              {titleLength > 0 && titleLength <= 60 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>Title is optimal length (50-60 characters)</span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${descLength > 0 && descLength <= 160 ? "text-green-600" : "text-muted-foreground"}`}>
              {descLength > 0 && descLength <= 160 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>Description is optimal length (150-160 characters)</span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${hasImage ? "text-green-600" : "text-muted-foreground"}`}>
              {hasImage ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>Featured image added (required for social sharing)</span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${hasTranslations ? "text-green-600" : "text-muted-foreground"}`}>
              {hasTranslations ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>Translations added ({hasTranslations ? Object.keys(translations).length : 0} languages)</span>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {warnings.map((warning, idx) => (
                  <div key={idx}>• {warning}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
