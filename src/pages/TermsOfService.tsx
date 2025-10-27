import React from "react";
import { Scale, FileText, AlertTriangle, Users, Shield, Globe, CheckCircle, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { BlogFooter } from "@/components/blog-article/BlogFooter";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const TermsOfService = () => {
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const sections = [
    { id: "acceptance", label: "Acceptance of Terms" },
    { id: "services", label: "Description of Services" },
    { id: "responsibilities", label: "User Responsibilities" },
    { id: "listings", label: "Property Listings" },
    { id: "agency", label: "No Agency Relationship" },
    { id: "intellectual", label: "Intellectual Property" },
    { id: "third-party", label: "Third-Party Links" },
    { id: "liability", label: "Limitation of Liability" },
    { id: "indemnification", label: "Indemnification" },
    { id: "disputes", label: "Dispute Resolution" },
    { id: "modifications", label: "Modifications" },
    { id: "contact", label: "Contact" },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const Section = ({ id, icon: Icon, title, number, children }: any) => {
    const { elementRef, isVisible } = useScrollAnimation();
    return (
      <Card
        id={id}
        ref={elementRef as any}
        className={`glass-premium rounded-xl border-border/40 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-primary/40">{number}.</span>
              <Icon className="w-6 h-6 text-primary" />
              <span>{title}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
          {children}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-background to-purple-500/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground">
              These terms govern your use of DelSol Prime Homes services. Please read them carefully before using our platform.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Effective Date:</strong> January 2025
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Table of Contents - Sidebar */}
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-24">
                <Card className="glass-premium border-border/40">
                  <CardHeader>
                    <CardTitle className="text-lg">Contents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <nav className="space-y-2">
                      {sections.map((section, index) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className="block w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-primary/5"
                        >
                          <span className="font-semibold text-primary/60">{index + 1}.</span> {section.label}
                        </button>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Content */}
            <main className="lg:col-span-9 space-y-8">
              <Section id="acceptance" icon={FileText} title="Acceptance of Terms" number={1}>
                <p>
                  By accessing or using the DelSol Prime Homes website and services (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use our Services.
                </p>
                <p>
                  These Terms constitute a legally binding agreement between you and DelSol Prime Homes, operating in Fuengirola, Costa del Sol, Spain.
                </p>
                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm font-medium text-foreground">
                    By continuing to use our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
                  </p>
                </div>
              </Section>

              <Section id="services" icon={Users} title="Description of Services" number={2}>
                <p>
                  DelSol Prime Homes provides real estate services focused on properties located in Costa del Sol, Spain. Our services include:
                </p>
                <div className="space-y-3 mt-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">Property Listings & Search</p>
                      <p className="text-sm">Access to curated property listings including villas, apartments, and investment opportunities.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">Property Consultation</p>
                      <p className="text-sm">Expert guidance on property selection, market trends, and investment potential.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">Market Information</p>
                      <p className="text-sm">Blog articles, guides, and resources about the Costa del Sol real estate market.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">Inquiry & Communication</p>
                      <p className="text-sm">Direct communication channels to discuss your property needs and requirements.</p>
                    </div>
                  </div>
                </div>
              </Section>

              <Section id="responsibilities" icon={AlertTriangle} title="User Responsibilities & Conduct" number={3}>
                <p>When using our Services, you agree to:</p>
                <Accordion type="single" collapsible className="space-y-2 mt-4">
                  <AccordionItem value="accurate" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-semibold text-foreground">Provide Accurate Information</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                      <p>You must provide accurate, current, and complete information when contacting us or using our services. False or misleading information may result in termination of services.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="lawful" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-semibold text-foreground">Lawful Use Only</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                      <p>You may not use our Services for any illegal purposes, including but not limited to money laundering, fraud, or tax evasion. All property transactions must comply with local and EU laws.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="respect" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-semibold text-foreground">Respectful Communication</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                      <p>You agree to communicate respectfully with our team. Abusive, threatening, or harassing behavior will not be tolerated and may result in immediate termination of services.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="security" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-semibold text-foreground">Account Security</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                      <p>If you create an account, you are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Section>

              <Section id="listings" icon={AlertTriangle} title="Property Listings & Accuracy" number={4}>
                <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded">
                  <p className="text-sm font-semibold text-foreground mb-2">Important Disclaimer</p>
                  <p className="text-sm text-foreground">
                    Property information is provided for general guidance only and should not be relied upon as the sole basis for making a property purchase decision.
                  </p>
                </div>
                <div className="space-y-3 mt-4">
                  <p><strong className="text-foreground">Accuracy:</strong> While we strive to ensure all property information is accurate, descriptions, prices, and availability are subject to change without notice.</p>
                  <p><strong className="text-foreground">No Guarantee:</strong> We do not guarantee the condition, legal status, or investment potential of any property listed.</p>
                  <p><strong className="text-foreground">Due Diligence:</strong> You are responsible for conducting your own due diligence, including property inspections, legal reviews, and financial assessments.</p>
                  <p><strong className="text-foreground">Third-Party Listings:</strong> Some properties may be listed by third-party developers or sellers. We act as an intermediary and are not responsible for their accuracy.</p>
                </div>
              </Section>

              <Section id="agency" icon={Shield} title="No Agency Relationship" number={5}>
                <p>
                  <strong className="text-foreground">DelSol Prime Homes provides informational and consultancy services only.</strong> We are not your legal advisors, financial advisors, or tax consultants.
                </p>
                <div className="space-y-3 mt-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-2">Legal Advice</p>
                    <p className="text-sm">We strongly recommend consulting with a qualified local property lawyer (abogado) before making any property purchase.</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-2">Financial Advice</p>
                    <p className="text-sm">For mortgage advice and financial planning, please consult with licensed financial advisors familiar with local regulations.</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-2">Tax Advice</p>
                    <p className="text-sm">Property taxes, capital gains, and residency implications should be discussed with qualified tax professionals (asesor fiscal).</p>
                  </div>
                </div>
                <p className="mt-4 text-sm">
                  Any recommendations or information provided by DelSol Prime Homes are for informational purposes only and do not constitute professional advice.
                </p>
              </Section>

              <Section id="intellectual" icon={FileText} title="Intellectual Property Rights" number={6}>
                <p>
                  All content on the DelSol Prime Homes website, including text, images, logos, graphics, videos, and software, is the property of DelSol Prime Homes or its content suppliers and is protected by international copyright laws.
                </p>
                <div className="space-y-3 mt-4">
                  <p><strong className="text-foreground">Permitted Use:</strong> You may view and download content for personal, non-commercial use only.</p>
                  <p><strong className="text-foreground">Prohibited Use:</strong> You may not reproduce, distribute, modify, or create derivative works without our express written permission.</p>
                  <p><strong className="text-foreground">Trademarks:</strong> DelSol Prime Homes and associated logos are trademarks. Unauthorized use is prohibited.</p>
                </div>
              </Section>

              <Section id="third-party" icon={Globe} title="Third-Party Links & Services" number={7}>
                <p>
                  Our website may contain links to third-party websites, services, or resources (such as property developers, mortgage brokers, or legal services).
                </p>
                <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 rounded mt-4">
                  <p className="text-sm font-semibold text-foreground mb-2">No Endorsement</p>
                  <p className="text-sm text-foreground">
                    DelSol Prime Homes does not endorse or assume responsibility for any third-party content, products, or services. Your use of third-party websites is at your own risk and subject to their terms and privacy policies.
                  </p>
                </div>
              </Section>

              <Section id="liability" icon={AlertTriangle} title="Limitation of Liability" number={8}>
                <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded">
                  <p className="text-sm font-semibold text-foreground mb-2">Important Legal Notice</p>
                  <p className="text-sm text-foreground">
                    To the maximum extent permitted by applicable law, DelSol Prime Homes shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of our Services.
                  </p>
                </div>
                <div className="space-y-3 mt-4">
                  <p><strong className="text-foreground">No Liability for:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>Property defects, legal issues, or title problems</li>
                    <li>Financial losses from property investments</li>
                    <li>Errors or omissions in property information</li>
                    <li>Third-party services or conduct</li>
                    <li>Website downtime or technical issues</li>
                    <li>Changes in property prices or availability</li>
                  </ul>
                </div>
                <p className="mt-4 text-sm">
                  Our total liability for any claims shall not exceed the amount you have paid to us in the past 12 months (if any).
                </p>
              </Section>

              <Section id="indemnification" icon={Shield} title="Indemnification" number={9}>
                <p>
                  You agree to indemnify, defend, and hold harmless DelSol Prime Homes, its owners, employees, and partners from any claims, losses, damages, liabilities, costs, or expenses (including reasonable legal fees) arising from:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                  <li>Your use or misuse of our Services</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any third-party rights</li>
                  <li>Any false or misleading information you provide</li>
                </ul>
              </Section>

              <Section id="disputes" icon={Scale} title="Dispute Resolution & Governing Law" number={10}>
                <p>
                  These Terms are governed by and construed in accordance with the laws of Spain, without regard to conflict of law principles.
                </p>
                <div className="space-y-3 mt-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-2">Jurisdiction</p>
                    <p className="text-sm">Any disputes arising from these Terms or your use of our Services shall be subject to the exclusive jurisdiction of the courts of Fuengirola, Spain.</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-2">Mediation</p>
                    <p className="text-sm">Before initiating legal proceedings, we encourage you to contact us to attempt to resolve the dispute amicably through mediation.</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-2">EU Consumer Rights</p>
                    <p className="text-sm">EU consumers may also use the European Commission's Online Dispute Resolution platform: ec.europa.eu/consumers/odr</p>
                  </div>
                </div>
              </Section>

              <Section id="modifications" icon={FileText} title="Modifications to Terms" number={11}>
                <p>
                  We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to our website, with the updated "Effective Date" noted at the top.
                </p>
                <p className="mt-3">
                  Your continued use of our Services after changes are posted constitutes your acceptance of the modified Terms. We encourage you to review these Terms periodically.
                </p>
                <p className="mt-3">
                  If you do not agree to the modified Terms, you must immediately stop using our Services.
                </p>
              </Section>

              <Section id="contact" icon={Mail} title="Contact Information" number={12}>
                <p>
                  For questions, concerns, or disputes regarding these Terms of Service, please contact us:
                </p>
                <div className="bg-muted/30 p-6 rounded-lg mt-4 space-y-3">
                  <div>
                    <p className="font-semibold text-foreground">DelSol Prime Homes</p>
                    <p className="text-sm">Fuengirola, Costa del Sol, Spain</p>
                  </div>
                  <div>
                    <p className="text-sm">
                      <strong>Email:</strong>{" "}
                      <a href="mailto:info@delsolprimehomes.com" className="text-primary hover:underline">
                        info@delsolprimehomes.com
                      </a>
                    </p>
                    <p className="text-sm">
                      <strong>Phone:</strong> +34 XXX XXX XXX
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                    Business Hours: Monday - Friday, 9:00 AM - 6:00 PM (CET)
                  </p>
                </div>
              </Section>
            </main>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold">Questions About Our Terms?</h2>
            <p className="text-muted-foreground">
              We're committed to transparency and fair business practices. If you have any questions about these terms, we're happy to clarify.
            </p>
            <Button size="lg" asChild>
              <a href="mailto:info@delsolprimehomes.com">Get in Touch</a>
            </Button>
          </div>
        </div>
      </section>

      <BlogFooter />
    </div>
  );
};

export default TermsOfService;
