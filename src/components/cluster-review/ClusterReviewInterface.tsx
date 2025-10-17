import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogArticle, Language, FunnelStage } from "@/types/blog";
import { ArticleTab } from "./ArticleTab";
import { BulkActions } from "./BulkActions";
import { ArticleReviewCard } from "./ArticleReviewCard";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ClusterReviewInterfaceProps {
  articles: Partial<BlogArticle>[];
  clusterTopic: string;
  language: Language;
  onSaveAll: () => Promise<void>;
  onPublishAll: () => Promise<void>;
  onExport: () => void;
  onArticlesChange: (articles: Partial<BlogArticle>[]) => void;
}

export const ClusterReviewInterface = ({
  articles,
  clusterTopic,
  language,
  onSaveAll,
  onPublishAll,
  onExport,
  onArticlesChange,
}: ClusterReviewInterfaceProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [categoryWarnings, setCategoryWarnings] = useState<Record<number, boolean>>({});

  const currentArticle = articles[activeTab];

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

  const updateArticle = (index: number, updates: Partial<BlogArticle>) => {
    const newArticles = [...articles];
    newArticles[index] = { ...newArticles[index], ...updates };
    onArticlesChange(newArticles);
    
    // Revalidate after update
    setTimeout(() => validateCategories(), 100);
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

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-2xl font-bold mb-2">✅ Cluster Generated Successfully!</h2>
        <p className="text-muted-foreground">
          Review and edit each article before publishing. Topic: <span className="font-semibold">{clusterTopic}</span>
        </p>
      </div>

      {/* Category Warning Banner */}
      {categoryWarnings[activeTab] && categories && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
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
        </div>
      )}

      {/* Article Tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 border-b">
          {articles.map((article, index) => (
            <ArticleTab
              key={index}
              index={index}
              headline={article.headline || `Article ${index + 1}`}
              funnelStage={article.funnel_stage as FunnelStage || "TOFU"}
              isActive={activeTab === index}
              onClick={() => setActiveTab(index)}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Article Review Card */}
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
      />

      {/* Bulk Actions */}
      <BulkActions
        onPublishAll={onPublishAll}
        onSaveAllAsDrafts={onSaveAll}
        onExportCluster={onExport}
        articleCount={articles.length}
      />
    </div>
  );
};
