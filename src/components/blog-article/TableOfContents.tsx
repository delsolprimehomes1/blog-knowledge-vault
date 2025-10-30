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
        <div className="sticky top-24 space-y-2 backdrop-blur-lg bg-white/60 dark:bg-gray-900/60 border border-white/20 rounded-2xl p-6 shadow-lg">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
            Table of Contents
          </h3>
          <nav className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item.id)}
                className={`block w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 relative ${
                  activeId === item.id
                    ? "bg-primary/10 text-primary font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-gradient-to-b before:from-primary before:to-accent before:rounded-r-full"
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {item.title}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile inline collapsible button */}
      <div className="lg:hidden mb-6">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between backdrop-blur-lg bg-white/85 dark:bg-gray-900/85 border-white/30 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gradient-to-br from-primary to-accent">
                  <List className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-base">Table of Contents</span>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 backdrop-blur-lg bg-white/95 dark:bg-gray-900/95 border border-white/30 rounded-2xl p-4 shadow-lg animate-scale-in">
            <nav className="space-y-2">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    scrollToHeading(item.id);
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left text-base py-3 px-4 rounded-xl transition-all duration-200 relative ${
                    activeId === item.id
                      ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-10 before:bg-gradient-to-b before:from-primary before:to-accent before:rounded-r-full"
                      : "text-muted-foreground hover:bg-accent/50"
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {item.title}
                </button>
              ))}
            </nav>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
};
