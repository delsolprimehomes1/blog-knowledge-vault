import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import { ArticleHeader } from "@/components/blog-article/ArticleHeader";
import { SpeakableBox } from "@/components/blog-article/SpeakableBox";
import { TableOfContents } from "@/components/blog-article/TableOfContents";
import { ArticleContent } from "@/components/blog-article/ArticleContent";
import { RelatedArticles } from "@/components/blog-article/RelatedArticles";
import { TrustSignals } from "@/components/blog-article/TrustSignals";
import { AuthorBio } from "@/components/blog-article/AuthorBio";
import { FunnelCTA } from "@/components/blog-article/FunnelCTA";
import { generateAllSchemas, injectSchemas } from "@/lib/schemaGenerator";
import { BlogArticle as BlogArticleType, Author, ExternalCitation, FunnelStage } from "@/types/blog";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();
      if (error) throw error;
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
  const schemaScripts = injectSchemas(schemas);

  return (
    <>
      <Helmet>
        <title>{article.meta_title}</title>
        <meta name="description" content={article.meta_description} />
        {article.canonical_url && <link rel="canonical" href={article.canonical_url} />}
        {/* Inject JSON-LD schemas */}
        <script type="application/ld+json">{JSON.stringify(schemas.article)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.speakable)}</script>
        <script type="application/ld+json">{JSON.stringify(schemas.breadcrumb)}</script>
        {schemas.faq && <script type="application/ld+json">{JSON.stringify(schemas.faq)}</script>}
        <script type="application/ld+json">{JSON.stringify(schemas.organization)}</script>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-8">
            <div className="max-w-4xl">
              <ArticleHeader
                article={article}
                author={author || null}
                reviewer={reviewer || null}
                translations={article.translations as Record<string, string>}
              />

              <SpeakableBox answer={article.speakable_answer} />

              <TableOfContents content={article.detailed_content} />

              <ArticleContent
                content={article.detailed_content}
                featuredImageUrl={article.featured_image_url}
                featuredImageAlt={article.featured_image_alt}
                featuredImageCaption={article.featured_image_caption || undefined}
                diagramUrl={article.diagram_url || undefined}
                diagramDescription={article.diagram_description || undefined}
              />

              <TrustSignals
                reviewerName={reviewer?.name}
                dateModified={article.date_modified || undefined}
                citations={article.external_citations as ExternalCitation[]}
              />

              {author && <AuthorBio author={author} />}

              {relatedArticles && relatedArticles.length > 0 && (
                <RelatedArticles articles={relatedArticles} />
              )}

              <FunnelCTA
                funnelStage={article.funnel_stage as FunnelStage}
                ctaArticles={ctaArticles || []}
              />
            </div>

            <TableOfContents content={article.detailed_content} />
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogArticle;
