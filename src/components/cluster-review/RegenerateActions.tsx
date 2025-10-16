import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";

interface RegenerateActionsProps {
  onRegenerateHeadline: () => Promise<void>;
  onRegenerateSEO: () => Promise<void>;
  onRegenerateImage: () => Promise<void>;
  onRegenerateContent: () => Promise<void>;
}

export const RegenerateActions = ({
  onRegenerateHeadline,
  onRegenerateSEO,
  onRegenerateImage,
  onRegenerateContent,
}: RegenerateActionsProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleRegenerate = async (section: string, action: () => Promise<void>) => {
    setLoading(section);
    try {
      await action();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="text-sm font-medium">AI Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRegenerate("headline", onRegenerateHeadline)}
            disabled={loading !== null}
            className="w-full"
          >
            {loading === "headline" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Headline
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRegenerate("seo", onRegenerateSEO)}
            disabled={loading !== null}
            className="w-full"
          >
            {loading === "seo" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            SEO Meta
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRegenerate("image", onRegenerateImage)}
            disabled={loading !== null}
            className="w-full"
          >
            {loading === "image" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRegenerate("content", onRegenerateContent)}
            disabled={loading !== null}
            className="w-full"
          >
            {loading === "content" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Content
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
