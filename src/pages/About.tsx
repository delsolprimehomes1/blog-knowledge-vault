import { Helmet } from "react-helmet";
import { Building2, Users, Shield, MapPin, Heart, Award, CheckCircle2, Globe, Scale, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompanyContactSection } from "@/components/blog-article/CompanyContactSection";
import { SpeakableBox } from "@/components/blog-article/SpeakableBox";
import { Link } from "react-router-dom";
import costadelsolBg from "@/assets/costa-del-sol-bg.jpg";
import { Navbar } from "@/components/Navbar";
import { generateAllAboutSchemas, ABOUT_PAGE_FAQS } from "@/lib/aboutSchemaGenerator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const About = () => {
  const schemas = generateAllAboutSchemas();
  const baseUrl = "https://delsolprimehomes.com";
  const pageUrl = `${baseUrl}/about`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        {/* Basic SEO Meta Tags */}
        <title>About Del Sol Prime Homes | Costa del Sol Real Estate Experts</title>
        <meta 
          name="description" 
          content="Del Sol Prime Homes: Licensed real estate agents specializing in Costa del Sol properties. Multilingual team (8 languages), local expertise, and personalized service for international buyers." 
        />
        <link rel="canonical" href={pageUrl} />
        <meta name="robots" content="index, follow" />
        <meta httpEquiv="content-language" content="en-GB" />

        {/* Open Graph Tags */}
        <meta property="og:title" content="About Del Sol Prime Homes | Costa del Sol Real Estate Experts" />
        <meta property="og:description" content="Licensed real estate agency specializing in Costa del Sol properties with multilingual support in 8 languages and local expertise for international buyers." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:site_name" content="Del Sol Prime Homes" />
        <meta property="og:image" content={`${baseUrl}/logo.png`} />
        <meta property="og:image:alt" content="Del Sol Prime Homes - Costa del Sol Real Estate" />
        <meta property="og:locale" content="en_GB" />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="About Del Sol Prime Homes | Costa del Sol Real Estate Experts" />
        <meta name="twitter:description" content="Licensed real estate agency specializing in Costa del Sol properties with multilingual support and local expertise." />
        <meta name="twitter:image" content={`${baseUrl}/logo.png`} />

        {/* Hreflang Tags (English default) */}
        <link rel="alternate" hrefLang="x-default" href={pageUrl} />
        <link rel="alternate" hrefLang="en-GB" href={pageUrl} />
        <link rel="alternate" hrefLang="en" href={pageUrl} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(schemas.aboutPage)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.speakable)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.breadcrumb)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.faq)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.organization)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.localBusiness)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.services)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(schemas.serviceArea)}
        </script>
      </Helmet>

      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center pt-16 md:pt-20">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${costadelsolBg})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background" />
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 animate-fade-in">
            ABOUT DEL SOL PRIME HOMES
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-light">
            YOUR TRUSTED PARTNER ON COSTA DEL SOL
          </p>
        </div>
      </section>

      {/* Speakable Answer Box */}
      <section className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <SpeakableBox 
            answer="Del Sol Prime Homes is a licensed real estate agency specializing in Costa del Sol properties for international buyers. We provide expert guidance through property purchases with multilingual agents speaking 8 languages including English, German, Dutch, French, Polish, Swedish, Danish, and Hungarian."
          />
        </div>
      </section>

      {/* Trust Signals / Verification Section */}
      <section className="py-8 md:py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8">
            <span className="text-sm md:text-base font-semibold text-primary">VERIFIED & TRUSTED</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">
              LICENSED REAL ESTATE PROFESSIONALS
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">Licensed</div>
                <p className="text-sm text-muted-foreground">API Certified Agents</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">8 Languages</div>
                <p className="text-sm text-muted-foreground">Multilingual Support</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">Local Experts</div>
                <p className="text-sm text-muted-foreground">Costa del Sol Specialists</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">Dedicated</div>
                <p className="text-sm text-muted-foreground">Personalized Service</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden">
              <img 
                src={costadelsolBg} 
                alt="Costa del Sol luxury property" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-6 speakable-mission">
              <span className="text-sm md:text-base font-semibold text-primary">OUR MISSION</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                FINDING YOUR PERFECT HOME ON THE COSTA DEL SOL
              </h2>
              <div className="space-y-4 text-base md:text-lg text-muted-foreground">
                <p>
                  At Del Sol Prime Homes, we specialize in connecting international clients with their dream properties along Spain's stunning Costa del Sol. With deep local expertise and a passion for excellence, we guide you through every step of your property journey.
                </p>
                <p>
                  Our multilingual team understands the unique needs of international buyers and sellers. We provide personalized service that goes beyond the transaction, ensuring you feel supported from your first inquiry to long after you've settled into your new home.
                </p>
                <p>
                  Whether you're seeking a luxury villa, beachfront apartment, or investment property, we leverage our extensive network and market knowledge to find properties that perfectly match your vision and lifestyle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <span className="text-sm md:text-base font-semibold text-primary">WHY CHOOSE US</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
              YOUR SUCCESS IS OUR PRIORITY
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">LOCAL EXPERTISE</h3>
                <p className="text-muted-foreground">
                  Deep knowledge of Costa del Sol neighborhoods, market trends, and hidden gems that only locals know.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">PERSONALIZED SERVICE</h3>
                <p className="text-muted-foreground">
                  Tailored approach to match your unique needs, preferences, and budget with dedicated support throughout.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">TRUSTED PARTNERS</h3>
                <p className="text-muted-foreground">
                  Established relationships with legal experts, financial advisors, and property managers to ensure seamless transactions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section with Structured Data */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <span className="text-sm md:text-base font-semibold text-primary">OUR SERVICES</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
              COMPREHENSIVE REAL ESTATE SOLUTIONS
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">Property Search & Selection</h3>
                <p className="text-muted-foreground">
                  Expert assistance finding the perfect property matching your criteria across Costa del Sol, including exclusive listings and off-market opportunities.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Scale className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">Legal & Financial Guidance</h3>
                <p className="text-muted-foreground">
                  Comprehensive support with legal documentation, contracts, NIE numbers, notary appointments, and financial arrangements.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">Multilingual Support</h3>
                <p className="text-muted-foreground">
                  Communication in 8 languages: English, German, Dutch, French, Polish, Swedish, Danish, and Hungarian. Clear communication throughout your journey.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">Property Management</h3>
                <p className="text-muted-foreground">
                  Ongoing property management and maintenance services for international owners, ensuring your investment is well-maintained.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-6">
              <span className="text-sm md:text-base font-semibold text-primary">OUR COMMITMENT</span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                EXPERIENCE THAT MAKES THE DIFFERENCE
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Extensive Portfolio</h3>
                    <p className="text-muted-foreground">
                      Access to exclusive listings and off-market properties across the entire Costa del Sol region.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Multilingual Support</h3>
                    <p className="text-muted-foreground">
                      Our team speaks 8 languages, ensuring clear communication throughout your property journey.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Client-Focused Approach</h3>
                    <p className="text-muted-foreground">
                      We prioritize your satisfaction with personalized attention and transparent communication at every step.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden order-first md:order-last">
              <img 
                src={costadelsolBg} 
                alt="Del Sol Prime Homes team expertise" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section with Structured Data */}
      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <span className="text-sm md:text-base font-semibold text-primary">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
              EVERYTHING YOU NEED TO KNOW
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {ABOUT_PAGE_FAQS.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Team Approach Section */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center space-y-6">
          <span className="text-sm md:text-base font-semibold text-primary">OUR APPROACH</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            A PARTNERSHIP BUILT ON TRUST
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">
            At Del Sol Prime Homes, we believe in building lasting relationships with our clients. We take the time to understand your goals, preferences, and concerns, providing honest advice and transparent guidance throughout your property journey. Our personalized approach ensures that every decision is made with your best interests at heart.
          </p>
          <p className="text-base md:text-lg text-muted-foreground">
            From the initial consultation to post-purchase support, we're with you every step of the way. Our comprehensive services include property search, legal assistance, financial guidance, and ongoing property management—everything you need for a stress-free experience.
          </p>
          <div className="pt-8">
            <Link to="/blog">
              <Button size="lg" className="text-base">
                Explore Our Blog
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <CompanyContactSection />
        </div>
      </section>
    </div>
  );
};

export default About;
