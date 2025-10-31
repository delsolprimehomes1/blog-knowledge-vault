import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, Loader2, CheckCircle2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface Replacement {
  id: string;
  original_url: string;
  replacement_url: string;
  original_source: string;
  replacement_source: string;
  confidence_score: number;
  status: string;
  applied_at: string;
  replacement_count: number;
  applied_to_articles: string[];
}

interface ArticleInfo {
  id: string;
  headline: string;
  slug: string;
  language: string;
  status: string;
}

export function ReplacementHistoryPanel() {
  const [selectedReplacement, setSelectedReplacement] = useState<Replacement | null>(null);
  const [articleDetails, setArticleDetails] = useState<ArticleInfo[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  const { data: replacements, isLoading } = useQuery({
    queryKey: ["replacement-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dead_link_replacements")
        .select("*")
        .eq("status", "applied")
        .not("applied_to_articles", "is", null)
        .order("applied_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Replacement[];
    },
  });

  const loadArticleDetails = async (replacement: Replacement) => {
    setSelectedReplacement(replacement);
    setLoadingArticles(true);

    try {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, headline, slug, language, status")
        .in("id", replacement.applied_to_articles);

      if (error) throw error;
      setArticleDetails(data as ArticleInfo[]);
    } catch (error) {
      console.error("Failed to load article details:", error);
      setArticleDetails([]);
    } finally {
      setLoadingArticles(false);
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

  if (!replacements || replacements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Replacement History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No citation replacements have been applied yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalReplacements = replacements.reduce((sum, r) => sum + (r.replacement_count || 0), 0);
  const averageConfidence = Math.round(
    replacements.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / replacements.length
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Replacement History</span>
            <div className="flex items-center gap-4 text-sm font-normal">
              <div className="text-muted-foreground">
                Total Replacements: <span className="font-semibold text-foreground">{totalReplacements}</span>
              </div>
              <div className="text-muted-foreground">
                Avg Confidence: <span className="font-semibold text-foreground">{averageConfidence}%</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Original URL</TableHead>
                <TableHead>Replacement URL</TableHead>
                <TableHead className="text-center">Articles Updated</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {replacements.map((replacement) => {
                const oldDomain = new URL(replacement.original_url).hostname.replace("www.", "");
                const newDomain = new URL(replacement.replacement_url).hostname.replace("www.", "");

                return (
                  <TableRow key={replacement.id}>
                    <TableCell className="max-w-xs">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">{oldDomain}</div>
                        <a
                          href={replacement.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                        >
                          <span className="truncate">{replacement.original_url}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="space-y-1">
                        <div className="text-xs text-green-600 font-medium">{newDomain}</div>
                        <a
                          href={replacement.replacement_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                        >
                          <span className="truncate">{replacement.replacement_url}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {replacement.replacement_count || replacement.applied_to_articles?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          (replacement.confidence_score || 0) >= 80
                            ? "default"
                            : (replacement.confidence_score || 0) >= 60
                            ? "secondary"
                            : "outline"
                        }
                        className={
                          (replacement.confidence_score || 0) >= 80
                            ? "bg-green-600"
                            : (replacement.confidence_score || 0) >= 60
                            ? "bg-orange-600"
                            : ""
                        }
                      >
                        {replacement.confidence_score || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {replacement.applied_at
                        ? formatDistanceToNow(new Date(replacement.applied_at), { addSuffix: true })
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadArticleDetails(replacement)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Articles
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Updated Articles</DialogTitle>
                            <DialogDescription>
                              Articles that received this citation replacement
                            </DialogDescription>
                          </DialogHeader>
                          {loadingArticles ? (
                            <div className="py-12 flex justify-center">
                              <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Original URL</div>
                                  <div className="text-sm font-medium break-all">
                                    {selectedReplacement?.original_url}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Replacement URL</div>
                                  <div className="text-sm font-medium break-all text-green-600">
                                    {selectedReplacement?.replacement_url}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="text-sm font-medium mb-2">
                                  {articleDetails.length} Article{articleDetails.length !== 1 ? "s" : ""} Updated
                                </div>
                                {articleDetails.map((article) => (
                                  <div
                                    key={article.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{article.headline}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground">/{article.slug}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {article.language}
                                        </Badge>
                                        <Badge
                                          variant={article.status === "published" ? "default" : "secondary"}
                                          className="text-xs"
                                        >
                                          {article.status}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(`/blog/${article.slug}`, "_blank")}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() =>
                                          window.open(`/admin/article-editor?id=${article.id}`, "_blank")
                                        }
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
