import { Mic } from "lucide-react";

interface SpeakableBoxProps {
  answer: string;
}

export const SpeakableBox = ({ answer }: SpeakableBoxProps) => {
  return (
    <div className="speakable-answer qa-summary my-8 p-6 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <Mic className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <div className="inline-block bg-white/20 rounded-full px-3 py-1 text-sm font-medium mb-3">
            🎙️ Voice Assistant Answer
          </div>
          <p className="text-xl leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
};
