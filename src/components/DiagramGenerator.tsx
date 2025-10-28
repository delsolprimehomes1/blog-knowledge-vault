import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, RotateCw } from "lucide-react";

interface DiagramGeneratorProps {
  articleContent: string;
  headline: string;
  currentDiagramUrl?: string;
  currentDiagramAlt?: string;
  currentDiagramCaption?: string;
  currentDescription?: string;
  onDiagramGenerated: (diagramUrl: string, altText: string, caption: string, description: string) => void;
}

type DiagramType = 'flowchart' | 'timeline' | 'comparison';

// Helper to check for meaningful content
const hasContent = (content: string): boolean => {
  if (!content) return false;
  const textOnly = content.replace(/<[^>]*>/g, '').trim();
  return textOnly.length > 50;
};

export const DiagramGenerator = ({ 
  articleContent, 
  headline,
  currentDiagramUrl = "",
  currentDiagramAlt = "",
  currentDiagramCaption = "",
  currentDescription = "",
  onDiagramGenerated 
}: DiagramGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [diagramImageUrl, setDiagramImageUrl] = useState(currentDiagramUrl);
  const [altText, setAltText] = useState(currentDiagramAlt);
  const [caption, setCaption] = useState(currentDiagramCaption);
  const [description, setDescription] = useState(currentDescription);
  const [showPreview, setShowPreview] = useState(!!currentDiagramUrl);

  const generateDiagram = async () => {
    console.log('Diagram generator - Content check:', {
      hasHeadline: !!headline,
      contentLength: articleContent?.length || 0,
      hasValidContent: hasContent(articleContent)
    });

    if (!headline) {
      toast.error("Please add a headline before generating a diagram");
      return;
    }
    
    if (!hasContent(articleContent)) {
      toast.error("Please add at least 50 characters of content before generating a diagram");
      return;
    }

    setIsGenerating(true);

    try {
      console.log('Generating diagram:', { type: diagramType, headline });
      
      const { data, error } = await supabase.functions.invoke('generate-diagram-image', {
        body: {
          articleContent: articleContent,
          headline: headline,
          diagramType: diagramType
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setDiagramImageUrl(data.imageUrl);
        setAltText(data.altText || '');
        setCaption(data.caption || '');
        setDescription(data.description || '');
        setShowPreview(true);
        toast.success("Beautiful diagram with AI-generated metadata created!");
      } else {
        throw new Error('No diagram image received');
      }
    } catch (error) {
      console.error('Error generating diagram:', error);
      toast.error("Failed to generate diagram. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDiagram = () => {
    if (diagramImageUrl && altText && caption && description) {
      onDiagramGenerated(diagramImageUrl, altText, caption, description);
      toast.success("Diagram with full metadata added to article!");
    } else {
      toast.error("Please fill in all metadata fields");
    }
  };

  const handleClearDiagram = () => {
    setDiagramImageUrl("");
    setAltText("");
    setCaption("");
    setDescription("");
    setShowPreview(false);
    onDiagramGenerated("", "", "", "");
    toast.info("Diagram cleared");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Generate Visual Diagram (Optional)</Label>
        <p className="text-sm text-muted-foreground mt-1">
          AI will create a beautiful custom infographic diagram based on your article content
        </p>
      </div>

      <div className="flex gap-2">
        <Select value={diagramType} onValueChange={(value) => setDiagramType(value as DiagramType)}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flowchart">Flowchart (Process steps)</SelectItem>
            <SelectItem value="timeline">Timeline (Sequential events)</SelectItem>
            <SelectItem value="comparison">Comparison (Side-by-side)</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          onClick={generateDiagram} 
          disabled={isGenerating || !headline || !hasContent(articleContent)}
          variant="secondary"
          title={
            !headline ? "Add headline first" :
            !hasContent(articleContent) ? "Add at least 50 characters of content first" :
            "Generate diagram from article content"
          }
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </>
          )}
        </Button>

        {showPreview && (
          <Button 
            onClick={generateDiagram} 
            disabled={isGenerating}
            variant="outline"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        )}
      </div>

      {showPreview && diagramImageUrl && (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
          <div>
            <Label>Preview</Label>
            <div className="mt-2 rounded-lg overflow-hidden border bg-white">
              <img 
                src={diagramImageUrl} 
                alt={description || 'Generated diagram'} 
                className="w-full h-auto"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="diagramAlt">Alt Text (SEO & Accessibility)</Label>
            <Input
              id="diagramAlt"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Brief description for screen readers (50-125 chars)"
              maxLength={125}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {altText.length}/125 characters - Used for SEO and screen readers
            </p>
          </div>

          <div>
            <Label htmlFor="diagramCaption">Caption (User-Facing)</Label>
            <Input
              id="diagramCaption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Short label shown under diagram (20-80 chars)"
              maxLength={80}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {caption.length}/80 characters - Displayed to users
            </p>
          </div>

          <div>
            <Label htmlFor="diagramDescription">Extended Description (AI/LLM Optimization)</Label>
            <Textarea
              id="diagramDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed explanation for voice assistants and AI readers (150-250 words)"
              rows={4}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for JSON-LD schema and voice assistant optimization
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveDiagram} variant="default">
              Save Diagram
            </Button>
            <Button onClick={handleClearDiagram} variant="outline">
              Clear Diagram
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
