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
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number>(0);
  const [lastBackendUpdate, setLastBackendUpdate] = useState<Date | null>(null);

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

  // Auto-load most recent completed cluster on mount
  useEffect(() => {
    const checkForCompletedCluster = async () => {
      const { data, error } = await supabase
        .from('cluster_generations')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && data && data.articles) {
        console.log('✅ Found completed cluster:', data.id);
        setGeneratedArticles(data.articles as Partial<BlogArticle>[]);
        setTopic(data.topic);
        setLanguage(data.language as Language);
        setTargetAudience(data.target_audience);
        setPrimaryKeyword(data.primary_keyword);
        setShowReview(true);
        toast.success(`Loaded completed cluster: ${data.topic}`);
      }
    };
    
    // Only check if we don't have a job in progress
    const savedJobId = localStorage.getItem('current_job_id');
    if (!savedJobId && !showReview) {
      checkForCompletedCluster();
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
    localStorage.removeItem('current_job_id');
    setHasBackup(false);
    toast.success('Backup cleared');
  };

  // Check job status and update UI with timeout detection
  const checkJobStatus = async (currentJobId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-cluster-status', {
        body: { jobId: currentJobId }
      });

      if (error) throw error;

      console.log(`Job ${currentJobId} status:`, data.status, data.progress);

      // CLIENT-SIDE TIMEOUT DETECTION
      if (data.status === 'generating') {
        const lastUpdate = new Date(data.progress?.updated_at || Date.now());
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 1000 / 60;

        setLastBackendUpdate(lastUpdate);

        // If backend hasn't updated in 5 minutes, mark as timed out
        if (minutesSinceUpdate > 5) {
          console.error(`Job ${currentJobId} appears stuck. Last update: ${minutesSinceUpdate.toFixed(1)} minutes ago`);
          
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          setIsGenerating(false);
          setJobId(null);
          localStorage.removeItem('current_job_id');
          
          toast.error('Generation timed out. The backend may have crashed. Please try again.');
          return;
        }
      }

      // Update progress UI
      if (data.progress) {
        const progressPercent = (data.progress.current_step / data.progress.total_steps) * 100;
        setProgress(progressPercent);

        // Update steps based on current step
        setSteps(prev => prev.map((step, idx) => {
          if (idx < data.progress.current_step) return { ...step, status: 'complete' as StepStatus };
          if (idx === data.progress.current_step) return { ...step, status: 'running' as StepStatus };
          return step;
        }));
      }

      // Handle completion
      if (data.status === 'completed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        console.log('✅ Generation complete! Articles:', data.articles);
        setGeneratedArticles(data.articles);
        setShowReview(true);
        setIsGenerating(false);
        setGenerationStartTime(0);
        
        // Clear job ID from storage
        localStorage.removeItem('current_job_id');
        setJobId(null);
        
        toast.success(`Successfully generated ${data.articles.length} articles!`);
      }

      // Handle failure
      if (data.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        setIsGenerating(false);
        setGenerationStartTime(0);
        localStorage.removeItem('current_job_id');
        setJobId(null);
        
        toast.error(data.error || 'Generation failed');
      }

    } catch (error) {
      console.error('Error checking job status:', error);
      // Don't stop polling on errors - might be temporary
    }
  };

  // Handle aborting generation
  const handleAbortGeneration = async () => {
    if (!jobId) return;

    try {
      // Update job status to failed
      await supabase
        .from('cluster_generations')
        .update({
          status: 'failed',
          error: 'Manually aborted by user',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }

      setIsGenerating(false);
      setGenerationStartTime(0);
      setJobId(null);
      localStorage.removeItem('current_job_id');

      toast.success('Generation aborted');
    } catch (error) {
      console.error('Error aborting generation:', error);
      toast.error('Failed to abort generation');
    }
  };

  // Auto-resume polling if page refreshed during generation
  useEffect(() => {
    const savedJobId = localStorage.getItem('current_job_id');
    if (savedJobId && !isGenerating && !jobId) {
      console.log('Resuming generation for job:', savedJobId);
      setJobId(savedJobId);
      setIsGenerating(true);
      setGenerationStartTime(Date.now());
      toast.info('Resuming generation...');
      
      // Smart polling: 3s for first 2 min, then 10s
      let pollCount = 0;
      const poll = () => {
        pollCount++;
        checkJobStatus(savedJobId);
      };
      
      const interval = setInterval(poll, 3000);
      setPollingInterval(interval);
      
      // After 2 minutes, switch to slower polling
      setTimeout(() => {
        if (pollingInterval) clearInterval(pollingInterval);
        const slowInterval = setInterval(poll, 10000);
        setPollingInterval(slowInterval);
      }, 120000); // 2 minutes
    }
  }, []);

  // Save jobId to localStorage when set
  useEffect(() => {
    if (jobId) {
      localStorage.setItem('current_job_id', jobId);
    } else {
      localStorage.removeItem('current_job_id');
    }
  }, [jobId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

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
    setGenerationStartTime(Date.now());
    setLastBackendUpdate(new Date());
    
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
      console.log('Starting cluster generation...');
      toast.info('Starting generation... This will take 3-5 minutes. Feel free to leave this page - we\'ll save your progress!');
      
      // Step 1: Start generation (returns immediately with job ID)
      const { data, error } = await supabase.functions.invoke('generate-cluster', {
        body: { topic, language, targetAudience, primaryKeyword }
      });

      if (error) {
        console.error('Error starting generation:', error);
        throw new Error(error.message || 'Failed to start generation');
      }
      
      if (!data?.success || !data?.jobId) {
        throw new Error('Invalid response from cluster generator');
      }

      const newJobId = data.jobId;
      setJobId(newJobId);
      console.log('✅ Generation started with job ID:', newJobId);

      toast.success('Generation started! Tracking progress...');

      // Step 2: Start smart polling - fast at first, then slower
      let pollCount = 0;
      const poll = () => {
        pollCount++;
        checkJobStatus(newJobId);
      };

      // Start with fast polling (3 seconds)
      const interval = setInterval(poll, 3000);
      setPollingInterval(interval);

      // After 2 minutes, switch to slower polling (10 seconds)
      setTimeout(() => {
        if (pollingInterval) clearInterval(pollingInterval);
        const slowInterval = setInterval(poll, 10000);
        setPollingInterval(slowInterval);
      }, 120000); // 2 minutes

      // Initial status check
      checkJobStatus(newJobId);
      
    } catch (error) {
      console.error("Error generating cluster:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start generation");
      setIsGenerating(false);
      setGenerationStartTime(0);
      setSteps([]);
      setProgress(0);
    }
  };

  const handleSaveAll = async () => {
    try {
      console.log('Saving', generatedArticles.length, 'articles to database...');
      
      // Step 1: Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('You must be logged in to save articles');
        return;
      }
      
      // Step 2: Validate author IDs
      const articlesWithInvalidAuthors = generatedArticles.filter(a => !a.author_id);
      if (articlesWithInvalidAuthors.length > 0) {
        console.warn(`Found ${articlesWithInvalidAuthors.length} articles with missing author_id`);
        
        // Fetch default author
        const { data: defaultAuthor } = await supabase
          .from('authors')
          .select('id')
          .limit(1)
          .single();
        
        if (!defaultAuthor) {
          toast.error('No authors found in database. Please create an author first.');
          return;
        }
        
        // Assign default author to articles without one
        articlesWithInvalidAuthors.forEach(article => {
          article.author_id = defaultAuthor.id;
        });
      }
      
      // Step 3: Insert articles first (without IDs in cta/related fields)
      const articlesToInsert = generatedArticles.map(a => {
        const { _temp_cta_slugs, _temp_related_slugs, _reviewed, ...article } = a as any;
        return {
          ...article,
          status: 'draft',
          last_edited_by: user.id,
          cta_article_ids: [],
          related_article_ids: []
        };
      });
      
      const { data: insertedArticles, error: insertError } = await supabase
        .from('blog_articles')
        .insert(articlesToInsert)
        .select();
      
      if (insertError) {
        console.error('Insert error:', insertError);
        
        // Provide specific error messages
        if (insertError.message.includes('foreign key')) {
          toast.error('Database constraint error. Check author IDs and categories.');
        } else if (insertError.message.includes('duplicate')) {
          toast.error('Some articles already exist. Try different slugs.');
        } else if (insertError.message.includes('violates')) {
          toast.error('Permission denied. Check your user role.');
        } else {
          toast.error(`Failed to insert articles: ${insertError.message}`);
        }
        throw insertError;
      }
      
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
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            cta_article_ids: update.cta_article_ids,
            related_article_ids: update.related_article_ids
          })
          .eq('id', update.id);
        
        if (updateError) {
          console.error(`Error updating article ${update.id}:`, updateError);
        }
      }
      
      toast.success('All articles saved as drafts!');
      
      // Navigate to articles page
      setTimeout(() => {
        navigate('/admin/articles');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error saving articles:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Error already handled above, but catch any unexpected errors
      if (!error.message?.includes('foreign key') && 
          !error.message?.includes('duplicate') &&
          !error.message?.includes('violates')) {
        toast.error(`Unexpected error: ${error.message || 'Failed to save articles'}`);
      }
    }
  };

  const handlePublishAll = async () => {
    try {
      console.log('Publishing', generatedArticles.length, 'articles...');
      
      // Step 1: Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('You must be logged in to publish articles');
        return;
      }
      
      // Step 2: Validate author IDs
      const articlesWithInvalidAuthors = generatedArticles.filter(a => !a.author_id);
      if (articlesWithInvalidAuthors.length > 0) {
        console.warn(`Found ${articlesWithInvalidAuthors.length} articles with missing author_id`);
        
        // Fetch default author
        const { data: defaultAuthor } = await supabase
          .from('authors')
          .select('id')
          .limit(1)
          .single();
        
        if (!defaultAuthor) {
          toast.error('No authors found in database. Please create an author first.');
          return;
        }
        
        // Assign default author to articles without one
        articlesWithInvalidAuthors.forEach(article => {
          article.author_id = defaultAuthor.id;
        });
      }
      
      // Step 3: Prepare articles for insert
      const articlesToInsert = generatedArticles.map(a => {
        const { _temp_cta_slugs, _temp_related_slugs, _reviewed, ...article } = a as any;
        return {
          ...article,
          status: 'published',
          date_published: new Date().toISOString(),
          published_by: user.id,
          last_edited_by: user.id,
          cta_article_ids: [],
          related_article_ids: []
        };
      });
      
      // Step 4: Insert articles
      console.log('Inserting articles...', articlesToInsert.length);
      const { data: insertedArticles, error: insertError } = await supabase
        .from('blog_articles')
        .insert(articlesToInsert)
        .select();
      
      if (insertError) {
        console.error('Insert error:', insertError);
        
        // Provide specific error messages
        if (insertError.message.includes('foreign key')) {
          toast.error('Database constraint error. Check author IDs and categories.');
        } else if (insertError.message.includes('duplicate')) {
          toast.error('Some articles already exist. Try different slugs.');
        } else if (insertError.message.includes('violates')) {
          toast.error('Permission denied. Check your user role.');
        } else {
          toast.error(`Failed to insert articles: ${insertError.message}`);
        }
        throw insertError;
      }
      
      console.log('Articles inserted, resolving links...');
      
      // Step 5: Resolve internal links
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
      
      // Step 6: Update with resolved IDs
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('blog_articles')
          .update({
            cta_article_ids: update.cta_article_ids,
            related_article_ids: update.related_article_ids
          })
          .eq('id', update.id);
        
        if (updateError) {
          console.error(`Error updating article ${update.id}:`, updateError);
        }
      }
      
      toast.success('All articles published successfully!');
      
      setTimeout(() => {
        navigate('/admin/articles');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error publishing articles:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Error already handled above, but catch any unexpected errors
      if (!error.message?.includes('foreign key') && 
          !error.message?.includes('duplicate') &&
          !error.message?.includes('violates')) {
        toast.error(`Unexpected error: ${error.message || 'Failed to publish articles'}`);
      }
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

  const handleStartNew = () => {
    setGeneratedArticles([]);
    setShowReview(false);
    setTopic('');
    setLanguage('en');
    setTargetAudience('');
    setPrimaryKeyword('');
    setJobId(null);
    localStorage.removeItem('current_job_id');
    toast.success('Ready to generate a new cluster!');
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
            onStartNew={handleStartNew}
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

              {/* Abort Button and Elapsed Time */}
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Generation in progress...
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Elapsed time: {generationStartTime > 0 ? Math.floor((Date.now() - generationStartTime) / 1000 / 60) : 0} minutes
                    {lastBackendUpdate && (
                      <span className="ml-2">
                        (Last update: {Math.floor((Date.now() - lastBackendUpdate.getTime()) / 1000)}s ago)
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleAbortGeneration}
                >
                  Abort Generation
                </Button>
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
