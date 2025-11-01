import { useState } from "react";
import { Check, RefreshCw, BookOpen, ChevronDown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalCitation } from "@/types/blog";

interface TrustSignalsProps {
  reviewerName?: string;
  dateModified?: string;
  citations: ExternalCitation[];
}

export const TrustSignals = ({ reviewerName, dateModified, citations }: TrustSignalsProps) => {
  const [isOpen, setIsOpen] = useState(true);

  // Calculate official source percentage
  const officialSources = citations.filter(
    (c) => c.sourceType === 'government' || c.sourceType === 'legal' || c.url.includes('.gov') || c.url.includes('.gob.')
  ).length;
  const officialPercentage = citations.length > 0 ? Math.round((officialSources / citations.length) * 100) : 0;

  return (
    <div id="citations" className="my-12 p-6 border rounded-lg bg-accent/50 space-y-4">
      <div className="grid md:grid-cols-4 gap-4">
        {reviewerName && (
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium">Peer Reviewed</p>
              <p className="text-xs text-muted-foreground">by {reviewerName}</p>
            </div>
          </div>
        )}

        {dateModified && (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Last Updated</p>
              <p className="text-xs text-muted-foreground">
                {new Date(dateModified).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-600" />
          <div>
            <p className="text-sm font-medium">Sources Cited</p>
            <p className="text-xs text-muted-foreground">
              {citations.length} authoritative sources
            </p>
          </div>
        </div>

        {officialPercentage >= 50 && (
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Official Sources</p>
              <p className="text-xs text-muted-foreground">
                {officialPercentage}% government/legal
              </p>
            </div>
          </div>
        )}
      </div>

      {citations.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              📚 Sources Referenced ({citations.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="space-y-2">
              {citations.map((citation, index) => {
                const isOfficial = citation.sourceType === 'government' || citation.sourceType === 'legal' || 
                                   citation.url.includes('.gov') || citation.url.includes('.gob.');
                const domain = new URL(citation.url).hostname;
                
                return (
                  <div key={index} className="flex items-center gap-2 text-sm p-2 rounded bg-background/50">
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {domain}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {isOfficial && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Shield className="h-3 w-3" />
                          Official
                        </Badge>
                      )}
                      {citation.authorityScore && citation.authorityScore >= 80 && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          High Authority
                        </Badge>
                      )}
                      {citation.verificationDate && (
                        <span className="text-xs text-muted-foreground">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              All sources appear as inline hyperlinks within the article text above.
            </p>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
