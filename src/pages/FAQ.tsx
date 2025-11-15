import { Navbar } from "@/components/Navbar";
import { SchemaMeta } from "@/components/SchemaMeta";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ORGANIZATION_SCHEMA } from "@/lib/schemaGenerator";
import { useHreflang } from "@/hooks/useHreflang";

const FAQ_ITEMS = [
  {
    question: "What areas of Costa del Sol do you specialize in?",
    answer: "We specialize in premium coastal areas including Marbella, Puerto Banús, Estepona, Sotogrande, and surrounding municipalities. Our 35+ years of local expertise gives us unparalleled market knowledge across the entire Costa del Sol region."
  },
  {
    question: "Do you assist with Golden Visa applications?",
    answer: "Yes, we provide comprehensive support for Golden Visa applications for property investments over €500,000. Our team works with legal experts to guide you through the entire residency process, from property selection to visa approval."
  },
  {
    question: "What languages does your team speak?",
    answer: "Our multilingual team speaks English, Spanish, Dutch, German, French, and Swedish. This ensures clear communication throughout your property journey, regardless of your native language."
  },
  {
    question: "How long does a typical property purchase take?",
    answer: "A standard property transaction in Spain takes 8-12 weeks from offer acceptance to completion. This includes legal checks, mortgage approval (if needed), contract signing, and final deed registration. We streamline this process through our network of trusted legal and financial professionals."
  },
  {
    question: "What are the buying costs in Spain?",
    answer: "Total buying costs typically range from 10-13% of the property price. This includes transfer tax (8-10%), notary fees (0.5-1%), land registry fees (0.5-1%), and legal fees (1-1.5%). New builds incur VAT instead of transfer tax."
  },
  {
    question: "Do you offer property management services?",
    answer: "Yes, we provide comprehensive property management for clients who don't permanently reside in their Costa del Sol properties. Services include maintenance, rental management, bill payments, and regular property inspections."
  },
  {
    question: "Can non-residents get mortgages in Spain?",
    answer: "Yes, non-residents can obtain Spanish mortgages, typically up to 60-70% of the property value. We work with major banks and specialist lenders who understand international buyer needs and can offer competitive rates."
  },
  {
    question: "What is the NIE number and why do I need it?",
    answer: "The NIE (Número de Identificación de Extranjero) is a foreigner identification number required for all property transactions in Spain. We assist clients in obtaining their NIE through the Spanish consulate or directly in Spain."
  }
];

function generateFAQPageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };
}

function generateBreadcrumbSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://delsolprimehomes.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "FAQ",
        "item": "https://delsolprimehomes.com/faq"
      }
    ]
  };
}

const FAQ = () => {
  const { links: hreflangLinks } = useHreflang({ pageType: 'faq' });

  return (
    <>
      <SchemaMeta
        title="Frequently Asked Questions | Del Sol Prime Homes"
        description="Get answers to common questions about buying property on the Costa del Sol, Golden Visa requirements, mortgages, and our real estate services."
        canonical="https://delsolprimehomes.com/faq"
        schemas={[generateFAQPageSchema(), ORGANIZATION_SCHEMA, generateBreadcrumbSchema()]}
        hreflangLinks={hreflangLinks}
      />

      <div className="min-h-screen bg-background">
        <Navbar />
        
        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4 md:px-8 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-headline text-4xl md:text-6xl font-bold text-foreground mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about buying property on the Costa del Sol
            </p>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-16 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6 py-2"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <span 
                    className="font-semibold text-lg text-foreground pr-4"
                  >
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent 
                  className="text-muted-foreground leading-relaxed pt-2 pb-4"
                >
                  <div>{item.answer}</div>
                </AccordionContent>
              </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 md:px-8 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-foreground mb-4">
              Still have questions?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Our expert team is here to help you navigate your Costa del Sol property journey.
            </p>
            <a
              href="mailto:info@delsolprimehomes.com"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
            >
              Contact Us
            </a>
          </div>
        </section>
      </div>
    </>
  );
};

export default FAQ;
