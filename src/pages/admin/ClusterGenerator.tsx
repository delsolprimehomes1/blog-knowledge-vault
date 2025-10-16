import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClusterReviewInterface } from "@/components/cluster-review/ClusterReviewInterface";
import { BlogArticle } from "@/types/blog";

type Language = 'en' | 'es' | 'de' | 'nl' | 'fr' | 'pl' | 'sv' | 'da' | 'hu';

type StepStatus = 'pending' | 'running' | 'complete';

interface GenerationStep {
  id: string;
  name: string;
  message: string;
  status: StepStatus;
}

const languageOptions = [
  { value: 'en', label: '🇬🇧 English', name: 'English' },
  { value: 'es', label: '🇪🇸 Spanish', name: 'Spanish' },
  { value: 'de', label: '🇩🇪 German', name: 'German' },
  { value: 'nl', label: '🇳🇱 Dutch', name: 'Dutch' },
  { value: 'fr', label: '🇫🇷 French', name: 'French' },
  { value: 'pl', label: '🇵🇱 Polish', name: 'Polish' },
  { value: 'sv', label: '🇸🇪 Swedish', name: 'Swedish' },
  { value: 'da', label: '🇩🇰 Danish', name: 'Danish' },
  { value: 'hu', label: '🇭🇺 Hungarian', name: 'Hungarian' },
];

const STORAGE_KEY = 'cluster_generator_backup';

const ClusterGenerator = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [targetAudience, setTargetAudience] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  const [generatedArticles, setGeneratedArticles] = useState<Partial<BlogArticle>[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);

  // Check for saved backup on mount
  useEffect(() => {
    const backup = localStorage.getItem(STORAGE_KEY);
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        if (parsed.articles && parsed.articles.length > 0) {
          setHasBackup(true);
        }
      } catch (e) {
        console.error('Error parsing backup:', e);
      }
    }
  }, []);

  // Prevent navigation during generation
  useEffect(() => {
    if (!isGenerating) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Cluster generation in progress. Are you sure you want to leave?';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating]);

  const loadBackup = () => {
    const backup = localStorage.getItem(STORAGE_KEY);
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        setGeneratedArticles(parsed.articles);
        setTopic(parsed.topic);
        setLanguage(parsed.language);
        setShowReview(true);
        console.log('✅ Loaded backup:', parsed.articles.length, 'articles');
        toast.success(`Restored ${parsed.articles.length} articles from last generation`);
      } catch (e) {
        console.error('Error loading backup:', e);
        toast.error('Failed to load backup');
      }
    }
  };

  const clearBackup = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasBackup(false);
    toast.success('Backup cleared');
  };

  const handleGenerate = async () => {
    // Validation
    if (!topic.trim()) {
      toast.error("Please enter a cluster topic");
      return;
    }
    if (!targetAudience.trim()) {
      toast.error("Please enter a target audience");
      return;
    }
    if (!primaryKeyword.trim()) {
      toast.error("Please enter a primary keyword");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    
    // Initialize steps
    const initialSteps: GenerationStep[] = [
      { id: 'structure', name: 'Generating article structure', message: '3 TOFU, 2 MOFU, 1 BOFU', status: 'pending' },
      { id: 'tofu1', name: 'Creating TOFU Article 1', message: 'Generating content...', status: 'pending' },
      { id: 'tofu2', name: 'Creating TOFU Article 2', message: 'Generating content...', status: 'pending' },
      { id: 'tofu3', name: 'Creating TOFU Article 3', message: 'Generating content...', status: 'pending' },
      { id: 'mofu1', name: 'Creating MOFU Article 1', message: 'Generating content...', status: 'pending' },
      { id: 'mofu2', name: 'Creating MOFU Article 2', message: 'Generating content...', status: 'pending' },
      { id: 'bofu', name: 'Creating BOFU Article', message: 'Generating content...', status: 'pending' },
      { id: 'images', name: 'Generating images', message: 'Creating visuals for all articles', status: 'pending' },
      { id: 'internal', name: 'Finding internal links', message: 'Connecting articles across cluster', status: 'pending' },
      { id: 'external', name: 'Finding external sources', message: 'Researching authoritative citations', status: 'pending' },
      { id: 'linking', name: 'Linking funnel progression', message: 'Creating conversion pathways', status: 'pending' },
    ];
    
    setSteps(initialSteps);
    
    try {
      console.log('Calling generate-cluster edge function...');
      toast.info('Generating cluster... This may take 60-90 seconds.');
      
      const { data, error } = await supabase.functions.invoke('generate-cluster', {
        body: {
          topic,
          language,
          targetAudience,
          primaryKeyword
        }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate cluster');
      }
      
      if (!data?.success || !data?.articles) {
        throw new Error('Invalid response from cluster generator');
      }
      
      console.log('✅ Cluster generated successfully:', data.articles.length, 'articles');
      console.log('📄 Articles data:', data.articles);
      
      // Simulate progress through steps for visual feedback
      for (let i = 0; i < initialSteps.length; i++) {
        setSteps(prev => prev.map((step, idx) => 
          idx === i ? { ...step, status: 'running' } : step
        ));
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSteps(prev => prev.map((step, idx) => 
          idx === i ? { ...step, status: 'complete' } : step
        ));
        
        setProgress(((i + 1) / initialSteps.length) * 100);
      }
      
      // Save to localStorage as backup before showing review
      const backup = {
        articles: data.articles,
        topic,
        language,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
      console.log('💾 Saved backup to localStorage');
      
      // Store generated articles
      setGeneratedArticles(data.articles);
      console.log('🔄 Updated generatedArticles state with', data.articles.length, 'articles');
      
      toast.success(`Successfully generated ${data.articles.length} articles! Loading review interface...`);
      
      // Show review interface immediately (no delay)
      setShowReview(true);
      console.log('✨ Setting showReview to true');
      
    } catch (error) {
      console.error("Error generating cluster:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate cluster");
      setIsGenerating(false);
      setSteps([]);
      setProgress(0);
    }
  };

  const handleSaveAll = async () => {
    try {
      console.log('Saving', generatedArticles.length, 'articles to database...');
      
      // Insert articles first (without IDs in cta/related fields)
      const articlesToInsert = generatedArticles.map(a => {
        const { _temp_cta_slugs, _temp_related_slugs, _reviewed, ...article } = a as any;
        return {
          ...article,
          status: 'draft',
          cta_article_ids: [],
          related_article_ids: []
        };
      });
      
      const { data: insertedArticles, error: insertError } = await supabase
        .from('blog_articles')
        .insert(articlesToInsert)
        .select();
      
      if (insertError) throw insertError;
      
      console.log('Articles inserted, resolving links...');
      
      // Create slug-to-ID mapping
      const slugToId = new Map(insertedArticles.map(a => [a.slug, a.id]));
      
      // Update articles with resolved IDs
      const updates = insertedArticles.map((article, idx) => {
        const original = generatedArticles[idx] as any;
        return {
          id: article.id,
          cta_article_ids: (original._temp_cta_slugs || [])
            .map((slug: string) => slugToId.get(slug))
            .filter(Boolean),
          related_article_ids: (original._temp_related_slugs || [])
            .map((slug: string) => slugToId.get(slug))
            .filter(Boolean)
        };
      });
      
      // Bulk update
      for (const update of updates) {
        await supabase
          .from('blog_articles')
          .update({
            cta_article_ids: update.cta_article_ids,
            related_article_ids: update.related_article_ids
          })
          .eq('id', update.id);
      }
      
      toast.success('All articles saved as drafts!');
      
      // Navigate to articles page
      setTimeout(() => {
        navigate('/admin/articles');
      }, 1500);
      
    } catch (error) {
      console.error('Error saving articles:', error);
      toast.error('Failed to save articles');
    }
  };

  const handlePublishAll = async () => {
    try {
      console.log('Publishing', generatedArticles.length, 'articles...');
      
      // Same as save but with status: 'published' and date_published: now()
      const articlesToInsert = generatedArticles.map(a => {
        const { _temp_cta_slugs, _temp_related_slugs, _reviewed, ...article } = a as any;
        return {
          ...article,
          status: 'published',
          date_published: new Date().toISOString(),
          cta_article_ids: [],
          related_article_ids: []
        };
      });
      
      const { data: insertedArticles, error: insertError } = await supabase
        .from('blog_articles')
        .insert(articlesToInsert)
        .select();
      
      if (insertError) throw insertError;
      
      // Resolve links (same as above)
      const slugToId = new Map(insertedArticles.map(a => [a.slug, a.id]));
      
      const updates = insertedArticles.map((article, idx) => {
        const original = generatedArticles[idx] as any;
        return {
          id: article.id,
          cta_article_ids: (original._temp_cta_slugs || [])
            .map((slug: string) => slugToId.get(slug))
            .filter(Boolean),
          related_article_ids: (original._temp_related_slugs || [])
            .map((slug: string) => slugToId.get(slug))
            .filter(Boolean)
        };
      });
      
      for (const update of updates) {
        await supabase
          .from('blog_articles')
          .update({
            cta_article_ids: update.cta_article_ids,
            related_article_ids: update.related_article_ids
          })
          .eq('id', update.id);
      }
      
      toast.success('All articles published!');
      
      setTimeout(() => {
        navigate('/admin/articles');
      }, 1500);
      
    } catch (error) {
      console.error('Error publishing articles:', error);
      toast.error('Failed to publish articles');
    }
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(generatedArticles, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cluster-${topic.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Cluster exported!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export cluster');
    }
  };

  return (
    <AdminLayout>
      {showReview ? (
        <div className="container mx-auto py-8">
          <ClusterReviewInterface
            articles={generatedArticles}
            clusterTopic={topic}
            language={language}
            onSaveAll={handleSaveAll}
            onPublishAll={handlePublishAll}
            onExport={handleExport}
            onArticlesChange={setGeneratedArticles}
          />
        </div>
      ) : (
        <div className="container mx-auto py-8 max-w-4xl space-y-6">
          {/* Backup Restore Banner */}
          {hasBackup && !isGenerating && (
            <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      Resume Previous Generation
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      You have a saved cluster from your last session
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadBackup} variant="default" size="sm">
                      Load Backup
                    </Button>
                    <Button onClick={clearBackup} variant="outline" size="sm">
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {!isGenerating ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Sparkles className="h-8 w-8" />
                AI Content Cluster Generator
              </CardTitle>
              <CardDescription className="text-lg">
                Generate 6 interconnected articles with one click
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-base">
                  Cluster Topic <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="e.g., Buying property in Costa del Sol"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="text-base">
                  Language <span className="text-destructive">*</span>
                </Label>
                <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                  <SelectTrigger id="language" className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience" className="text-base">
                  Target Audience <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="targetAudience"
                  type="text"
                  placeholder="e.g., International buyers, retirees, investors"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryKeyword" className="text-base">
                  Primary Keyword <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="primaryKeyword"
                  type="text"
                  placeholder="e.g., Costa del Sol real estate"
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  className="text-base"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="lg"
                className="w-full text-base"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Complete Cluster (6 Articles)
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Loader2 className="h-6 w-6 animate-spin" />
                Generating Your Content Cluster...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              {/* Step-by-Step Status */}
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      step.status === 'complete' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : step.status === 'running'
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {step.status === 'complete' ? (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : step.status === 'running' ? (
                        <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{step.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {progress === 100 && (
                <div className="text-center pt-4">
                  <p className="text-green-600 dark:text-green-400 font-medium text-lg">
                    ✅ Generation complete! Loading review interface...
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {generatedArticles.length} articles ready for review
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      )}
    </AdminLayout>
  );
};

export default ClusterGenerator;
