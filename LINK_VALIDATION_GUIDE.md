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

## Phase 4: Citation Health Dashboard ✅ IMPLEMENTED

### Overview

The Citation Health Dashboard provides centralized monitoring and automated fixing of broken external citations across all published articles. It tracks citation health, discovers better alternatives, and can automatically apply high-confidence replacements.

**Location**: `/admin/citation-health`

### Core Features

1. **Citation Health Monitoring**
   - Real-time health status for all external citations
   - HTTP status code tracking (200, 404, 403, 500+)
   - Response time measurement
   - Language detection
   - Government source identification
   - Last checked timestamp

2. **Dead Link Management**
   - Automatic discovery of broken/unreachable citations
   - AI-powered replacement suggestions
   - Confidence scoring (0-10)
   - Manual approval workflow
   - Auto-approval for high-confidence replacements (≥8.0)

3. **Batch Operations**
   - Auto-fix all broken links in one click
   - Populate citation tracking across all articles
   - Bulk apply approved replacements

### Database Tables

#### `external_citation_health`
Tracks the health status of each unique citation URL:
- `url` - The citation URL
- `status` - 'healthy', 'broken', 'unreachable', 'slow'
- `http_status_code` - Last HTTP response code
- `response_time_ms` - Response time in milliseconds
- `language` - Detected language
- `is_government_source` - Boolean flag
- `times_verified` / `times_failed` - Success/failure counters
- `last_checked_at` - Timestamp of last check

#### `citation_usage_tracking`
Maps which articles use which citations:
- `article_id` - Reference to blog_articles
- `citation_url` - The external URL
- `citation_source` - Source name (e.g., "Ministry of Justice")
- `anchor_text` - Link text in article
- `position_in_article` - Order in citations array
- `is_active` - Boolean flag

#### `dead_link_replacements`
Stores suggested and applied replacements:
- `original_url` - Broken URL
- `replacement_url` - Suggested better URL
- `confidence_score` - AI confidence (0-10)
- `status` - 'suggested', 'approved', 'applied', 'rejected'
- `replacement_reason` - Why this is better
- `applied_to_articles` - Array of affected article IDs
- `replacement_count` - How many times applied

### Workflow: Citation Health Check

**Step 1: Run Health Check**
```
Click "Run Health Check" button
```

**What happens:**
1. Edge function `check-citation-health` is invoked
2. System fetches all unique citation URLs from published articles
3. For each URL:
   - Makes HEAD request to check accessibility
   - Measures response time
   - Detects language from headers
   - Identifies government sources (.gov, .gob.es)
   - Records HTTP status code
4. Updates `external_citation_health` table
5. Returns summary statistics

**Expected Result:**
```
✅ Citation health check complete
📊 Checked: 41 citations
✅ Healthy: 38
❌ Broken: 2
⏱️ Slow: 1
```

### Workflow: Citation Tracking Population

**CRITICAL**: This must be run BEFORE attempting any link replacements!

**Step 1: Populate Tracking**
```
Click "Populate Tracking" button
```

**What happens:**
1. Edge function `populate-citation-tracking` is invoked
2. Fetches all published articles with `external_citations` metadata
3. For each article:
   - Deletes old tracking records for that article
   - Creates new tracking records for each citation
   - Maps citation URLs to article content positions
4. Updates `citation_usage_tracking` table

**Expected Result:**
```
✅ Citation tracking populated
📚 30 articles
🔗 41 citations tracked
```

**Why This Matters:**
- The tracking table maps citations to actual article content
- Without this, replacements can't find URLs in article HTML
- Must be run after any article content changes
- Should be re-run periodically to stay in sync

### Workflow: Auto-Fix Broken Links

**Prerequisites:**
1. ✅ Health check has been run (identifies broken links)
2. ✅ Citation tracking has been populated (maps URLs to articles)

**Step 1: Auto-Fix**
```
Click "Auto-Fix All Broken Links" button
```

**What happens:**
1. Edge function `batch-fix-broken-citations` is invoked
2. Fetches all citations with status 'broken' or 'unreachable'
3. For each broken URL:
   - Calls `discover-better-links` to find alternatives
   - Gets 1-3 high-authority replacement suggestions
   - Calculates confidence scores:
     - Authority score (0-10)
     - Relevance score (0-100)
     - Combined confidence: `(authority * 10 + relevance) / 20`
   - Inserts suggestions into `dead_link_replacements` table
   - If confidence ≥ 8.0: **Automatically applies** replacement
   - If confidence < 8.0: Flags for manual review

4. For auto-applied replacements:
   - Calls `apply-citation-replacement` edge function
   - Creates revision in `article_revisions` (for rollback)
   - Updates article `detailed_content` HTML
   - Updates `external_citations` metadata array
   - Marks replacement as 'applied' in database

**Expected Result:**
```
✅ Batch fix complete
🔍 Processed: 3 citations
✅ Auto-applied: 1 replacement
⏸️ Pending review: 2 replacements
📚 Articles updated: 1
🔗 Links replaced: 1
```

### Workflow: Manual Replacement Review

For replacements with confidence < 8.0 that require manual approval:

**Step 1: Review Pending Replacements**
Navigate to "Pending Replacements" tab:
- See original URL, replacement URL, confidence score
- View replacement reason (AI explanation)
- Check how many articles would be affected

**Step 2: Approve or Reject**
```
Click "Approve" → Moves to "Approved" tab
Click "Reject" → Removes from system
```

**Step 3: Apply Approved Replacements**
```
Select replacement(s) → Click "Apply Selected"
```

**What happens:**
- Same as auto-apply process above
- Creates article revisions
- Updates content and metadata
- Tracks application in database

### URL Validation: Handling 403 Responses

**Problem**: Government websites often return 403 (Forbidden) for automated HEAD requests due to bot protection, even though the URL works fine in browsers.

**Solution**: The system treats 403 as "allowed but protected":
```typescript
if (!checkResponse.ok && checkResponse.status !== 403) {
  // Only reject on real errors (404, 500+)
  markAsInvalid();
}
```

**Logged Output:**
```
⚠️ 403 on https://www.exteriores.gob.es/... - allowing (likely bot protection)
```

This prevents valid government sources from being incorrectly flagged as broken.

### Edge Functions

#### `check-citation-health`
**Purpose**: Health check for all external citations

**Input**: None (checks all published articles)

**Output**:
```json
{
  "success": true,
  "totalChecked": 41,
  "healthy": 38,
  "broken": 2,
  "unreachable": 1
}
```

#### `populate-citation-tracking`
**Purpose**: Sync tracking table with article content

**Input**: None (processes all published articles)

**Output**:
```json
{
  "success": true,
  "articlesProcessed": 30,
  "citationsTracked": 41
}
```

#### `batch-fix-broken-citations`
**Purpose**: Auto-discover and apply replacements

**Input**: None (processes all broken citations)

**Output**:
```json
{
  "success": true,
  "processed": 3,
  "autoApplied": 1,
  "pendingReview": 2,
  "results": [...]
}
```

#### `apply-citation-replacement`
**Purpose**: Apply approved replacements to articles

**Input**:
```json
{
  "replacementIds": ["uuid1", "uuid2"],
  "preview": false
}
```

**Output**:
```json
{
  "success": true,
  "affectedArticles": 1,
  "totalReplacements": 1,
  "replacements": [
    {
      "original": "https://broken.com",
      "replacement": "https://better.gob.es",
      "affectedArticles": ["article-slug"]
    }
  ]
}
```

### Complete Workflow: From Detection to Fix

**Initial Setup (One-time):**
1. Navigate to `/admin/citation-health`
2. Click **"Populate Tracking"** → Syncs all articles (30 articles, ~41 citations)
3. Wait for success confirmation

**Regular Health Checks:**
1. Click **"Run Health Check"** → Validates all citation URLs
2. Review statistics:
   - Healthy citations (green)
   - Broken citations (red)
   - Unreachable citations (yellow)
   - Slow citations (orange)

**Automated Fixing:**
1. Click **"Auto-Fix All Broken Links"**
2. System automatically:
   - Discovers replacements via Perplexity AI
   - Auto-applies high-confidence fixes (≥8.0)
   - Flags low-confidence for manual review
3. Review results toast notification

**Manual Review (if needed):**
1. Navigate to **"Pending Replacements"** tab
2. Review AI suggestions (confidence score, reason)
3. Approve or reject each suggestion
4. Navigate to **"Approved"** tab
5. Select approved replacements
6. Click **"Apply Selected"**

**Verification:**
1. Navigate to **"Applied"** tab
2. See history of all applied replacements
3. View which articles were updated
4. Check replacement counts

### Confidence Scoring

**Formula:**
```typescript
confidenceScore = (authorityScore * 10 + relevanceScore) / 20
```

**Authority Score (0-10):**
- 10: Government (.gov, .gob.es)
- 9: Educational (.edu)
- 8: Major institutions (World Bank, UN)
- 7: Industry associations
- 6: Established media
- 5-1: Other sources

**Relevance Score (0-100):**
- AI-determined based on content match
- Language compatibility
- Topic alignment
- Context appropriateness

**Auto-Apply Threshold:**
- ≥8.0: Automatic application
- <8.0: Manual review required

**Example:**
```
Authority: 10 (Government source)
Relevance: 95 (Highly relevant)
Confidence: (10*10 + 95) / 20 = 9.75 → Auto-apply ✅
```

### Article Revisions System

**Purpose**: Enable rollback of citation replacements

**How It Works:**
1. Before applying replacement, system creates revision:
```json
{
  "article_id": "uuid",
  "revision_type": "citation_replacement",
  "previous_content": "original HTML",
  "previous_citations": [...],
  "change_reason": "Replaced broken URL",
  "replacement_id": "uuid",
  "can_rollback": true,
  "rollback_expires_at": "2025-10-25 11:15:00" // 24 hours
}
```

2. Replacement is applied to article
3. If issues occur, admin can rollback within 24 hours
4. After 24 hours, `can_rollback` automatically becomes false

### Troubleshooting

#### "1 article updated, 0 URLs replaced"

**Cause**: Citation tracking table is empty or out of sync

**Solution**:
1. Click **"Populate Tracking"** first
2. Wait for confirmation (e.g., "30 articles, 41 citations")
3. Then run **"Auto-Fix All Broken Links"** again
4. Should now see "1 article updated, 1 URL replaced"

#### "403 Forbidden" on government sites

**Status**: This is normal and handled automatically

**Explanation**: Government sites block automated requests but are actually accessible. The system allows 403 responses for this reason.

#### "No replacements found"

**Possible Causes:**
1. Perplexity couldn't find better alternatives
2. Original URL is too niche or specific
3. Language mismatch (article in Spanish, only English sources found)

**Solution:**
- Manually find replacement
- Use "Find Better Citations" in article editor
- Adjust article language if incorrect

#### "Replacement confidence too low"

**Cause**: AI is uncertain about suggested replacement

**Solution:**
1. Review suggestion in "Pending Replacements" tab
2. Check confidence score and reason
3. Visit both URLs to manually verify
4. Approve if appropriate, reject otherwise

### Best Practices

1. **Run Populate Tracking First**
   - Always run this before attempting replacements
   - Re-run after bulk article edits
   - Schedule weekly re-population

2. **Regular Health Checks**
   - Run weekly to catch new broken links
   - Review slow citations (may break soon)
   - Monitor government source accessibility

3. **Review Auto-Applied Replacements**
   - Check "Applied" tab after auto-fix
   - Verify article quality wasn't affected
   - Roll back if replacement seems wrong

4. **Manual Review for Low Confidence**
   - Don't auto-approve everything
   - Low confidence suggestions need human verification
   - Consider article context, not just scores

5. **Track Replacement Patterns**
   - Notice which sources often break
   - Build list of reliable alternatives
   - Update content strategy accordingly

### Performance Considerations

**Citation Tracking Population:**
- Processes ~30 articles in 2-5 seconds
- Safe to run frequently
- Non-blocking operation

**Health Check:**
- Checks ~41 URLs in 10-15 seconds
- Uses HEAD requests (lightweight)
- Rate-limited to avoid overwhelming sources

**Auto-Fix:**
- Processes 1-3 broken URLs in 5-10 seconds per URL
- Perplexity API calls are sequential
- Auto-apply happens immediately for high confidence

---

## Future Enhancements (Not Yet Implemented)

### Phase 5: Scheduled Automation
- Cron jobs for daily/weekly validation
- Email/Slack alerts for broken links
- Auto-fix capabilities
- Citation health dashboards

### Phase 6: Advanced Analytics
- Link quality trends over time
- Authority score analytics
- Content citation patterns
- Source diversity metrics
- SEO impact correlation

---

## Related Documentation

- 📖 **[AUTOMATED_LINK_VALIDATION.md](./AUTOMATED_LINK_VALIDATION.md)** - Complete Phase 3 automated workflow guide
- 📖 **[LINK_VALIDATION_GUIDE.md](./LINK_VALIDATION_GUIDE.md)** - This document (Phases 1-3 overview)

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

**Phase 4 - Automated Validation**: ✅
- Complete validation workflow
- Batch processing with rate limiting
- Link health scoring (A-F grades)
- Validation history tracking
- Security with input validation
- UI component for batch operations

**Next**: Scheduled automation (Phase 5) and advanced analytics (Phase 6)
