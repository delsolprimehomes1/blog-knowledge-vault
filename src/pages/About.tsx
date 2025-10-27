import { Building2, Users, Shield, MapPin, Heart, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompanyContactSection } from "@/components/blog-article/CompanyContactSection";
import { Link } from "react-router-dom";
import costadelsolBg from "@/assets/costa-del-sol-bg.jpg";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center">
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
            <div className="space-y-6">
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

      {/* Why Choose Us Section */}
      <section className="py-12 md:py-20">
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
