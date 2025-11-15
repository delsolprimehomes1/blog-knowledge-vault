import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SchemaMeta } from "@/components/SchemaMeta";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ORGANIZATION_SCHEMA } from "@/lib/schemaGenerator";
import { useHreflang } from "@/hooks/useHreflang";

const QA_CATEGORIES = {
  legal: {
    title: "Legal & Documentation",
    questions: [
      {
        q: "What documents do I need to buy property in Spain?",
        a: "You'll need a valid passport, NIE number (foreigner tax ID), Spanish bank account, and proof of funds. We guide you through obtaining all necessary documentation."
      },
      {
        q: "How does property ownership work for foreigners?",
        a: "Foreigners have the same property rights as Spanish citizens. You can own property freehold, and there are no restrictions on foreign ownership of real estate in Spain."
      }
    ]
  },
  buying: {
    title: "Buying Process",
    questions: [
      {
        q: "What's the step-by-step buying process?",
        a: "1) Property search and viewings, 2) Make an offer and sign reservation contract, 3) Legal due diligence, 4) Sign purchase contract (Contrato de Compraventa), 5) Complete at notary with deed signing, 6) Register property."
      },
      {
        q: "Should I hire a lawyer?",
        a: "Absolutely. An independent lawyer protects your interests, reviews contracts, conducts legal checks, and ensures the property has clear title. This is essential for any Spanish property purchase."
      }
    ]
  },
  financing: {
    title: "Financing & Costs",
    questions: [
      {
        q: "What are the ongoing costs of property ownership?",
        a: "Annual costs include IBI (property tax, 0.4-1.1% of cadastral value), community fees (for apartments/urbanizations), utilities, insurance, and rubbish collection. Budget 1-3% of property value annually."
      },
      {
        q: "How do Spanish mortgages work?",
        a: "Spanish mortgages typically offer 60-70% LTV for non-residents, 25-30 year terms, and competitive rates. You'll need proof of income, bank statements, and sometimes tax returns from your home country."
      }
    ]
  },
  lifestyle: {
    title: "Lifestyle & Living",
    questions: [
      {
        q: "What's it like living on the Costa del Sol?",
        a: "The Costa del Sol offers 300+ days of sunshine, excellent international schools, world-class golf courses, Mediterranean cuisine, and a large expat community. It combines Spanish culture with international amenities."
      },
      {
        q: "Is healthcare good in the Costa del Sol?",
        a: "Spain has excellent healthcare, ranked among the world's best. You can access public healthcare with residency, or use high-quality private health insurance (€50-150/month) with English-speaking doctors."
      }
    ]
  }
};

function generateQAPageSchema() {
  const allQuestions = Object.values(QA_CATEGORIES).flatMap(category =>
    category.questions.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a
      }
    }))
  );

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": allQuestions
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
        "name": "Q&A",
        "item": "https://delsolprimehomes.com/qa"
      }
    ]
  };
}

const QA = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { links: hreflangLinks } = useHreflang({ pageType: 'qa' });

  const filteredCategories = Object.entries(QA_CATEGORIES).reduce((acc, [key, category]) => {
    const filteredQuestions = category.questions.filter(
      item =>
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.a.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredQuestions.length > 0) {
      acc[key] = { ...category, questions: filteredQuestions };
    }
    return acc;
  }, {} as typeof QA_CATEGORIES);

  return (
    <>
      <SchemaMeta
        title="Questions & Answers | Del Sol Prime Homes"
        description="Browse our comprehensive Q&A about Costa del Sol property buying, legal requirements, financing options, and lifestyle information for international buyers."
        canonical="https://delsolprimehomes.com/qa"
        schemas={[generateQAPageSchema(), ORGANIZATION_SCHEMA, generateBreadcrumbSchema()]}
        hreflangLinks={hreflangLinks}
      />

      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4 md:px-8 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-headline text-4xl md:text-6xl font-bold text-foreground mb-6">
              Questions & Answers
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Find detailed answers to your Costa del Sol property questions
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-6 text-lg"
              />
            </div>
          </div>
        </section>

        {/* Category Pills */}
        <section className="py-8 px-4 md:px-8 border-b border-border">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-3 justify-center">
            {Object.entries(QA_CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  activeCategory === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {category.title}
              </button>
            ))}
          </div>
        </section>

        {/* Q&A Content */}
        <section className="py-16 px-4 md:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {Object.entries(filteredCategories)
              .filter(([key]) => !activeCategory || key === activeCategory)
              .map(([key, category]) => (
                <div key={key}>
                  <h2 className="font-headline text-2xl md:text-3xl font-bold text-foreground mb-4">
                    {category.title}
                  </h2>
                  <Accordion type="single" collapsible className="space-y-3">
                    {category.questions.map((item, index) => (
                      <AccordionItem
                        key={index}
                        value={`${key}-${index}`}
                        className="bg-card border border-border rounded-lg px-6 py-2"
                        itemScope
                        itemProp="mainEntity"
                        itemType="https://schema.org/Question"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          <span 
                            className="font-semibold text-base text-foreground pr-4"
                            itemProp="name"
                          >
                            {item.q}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent 
                          className="text-muted-foreground leading-relaxed pt-2 pb-4"
                          itemScope
                          itemProp="acceptedAnswer"
                          itemType="https://schema.org/Answer"
                        >
                          <div itemProp="text">{item.a}</div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}

            {Object.keys(filteredCategories).length === 0 && (
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">
                  No questions found matching "{searchTerm}"
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default QA;
