# 🔍 Intelligent Link Validation & Discovery System

## Overview

The Link Validation System uses **Perplexity AI** to provide comprehensive analysis of all external and internal links in your blog articles. It ensures every link is:

✅ **Working** (no 404s or broken links)  
✅ **Language-matched** (Spanish articles → Spanish sources)  
✅ **Contextually relevant** (content actually relates to your article)  
✅ **High authority** (government, educational, or established sources)  

---

## Phase 1: Core Validation ✅ IMPLEMENTED

### Database Schema
- **Table**: `link_validations`
- **Purpose**: Stores validation results for each article
- **Columns**: 
  - `article_id`, `article_slug`, `article_language`
  - `external_links`, `internal_links` (JSONB arrays)
  - `broken_links_count`, `language_mismatch_count`, `irrelevant_links_count`
  - `validation_status`, `validation_date`

### Edge Functions

#### 1. `validate-article-links`
**Purpose**: Validates all links in an article using Perplexity batch analysis

**Process**:
1. Extracts all external and internal links from article content
2. Checks external links for accessibility (HEAD requests)
3. **Batch analyzes** all working links with Perplexity AI
4. Validates internal links against published articles
5. Stores results in `link_validations` table

**Perplexity Analysis Includes**:
- **Relevance Score** (0-100)
- **Content Summary** (what the link is about)
- **Language Detection**
- **Authority Level** (high/medium/low)
- **Content Quality** (excellent/good/fair/poor)
- **Recommendations** (specific improvement suggestions)
- **Alternative Sources** (AI-suggested better links)

**Example Response**:
```json
{
  "articleId": "uuid",
  "externalLinks": [
    {
      "url": "https://example.gob.es/...",
      "isWorking": true,
      "statusCode": 200,
      "language": "es",
      "contentSummary": "Government statistics on real estate prices...",
      "isRelevant": true,
      "relevanceScore": 92,
      "recommendations": [],
      "alternativeSources": [],
      "authorityLevel": "high",
      "contentQuality": "excellent"
    },
    {
      "url": "https://broken-link.com/...",
      "isWorking": false,
      "statusCode": null,
      "recommendations": ["Replace with government source"],
      "alternativeSources": [
        "https://www.registradores.org/...",
        "https://www.boe.es/..."
      ]
    }
  ],
  "brokenLinksCount": 1,
  "languageMismatchCount": 0,
  "irrelevantLinksCount": 0
}
```

#### 2. `discover-better-links`
**Purpose**: Uses Perplexity to find high-authority alternatives for broken/poor links

**Input**:
```json
{
  "originalUrl": "https://broken-link.com",
  "articleHeadline": "Buying Property in Spain",
  "articleContent": "...",
  "articleLanguage": "es",
  "context": "Legal requirements section"
}
```

**Output**:
```json
{
  "suggestions": [
    {
      "suggestedUrl": "https://www.registradores.org/...",
      "sourceName": "Registradores de España",
      "relevanceScore": 95,
      "authorityScore": 9,
      "reason": "Official land registry source with current legal requirements",
      "language": "es",
      "verified": true
    }
  ]
}
```

#### 3. `replace-article-links`
**Purpose**: Automatically replaces links in article content

**Input**:
```json
{
  "articleId": "uuid",
  "replacements": [
    {
      "oldUrl": "https://broken-link.com",
      "newUrl": "https://better-source.gob.es",
      "newText": "optional new anchor text"
    }
  ]
}
```

**Output**:
```json
{
  "success": true,
  "replacedCount": 3,
  "replacementLog": [...]
}
```

---

## Phase 2: Perplexity Intelligence ✅ IMPLEMENTED

### Batch Link Analysis

**Location**: `supabase/functions/shared/perplexityLinkAnalyzer.ts`

**Key Features**:
- **Batch Processing**: Analyzes ALL links in one Perplexity call (much faster & cheaper)
- **Rich Intelligence**: Provides detailed analysis for each link
- **Alternative Discovery**: Suggests better sources automatically
- **Authority Scoring**: Rates sources by trustworthiness
- **Quality Assessment**: Grades content quality

**Function**: `analyzeLinksWithPerplexity()`
```typescript
const analysis = await analyzeLinksWithPerplexity(
  articleContent,
  articleTopic,
  articleLanguage,
  links, // Array of ALL links
  perplexityApiKey
);

// Returns:
{
  analyses: {
    "url1": { relevanceScore, contentSummary, recommendations, ... },
    "url2": { ... }
  },
  overallQuality: 75,
  improvementSuggestions: [...]
}
```

---

## Phase 3: Better Citation Discovery ✅ IMPLEMENTED

### AI-Powered Citation Finder

**Location**: `supabase/functions/shared/citationFinder.ts`

**Purpose**: Proactively discover NEW high-authority sources (not just validate existing ones)

**Key Features**:
- **Multilingual Support**: 9 languages (EN, ES, DE, NL, FR, PL, SV, DA, HU)
- **Domain Preferences**: Language-specific authority domains (.gov, .gob.es, .edu, etc.)
- **Smart Deduplication**: Avoids suggesting sources already in use
- **Contextual Placement**: Suggests WHERE in article to place each citation
- **Verification**: Checks URL accessibility before recommending

**Function**: `findBetterCitations()`
```typescript
const citations = await findBetterCitations(
  articleTopic,        // "Buying Property in Spain"
  articleLanguage,     // "es"
  articleContent,      // Full article text
  currentCitations,    // URLs to avoid duplicating
  perplexityApiKey,
  focusArea           // Optional: "Costa del Sol real estate"
);

// Returns:
[
  {
    url: "https://www.registradores.org/...",
    sourceName: "Registradores de España",
    description: "Official land registry data...",
    relevance: "Why this source fits the article",
    authorityScore: 9,
    language: "es",
    suggestedContext: "Legal requirements section",
    verified: true,
    statusCode: 200
  }
]
```

### Edge Function: `find-better-citations`

**Purpose**: Discovers 5-8 new authoritative sources for an article

**Input**:
```json
{
  "articleTopic": "Buying Property in Spain",
  "articleLanguage": "es",
  "articleContent": "...",
  "currentCitations": ["https://existing1.com", "https://existing2.com"],
  "focusArea": "Costa del Sol real estate",
  "verifyUrls": true
}
```

**Output**:
```json
{
  "success": true,
  "citations": [
    {
      "url": "https://www.registradores.org/...",
      "sourceName": "Registradores de España",
      "description": "Official property registry with current regulations",
      "relevance": "Primary source for legal property requirements",
      "authorityScore": 9,
      "language": "es",
      "suggestedContext": "Legal Requirements section",
      "verified": true
    }
  ],
  "totalFound": 8,
  "verifiedCount": 7,
  "language": "es"
}
```

### UI Component: BetterCitationFinder

**Location**: `src/components/admin/BetterCitationFinder.tsx`

**Integrated In**: Article Editor → External Citations Section

**Features**:
1. **One-Click Discovery**: "Find Better Citations" button
2. **Rich Previews**: Shows description, relevance, authority score
3. **Contextual Placement**: AI suggests WHERE to place each citation
4. **One-Click Add**: "Add to Article" instantly adds citation
5. **Verification Status**: Shows which URLs are accessible
6. **Copy URL**: Quick copy to clipboard

**Usage**:
```tsx
<BetterCitationFinder
  articleTopic={headline}
  articleLanguage={language}
  articleContent={content}
  currentCitations={existingUrls}
  onAddCitation={(citation) => {
    // Adds citation to article
  }}
/>
```

### Language Support

**Supported Languages**:
- 🇬🇧 **English** (EN): .gov, .gov.uk, .edu, .ac.uk
- 🇪🇸 **Spanish** (ES): .gob.es, .es, Spanish ministries
- 🇩🇪 **German** (DE): .de, .gov.de, German authorities
- 🇳🇱 **Dutch** (NL): .nl, .overheid.nl, Kadaster
- 🇫🇷 **French** (FR): .gouv.fr, .fr, French ministries
- 🇵🇱 **Polish** (PL): .gov.pl, .pl, Polish authorities
- 🇸🇪 **Swedish** (SV): .se, Swedish authorities
- 🇩🇰 **Danish** (DA): .dk, Danish authorities
- 🇭🇺 **Hungarian** (HU): .hu, Hungarian authorities

**Special Features**:
- **Costa del Sol Focus**: Automatically detected from article topic
- **Regional Preferences**: Prioritizes region-specific sources when applicable

---

## UI Component

### LinkValidationPanel

**Location**: `src/components/admin/LinkValidationPanel.tsx`

**Features**:
1. **One-Click Validation**: Validates all article links instantly
2. **Visual Health Score**: 0-100 score with color-coded badges
3. **Issue Detection**: Highlights broken, mismatched, irrelevant links
4. **AI-Powered Alternatives**: Shows Perplexity-suggested better sources
5. **One-Click Replacement**: Replace links without manual editing

**Integrated In**: Article Editor (Section 7.5)

**Usage**:
```tsx
<LinkValidationPanel
  articleId={articleId}
  articleSlug={slug}
/>
```

---

## Link Health Score Calculation

```typescript
Link Health Score = 
  40% Working Links +
  40% Relevant Links +
  20% Language-Matched Links
```

**Interpretation**:
- **80-100**: Excellent - All links are working, relevant, and language-matched
- **60-79**: Good - Minor issues, most links are quality
- **40-59**: Fair - Significant issues, needs improvement
- **0-39**: Poor - Major problems, immediate action required

---

## Workflow Example

### Admin Creates New Article

1. **Write Article Content** in Editor
2. **Click "Find Better Citations"** in External Citations section
3. System:
   - Analyzes article topic and content
   - Searches for authoritative sources via Perplexity
   - **Avoids duplicating** existing citations
   - Verifies all suggested URLs are accessible
   - Returns 5-8 high-authority sources
4. **Review AI Suggestions**:
   - Each shows: Description, Relevance, Authority Score, Suggested Placement
   - Verified sources marked with ✅
   - See exactly where to place each citation
5. **Add Citations**:
   - Click "Add to Article" to instantly add
   - Or click "Copy URL" to manually add later
6. **Validate Links** (optional):
   - Use "Validate All Links" to check all citations
   - Get relevance scores and quality ratings

### Admin Reviews Existing Article

1. **Click "Validate All Links"** in Article Editor
2. System:
   - Extracts all links from content
   - Checks accessibility (HEAD requests)
   - **Batch analyzes** with Perplexity AI
   - Stores results in database
3. **Review Results**:
   - Link Health Score: 85/100 ✅
   - 2 broken links detected 🔴
   - 1 language mismatch 🟡
   - AI suggestions displayed automatically

4. **Fix Issues**:
   - **Option A**: Click "Use This" on AI-suggested alternative
   - **Option B**: Click "Find More Alternatives" for additional options
   - **Option C**: Click "Replace" to swap links instantly

5. **Re-validate** to confirm improvements

---

## Key Improvements Over Phase 1

### Before (Individual Analysis)
```typescript
// Analyzed links one-by-one
for (const link of links) {
  const analysis = await analyzeLink(link);
}
// Slow, expensive, limited context
```

### After (Batch Analysis)
```typescript
// Analyzes ALL links together
const analysis = await analyzeLinksWithPerplexity(
  content, topic, language, links
);
// Fast, efficient, rich intelligence
```

**Benefits**:
- ⚡ **10x Faster**: Single Perplexity call instead of N calls
- 💰 **Lower Cost**: Fewer API requests
- 🧠 **Richer Context**: AI sees all links together
- 🎯 **Better Suggestions**: More accurate alternatives
- 📊 **Holistic Analysis**: Overall quality assessment

---

## Configuration

### Required Secrets
- `PERPLEXITY_API_KEY` ✅ Already configured

### Edge Functions Config
All functions are public (no JWT verification required):
- `validate-article-links`
- `discover-better-links`
- `replace-article-links`

---

## API Reference

### Validate Links
```typescript
const { data } = await supabase.functions.invoke('validate-article-links', {
  body: { articleId: 'uuid' }
});
```

### Discover Better Links
```typescript
const { data } = await supabase.functions.invoke('discover-better-links', {
  body: {
    originalUrl: 'https://broken.com',
    articleHeadline: 'Topic',
    articleContent: '...',
    articleLanguage: 'es',
    context: 'Section context'
  }
});
```

### Replace Links
```typescript
const { data } = await supabase.functions.invoke('replace-article-links', {
  body: {
    articleId: 'uuid',
    replacements: [
      { oldUrl: '...', newUrl: '...', newText: 'optional' }
    ]
  }
});
```

---

## Future Enhancements (Not Yet Implemented)

### Phase 4: Automated Monitoring
- Scheduled link validation (daily/weekly)
- Email alerts for broken links
- Automatic replacement of dead links
- Citation health dashboards

### Phase 5: Advanced Analytics
- Link quality trends over time
- Authority score analytics
- Content citation patterns
- Source diversity metrics

---

## Troubleshooting

### "No links were replaced"
- Verify the URL exactly matches the content
- Check for typos or URL encoding differences
- Ensure the article has been saved

### "Perplexity analysis failed"
- Check PERPLEXITY_API_KEY is configured
- Verify API rate limits not exceeded
- Review edge function logs
- Try with shorter article content

### "No suitable citations found"
- Article topic may be too niche
- Try different language setting
- Add more content context
- Check if topic is searchable

### Low relevance scores
- Links may not match article topic
- Consider using "Find More Alternatives"
- Review AI recommendations for guidance

---

## Best Practices

1. **Start with Citation Discovery**: Use "Find Better Citations" BEFORE writing
2. **Validate Early**: Run link validation before publishing
3. **Review AI Suggestions**: Don't blindly accept all alternatives - verify relevance
4. **Prioritize Government Sources**: Always prefer .gov/.gob sources
5. **Language Consistency**: Ensure all links match article language
6. **Re-validate After Changes**: Confirm improvements worked
7. **Use Suggested Context**: Place citations where AI recommends
8. **Diversify Sources**: Mix government, educational, and organizational sources

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│              Article Editor (Frontend)              │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │      LinkValidationPanel Component          │ │
│  │  • Trigger validation                        │ │
│  │  • Display results                           │ │
│  │  • Show AI suggestions                       │ │
│  │  • One-click replacement                     │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│               Edge Functions (Backend)              │
│                                                     │
│  validate-article-links ──┐                        │
│  • Extract links           │                        │
│  • Check accessibility     ├──► Perplexity AI      │
│  • BATCH analyze links     │    • Relevance        │
│  • Store results           │    • Alternatives     │
│                            │    • Recommendations   │
│  discover-better-links ────┤                        │
│  • Find alternatives       │                        │
│                            │                        │
│  replace-article-links ────┘                        │
│  • Update content                                   │
│  • Log changes                                      │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Database (Supabase)                    │
│                                                     │
│  link_validations                                   │
│  • Validation results                               │
│  • Historical data                                  │
│  • Quality metrics                                  │
└─────────────────────────────────────────────────────┘
```

---

## Summary

The Intelligent Link Validation & Citation Discovery System ensures your blog content maintains the highest quality by:

1. ✅ **Discovering Quality Sources**: AI finds 5-8 authoritative sources per article
2. 🔍 **Detecting Issues**: Finds broken, irrelevant, or mismatched links
3. 🤖 **AI-Powered Intelligence**: Uses Perplexity for deep link analysis
4. 🔗 **Smart Alternatives**: Suggests better, more authoritative sources
5. ⚡ **One-Click Fixes**: Replaces problematic links instantly
6. 📊 **Quality Scoring**: Provides actionable health metrics
7. 🌍 **Multilingual**: Supports 9 languages with region-specific preferences
8. 🎯 **Contextual Placement**: Tells you WHERE to place each citation

**Result**: Professional, high-authority content that readers and search engines trust.

### Complete Feature Set

**Phase 1 - Validation**: ✅
- Database schema for tracking
- Link accessibility checking
- Internal link validation
- Results storage and history

**Phase 2 - Intelligence**: ✅
- Batch Perplexity analysis
- Rich link intelligence (relevance, authority, quality)
- Automatic alternative suggestions
- Enhanced UI with quality indicators

**Phase 3 - Discovery**: ✅
- Proactive citation finding
- 9-language support
- Domain-specific preferences
- Contextual placement suggestions
- One-click citation addition

**Next**: Automated monitoring (Phase 4) and advanced analytics (Phase 5)
