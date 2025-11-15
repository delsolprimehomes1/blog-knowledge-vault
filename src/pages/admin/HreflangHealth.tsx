import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Globe } from 'lucide-react';

export default function HreflangHealth() {
  const { data: articles } = useQuery({
    queryKey: ['articles-hreflang-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_articles')
        .select('id, slug, headline, language, translations, status')
        .eq('status', 'published');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: languages } = useQuery({
    queryKey: ['site-languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_languages')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    }
  });

  const analysis = articles?.map(article => {
    const totalLanguages = languages?.length || 0;
    const hasTranslations = Object.keys(article.translations || {}).length;
    const totalVersions = hasTranslations + 1;
    const completeness = (totalVersions / totalLanguages) * 100;
    const missingLanguages = languages?.filter(lang => 
      lang.language_code !== article.language && 
      !article.translations?.[lang.language_code]
    ) || [];

    return {
      ...article,
      completeness,
      totalVersions,
      totalLanguages,
      missingLanguages,
      isComplete: missingLanguages.length === 0
    };
  }) || [];

  const completeArticles = analysis.filter(a => a.isComplete).length;
  const incompleteArticles = analysis.filter(a => !a.isComplete).length;
  const avgCompleteness = analysis.length > 0 
    ? analysis.reduce((sum, a) => sum + a.completeness, 0) / analysis.length 
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Hreflang Health Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor hreflang completeness across all published articles
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Complete Articles</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completeArticles}</div>
              <p className="text-xs text-muted-foreground">
                All languages linked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incomplete Articles</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{incompleteArticles}</div>
              <p className="text-xs text-muted-foreground">
                Missing translations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Completeness</CardTitle>
              <Globe className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgCompleteness.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Across {analysis.length} articles
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Article Hreflang Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.map(article => (
                <div key={article.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{article.headline}</div>
                    <div className="text-sm text-muted-foreground">
                      {article.slug} • {article.language}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {article.totalVersions} / {article.totalLanguages} languages
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {article.completeness.toFixed(0)}% complete
                      </div>
                    </div>
                    <Badge variant={article.isComplete ? 'default' : 'destructive'}>
                      {article.isComplete ? 'Complete' : `${article.missingLanguages.length} missing`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
