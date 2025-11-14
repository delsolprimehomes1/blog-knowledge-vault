import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BetterCitation {
  url: string;
  source: string;
  description: string;
  relevance: string;
  authorityScore: number;
  verified?: boolean;
  statusCode?: number;
  targetSentence?: string;
  suggestedAnchor?: string;
  placementContext?: string;
  confidenceScore?: number;
}

interface BetterCitationFinderProps {
  articleId?: string;
  articleTopic: string;
  articleLanguage: string;
  articleContent: string;
  currentCitations: string[];
  onAddCitation?: (citation: { url: string; source: string; text: string }) => void;
}

export const BetterCitationFinder = ({ articleId, articleTopic, articleLanguage, articleContent, currentCitations, onAddCitation }: BetterCitationFinderProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [citations, setCitations] = useState<BetterCitation[]>([]);
  const { toast } = useToast();

  const handleFindCitations = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-better-citations', {
        body: { articleId, articleTopic, articleLanguage, articleContent: articleContent.substring(0, 5000), currentCitations, verifyUrls: true }
      });
      if (error) throw error;
      setCitations(data.citations);
      toast({ title: "✨ Citations Found!", description: `Found ${data.verifiedCount}/${data.totalFound} citations with sentence-level mapping` });
    } catch (error: any) {
      toast({ title: "Search Failed", description: error.message || "Failed to find citations", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ description: "URL copied" });
  };

  const handleAddCitation = (citation: BetterCitation) => {
    if (onAddCitation) {
      onAddCitation({ url: citation.url, source: citation.source, text: citation.suggestedAnchor || citation.source });
      toast({ description: "Citation added" });
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30 dark:bg-purple-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-600" />AI Citation Finder</CardTitle>
        <CardDescription>Enhanced with sentence-level analysis for precise citation placement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleFindCitations} disabled={isSearching || !articleTopic} className="w-full">
          {isSearching ? "Analyzing..." : "Find Citations with AI"}
        </Button>
        {citations.length > 0 && (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {citations.map((c, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2 bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{c.source}</h4>
                      <Badge variant={c.authorityScore >= 8 ? "default" : "secondary"}>Authority: {c.authorityScore}/10</Badge>
                      {c.confidenceScore && <Badge>{c.confidenceScore}%</Badge>}
                      {c.verified && <Badge className="bg-green-600">✓ Verified</Badge>}
                    </div>
                    {c.targetSentence && (
                      <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded text-sm">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">📍 Placement:</p>
                        <p className="italic">"{c.targetSentence}"</p>
                      </div>
                    )}
                    {c.suggestedAnchor && <code className="text-xs bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">{c.suggestedAnchor}</code>}
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block break-all">{c.url}</a>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleCopyUrl(c.url)}><Copy className="h-4 w-4" /></Button>
                    {onAddCitation && <Button variant="default" size="sm" onClick={() => handleAddCitation(c)}><Plus className="h-4 w-4" /></Button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
