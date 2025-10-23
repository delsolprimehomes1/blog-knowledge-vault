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
  TrendingDown, TrendingUp, XCircle, Clock, ArrowRight, ThumbsUp, ThumbsDown, Play, Undo2
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChangePreviewModal } from "@/components/admin/ChangePreviewModal";
import { BulkReplacementDialog } from "@/components/admin/BulkReplacementDialog";

interface CitationHealth {
  id: string;
  url: string;
  source_name: string;
  last_checked_at: string;
  status: 'healthy' | 'broken' | 'redirected' | 'slow' | 'unreachable';
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
      const { data, error } = await supabase.from("dead_link_replacements").select("*").eq("status", "pending").order("confidence_score", { ascending: false });
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
      const { data, error } = await supabase.functions.invoke("check-citation-health");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Citation health check complete!", { description: `Checked ${data.checked} citations. Found ${data.broken} broken links.` });
      queryClient.invalidateQueries({ queryKey: ["citation-health"] });
    },
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

  const stats = healthData?.reduce((acc, item) => {
    acc.total++;
    if (item.status === 'healthy') acc.healthy++;
    else if (item.status === 'broken' || item.status === 'unreachable') acc.broken++;
    return acc;
  }, { total: 0, healthy: 0, broken: 0 }) || { total: 0, healthy: 0, broken: 0 };

  const healthPercentage = stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0;

  const getStatusBadge = (status: CitationHealth['status']) => {
    if (status === 'healthy') return <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Healthy</Badge>;
    if (status === 'broken') return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Broken</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (isLoading) return <AdminLayout><div className="container mx-auto p-6"><Loader2 className="h-8 w-8 animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Citation Health</h1>
            <p className="text-muted-foreground">Monitor external citations</p>
          </div>
          <Button onClick={() => { setIsRunningCheck(true); runHealthCheck.mutateAsync().finally(() => setIsRunningCheck(false)); }} disabled={isRunningCheck}>
            {isRunningCheck ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking...</> : <><RefreshCw className="mr-2 h-4 w-4" />Run Health Check</>}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Health Score</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{healthPercentage}%</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Broken</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.broken}</div></CardContent></Card>
        </div>

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
                  <Card key={r.id}><CardContent className="pt-4 flex justify-between">
                    <div><p className="text-sm text-red-600 truncate">{r.original_url}</p><p className="text-sm text-green-600">→ {r.replacement_url}</p></div>
                    <div className="flex gap-2"><Button size="sm" onClick={() => approveReplacement.mutate(r.id)}><ThumbsUp className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => rejectReplacement.mutate(r.id)}><ThumbsDown className="h-4 w-4" /></Button></div>
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
                    <Card key={r.id}><CardContent className="pt-4 flex gap-3">
                      <Checkbox checked={selectedReplacements.includes(r.id)} onCheckedChange={(c) => setSelectedReplacements(p => c ? [...p, r.id] : p.filter(i => i !== r.id))} />
                      <div className="flex-1"><p className="text-sm truncate">{r.original_url}</p><p className="text-sm text-green-600">→ {r.replacement_url}</p></div>
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
