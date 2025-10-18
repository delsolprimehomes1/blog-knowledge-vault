import { Mic } from "lucide-react";

interface SpeakableBoxProps {
  answer: string;
}

export const SpeakableBox = ({ answer }: SpeakableBoxProps) => {
  return (
    <div className="speakable-answer qa-summary my-12 md:my-16 p-8 md:p-12 rounded-3xl backdrop-blur-xl bg-gradient-to-r from-[hsl(204_45%_55%)]/95 to-primary/95 text-white border-2 border-white/30 shadow-2xl shadow-blue-500/30 ring-1 ring-white/20 animate-scale-in hover:shadow-[0_20px_60px_rgba(59,130,246,0.4)] transition-shadow duration-500">
      <div className="flex items-start gap-6 md:gap-8">
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
            <Mic className="h-10 w-10 md:h-12 md:w-12 relative z-10" />
          </div>
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 bg-white/30 backdrop-blur-sm rounded-full px-5 py-2.5 text-base md:text-lg font-bold mb-6 shadow-lg animate-fade-in-up">
            <span className="animate-pulse">🎙️</span>
            Voice Assistant Answer
          </div>
          <p className="text-lg md:text-2xl leading-loose font-medium">{answer}</p>
        </div>
      </div>
    </div>
  );
};
