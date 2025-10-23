import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ArticleLinkValidation } from '@/lib/linkValidator';

interface LinkValidationDashboardProps {
  articleId: string;
}

export function LinkValidationDashboard({ articleId }: LinkValidationDashboardProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<ArticleLinkValidation | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-article-links', {
        body: { articleId, skipPerplexity: false, verifyUrls: true },
      });

      if (error) {
        console.error('Validation error:', error);
        toast.error('Failed to validate links');
        return;
      }

      setValidation(data as ArticleLinkValidation);
      toast.success('Link validation completed');
    } catch (error) {
      console.error('Validation failed:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsValidating(false);
    }
  };

  const handleFindAlternative = async (url: string) => {
    toast.info('Finding alternative links...');
    // TODO: Implement alternative link discovery
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Link Validation</CardTitle>
          <Button onClick={handleValidate} disabled={isValidating}>
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              'Validate Links'
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isValidating && (
          <div className="space-y-2">
            <Progress value={45} />
            <p className="text-sm text-muted-foreground">
              Checking link functionality and relevance...
            </p>
          </div>
        )}

        {validation && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm text-muted-foreground">Broken Links</p>
                      <p className="text-2xl font-bold">{validation.brokenLinksCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-warning" />
                    <div>
                      <p className="text-sm text-muted-foreground">Language Mismatches</p>
                      <p className="text-2xl font-bold">{validation.languageMismatchCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Irrelevant Links</p>
                      <p className="text-2xl font-bold">{validation.irrelevantLinksCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* External Links List */}
            <div>
              <h3 className="text-lg font-semibold mb-3">External Links</h3>
              <div className="space-y-2">
                {validation.externalLinks.map((link, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-medium hover:underline break-all"
                            >
                              {link.url}
                            </a>
                            {link.isWorking ? (
                              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={link.language === validation.articleLanguage ? "default" : "destructive"}>
                              {link.language || 'Unknown'}
                            </Badge>
                            <Badge variant={link.isRelevant ? "default" : "destructive"}>
                              {link.isRelevant ? 'Relevant' : 'Not Relevant'}
                            </Badge>
                            {link.statusCode && (
                              <Badge variant="outline">
                                Status: {link.statusCode}
                              </Badge>
                            )}
                            {link.authorityLevel && (
                              <Badge variant="secondary">
                                Authority: {link.authorityLevel}
                              </Badge>
                            )}
                          </div>

                          {link.contentSummary && (
                            <p className="text-sm text-muted-foreground">
                              {link.contentSummary}
                            </p>
                          )}

                          {link.recommendations && link.recommendations.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations:</p>
                              <ul className="text-xs text-muted-foreground list-disc list-inside">
                                {link.recommendations.map((rec, i) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleFindAlternative(link.url)}
                          className="flex-shrink-0"
                        >
                          Find Alternative
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Internal Links List */}
            {validation.internalLinks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Internal Links</h3>
                <div className="space-y-2">
                  {validation.internalLinks.map((link, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <a 
                                href={link.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:underline"
                              >
                                {link.url}
                              </a>
                              {link.isWorking ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            
                            {link.statusCode && (
                              <Badge variant="outline">
                                Status: {link.statusCode}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
