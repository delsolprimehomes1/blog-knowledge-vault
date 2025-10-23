import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { ExternalCitation } from "@/types/blog";
import { ExternalLinkFinder } from "@/components/ExternalLinkFinder";
import { BetterCitationFinder } from "@/components/admin/BetterCitationFinder";

interface ExternalCitationsSectionProps {
  citations: ExternalCitation[];
  onCitationsChange: (citations: ExternalCitation[]) => void;
  errors: Record<string, string>;
  articleContent?: string;
  headline?: string;
  language?: string;
}

export const ExternalCitationsSection = ({
  citations,
  onCitationsChange,
  errors,
  articleContent = "",
  headline = "",
  language = "es",
}: ExternalCitationsSectionProps) => {
  const addCitation = () => {
    onCitationsChange([...citations, { text: "", url: "", source: "" }]);
  };

  const handleAddCitationFromFinder = (citation: { url: string; sourceName: string; anchorText: string }) => {
    const newCitation: ExternalCitation = {
      text: citation.anchorText,
      url: citation.url,
      source: citation.sourceName,
    };
    onCitationsChange([...citations, newCitation]);
  };

  const updateCitation = (index: number, field: keyof ExternalCitation, value: string) => {
    const updated = [...citations];
    updated[index] = { ...updated[index], [field]: value };
    onCitationsChange(updated);
  };

  const removeCitation = (index: number) => {
    onCitationsChange(citations.filter((_, i) => i !== index));
  };

  const hasGovDomain = citations.some(c => 
    c.url.includes('.gov') || c.url.includes('.gob.es') || c.url.includes('.overheid.nl')
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>External Citations (Authority Links)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add 2-5 citations. At least one should ideally be from a .gov or .gob.es domain.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI-Powered Better Citation Finder (New - Perplexity) */}
        {headline && articleContent && (
          <BetterCitationFinder
            articleTopic={headline}
            articleLanguage={language}
            articleContent={articleContent}
            currentCitations={citations.map(c => c.url)}
            onAddCitation={handleAddCitationFromFinder}
          />
        )}

        {/* Original External Link Finder (Backup) */}
        <ExternalLinkFinder
          articleContent={articleContent}
          headline={headline}
          currentCitations={citations}
          onCitationsChange={onCitationsChange}
          language={language}
        />

        {/* Manual Citations List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Current Citations</h4>
            {citations.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {citations.length} of 5 maximum
              </span>
            )}
          </div>

        {citations.map((citation, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label>Citation {index + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCitation(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Label>Source Name *</Label>
              <Input
                value={citation.source}
                onChange={(e) => updateCitation(index, "source", e.target.value)}
                placeholder="Spanish Ministry of Inclusion"
              />
            </div>
            <div>
              <Label>Official URL *</Label>
              <Input
                value={citation.url}
                onChange={(e) => updateCitation(index, "url", e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div>
              <Label>Anchor Text *</Label>
              <Input
                value={citation.text}
                onChange={(e) => updateCitation(index, "text", e.target.value)}
                placeholder="Descriptive phrase for the link"
              />
            </div>
          </div>
        ))}

        {citations.length < 5 && (
          <Button
            type="button"
            variant="outline"
            onClick={addCitation}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Citation
          </Button>
        )}

        {citations.length < 2 && (
          <p className="text-sm text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Minimum 2 citations required
          </p>
        )}

        {citations.length >= 2 && !hasGovDomain && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Recommended: Add at least one citation from a .gov or .gob.es domain for better E-E-A-T
          </p>
        )}

        {errors.externalCitations && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.externalCitations}
          </p>
        )}
        </div>
      </CardContent>
    </Card>
  );
};
