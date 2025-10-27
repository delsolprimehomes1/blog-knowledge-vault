import { Card } from "@/components/ui/card";
import { Scale, ExternalLink } from "lucide-react";
import { ExternalCitation } from "@/types/blog";

interface LegalReferencesProps {
  citations: ExternalCitation[];
}

export const LegalReferences = ({ citations }: LegalReferencesProps) => {
  // Filter for government and legal sources
  const legalCitations = citations.filter(
    (citation) => 
      citation.sourceType === 'government' || 
      citation.sourceType === 'legal' ||
      citation.url.includes('.gov') ||
      citation.url.includes('.gob.') ||
      citation.url.includes('boe.es')
  );

  if (legalCitations.length === 0) return null;

  return (
    <Card className="p-6 bg-primary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Official Legal References</h3>
      </div>
      
      <div className="space-y-3">
        {legalCitations.map((citation, index) => (
          <div key={index} className="flex items-start gap-3 text-sm">
            <span className="text-muted-foreground font-mono">[{index + 1}]</span>
            <div className="flex-1">
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium flex items-center gap-1"
              >
                {citation.source}
                <ExternalLink className="h-3 w-3" />
              </a>
              {citation.verificationDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Verified: {new Date(citation.verificationDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 italic">
        All legal references link to official government and regulatory sources.
      </p>
    </Card>
  );
};
