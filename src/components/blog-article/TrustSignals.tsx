import { useState } from "react";
import { Check, RefreshCw, BookOpen, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalCitation } from "@/types/blog";

interface TrustSignalsProps {
  reviewerName?: string;
  dateModified?: string;
  citations: ExternalCitation[];
}

export const TrustSignals = ({ reviewerName, dateModified, citations }: TrustSignalsProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div id="citations" className="my-12 p-6 border rounded-lg bg-accent/50 space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
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
      </div>

      {citations.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              {isOpen ? "Hide" : "View"} All Sources
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <ol className="list-decimal list-inside space-y-3 text-sm">
              {citations.map((citation, index) => (
                <li key={index} id={`citation-${index + 1}`} className="p-3 bg-background rounded border scroll-mt-24">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">[{index + 1}]</span>
                    <div className="flex-1">
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium break-all"
                      >
                        {citation.source}
                      </a>
                      {citation.text && (
                        <p className="text-muted-foreground mt-1 text-xs">{citation.text}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
