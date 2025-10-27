/**
 * Send custom events to GA4
 */
export function trackEvent(
  eventName: string, 
  eventParams?: Record<string, any>
) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
    console.log('📊 GA4 Event:', eventName, eventParams);
  }
}

/**
 * Track conversions (form submissions, purchases, etc.)
 */
export function trackConversion(
  conversionName: string,
  value?: number,
  currency: string = 'EUR'
) {
  trackEvent('conversion', {
    send_to: conversionName,
    value: value,
    currency: currency
  });
}

/**
 * Track outbound link clicks
 */
export function trackOutboundLink(url: string, label?: string) {
  trackEvent('click', {
    event_category: 'outbound',
    event_label: label || url,
    value: url
  });
}

/**
 * Track article views
 */
export function trackArticleView(
  articleId: string,
  articleTitle: string,
  language: string,
  funnelStage: string
) {
  trackEvent('view_item', {
    item_id: articleId,
    item_name: articleTitle,
    item_category: funnelStage,
    item_variant: language
  });
}

/**
 * Track search queries
 */
export function trackSearch(searchTerm: string, resultsCount: number) {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount
  });
}

/**
 * Track form submissions
 */
export function trackFormSubmission(formName: string, formData?: Record<string, any>) {
  trackEvent('generate_lead', {
    form_name: formName,
    ...formData
  });
}

/**
 * Track user engagement time
 */
export function trackEngagement(timeOnPage: number, scrollDepth: number) {
  trackEvent('user_engagement', {
    engagement_time_msec: timeOnPage,
    scroll_depth: scrollDepth
  });
}
