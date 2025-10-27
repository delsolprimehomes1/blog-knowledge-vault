import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export function GoogleTagManager() {
  const location = useLocation();
  const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID;

  // Initialize GTM on mount
  useEffect(() => {
    if (!GTM_CONTAINER_ID) {
      console.warn('⚠️ GTM Container ID not found. Tag Manager will not be loaded.');
      return;
    }

    // Check if user has consented to cookies
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (cookieConsent !== 'accepted') {
      console.log('ℹ️ GTM disabled - waiting for cookie consent');
      return;
    }

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });

    // Load GTM script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Add GTM noscript iframe
    const noscript = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);

    console.log('✅ GTM initialized:', GTM_CONTAINER_ID);

    return () => {
      // Cleanup: remove script if component unmounts
      if (script.parentNode) {
        document.head.removeChild(script);
      }
      if (noscript.parentNode) {
        noscript.parentNode.removeChild(noscript);
      }
    };
  }, [GTM_CONTAINER_ID]);

  // Track page views on route changes
  useEffect(() => {
    if (!GTM_CONTAINER_ID || !window.dataLayer) return;

    // Check cookie consent
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (cookieConsent !== 'accepted') return;

    // Push page view to dataLayer
    window.dataLayer.push({
      event: 'page_view',
      page_path: location.pathname + location.search,
      page_title: document.title,
      page_location: window.location.href
    });

    console.log('📊 GTM Pageview:', location.pathname);
  }, [location, GTM_CONTAINER_ID]);

  return null; // This component doesn't render anything
}
