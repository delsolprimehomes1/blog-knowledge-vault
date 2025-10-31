import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { getCharCountStatus } from "@/lib/articleUtils";

interface SEOMetaSectionProps {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onCanonicalUrlChange: (value: string) => void;
  onRegenerateMetaTitle?: () => void;
  isRegenerating?: boolean;
  errors?: Record<string, string>;
}

export const SEOMetaSection = ({
  metaTitle,
  metaDescription,
  canonicalUrl,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onCanonicalUrlChange,
  onRegenerateMetaTitle,
  isRegenerating = false,
  errors = {},
}: SEOMetaSectionProps) => {
  const metaTitleStatus = getCharCountStatus(metaTitle.length, 60);
  const metaDescStatus = getCharCountStatus(metaDescription.length, 160);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Meta Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="metaTitle">Meta Title *</Label>
            {onRegenerateMetaTitle && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRegenerateMetaTitle}
                disabled={isRegenerating}
                className="h-7 text-xs"
              >
                {isRegenerating ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
          <Input
            id="metaTitle"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder="Compelling title for search results"
            className={errors.metaTitle ? "border-red-500" : ""}
          />
          <p className={`text-xs mt-1 ${metaTitleStatus.color}`}>
            {metaTitleStatus.message}
          </p>
          {errors.metaTitle && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.metaTitle}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="metaDescription">Meta Description *</Label>
          <Textarea
            id="metaDescription"
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="Brief description for search results"
            rows={3}
            className={errors.metaDescription ? "border-red-500" : ""}
          />
          <p className={`text-xs mt-1 ${metaDescStatus.color}`}>
            {metaDescStatus.message}
          </p>
          {errors.metaDescription && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.metaDescription}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="canonicalUrl">Canonical URL (Optional)</Label>
          <Input
            id="canonicalUrl"
            value={canonicalUrl}
            onChange={(e) => onCanonicalUrlChange(e.target.value)}
            placeholder="Leave blank for auto-generated"
          />
        </div>
      </CardContent>
    </Card>
  );
};
