import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { AlertCircle, Upload, Save, Eye } from "lucide-react";
import { 
  generateSlug, 
  countWords, 
  getWordCountStatus, 
  getCharCountStatus,
  uploadImage 
} from "@/lib/articleUtils";
import { Language, FunnelStage, ArticleStatus, InternalLink, ExternalCitation, FAQEntity } from "@/types/blog";
import { EEATSection } from "@/components/article-editor/EEATSection";
import { ExternalCitationsSection } from "@/components/article-editor/ExternalCitationsSection";
import { InternalLinksSection } from "@/components/article-editor/InternalLinksSection";
import { RelatedArticlesSection } from "@/components/article-editor/RelatedArticlesSection";
import { FunnelCTASection } from "@/components/article-editor/FunnelCTASection";
import { FAQSection } from "@/components/article-editor/FAQSection";
import { TranslationsSection } from "@/components/article-editor/TranslationsSection";
import { SchemaPreviewSection } from "@/components/article-editor/SchemaPreviewSection";
import { SEOPreviewSection } from "@/components/article-editor/SEOPreviewSection";

const ArticleEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  // Form state
  const [headline, setHeadline] = useState("");
  const [slug, setSlug] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [category, setCategory] = useState("");
  const [funnelStage, setFunnelStage] = useState<FunnelStage>("TOFU");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  
  const [speakableAnswer, setSpeakableAnswer] = useState("");
  const [detailedContent, setDetailedContent] = useState("");
  
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredImageAlt, setFeaturedImageAlt] = useState("");
  const [featuredImageCaption, setFeaturedImageCaption] = useState("");
  const [diagramUrl, setDiagramUrl] = useState("");
  const [diagramDescription, setDiagramDescription] = useState("");
  
  const [authorId, setAuthorId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);
  const [externalCitations, setExternalCitations] = useState<ExternalCitation[]>([]);
  const [relatedArticleIds, setRelatedArticleIds] = useState<string[]>([]);
  const [ctaArticleIds, setCtaArticleIds] = useState<string[]>([]);
  const [faqEntities, setFaqEntities] = useState<FAQEntity[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const [imageUploading, setImageUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch authors
  const { data: authors } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch published articles for related articles and CTA
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

  // Fetch all articles for translation linking
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

  // Fetch article if editing
  const { data: article } = useQuery({
    queryKey: ["article", id],
    enabled: isEditing,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Load article data when editing
  useEffect(() => {
    if (article) {
      setHeadline(article.headline || "");
      setSlug(article.slug || "");
      setLanguage(article.language as Language);
      setCategory(article.category || "");
      setFunnelStage(article.funnel_stage as FunnelStage);
      setStatus(article.status as ArticleStatus);
      setMetaTitle(article.meta_title || "");
      setMetaDescription(article.meta_description || "");
      setCanonicalUrl(article.canonical_url || "");
      setSpeakableAnswer(article.speakable_answer || "");
      setDetailedContent(article.detailed_content || "");
      setFeaturedImageUrl(article.featured_image_url || "");
      setFeaturedImageAlt(article.featured_image_alt || "");
      setFeaturedImageCaption(article.featured_image_caption || "");
      setDiagramUrl(article.diagram_url || "");
      setDiagramDescription(article.diagram_description || "");
      setAuthorId(article.author_id || "");
      setReviewerId(article.reviewer_id || "");
      setInternalLinks((article.internal_links as unknown as InternalLink[]) || []);
      setExternalCitations((article.external_citations as unknown as ExternalCitation[]) || []);
      setRelatedArticleIds(article.related_article_ids || []);
      setCtaArticleIds(article.cta_article_ids || []);
      setFaqEntities((article.faq_entities as unknown as FAQEntity[]) || []);
      setTranslations((article.translations as Record<string, string>) || {});
    }
  }, [article]);

  // Auto-generate slug from headline
  useEffect(() => {
    if (headline && !isEditing) {
      setSlug(generateSlug(headline));
    }
  }, [headline, isEditing]);

  // Word/character counters
  const speakableWords = countWords(speakableAnswer);
  const speakableStatus = getWordCountStatus(speakableWords, 40, 60);
  const metaTitleStatus = getCharCountStatus(metaTitle.length, 60);
  const metaDescStatus = getCharCountStatus(metaDescription.length, 160);

  // Estimate word count from HTML
  const contentText = detailedContent.replace(/<[^>]*>/g, ' ').trim();
  const contentWords = countWords(contentText);
  const contentStatus = getWordCountStatus(contentWords, 1500, 2500);

  // Image upload handler
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

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!headline.trim()) newErrors.headline = "Headline is required";
    if (!slug.trim()) newErrors.slug = "Slug is required";
    if (!language) newErrors.language = "Language is required";
    if (!category) newErrors.category = "Category is required";
    if (!metaTitle.trim()) newErrors.metaTitle = "Meta title is required";
    if (metaTitle.length > 60) newErrors.metaTitle = "Meta title must be 60 characters or less";
    if (!metaDescription.trim()) newErrors.metaDescription = "Meta description is required";
    if (metaDescription.length > 160) newErrors.metaDescription = "Meta description must be 160 characters or less";
    if (!speakableAnswer.trim()) newErrors.speakableAnswer = "Speakable answer is required";
    if (!detailedContent.trim()) newErrors.detailedContent = "Detailed content is required";
    if (!featuredImageUrl.trim()) newErrors.featuredImageUrl = "Featured image is required";
    if (featuredImageUrl && !featuredImageAlt.trim()) newErrors.featuredImageAlt = "Alt text is required when image is provided";
    if (!authorId) newErrors.authorId = "Author is required";
    
    // External citations validation
    if (externalCitations.length < 2) {
      newErrors.externalCitations = "Minimum 2 citations required";
    } else if (externalCitations.length > 5) {
      newErrors.externalCitations = "Maximum 5 citations allowed";
    } else {
      const hasGovDomain = externalCitations.some(c => 
        c.url.includes('.gov') || c.url.includes('.gob.es')
      );
      if (!hasGovDomain) {
        newErrors.externalCitations = "At least one citation must be from a .gov or .gob.es domain";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (publishStatus: ArticleStatus) => {
      if (!validate()) throw new Error("Validation failed");

      const articleData = {
        headline,
        slug,
        language,
        category,
        funnel_stage: funnelStage,
        status: publishStatus,
        meta_title: metaTitle,
        meta_description: metaDescription,
        canonical_url: canonicalUrl || null,
        speakable_answer: speakableAnswer,
        detailed_content: detailedContent,
        featured_image_url: featuredImageUrl,
        featured_image_alt: featuredImageAlt,
        featured_image_caption: featuredImageCaption || null,
        diagram_url: diagramUrl || null,
        diagram_description: diagramDescription || null,
        author_id: authorId || null,
        reviewer_id: reviewerId || null,
        internal_links: internalLinks as any,
        external_citations: externalCitations as any,
        related_article_ids: relatedArticleIds,
        cta_article_ids: ctaArticleIds,
        faq_entities: faqEntities.length > 0 ? (faqEntities as any) : null,
        translations: translations,
        read_time: Math.ceil(contentWords / 200),
        date_modified: new Date().toISOString(),
        ...(publishStatus === 'published' && !article?.date_published ? { date_published: new Date().toISOString() } : {}),
      };

      if (isEditing) {
        const { error } = await supabase
          .from("blog_articles")
          .update(articleData)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blog_articles")
          .insert(articleData);
        if (error) throw error;
      }
    },
    onSuccess: (_, publishStatus) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      toast.success(publishStatus === 'published' ? "Article published!" : "Article saved as draft");
      navigate("/admin/articles");
    },
    onError: (error: any) => {
      if (error.message !== "Validation failed") {
        toast.error("Failed to save article");
        console.error(error);
      }
    },
  });

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? "Edit Article" : "Create New Article"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update your blog article" : "Write a new blog article"}
            </p>
          </div>
        </div>

        {/* Section 1: Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="headline">Headline *</Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="How to Buy Property in Costa del Sol?"
                className={errors.headline ? "border-red-500" : ""}
              />
              {errors.headline && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.headline}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="how-to-buy-property-costa-del-sol"
                className={errors.slug ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generated from headline. Lowercase and hyphens only.
              </p>
              {errors.slug && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.slug}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="language">Language *</Label>
                <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                  <SelectTrigger className={errors.language ? "border-red-500" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                    <SelectItem value="de">🇩🇪 German</SelectItem>
                    <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
                    <SelectItem value="fr">🇫🇷 French</SelectItem>
                    <SelectItem value="pl">🇵🇱 Polish</SelectItem>
                    <SelectItem value="sv">🇸🇪 Swedish</SelectItem>
                    <SelectItem value="da">🇩🇰 Danish</SelectItem>
                    <SelectItem value="hu">🇭🇺 Hungarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="funnelStage">Funnel Stage *</Label>
                <Select value={funnelStage} onValueChange={(val) => setFunnelStage(val as FunnelStage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOFU">TOFU - Top of Funnel (Awareness)</SelectItem>
                    <SelectItem value="MOFU">MOFU - Middle of Funnel (Consideration)</SelectItem>
                    <SelectItem value="BOFU">BOFU - Bottom of Funnel (Decision)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as ArticleStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: SEO Meta */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Meta Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="metaTitle">Meta Title *</Label>
              <Input
                id="metaTitle"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Compelling title for search results"
                className={errors.metaTitle ? "border-red-500" : ""}
              />
              <p className={`text-xs mt-1 ${metaTitleStatus.color}`}>
                {metaTitleStatus.message}
              </p>
              {errors.metaTitle && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.metaTitle}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="metaDescription">Meta Description *</Label>
              <Textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Brief description for search results"
                rows={3}
                className={errors.metaDescription ? "border-red-500" : ""}
              />
              <p className={`text-xs mt-1 ${metaDescStatus.color}`}>
                {metaDescStatus.message}
              </p>
              {errors.metaDescription && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.metaDescription}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="canonicalUrl">Canonical URL (Optional)</Label>
              <Input
                id="canonicalUrl"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="Leave blank for auto-generated"
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO Preview */}
        <SEOPreviewSection
          metaTitle={metaTitle}
          metaDescription={metaDescription}
          featuredImageUrl={featuredImageUrl}
          translations={translations}
        />

        {/* Section 3: Content */}
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="speakableAnswer">Speakable Answer (40-60 words optimal) *</Label>
              <Textarea
                id="speakableAnswer"
                value={speakableAnswer}
                onChange={(e) => setSpeakableAnswer(e.target.value)}
                placeholder="Write a conversational, action-oriented summary that voice assistants can read..."
                rows={4}
                className={errors.speakableAnswer ? "border-red-500" : ""}
              />
              <div className="flex items-center justify-between mt-1">
                <p className={`text-xs ${speakableStatus.color}`}>
                  {speakableWords} words - {speakableStatus.message}
                </p>
              </div>
              {errors.speakableAnswer && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.speakableAnswer}
                </p>
              )}
            </div>

            <div>
              <Label>Detailed Content (1500-2500 words target) *</Label>
              <RichTextEditor
                content={detailedContent}
                onChange={setDetailedContent}
                placeholder="Write your detailed article content here..."
              />
              <p className={`text-xs mt-1 ${contentStatus.color}`}>
                {contentWords} words - {contentStatus.message}
              </p>
              {errors.detailedContent && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.detailedContent}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Media */}
        <Card>
          <CardHeader>
            <CardTitle>Featured Image & Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="featuredImage">Featured Image *</Label>
              <div className="flex gap-2">
                <Input
                  id="featuredImage"
                  value={featuredImageUrl}
                  onChange={(e) => setFeaturedImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={errors.featuredImageUrl ? "border-red-500" : ""}
                />
                <label htmlFor="imageUpload">
                  <Button type="button" variant="outline" disabled={imageUploading} asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                </label>
                <input
                  id="imageUpload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, setFeaturedImageUrl);
                  }}
                />
              </div>
              {featuredImageUrl && (
                <img src={featuredImageUrl} alt="Preview" className="mt-2 h-32 object-cover rounded" />
              )}
              {errors.featuredImageUrl && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.featuredImageUrl}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="featuredImageAlt">Featured Image Alt Text *</Label>
              <Input
                id="featuredImageAlt"
                value={featuredImageAlt}
                onChange={(e) => setFeaturedImageAlt(e.target.value)}
                placeholder="Describe the image for accessibility"
                className={errors.featuredImageAlt ? "border-red-500" : ""}
              />
              {errors.featuredImageAlt && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.featuredImageAlt}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="featuredImageCaption">Featured Image Caption (Optional)</Label>
              <Input
                id="featuredImageCaption"
                value={featuredImageCaption}
                onChange={(e) => setFeaturedImageCaption(e.target.value)}
                placeholder="Optional caption for the image"
              />
            </div>

            <div>
              <Label htmlFor="diagramUrl">Diagram URL (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="diagramUrl"
                  value={diagramUrl}
                  onChange={(e) => setDiagramUrl(e.target.value)}
                  placeholder="https://example.com/diagram.jpg"
                />
                <label htmlFor="diagramUpload">
                  <Button type="button" variant="outline" disabled={imageUploading} asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                </label>
                <input
                  id="diagramUpload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, setDiagramUrl);
                  }}
                />
              </div>
              {diagramUrl && (
                <img src={diagramUrl} alt="Diagram preview" className="mt-2 h-32 object-cover rounded" />
              )}
            </div>

            <div>
              <Label htmlFor="diagramDescription">Diagram Description (Optional)</Label>
              <Textarea
                id="diagramDescription"
                value={diagramDescription}
                onChange={(e) => setDiagramDescription(e.target.value)}
                placeholder="Describe what the diagram shows"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: E-E-A-T Attribution */}
        <EEATSection
          authors={authors}
          authorId={authorId}
          reviewerId={reviewerId}
          datePublished={article?.date_published || ""}
          dateModified={article?.date_modified || ""}
          readTime={Math.ceil(contentWords / 200)}
          onAuthorChange={setAuthorId}
          onReviewerChange={setReviewerId}
          errors={errors}
        />

        {/* Section 6: External Citations */}
        <ExternalCitationsSection
          citations={externalCitations}
          onCitationsChange={setExternalCitations}
          errors={errors}
        />

        {/* Section 7: Internal Links */}
        <InternalLinksSection
          links={internalLinks}
          onLinksChange={setInternalLinks}
        />

        {/* Section 8: Related Articles */}
        <RelatedArticlesSection
          articles={publishedArticles}
          selectedIds={relatedArticleIds}
          onSelectedIdsChange={setRelatedArticleIds}
        />

        {/* Section 9: Funnel CTA Articles */}
        <FunnelCTASection
          funnelStage={funnelStage}
          articles={publishedArticles}
          selectedIds={ctaArticleIds}
          onSelectedIdsChange={setCtaArticleIds}
        />

        {/* Section 10: FAQ Entities */}
        <FAQSection
          faqEntities={faqEntities}
          onFaqEntitiesChange={setFaqEntities}
        />

        {/* Section 11: Translations */}
        <TranslationsSection
          currentLanguage={language}
          currentSlug={slug}
          translations={translations}
          articles={allArticles}
          onTranslationsChange={setTranslations}
          onCreateTranslation={(lang) => {
            toast.info(`Creating ${lang} translation - coming soon`);
          }}
          hasNoTranslations={Object.keys(translations).length === 0}
          isPublished={status === "published"}
        />

        {/* Section 12: JSON-LD Schema Preview */}
        <SchemaPreviewSection
          article={{
            slug,
            headline,
            meta_description: metaDescription,
            category,
            featured_image_url: featuredImageUrl,
            detailed_content: detailedContent,
            author_id: authorId,
            reviewer_id: reviewerId,
            date_published: article?.date_published || "",
            date_modified: article?.date_modified || "",
            faq_entities: faqEntities,
            external_citations: externalCitations,
            status,
          }}
          author={authors?.find(a => a.id === authorId) || null}
          reviewer={authors?.find(a => a.id === reviewerId) || null}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate('draft')}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => toast.info("Preview feature coming soon")}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={() => saveMutation.mutate('published')}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Publish Article
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ArticleEditor;
