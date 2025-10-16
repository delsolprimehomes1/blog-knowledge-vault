import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InternalLink } from "@/types/blog";
import { toast } from "sonner";

interface SuggestedLink {
  targetArticleId: string;
  targetUrl: string;
  targetHeadline: string;
  funnelStage: string;
  category: string;
  anchorText: string;
  titleAttribute: string;
  contextSnippet: string;
  relevanceScore: number;
}

interface InternalLinkFinderProps {
  articleContent: string;
  headline: string;
  currentArticleId?: string;
  language?: string;
  onLinksFound: (links: InternalLink[]) => void;
}

export const InternalLinkFinder = ({
  articleContent,
  headline,
  currentArticleId,
  language = 'en',
  onLinksFound,
}: InternalLinkFinderProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedLinks, setSuggestedLinks] = useState<SuggestedLink[]>([]);

  const findRelevantArticles = async () => {
    if (!articleContent || articleContent.length < 100) {
      toast.error("Please add more content before finding internal links");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-internal-links', {
        body: {
          content: articleContent,
          headline: headline,
          currentArticleId: currentArticleId || 'new',
          language: language,
        }
      });

      if (error) throw error;

      setSuggestedLinks(data.links || []);
      
      if (data.links && data.links.length > 0) {
        toast.success(`Found ${data.links.length} relevant internal links`);
      } else {
        toast.info("No relevant internal links found. Try publishing more articles first.");
      }
    } catch (error) {
      console.error('Error finding internal links:', error);
      toast.error("Failed to find internal links. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addLink = (link: SuggestedLink) => {
    const newLink: InternalLink = {
      text: link.anchorText,
      url: link.targetUrl,
      title: link.titleAttribute,
    };
    onLinksFound([newLink]);
    toast.success("Link added to your article");
  };

  const addAllLinks = () => {
    const newLinks: InternalLink[] = suggestedLinks.map(link => ({
      text: link.anchorText,
      url: link.targetUrl,
      title: link.titleAttribute,
    }));
    onLinksFound(newLinks);
    toast.success(`Added ${newLinks.length} links to your article`);
  };

  const getFunnelColor = (stage: string) => {
    switch (stage) {
      case 'TOFU': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'MOFU': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'BOFU': return 'bg-green-500/10 text-green-600 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Internal Link Finder</h3>
          <p className="text-sm text-muted-foreground">
            AI-powered suggestions for relevant internal links
          </p>
        </div>
        <Button
          onClick={findRelevantArticles}
          disabled={isAnalyzing}
          variant="secondary"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Find Relevant Articles
            </>
          )}
        </Button>
      </div>

      {suggestedLinks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              ✅ Found {suggestedLinks.length} relevant internal links
            </p>
            <Button
              onClick={addAllLinks}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add All Links
            </Button>
          </div>

          <div className="space-y-3">
            {suggestedLinks.map((link, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{link.targetHeadline}</h4>
                        <Badge className={getFunnelColor(link.funnelStage)}>
                          {link.funnelStage}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Score: {link.relevanceScore}/10
                        </Badge>
                      </div>
                      
                      {link.contextSnippet && (
                        <p className="text-sm text-muted-foreground italic">
                          "...{link.contextSnippet}..."
                        </p>
                      )}
                      
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Anchor text:</span>{" "}
                          <em className="text-primary">"{link.anchorText}"</em>
                        </p>
                        <p>
                          <span className="font-medium">Title:</span>{" "}
                          <span className="text-muted-foreground">{link.titleAttribute}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => addLink(link)}
                      size="sm"
                      variant="default"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add This Link
                    </Button>
                    <Button
                      onClick={() => window.open(link.targetUrl, '_blank')}
                      size="sm"
                      variant="ghost"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview Article
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="p-4 bg-muted/50">
        <h4 className="font-medium mb-2">Linking Best Practices</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>✓ Include 2-3 TOFU links (awareness content)</li>
          <li>✓ Include 2-3 MOFU links (consideration content)</li>
          <li>✓ Include 1-2 BOFU links (conversion content)</li>
          <li>✓ Use descriptive anchor text (not "click here")</li>
          <li>✓ Total: 5-10 contextual links recommended</li>
        </ul>
      </Card>
    </div>
  );
};
