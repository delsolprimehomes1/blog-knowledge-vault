import { Mic } from "lucide-react";

interface SpeakableBoxProps {
  answer: string;
}

export const SpeakableBox = ({ answer }: SpeakableBoxProps) => {
  return (
    <div className="speakable-answer qa-summary my-12 md:my-16 p-8 md:p-10 rounded-3xl backdrop-blur-xl bg-gradient-to-r from-[hsl(204_45%_55%)]/95 to-primary/95 text-white border border-white/30 shadow-2xl shadow-blue-500/20 animate-scale-in">
      <div className="flex items-start gap-4 md:gap-6">
        <div className="flex-shrink-0">
          <Mic className="h-8 w-8 md:h-10 md:w-10 animate-pulse-glow" />
        </div>
        <div className="flex-1">
          <div className="inline-block bg-white/30 backdrop-blur-sm rounded-full px-4 py-2 text-sm md:text-base font-semibold mb-4 shadow-lg animate-fade-in-up">
            🎙️ Voice Assistant Answer
          </div>
          <p className="text-xl md:text-2xl leading-loose">{answer}</p>
        </div>
      </div>
    </div>
  );
};
