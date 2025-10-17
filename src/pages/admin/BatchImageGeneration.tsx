import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Image as ImageIcon, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ArticleWithoutImage {
  id: string;
  headline: string;
  category: string;
  funnel_stage: string;
  slug: string;
}

interface GenerationProgress {
  articleId: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

export default function BatchImageGeneration() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress[]>([]);

  const { data: articlesWithoutImages = [], isLoading } = useQuery({
    queryKey: ['articles-without-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, headline, category, funnel_stage, slug')
        .or('featured_image_url.is.null,featured_image_url.eq.')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ArticleWithoutImage[];
    },
  });

  const generateImageForArticle = async (article: ArticleWithoutImage): Promise<void> => {
    // Call generate-image function
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: { headline: article.headline }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const tempImageUrl = data.images[0].url;

    // Download image
    const imageResponse = await fetch(tempImageUrl);
    if (!imageResponse.ok) throw new Error('Failed to download image');

    const imageBlob = await imageResponse.blob();
    const fileName = `article-${article.id}.jpg`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('article-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('article-images')
      .getPublicUrl(fileName);

    // Update article with new image URL
    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({
        featured_image_url: publicUrlData.publicUrl,
        featured_image_alt: `${article.headline} - Costa del Sol real estate`,
      })
      .eq('id', article.id);

    if (updateError) throw updateError;
  };

  const handleGenerateAll = async () => {
    if (articlesWithoutImages.length === 0) return;

    setIsGenerating(true);
    const initialProgress = articlesWithoutImages.map(a => ({
      articleId: a.id,
      status: 'pending' as const,
    }));
    setProgress(initialProgress);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < articlesWithoutImages.length; i++) {
      const article = articlesWithoutImages[i];
      
      setProgress(prev => prev.map(p => 
        p.articleId === article.id 
          ? { ...p, status: 'generating' }
          : p
      ));

      try {
        await generateImageForArticle(article);
        successCount++;
        
        setProgress(prev => prev.map(p => 
          p.articleId === article.id 
            ? { ...p, status: 'success' }
            : p
        ));
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        setProgress(prev => prev.map(p => 
          p.articleId === article.id 
            ? { ...p, status: 'error', error: errorMessage }
            : p
        ));
      }

      // Small delay between requests to avoid rate limiting
      if (i < articlesWithoutImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsGenerating(false);
    
    toast({
      title: "Batch Generation Complete",
      description: `✅ ${successCount} successful, ❌ ${errorCount} failed`,
    });

    // Refresh the articles list
    queryClient.invalidateQueries({ queryKey: ['articles-without-images'] });
  };

  const getProgressPercentage = () => {
    if (progress.length === 0) return 0;
    const completed = progress.filter(p => p.status === 'success' || p.status === 'error').length;
    return (completed / progress.length) * 100;
  };

  const getStatusIcon = (status: GenerationProgress['status']) => {
    switch (status) {
      case 'pending':
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Batch Image Generation</h1>
          <p className="text-muted-foreground">
            Automatically generate AI-powered featured images for articles missing them
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ) : articlesWithoutImages.length === 0 ? (
          <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertDescription>
              <strong>All articles have featured images!</strong> No action needed.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Articles Without Images
                </CardTitle>
                <CardDescription>
                  Found {articlesWithoutImages.length} article{articlesWithoutImages.length !== 1 ? 's' : ''} missing featured images
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={handleGenerateAll}
                    disabled={isGenerating}
                    size="lg"
                    className="w-full"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    {isGenerating ? "Generating Images..." : `Generate All Missing Images (${articlesWithoutImages.length})`}
                  </Button>

                  {isGenerating && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{Math.round(getProgressPercentage())}%</span>
                      </div>
                      <Progress value={getProgressPercentage()} className="h-2" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Articles List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {articlesWithoutImages.map((article) => {
                    const articleProgress = progress.find(p => p.articleId === article.id);
                    
                    return (
                      <div
                        key={article.id}
                        className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="mt-1">
                          {articleProgress ? getStatusIcon(articleProgress.status) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm leading-tight mb-1">
                            {article.headline}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {article.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {article.funnel_stage}
                            </Badge>
                            {articleProgress?.error && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {articleProgress.error}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {articleProgress?.status === 'success' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/admin/articles/${article.id}/edit`, '_blank')}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
