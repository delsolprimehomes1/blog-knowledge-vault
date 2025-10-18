import { InternalLink } from "@/types/blog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

interface InternalLinksSectionProps {
  links: InternalLink[];
}

export const InternalLinksSection = ({ links }: InternalLinksSectionProps) => {
  if (!links || links.length === 0) return null;

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Related Reading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {links.map((link, index) => (
            <li key={index}>
              <a
                href={link.url}
                title={link.title}
                className="text-primary hover:underline font-medium flex items-start gap-2 transition-colors"
              >
                <span className="text-muted-foreground mt-1">→</span>
                <span>{link.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
