import { FAQEntity } from "@/types/blog";
import { HelpCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

interface FAQSectionProps {
  faqEntities: FAQEntity[];
}

export const FAQSection = ({ faqEntities }: FAQSectionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqEntities || faqEntities.length === 0) return null;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section 
      className="faq-section bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-8 md:p-10 border border-border/50"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-4">
        {faqEntities.map((faq, index) => (
          <div 
            key={index}
            className="bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden transition-all"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full text-left p-6 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors"
              aria-expanded={openIndex === index}
            >
              <h3 
                className="faq-question text-lg md:text-xl font-semibold text-foreground flex-1"
              >
                {faq.question}
              </h3>
              <ChevronDown 
                className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                  openIndex === index ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            
            <div 
              className={`faq-answer overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === index ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-6 pb-6 prose prose-lg max-w-none text-muted-foreground leading-relaxed">
                <p>{faq.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI/Voice Assistant Optimization Note */}
      <p className="text-xs text-muted-foreground mt-6 italic">
        This FAQ is optimized for AI assistants and voice search
      </p>
    </section>
  );
};