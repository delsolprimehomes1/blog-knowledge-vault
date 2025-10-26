import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail } from "lucide-react";

export const CompanyContactSection = () => {
  return (
    <section className="my-8">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="p-6 md:p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Get in Touch with Del Sol Prime Homes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Address */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2 group">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Address</h3>
              </div>
              <address className="not-italic text-muted-foreground leading-relaxed">
                Calle Alfonso XIII, 6-1º<br />
                Fuengirola<br />
                Costa del Sol, Spain
              </address>
            </div>

            {/* Phone */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2 group">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Phone</h3>
              </div>
              <a
                href="tel:+34613578416"
                className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium"
              >
                +34 613 578 416
              </a>
            </div>

            {/* Email */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2 group">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Email</h3>
              </div>
              <a
                href="mailto:info@delsolprimehomes.com"
                className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium break-all"
              >
                info@delsolprimehomes.com
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-primary/10">
            <p className="text-center text-sm text-muted-foreground">
              Your trusted partner for premium properties on Costa del Sol
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
