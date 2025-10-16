import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogArticle, Language, FunnelStage, ArticleStatus, InternalLink, ExternalCitation, FAQEntity } from "@/types/blog";
import { ArticleTab } from "./ArticleTab";
import { RegenerateActions } from "./RegenerateActions";
import { BulkActions } from "./BulkActions";
import { BasicInfoSection } from "@/components/article-editor/BasicInfoSection";
import { SEOMetaSection } from "@/components/article-editor/SEOMetaSection";
import { ContentSection } from "@/components/article-editor/ContentSection";
import { MediaSection } from "@/components/article-editor/MediaSection";
import { EEATSection } from "@/components/article-editor/EEATSection";
import { ExternalCitationsSection } from "@/components/article-editor/ExternalCitationsSection";
import { InternalLinksSection } from "@/components/article-editor/InternalLinksSection";
import { RelatedArticlesSection } from "@/components/article-editor/RelatedArticlesSection";
import { FunnelCTASection } from "@/components/article-editor/FunnelCTASection";
import { FAQSection } from "@/components/article-editor/FAQSection";
import { TranslationsSection } from "@/components/article-editor/TranslationsSection";
import { uploadImage, countWords } from "@/lib/articleUtils";
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
  const [imageUploading, setImageUploading] = useState(false);

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

  const updateArticle = (index: number, updates: Partial<BlogArticle>) => {
    const newArticles = [...articles];
    newArticles[index] = { ...newArticles[index], ...updates };
    onArticlesChange(newArticles);
  };

  const handleImageUpload = async (file: File, setter: (url: string) => void) => {
    try {
      setImageUploading(true);
      const url = await uploadImage(file, supabase);
      setter(url);
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload image");
      console.error(error);
    } finally {
      setImageUploading(false);
    }
  };

  const handleRegenerateSection = async (section: string) => {
    try {
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
    }
  };

  const contentWords = countWords(currentArticle?.detailed_content?.replace(/<[^>]*>/g, ' ').trim() || "");

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-2xl font-bold mb-2">✅ Cluster Generated Successfully!</h2>
        <p className="text-muted-foreground">
          Review and edit each article before publishing. Topic: <span className="font-semibold">{clusterTopic}</span>
        </p>
      </div>

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

      {/* Regenerate Actions */}
      <RegenerateActions
        onRegenerateHeadline={() => handleRegenerateSection("headline")}
        onRegenerateSEO={() => handleRegenerateSection("seo")}
        onRegenerateImage={() => handleRegenerateSection("image")}
        onRegenerateContent={() => handleRegenerateSection("content")}
      />

      {/* Article Editor Sections */}
      <div className="space-y-6">
        <BasicInfoSection
          headline={currentArticle?.headline || ""}
          slug={currentArticle?.slug || ""}
          language={currentArticle?.language as Language || language}
          category={currentArticle?.category || ""}
          funnelStage={currentArticle?.funnel_stage as FunnelStage || "TOFU"}
          status={currentArticle?.status as ArticleStatus || "draft"}
          categories={categories}
          onHeadlineChange={(val) => updateArticle(activeTab, { headline: val })}
          onSlugChange={(val) => updateArticle(activeTab, { slug: val })}
          onLanguageChange={(val) => updateArticle(activeTab, { language: val })}
          onCategoryChange={(val) => updateArticle(activeTab, { category: val })}
          onFunnelStageChange={(val) => updateArticle(activeTab, { funnel_stage: val })}
          onStatusChange={(val) => updateArticle(activeTab, { status: val })}
        />

        <SEOMetaSection
          metaTitle={currentArticle?.meta_title || ""}
          metaDescription={currentArticle?.meta_description || ""}
          canonicalUrl={currentArticle?.canonical_url || ""}
          onMetaTitleChange={(val) => updateArticle(activeTab, { meta_title: val })}
          onMetaDescriptionChange={(val) => updateArticle(activeTab, { meta_description: val })}
          onCanonicalUrlChange={(val) => updateArticle(activeTab, { canonical_url: val })}
        />

        <ContentSection
          speakableAnswer={currentArticle?.speakable_answer || ""}
          detailedContent={currentArticle?.detailed_content || ""}
          onSpeakableAnswerChange={(val) => updateArticle(activeTab, { speakable_answer: val })}
          onDetailedContentChange={(val) => updateArticle(activeTab, { detailed_content: val })}
        />

        <MediaSection
          headline={currentArticle?.headline || ""}
          featuredImageUrl={currentArticle?.featured_image_url || ""}
          featuredImageAlt={currentArticle?.featured_image_alt || ""}
          featuredImageCaption={currentArticle?.featured_image_caption || ""}
          diagramMermaidCode={currentArticle?.diagram_url || ""}
          diagramDescription={currentArticle?.diagram_description || ""}
          detailedContent={currentArticle?.detailed_content || ""}
          onImageChange={(url, alt) => updateArticle(activeTab, { featured_image_url: url, featured_image_alt: alt })}
          onImageUpload={(file) => handleImageUpload(file, (url) => updateArticle(activeTab, { featured_image_url: url }))}
          onFeaturedImageCaptionChange={(val) => updateArticle(activeTab, { featured_image_caption: val })}
          onDiagramGenerated={(code, desc) => updateArticle(activeTab, { diagram_url: code, diagram_description: desc })}
          imageUploading={imageUploading}
        />

        <EEATSection
          authors={authors}
          authorId={currentArticle?.author_id || ""}
          reviewerId={currentArticle?.reviewer_id || ""}
          datePublished={currentArticle?.date_published || ""}
          dateModified={currentArticle?.date_modified || ""}
          readTime={Math.ceil(contentWords / 200)}
          onAuthorChange={(val) => updateArticle(activeTab, { author_id: val })}
          onReviewerChange={(val) => updateArticle(activeTab, { reviewer_id: val })}
          errors={{}}
        />

        <ExternalCitationsSection
          citations={(currentArticle?.external_citations as unknown as ExternalCitation[]) || []}
          onCitationsChange={(val) => updateArticle(activeTab, { external_citations: val as any })}
          articleContent={currentArticle?.detailed_content || ""}
          headline={currentArticle?.headline || ""}
          errors={{}}
        />

        <InternalLinksSection
          links={(currentArticle?.internal_links as unknown as InternalLink[]) || []}
          onLinksChange={(val) => updateArticle(activeTab, { internal_links: val as any })}
          articleContent={currentArticle?.detailed_content || ""}
          headline={currentArticle?.headline || ""}
          language={currentArticle?.language as Language || language}
        />

        <RelatedArticlesSection
          articles={publishedArticles}
          selectedIds={currentArticle?.related_article_ids || []}
          onSelectedIdsChange={(val) => updateArticle(activeTab, { related_article_ids: val })}
        />

        <FunnelCTASection
          funnelStage={currentArticle?.funnel_stage as FunnelStage || "TOFU"}
          articles={publishedArticles}
          selectedIds={currentArticle?.cta_article_ids || []}
          onSelectedIdsChange={(val) => updateArticle(activeTab, { cta_article_ids: val })}
        />

        <FAQSection
          faqEntities={(currentArticle?.faq_entities as unknown as FAQEntity[]) || []}
          onFaqEntitiesChange={(val) => updateArticle(activeTab, { faq_entities: val as any })}
        />

        <TranslationsSection
          currentLanguage={currentArticle?.language as Language || language}
          currentSlug={currentArticle?.slug || ""}
          translations={(currentArticle?.translations as Record<string, string>) || {}}
          articles={allArticles}
          onTranslationsChange={(val) => updateArticle(activeTab, { translations: val })}
          onCreateTranslation={(lang) => toast.info(`Creating ${lang} translation - coming soon`)}
          hasNoTranslations={Object.keys((currentArticle?.translations as Record<string, string>) || {}).length === 0}
          isPublished={currentArticle?.status === "published"}
        />
      </div>

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
