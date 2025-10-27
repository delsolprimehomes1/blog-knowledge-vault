import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  currentDescription?: string;
  onDiagramGenerated: (diagramUrl: string, description: string) => void;
}

type DiagramType = 'flowchart' | 'timeline' | 'comparison';

export const DiagramGenerator = ({ 
  articleContent, 
  headline,
  currentDiagramUrl = "",
  currentDescription = "",
  onDiagramGenerated 
}: DiagramGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [diagramImageUrl, setDiagramImageUrl] = useState(currentDiagramUrl);
  const [description, setDescription] = useState(currentDescription);
  const [showPreview, setShowPreview] = useState(!!currentDiagramUrl);

  const generateDiagram = async () => {
    if (!articleContent || !headline) {
      toast.error("Please add headline and content before generating a diagram");
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
        setDescription(data.description || '');
        setShowPreview(true);
        toast.success("Beautiful diagram generated successfully!");
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
    if (diagramImageUrl && description) {
      onDiagramGenerated(diagramImageUrl, description);
      toast.success("Diagram added to article!");
    }
  };

  const handleClearDiagram = () => {
    setDiagramImageUrl("");
    setDescription("");
    setShowPreview(false);
    onDiagramGenerated("", "");
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
          disabled={isGenerating || !articleContent}
          variant="secondary"
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
            <Label htmlFor="diagramDescription">Description (for accessibility)</Label>
            <Textarea
              id="diagramDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the diagram shows"
              rows={3}
              className="mt-1"
            />
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
