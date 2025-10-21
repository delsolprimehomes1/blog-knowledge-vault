import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { ExternalCitation } from "@/types/blog";
import { ExternalLinkFinder } from "@/components/ExternalLinkFinder";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

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
  const [citationHealth, setCitationHealth] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const loadHealthData = async () => {
      const urls = citations.map(c => c.url).filter(Boolean);
      if (urls.length === 0) return;
      
      const { data } = await supabase
        .from('external_citation_health')
        .select('*')
        .in('url', urls);
      
      const healthMap = new Map();
      data?.forEach(h => healthMap.set(h.url, h));
      setCitationHealth(healthMap);
    };
    
    loadHealthData();
  }, [citations]);

  const addCitation = () => {
    onCitationsChange([...citations, { text: "", url: "", source: "" }]);
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
          Add 2-5 citations. At least one must be from a .gov or .gob.es domain.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI-Powered Source Finder */}
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

        {citations.map((citation, index) => {
          const health = citationHealth.get(citation.url);
          return (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Citation {index + 1}</Label>
                  {health && (
                    <Badge variant={health.status === 'active' ? 'default' : 'destructive'} className="gap-1">
                      {health.status === 'active' ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          {health.status}
                        </>
                      )}
                    </Badge>
                  )}
                </div>
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
          );
        })}

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
          <p className="text-sm text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            At least one citation must be from a .gov or .gob.es domain
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
