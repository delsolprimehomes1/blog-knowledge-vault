import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogArticle, Language, FunnelStage } from "@/types/blog";
import { ArticleTab } from "./ArticleTab";
import { BulkActions } from "./BulkActions";
import { ArticleReviewCard } from "./ArticleReviewCard";
import { ValidationSummary } from "./ValidationSummary";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { validateAllArticles, LinkValidationResult } from "@/lib/linkValidation";

interface ClusterReviewInterfaceProps {
  articles: Partial<BlogArticle>[];
  clusterTopic: string;
  language: Language;
  onSaveAll: () => Promise<void>;
  onPublishAll: () => Promise<void>;
  onExport: () => void;
  onArticlesChange: (articles: Partial<BlogArticle>[]) => void;
  onStartNew?: () => void;
}

export const ClusterReviewInterface = ({
  articles,
  clusterTopic,
  language,
  onSaveAll,
  onPublishAll,
  onExport,
  onArticlesChange,
  onStartNew,
}: ClusterReviewInterfaceProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [categoryWarnings, setCategoryWarnings] = useState<Record<number, boolean>>({});
  const [isFixingCitations, setIsFixingCitations] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, LinkValidationResult>>(new Map());
  const [isFixingLinks, setIsFixingLinks] = useState(false);
  const [slugValidation, setSlugValidation] = useState<Map<string, boolean>>(new Map());
  const [slugChecking, setSlugChecking] = useState<Map<string, boolean>>(new Map());

  const currentArticle = articles[activeTab];

  // Ensure no background polling interferes with manual edits
  useEffect(() => {
    const savedJobId = localStorage.getItem('current_job_id');
    if (savedJobId) {
      console.log('⚠️ Clearing job ID to prevent polling while editing');
      localStorage.removeItem('current_job_id');
    }
  }, []);

  // Real-time slug checker with toast warnings
  const checkSlugAvailability = async (slug: string, silent = false) => {
    if (!slug) return true;
    
    setSlugChecking(prev => new Map(prev).set(slug, true));
    
    try {
      const { data } = await supabase
        .from('blog_articles')
        .select('slug, headline')
        .eq('slug', slug)
        .maybeSingle();
      
      const isAvailable = !data;
      setSlugValidation(prev => new Map(prev).set(slug, isAvailable));
      
      if (!isAvailable && data && !silent) {
        toast.warning(
          `⚠️ Slug "${slug}" already exists for article "${data.headline}". Please modify it or use Auto-Fix Slugs.`,
          { duration: 6000 }
        );
      } else if (isAvailable && !silent) {
        toast.success(`✅ Slug "${slug}" is unique and available!`, { duration: 3000 });
      }
      
      return isAvailable;
    } finally {
      setSlugChecking(prev => new Map(prev).set(slug, false));
    }
  };

  // Validate links whenever articles change
  useEffect(() => {
    const results = validateAllArticles(articles);
    setValidationResults(results);
  }, [articles]);

  // Initial slug validation on mount (silent)
  useEffect(() => {
    articles.forEach((article) => {
      if (article.slug) {
        checkSlugAvailability(article.slug, true);
      }
    });
  }, []); // Only run once on mount

  // Count articles needing citations
  const citationsNeeded = articles.reduce((count, article) => {
    const markerCount = (article.detailed_content?.match(/\[CITATION_NEEDED\]/g) || []).length;
    return count + markerCount;
  }, 0);

  // Count duplicate slugs
  const duplicateSlugsCount = Array.from(slugValidation.values()).filter(isAvailable => !isAvailable).length;

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch authors
  const { data: authors } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("authors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch published articles
  const { data: publishedArticles } = useQuery({
    queryKey: ["publishedArticles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, headline, category, funnel_stage")
        .eq("status", "published")
        .order("headline");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all articles for translations
  const { data: allArticles } = useQuery({
    queryKey: ["allArticles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, language")
        .order("headline");
      if (error) throw error;
      return data;
    },
  });

  // Validate categories whenever they change
  const validateCategories = () => {
    if (!categories) return;
    
    const warnings: Record<number, boolean> = {};
    const validCategoryNames = categories.map(c => c.name);
    
    articles.forEach((article, index) => {
      if (article.category && !validCategoryNames.includes(article.category)) {
        warnings[index] = true;
      }
    });
    
    setCategoryWarnings(warnings);
  };

  // Run validation when categories or articles change
  useState(() => {
    if (categories) {
      validateCategories();
    }
  });

  // Guard: If no articles or invalid activeTab, show loading state
  if (!articles || articles.length === 0 || !currentArticle) {
    return (
      <div className="flex items-center justify-center p-12 bg-card rounded-lg border">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">Loading articles...</p>
          <p className="text-sm text-muted-foreground">Please wait while the cluster generation completes.</p>
        </div>
      </div>
    );
  }

  const updateArticle = (index: number, updates: Partial<BlogArticle>) => {
    const oldSlug = articles[index]?.slug;
    const newSlug = updates.slug;
    
    // Clear old slug validation if slug changed
    if (newSlug && oldSlug && oldSlug !== newSlug) {
      setSlugValidation(prev => {
        const newMap = new Map(prev);
        newMap.delete(oldSlug);
        return newMap;
      });
    }
    
    const newArticles = [...articles];
    newArticles[index] = { ...newArticles[index], ...updates };
    onArticlesChange(newArticles);
    
    // Revalidate after update
    setTimeout(() => validateCategories(), 100);
    
    // Check slug if it was updated (only if it actually changed)
    if (newSlug && oldSlug !== newSlug) {
      checkSlugAvailability(newSlug);
    }
  };

  const handleRegenerateSection = async (section: string) => {
    try {
      setIsRegenerating(true);
      toast.info(`Regenerating ${section}...`);
      const { data, error } = await supabase.functions.invoke("regenerate-section", {
        body: {
          articleData: currentArticle,
          section,
          clusterTopic,
        },
      });

      if (error) throw error;

      updateArticle(activeTab, data.updates);
      toast.success(`${section} regenerated successfully!`);
    } catch (error) {
      console.error("Regeneration error:", error);
      toast.error(`Failed to regenerate ${section}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAcceptArticle = () => {
    updateArticle(activeTab, { _reviewed: true } as any);
    if (activeTab < articles.length - 1) {
      setActiveTab(activeTab + 1);
      toast.success("Article accepted! Moving to next article.");
    } else {
      toast.success("All articles reviewed! Ready to save or publish.");
    }
  };

  const handleFixAllCitations = async () => {
    setIsFixingCitations(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const markerCount = (article.detailed_content?.match(/\[CITATION_NEEDED\]/g) || []).length;
        
        if (markerCount > 0) {
          try {
            const { data, error } = await supabase.functions.invoke('replace-citation-markers', {
              body: {
                content: article.detailed_content,
                headline: article.headline,
                language: article.language || language,
                category: article.category
              }
            });

            if (error) throw error;

            if (data.success && data.replacedCount > 0) {
              updateArticle(i, { detailed_content: data.updatedContent });
              successCount += data.replacedCount;
            } else {
              failCount += markerCount;
            }
          } catch (error) {
            console.error(`Failed to fix citations for article ${i}:`, error);
            failCount += markerCount;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Fixed ${successCount} citation${successCount !== 1 ? 's' : ''} across all articles`);
      }
      if (failCount > 0) {
        toast.warning(`Could not find sources for ${failCount} citation${failCount !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error fixing citations:', error);
      toast.error('Failed to fix citations');
    } finally {
      setIsFixingCitations(false);
    }
  };

  // Auto-fix duplicate slugs
  const handleAutoFixDuplicateSlugs = async () => {
    try {
      toast.info('Checking and fixing duplicate slugs...');
      
      // Clear all validation states
      setSlugValidation(new Map());
      setSlugChecking(new Map());
      
      const timestamp = Date.now().toString().slice(-6);
      let fixedCount = 0;
      
      const fixedArticles = await Promise.all(
        articles.map(async (article, idx) => {
          if (!article.slug) return article;
          
          const { data } = await supabase
            .from('blog_articles')
            .select('slug')
            .eq('slug', article.slug)
            .maybeSingle();
          
          if (data) {
            // Slug exists, append suffix
            fixedCount++;
            return {
              ...article,
              slug: `${article.slug}-${timestamp}-${idx + 1}`
            };
          }
          return article;
        })
      );
      
      if (fixedCount > 0) {
        onArticlesChange(fixedArticles);
        
        // Re-validate all slugs silently after fixing
        setTimeout(() => {
          fixedArticles.forEach((article) => {
            if (article.slug) {
              checkSlugAvailability(article.slug, true);
            }
          });
        }, 500);
        
        toast.success(`✅ Auto-fixed ${fixedCount} duplicate slug${fixedCount !== 1 ? 's' : ''}!`);
      } else {
        toast.success('✅ No duplicate slugs found!');
      }
    } catch (error) {
      console.error('Error auto-fixing slugs:', error);
      toast.error('Failed to auto-fix slugs');
    }
  };

  const handleAutoFixLinks = async () => {
    setIsFixingLinks(true);
    let fixedArticlesCount = 0;

    try {
      toast.info('Auto-fixing links for all articles...');

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const validation = validationResults.get(article.slug!);
        
        if (!validation || validation.isValid) continue;

        console.log(`Fixing links for article ${i + 1}: ${article.headline}`);

        // Fix internal links if needed
        if (validation.missingInternalLinks) {
          try {
            const { data, error } = await supabase.functions.invoke('find-internal-links', {
              body: {
                content: article.detailed_content,
                headline: article.headline,
                language: article.language || language,
                funnelStage: article.funnel_stage,
                availableArticles: articles
                  .filter(a => a.slug !== article.slug)
                  .map(a => ({
                    id: a.id || '',
                    slug: a.slug,
                    headline: a.headline,
                    speakable_answer: a.speakable_answer,
                    category: a.category,
                    funnel_stage: a.funnel_stage,
                    language: a.language
                  }))
              }
            });

            if (error) {
              console.error(`Failed to find internal links for article ${i}:`, error);
            } else if (data.links && data.links.length > 0) {
              updateArticle(i, { internal_links: data.links });
              console.log(`✅ Added ${data.links.length} internal links to article ${i + 1}`);
            }
          } catch (error) {
            console.error(`Error fixing internal links for article ${i}:`, error);
          }
        }

        // Fix external citations if needed
        if (validation.missingExternalCitations) {
          try {
            toast.info(`Finding HIGH-AUTHORITY citations for "${article.headline}"...`);
            
            const { data, error } = await supabase.functions.invoke('find-external-links', {
              body: {
                content: article.detailed_content,
                headline: article.headline,
                language: article.language || language,
                funnelStage: article.funnel_stage || 'MOFU',
                requireGovernmentSource: true, // ✅ AGGRESSIVE: Prioritize government sources
                speakableContext: article.speakable_answer, // ✅ Use JSON-LD speakable for relevance
                minAuthorityScore: 70, // ✅ Only accept HIGH-tier citations (70+/100)
                focusArea: 'Costa del Sol real estate'
              }
            });

            if (error) {
              console.error(`Failed to find external links for article ${i}:`, error);
              toast.warning(`Could not auto-fix citations for "${article.headline}" - ${error.message || 'try manually clicking "Find Sources"'}`);
              continue;
            } else if (data?.citations && data.citations.length > 0) {
              // ✅ AGGRESSIVE FILTERING: Only keep HIGH authority citations (70+)
              const highAuthorityCitations = data.citations.filter((cit: any) => 
                cit.authorityScore >= 70 && // High tier only
                cit.verified !== false // Must be accessible
              );
              
              // Sort by authority score (highest first)
              highAuthorityCitations.sort((a: any, b: any) => b.authorityScore - a.authorityScore);
              
              // Take top citations based on funnel stage
              const targetCount = article.funnel_stage === 'BOFU' ? 6 : 5;
              const topCitations = highAuthorityCitations.slice(0, targetCount);
              
              if (topCitations.length === 0) {
                toast.warning(`No high-authority citations found for "${article.headline}" (needed score 70+)`);
                continue;
              }
              
              const existingCitations = article.external_citations || [];
              const newCitations = topCitations.filter((newCit: any) => 
                !existingCitations.some((existing: any) => existing.url === newCit.url)
              );
              const mergedCitations = [...existingCitations, ...newCitations];
              
              updateArticle(i, { external_citations: mergedCitations });
              
              const avgScore = Math.round(topCitations.reduce((sum: number, c: any) => sum + c.authorityScore, 0) / topCitations.length);
              console.log(`✅ Added ${newCitations.length} HIGH-AUTHORITY citations (avg score: ${avgScore}/100) to article ${i + 1}`);
              toast.success(`Added ${newCitations.length} HIGH-AUTHORITY citations to "${article.headline}" (avg: ${avgScore}/100)`, {
                duration: 4000
              });
              fixedArticlesCount++;
            } else {
              toast.warning(`No citations found for "${article.headline}"`);
            }
          } catch (error) {
            console.error(`Error fixing external citations for article ${i}:`, error);
            toast.warning(`Could not auto-fix citations for "${article.headline}" - unexpected error`);
            continue;
          }
        }

        fixedArticlesCount++;
      }

      if (fixedArticlesCount > 0) {
        toast.success(`Auto-fixed links for ${fixedArticlesCount} article${fixedArticlesCount !== 1 ? 's' : ''}!`);
      } else {
        toast.info('All articles already have sufficient links');
      }
    } catch (error) {
      console.error('Error auto-fixing links:', error);
      toast.error('Failed to auto-fix links');
    } finally {
      setIsFixingLinks(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">✅ Cluster Generated Successfully!</h2>
            <p className="text-muted-foreground">
              Review and edit each article before publishing. Topic: <span className="font-semibold">{clusterTopic}</span>
            </p>
          </div>
          {onStartNew && (
            <Button onClick={onStartNew} variant="outline" size="sm">
              Start New Cluster
            </Button>
          )}
        </div>
      </div>

      {/* Category Warning Banner */}
      {categoryWarnings[activeTab] && categories && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-1">Invalid Category</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The category "{currentArticle?.category}" doesn't exist in your database. 
                  Please select a valid category from the dropdown in the Basic Info section below.
                </p>
                <p className="text-xs text-muted-foreground">
                  Valid categories: {categories.map(c => c.name).join(', ')}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => {
                const categoryMap: Record<string, string> = {
                  'Buying Guide': 'Buying Guides',
                  'Investment Strategy': 'Investment Strategies',
                  'Legal & Regulation': 'Legal & Regulations',
                  'Location Insight': 'Location Insights',
                  'Market': 'Market Analysis',
                  'Property': 'Property Management',
                };
                
                const updatedArticles = articles.map(article => {
                  if (article.category && !categories?.find(c => c.name === article.category)) {
                    const fixedCategory = Object.entries(categoryMap).find(([invalid]) => 
                      article.category?.toLowerCase().includes(invalid.toLowerCase())
                    )?.[1];
                    
                    return {
                      ...article,
                      category: fixedCategory || categories?.[0]?.name || 'Buying Guides'
                    };
                  }
                  return article;
                });
                
                onArticlesChange(updatedArticles);
                toast.success('Categories fixed!');
              }} 
              variant="destructive" 
              size="sm"
            >
              Fix All Categories
            </Button>
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {validationResults.size > 0 && Array.from(validationResults.values()).some(r => !r.isValid) && (
        <ValidationSummary 
          validationResults={validationResults}
          onAutoFix={handleAutoFixLinks}
          isFixing={isFixingLinks}
        />
      )}

      {/* Article Tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 border-b">
          {articles.map((article, index) => {
            const markerCount = (article.detailed_content?.match(/\[CITATION_NEEDED\]/g) || []).length;
            return (
              <ArticleTab
                key={index}
                index={index}
                headline={article.headline || `Article ${index + 1}`}
                funnelStage={article.funnel_stage as FunnelStage || "TOFU"}
                isActive={activeTab === index}
                onClick={() => setActiveTab(index)}
                citationMarkersCount={markerCount}
                validation={article.slug ? validationResults.get(article.slug) : null}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Article Review Card */}
      {currentArticle.slug && !slugValidation.get(currentArticle.slug) && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">Duplicate Slug Detected</h3>
              <p className="text-sm text-muted-foreground">
                The slug "<code className="bg-muted px-1 py-0.5 rounded">{currentArticle.slug}</code>" already exists in the database. 
                Please edit it in the Basic Info section below to make it unique before saving.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <ArticleReviewCard
        article={currentArticle}
        allArticles={allArticles}
        categories={categories}
        authors={authors}
        publishedArticles={publishedArticles}
        onRegenerate={handleRegenerateSection}
        onEdit={(updates) => updateArticle(activeTab, updates)}
        onAccept={handleAcceptArticle}
        onRemoveCitation={(index) => {
          const newCitations = [...(currentArticle?.external_citations || [])];
          newCitations.splice(index, 1);
          updateArticle(activeTab, { external_citations: newCitations as any });
        }}
        onRemoveInternalLink={(index) => {
          const newLinks = [...(currentArticle?.internal_links || [])];
          newLinks.splice(index, 1);
          updateArticle(activeTab, { internal_links: newLinks as any });
        }}
        isRegenerating={isRegenerating}
        slugValidation={slugValidation}
        slugChecking={slugChecking}
      />

      {/* Bulk Actions */}
      <BulkActions
        onPublishAll={onPublishAll}
        onSaveAllAsDrafts={onSaveAll}
        onExportCluster={onExport}
        onFixAllCitations={citationsNeeded > 0 ? handleFixAllCitations : undefined}
        onAutoFixSlugs={duplicateSlugsCount > 0 ? handleAutoFixDuplicateSlugs : undefined}
        articleCount={articles.length}
        citationsNeeded={citationsNeeded}
        duplicateSlugsCount={duplicateSlugsCount}
      />
    </div>
  );
};
