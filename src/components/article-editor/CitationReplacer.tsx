import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ExternalLink, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
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
  const [preferredSources, setPreferredSources] = useState<string[]>([]);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const { toast } = useToast();

  // Count [CITATION_NEEDED] markers in content
  const markerCount = (content.match(/\[CITATION_NEEDED\]/g) || []).length;

  const sourceTypeOptions = [
    { value: '.gov', label: 'Government (.gov)', description: 'US government sources' },
    { value: '.gob.es', label: 'Spanish Government (.gob.es)', description: 'Official Spanish government' },
    { value: '.edu', label: 'Educational (.edu)', description: 'Universities and research' },
    { value: '.org', label: 'Organizations (.org)', description: 'Non-profit organizations' },
    { value: '.int', label: 'International (.int)', description: 'International organizations' },
    { value: 'europa.eu', label: 'European Union', description: 'EU official sources' },
    { value: '.ac.uk', label: 'UK Academic (.ac.uk)', description: 'UK universities' },
    { value: 'ine.es', label: 'Spanish Statistics (INE)', description: 'Instituto Nacional de Estadística' },
    { value: 'bde.es', label: 'Bank of Spain', description: 'Banco de España' },
  ];

  const toggleSourceType = (value: string) => {
    setPreferredSources(prev => 
      prev.includes(value) 
        ? prev.filter(s => s !== value)
        : [...prev, value]
    );
  };

  const handleFindCitations = async () => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('replace-citation-markers', {
        body: {
          content,
          headline,
          language,
          category,
          preferredSourceTypes: preferredSources
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
        // Show partial success warning
        if (stats.failedCount > 0) {
          toast({
            title: "Partial Success",
            description: `Found ${data.replacedCount} of ${data.totalMarkers} sources. ${data.failedCount} claims still need citations.`,
          });
        }
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
      <Card className="border-amber-300 bg-amber-50/50 shadow-sm animate-pulse-subtle">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 animate-pulse" />
                Citations Needed
              </CardTitle>
              <CardDescription className="mt-2 space-y-1">
                <div>{markerCount} claim{markerCount !== 1 ? 's' : ''} need{markerCount === 1 ? 's' : ''} authoritative sources</div>
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  💡 <span>Add <code className="bg-amber-100 px-1 py-0.5 rounded text-xs">[CITATION_NEEDED]</code> in your content where you need sources</span>
                </div>
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg font-semibold shrink-0 animate-pulse">
              {markerCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => setShowSourcePicker(!showSourcePicker)}
              className="w-full justify-between"
              type="button"
            >
              <span className="flex items-center gap-2">
                Source Preferences
                {preferredSources.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {preferredSources.length} selected
                  </Badge>
                )}
              </span>
              {showSourcePicker ? '▼' : '▶'}
            </Button>

            {showSourcePicker && (
              <div className="space-y-2 p-4 border rounded-md bg-background">
                <p className="text-sm text-muted-foreground mb-3">
                  Select preferred official source types (optional)
                </p>
                {sourceTypeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={preferredSources.includes(option.value)}
                      onChange={() => toggleSourceType(option.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

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

            {stats.failedCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-amber-900">
                      {stats.failedCount} claim{stats.failedCount !== 1 ? 's' : ''} couldn't be verified
                    </p>
                    <p className="text-amber-700 text-xs">
                      Some government sources may have SSL issues. You can try searching again or add citations manually.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowPreview(false);
                        handleFindCitations();
                      }}
                      className="gap-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry Search
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
