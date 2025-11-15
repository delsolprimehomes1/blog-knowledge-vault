import { Helmet } from "react-helmet";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Home } from "lucide-react";
import { CaseStudy, generateCaseStudiesPageSchema, generateCaseStudiesBreadcrumbSchema } from "@/lib/caseStudiesSchemaGenerator";
import { ORGANIZATION_SCHEMA } from "@/lib/schemaGenerator";
import { useHreflang } from "@/hooks/useHreflang";

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "marbella-villa-purchase",
    title: "Luxury Villa Purchase in Marbella Golden Mile",
    location: "Marbella",
    propertyType: "Luxury Villa",
    clientProfile: "Retired couple from Germany",
    challenge: "German couple seeking a luxury retirement villa with sea views, concerned about legal complexities and language barriers in the Spanish property market.",
    solution: "Provided full German-language support throughout the process, coordinated with trusted legal advisors, and arranged exclusive viewings of properties matching their criteria. Handled all documentation and NIE registration.",
    outcome: "Successfully purchased a 4-bedroom villa with Mediterranean sea views within 3 months. Clients now enjoy their dream retirement property with complete legal security and peace of mind.",
    timeline: "3 months from search to completion",
    testimonial: {
      quote: "The entire experience was seamless thanks to the professional team. Being able to communicate in German and having experts handle the legal aspects made all the difference.",
      author: "Klaus & Ingrid M.",
      rating: 5
    },
    images: {
      after: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800"
    }
  },
  {
    id: "estepona-investment-property",
    title: "Investment Property Acquisition in Estepona",
    location: "Estepona",
    propertyType: "Modern Apartment",
    clientProfile: "UK investor seeking rental income",
    challenge: "British investor wanted a property with strong rental potential but was unfamiliar with Spanish rental regulations and tax implications for foreign owners.",
    solution: "Conducted comprehensive market analysis, identified high-demand area near the marina, coordinated with tax advisors for optimal structure, and set up property management services.",
    outcome: "Acquired modern 2-bedroom apartment achieving 85% annual occupancy rate. Client generates consistent rental income while we manage all property operations remotely.",
    timeline: "2 months from consultation to first rental",
    testimonial: {
      quote: "Outstanding service from analysis to property management. My investment performs exactly as projected, and I have complete confidence in the team managing everything.",
      author: "David P.",
      rating: 5
    },
    images: {
      after: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
    }
  },
  {
    id: "fuengirola-family-relocation",
    title: "Family Relocation to Fuengirola",
    location: "Fuengirola",
    propertyType: "Family Townhouse",
    clientProfile: "Swedish family relocating for work",
    challenge: "Swedish family needed to relocate quickly for work, requiring a family-friendly property near international schools with immediate availability.",
    solution: "Fast-tracked property search focusing on school proximity, arranged virtual tours accommodating their schedule, expedited legal process, and coordinated move-in services.",
    outcome: "Family settled into a 3-bedroom townhouse within 6 weeks, children enrolled in nearby international school, and full relocation support provided including utilities and residency documentation.",
    timeline: "6 weeks from initial contact to move-in",
    testimonial: {
      quote: "The speed and efficiency were remarkable. They understood our urgency and made what could have been a stressful move incredibly smooth for our entire family.",
      author: "Erik & Anna L.",
      rating: 5
    },
    images: {
      after: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"
    }
  },
  {
    id: "benalmadena-holiday-home",
    title: "Holiday Home Purchase in Benalmádena",
    location: "Benalmádena",
    propertyType: "Coastal Apartment",
    clientProfile: "Dutch couple seeking holiday property",
    challenge: "Dutch couple wanted a holiday home for personal use and occasional rental, but were concerned about property maintenance during long absences.",
    solution: "Identified property in well-managed complex with security, set up comprehensive property management package, and arranged flexible rental management for periods when owners are away.",
    outcome: "Secured beautiful coastal apartment with terrace. Property is professionally maintained year-round, and rental income covers annual costs during owner's absence.",
    timeline: "4 months from search to ownership",
    testimonial: {
      quote: "We have the perfect holiday retreat that pays for itself when we're not using it. The management service means we can enjoy our time here worry-free.",
      author: "Hans & Marie V.",
      rating: 5
    },
    images: {
      after: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
    }
  }
];

const CaseStudyCard = ({ caseStudy }: { caseStudy: CaseStudy }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
    <div 
      className="h-48 bg-cover bg-center" 
      style={{ backgroundImage: `url(${caseStudy.images.after})` }}
    />
    <CardHeader>
      <div className="flex items-start justify-between mb-2">
        <Badge variant="secondary" className="mb-2">{caseStudy.propertyType}</Badge>
        <div className="flex items-center gap-1">
          {[...Array(caseStudy.testimonial.rating)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-primary text-primary" />
          ))}
        </div>
      </div>
      <CardTitle className="text-xl mb-2">{caseStudy.title}</CardTitle>
      <CardDescription className="flex flex-col gap-1">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {caseStudy.location}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {caseStudy.timeline}
        </span>
        <span className="flex items-center gap-1">
          <Home className="w-3 h-3" /> {caseStudy.clientProfile}
        </span>
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-1">Challenge</h4>
          <p className="text-sm text-muted-foreground">{caseStudy.challenge}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-sm mb-1">Solution</h4>
          <p className="text-sm text-muted-foreground">{caseStudy.solution}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-sm mb-1">Outcome</h4>
          <p className="text-sm text-muted-foreground">{caseStudy.outcome}</p>
        </div>
        
        <div className="pt-4 border-t">
          <p className="text-sm italic text-muted-foreground mb-2">"{caseStudy.testimonial.quote}"</p>
          <p className="text-xs font-semibold">— {caseStudy.testimonial.author}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const CaseStudies = () => {
  const pageSchema = generateCaseStudiesPageSchema(CASE_STUDIES);
  const breadcrumbSchema = generateCaseStudiesBreadcrumbSchema();
  const { links: hreflangLinks } = useHreflang({ pageType: 'case-studies' });

  return (
    <>
      <Helmet>
        <title>Real Estate Success Stories | Del Sol Prime Homes</title>
        <meta 
          name="description" 
          content="Discover how we've helped international clients find their dream properties on Costa del Sol. Real success stories from buyers across Europe." 
        />
        <link rel="canonical" href="https://delsolprimehomes.com/case-studies" />
        
        {/* Hreflang Tags */}
        {hreflangLinks.map((link) => (
          <link
            key={link.lang}
            rel="alternate"
            hrefLang={link.lang}
            href={link.url}
          />
        ))}
        
        <script type="application/ld+json">
          {JSON.stringify(pageSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(ORGANIZATION_SCHEMA)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        {/* Hero Section */}
        <section className="relative py-20 px-4 bg-gradient-to-br from-primary/10 to-background">
          <div className="container mx-auto max-w-6xl text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-bold mb-6">
              Real Estate Success Stories
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Discover how we've helped international clients find their dream properties on Costa del Sol. 
              From luxury villas to investment apartments, see the results we deliver.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm">
              <div>
                <div className="text-3xl font-bold text-primary">127</div>
                <div className="text-muted-foreground">Happy Clients</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">4.8</div>
                <div className="text-muted-foreground">Average Rating</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">35+</div>
                <div className="text-muted-foreground">Years Experience</div>
              </div>
            </div>
          </div>
        </section>

        {/* Case Studies Grid */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-8">
              {CASE_STUDIES.map((caseStudy) => (
                <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-primary/5">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-headline font-bold mb-4">
              Ready to Start Your Success Story?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Let our experienced team help you find your perfect property on Costa del Sol
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="tel:+34613578416"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Call +34-613-578-416
              </a>
              <a 
                href="mailto:info@delsolprimehomes.com"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-primary text-primary font-semibold hover:bg-primary/10 transition-colors"
              >
                Email Us
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default CaseStudies;
