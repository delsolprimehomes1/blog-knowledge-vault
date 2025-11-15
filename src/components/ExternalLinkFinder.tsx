import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, ExternalLink, Plus, Eye } from "lucide-react";
import { ExternalCitation } from "@/types/blog";

interface ExternalLinkFinderProps {
  articleId: string;
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
  // Domain-Aware Citation Engine metadata
  domain?: string;
  domainUseCount?: number;
  trustScore?: number;
  finalScore?: number;
  isOverused?: boolean;
  isCriticalOveruse?: boolean;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

export const ExternalLinkFinder = ({ 
  articleId,
  articleContent, 
  headline,
  currentCitations,
  onCitationsChange,
  language = 'en'
}: ExternalLinkFinderProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [foundLinks, setFoundLinks] = useState<FoundCitation[]>([]);
  const [requireGovSource, setRequireGovSource] = useState(false);
  const [hasGovernmentSource, setHasGovernmentSource] = useState(false);

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
          articleId,
          content: articleContent,
          headline: headline,
          language: language,
          requireGovernmentSource: requireGovSource,
          currentCitations: currentCitations.map(c => c.url)
        }
      });

      if (error) throw error;

      if (data?.citations && data.citations.length > 0) {
        setFoundLinks(data.citations);
        setHasGovernmentSource(data.hasGovernmentSource || false);
        toast.success(`Found ${data.citations.length} authoritative sources!`);
        
        // Show warning if government source was required but not found
        if (requireGovSource && !data.hasGovernmentSource) {
          toast.warning("No government sources found. Consider adding one manually for better authority.");
        }
      } else {
        toast.info("No authoritative sources found. Try adding more content or search manually.");
        setFoundLinks([]);
        setHasGovernmentSource(false);
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

    // Phase 3: Enforce domain diversity - max 1 per domain
    const linkDomain = link.domain || extractDomain(link.url);
    const existingDomains = currentCitations.map(c => extractDomain(c.url));
    
    if (existingDomains.includes(linkDomain)) {
      toast.error(
        `Domain ${linkDomain} already used in this article. Maximum 1 citation per domain.`,
        { duration: 4000 }
      );
      return;
    }
    
    // Warn about overused domains
    if (link.isCriticalOveruse) {
      toast.warning(
        `⚠️ ${linkDomain} has been used ${link.domainUseCount} times across your site. Consider using a different source for better diversity.`,
        { duration: 5000 }
      );
    }

    // Check if URL is a PDF
    const isPDF = link.url.toLowerCase().includes('.pdf') || 
                  link.url.includes('blobcol=urldata');
    
    if (isPDF) {
      toast.warning("⚠️ This is a PDF file. Consider finding the source webpage instead for better user experience.");
    }

    const newCitation: ExternalCitation = {
      source: link.sourceName,
      url: link.url,
      text: link.anchorText,
      year: new Date().getFullYear() // Default to current year
    };

    onCitationsChange([...currentCitations, newCitation]);
    toast.success(isPDF ? "PDF citation added (consider replacing with webpage)" : "Citation added!");
  };

  const isOfficialGovernment = (url: string) => {
    return url.includes('.gov') || url.includes('.gob.es') || url.includes('.overheid.nl');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
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

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="require-gov"
            checked={requireGovSource}
            onCheckedChange={(checked) => setRequireGovSource(checked as boolean)}
          />
          <Label 
            htmlFor="require-gov" 
            className="text-sm cursor-pointer"
          >
            Require at least one .gov or .gob.es source
          </Label>
        </div>
      </div>

      {foundLinks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {foundLinks.length} sources found
            </Badge>
            {hasGovernmentSource ? (
              <Badge variant="default">
                ✓ Includes official government sources
              </Badge>
            ) : requireGovSource ? (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                ⚠️ No government sources found
              </Badge>
            ) : null}
          </div>

          <div className="space-y-3">
            {foundLinks.map((link, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm">{link.sourceName}</strong>
                      {link.verified && <Badge variant="secondary">✓ Verified</Badge>}
                      {isOfficialGovernment(link.url) && <Badge variant="default">🔒 Official</Badge>}
                      {link.trustScore && <Badge variant={link.trustScore >= 90 ? "default" : "secondary"}>Trust: {link.trustScore}</Badge>}
                      {link.domainUseCount !== undefined && <Badge variant={link.isOverused ? "destructive" : "outline"}>Used {link.domainUseCount}×</Badge>}
                      {link.isCriticalOveruse && <Badge variant="destructive" className="animate-pulse">⚠️ Critical</Badge>}
                      {link.isOverused && !link.isCriticalOveruse && <Badge variant="outline" className="text-amber-600 border-amber-600">⚠️ Overused</Badge>}
                    </div>
                    
                    {link.domain && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Domain:</span> {link.domain}
                        {link.finalScore && (
                          <>
                            <span className="ml-2 font-medium">Score:</span> {link.finalScore.toFixed(1)}
                          </>
                        )}
                      </p>
                    )}
                    
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
