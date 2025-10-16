import { Button } from "@/components/ui/button";

interface QuickRepliesProps {
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
}

export const QuickReplies = ({ options, onSelect }: QuickRepliesProps) => {
  return (
    <div className="px-4 pb-4 flex flex-wrap gap-2">
      {options.map((option, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSelect(option.value)}
          className="text-xs"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};
