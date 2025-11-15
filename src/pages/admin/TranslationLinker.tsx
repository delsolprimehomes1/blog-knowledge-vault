import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link as LinkIcon, Check, X } from 'lucide-react';
import { useState } from 'react';

interface Article {
  id: string;
  slug: string;
  headline: string;
  language: string;
  category: string;
  funnel_stage: string;
  translations: Record<string, string>;
}

export default function TranslationLinker() {
  const queryClient = useQueryClient();
  const [selectedEn, setSelectedEn] = useState<string | null>(null);
  const [selectedNl, setSelectedNl] = useState<string | null>(null);

  // Fetch English articles
  const { data: enArticles = [] } = useQuery({
    queryKey: ['articles-en'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, language, category, funnel_stage, translations')
        .eq('status', 'published')
        .eq('language', 'en')
        .order('headline');
      
      if (error) throw error;
      return data as Article[];
    },
  });

  // Fetch Dutch articles
  const { data: nlArticles = [] } = useQuery({
    queryKey: ['articles-nl'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, language, category, funnel_stage, translations')
        .eq('status', 'published')
        .eq('language', 'nl')
        .order('headline');
      
      if (error) throw error;
      return data as Article[];
    },
  });

  // Link articles mutation
  const linkMutation = useMutation({
    mutationFn: async ({ enId, enSlug, nlId, nlSlug }: { enId: string; enSlug: string; nlId: string; nlSlug: string }) => {
      // Update English article with Dutch translation
      const { error: enError } = await supabase
        .from('blog_articles')
        .update({
          translations: { nl: nlSlug }
        })
        .eq('id', enId);

      if (enError) throw enError;

      // Update Dutch article with English translation
      const { error: nlError } = await supabase
        .from('blog_articles')
        .update({
          translations: { en: enSlug }
        })
        .eq('id', nlId);

      if (nlError) throw nlError;
    },
    onSuccess: () => {
      toast.success('Articles linked successfully!');
      queryClient.invalidateQueries({ queryKey: ['articles-en'] });
      queryClient.invalidateQueries({ queryKey: ['articles-nl'] });
      setSelectedEn(null);
      setSelectedNl(null);
    },
    onError: (error) => {
      toast.error('Failed to link articles: ' + error.message);
    },
  });

  // Unlink articles mutation
  const unlinkMutation = useMutation({
    mutationFn: async ({ enId, nlId }: { enId: string; nlId: string }) => {
      // Remove Dutch translation from English article
      const { error: enError } = await supabase
        .from('blog_articles')
        .update({
          translations: {}
        })
        .eq('id', enId);

      if (enError) throw enError;

      // Remove English translation from Dutch article
      const { error: nlError } = await supabase
        .from('blog_articles')
        .update({
          translations: {}
        })
        .eq('id', nlId);

      if (nlError) throw nlError;
    },
    onSuccess: () => {
      toast.success('Articles unlinked successfully!');
      queryClient.invalidateQueries({ queryKey: ['articles-en'] });
      queryClient.invalidateQueries({ queryKey: ['articles-nl'] });
    },
    onError: (error) => {
      toast.error('Failed to unlink articles: ' + error.message);
    },
  });

  const handleLink = () => {
    if (!selectedEn || !selectedNl) {
      toast.error('Please select both an English and Dutch article');
      return;
    }

    const enArticle = enArticles.find(a => a.id === selectedEn);
    const nlArticle = nlArticles.find(a => a.id === selectedNl);

    if (!enArticle || !nlArticle) return;

    linkMutation.mutate({
      enId: enArticle.id,
      enSlug: enArticle.slug,
      nlId: nlArticle.id,
      nlSlug: nlArticle.slug,
    });
  };

  const handleUnlink = (enId: string, nlId: string) => {
    unlinkMutation.mutate({ enId, nlId });
  };

  // Find linked pairs
  const linkedPairs = enArticles.filter(en => en.translations?.nl).map(en => {
    const nlSlug = en.translations.nl;
    const nlArticle = nlArticles.find(nl => nl.slug === nlSlug);
    return { en, nl: nlArticle };
  });

  const unlinkedEn = enArticles.filter(en => !en.translations?.nl);
  const unlinkedNl = nlArticles.filter(nl => !nl.translations?.en);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Translation Linker</h1>
          <p className="text-muted-foreground">
            Create bidirectional links between English and Dutch articles for proper hreflang implementation
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Linked Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{linkedPairs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Unlinked EN</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unlinkedEn.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Unlinked NL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unlinkedNl.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enArticles.length + nlArticles.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Existing Linked Pairs */}
        {linkedPairs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Existing Translation Pairs</CardTitle>
              <CardDescription>
                These articles are already linked bidirectionally
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {linkedPairs.map(({ en, nl }) => (
                <div key={en.id} className="flex items-start justify-between gap-4 p-3 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">EN</Badge>
                      <span className="font-medium">{en.headline}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">NL</Badge>
                      <span className="font-medium">{nl?.headline || 'Article not found'}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlink(en.id, nl?.id || '')}
                    disabled={unlinkMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Link New Pairs */}
        <Card>
          <CardHeader>
            <CardTitle>Link New Translation Pair</CardTitle>
            <CardDescription>
              Select one English and one Dutch article to link them together
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* English Articles */}
              <div className="space-y-3">
                <h3 className="font-semibold">English Articles ({unlinkedEn.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {unlinkedEn.map(article => (
                    <div
                      key={article.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedEn === article.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setSelectedEn(article.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm leading-tight">{article.headline}</p>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                            <Badge variant="outline" className="text-xs">{article.funnel_stage}</Badge>
                          </div>
                        </div>
                        {selectedEn === article.id && <Check className="h-5 w-5 text-primary shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dutch Articles */}
              <div className="space-y-3">
                <h3 className="font-semibold">Dutch Articles ({unlinkedNl.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {unlinkedNl.map(article => (
                    <div
                      key={article.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedNl === article.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setSelectedNl(article.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm leading-tight">{article.headline}</p>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                            <Badge variant="outline" className="text-xs">{article.funnel_stage}</Badge>
                          </div>
                        </div>
                        {selectedNl === article.id && <Check className="h-5 w-5 text-primary shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleLink}
                disabled={!selectedEn || !selectedNl || linkMutation.isPending}
                size="lg"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Link Selected Articles
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

