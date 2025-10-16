import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { List, ChevronDown } from "lucide-react";

interface TOCItem {
  id: string;
  title: string;
}

interface TableOfContentsProps {
  content: string;
}

export const TableOfContents = ({ content }: TableOfContentsProps) => {
  const [items, setItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const headings = doc.querySelectorAll("h2");
    
    const tocItems: TOCItem[] = [];
    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      const title = heading.textContent || "";
      tocItems.push({ id, title });
    });
    
    setItems(tocItems);
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -80% 0px" }
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  return (
    <>
      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-2">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
            Table of Contents
          </h3>
          <nav className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item.id)}
                className={`block w-full text-left text-sm py-2 px-3 rounded-md transition-colors ${
                  activeId === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {item.title}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile collapsible */}
      <div className="lg:hidden mb-6">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Table of Contents
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 border rounded-lg p-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  scrollToHeading(item.id);
                  setIsOpen(false);
                }}
                className={`block w-full text-left text-sm py-2 px-3 rounded-md transition-colors ${
                  activeId === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {item.title}
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
};
