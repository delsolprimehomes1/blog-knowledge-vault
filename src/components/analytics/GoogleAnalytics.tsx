import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function GoogleAnalytics() {
  const location = useLocation();
  const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;

  // Initialize GA4 on mount
  useEffect(() => {
    if (!GA4_MEASUREMENT_ID) {
      console.warn('⚠️ GA4 Measurement ID not found. Analytics will not be tracked.');
      return;
    }

    // Check if user has consented to cookies
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (cookieConsent !== 'accepted') {
      console.log('ℹ️ GA4 disabled - waiting for cookie consent');
      return;
    }

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    // Load GA4 script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Configure GA4
    script.onload = () => {
      window.gtag('js', new Date());
      window.gtag('config', GA4_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
        send_page_view: true
      });
      
      console.log('✅ GA4 initialized:', GA4_MEASUREMENT_ID);
    };

    return () => {
      // Cleanup: remove script if component unmounts
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    };
  }, [GA4_MEASUREMENT_ID]);

  // Track page views on route changes
  useEffect(() => {
    if (!GA4_MEASUREMENT_ID || typeof window.gtag !== 'function') return;

    // Check cookie consent
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (cookieConsent !== 'accepted') return;

    // Send pageview event
    window.gtag('config', GA4_MEASUREMENT_ID, {
      page_path: location.pathname + location.search,
      page_title: document.title,
      page_location: window.location.href
    });

    console.log('📊 GA4 Pageview:', location.pathname);
  }, [location, GA4_MEASUREMENT_ID]);

  return null; // This component doesn't render anything
}
