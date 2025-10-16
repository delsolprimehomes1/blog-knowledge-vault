import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogArticle } from "@/types/blog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export const ArticlesTable = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as unknown as BlogArticle[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blog Articles</CardTitle>
          <CardDescription>Loading articles...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'draft': return 'secondary';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  const getFunnelColor = (stage: string) => {
    switch (stage) {
      case 'TOFU': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'MOFU': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'BOFU': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blog Articles</CardTitle>
        <CardDescription>
          {articles?.length || 0} articles in your content library
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!articles || articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No articles yet</h3>
            <p className="text-sm text-muted-foreground">
              Your blog articles will appear here once you create them.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                      <h3 className="font-semibold text-lg flex-1">{article.headline}</h3>
                      <Badge variant={getStatusColor(article.status)} className="capitalize">
                        {article.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.speakable_answer}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {article.language.toUpperCase()}
                      </Badge>
                      <Badge className={`text-xs ${getFunnelColor(article.funnel_stage)}`}>
                        {article.funnel_stage}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {article.category}
                      </Badge>
                      {article.read_time && (
                        <Badge variant="outline" className="text-xs">
                          {article.read_time} min read
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Slug: <code className="text-primary">{article.slug}</code>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
