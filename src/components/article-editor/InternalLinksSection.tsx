import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { InternalLink } from "@/types/blog";

interface InternalLinksSectionProps {
  links: InternalLink[];
  onLinksChange: (links: InternalLink[]) => void;
}

export const InternalLinksSection = ({
  links,
  onLinksChange,
}: InternalLinksSectionProps) => {
  const addLink = () => {
    onLinksChange([...links, { text: "", url: "", title: "" }]);
  };

  const updateLink = (index: number, field: keyof InternalLink, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    onLinksChange(updated);
  };

  const removeLink = (index: number) => {
    onLinksChange(links.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal Links</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add links to other articles on your site. Minimum 5 recommended.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.map((link, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label>Internal Link {index + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLink(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Label>Link Text *</Label>
              <Input
                value={link.text}
                onChange={(e) => updateLink(index, "text", e.target.value)}
                placeholder="Descriptive anchor text"
              />
            </div>
            <div>
              <Label>Target URL *</Label>
              <Input
                value={link.url}
                onChange={(e) => updateLink(index, "url", e.target.value)}
                placeholder="/blog/article-slug or full URL"
              />
            </div>
            <div>
              <Label>Title Attribute *</Label>
              <Input
                value={link.title}
                onChange={(e) => updateLink(index, "title", e.target.value)}
                placeholder="SEO helper text for the link"
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addLink}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Internal Link
        </Button>

        {links.length < 5 && (
          <p className="text-sm text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {5 - links.length} more link(s) recommended for optimal SEO
          </p>
        )}
      </CardContent>
    </Card>
  );
};
