import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ExternalLink, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CitationReplacerProps {
  content: string;
  headline: string;
  language: string;
  category: string;
  onContentUpdate: (newContent: string) => void;
}

interface Citation {
  sourceName: string;
  url: string;
  relevance: string;
  language: string;
  index: number;
}

export const CitationReplacer = ({
  content,
  headline,
  language,
  category,
  onContentUpdate
}: CitationReplacerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [updatedContent, setUpdatedContent] = useState("");
  const [stats, setStats] = useState({ totalMarkers: 0, replacedCount: 0, failedCount: 0 });
  const { toast } = useToast();

  // Count [CITATION_NEEDED] markers in content
  const markerCount = (content.match(/\[CITATION_NEEDED\]/g) || []).length;

  const handleFindCitations = async () => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('replace-citation-markers', {
        body: {
          content,
          headline,
          language,
          category
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to find citations');
      }

      setCitations(data.citations || []);
      setUpdatedContent(data.updatedContent);
      setStats({
        totalMarkers: data.totalMarkers || 0,
        replacedCount: data.replacedCount || 0,
        failedCount: data.failedCount || 0
      });

      if (data.citations && data.citations.length > 0) {
        setShowPreview(true);
      } else {
        toast({
          title: "No Citations Found",
          description: "Could not find authoritative sources for the claims in this article.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error finding citations:', error);
      toast({
        title: "Citation Search Failed",
        description: error instanceof Error ? error.message : "Failed to search for citations",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCitations = () => {
    onContentUpdate(updatedContent);
    setShowPreview(false);
    toast({
      title: "Citations Applied",
      description: `Successfully replaced ${stats.replacedCount} citation${stats.replacedCount !== 1 ? 's' : ''} with authoritative sources.`,
    });
  };

  if (markerCount === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Citations Needed
              </CardTitle>
              <CardDescription className="mt-1">
                {markerCount} claim{markerCount !== 1 ? 's' : ''} need{markerCount === 1 ? 's' : ''} authoritative sources
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg font-semibold">
              {markerCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleFindCitations}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching for Sources...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Find Sources with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Found {citations.length} Citation{citations.length !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Review the sources found for your article claims
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {stats.totalMarkers > 0 && (
              <div className="flex gap-2 text-sm">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {stats.replacedCount} found
                </Badge>
                {stats.failedCount > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                    {stats.failedCount} failed
                  </Badge>
                )}
              </div>
            )}

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {citations.map((citation, index) => (
                  <Card key={index} className="border-green-200 bg-green-50/30">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">
                              {citation.sourceName}
                            </h4>
                            <a 
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline break-all flex items-center gap-1 mt-1"
                            >
                              {citation.url}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {citation.language.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {citation.relevance}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyCitations}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Apply {citations.length} Citation{citations.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
