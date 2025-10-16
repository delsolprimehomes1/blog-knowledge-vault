import { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidPreviewProps {
  code: string;
  className?: string;
}

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

export const MermaidPreview = ({ code, className = "" }: MermaidPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    const renderDiagram = async () => {
      try {
        // Clear previous content
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Render new diagram
        const { svg } = await mermaid.render(idRef.current, code);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (error) {
        console.error('Mermaid render error:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="text-destructive text-sm p-4 border border-destructive rounded">
              <p class="font-semibold">Failed to render diagram</p>
              <p class="text-xs mt-1">Invalid Mermaid syntax</p>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [code]);

  return (
    <div 
      ref={containerRef} 
      className={`mermaid-preview bg-background p-4 rounded border overflow-auto ${className}`}
    />
  );
};
