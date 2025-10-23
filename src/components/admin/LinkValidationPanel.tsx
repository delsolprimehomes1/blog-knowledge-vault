import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw,
  Search,
  Link as LinkIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ArticleLinkValidation, BetterLinkSuggestion } from "@/lib/linkValidator";
import { calculateLinkHealthScore } from "@/lib/linkValidator";

interface LinkValidationPanelProps {
  articleId: string;
  articleSlug: string;
}

export const LinkValidationPanel = ({ articleId, articleSlug }: LinkValidationPanelProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [validation, setValidation] = useState<ArticleLinkValidation | null>(null);
  const [suggestions, setSuggestions] = useState<Map<string, BetterLinkSuggestion[]>>(new Map());
  const { toast } = useToast();

  const handleValidateLinks = async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-article-links', {
        body: { articleId }
      });

      if (error) throw error;

      setValidation(data as ArticleLinkValidation);
      
      toast({
        title: "Validation Complete",
        description: `Found ${data.brokenLinksCount} broken links, ${data.languageMismatchCount} language mismatches, ${data.irrelevantLinksCount} irrelevant links.`,
      });
    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to validate links",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDiscoverBetterLink = async (originalUrl: string, context: string) => {
    setIsDiscovering(true);
    try {
      if (!validation) return;

      const { data, error } = await supabase.functions.invoke('discover-better-links', {
        body: {
          originalUrl,
          articleHeadline: validation.articleTopic,
          articleContent: "",
          articleLanguage: validation.articleLanguage,
          context,
        }
      });

      if (error) throw error;

      setSuggestions(prev => new Map(prev).set(originalUrl, data.suggestions));
      
      toast({
        title: "Alternatives Found",
        description: `Found ${data.suggestions.length} alternative sources`,
      });
    } catch (error: any) {
      console.error('Discovery error:', error);
      toast({
        title: "Discovery Failed",
        description: error.message || "Failed to find alternatives",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleReplaceLink = async (oldUrl: string, newUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('replace-article-links', {
        body: {
          articleId,
          replacements: [{ oldUrl, newUrl }]
        }
      });

      if (error) throw error;

      toast({
        title: "Link Replaced",
        description: `Replaced ${data.replacedCount} occurrence(s)`,
      });

      // Refresh validation
      handleValidateLinks();
    } catch (error: any) {
      console.error('Replacement error:', error);
      toast({
        title: "Replacement Failed",
        description: error.message || "Failed to replace link",
        variant: "destructive",
      });
    }
  };

  const healthScore = validation ? calculateLinkHealthScore(validation) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Link Validation & Discovery
        </CardTitle>
        <CardDescription>
          Validate existing links and discover better alternatives with AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleValidateLinks}
            disabled={isValidating}
            className="gap-2"
          >
            {isValidating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Validate All Links
              </>
            )}
          </Button>
        </div>

        {validation && (
          <>
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <strong>Link Health Score:</strong>{" "}
                  <Badge variant={healthScore >= 80 ? "default" : healthScore >= 60 ? "secondary" : "destructive"}>
                    {healthScore}/100
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {validation.externalLinks.length + validation.internalLinks.length} total links
                </div>
              </AlertDescription>
            </Alert>

            {validation.brokenLinksCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{validation.brokenLinksCount} broken link(s) detected</strong>
                </AlertDescription>
              </Alert>
            )}

            {validation.languageMismatchCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{validation.languageMismatchCount} language mismatch(es) detected</strong>
                </AlertDescription>
              </Alert>
            )}

            {validation.irrelevantLinksCount > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{validation.irrelevantLinksCount} potentially irrelevant link(s)</strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h4 className="font-semibold">External Links</h4>
              {validation.externalLinks.map((link, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                      >
                        {link.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                      {link.contentSummary && (
                        <p className="text-xs text-muted-foreground mt-1">{link.contentSummary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {link.isWorking ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      {link.relevanceScore !== null && (
                        <Badge variant={link.relevanceScore >= 70 ? "default" : "secondary"}>
                          {link.relevanceScore}% relevant
                        </Badge>
                      )}
                    </div>
                  </div>

                  {(!link.isWorking || (link.isRelevant === false)) && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDiscoverBetterLink(link.url, "")}
                        disabled={isDiscovering}
                      >
                        Find Better Alternative
                      </Button>
                    </div>
                  )}

                  {suggestions.has(link.url) && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm font-medium">Suggested Alternatives:</p>
                      {suggestions.get(link.url)?.map((suggestion, idx) => (
                        <div key={idx} className="bg-muted p-3 rounded space-y-1">
                          <div className="flex items-center justify-between">
                            <a 
                              href={suggestion.suggestedUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {suggestion.sourceName}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <Button
                              size="sm"
                              onClick={() => handleReplaceLink(link.url, suggestion.suggestedUrl)}
                            >
                              Replace
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                          <div className="flex gap-2">
                            <Badge variant="outline">Authority: {suggestion.authorityScore}/10</Badge>
                            <Badge variant="outline">Relevance: {suggestion.relevanceScore}%</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {validation.internalLinks.length > 0 && (
                <>
                  <h4 className="font-semibold mt-6">Internal Links</h4>
                  {validation.internalLinks.map((link, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm break-all">{link.url}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {link.isWorking ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          <Badge variant="outline">{link.statusCode}</Badge>
                        </div>
                      </div>
                      {link.error && (
                        <p className="text-xs text-destructive mt-1">{link.error}</p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
