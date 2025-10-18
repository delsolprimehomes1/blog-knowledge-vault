import { useEffect, useRef } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { MermaidPreview } from "@/components/MermaidPreview";
import { ExternalCitation } from "@/types/blog";
import { injectExternalLinks, addCitationMarkers } from "@/lib/linkInjection";

interface ArticleContentProps {
  content: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  featuredImageCaption?: string;
  diagramUrl?: string;
  diagramDescription?: string;
  externalCitations?: ExternalCitation[];
}

export const ArticleContent = ({
  content,
  featuredImageUrl,
  featuredImageAlt,
  featuredImageCaption,
  diagramUrl,
  diagramDescription,
  externalCitations = [],
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

  // Process content: sanitize -> bold markers -> external links -> citation markers
  const processContent = (htmlContent: string) => {
    let processed = sanitizeContent(htmlContent);
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    processed = injectExternalLinks(processed, externalCitations);
    processed = addCitationMarkers(processed, externalCitations);
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

    // Style external links and add icon
    const externalLinks = contentRef.current.querySelectorAll('a[href^="http"]');
    externalLinks.forEach((link) => {
      link.classList.add("external-link");
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
      
      const icon = document.createElement("span");
      icon.innerHTML = '<svg class="inline-block ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>';
      link.appendChild(icon.firstChild as Node);
    });
  }, [content]);

  return (
    <article ref={contentRef} className="space-y-12 md:space-y-16">
      {/* Featured Image Hero - Full prominence before content */}
      {featuredImageUrl && (
        <figure className="my-0 -mx-5 sm:mx-0">
          <OptimizedImage
            src={featuredImageUrl}
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

      <div
        className="article-content prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />

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
              alt={diagramDescription || "Diagram"}
              width={1200}
              height={800}
              className="w-full rounded-2xl border object-contain shadow-xl"
            />
          )}
          {diagramDescription && (
            <figcaption className="text-center text-sm md:text-base text-muted-foreground mt-4">
              {diagramDescription}
            </figcaption>
          )}
        </figure>
      )}
    </article>
  );
};
