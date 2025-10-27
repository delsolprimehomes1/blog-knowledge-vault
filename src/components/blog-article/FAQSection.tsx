import { FAQEntity } from "@/types/blog";
import { HelpCircle } from "lucide-react";

interface FAQSectionProps {
  faqEntities: FAQEntity[];
}

export const FAQSection = ({ faqEntities }: FAQSectionProps) => {
  if (!faqEntities || faqEntities.length === 0) return null;

  return (
    <section 
      className="faq-section bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-8 md:p-10 border border-border/50"
      itemScope 
      itemType="https://schema.org/FAQPage"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">Frequently Asked Question</h2>
      </div>

      <div className="space-y-6">
        {faqEntities.map((faq, index) => (
          <div 
            key={index}
            itemScope 
            itemProp="mainEntity" 
            itemType="https://schema.org/Question"
            className="bg-background rounded-xl p-6 border border-border/50 shadow-sm"
          >
            <h3 
              className="faq-question text-lg md:text-xl font-semibold mb-4 text-foreground"
              itemProp="name"
            >
              {faq.question}
            </h3>
            <div 
              className="faq-answer prose prose-lg max-w-none text-muted-foreground leading-relaxed"
              itemScope 
              itemProp="acceptedAnswer" 
              itemType="https://schema.org/Answer"
            >
              <p itemProp="text">{faq.answer}</p>
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