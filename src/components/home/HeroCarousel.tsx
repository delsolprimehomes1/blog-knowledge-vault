import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
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

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  return (
    <div 
      className="absolute inset-0"
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
        plugins={[
          Autoplay({
            delay: 6000,
            stopOnInteraction: false,
            stopOnMouseEnter: isHovered,
          }),
        ]}
        className="w-full h-full"
      >
        <CarouselContent className="h-full">
          {HERO_IMAGES.map((image: HeroImage, index) => (
            <CarouselItem key={image.id} className="h-full">
              <div className="relative w-full h-full">
                {/* Background Image with Ken Burns Effect */}
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat ken-burns-effect"
                  style={{
                    backgroundImage: `url(${image.src})`,
                    animationDelay: `${index * 0.5}s`,
                  }}
                  role="img"
                  aria-label={image.alt}
                />

                {/* Gradient Overlay - Stronger on mobile for text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 md:from-black/60 md:via-transparent md:to-black/60" />

                {/* Optional: Category Label */}
                <div className="absolute top-24 left-4 md:top-32 md:left-8 z-10 opacity-0 md:opacity-100">
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

        {/* Progress Indicators */}
        <div className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-30 pointer-events-auto">
          {HERO_IMAGES.map((image, index) => (
            <button
              key={image.id}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-2 md:h-3 rounded-full transition-all duration-500 hover:bg-primary/80",
                index === current
                  ? "bg-primary w-8 md:w-12"
                  : "bg-white/40 w-2 md:w-3 hover:w-4 md:hover:w-6"
              )}
              aria-label={`Go to ${image.caption} image`}
            />
          ))}
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-30 pointer-events-none">
          <ChevronDown className="w-6 h-6 md:w-8 md:h-8 text-white/60" />
        </div>
      </Carousel>
    </div>
  );
}
