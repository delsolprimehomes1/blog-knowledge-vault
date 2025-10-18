import { Mic } from "lucide-react";

interface SpeakableBoxProps {
  answer: string;
}

export const SpeakableBox = ({ answer }: SpeakableBoxProps) => {
  return (
    <div className="speakable-answer qa-summary my-12 md:my-16 p-8 md:p-10 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/10 backdrop-blur-sm border border-primary/20 shadow-lg animate-scale-in">
      <div className="flex items-start gap-4 md:gap-6">
        <div className="flex-shrink-0 mt-1">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Mic className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">
              Voice Assistant Answer
            </span>
          </div>
          <p className="text-lg md:text-xl leading-relaxed text-foreground/90">{answer}</p>
        </div>
      </div>
    </div>
  );
};
