import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { Language, FunnelStage, ArticleStatus } from "@/types/blog";

interface BasicInfoSectionProps {
  headline: string;
  slug: string;
  language: Language;
  category: string;
  funnelStage: FunnelStage;
  status: ArticleStatus;
  categories?: Array<{ id: string; name: string }>;
  onHeadlineChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onLanguageChange: (value: Language) => void;
  onCategoryChange: (value: string) => void;
  onFunnelStageChange: (value: FunnelStage) => void;
  onStatusChange: (value: ArticleStatus) => void;
  errors?: Record<string, string>;
  isEditing?: boolean;
}

const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const BasicInfoSection = ({
  headline,
  slug,
  language,
  category,
  funnelStage,
  status,
  categories,
  onHeadlineChange,
  onSlugChange,
  onLanguageChange,
  onCategoryChange,
  onFunnelStageChange,
  onStatusChange,
  errors = {},
  isEditing = false,
}: BasicInfoSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="headline">Headline *</Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => onHeadlineChange(e.target.value)}
            placeholder="How to Buy Property in Costa del Sol?"
            className={errors.headline ? "border-red-500" : ""}
          />
          {errors.headline && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.headline}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => onSlugChange(generateSlug(e.target.value))}
            placeholder="how-to-buy-property-costa-del-sol"
            className={errors.slug ? "border-red-500" : ""}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Auto-generated from headline. Lowercase and hyphens only.
          </p>
          {errors.slug && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.slug}
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="language">Language *</Label>
            <Select value={language} onValueChange={(val) => onLanguageChange(val as Language)}>
              <SelectTrigger className={errors.language ? "border-red-500" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                <SelectItem value="de">🇩🇪 German</SelectItem>
                <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
                <SelectItem value="fr">🇫🇷 French</SelectItem>
                <SelectItem value="pl">🇵🇱 Polish</SelectItem>
                <SelectItem value="sv">🇸🇪 Swedish</SelectItem>
                <SelectItem value="da">🇩🇰 Danish</SelectItem>
                <SelectItem value="hu">🇭🇺 Hungarian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="funnelStage">Funnel Stage *</Label>
            <Select value={funnelStage} onValueChange={(val) => onFunnelStageChange(val as FunnelStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOFU">TOFU - Top of Funnel (Awareness)</SelectItem>
                <SelectItem value="MOFU">MOFU - Middle of Funnel (Consideration)</SelectItem>
                <SelectItem value="BOFU">BOFU - Bottom of Funnel (Decision)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select value={status} onValueChange={(val) => onStatusChange(val as ArticleStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
