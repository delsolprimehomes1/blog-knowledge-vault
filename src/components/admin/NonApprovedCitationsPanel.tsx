import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ExternalLink, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { getArticlesWithNonApprovedCitations, type ArticleWithNonApprovedCitations } from "@/lib/citationApprovalChecker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { extractCitationContext } from "@/lib/citationContextExtractor";

export function NonApprovedCitationsPanel() {
  const queryClient = useQueryClient();
  const [processingCitation, setProcessingCitation] = useState<string | null>(null);
  const [processingArticles, setProcessingArticles] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [failedSuggestions, setFailedSuggestions] = useState<{ 
    articleId: string; 
    url: string; 
    suggestions: any[] 
  } | null>(null);

  const { data: articlesWithIssues, isLoading } = useQuery({
    queryKey: ["non-approved-citations"],
    queryFn: getArticlesWithNonApprovedCitations,
  });

  const applyReplacementMutation = useMutation({
    mutationFn: async ({
      articleId,
      oldUrl,
      newUrl,
      newSource,
      confidence
    }: {
      articleId: string;
      oldUrl: string;
      newUrl: string;
      newSource: string;
      confidence: number;
    }) => {
      // 1. Fetch current article
      const { data: article, error: fetchError } = await supabase
        .from('blog_articles')
        .select('external_citations, detailed_content, headline')
        .eq('id', articleId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Create backup revision
      const { error: revisionError } = await supabase
        .from('article_revisions')
        .insert({
          article_id: articleId,
          previous_content: article.detailed_content,
          previous_citations: article.external_citations,
          revision_type: 'citation_replacement',
          change_reason: `Auto-replaced non-approved citation: ${oldUrl} → ${newUrl}`,
          changed_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (revisionError) throw revisionError;

      // 3. Update external_citations array
      const citations = (article.external_citations as any[]) || [];
      
      // Check if newUrl already exists in the article (excluding the oldUrl we're replacing)
      const normalizeUrl = (urlString: string) => {
        try {
          const urlObj = new URL(urlString);
          return urlObj.hostname.replace('www.', '') + urlObj.pathname.replace(/\/$/, '');
        } catch {
          return urlString;
        }
      };
      
      const newUrlExists = citations.some(citation => {
        return normalizeUrl(citation.url) === normalizeUrl(newUrl) && citation.url !== oldUrl;
      });

      if (newUrlExists) {
        const newDomain = new URL(newUrl).hostname;
        throw new Error(
          `This article already cites ${newDomain}. Cannot add duplicate citations from the same source.`
        );
      }
      
      const updatedCitations = citations.map(citation => {
        if (citation.url === oldUrl) {
          return {
            ...citation,
            url: newUrl,
            source: newSource,
            replaced_at: new Date().toISOString(),
            replacement_confidence: confidence
          };
        }
        return citation;
      });

      // 4. Update article
      const { error: updateError } = await supabase
        .from('blog_articles')
        .update({ external_citations: updatedCitations })
        .eq('id', articleId);

      if (updateError) throw updateError;

      // 5. Update citation_usage_tracking using atomic database function
      // This eliminates race conditions by handling everything in a single PostgreSQL transaction
      const replacedCitation = citations.find(c => c.url === oldUrl);
      
      const { error: trackingError } = await supabase.rpc('replace_citation_tracking', {
        p_article_id: articleId,
        p_old_url: oldUrl,
        p_new_url: newUrl,
        p_new_source: newSource,
        p_anchor_text: replacedCitation?.text || ''
      });

      if (trackingError) {
        console.error('Citation tracking update failed:', trackingError);
        // Don't throw - the main citation replacement succeeded
        // Tracking is secondary and shouldn't break the UX
      }

      return { 
        oldUrl, 
        newUrl, 
        newSource,
        confidence,
        headline: article.headline,
        articleId
      };
    },
    onSuccess: (data) => {
      setProcessingCitation(null);
      setProcessingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.articleId);
        return newSet;
      });
      
      const oldDomain = new URL(data.oldUrl).hostname;
      const newDomain = new URL(data.newUrl).hostname;
      
      if (data.confidence < 70) {
        toast.warning(
          `⚠️ Replaced with moderate confidence (${data.confidence}/100)\n` +
          `Article: "${data.headline}"\n` +
          `${oldDomain} → ${newDomain}\n` +
          `You may want to review this change`,
          { duration: 10000 }
        );
      } else {
        toast.success(
          `✅ Citation Replaced Successfully!\n` +
          `Article: "${data.headline}"\n` +
          `${oldDomain} → ${newDomain}\n` +
          `Confidence: ${data.confidence}/100 • Backup created`,
          { duration: 10000 }
        );
      }
      
      queryClient.invalidateQueries({ queryKey: ["non-approved-citations"] });
      queryClient.invalidateQueries({ queryKey: ["citation-health"] });
    },
    onError: (error, variables) => {
      setProcessingCitation(null);
      setProcessingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.articleId);
        return newSet;
      });
      toast.error("Failed to apply replacement: " + (error as Error).message);
    }
  });

  const findReplacementMutation = useMutation({
    mutationFn: async ({ 
      url, 
      articleId,
      articleHeadline,
      articleContent,
      articleLanguage,
      citationContext 
    }: {
      url: string;
      articleId: string;
      articleHeadline: string;
      articleContent: string;
      articleLanguage: string;
      citationContext?: string | null;
    }) => {
      const { data, error } = await supabase.functions.invoke('discover-better-links', {
        body: {
          originalUrl: url,
          articleHeadline,
          articleContent,
          articleLanguage,
          context: 'Replacing non-approved citation with approved source',
          citationContext: citationContext || undefined, // NEW: Specific context
          mustBeApproved: true
        }
      });
      
      if (error) throw error;
      return { data, url, articleId };
    },
    onSuccess: async (result) => {
      const { data, url, articleId } = result;
      
      if (!data?.suggestions || data.suggestions.length === 0) {
        setProcessingCitation(null);
        toast.warning(
          "❌ No approved alternatives found\n" +
          "Options: 1) Remove citation manually, 2) Add domain to approved list",
          { duration: 6000 }
        );
        return;
      }

      // Get best match: verified > unverified > any
      const verifiedMatch = data.suggestions.find((s: any) => s.verificationStatus === 'verified');
      const unverifiedMatch = data.suggestions.find((s: any) => s.verificationStatus === 'unverified');
      const bestMatch = verifiedMatch || unverifiedMatch || data.suggestions[0];
      
      // Only reject if ALL suggestions failed verification
      const allFailed = data.suggestions.every((s: any) => s.verificationStatus === 'failed');
      
      if (allFailed) {
        setProcessingCitation(null);
        setFailedSuggestions({
          articleId,
          url,
          suggestions: data.suggestions
        });
        toast.error(
          "❌ All suggested URLs are inaccessible\n" +
          "Click 'Review Suggestions' to manually select one anyway.",
          { duration: 6000 }
        );
        return;
      }
      
      // Warn if using unverified suggestion
      if (bestMatch.verificationStatus === 'unverified') {
        toast.warning(
          "⚠️ Using unverified suggestion\n" +
          "The suggested URL couldn't be verified automatically. Please review before publishing.",
          { duration: 5000 }
        );
      }

      // Normalize URLs for comparison
      const normalizeUrl = (urlString: string) => {
        try {
          const urlObj = new URL(urlString);
          return urlObj.hostname.replace('www.', '') + urlObj.pathname.replace(/\/$/, '');
        } catch {
          return urlString;
        }
      };

      const normalizedOld = normalizeUrl(url);
      const normalizedNew = normalizeUrl(bestMatch.suggestedUrl);

      // Check if replacement is the same as original
      if (normalizedOld === normalizedNew) {
        setProcessingCitation(null);
        setProcessingArticles(prev => {
          const newSet = new Set(prev);
          newSet.delete(articleId);
          return newSet;
        });
        toast.success(
          "✅ No replacement needed\n" +
          "This citation is already using an approved domain",
          { duration: 4000 }
        );
        return;
      }

      // Auto-apply the replacement
      applyReplacementMutation.mutate({
        articleId,
        oldUrl: url,
        newUrl: bestMatch.suggestedUrl,
        newSource: bestMatch.sourceName,
        confidence: bestMatch.authorityScore || 0
      });
    },
    onError: (error, variables) => {
      setProcessingCitation(null);
      setProcessingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.articleId);
        return newSet;
      });
      
      const errorMessage = (error as Error).message || '';
      
      // Check if it's a "no approved alternatives" error
      if (errorMessage.includes('No approved domain alternatives found') || 
          errorMessage.includes('non-2xx status code')) {
        try {
          const domain = new URL(variables.url).hostname.replace('www.', '');
          toast.error(
            `❌ No approved alternatives found for ${domain}\n\n` +
            `The AI couldn't find replacement sources from your approved list.\n` +
            `Options: Remove citation manually below or add this domain to your approved list.`,
            { 
              duration: 10000,
              action: {
                label: 'Remove Now',
                onClick: () => handleRemoveCitation(variables.url, variables.articleId)
              }
            }
          );
        } catch {
          toast.error(
            `❌ No approved alternatives found\n\n` +
            `The AI couldn't find replacement sources from your approved list.\n` +
            `Options: Remove citation manually or add domain to approved list.`,
            { duration: 8000 }
          );
        }
      } else {
        // Generic error for other issues
        toast.error("Failed to find replacement: " + errorMessage);
      }
    }
  });

  const removeCitationMutation = useMutation({
    mutationFn: async ({
      articleId,
      citationUrl
    }: {
      articleId: string;
      citationUrl: string;
    }) => {
      // Get current article
      const { data: article, error: fetchError } = await supabase
        .from('blog_articles')
        .select('external_citations, detailed_content')
        .eq('id', articleId)
        .single();

      if (fetchError) throw fetchError;

      const citations = (article.external_citations as any[]) || [];
      const updatedCitations = citations.filter(c => c.url !== citationUrl);

      // Update article
      const { error: updateError } = await supabase
        .from('blog_articles')
        .update({ external_citations: updatedCitations })
        .eq('id', articleId);

      if (updateError) throw updateError;

      return { removed: citations.length - updatedCitations.length };
    },
    onSuccess: (data, variables) => {
      toast.success(`Citation removed successfully`);
      queryClient.invalidateQueries({ queryKey: ["non-approved-citations"] });
      queryClient.invalidateQueries({ queryKey: ["citation-health"] });
    },
    onError: (error) => {
      toast.error("Failed to remove citation: " + (error as Error).message);
    }
  });

  const handleFindReplacement = async (
    url: string,
    article: ArticleWithNonApprovedCitations
  ) => {
    setProcessingCitation(url);
    setProcessingArticles(prev => new Set(prev).add(article.id));
    
    // Fetch full article content
    const { data: fullArticle } = await supabase
      .from('blog_articles')
      .select('detailed_content')
      .eq('id', article.id)
      .single();

    // Extract context around the citation for better AI understanding
    const citationContext = fullArticle?.detailed_content 
      ? extractCitationContext(fullArticle.detailed_content, url, 500)
      : null;

    if (citationContext) {
      console.log(`📍 Citation context extracted (${citationContext.length} chars):`, citationContext);
    } else {
      console.log('⚠️ Could not extract citation context, using full content');
    }

    findReplacementMutation.mutate({
      url,
      articleId: article.id,
      articleHeadline: article.headline,
      articleContent: fullArticle?.detailed_content || '',
      articleLanguage: article.language,
      citationContext
    });
  };

  const handleRemoveCitation = (url: string, articleId: string) => {
    if (!confirm(`Are you sure you want to remove this citation?\n\nURL: ${url}\n\nThis action will create a backup revision.`)) {
      return;
    }
    
    removeCitationMutation.mutate({ articleId, citationUrl: url });
  };

  const handleBatchReplaceAll = async () => {
    if (!confirm(
      `🤖 Batch Replace All Non-Approved Citations?\n\n` +
      `This will:\n` +
      `• Find approved alternatives for ${totalNonApproved} citations\n` +
      `• Auto-apply high-confidence replacements (≥80%)\n` +
      `• Flag lower-confidence ones for manual review\n` +
      `• Create backup revisions for all changes\n\n` +
      `This may take several minutes. Continue?`
    )) {
      return;
    }

    setIsBatchProcessing(true);
    toast.loading("🔄 Starting batch replacement job...", { id: 'batch-job' });

    try {
      const { data, error } = await supabase.functions.invoke('batch-replace-non-approved', {
        body: {}
      });

      if (error) throw error;

      setBatchJobId(data.jobId);
      toast.success("✅ Job started! Monitoring progress...", { id: 'batch-job' });

      // Poll for job status using edge function
      const pollInterval = setInterval(async () => {
        const { data: statusData, error: jobError } = await supabase.functions.invoke(
          'check-citation-replacement-status',
          { body: { jobId: data.jobId } }
        );

        if (jobError) {
          console.error('Error fetching job status:', jobError);
          return;
        }

        setJobStatus(statusData);

        if (statusData.status === 'completed' || statusData.status === 'failed' || statusData.status === 'partial') {
          clearInterval(pollInterval);
          setIsBatchProcessing(false);
          setBatchJobId(null);

          if (statusData.status === 'completed') {
            toast.success(
              `🎉 Batch replacement complete!\n\n` +
              `✅ Auto-applied: ${statusData.auto_applied_count} citations\n` +
              `📋 Manual review: ${statusData.manual_review_count} citations\n` +
              `❌ Failed: ${statusData.failed_count} citations`,
              { id: 'batch-job', duration: 12000 }
            );
          } else if (statusData.status === 'partial') {
            toast.warning(
              `⚠️ Batch processing timed out\n\n` +
              `✅ Auto-applied: ${statusData.auto_applied_count} citations\n` +
              `📋 Manual review: ${statusData.manual_review_count} citations\n` +
              `❌ Failed: ${statusData.failed_count} citations\n\n` +
              `${statusData.error_message || 'Processing stopped due to timeout'}`,
              { id: 'batch-job', duration: 15000 }
            );
          } else {
            toast.error(
              `❌ Batch replacement failed\n${statusData.error_message}`,
              { id: 'batch-job', duration: 8000 }
            );
          }

          queryClient.invalidateQueries({ queryKey: ["non-approved-citations"] });
          queryClient.invalidateQueries({ queryKey: ["citation-health"] });
        }
      }, 3000); // Poll every 3 seconds

    } catch (error) {
      toast.error("Failed to start batch job: " + (error as Error).message, { id: 'batch-job' });
      setIsBatchProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const totalNonApproved = articlesWithIssues?.reduce((sum, a) => sum + a.nonApprovedCitations.length, 0) || 0;
  const affectedArticles = articlesWithIssues?.length || 0;

  // Count domain frequencies
  const domainCounts = new Map<string, number>();
  articlesWithIssues?.forEach(article => {
    article.nonApprovedCitations.forEach(citation => {
      try {
        const domain = new URL(citation.url).hostname.replace('www.', '');
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      } catch {}
    });
  });

  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Citation Quality Control</AlertTitle>
        <AlertDescription>
          These articles contain citations from domains not on your approved list of {243} trusted sources.
          You can find AI-powered replacements from approved domains or remove problematic citations.
        </AlertDescription>
      </Alert>

      {totalNonApproved > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleBatchReplaceAll}
            disabled={isBatchProcessing}
            size="lg"
            className="gap-2"
          >
            {isBatchProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {jobStatus ? (
                  `Processing ${jobStatus.progress_current || 0}/${jobStatus.progress_total || 0} citations...`
                ) : (
                  'Starting...'
                )}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                🤖 Auto-Replace All Non-Approved Citations
              </>
            )}
          </Button>
        </div>
      )}

      {isBatchProcessing && jobStatus && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">
                  {jobStatus.progress_current || 0} / {jobStatus.progress_total || 0}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((jobStatus.progress_current || 0) / (jobStatus.progress_total || 1)) * 100}%`
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm pt-2">
                <div>
                  <div className="text-green-600 font-semibold">{jobStatus.auto_applied_count || 0}</div>
                  <div className="text-muted-foreground">Auto-applied</div>
                </div>
                <div>
                  <div className="text-yellow-600 font-semibold">{jobStatus.manual_review_count || 0}</div>
                  <div className="text-muted-foreground">Manual review</div>
                </div>
                <div>
                  <div className="text-red-600 font-semibold">{jobStatus.failed_count || 0}</div>
                  <div className="text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Affected Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{affectedArticles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Need citation review
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Non-Approved Citations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalNonApproved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From unapproved domains
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Unapproved Domains</CardTitle>
          </CardHeader>
          <CardContent>
            {topDomains.length > 0 ? (
              <div className="space-y-1">
                {topDomains.map(([domain, count]) => (
                  <div key={domain} className="text-xs flex justify-between">
                    <span className="truncate mr-2">{domain}</span>
                    <Badge variant="outline" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No issues found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {articlesWithIssues && articlesWithIssues.length > 0 ? (
        <div className="space-y-4">
          {articlesWithIssues.map(article => (
            <Card key={article.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{article.headline}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{article.language.toUpperCase()}</Badge>
                      <Badge>{article.status}</Badge>
                      <Badge variant="secondary">
                        {article.totalCitations} citations ({article.nonApprovedCitations.length} non-approved)
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/blog/${article.slug}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {article.nonApprovedCitations.map((citation, idx) => (
                  <Card key={`${citation.url}-${idx}`} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="destructive" className="text-xs">
                              Non-Approved
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate">
                              {citation.source}
                            </span>
                          </div>
                          <p className="text-sm font-mono text-red-600 break-all">
                            {citation.url}
                          </p>
                          {citation.text && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              Anchor text: "{citation.text}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleFindReplacement(citation.url, article)}
                            disabled={
                              processingArticles.has(article.id) ||
                              processingCitation === citation.url || 
                              findReplacementMutation.isPending ||
                              applyReplacementMutation.isPending
                            }
                          >
                            {processingCitation === citation.url ? (
                              findReplacementMutation.isPending ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Finding AI replacement...</>
                              ) : applyReplacementMutation.isPending ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Applying replacement...</>
                              ) : (
                                <><Sparkles className="h-4 w-4 mr-1" /> Find & Replace</>
                              )
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-1" /> Find & Replace</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveCitation(citation.url, article.id)}
                            disabled={
                              processingArticles.has(article.id) ||
                              removeCitationMutation.isPending
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="text-green-600 text-4xl">✓</div>
              <p className="text-lg font-medium">All Citations Approved!</p>
              <p className="text-sm text-muted-foreground">
                All citations in your articles are from approved domains.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Review Dialog for Failed Suggestions */}
      {failedSuggestions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Review Unverified Suggestions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                These URLs couldn't be verified automatically (PDFs often fail verification). 
                You can still use them if they look legitimate.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Original (Non-Approved) Citation:</p>
                <a 
                  href={failedSuggestions.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {failedSuggestions.url}
                </a>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">AI Suggestions (Unverified):</p>
                {failedSuggestions.suggestions.map((suggestion: any, idx: number) => (
                  <div key={idx} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm">{suggestion.sourceName}</p>
                        <a 
                          href={suggestion.suggestedUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline break-all block"
                        >
                          {suggestion.suggestedUrl}
                        </a>
                        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                        <div className="flex gap-2 items-center text-xs">
                          <Badge variant="outline">Authority: {suggestion.authorityScore}/100</Badge>
                          <Badge variant="outline">Relevance: {suggestion.relevanceScore}/100</Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          applyReplacementMutation.mutate({
                            articleId: failedSuggestions.articleId,
                            oldUrl: failedSuggestions.url,
                            newUrl: suggestion.suggestedUrl,
                            newSource: suggestion.sourceName,
                            confidence: suggestion.authorityScore || 0
                          });
                          setFailedSuggestions(null);
                        }}
                      >
                        Use This
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setFailedSuggestions(null)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
