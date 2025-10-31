import { Shield, Clock, Globe } from "lucide-react";

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard = ({ icon: Icon, title, description, delay }: FeatureCardProps) => (
  <div
    className="group p-6 md:p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 
               hover:bg-white/10 hover:border-primary/50 transition-all duration-500 animate-fade-in-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex flex-col items-center text-center gap-4">
      <div className="p-4 rounded-full bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="text-white/80 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

export function FeatureCards() {
  const features = [
    {
      icon: Shield,
      title: "Licensed Experts",
      description: "Fully licensed real estate agency verified by industry experts with proven track record on the Costa del Sol",
    },
    {
      icon: Clock,
      title: "35+ Years Experience",
      description: "Over three decades of excellence guiding international buyers through Spanish property investment",
    },
    {
      icon: Globe,
      title: "Multilingual Support",
      description: "Comprehensive support in multiple languages ensuring seamless communication for global clients",
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 md:px-8 mb-16">
      <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12 speakable-headline">
        Why Choose <span className="text-primary">Del Sol Prime Homes</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            delay={index * 100}
          />
        ))}
      </div>
    </section>
  );
}
