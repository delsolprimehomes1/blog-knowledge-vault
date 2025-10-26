import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity, AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw,
  TrendingDown, TrendingUp, XCircle, Clock, ArrowRight, ThumbsUp, ThumbsDown, Play, Undo2, Zap
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChangePreviewModal } from "@/components/admin/ChangePreviewModal";
import { BulkReplacementDialog } from "@/components/admin/BulkReplacementDialog";
import { CitationHealthAnalysis } from "@/components/admin/CitationHealthAnalysis";
import { Progress } from "@/components/ui/progress";

interface CitationHealth {
  id: string;
  url: string;
  source_name: string;
  last_checked_at: string;
  status: 'healthy' | 'broken' | 'redirected' | 'slow' | 'unreachable' | 'replaced';
  http_status_code: number | null;
  response_time_ms: number;
  redirect_url: string | null;
  times_verified: number;
  times_failed: number;
}

interface DeadLinkReplacement {
  id: string;
  original_url: string;
  original_source: string;
  replacement_url: string;
  replacement_source: string;
  replacement_reason: string;
  confidence_score: number;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'rolled_back';
  created_at: string;
  applied_at?: string;
  applied_to_articles?: string[];
  replacement_count?: number;
}

const CitationHealth = () => {
  const queryClient = useQueryClient();
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [selectedReplacements, setSelectedReplacements] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<{
    replacement: DeadLinkReplacement;
    affectedArticles: any[];
  } | null>(null);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0 });

  const { data: healthData, isLoading } = useQuery({
    queryKey: ["citation-health"],
    queryFn: async () => {
      const { data, error } = await supabase.from("external_citation_health").select("*").order("last_checked_at", { ascending: false });
      if (error) throw error;
      return data as CitationHealth[];
    },
  });

  const { data: replacements } = useQuery({
    queryKey: ["dead-link-replacements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dead_link_replacements").select("*").in("status", ["suggested"]).order("confidence_score", { ascending: false });
      if (error) throw error;
      return data as DeadLinkReplacement[];
    },
  });

  const { data: approvedReplacements } = useQuery({
    queryKey: ["approved-replacements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dead_link_replacements").select("*").eq("status", "approved").order("created_at", { ascending: false });
      if (error) throw error;
      return data as DeadLinkReplacement[];
    },
  });

  const { data: appliedReplacements } = useQuery({
    queryKey: ["applied-replacements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dead_link_replacements").select("*").eq("status", "applied").order("applied_at", { ascending: false });
      if (error) throw error;
      return data as DeadLinkReplacement[];
    },
  });

  const runHealthCheck = useMutation({
    mutationFn: async () => {
      setCheckProgress({ current: 0, total: 100 });
      setIsRunningCheck(true);
      
      const { data, error } = await supabase.functions.invoke("check-citation-health");
      if (error) throw error;
      
      // Fetch actual database state after check completes
      const { data: actualHealth } = await supabase
        .from('external_citation_health')
        .select('status')
        .gte('last_checked_at', new Date(Date.now() - 60000).toISOString());
      
      // Calculate real counts from database
      const realCounts = {
        healthy: actualHealth?.filter(h => h.status === 'healthy').length || 0,
        broken: actualHealth?.filter(h => h.status === 'broken').length || 0,
        unreachable: actualHealth?.filter(h => h.status === 'unreachable').length || 0,
        redirected: actualHealth?.filter(h => h.status === 'redirected').length || 0,
        slow: actualHealth?.filter(h => h.status === 'slow').length || 0,
      };
      
      setCheckProgress({ current: 100, total: 100 });
      return { ...data, realCounts };
    },
    onSuccess: (data) => {
      const { realCounts } = data;
      const problemCount = (realCounts?.broken || 0) + (realCounts?.unreachable || 0);
      toast.success("Citation health check complete!", { 
        description: `Checked ${data.checked} citations. Found ${problemCount} broken links.` 
      });
      queryClient.invalidateQueries({ queryKey: ["citation-health"] });
      setCheckProgress({ current: 0, total: 0 });
      setIsRunningCheck(false);
    },
    onError: () => {
      setCheckProgress({ current: 0, total: 0 });
      setIsRunningCheck(false);
    }
  });

  const populateCitationTracking = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('populate-citation-tracking');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `✅ Citation tracking populated\n📚 ${data.articlesProcessed} articles\n🔗 ${data.citationsTracked} citations tracked`,
        { duration: 6000 }
      );
      queryClient.invalidateQueries({ queryKey: ["citation-health"] });
    },
    onError: (error) => {
      toast.error(`Failed to populate tracking: ${error.message}`);
    }
  });

  const batchFixBrokenCitations = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('batch-fix-broken-citations');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const results = data.results;
      toast.success(
        `🎉 Batch fix complete!\n` +
        `✅ Auto-applied: ${results.autoApplied}\n` +
        `📚 Articles updated: ${results.articlesUpdated}\n` +
        `🔗 Citations updated: ${results.citationsUpdated}\n` +
        `📋 Manual review: ${results.manualReview}\n` +
        `❌ Failed: ${results.failed}`,
        { duration: 10000 }
      );
      queryClient.invalidateQueries({ queryKey: ["citation-health"] });
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
      queryClient.invalidateQueries({ queryKey: ["approved-replacements"] });
      queryClient.invalidateQueries({ queryKey: ["applied-replacements"] });
    },
    onError: (error) => {
      toast.error(`Batch fix failed: ${error.message}`);
    }
  });

  const cleanupUnusedCitations = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('cleanup-unused-citations');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message, {
        description: `Removed ${data.orphaned_citations_removed} unused citations, ${data.replacement_suggestions_removed} orphaned replacements`,
        duration: 5000
      });
      queryClient.invalidateQueries({ queryKey: ["citation-health"] });
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
    },
    onError: (error) => {
      toast.error(`Cleanup failed: ${error.message}`);
    }
  });

  const approveReplacement = useMutation({
    mutationFn: async (replacementId: string) => {
      const { error } = await supabase.from("dead_link_replacements").update({ status: "approved" }).eq("id", replacementId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Replacement approved");
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
      queryClient.invalidateQueries({ queryKey: ["approved-replacements"] });
    },
  });

  const rejectReplacement = useMutation({
    mutationFn: async (replacementId: string) => {
      const { error } = await supabase.from("dead_link_replacements").update({ status: "rejected" }).eq("id", replacementId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Replacement rejected");
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
    },
  });

  const applyReplacement = useMutation({
    mutationFn: async (replacementIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("apply-citation-replacement", { body: { replacementIds, preview: false } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Replacements applied!", { description: `Updated ${data.articlesUpdated} articles` });
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements", "approved-replacements", "applied-replacements"] });
      setSelectedReplacements([]);
      setPreviewOpen(false);
    },
  });

  const getPreview = async (replacement: DeadLinkReplacement) => {
    try {
      const { data, error } = await supabase.functions.invoke("apply-citation-replacement", { body: { replacementIds: [replacement.id], preview: true } });
      if (error) throw error;
      setCurrentPreview({ replacement, affectedArticles: data.affectedArticles || [] });
      setPreviewOpen(true);
    } catch (error) {
      toast.error("Failed to generate preview");
    }
  };

  const handleBulkApply = async () => {
    if (selectedReplacements.length === 0) return;
    setBulkDialogOpen(true);
    setBulkProgress(0);
    try {
      const { data } = await supabase.functions.invoke("apply-citation-replacement", { body: { replacementIds: selectedReplacements, preview: false } });
      setBulkResults(data.results || []);
      setBulkProgress(100);
      queryClient.invalidateQueries({ queryKey: ["dead-link-replacements", "approved-replacements", "applied-replacements"] });
      setSelectedReplacements([]);
    } catch (error) {
      toast.error("Bulk application failed");
    }
  };

  const autoFixBrokenLinks = useMutation({
    mutationFn: async () => {
      // Get all broken/unreachable citations
      const { data: brokenLinks } = await supabase
        .from('external_citation_health')
        .select('url, source_name')
        .in('status', ['broken', 'unreachable']);
      
      if (!brokenLinks || brokenLinks.length === 0) {
        return { fixed: 0, needsReview: 0, message: 'No broken links found' };
      }

      // Find if there are already approved replacements for these URLs
      const { data: existingReplacements } = await supabase
        .from('dead_link_replacements')
        .select('*')
        .in('original_url', brokenLinks.map(l => l.url))
        .eq('status', 'approved')
        .gte('confidence_score', 85);
      
      if (!existingReplacements || existingReplacements.length === 0) {
        return { fixed: 0, needsReview: brokenLinks.length, message: 'Run health check first to find replacements' };
      }

      // Apply high-confidence replacements
      const { data } = await supabase.functions.invoke('apply-citation-replacement', {
        body: {
          replacementIds: existingReplacements.map(r => r.id),
          preview: false
        }
      });
      
      return { 
        fixed: existingReplacements.length, 
        needsReview: brokenLinks.length - existingReplacements.length,
        articlesUpdated: data?.articlesUpdated || 0
      };
    },
    onSuccess: (data) => {
      if (data.fixed === 0) {
        toast.info(data.message);
      } else {
        toast.success("Auto-fix complete!", {
          description: `Fixed ${data.fixed} citations in ${data.articlesUpdated} articles. ${data.needsReview > 0 ? `${data.needsReview} need manual review.` : ''}`
        });
        queryClient.invalidateQueries({ queryKey: ["citation-health", "dead-link-replacements", "approved-replacements"] });
      }
    },
    onError: () => {
      toast.error("Auto-fix failed");
    }
  });

  const handleFindReplacement = async (url: string) => {
    try {
      toast.info("Searching for replacement...", { duration: 2000 });
      
      // Find which article(s) use this citation
      // Fetch all articles and filter in JavaScript since JSONB array queries are complex
      const { data: allArticles } = await supabase
        .from('blog_articles')
        .select('id, headline, detailed_content, language, external_citations')
        .not('external_citations', 'is', null);
      
      if (!allArticles) {
        toast.error("Failed to fetch articles");
        return;
      }

      // Filter articles that contain this URL in their external_citations
      const articles = allArticles.filter(article => {
        const citations = article.external_citations as any[];
        return citations && citations.some((citation: any) => citation.url === url);
      });
      
      if (articles.length === 0) {
        toast.error("Citation not found in any article");
        return;
      }
      
      const article = articles[0];
      
      // Call discover-better-links with proper parameters
      const { data, error } = await supabase.functions.invoke('discover-better-links', {
        body: { 
          originalUrl: url,
          articleHeadline: article.headline,
          articleContent: article.detailed_content,
          articleLanguage: article.language,
          context: 'Citation replacement for broken link'
        }
      });
      
      if (error) throw error;
      
      // Save suggestions to dead_link_replacements table with auto-selection
      if (data?.suggestions && data.suggestions.length > 0) {
        // Calculate confidence scores and sort by highest first
        const scoredSuggestions = data.suggestions.map((s: any) => ({
          ...s,
          calculatedScore: Math.min(9.99, 
            parseFloat(((s.relevanceScore / 10) * 0.4 + s.authorityScore * 0.6).toFixed(2))
          )
        })).sort((a, b) => b.calculatedScore - a.calculatedScore);

        // Prepare replacements with auto-approval for best one if score >= 8.0
        const replacementsToInsert = scoredSuggestions.slice(0, 3).map((s: any, index: number) => ({
          original_url: url,
          original_source: 'Auto-detected broken link',
          replacement_url: s.suggestedUrl,
          replacement_source: s.sourceName,
          replacement_reason: s.reason,
          confidence_score: s.calculatedScore,
          // Auto-approve ONLY the best one IF score >= 8.0
          status: (index === 0 && s.calculatedScore >= 8.0) ? 'approved' : 'suggested',
          suggested_by: 'ai'
        }));
        
        const { error: insertError } = await supabase
          .from('dead_link_replacements')
          .insert(replacementsToInsert);
        
        if (insertError) throw insertError;
        
        // Get the ID of the inserted best replacement
        const { data: insertedReplacements, error: fetchError } = await supabase
          .from('dead_link_replacements')
          .select('id')
          .eq('original_url', url)
          .eq('replacement_url', replacementsToInsert[0].replacement_url)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        const bestScore = replacementsToInsert[0].confidence_score;
        const wasAutoApproved = replacementsToInsert[0].status === 'approved';

        // AUTO-APPLY if auto-approved
        if (wasAutoApproved && insertedReplacements && insertedReplacements.length > 0) {
          const replacementId = insertedReplacements[0].id;
          
          console.log(`🚀 Auto-applying replacement ${replacementId} with confidence ${bestScore}/10`);
          
          try {
            // Call apply-citation-replacement edge function
            const { data: applyResult, error: applyError } = await supabase.functions.invoke(
              'apply-citation-replacement',
              {
                body: {
                  replacementIds: [replacementId],
                  preview: false
                }
              }
            );

            if (applyError) throw applyError;

            if (applyResult?.success) {
              toast.success(
                `✅ Auto-applied replacement (score: ${bestScore}/10)\n` +
                `📚 Updated ${applyResult.articlesUpdated} article(s)\n` +
                `🔗 Updated ${applyResult.citationsUpdated} citation(s)\n` +
                `${data.suggestions.length > 1 ? `${data.suggestions.length - 1} alternatives saved for review` : ''}`,
                { duration: 6000 }
              );

              // Invalidate all relevant queries
              queryClient.invalidateQueries({ queryKey: ["citation-health"] });
              queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
              queryClient.invalidateQueries({ queryKey: ["approved-replacements"] });
              queryClient.invalidateQueries({ queryKey: ["applied-replacements"] });
            } else {
              // Application failed, but replacement is still approved for manual retry
              toast.warning(
                `⚠️ Auto-approved (score: ${bestScore}/10) but application failed\n` +
                `Check Approved tab to retry manually`,
                { duration: 5000 }
              );
            }
          } catch (applyError) {
            console.error('Auto-application error:', applyError);
            toast.warning(
              `⚠️ Auto-approved (score: ${bestScore}/10) but application failed\n` +
              `Error: ${(applyError as Error).message}\n` +
              `Check Approved tab to retry manually`,
              { duration: 5000 }
            );
          }
        } else if (wasAutoApproved) {
          // Auto-approved but couldn't fetch ID (edge case)
          toast.success(
            `✅ Auto-approved best replacement (score: ${bestScore}/10)\n` +
            `Check Approved tab to apply`,
            { duration: 4000 }
          );
        } else {
          // Not auto-approved, requires manual review
          toast.success(
            `Found ${data.suggestions.length} suggestions - Best score: ${bestScore}/10\n` +
            `⚠️ Manual review required (threshold: 8.0/10)`,
            { duration: 4000 }
          );
        }
        
        queryClient.invalidateQueries({ queryKey: ["dead-link-replacements"] });
        queryClient.invalidateQueries({ queryKey: ["approved-replacements"] });
      } else {
        toast.warning("No suitable replacements found");
      }
      
    } catch (error) {
      console.error('Replacement search error:', error);
      toast.error("Failed to find replacement: " + ((error as Error).message || 'Unknown error'));
    }
  };

  const stats = healthData?.reduce((acc, item) => {
    acc.total++;
    if (item.status === 'healthy') acc.healthy++;
    else if (item.status === 'broken' || item.status === 'unreachable') acc.broken++;
    else if (item.status === 'replaced') acc.replaced++;
    return acc;
  }, { total: 0, healthy: 0, broken: 0, replaced: 0 }) || { total: 0, healthy: 0, broken: 0, replaced: 0 };

  const healthPercentage = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;

  const getStatusBadge = (status: CitationHealth['status']) => {
    if (status === 'healthy') return <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Healthy</Badge>;
    if (status === 'broken') return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Broken</Badge>;
    if (status === 'replaced') return <Badge className="bg-purple-600"><ArrowRight className="mr-1 h-3 w-3" />Replaced</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (isLoading) return <AdminLayout><div className="container mx-auto p-6"><Loader2 className="h-8 w-8 animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Citation Health</h1>
            <p className="text-muted-foreground">Monitor external citations and manage replacements</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => populateCitationTracking.mutate()}
              disabled={populateCitationTracking.isPending}
              variant="outline"
              title="Sync citation tracking data for all articles"
            >
              {populateCitationTracking.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Sync Citation Tracking</>
              )}
            </Button>
            <Button 
              onClick={() => cleanupUnusedCitations.mutate()}
              disabled={cleanupUnusedCitations.isPending}
              variant="outline"
              title="Remove health monitoring for citations not used in any articles"
            >
              {cleanupUnusedCitations.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cleaning...</>
              ) : (
                <><XCircle className="mr-2 h-4 w-4" /> Clean Up Unused</>
              )}
            </Button>
            <Button 
              onClick={() => { setIsRunningCheck(true); runHealthCheck.mutateAsync().finally(() => setIsRunningCheck(false)); }} 
              disabled={isRunningCheck}
              variant="outline"
            >
              {isRunningCheck ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking...</> : <><RefreshCw className="mr-2 h-4 w-4" />Run Health Check</>}
            </Button>
            <Button 
              onClick={() => batchFixBrokenCitations.mutate()}
              disabled={batchFixBrokenCitations.isPending}
            >
              <Zap className="w-4 h-4 mr-2" />
              {batchFixBrokenCitations.isPending ? "Fixing..." : "Auto-Fix All Broken Links"}
            </Button>
          </div>
        </div>

        {isRunningCheck && checkProgress.total > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Checking citations...</span>
                  <span>{Math.round((checkProgress.current / checkProgress.total) * 100)}%</span>
                </div>
                <Progress value={(checkProgress.current / checkProgress.total) * 100} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-sm">Total Citations</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Health Score</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{healthPercentage}%</div><p className="text-xs text-muted-foreground mt-1">{stats.healthy} healthy citations</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Needs Attention</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.broken}</div><p className="text-xs text-muted-foreground mt-1">Broken or unreachable</p></CardContent></Card>
        </div>

        {healthData && healthData.length > 0 && (
          <CitationHealthAnalysis 
            healthData={healthData} 
            onFindReplacement={handleFindReplacement}
          />
        )}

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({replacements?.length || 0})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedReplacements?.length || 0})</TabsTrigger>
            <TabsTrigger value="applied">Applied ({appliedReplacements?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {replacements && replacements.length > 0 ? (
              <Card><CardContent className="pt-6 space-y-4">
                {replacements.map(r => (
                  <Card key={r.id}><CardContent className="pt-4 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">{r.confidence_score}/10</Badge>
                        <span className="text-xs text-muted-foreground">{r.replacement_source}</span>
                      </div>
                      <p className="text-sm text-red-600 truncate">{r.original_url}</p>
                      <p className="text-sm text-green-600 font-medium">→ {r.replacement_url}</p>
                      {r.replacement_reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.replacement_reason}</p>}
                    </div>
                    <div className="flex gap-2 ml-4"><Button size="sm" onClick={() => approveReplacement.mutate(r.id)}><ThumbsUp className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => rejectReplacement.mutate(r.id)}><ThumbsDown className="h-4 w-4" /></Button></div>
                  </CardContent></Card>
                ))}
              </CardContent></Card>
            ) : <Card><CardContent className="py-12 text-center text-muted-foreground">No pending replacements</CardContent></Card>}
          </TabsContent>

          <TabsContent value="approved">
            {approvedReplacements && approvedReplacements.length > 0 ? (
              <Card>
                <CardHeader><div className="flex justify-between"><CardTitle>Ready to Apply</CardTitle>{selectedReplacements.length > 0 && <Button onClick={handleBulkApply}><Play className="h-4 w-4 mr-2" />Apply ({selectedReplacements.length})</Button>}</div></CardHeader>
                <CardContent className="space-y-4">
                  {approvedReplacements.map(r => (
                    <Card key={r.id}><CardContent className="pt-4 flex gap-3 items-start">
                      <Checkbox checked={selectedReplacements.includes(r.id)} onCheckedChange={(c) => setSelectedReplacements(p => c ? [...p, r.id] : p.filter(i => i !== r.id))} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono">{r.confidence_score}/10</Badge>
                          {r.confidence_score >= 8.0 && <Badge className="bg-purple-600 hover:bg-purple-700">🤖 Auto-Approved</Badge>}
                          <span className="text-xs text-muted-foreground">{r.replacement_source}</span>
                        </div>
                        <p className="text-sm truncate">{r.original_url}</p>
                        <p className="text-sm text-green-600 font-medium">→ {r.replacement_url}</p>
                        {r.replacement_reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.replacement_reason}</p>}
                      </div>
                      <Button size="sm" onClick={() => getPreview(r)}><Play className="h-4 w-4 mr-1" />Apply</Button>
                    </CardContent></Card>
                  ))}
                </CardContent>
              </Card>
            ) : <Card><CardContent className="py-12 text-center text-muted-foreground">No approved replacements</CardContent></Card>}
          </TabsContent>

          <TabsContent value="applied">
            {appliedReplacements && appliedReplacements.length > 0 ? (
              <Card><CardContent className="pt-6 space-y-4">
                {appliedReplacements.map(r => (
                  <Card key={r.id}><CardContent className="pt-4">
                    <p className="text-sm truncate">{r.original_url}</p>
                    <p className="text-sm text-green-600">→ {r.replacement_url}</p>
                    <div className="flex gap-2 mt-2"><Badge variant="secondary">{r.applied_to_articles?.length || 0} articles</Badge><Badge variant="outline">{r.replacement_count || 0} replacements</Badge></div>
                  </CardContent></Card>
                ))}
              </CardContent></Card>
            ) : <Card><CardContent className="py-12 text-center text-muted-foreground">No applied replacements</CardContent></Card>}
          </TabsContent>
        </Tabs>

        {currentPreview && (
          <ChangePreviewModal
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            originalUrl={currentPreview.replacement.original_url}
            replacementUrl={currentPreview.replacement.replacement_url}
            confidenceScore={currentPreview.replacement.confidence_score}
            affectedArticles={currentPreview.affectedArticles}
            onConfirm={() => applyReplacement.mutate([currentPreview.replacement.id])}
            isApplying={applyReplacement.isPending}
          />
        )}

        <BulkReplacementDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          selectedCount={selectedReplacements.length}
          isProcessing={bulkProgress > 0 && bulkProgress < 100}
          progress={bulkProgress}
          results={bulkResults}
          onConfirm={handleBulkApply}
        />
      </div>
    </AdminLayout>
  );
};

export default CitationHealth;
