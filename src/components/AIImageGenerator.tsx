import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Wand2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIImageGeneratorProps {
  headline: string;
  imageUrl: string;
  imageAlt: string;
  onImageChange: (url: string, alt: string) => void;
  onImageUpload: (file: File) => Promise<void>;
  imageUploading: boolean;
}

export const AIImageGenerator = ({
  headline,
  imageUrl,
  imageAlt,
  onImageChange,
  onImageUpload,
  imageUploading
}: AIImageGeneratorProps) => {
  const [mode, setMode] = useState<'ai' | 'upload'>('upload');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string }>>([]);
  const { toast } = useToast();

  const generateImagePrompt = () => {
    return `Professional real estate photography: ${headline}. 
Luxurious Costa del Sol property, Mediterranean architecture, 
bright natural lighting, high-end interior design, 
ultra-realistic, 8k resolution, architectural digest style`;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: prompt || undefined,
          headline 
        }
      });

      if (error) throw error;

      if (data?.images) {
        setGeneratedImages(data.images);
        toast({
          title: 'Images generated!',
          description: 'Select one of the 4 generated images.',
        });
      }
    } catch (error) {
      console.error('Error generating images:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate images. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectImage = (img: { url: string }) => {
    onImageChange(img.url, prompt || headline);
    toast({
      title: 'Image selected',
      description: 'Featured image has been set.',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Featured Image *</Label>
        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            variant={mode === 'ai' ? 'default' : 'outline'}
            onClick={() => setMode('ai')}
            className="flex-1"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
          <Button
            type="button"
            variant={mode === 'upload' ? 'default' : 'outline'}
            onClick={() => setMode('upload')}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload/URL
          </Button>
        </div>
      </div>

      {mode === 'ai' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="imagePrompt">Image Description (Optional)</Label>
            <Textarea
              id="imagePrompt"
              placeholder="Describe the image you want (leave blank to auto-generate from headline)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">💡 Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrompt(generateImagePrompt())}
              >
                Auto-generate from headline
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Aerial view of luxury villa in Marbella, Costa del Sol, Mediterranean style, sunset lighting, 8k resolution")}
              >
                Aerial property view
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrompt("Modern interior living room Costa del Sol luxury villa, bright natural light, contemporary furniture, architectural photography")}
              >
                Interior shot
              </Button>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating 4 options...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Images
              </>
            )}
          </Button>

          {generatedImages.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {generatedImages.map((img, i) => (
                <div
                  key={i}
                  className="relative group cursor-pointer border rounded-lg overflow-hidden hover:border-primary transition-colors"
                  onClick={() => selectImage(img)}
                >
                  <img
                    src={img.url}
                    alt={`Option ${i + 1}`}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button size="sm" variant="secondary">
                      Select This
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'upload' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={imageUrl}
              onChange={(e) => onImageChange(e.target.value, imageAlt)}
              placeholder="https://example.com/image.jpg"
            />
            <label htmlFor="imageUpload">
              <Button type="button" variant="outline" disabled={imageUploading} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </span>
              </Button>
            </label>
            <input
              id="imageUpload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageUpload(file);
              }}
            />
          </div>
        </div>
      )}

      {imageUrl && (
        <div className="space-y-2">
          <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
          <div>
            <Label htmlFor="featuredImageAlt">Image Alt Text *</Label>
            <Input
              id="featuredImageAlt"
              value={imageAlt}
              onChange={(e) => onImageChange(imageUrl, e.target.value)}
              placeholder="Describe the image for accessibility"
            />
          </div>
        </div>
      )}
    </div>
  );
};
