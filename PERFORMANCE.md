# Performance Optimization Guide

This document outlines the performance optimizations implemented in this project to achieve Lighthouse scores of 95+ and excellent Core Web Vitals.

## Implemented Optimizations

### 1. Image Optimization

**OptimizedImage Component** (`src/components/OptimizedImage.tsx`)
- Progressive loading with fade-in animation
- Explicit width/height to prevent Cumulative Layout Shift (CLS)
- Native lazy loading with `loading="lazy"` attribute
- Async decoding with `decoding="async"`
- Skeleton placeholder during image load
- Priority loading for above-the-fold images

**Usage:**
```tsx
<OptimizedImage
  src={imageUrl}
  alt="Description"
  width={1200}
  height={675}
  priority={true} // For above-the-fold images only
  className="w-full rounded-lg"
/>
```

**Benefits:**
- Prevents layout shifts (CLS < 0.1)
- Faster perceived load time
- Reduced bandwidth usage
- Better user experience

### 2. Code Splitting

**Lazy-Loaded Components:**

1. **RichTextEditor** (`src/components/LazyRichTextEditor.tsx`)
   - Heavy TipTap editor only loads when needed in admin panel
   - Shows skeleton loader during load
   - Reduces initial bundle size by ~200KB

2. **ChatbotWidget** (already implemented)
   - Only loads on BOFU articles
   - Conditional rendering based on article type
   - Reduces bundle for non-conversion pages

**Usage:**
```tsx
import { LazyRichTextEditor } from "@/components/LazyRichTextEditor";

// Component loads on-demand with Suspense fallback
<LazyRichTextEditor 
  content={content}
  onChange={setContent}
/>
```

### 3. Font Optimization

**Implementation in `index.html`:**
- Preconnect to Google Fonts domains
- Preload critical font files
- `font-display: swap` to prevent FOIT (Flash of Invisible Text)
- Only load required weights (400, 600, 700)
- Async CSS loading for non-critical fonts

**Benefits:**
- First Contentful Paint (FCP) < 1.8s
- No font-related layout shifts
- Faster text rendering

### 4. Resource Prefetching

**Prefetch Utilities** (`src/lib/prefetch.ts`)

Functions:
- `prefetchImage(url)` - Preload images on hover
- `prefetchArticle(slug)` - Prefetch article pages
- `dnsPrefetch(domain)` - DNS lookup for external domains

**Implementation:**
```tsx
// In ArticleCard component
onMouseEnter={() => {
  prefetchArticle(article.slug);
  prefetchImage(article.featured_image_url);
}}
```

**Benefits:**
- Near-instant navigation on hover
- Reduced perceived load time
- Better user experience

### 5. DNS Prefetching

**Configured in `index.html`:**
```html
<link rel="dns-prefetch" href="https://kazggnufaoicopvmwhdl.supabase.co">
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://fonts.gstatic.com">
```

**Benefits:**
- Faster external resource loading
- Reduced DNS lookup time
- Better Time to First Byte (TTFB)

## Core Web Vitals Targets

### ✅ LCP (Largest Contentful Paint)
**Target: < 2.5s**

Optimizations:
- Featured images use `OptimizedImage` with priority loading
- Above-the-fold content prioritized
- Lazy loading for below-fold images
- Image dimensions prevent reflows

### ✅ FID (First Input Delay)
**Target: < 100ms**

Optimizations:
- Code splitting reduces JavaScript execution time
- Heavy components lazy-loaded
- Minimal third-party scripts
- Async loading for non-critical resources

### ✅ CLS (Cumulative Layout Shift)
**Target: < 0.1**

Optimizations:
- Explicit dimensions on all images
- Font-display: swap prevents font-related shifts
- Reserved space for dynamic content
- Skeleton loaders for loading states

## Testing Performance

### Local Testing
1. Open Chrome DevTools
2. Navigate to Lighthouse tab
3. Run audit in incognito mode
4. Check all Core Web Vitals metrics

### Production Testing
- Use [PageSpeed Insights](https://pagespeed.web.dev/)
- Monitor [Web Vitals Chrome Extension](https://chrome.google.com/webstore/detail/web-vitals/)
- Review Real User Monitoring (RUM) data

## Performance Checklist

Before publishing an article:
- [ ] Featured image is optimized and has dimensions
- [ ] All images use `OptimizedImage` component
- [ ] Above-the-fold content loads first (priority images)
- [ ] No unused JavaScript in bundle
- [ ] External resources are prefetched
- [ ] Run Lighthouse audit (score 95+)
- [ ] Check Core Web Vitals pass all thresholds

## Best Practices

### Images
- Always use `OptimizedImage` component
- Provide width and height attributes
- Use `priority={true}` for above-the-fold only
- Optimize image file sizes (use WebP when possible)
- Use appropriate dimensions (don't load 4K for 400px display)

### Components
- Lazy load heavy components (editors, charts, large libraries)
- Use Suspense with meaningful fallbacks
- Monitor bundle size with build analyzer

### Third-Party Scripts
- Minimize external dependencies
- Use DNS prefetch for external domains
- Load scripts async/defer when possible
- Consider self-hosting critical resources

## Monitoring

### Key Metrics to Track
- **LCP**: Should be < 2.5s for 75% of page loads
- **FID**: Should be < 100ms for 75% of interactions
- **CLS**: Should be < 0.1 for 75% of page loads
- **Bundle Size**: Monitor JavaScript bundle size
- **Load Time**: Full page load < 3s on 4G

### Tools
- Google Lighthouse (DevTools)
- PageSpeed Insights
- Web Vitals Chrome Extension
- Webpack Bundle Analyzer
- Chrome DevTools Performance tab

## Future Optimizations

Potential improvements:
- [ ] Add Service Worker for offline support
- [ ] Implement image CDN with automatic format conversion
- [ ] Add HTTP/2 Server Push for critical resources
- [ ] Implement critical CSS extraction
- [ ] Add resource hints for third-party domains
- [ ] Consider using native lazy loading for iframes

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [React Performance Optimization](https://react.dev/learn/render-and-commit#optimizing-performance)
- [Image Optimization Best Practices](https://web.dev/fast/#optimize-your-images)
