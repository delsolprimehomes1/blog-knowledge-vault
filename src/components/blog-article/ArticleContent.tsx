import { useEffect, useRef } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { MermaidPreview } from "@/components/MermaidPreview";

interface ArticleContentProps {
  content: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  featuredImageCaption?: string;
  diagramUrl?: string;
  diagramDescription?: string;
}

export const ArticleContent = ({
  content,
  featuredImageUrl,
  featuredImageAlt,
  featuredImageCaption,
  diagramUrl,
  diagramDescription,
}: ArticleContentProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

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
    <article className="prose prose-lg max-w-none">
      <figure className="my-8">
        <OptimizedImage
          src={featuredImageUrl}
          alt={featuredImageAlt}
          width={1200}
          height={675}
          priority
          className="w-full rounded-lg object-cover"
        />
        {featuredImageCaption && (
          <figcaption className="text-center text-sm text-muted-foreground mt-2">
            {featuredImageCaption}
          </figcaption>
        )}
      </figure>

      <div
        ref={contentRef}
        className="article-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {diagramUrl && (
        <figure className="my-8">
          {/* Check if diagramUrl contains Mermaid code (not an actual URL) */}
          {(diagramUrl.startsWith('graph') || 
            diagramUrl.startsWith('flowchart') || 
            diagramUrl.startsWith('sequenceDiagram') ||
            diagramUrl.startsWith('gantt') ||
            diagramUrl.startsWith('pie') ||
            diagramUrl.includes('-->')) ? (
            <MermaidPreview code={diagramUrl} className="w-full" />
          ) : (
            <OptimizedImage
              src={diagramUrl}
              alt={diagramDescription || "Diagram"}
              width={1200}
              height={800}
              className="w-full rounded-lg border object-contain"
            />
          )}
          {diagramDescription && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2">
              {diagramDescription}
            </figcaption>
          )}
        </figure>
      )}
    </article>
  );
};
