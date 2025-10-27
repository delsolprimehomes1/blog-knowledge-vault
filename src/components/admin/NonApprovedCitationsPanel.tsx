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

export function NonApprovedCitationsPanel() {
  const queryClient = useQueryClient();
  const [processingCitation, setProcessingCitation] = useState<string | null>(null);

  const { data: articlesWithIssues, isLoading } = useQuery({
    queryKey: ["non-approved-citations"],
    queryFn: getArticlesWithNonApprovedCitations,
  });

  const findReplacementMutation = useMutation({
    mutationFn: async ({ 
      url, 
      articleId,
      articleHeadline,
      articleContent,
      articleLanguage 
    }: {
      url: string;
      articleId: string;
      articleHeadline: string;
      articleContent: string;
      articleLanguage: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('discover-better-links', {
        body: {
          originalUrl: url,
          articleHeadline,
          articleContent,
          articleLanguage,
          context: 'Replacing non-approved citation with approved source',
          mustBeApproved: true  // New parameter to filter only approved domains
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      setProcessingCitation(null);
      
      if (data?.suggestions && data.suggestions.length > 0) {
        const bestScore = data.suggestions[0].authorityScore || 0;
        toast.success(
          `✅ Found ${data.suggestions.length} approved replacement(s)\n` +
          `Best match: ${bestScore}/100 authority score\n` +
          `Check the Citation Health page to review and apply`,
          { duration: 6000 }
        );
        queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
        queryClient.invalidateQueries({ queryKey: ["approved-replacements"] });
      } else {
        toast.warning(
          "No approved alternatives found for this citation.\n" +
          "You may need to manually find a replacement or remove the citation.",
          { duration: 5000 }
        );
      }
    },
    onError: (error) => {
      setProcessingCitation(null);
      toast.error("Failed to find replacement: " + (error as Error).message);
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
    
    // Fetch full article content
    const { data: fullArticle } = await supabase
      .from('blog_articles')
      .select('detailed_content')
      .eq('id', article.id)
      .single();

    findReplacementMutation.mutate({
      url,
      articleId: article.id,
      articleHeadline: article.headline,
      articleContent: fullArticle?.detailed_content || '',
      articleLanguage: article.language
    });
  };

  const handleRemoveCitation = (url: string, articleId: string) => {
    if (!confirm(`Are you sure you want to remove this citation?\n\nURL: ${url}\n\nThis action will create a backup revision.`)) {
      return;
    }
    
    removeCitationMutation.mutate({ articleId, citationUrl: url });
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
                            disabled={processingCitation === citation.url || findReplacementMutation.isPending}
                          >
                            {processingCitation === citation.url ? (
                              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Finding...</>
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-1" /> Find Replacement</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveCitation(citation.url, article.id)}
                            disabled={removeCitationMutation.isPending}
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
    </div>
  );
}
