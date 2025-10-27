import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    } else if (consent === 'accepted') {
      // Enable analytics
      enableAnalytics();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
    enableAnalytics();
    // Reload to initialize analytics
    window.location.reload();
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  const enableAnalytics = () => {
    // Grant consent to GA4
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-50 animate-in slide-in-from-bottom duration-500">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          We use cookies to analyze site traffic and improve your experience.{' '}
          <Link to="/privacy-policy" className="text-primary underline hover:text-primary/80">
            Learn more
          </Link>
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleDecline}>
            Decline
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
