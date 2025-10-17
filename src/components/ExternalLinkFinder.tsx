import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, ExternalLink, Plus, Eye } from "lucide-react";
import { ExternalCitation } from "@/types/blog";

interface ExternalLinkFinderProps {
  articleContent: string;
  headline: string;
  currentCitations: ExternalCitation[];
  onCitationsChange: (citations: ExternalCitation[]) => void;
  language?: string;
}

interface FoundCitation {
  sourceName: string;
  url: string;
  anchorText: string;
  relevance: string;
  verified?: boolean;
}

export const ExternalLinkFinder = ({ 
  articleContent, 
  headline,
  currentCitations,
  onCitationsChange,
  language = 'es'
}: ExternalLinkFinderProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [foundLinks, setFoundLinks] = useState<FoundCitation[]>([]);

  const findAuthoritativeSources = async () => {
    if (!articleContent || !headline) {
      toast.error("Please add headline and content before searching for sources");
      return;
    }

    setIsSearching(true);

    try {
      console.log('Searching for authoritative sources...');
      
      const { data, error } = await supabase.functions.invoke('find-external-links', {
        body: {
          content: articleContent,
          headline: headline,
          language: language
        }
      });

      if (error) throw error;

      if (data?.citations && data.citations.length > 0) {
        setFoundLinks(data.citations);
        toast.success(`Found ${data.citations.length} authoritative sources!`);
      } else {
        toast.info("No authoritative sources found. Try adding more content or search manually.");
        setFoundLinks([]);
      }
    } catch (error) {
      console.error('Error finding external links:', error);
      toast.error("Failed to find sources. Please try again.");
      setFoundLinks([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addCitation = (link: FoundCitation) => {
    // Check if citation already exists
    const exists = currentCitations.some(c => c.url === link.url);
    if (exists) {
      toast.info("This citation is already added");
      return;
    }

    const newCitation: ExternalCitation = {
      source: link.sourceName,
      url: link.url,
      text: link.anchorText
    };

    onCitationsChange([...currentCitations, newCitation]);
    toast.success("Citation added!");
  };

  const isOfficialGovernment = (url: string) => {
    return url.includes('.gov') || url.includes('.gob.es') || url.includes('.overheid.nl');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">AI-Powered Source Finder</h4>
          <p className="text-sm text-muted-foreground">
            Automatically discover authoritative sources for your article
          </p>
        </div>
        <Button 
          onClick={findAuthoritativeSources}
          disabled={isSearching || !articleContent}
          variant="secondary"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Find Sources
            </>
          )}
        </Button>
      </div>

      {foundLinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {foundLinks.length} sources found
            </Badge>
            {foundLinks.some(link => isOfficialGovernment(link.url)) && (
              <Badge variant="default">
                Includes official government sources
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            {foundLinks.map((link, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm">{link.sourceName}</strong>
                        {isOfficialGovernment(link.url) && (
                          <Badge variant="default" className="text-xs">
                            🔒 Official Government
                          </Badge>
                        )}
                        {link.verified && (
                          <Badge variant="outline" className="text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                      
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {link.url.length > 60 ? link.url.substring(0, 60) + '...' : link.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Suggested anchor:</span> "{link.anchorText}"
                      </p>
                      
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Relevance:</span> {link.relevance}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => addCitation(link)}
                      disabled={currentCitations.some(c => c.url === link.url)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {currentCitations.some(c => c.url === link.url) ? 'Added' : 'Add Citation'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
