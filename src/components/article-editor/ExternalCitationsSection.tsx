import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ExternalCitation } from "@/types/blog";
import { ExternalLinkFinder } from "@/components/ExternalLinkFinder";
import { BetterCitationFinder } from "@/components/admin/BetterCitationFinder";
import { validateCitationCompliance, type CitationComplianceResult } from "@/lib/citationComplianceChecker";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  language = "en",
}: ExternalCitationsSectionProps) => {
  const [validationResults, setValidationResults] = useState<Record<string, CitationComplianceResult>>({});
  const [isValidating, setIsValidating] = useState<Record<number, boolean>>({});

  // Fetch dynamic domain count
  const { data: domainData } = useQuery({
    queryKey: ['approved-domains-count'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-domain-count');
      if (error) throw error;
      return data as { count: number; categories: number };
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const addCitation = () => {
    onCitationsChange([...citations, { text: "", url: "", source: "", year: new Date().getFullYear() }]);
  };

  const handleAddCitationFromFinder = async (citation: { url: string; sourceName: string; anchorText: string }) => {
    // Validate before adding
    const result = await validateCitationCompliance(citation.url);
    
    // Block non-approved or competitor domains
    if (result.severity === 'critical' || !result.isApproved) {
      console.error('Blocked non-approved citation:', citation.url);
      return;
    }
    
    const newCitation: ExternalCitation = {
      text: citation.anchorText,
      url: citation.url,
      source: citation.sourceName,
      year: new Date().getFullYear(),
    };
    onCitationsChange([...citations, newCitation]);
    setValidationResults({ ...validationResults, [citation.url]: result });
  };

  const updateCitation = async (index: number, field: keyof ExternalCitation, value: string | number) => {
    const updated = [...citations];
    updated[index] = { ...updated[index], [field]: value };
    
    // If URL field is being updated, validate immediately
    if (field === 'url' && typeof value === 'string' && value.trim() !== '') {
      const result = await validateCitationCompliance(value);
      
      // Block non-approved or competitor domains
      if (result.severity === 'critical' || !result.isApproved) {
        // Don't update the citation, show error
        setValidationResults({ ...validationResults, [value]: result });
        return;
      }
      
      setValidationResults({ ...validationResults, [value]: result });
    }
    
    onCitationsChange(updated);

    // If URL changed, clear old validation
    if (field === 'url' && validationResults[updated[index].url]) {
      const newResults = { ...validationResults };
      delete newResults[updated[index].url];
      setValidationResults(newResults);
    }
  };

  const validateCitation = async (index: number, url: string) => {
    if (!url || url.trim() === '') return;

    setIsValidating({ ...isValidating, [index]: true });
    
    try {
      const result = await validateCitationCompliance(url);
      setValidationResults({ ...validationResults, [url]: result });
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating({ ...isValidating, [index]: false });
    }
  };

  const removeCitation = (index: number) => {
    onCitationsChange(citations.filter((_, i) => i !== index));
  };

  const hasGovDomain = citations.some(c => 
    c.url.includes('.gov') || c.url.includes('.gob.es') || c.url.includes('.overheid.nl')
  );

  const hasCriticalIssues = Object.values(validationResults).some(r => r.severity === 'critical');
  const hasCompetitorCitations = Object.values(validationResults).some(r => r.isCompetitor);

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
              <Label>Publication Year *</Label>
              <Input
                value={citation.year || new Date().getFullYear()}
                onChange={(e) => updateCitation(index, "year", parseInt(e.target.value) || new Date().getFullYear())}
                placeholder={new Date().getFullYear().toString()}
                type="number"
                min="2020"
                max={new Date().getFullYear() + 1}
                required
                className={!citation.year ? 'border-amber-500' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for inline citations: "According to {citation.source} ({citation.year || new Date().getFullYear()})"
              </p>
              {!citation.year && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Year is required for AEO/EEAT compliance
                </p>
              )}
            </div>
            <div>
              <Label>Official URL *</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={citation.url}
                    onChange={(e) => updateCitation(index, "url", e.target.value)}
                    onBlur={(e) => validateCitation(index, e.target.value)}
                    placeholder="https://..."
                    type="url"
                    className={
                      validationResults[citation.url]?.severity === 'critical' 
                        ? 'border-destructive' 
                        : validationResults[citation.url]?.severity === 'warning'
                        ? 'border-orange-600'
                        : validationResults[citation.url]?.severity === 'valid'
                        ? 'border-green-600'
                        : ''
                    }
                  />
                  {isValidating[index] && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!isValidating[index] && validationResults[citation.url] && (
                    <>
                      {validationResults[citation.url].severity === 'valid' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      )}
                      {validationResults[citation.url].severity === 'warning' && (
                        <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                      )}
                      {validationResults[citation.url].severity === 'critical' && (
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                      )}
                    </>
                  )}
                </div>
                {validationResults[citation.url] && (
                  <div className="flex items-start gap-2">
                    <Badge 
                      variant={
                        validationResults[citation.url].severity === 'critical' 
                          ? 'destructive' 
                          : validationResults[citation.url].severity === 'warning'
                          ? 'default'
                          : 'secondary'
                      }
                      className={
                        validationResults[citation.url].severity === 'warning'
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : ''
                      }
                    >
                      {validationResults[citation.url].message}
                    </Badge>
                  </div>
                )}
              </div>
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

        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Approved Domains Only
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {domainData 
              ? `Only citations from our ${domainData.count} approved domains across ${domainData.categories} categories are allowed. Non-approved domains will be automatically blocked.`
              : 'Only citations from our approved domains are allowed. Non-approved domains will be automatically blocked.'
            }
          </p>
        </div>

        {hasCompetitorCitations && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive font-semibold flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              ⛔ CRITICAL: Competitor citations detected! These must be removed before publishing.
            </p>
            <p className="text-xs text-destructive mt-1">
              Never use links from real estate agencies, brokerages, or property sellers.
            </p>
          </div>
        )}

        {citations.length >= 2 && !hasGovDomain && !hasCriticalIssues && (
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
