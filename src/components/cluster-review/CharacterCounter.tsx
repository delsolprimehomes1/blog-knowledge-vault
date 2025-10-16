interface CharacterCounterProps {
  current: number;
  max: number;
  type?: 'title' | 'description' | 'alt';
}

export const CharacterCounter = ({ current, max }: CharacterCounterProps) => {
  const percentage = (current / max) * 100;
  
  const getColor = () => {
    if (current > max) return 'text-destructive bg-destructive/10';
    if (current > max * 0.9) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${getColor().split(' ')[1]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${getColor().split(' ')[0]}`}>
        {current}/{max}
      </span>
    </div>
  );
};
