# AEO (Answer Engine Optimization) Checklist

## Purpose
This checklist ensures all pages meet Answer Engine Optimization (AEO) standards for maximum AI citation likelihood by AI systems like ChatGPT, Perplexity, Google SGE, and Bing Copilot.

**Target AI Citation Likelihood: 85-95%**

---

## Universal Requirements (All Pages)

### ✅ Meta Tags
- [ ] `<title>` tag (50-60 characters, includes main keyword)
- [ ] `<meta name="description">` (150-160 characters, natural keyword integration)
- [ ] `<link rel="canonical">` (absolute URL)
- [ ] `<meta name="robots" content="index, follow">` (or "noindex, follow" for 404s)
- [ ] `<meta http-equiv="content-language">` (e.g., "en-GB")

### ✅ Open Graph Tags
- [ ] `og:title`
- [ ] `og:description`
- [ ] `og:image` (1200x630px recommended)
- [ ] `og:url` (canonical URL)
- [ ] `og:type` (website, article, etc.)
- [ ] `og:site_name`

### ✅ Twitter Card Tags
- [ ] `twitter:card` (summary_large_image)
- [ ] `twitter:title`
- [ ] `twitter:description`
- [ ] `twitter:image`

### ✅ JSON-LD Schemas (Minimum)
- [ ] **Organization schema** (on all pages)
- [ ] **WebPage schema** (specific to page type)
- [ ] **BreadcrumbList schema** (navigation context)

### ✅ Heading Hierarchy
- [ ] Exactly one H1 (page title, 40-70 chars)
- [ ] H1 is the first heading on the page
- [ ] Logical H2 → H3 structure (no level skipping)
- [ ] Descriptive headings (not generic)

### ✅ Semantic HTML
- [ ] Use `<header>`, `<main>`, `<section>`, `<article>`, `<nav>`, `<footer>`
- [ ] Proper nesting of semantic elements
- [ ] `<main>` tag contains primary content

### ✅ Analytics Tracking
- [ ] GA4 pageview tracking (automatic via AnalyticsProvider)
- [ ] GTM container loaded (if configured)
- [ ] Custom event tracking for key actions

---

## Page-Specific Requirements

### 📄 Blog Articles (Target: 90-95% AI Citation)

#### Required Schemas
- [ ] BlogPosting / Article schema
- [ ] Organization schema
- [ ] BreadcrumbList schema
- [ ] SpeakableSpecification schema
- [ ] FAQPage schema (if FAQs present)
- [ ] Person schema (author)

#### Content Requirements
- [ ] Word count: 1,500+ words
- [ ] Featured image with alt text
- [ ] Author bio with credentials
- [ ] Publication date and last modified date
- [ ] External citations (3-7 high-authority sources)
- [ ] Internal links (2-4 relevant articles)
- [ ] FAQ section (5-8 questions)
- [ ] Table of contents for articles >2000 words

#### E-E-A-T Signals
- [ ] Author byline with expertise
- [ ] Reviewer (if applicable)
- [ ] Trust signals (licensed, years in business)
- [ ] Legal references and disclaimers
- [ ] Citation provenance (where info came from)

#### Speakable Content
- [ ] SpeakableBox component with concise answer (150-300 chars)
- [ ] Speakable schema pointing to answer

---

### 📖 Legal Pages (Privacy Policy, Terms of Service) (Target: 75-85%)

#### Required Schemas
- [ ] WebPage schema (type: FAQPage)
- [ ] Organization schema
- [ ] BreadcrumbList schema
- [ ] FAQPage schema (extracted from content)
- [ ] SpeakableSpecification schema

#### Content Requirements
- [ ] Clear H1 title
- [ ] Last updated date badge
- [ ] Table of contents (sidebar)
- [ ] FAQ accordion with 5-7 questions
- [ ] Speakable summary (150-250 chars)
- [ ] Contact information for data/legal inquiries

#### Specific to Privacy Policy
- [ ] GDPR compliance statement
- [ ] Cookie policy section
- [ ] User rights (access, deletion, portability)
- [ ] Data retention periods
- [ ] Third-party data sharing disclosure

#### Specific to Terms of Service
- [ ] Service description
- [ ] User responsibilities
- [ ] Limitation of liability
- [ ] Dispute resolution process
- [ ] Governing law (Spain)

---

### 📋 Blog Index / Collection Page (Target: 75-85%)

#### Required Schemas
- [ ] CollectionPage schema
- [ ] BreadcrumbList schema
- [ ] ItemList schema (list of articles with metadata)
- [ ] Organization schema
- [ ] SpeakableSpecification schema

#### Content Requirements
- [ ] H1: Descriptive collection title
- [ ] Hero section with speakable description
- [ ] Filter/search functionality
- [ ] Article cards with featured images
- [ ] Pagination (if more than 10 articles)
- [ ] Category taxonomy

#### Speakable Content
- [ ] Brief description of what readers will find (200-300 chars)

---

### ℹ️ About Page (Target: 80-90%)

#### Required Schemas
- [ ] AboutPage schema
- [ ] Organization schema (LocalBusiness + RealEstateAgent)
- [ ] BreadcrumbList schema
- [ ] FAQPage schema
- [ ] SpeakableSpecification schema
- [ ] ItemList schema (services)
- [ ] ServiceArea schema (geographic coverage)

#### Content Requirements
- [ ] H1: "About [Company Name]"
- [ ] Mission statement
- [ ] Core values and differentiators
- [ ] Team section (if applicable)
- [ ] Trust signals (licensed, years active, languages)
- [ ] Service list with descriptions
- [ ] Service area (geographic)
- [ ] FAQ section (5-7 questions)
- [ ] Contact CTA

#### E-E-A-T Signals
- [ ] Professional licenses (API numbers)
- [ ] Years in business
- [ ] Team credentials
- [ ] Client testimonials (if available)
- [ ] Verification badges

---

### 🏠 Homepage / Landing Pages (Target: 70-80%)

#### Required Schemas
- [ ] WebPage schema (type: WebSite for homepage)
- [ ] Organization schema (LocalBusiness + RealEstateAgent)
- [ ] BreadcrumbList schema (if not homepage)

#### Content Requirements
- [ ] H1: Clear value proposition (50-70 chars)
- [ ] Hero section with CTA
- [ ] Services overview
- [ ] Social proof / testimonials
- [ ] Location information
- [ ] Contact section

---

### 🚫 404 Page (Not Indexed)

#### Required Meta Tags
- [ ] `<meta name="robots" content="noindex, follow">`
- [ ] Title: "404 - Page Not Found | [Site Name]"
- [ ] No canonical tag (or self-referencing)

#### Content Requirements
- [ ] Clear "404" heading
- [ ] Helpful message
- [ ] Link back to homepage
- [ ] Search functionality (optional)
- [ ] Popular pages links

---

## Crawlability Requirements

### robots.txt
- [ ] Allows all major crawlers (Googlebot, Bingbot, etc.)
- [ ] Allows AI crawlers (ChatGPT-User, Claude-Web, etc.)
- [ ] Disallows admin/auth routes
- [ ] Sitemap URL listed

### Sitemap (sitemap.xml)
- [ ] All public pages listed
- [ ] Priority values assigned (0.8-1.0 for important pages)
- [ ] `<lastmod>` dates accurate
- [ ] `<changefreq>` appropriate (daily/weekly/monthly)
- [ ] Dynamic regeneration on content updates

### ai.txt (Optional but Recommended)
- [ ] Training policy specified
- [ ] Citation requirements listed
- [ ] Contact information provided

---

## Performance & Technical

### Page Speed
- [ ] First Contentful Paint (FCP) < 1.8s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Images lazy-loaded where appropriate

### Mobile Optimization
- [ ] Responsive design (all breakpoints)
- [ ] Viewport meta tag configured
- [ ] Touch targets ≥48px
- [ ] Readable font sizes (≥16px base)

### Security
- [ ] HTTPS enabled (SSL certificate)
- [ ] Secure headers (CSP, X-Frame-Options)
- [ ] No mixed content warnings

---

## Validation Tools

### Automatic (Dev Mode)
```tsx
<PageWrapper 
  pageName="Page Name"
  pageType="article | legal | collection | about | landing"
  schemas={generatedSchemas}
  meta={metaData}
>
  {/* Page content */}
</PageWrapper>
```

The PageWrapper automatically validates:
- Heading hierarchy
- Schema presence
- Meta tag completeness
- AEO compliance score

### Manual Testing
- **Schema Validator**: [Google Rich Results Test](https://search.google.com/test/rich-results)
- **Heading Hierarchy**: Browser DevTools → Elements → Search for `<h1>`, `<h2>`, etc.
- **Meta Tags**: View page source → Check `<head>` section
- **Mobile**: Google Mobile-Friendly Test

---

## AEO Score Interpretation

| Score | Status | Action Required |
|-------|--------|----------------|
| 90-100 | ✅ Excellent | None - monitor regularly |
| 80-89 | 👍 Good | Fix minor warnings |
| 70-79 | ⚠️ Needs Improvement | Address all warnings, fix errors |
| 60-69 | ❌ Poor | Critical issues, fix immediately |
| <60 | 🚨 Critical | Page won't be cited by AI |

---

## Pre-Launch Checklist

Before deploying a new page:

1. [ ] Run PageWrapper validation (0 errors)
2. [ ] Test in [Google Rich Results](https://search.google.com/test/rich-results)
3. [ ] Verify heading hierarchy (H1 → H2 → H3)
4. [ ] Check meta tags in page source
5. [ ] Test mobile responsiveness
6. [ ] Verify all links work (no 404s)
7. [ ] Check image alt tags
8. [ ] Test page speed (Lighthouse)
9. [ ] Add to sitemap.xml
10. [ ] Test GA4 tracking (check console logs)

---

## Monthly Maintenance

- [ ] Update `<lastmod>` dates in sitemap for edited pages
- [ ] Review GA4 data for low-performing pages
- [ ] Check for broken external citations
- [ ] Update FAQ sections with new questions
- [ ] Refresh outdated statistics/data
- [ ] Verify all schemas still validate

---

## Resources

- [Schema.org Documentation](https://schema.org/)
- [Google Search Central](https://developers.google.com/search)
- [OpenAI Citation Guidelines](https://help.openai.com/en/articles/6825453-chatgpt-web-browsing-plugin)
- [Perplexity Sources Guide](https://www.perplexity.ai/hub/faq/how-does-perplexity-cite-sources)
- [This Project: HEADING_STANDARDS.md](./HEADING_STANDARDS.md)
