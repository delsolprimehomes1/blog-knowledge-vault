import { Star, MapPin, Phone, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function GoogleBusinessWidget() {
  const rating = 4.8;
  const reviewCount = 127;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-lg mb-1">Del Sol Prime Homes</h3>
            <p className="text-white/60 text-sm">Real Estate Agency</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              {[...Array(fullStars)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
              {hasHalfStar && (
                <Star className="w-4 h-4 fill-primary/50 text-primary" />
              )}
            </div>
            <p className="text-white font-bold text-sm">
              {rating} <span className="text-white/60 font-normal">({reviewCount} reviews)</span>
            </p>
          </div>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-white">Calle Alfonso XIII, 6-1º</p>
              <p className="text-white/70">Fuengirola, Costa del Sol, 29640</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-primary flex-shrink-0" />
            <a 
              href="tel:+34613578416" 
              className="text-white/90 hover:text-primary transition-colors text-sm"
            >
              +34-613-578-416
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-primary flex-shrink-0" />
            <a 
              href="mailto:info@delsolprimehomes.com" 
              className="text-white/90 hover:text-primary transition-colors text-sm"
            >
              info@delsolprimehomes.com
            </a>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-white/60 text-xs text-center">
            <span className="font-semibold text-white">Serving Costa del Sol since 1990</span>
            <br />
            API Certified Real Estate Agency
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
