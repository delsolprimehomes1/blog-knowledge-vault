import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIImageGenerator } from "@/components/AIImageGenerator";
import { DiagramGenerator } from "@/components/DiagramGenerator";
import { AlertCircle } from "lucide-react";

interface MediaSectionProps {
  headline: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  featuredImageCaption: string;
  diagramMermaidCode: string;
  diagramDescription: string;
  detailedContent: string;
  onImageChange: (url: string, alt: string) => void;
  onImageUpload: (file: File) => Promise<void>;
  onFeaturedImageCaptionChange: (value: string) => void;
  onDiagramGenerated: (mermaidCode: string, description: string) => void;
  imageUploading: boolean;
  errors?: Record<string, string>;
}

export const MediaSection = ({
  headline,
  featuredImageUrl,
  featuredImageAlt,
  featuredImageCaption,
  diagramMermaidCode,
  diagramDescription,
  detailedContent,
  onImageChange,
  onImageUpload,
  onFeaturedImageCaptionChange,
  onDiagramGenerated,
  imageUploading,
  errors = {},
}: MediaSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured Image & Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AIImageGenerator
          headline={headline}
          imageUrl={featuredImageUrl}
          imageAlt={featuredImageAlt}
          onImageChange={onImageChange}
          onImageUpload={onImageUpload}
          imageUploading={imageUploading}
        />
        {errors.featuredImageUrl && (
          <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.featuredImageUrl}
          </p>
        )}
        {errors.featuredImageAlt && (
          <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.featuredImageAlt}
          </p>
        )}

        <div>
          <Label htmlFor="featuredImageCaption">Featured Image Caption (Optional)</Label>
          <Input
            id="featuredImageCaption"
            value={featuredImageCaption}
            onChange={(e) => onFeaturedImageCaptionChange(e.target.value)}
            placeholder="Optional caption for the image"
          />
        </div>

        <DiagramGenerator
          articleContent={detailedContent}
          headline={headline}
          currentMermaidCode={diagramMermaidCode}
          currentDescription={diagramDescription}
          onDiagramGenerated={onDiagramGenerated}
        />
      </CardContent>
    </Card>
  );
};
