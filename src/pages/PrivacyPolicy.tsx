import { Shield, Lock, Eye, Users, Globe, Cookie, FileText, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { BlogFooter } from "@/components/blog-article/BlogFooter";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const PrivacyPolicy = () => {
  const sections = [
    { id: "introduction", label: "Introduction" },
    { id: "information-collection", label: "Information We Collect" },
    { id: "how-we-use", label: "How We Use Your Information" },
    { id: "data-sharing", label: "Data Sharing & Disclosure" },
    { id: "your-rights", label: "Your Rights" },
    { id: "cookies", label: "Cookies & Tracking" },
    { id: "security", label: "Data Security" },
    { id: "international", label: "International Transfers" },
    { id: "children", label: "Children's Privacy" },
    { id: "changes", label: "Policy Changes" },
    { id: "contact", label: "Contact Us" },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const Section = ({ id, icon: Icon, title, children }: any) => {
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
            <Icon className="w-6 h-6 text-primary" />
            {title}
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Your privacy is important to us. This policy explains how DelSol Prime Homes collects, uses, and protects your personal information.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Last Updated:</strong> January 2025
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
                      {sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className="block w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors py-1.5 px-2 rounded hover:bg-primary/5"
                        >
                          {section.label}
                        </button>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
              </div>
            </aside>

            {/* Content */}
            <main className="lg:col-span-9 space-y-8">
              <Section id="introduction" icon={FileText} title="Introduction">
                <p>
                  Welcome to DelSol Prime Homes. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
                </p>
                <p>
                  This policy applies to all information collected through our website, services, and any related communications. By using our services, you agree to the collection and use of information in accordance with this policy.
                </p>
                <div className="bg-primary/5 border-l-4 border-primary p-4 rounded">
                  <p className="text-sm font-medium text-foreground">
                    We comply with Spanish data protection laws and the EU General Data Protection Regulation (GDPR).
                  </p>
                </div>
              </Section>

              <Section id="information-collection" icon={Eye} title="Information We Collect">
                <Accordion type="single" collapsible className="space-y-2">
                  <AccordionItem value="personal" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-semibold text-foreground">Personal Information</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                      <p>We collect personal information that you voluntarily provide when you:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Contact us via email or phone</li>
                        <li>Fill out inquiry forms on our website</li>
                        <li>Subscribe to our newsletter</li>
                        <li>Request property information</li>
                      </ul>
                      <p className="mt-3">This may include: name, email address, phone number, nationality, and property preferences.</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="property" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-semibold text-foreground">Property Preferences</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                      <p>To provide you with relevant property recommendations, we collect:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Budget range and financing preferences</li>
                        <li>Desired location and property type</li>
                        <li>Number of bedrooms, bathrooms, and amenities</li>
                        <li>Timeline for purchase</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="technical" className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="font-semibold text-foreground">Technical Data</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2 pb-4">
                      <p>When you visit our website, we automatically collect certain information:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>IP address and device information</li>
                        <li>Browser type and version</li>
                        <li>Pages visited and time spent on site</li>
                        <li>Referring website and search terms used</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Section>

              <Section id="how-we-use" icon={Users} title="How We Use Your Information">
                <p>We use the collected information for the following purposes:</p>
                <div className="space-y-3 mt-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">1</div>
                    <div>
                      <p className="font-semibold text-foreground">Service Delivery</p>
                      <p className="text-sm">To provide real estate services, property recommendations, and respond to your inquiries.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">2</div>
                    <div>
                      <p className="font-semibold text-foreground">Communication</p>
                      <p className="text-sm">To send property updates, market insights, and respond to your messages.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">3</div>
                    <div>
                      <p className="font-semibold text-foreground">Marketing</p>
                      <p className="text-sm">To send newsletters and promotional materials (with your consent).</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">4</div>
                    <div>
                      <p className="font-semibold text-foreground">Analytics</p>
                      <p className="text-sm">To improve our website, services, and user experience.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">5</div>
                    <div>
                      <p className="font-semibold text-foreground">Legal Compliance</p>
                      <p className="text-sm">To comply with legal obligations and protect our rights.</p>
                    </div>
                  </div>
                </div>
              </Section>

              <Section id="data-sharing" icon={Globe} title="Data Sharing & Disclosure">
                <p>
                  We do not sell your personal information. We may share your data with trusted third parties in the following circumstances:
                </p>
                <div className="space-y-3 mt-4">
                  <div className="border-l-2 border-primary/30 pl-4">
                    <p className="font-semibold text-foreground">Service Providers</p>
                    <p className="text-sm">Email services, analytics platforms, and CRM systems that help us operate our business.</p>
                  </div>
                  <div className="border-l-2 border-primary/30 pl-4">
                    <p className="font-semibold text-foreground">Legal Requirements</p>
                    <p className="text-sm">When required by law, court order, or government regulation.</p>
                  </div>
                  <div className="border-l-2 border-primary/30 pl-4">
                    <p className="font-semibold text-foreground">Business Partners</p>
                    <p className="text-sm">Property developers, mortgage brokers, and legal advisors (with your consent).</p>
                  </div>
                </div>
              </Section>

              <Section id="your-rights" icon={Shield} title="Your Rights">
                <p>Under GDPR and Spanish data protection law, you have the following rights:</p>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-1">Right to Access</p>
                    <p className="text-sm">Request a copy of your personal data we hold.</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-1">Right to Rectification</p>
                    <p className="text-sm">Correct inaccurate or incomplete data.</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-1">Right to Erasure</p>
                    <p className="text-sm">Request deletion of your personal data.</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-1">Right to Object</p>
                    <p className="text-sm">Object to processing of your data for marketing.</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-1">Right to Portability</p>
                    <p className="text-sm">Receive your data in a structured format.</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold text-foreground mb-1">Right to Withdraw Consent</p>
                    <p className="text-sm">Withdraw consent for data processing anytime.</p>
                  </div>
                </div>
                <p className="mt-4">
                  To exercise any of these rights, please contact us at{" "}
                  <a href="mailto:info@delsolprimehomes.com" className="text-primary hover:underline">
                    info@delsolprimehomes.com
                  </a>
                </p>
              </Section>

              <Section id="cookies" icon={Cookie} title="Cookies & Tracking Technologies">
                <p>
                  We use cookies and similar tracking technologies to enhance your browsing experience and analyze website traffic.
                </p>
                <div className="space-y-3 mt-4">
                  <div className="bg-muted/20 p-3 rounded">
                    <p className="font-semibold text-foreground text-sm mb-1">Essential Cookies</p>
                    <p className="text-sm">Required for website functionality and security.</p>
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <p className="font-semibold text-foreground text-sm mb-1">Analytics Cookies</p>
                    <p className="text-sm">Help us understand how visitors interact with our website.</p>
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <p className="font-semibold text-foreground text-sm mb-1">Marketing Cookies</p>
                    <p className="text-sm">Used to track visitors across websites for advertising purposes.</p>
                  </div>
                </div>
                <p className="mt-4 text-sm">
                  You can control cookies through your browser settings. However, disabling cookies may affect website functionality.
                </p>
              </Section>

              <Section id="security" icon={Lock} title="Data Security Measures">
                <p>
                  We implement appropriate technical and organizational measures to protect your personal data:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                  <li>SSL encryption for data transmission</li>
                  <li>Secure servers with restricted access</li>
                  <li>Regular security audits and updates</li>
                  <li>Employee training on data protection</li>
                  <li>Limited access to personal data on a need-to-know basis</li>
                </ul>
                <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded mt-4">
                  <p className="text-sm text-foreground">
                    While we strive to protect your data, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
                  </p>
                </div>
              </Section>

              <Section id="international" icon={Globe} title="International Data Transfers">
                <p>
                  Your information may be transferred to and processed in countries outside the European Economic Area (EEA). We ensure adequate safeguards are in place:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                  <li>Standard Contractual Clauses approved by the European Commission</li>
                  <li>Adequacy decisions for countries with equivalent data protection laws</li>
                  <li>Binding Corporate Rules for international transfers</li>
                </ul>
              </Section>

              <Section id="children" icon={Users} title="Children's Privacy">
                <p>
                  Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
                </p>
                <p className="mt-3">
                  If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately so we can delete such data.
                </p>
              </Section>

              <Section id="changes" icon={FileText} title="Changes to This Privacy Policy">
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons.
                </p>
                <p className="mt-3">
                  We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this policy periodically.
                </p>
              </Section>

              <Section id="contact" icon={Mail} title="Contact Information">
                <p>
                  If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
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
                    You also have the right to lodge a complaint with the Spanish Data Protection Authority (AEPD) if you believe your data protection rights have been violated.
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
            <h2 className="text-3xl font-bold">Questions About Your Privacy?</h2>
            <p className="text-muted-foreground">
              We're committed to transparency and protecting your personal information. If you have any questions or concerns, our team is here to help.
            </p>
            <Button size="lg" asChild>
              <a href="mailto:info@delsolprimehomes.com">Contact Us</a>
            </Button>
          </div>
        </div>
      </section>

      <BlogFooter />
    </div>
  );
};

export default PrivacyPolicy;
