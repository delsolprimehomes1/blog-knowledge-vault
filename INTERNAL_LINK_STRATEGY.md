# Internal Link Strategy & Best Practices

## Overview

This document outlines the internal linking strategy for maximizing crawlability, user experience, and AI discoverability across the blog content.

---

## Core Principles

### 1. **Maximum Link Depth: 3 Clicks from Homepage**

Every published article must be reachable within 3 clicks from the homepage:

```
Homepage (/) → Blog Index (/blog) → Article → Related Article (max 3 clicks)
```

**Why it matters:**
- Improves crawlability for search engines and AI agents
- Better PageRank distribution across content
- Enhanced user navigation and content discovery

### 2. **Required Link Patterns (Per Article)**

Every article must include:

#### a) Parent Category Link (1 required)
- **Format:** `/blog/category/{category-slug}`
- **Example:** For "Buying Guides" → link to `/blog/category/buying-guides`
- **Placement:** Early in article (first 2 paragraphs) or breadcrumb navigation

```html
<a href="/blog/category/buying-guides">Browse more Buying Guides</a>
```

#### b) Related Article Link (1+ required)
- Same category OR adjacent funnel stage
- **Example:** TOFU article → link to MOFU article in same category
- **Placement:** Contextually within detailed_content

```html
Learn more about <a href="/blog/costa-del-sol-investment-guide">investment strategies</a> in our comprehensive guide.
```

#### c) Service/Conversion Link (1 required)
- One of: `/about`, `/faq`, `/qa`, `/case-studies`
- **Placement:** Near end of article or in CTA section

**Funnel-Based Recommendations:**
- **TOFU (Awareness):** Link to `/faq` — Help users understand basics
- **MOFU (Consideration):** Link to `/case-studies` — Show proof and examples
- **BOFU (Decision):** Link to `/about` — Encourage contact and conversion

```html
<a href="/case-studies">See how we've helped other buyers</a>
```

### 3. **Optimal Internal Link Density**

**Target:** 5-7 internal links per article

**Breakdown:**
- 1 parent category link
- 2-3 related article links (same category or related topics)
- 1 service/conversion link
- 1-2 additional contextual links

**Avoid:**
- Fewer than 3 internal links (hurts crawlability)
- More than 10 internal links (dilutes link equity)

---

## Link Quality Guidelines

### Use Descriptive Anchor Text

❌ **Bad:**
```html
Learn more <a href="/blog/article">here</a>
```

✅ **Good:**
```html
Learn more about <a href="/blog/costa-del-sol-property-taxes">property taxes in Costa del Sol</a>
```

### Prioritize Relevant Links

- Link to articles in the same category first
- Consider funnel stage progression (TOFU → MOFU → BOFU)
- Use AI-powered link finder for contextual suggestions

### Avoid Over-Optimization

- Don't force exact-match keywords in every anchor text
- Vary anchor text for the same target URL
- Keep anchor text natural and conversational

---

## Tools & Workflow

### 1. **Internal Link Finder (Article Editor)**

**Location:** `/admin/article-editor/:id` → Internal Links Section

**Features:**
- AI-powered suggestions using Perplexity
- Relevance scoring (0-100)
- Funnel stage matching
- One-click addition to article

**Usage:**
1. Open article in editor
2. Click "Find Relevant Articles"
3. Review AI suggestions with context
4. Click "Add Link" for relevant matches
5. Save article

### 2. **Link Health Dashboard (Admin)**

**Location:** `/admin/ai-tools` → Link Health Dashboard

**Monitors:**
- Link depth distribution
- Pattern compliance (parent category, related, service links)
- Active alerts (broken links, orphan articles)
- Average link health score

**Actions:**
- Run full validation (all articles)
- View detailed recommendations
- Track compliance over time

### 3. **Batch Link Validator**

**Location:** `/admin/ai-tools` → Batch Link Validator

**Features:**
- Validate all articles in one click
- Identify broken internal links
- Calculate link health scores (A-F grades)
- Export validation reports

**Schedule:** Run weekly or after bulk content updates

---

## Automated Monitoring

### Weekly Validation Job

A Supabase cron job runs every **Sunday at 3 AM** to:
1. Validate all published articles
2. Check for broken links
3. Verify pattern compliance
4. Generate alerts for critical issues

### Alert Types

| Alert Type | Severity | Trigger Condition |
|------------|----------|-------------------|
| `broken_links` | Critical | >5 broken links in one article |
| `low_score` | Warning | Link health score <70 |
| `missing_patterns` | Warning | Missing required link patterns |
| `high_depth` | Warning | Article >3 clicks from homepage |

**Alert Actions:**
- View in Link Health Dashboard → Alerts tab
- Receive notifications (if configured)
- Auto-resolve when validation passes

---

## Troubleshooting

### Issue: Broken Internal Links

**Symptoms:**
- 404 errors when clicking article links
- Validation shows broken link count >0

**Solution:**
1. Run Batch Link Validator
2. Review broken links list
3. Update article content to fix or remove links
4. Re-run validation to confirm

**Prevention:**
- Never delete articles without checking backlinks
- Use canonical URLs for renamed articles
- Run validation before major content updates

---

### Issue: Orphan Articles (Not Reachable)

**Symptoms:**
- Link Depth Analysis shows orphan articles
- Article not appearing in site navigation

**Solution:**
1. Add links from Blog Index or category pages
2. Add cross-links from related high-traffic articles
3. Verify link depth reduces to ≤3 clicks

---

### Issue: Low Pattern Compliance

**Symptoms:**
- Pattern compliance <90%
- Missing parent category or service links

**Solution:**
1. Use auto-inject edge function (coming soon)
2. Manually add required links in article editor
3. Follow template: parent category → related article → service link

---

## Category Pages

### Available Categories

1. `/blog/category/buying-guides`
2. `/blog/category/investment-strategies`
3. `/blog/category/legal-regulations`
4. `/blog/category/location-insights`
5. `/blog/category/market-analysis`
6. `/blog/category/property-management`

### Purpose

- Act as hub pages for related articles
- Improve internal link graph structure
- Reduce average link depth
- Enhance topical authority

### Best Practices

- Link to category page in first paragraph of each article
- Use descriptive anchor text: "Browse all [Category Name] articles"
- Include category breadcrumb navigation

---

## Maintenance Schedule

### Daily
- Monitor alerts in Link Health Dashboard

### Weekly
- Review Link Health Dashboard overview
- Check pattern compliance trends
- Validate new articles

### Monthly
- Run full batch validation
- Analyze link depth report
- Update linking best practices
- Review orphan articles

### Quarterly
- Audit overall link graph structure
- Identify high-performing link hubs
- Optimize link placement based on analytics
- Update this strategy document

---

## Success Metrics

### Target KPIs

| Metric | Target | Current |
|--------|--------|---------|
| Average Link Depth | ≤2.5 clicks | TBD |
| Pattern Compliance | 100% | TBD |
| Link Health Score | ≥95/100 | TBD |
| Orphan Articles | 0 | TBD |
| Broken Links | 0 | TBD |

### AI Discoverability Impact

**Before Phase 7:**
- Crawlability Score: 88/100 (B+)

**After Phase 7 (Target):**
- Crawlability Score: 90/100 (A-)
- AI Discoverability Score: **100/100 (A+)**

---

## Support & Contact

For questions about internal linking strategy:
- Review this guide first
- Check Link Health Dashboard for automated recommendations
- Run Batch Link Validator for detailed reports

---

**Last Updated:** 2025-01-31  
**Version:** 1.0.0  
**Maintained By:** SEO & Content Team
