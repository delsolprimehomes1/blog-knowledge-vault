import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackArticleView } from "@/utils/analytics";
import { Helmet } from "react-helmet";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleHeader } from "@/components/blog-article/ArticleHeader";
import { SpeakableBox } from "@/components/blog-article/SpeakableBox";
import { TableOfContents } from "@/components/blog-article/TableOfContents";
import { ArticleContent } from "@/components/blog-article/ArticleContent";
import { InternalLinksSection } from "@/components/blog-article/InternalLinksSection";
import { RelatedArticles } from "@/components/blog-article/RelatedArticles";
import { TrustSignals } from "@/components/blog-article/TrustSignals";
import { LegalReferences } from "@/components/blog-article/LegalReferences";
import { AuthorBio } from "@/components/blog-article/AuthorBio";
import { FunnelCTA } from "@/components/blog-article/FunnelCTA";
import { StickyMobileCTA } from "@/components/blog-article/StickyMobileCTA";
import { FloatingCTA } from "@/components/blog-article/FloatingCTA";
import { BlogFooter } from "@/components/blog-article/BlogFooter";
import { CompanyContactSection } from "@/components/blog-article/CompanyContactSection";
import { FAQSection } from "@/components/blog-article/FAQSection";
import { generateAllSchemas } from "@/lib/schemaGenerator";
import { BlogArticle as BlogArticleType, Author, ExternalCitation, FunnelStage, InternalLink, FAQEntity } from "@/types/blog";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import { Navbar } from "@/components/Navbar";

const BlogArticle = () => {
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const { slug } = useParams<{ slug: string }>();

  // Track article view with GA4 when article data loads
  const trackArticleViewEffect = (article: any) => {
    if (article) {
      trackArticleView(
        article.id,
        article.headline,
        article.language || 'en',
        article.funnel_stage || 'TOFU'
      );
    }
  };

  // Check if article is already pre-rendered in static HTML
  const staticContent = document.querySelector('.static-content');
  const isStaticPrerendered = staticContent?.getAttribute('data-article-id');

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Article not found");

      // Remove static content once React takes over
      if (staticContent && data.id === isStaticPrerendered) {
        staticContent.classList.add('opacity-0');
        setTimeout(() => staticContent.remove(), 300);
      }

      return data as unknown as BlogArticleType;
    },
    enabled: !!slug,
  });

  const { data: author } = useQuery({
    queryKey: ["author", article?.author_id],
    queryFn: async () => {
      if (!article?.author_id) return null;
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .eq("id", article.author_id)
        .single();
      if (error) throw error;
      return data as Author;
    },
    enabled: !!article?.author_id,
  });

  const { data: reviewer } = useQuery({
    queryKey: ["reviewer", article?.reviewer_id],
    queryFn: async () => {
      if (!article?.reviewer_id) return null;
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .eq("id", article.reviewer_id)
        .single();
      if (error) throw error;
      return data as Author;
    },
    enabled: !!article?.reviewer_id,
  });

  const { data: relatedArticles } = useQuery({
    queryKey: ["relatedArticles", article?.related_article_ids],
    queryFn: async () => {
      if (!article?.related_article_ids || article.related_article_ids.length === 0) return [];
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, category, featured_image_url")
        .in("id", article.related_article_ids)
        .eq("status", "published");
      if (error) throw error;
      return data;
    },
    enabled: !!article?.related_article_ids,
  });

  const { data: ctaArticles } = useQuery({
    queryKey: ["ctaArticles", article?.cta_article_ids],
    queryFn: async () => {
      if (!article?.cta_article_ids || article.cta_article_ids.length === 0) return [];
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, headline, category, featured_image_url")
        .in("id", article.cta_article_ids)
        .eq("status", "published");
      if (error) throw error;
      return data;
    },
    enabled: !!article?.cta_article_ids,
  });

  // Track article view with GA4 when article data is available
  useEffect(() => {
    trackArticleViewEffect(article);
  }, [article]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-3xl font-bold mb-4">Error Loading Article</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Unable to load this article. Please try again."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} variant="default">
              Reload Page
            </Button>
            <Button onClick={() => window.history.back()} variant="outline">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground">The article you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const schemas = generateAllSchemas(article, author || null, reviewer || null);

  const baseUrl = window.location.origin;
  const currentUrl = `${baseUrl}/blog/${article.slug}`;

  // Generate hreflang URLs from translations
  const hreflangUrls = Object.entries(article.translations || {}).reduce((acc, [lang, slug]) => {
    acc[lang] = `${baseUrl}/blog/${slug}`;
    return acc;
  }, {} as Record<string, string>);

  // Language to hreflang mapping
  const langToHreflang: Record<string, string> = {
    en: 'en-GB',
    de: 'de-DE',
    nl: 'nl-NL',
    fr: 'fr-FR',
    pl: 'pl-PL',
    sv: 'sv-SE',
    da: 'da-DK',
    hu: 'hu-HU',
  };

  return (
    <>
      <Helmet>
        {/* Basic Meta Tags */}
        <title>{article.meta_title} | Del Sol Prime Homes</title>
        <meta name="description" content={article.meta_description} />
        <link rel="canonical" href={article.canonical_url || currentUrl} />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content={article.headline} />
        <meta property="og:description" content={article.meta_description} />
        <meta property="og:image" content={article.featured_image_url} />
        <meta property="og:image:alt" content={article.featured_image_alt} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="675" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        {article.date_published && (
          <meta property="article:published_time" content={article.date_published} />
        )}
        {article.date_modified && (
          <meta property="article:modified_time" content={article.date_modified} />
        )}
        {author && <meta property="article:author" content={author.name} />}
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.headline} />
        <meta name="twitter:description" content={article.meta_description} />
        <meta name="twitter:image" content={article.featured_image_url} />
        
        {/* Hreflang Tags */}
        {Object.entries(hreflangUrls).map(([lang, url]) => (
          <link key={lang} rel="alternate" hrefLang={langToHreflang[lang]} href={url} />
        ))}
        {hreflangUrls['en'] && (
          <link rel="alternate" hrefLang="x-default" href={hreflangUrls['en']} />
        )}
        
        {/* Additional Meta */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        {author && <meta name="author" content={author.name} />}
        <meta name="language" content={article.language} />
        
        {/* Inject JSON-LD schemas */}
        <script type="application/ld+json">{JSON.stringify(schemas.article)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.speakable)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.breadcrumb)}</script>
        {schemas.faq && <script type="application/ld+json">{JSON.stringify(schemas.faq)}</script>}
        <script type="application/ld+json">{JSON.stringify(schemas.organization)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.localBusiness)}</script>
      </Helmet>

      <Navbar />
      <div className="min-h-screen py-6 md:py-12 pt-16 md:pt-20">
        <div className="flex flex-col">
          {/* Mobile-first single column with max-width for readability */}
          <div className="max-w-4xl mx-auto w-full px-6 sm:px-6 space-y-8 md:space-y-16">
            <ArticleHeader
              article={article}
              author={author || null}
              reviewer={reviewer || null}
              translations={article.translations as Record<string, string>}
            />

            <ArticleContent
              content={article.detailed_content}
              featuredImageUrl={article.featured_image_url}
              featuredImageAlt={article.featured_image_alt}
              featuredImageCaption={article.featured_image_caption || undefined}
              diagramUrl={article.diagram_url || undefined}
              diagramAlt={article.diagram_alt || undefined}
              diagramCaption={article.diagram_caption || undefined}
              diagramDescription={article.diagram_description || undefined}
              externalCitations={article.external_citations as ExternalCitation[]}
              internalLinks={article.internal_links as InternalLink[]}
            />

            <SpeakableBox answer={article.speakable_answer} language={article.language} />

            <TableOfContents content={article.detailed_content} />

            <FAQSection faqEntities={article.faq_entities as FAQEntity[]} />

            <InternalLinksSection links={article.internal_links as InternalLink[]} />

            <TrustSignals
              reviewerName={reviewer?.name}
              dateModified={article.date_modified || undefined}
              citations={article.external_citations as ExternalCitation[]}
            />

            <LegalReferences citations={article.external_citations as ExternalCitation[]} />

            {author && <AuthorBio author={author} />}

            <CompanyContactSection />

            {relatedArticles && relatedArticles.length > 0 && (
              <RelatedArticles articles={relatedArticles} />
            )}

            <FunnelCTA
              funnelStage={article.funnel_stage as FunnelStage}
              ctaArticles={ctaArticles || []}
            />
          </div>
        </div>
      </div>

      {/* Company Footer */}
      <BlogFooter />

      {/* Floating Desktop CTA - TOFU/MOFU only */}
      <FloatingCTA 
        funnelStage={article.funnel_stage as FunnelStage} 
        articleSlug={article.slug}
      />

      {/* Sticky Mobile CTA Footer */}
      <StickyMobileCTA />
    </>
  );
};

export default BlogArticle;
