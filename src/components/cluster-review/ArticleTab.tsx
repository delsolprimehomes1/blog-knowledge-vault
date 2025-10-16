import { FunnelStage } from "@/types/blog";
import { Badge } from "@/components/ui/badge";

interface ArticleTabProps {
  index: number;
  headline: string;
  funnelStage: FunnelStage;
  isActive: boolean;
  onClick: () => void;
}

const getFunnelBadgeColor = (stage: FunnelStage) => {
  switch (stage) {
    case "TOFU":
      return "bg-blue-500 hover:bg-blue-600";
    case "MOFU":
      return "bg-yellow-500 hover:bg-yellow-600";
    case "BOFU":
      return "bg-green-500 hover:bg-green-600";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
};

const getFunnelStageLabel = (stage: FunnelStage, index: number) => {
  if (stage === "TOFU") return `TOFU ${index + 1}`;
  if (stage === "MOFU") return `MOFU ${index - 2}`;
  return "BOFU";
};

export const ArticleTab = ({
  index,
  headline,
  funnelStage,
  isActive,
  onClick,
}: ArticleTabProps) => {
  const truncatedHeadline = headline.length > 40 ? headline.substring(0, 40) + "..." : headline;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        isActive
          ? "border-primary text-primary bg-primary/5"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      <Badge className={`${getFunnelBadgeColor(funnelStage)} text-white`}>
        {getFunnelStageLabel(funnelStage, index)}
      </Badge>
      <span className="truncate">{truncatedHeadline}</span>
    </button>
  );
};
