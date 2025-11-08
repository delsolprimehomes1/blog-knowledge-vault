import { useEffect, useRef } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { MermaidPreview } from "@/components/MermaidPreview";
import { ExternalCitation, InternalLink } from "@/types/blog";
import { injectExternalLinks, injectInternalLinks, injectInlineCitations, injectClusterLinksBlock } from "@/lib/linkInjection";
import { ClusterLinksBlock } from "./ClusterLinksBlock";
import { MidClusterCTA } from "@/components/blog/MidClusterCTA";
import { marked } from 'marked';
import { transformImage, getResponsiveSrcSet, getResponsiveSizes } from "@/lib/imageTransform";

interface RelatedClusterArticle {
  id: string;
  slug: string;
  headline: string;
  stage: "TOFU" | "MOFU" | "BOFU";
  featured_image_url?: string;
}

interface ArticleContentProps {
  content: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  featuredImageCaption?: string;
  diagramUrl?: string;
  diagramAlt?: string;
  diagramCaption?: string;
  diagramDescription?: string;
  externalCitations?: ExternalCitation[];
  internalLinks?: InternalLink[];
  clusterLinks?: InternalLink[];
  relatedClusterArticles?: RelatedClusterArticle[];
  funnelStage?: "TOFU" | "MOFU" | "BOFU";
  articleId?: string;
}

export const ArticleContent = ({
  content,
  featuredImageUrl,
  featuredImageAlt,
  featuredImageCaption,
  diagramUrl,
  diagramAlt,
  diagramCaption,
  diagramDescription,
  externalCitations = [],
  internalLinks = [],
  clusterLinks = [],
  relatedClusterArticles = [],
  funnelStage = "TOFU",
  articleId = "",
}: ArticleContentProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Sanitize content to remove HTML document wrapper
  const sanitizeContent = (htmlContent: string): string => {
    // Check if content contains full HTML document structure
    if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')) {
      // Extract only the body content
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch && bodyMatch[1]) {
        return bodyMatch[1].trim();
      }
      
      // Fallback: remove document structure tags
      return htmlContent
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?html[^>]*>/gi, '')
        .replace(/<head[\s\S]*?<\/head>/gi, '')
        .replace(/<\/?body[^>]*>/gi, '')
        .trim();
    }
    
    return htmlContent;
  };

  // Inject MidClusterCTA before 2nd H2 heading
  const injectMidCTA = (htmlContent: string): string => {
    if (!relatedClusterArticles || relatedClusterArticles.length === 0 || !funnelStage) {
      return htmlContent;
    }

    const h2Regex = /<h2[^>]*>/gi;
    const matches = [...htmlContent.matchAll(h2Regex)];
    
    // Only inject if there are at least 2 H2 headings
    if (matches.length >= 2) {
      const secondH2Index = matches[1].index!;
      const midCtaPlaceholder = `<!-- MID_CLUSTER_CTA_PLACEHOLDER -->`;
      return htmlContent.slice(0, secondH2Index) 
        + midCtaPlaceholder 
        + htmlContent.slice(secondH2Index);
    }
    
    return htmlContent;
  };

  // Process content: sanitize -> markdown conversion -> internal links -> external links -> cluster links -> MidCTA injection -> inline citations
  const processContent = (htmlContent: string) => {
    let processed = sanitizeContent(htmlContent);
    
    // STEP 1: Convert markdown-style bold markers to HTML (BEFORE markdown processing)
    // Fixes visible asterisks like **Mijas Pueblo:** that should be <strong>Mijas Pueblo:</strong>
    processed = processed.replace(/\*\*([^*]+?):\*\*/g, '<strong>$1:</strong>');
    processed = processed.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    
    // STEP 2: Convert full markdown to HTML only if markdown patterns detected
    if (/^\s*\*\s+/m.test(processed) || /^#{1,6}\s/m.test(processed)) {
      processed = marked(processed) as string;
    }
    
    // SAFETY: Remove any [CITATION_NEEDED] markers that shouldn't be visible
    processed = processed.replace(/\[CITATION_NEEDED:[^\]]*\]/g, '');
    processed = processed.replace(/\[CITATION_NEEDED\]/g, '');
    
    // Process internal link placeholders FIRST (before other transformations)
    processed = injectInternalLinks(processed, internalLinks);
    processed = injectExternalLinks(processed, externalCitations);
    
    // Inject cluster links block if available (after 500-700 words, before next H2)
    if (clusterLinks && clusterLinks.length > 0) {
      // Create the cluster links HTML using a temporary container
      const tempDiv = document.createElement('div');
      const clusterBlock = document.createElement('div');
      clusterBlock.innerHTML = `
        <div class="my-8 border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
          <div class="p-6">
            <div class="flex items-center gap-2 mb-4">
              <svg class="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              <em class="text-base font-medium">Learn more about:</em>
            </div>
            <ul class="space-y-2.5">
              ${clusterLinks.map(link => `
                <li class="flex items-start gap-2">
                  <span class="text-primary mt-1 font-bold">→</span>
                  <a href="${link.url}" title="${link.title}" target="_self" class="text-primary hover:text-primary/80 font-medium transition-colors underline-offset-4 hover:underline">
                    ${link.text}
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;
      processed = injectClusterLinksBlock(processed, clusterBlock.innerHTML);
    }

    // Inject MidClusterCTA placeholder before 2nd H2
    processed = injectMidCTA(processed);
    
    // Inject inline citations as contextual hyperlinks with "According to Source (Year)" format
    processed = injectInlineCitations(processed, externalCitations);
    return processed;
  };
  
  const processedContent = processContent(content);

  useEffect(() => {
    if (!contentRef.current) return;

    // Add IDs to H2 headings for TOC
    const headings = contentRef.current.querySelectorAll("h2");
    headings.forEach((heading, index) => {
      heading.id = `heading-${index}`;
    });

    // Style internal links
    const internalLinks = contentRef.current.querySelectorAll('a[href^="/"], a[href^="#"]');
    internalLinks.forEach((link) => {
      link.classList.add("internal-link");
    });

    // Style external links and add icon (but not inline citations)
    const externalLinks = contentRef.current.querySelectorAll('a[href^="http"]:not(.inline-citation)');
    externalLinks.forEach((link) => {
      link.classList.add("external-link");
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
      
      const icon = document.createElement("span");
      icon.innerHTML = '<svg class="inline-block ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>';
      link.appendChild(icon.firstChild as Node);
    });
  }, [content]);

  // Check if content has MidCTA placeholder and split content
  const hasMidCtaPlaceholder = processedContent.includes('<!-- MID_CLUSTER_CTA_PLACEHOLDER -->');
  const [contentBeforeCta, contentAfterCta] = hasMidCtaPlaceholder
    ? processedContent.split('<!-- MID_CLUSTER_CTA_PLACEHOLDER -->')
    : [processedContent, ''];

  // Transform featured image for optimal loading
  const optimizedFeaturedSrc = transformImage(featuredImageUrl, 1200, 85);
  const featuredSrcSet = getResponsiveSrcSet(featuredImageUrl);
  const featuredSizes = getResponsiveSizes();

  return (
    <article ref={contentRef} className="space-y-12 md:space-y-16">
      {/* Featured Image Hero - Full prominence before content */}
      {featuredImageUrl && (
        <figure className="my-0 -mx-6 sm:mx-0">
          <OptimizedImage
            src={optimizedFeaturedSrc}
            srcSet={featuredSrcSet}
            sizes={featuredSizes}
            alt={featuredImageAlt}
            width={1200}
            height={675}
            priority
            className="w-full aspect-[16/9] object-cover rounded-none sm:rounded-3xl shadow-2xl"
          />
          {featuredImageCaption && (
            <div className="relative -mt-16 mx-5 sm:mx-8 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-white/30 rounded-2xl p-4 shadow-xl">
              <p className="text-sm text-center font-medium">{featuredImageCaption}</p>
            </div>
          )}
        </figure>
      )}

      {/* Content before MidCTA */}
      {hasMidCtaPlaceholder ? (
        <>
          <div
            className="article-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: contentBeforeCta }}
          />
          
          {/* MidClusterCTA Component */}
          <MidClusterCTA
            relatedArticles={relatedClusterArticles}
            stage={funnelStage}
            currentArticleId={articleId}
          />
          
          {/* Content after MidCTA */}
          <div
            className="article-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: contentAfterCta }}
          />
        </>
      ) : (
        <div
          className="article-content prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      )}

      {diagramUrl && (
        <figure className="my-12 md:my-16">
          {/* Check if diagramUrl contains Mermaid code (not an actual URL) */}
          {(diagramUrl.startsWith('graph') || 
            diagramUrl.startsWith('flowchart') || 
            diagramUrl.startsWith('sequenceDiagram') ||
            diagramUrl.startsWith('gantt') ||
            diagramUrl.startsWith('pie') ||
            diagramUrl.includes('-->')) ? (
            <MermaidPreview code={diagramUrl} className="w-full rounded-2xl shadow-xl" />
          ) : (
            <OptimizedImage
              src={diagramUrl}
              alt={diagramAlt || diagramDescription || "Diagram"}
              width={1200}
              height={800}
              className="w-full rounded-2xl border object-contain shadow-xl"
            />
          )}
          {diagramCaption && (
            <figcaption className="text-center text-sm md:text-base text-muted-foreground mt-4">
              {diagramCaption}
            </figcaption>
          )}
        </figure>
      )}
    </article>
  );
};
