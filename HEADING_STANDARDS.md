# Heading Hierarchy Standards

## Purpose
Proper heading hierarchy (H1 → H2 → H3) is critical for:
- **SEO**: Search engines use headings to understand page structure and content hierarchy
- **AEO**: AI systems rely on headings to extract structured information for citations
- **Accessibility**: Screen readers use headings for navigation
- **UX**: Logical structure improves readability and content scanability

---

## Rules

### 1. One H1 Per Page
- **Rule**: Every page must have exactly **one H1** heading
- **Location**: The H1 should be the page title and appear near the top
- **Content**: H1 should clearly describe the page's main topic (40-70 characters ideal)

```tsx
// ✅ CORRECT
<h1>Privacy Policy - DelSol Prime Homes</h1>

// ❌ WRONG - Multiple H1s
<h1>Privacy Policy</h1>
<h1>Your Data Rights</h1>
```

### 2. Hierarchical Structure
- **Rule**: Headings must follow a logical hierarchy: H1 → H2 → H3 → H4
- **No Skipping**: Never skip levels (e.g., H1 → H3)

```tsx
// ✅ CORRECT
<h1>Costa del Sol Property Guide</h1>
  <h2>Understanding the Market</h2>
    <h3>Price Trends in 2025</h3>
    <h3>Popular Neighborhoods</h3>
  <h2>Legal Requirements</h2>
    <h3>NIE Number</h3>

// ❌ WRONG - Skipping levels
<h1>Costa del Sol Property Guide</h1>
  <h3>Price Trends</h3> <!-- Skipped H2 -->
```

### 3. Semantic Meaning
- **H1**: Page title / main topic
- **H2**: Major sections of content
- **H3**: Subsections within H2s
- **H4**: Sub-subsections (use sparingly)
- **H5/H6**: Rarely needed, consider restructuring if you need these

### 4. Content Length Guidelines
- **H1**: 40-70 characters (appears in SERPs and AI snippets)
- **H2**: 30-60 characters
- **H3**: 20-50 characters

---

## Examples by Page Type

### Blog Article
```tsx
<h1>How to Buy Property in Costa del Sol: Complete 2025 Guide</h1>
  <h2>Why Choose Costa del Sol?</h2>
  <h2>Step-by-Step Buying Process</h2>
    <h3>1. Obtain Your NIE Number</h3>
    <h3>2. Open a Spanish Bank Account</h3>
    <h3>3. Hire a Property Lawyer</h3>
  <h2>Financing Your Property</h2>
    <h3>Mortgage Options for Non-Residents</h3>
    <h3>Tax Implications</h3>
  <h2>Frequently Asked Questions</h2>
```

### Legal Page (Privacy Policy)
```tsx
<h1>Privacy Policy</h1>
  <h2>Information We Collect</h2>
    <h3>Personal Information</h3>
    <h3>Property Preferences</h3>
    <h3>Technical Data</h3>
  <h2>How We Use Your Information</h2>
  <h2>Your Data Rights</h2>
```

### About Page
```tsx
<h1>About DelSol Prime Homes</h1>
  <h2>Our Mission</h2>
  <h2>Why Choose Us</h2>
    <h3>Licensed Real Estate Agents</h3>
    <h3>Multilingual Team</h3>
    <h3>Local Expertise</h3>
  <h2>Our Services</h2>
    <h3>Property Search</h3>
    <h3>Legal Assistance</h3>
```

### Blog Index
```tsx
<h1>Costa del Sol Property Blog</h1>
  <h2>Latest Articles</h2>
  <h2>Popular Categories</h2>
```

---

## Common Mistakes to Avoid

### ❌ Using Headings for Styling
```tsx
// WRONG - Using H3 just because it looks right
<h3 className="text-sm">Small detail text</h3>

// CORRECT - Use appropriate HTML with classes
<p className="text-sm font-semibold">Small detail text</p>
```

### ❌ Multiple H1s
```tsx
// WRONG
<h1>Privacy Policy</h1>
<section>
  <h1>Data Collection</h1> <!-- Should be H2 -->
</section>
```

### ❌ Skipping Levels
```tsx
// WRONG
<h1>Main Title</h1>
<h3>Subsection</h3> <!-- Missing H2 -->
```

### ❌ Non-Descriptive Headings
```tsx
// WRONG
<h2>Section 1</h2>
<h2>More Information</h2>

// CORRECT
<h2>Property Buying Process</h2>
<h2>Legal Requirements for Foreign Buyers</h2>
```

---

## Validation

### Automatic Validation
All pages wrapped in `<PageWrapper>` automatically validate heading hierarchy in dev mode.

```tsx
import { PageWrapper } from '@/components/PageWrapper';

<PageWrapper pageName="Privacy Policy" pageType="legal">
  {/* Your page content */}
</PageWrapper>
```

### Manual Validation
Use browser DevTools or the heading validator:

```typescript
import { validateHeadingHierarchy, logHeadingValidation } from '@/lib/headingValidator';

const result = validateHeadingHierarchy();
logHeadingValidation(result, 'My Page');
```

---

## Impact on AI Citation

Proper heading structure directly impacts AI citation likelihood:

| Heading Quality | AI Citation Likelihood |
|----------------|----------------------|
| Perfect hierarchy (H1 → H2 → H3) | 90-95% |
| Minor issues (some skips) | 70-80% |
| Multiple H1s | 50-60% |
| No H1 or random headings | 20-30% |

---

## Implementation Checklist

When creating a new page:

- [ ] One H1 that describes the page topic (40-70 chars)
- [ ] H1 is the first heading on the page
- [ ] H2s for major sections
- [ ] H3s for subsections (only under H2s)
- [ ] No skipped levels in hierarchy
- [ ] Headings are descriptive, not generic
- [ ] PageWrapper validation passes with 0 errors

---

## Resources

- [W3C: Headings and Labels](https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html)
- [Google: Heading Tags Best Practices](https://developers.google.com/search/docs/appearance/structured-data)
- [MDN: The HTML Section Heading elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements)
