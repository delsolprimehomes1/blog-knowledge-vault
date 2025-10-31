import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { HERO_IMAGES, type HeroImage } from "@/lib/heroImageSchemas";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  children?: React.ReactNode;
}

export function HeroCarousel({ children }: HeroCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Custom autoplay implementation
  useEffect(() => {
    if (!api || isHovered) return;

    const intervalId = setInterval(() => {
      api.scrollNext();
    }, 6000);

    return () => clearInterval(intervalId);
  }, [api, isHovered]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  return (
    <div 
      className="absolute inset-0 bg-gradient-radial-luxury"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <Carousel
        setApi={setApi}
        opts={{
          loop: true,
          duration: 40,
        }}
        className="w-full h-full"
      >
        <CarouselContent className="h-full -ml-0">
          {HERO_IMAGES.map((image: HeroImage, index) => (
            <CarouselItem key={image.id} className="h-full pl-0">
              <div className="relative w-full h-full overflow-hidden">
                {/* Background Image with Ken Burns Effect */}
                <img
                  src={image.src}
                  alt={image.alt}
                  className="absolute inset-0 w-full h-full object-cover ken-burns-effect"
                  style={{
                    animationDelay: `${index * 0.5}s`,
                  }}
                  loading={index === 0 ? "eager" : "lazy"}
                />

                {/* Gradient Overlay - Enhanced with center spotlight */}
                <div className="absolute inset-0 bg-gradient-luxury-overlay" />

                {/* Category Label */}
                <div className="absolute top-24 left-4 md:top-32 md:left-8 z-10 hidden md:block">
                  <span className="inline-block px-4 py-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full text-primary text-sm font-semibold">
                    {image.caption}
                  </span>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Content Overlay */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {children}
        </div>


        {/* Scroll Indicator */}
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-30 pointer-events-none">
          <ChevronDown className="w-6 h-6 md:w-8 md:h-8 text-white/60" />
        </div>
      </Carousel>
    </div>
  );
}
