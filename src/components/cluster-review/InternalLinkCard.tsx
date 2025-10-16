import { InternalLink } from "@/types/blog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface InternalLinkCardProps {
  link: InternalLink;
  index: number;
  onRemove: () => void;
}

export const InternalLinkCard = ({ link, onRemove }: InternalLinkCardProps) => {
  const getFunnelBadgeColor = (stage?: string) => {
    if (!stage) return "default";
    switch (stage.toUpperCase()) {
      case 'TOFU': return "default";
      case 'MOFU': return "secondary";
      case 'BOFU': return "outline";
      default: return "default";
    }
  };
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold">{link.title}</h4>
          </div>
          <a 
            href={link.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all block"
          >
            {link.url}
          </a>
          <p className="text-sm text-muted-foreground">
            <strong>Anchor:</strong> "{link.text}"
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRemove}
          className="text-destructive hover:text-destructive shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
