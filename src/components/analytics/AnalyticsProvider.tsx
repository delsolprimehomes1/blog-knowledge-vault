import { GoogleAnalytics } from './GoogleAnalytics';
import { GoogleTagManager } from './GoogleTagManager';

/**
 * AnalyticsProvider
 * 
 * Loads both GA4 and GTM (if configured) on every page.
 * Place this component once at the root level of your app.
 */
export function AnalyticsProvider() {
  const hasGA4 = !!import.meta.env.VITE_GA4_MEASUREMENT_ID;
  const hasGTM = !!import.meta.env.VITE_GTM_CONTAINER_ID;

  if (!hasGA4 && !hasGTM) {
    console.warn('⚠️ No analytics configured. Add VITE_GA4_MEASUREMENT_ID or VITE_GTM_CONTAINER_ID to environment variables.');
    return null;
  }

  return (
    <>
      {hasGA4 && <GoogleAnalytics />}
      {hasGTM && <GoogleTagManager />}
    </>
  );
}
