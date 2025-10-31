import { InternalLink } from "@/types/blog";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

interface ClusterLinksBlockProps {
  links: InternalLink[];
}

export const ClusterLinksBlock = ({ links }: ClusterLinksBlockProps) => {
  if (!links || links.length === 0) return null;

  return (
    <Card className="my-8 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <em className="text-base font-medium text-foreground">Learn more about:</em>
        </div>
        <ul className="space-y-2.5">
          {links.map((link, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary mt-1 font-bold">→</span>
              <a
                href={link.url}
                title={link.title}
                className="text-primary hover:text-primary/80 font-medium transition-colors underline-offset-4 hover:underline"
              >
                {link.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};
