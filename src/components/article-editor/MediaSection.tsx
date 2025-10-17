import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIImageGenerator } from "@/components/AIImageGenerator";
import { DiagramGenerator } from "@/components/DiagramGenerator";
import { AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const [isGenerating, setIsGenerating] = useState(false);

  const handleQuickGenerate = async () => {
    if (!headline) {
      toast({
        title: "Headline Required",
        description: "Add a headline first to generate a contextual image",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { headline }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const tempImageUrl = data.images[0].url;
      
      // Download and persist to storage
      const imageResponse = await fetch(tempImageUrl);
      if (!imageResponse.ok) throw new Error('Failed to download image');
      
      const imageBlob = await imageResponse.blob();
      const fileName = `article-${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(fileName, imageBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('article-images')
        .getPublicUrl(fileName);

      onImageChange(publicUrlData.publicUrl, `${headline} - Costa del Sol real estate`);
      
      toast({
        title: "Image Generated",
        description: "AI-generated image added successfully",
      });
    } catch (error) {
      console.error('Image generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured Image & Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!featuredImageUrl && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">No featured image set. Articles must have images to be published.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleQuickGenerate}
                disabled={!headline || isGenerating || imageUploading}
                className="ml-2"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate with AI"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
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
