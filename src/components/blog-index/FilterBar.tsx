import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";

interface FilterBarProps {
  selectedCategory: string;
  selectedLanguage: string;
  categories: Array<{ id: string; name: string }>;
  onCategoryChange: (category: string) => void;
  onLanguageChange: (language: string) => void;
  onClearFilters: () => void;
  resultCount: number;
}

const LANGUAGES = [
  { code: "all", flag: "🌍", name: "All Languages" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "es", flag: "🇪🇸", name: "Spanish" },
  { code: "de", flag: "🇩🇪", name: "German" },
  { code: "nl", flag: "🇳🇱", name: "Dutch" },
  { code: "fr", flag: "🇫🇷", name: "French" },
  { code: "pl", flag: "🇵🇱", name: "Polish" },
  { code: "sv", flag: "🇸🇪", name: "Swedish" },
  { code: "da", flag: "🇩🇰", name: "Danish" },
  { code: "hu", flag: "🇭🇺", name: "Hungarian" },
];

export const FilterBar = ({
  selectedCategory,
  selectedLanguage,
  categories,
  onCategoryChange,
  onLanguageChange,
  onClearFilters,
  resultCount,
}: FilterBarProps) => {
  const hasActiveFilters = selectedCategory !== "all" || selectedLanguage !== "all";
  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name;
  const selectedLanguageName = LANGUAGES.find(l => l.code === selectedLanguage)?.name;

  return (
    <div className="space-y-4 mb-8">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Filters:</span>
        </div>

        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLanguage} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((language) => (
              <SelectItem key={language.code} value={language.code}>
                {language.flag} {language.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className="gap-2">
              {selectedCategoryName}
              <button onClick={() => onCategoryChange("all")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedLanguage !== "all" && (
            <Badge variant="secondary" className="gap-2">
              {selectedLanguageName}
              <button onClick={() => onLanguageChange("all")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Showing {resultCount} {resultCount === 1 ? 'article' : 'articles'}
      </p>
    </div>
  );
};
