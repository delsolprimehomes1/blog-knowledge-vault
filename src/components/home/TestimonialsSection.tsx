import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export interface Testimonial {
  name: string;
  country: string;
  rating: number;
  quote: string;
  propertyType: string;
  date: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "James & Sarah M.",
    country: "United Kingdom",
    rating: 5,
    quote: "Our experience buying in Marbella was incredible. The team guided us through every step, from viewings to final paperwork. Their multilingual support made everything seamless.",
    propertyType: "Beachfront Apartment",
    date: "2024-11-01"
  },
  {
    name: "Henrik L.",
    country: "Sweden",
    rating: 5,
    quote: "Professional, knowledgeable, and genuinely caring. They found us the perfect villa in Estepona and handled all the legal complexities with ease.",
    propertyType: "Luxury Villa",
    date: "2024-09-15"
  },
  {
    name: "Claudia & Franz B.",
    country: "Germany",
    rating: 5,
    quote: "We felt supported throughout the entire purchase process. The team's local expertise and attention to detail made our dream of owning property in Spain a reality.",
    propertyType: "Modern Townhouse",
    date: "2024-10-22"
  },
  {
    name: "Anna K.",
    country: "Poland",
    rating: 5,
    quote: "Exceptional service from start to finish. Communication in my native language was invaluable, and they helped navigate all the legal requirements smoothly.",
    propertyType: "Coastal Apartment",
    date: "2024-08-10"
  }
];

export function generateTestimonialSchema(testimonial: Testimonial) {
  return {
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": testimonial.name
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": testimonial.rating,
      "bestRating": "5",
      "worstRating": "1"
    },
    "reviewBody": testimonial.quote,
    "datePublished": testimonial.date,
    "itemReviewed": {
      "@type": "RealEstateAgent",
      "name": "Del Sol Prime Homes"
    }
  };
}

const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => (
  <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full">
    <CardContent className="p-6 flex flex-col h-full">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-primary text-primary" />
        ))}
      </div>
      
      <p className="text-white/90 text-sm leading-relaxed mb-6 flex-grow">
        "{testimonial.quote}"
      </p>
      
      <div className="border-t border-white/10 pt-4">
        <p className="text-white font-semibold text-sm">{testimonial.name}</p>
        <p className="text-white/60 text-xs">{testimonial.country} • {testimonial.propertyType}</p>
      </div>
    </CardContent>
  </Card>
);

export function TestimonialsSection() {
  return (
    <section className="w-full max-w-6xl mb-16 px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-headline font-bold text-white mb-3">
          Trusted by International Buyers
        </h2>
        <p className="text-white/70 text-lg">
          Real experiences from clients who found their Costa del Sol property with us
        </p>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {TESTIMONIALS.map((testimonial, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <TestimonialCard testimonial={testimonial} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </section>
  );
}
