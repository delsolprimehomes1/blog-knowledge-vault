# 🤖 Automated Link Validation Workflow

## Overview

Phase 3 implements a complete automated validation system that can validate individual articles or perform batch validation across your entire content library. This ensures consistent link quality across all published content.

---

## Architecture

```
┌──────────────────────────────────────────┐
│    Client-Side Validation Utilities     │
│     (articleLinkValidator.ts)            │
│                                          │
│  • Input validation with Zod            │
│  • Batch processing logic                │
│  • Health scoring algorithms             │
│  • Report generation                     │
└──────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│      Edge Function (validate-article)    │
│                                          │
│  1. Extract links from content          │
│  2. Check accessibility                  │
│  3. Batch analyze with Perplexity       │
│  4. Store results in database            │
└──────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│         Database Storage                 │
│      (link_validations table)            │
│                                          │
│  • Validation history                    │
│  • Quality metrics                       │
│  • Trend analysis data                   │
└──────────────────────────────────────────┘
```

---

## Core Functions

### 1. Single Article Validation

**Function**: `validateArticleLinks(articleId, options)`

**Purpose**: Validate all links in a single article

**Input Validation**: ✅ Uses Zod schemas
```typescript
const articleIdSchema = z.string().uuid({ 
  message: "Invalid article ID format" 
});
```

**Usage**:
```typescript
import { validateArticleLinks } from "@/lib/articleLinkValidator";

const result = await validateArticleLinks(
  "article-uuid-here",
  {
    skipPerplexity: false,  // Default: false
    verifyUrls: true,       // Default: true
  }
);

console.log(result);
// {
//   articleId: "...",
//   articleSlug: "...",
//   externalLinks: [...],
//   internalLinks: [...],
//   brokenLinksCount: 2,
//   languageMismatchCount: 1,
//   irrelevantLinksCount: 0,
//   validationDate: "2025-01-15T10:30:00Z"
// }
```

**Security Features**:
- ✅ UUID format validation
- ✅ Input sanitization
- ✅ Error boundary handling
- ✅ No sensitive data logging

---

### 2. Batch Article Validation

**Function**: `validateMultipleArticles(articleIds, options)`

**Purpose**: Validate multiple articles with rate limiting

**Features**:
- Sequential processing (avoids API overload)
- 1-second delay between articles
- Continues on individual failures
- Comprehensive error reporting

**Usage**:
```typescript
const articleIds = [
  "uuid-1",
  "uuid-2",
  "uuid-3"
];

const results = await validateMultipleArticles(articleIds);

// Returns Map<string, ArticleLinkValidation | Error>
for (const [articleId, result] of results) {
  if (result instanceof Error) {
    console.error(`Failed: ${articleId}`, result.message);
  } else {
    console.log(`Success: ${articleId}`, result.brokenLinksCount);
  }
}
```

**Rate Limiting**:
- 1 request per second
- Prevents Perplexity API throttling
- Protects backend resources

---

### 3. Validation History

**Function**: `getValidationHistory(articleId, limit)`

**Purpose**: Retrieve past validation results for an article

**Usage**:
```typescript
const history = await getValidationHistory("article-uuid", 10);

// Returns array of validations (newest first)
history.forEach(validation => {
  console.log(`Date: ${validation.validationDate}`);
  console.log(`Broken: ${validation.brokenLinksCount}`);
});
```

**Use Cases**:
- Track link quality over time
- Detect degrading links
- Audit content maintenance
- Generate quality reports

---

### 4. Find Articles Needing Validation

**Function**: `getArticlesNeedingValidation(daysThreshold)`

**Purpose**: Identify articles that haven't been validated recently

**Default**: 7 days

**Usage**:
```typescript
// Find articles not validated in last 7 days
const staleArticles = await getArticlesNeedingValidation(7);

console.log(`${staleArticles.length} articles need validation`);

// Validate them
const results = await validateMultipleArticles(staleArticles);
```

**Scheduling Strategy**:
- **Daily**: Articles not validated in 7+ days
- **Weekly**: Articles not validated in 30+ days
- **Monthly**: Full content audit

---

### 5. Link Health Scoring

**Function**: `calculateArticleLinkHealth(validation)`

**Purpose**: Generate A-F grade based on link quality

**Algorithm**:
```
Score = 100

Penalties:
- Broken links: -40 points (critical)
- Language mismatches: -20 points (moderate)
- Irrelevant links: -20 points (moderate)

Bonuses:
- High-authority sources: +strengths

Grades:
- A: 90-100 (Excellent)
- B: 80-89 (Good)
- C: 70-79 (Fair)
- D: 60-69 (Poor)
- F: 0-59 (Failing)
```

**Usage**:
```typescript
const health = calculateArticleLinkHealth(validation);

console.log(health);
// {
//   score: 85,
//   grade: 'B',
//   issues: ['2 broken links'],
//   strengths: ['All links match language', '3 high-authority sources']
// }
```

---

### 6. Batch Validation Report

**Function**: `generateBatchValidationReport(validations)`

**Purpose**: Aggregate metrics across multiple articles

**Output**:
```typescript
{
  totalArticles: 50,
  successfulValidations: 48,
  failedValidations: 2,
  averageScore: 82,
  totalBrokenLinks: 15,
  totalLanguageMismatches: 5,
  totalIrrelevantLinks: 3,
  articlesNeedingAttention: ['uuid-1', 'uuid-2']  // Score < 70
}
```

**Use Cases**:
- Content quality dashboards
- Editorial reports
- Management summaries
- Trend analysis

---

## UI Component: BatchLinkValidator

**Location**: `src/components/admin/BatchLinkValidator.tsx`

**Integrated In**: Admin → AI Tools page

### Features

1. **One-Click Batch Validation**
   - Finds articles needing validation
   - Processes all in sequence
   - Shows real-time progress

2. **Summary Dashboard**
   - Total articles validated
   - Average link health score
   - Issue breakdown
   - Quick metrics

3. **Detailed Results**
   - Per-article health grades
   - Issue highlights
   - Strength indicators
   - Color-coded scores

4. **Progress Tracking**
   - Live progress bar
   - Percentage complete
   - Current article processing

### Usage

```tsx
<BatchLinkValidator />
```

**Workflow**:
1. Admin clicks "Validate All Articles"
2. System finds articles not validated in 7 days
3. Validates each article sequentially
4. Displays comprehensive report
5. Highlights articles needing attention

---

## Workflow Examples

### Daily Automated Validation

```typescript
// Scheduled job (e.g., cron)
async function dailyValidation() {
  // Find stale articles
  const articles = await getArticlesNeedingValidation(7);
  
  if (articles.length === 0) {
    console.log('All articles up to date');
    return;
  }

  // Validate
  const results = await validateMultipleArticles(articles);
  
  // Generate report
  const report = generateBatchValidationReport(results);
  
  // Alert if needed
  if (report.articlesNeedingAttention.length > 0) {
    await sendAlertEmail(report);
  }
}
```

### Content Audit

```typescript
// Full content library audit
async function contentAudit() {
  const { data: articles } = await supabase
    .from('blog_articles')
    .select('id')
    .eq('status', 'published');

  const articleIds = articles?.map(a => a.id) || [];
  
  console.log(`Auditing ${articleIds.length} articles...`);
  
  const results = await validateMultipleArticles(articleIds);
  const report = generateBatchValidationReport(results);
  
  // Generate CSV report
  exportAuditReport(report);
}
```

### Individual Article Check

```typescript
// Before publishing
async function prePublishCheck(articleId: string) {
  const validation = await validateArticleLinks(articleId);
  const health = calculateArticleLinkHealth(validation);
  
  if (health.grade === 'F' || health.grade === 'D') {
    throw new Error(
      `Article quality too low (${health.grade}): ${health.issues.join(', ')}`
    );
  }
  
  console.log(`✓ Article passed quality check (${health.grade})`);
}
```

---

## Security & Validation

### Input Validation

All user inputs are validated using **Zod schemas**:

```typescript
// Article ID validation
const articleIdSchema = z.string().uuid({
  message: "Invalid article ID format"
});

// Options validation
const validationOptionsSchema = z.object({
  articleId: z.string().uuid(),
  skipPerplexity: z.boolean().optional().default(false),
  verifyUrls: z.boolean().optional().default(true),
}).strict();
```

### Security Checklist

- ✅ UUID format validation
- ✅ Input sanitization
- ✅ Rate limiting (1 req/sec)
- ✅ Error boundary handling
- ✅ No sensitive data in logs
- ✅ Proper encoding for URLs
- ✅ Database query safety

### Error Handling

```typescript
try {
  const result = await validateArticleLinks(articleId);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Invalid input:', error.errors);
  } else {
    console.error('Validation failed:', error.message);
  }
}
```

---

## Database Schema

### link_validations Table

```sql
CREATE TABLE link_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES blog_articles(id),
  article_slug TEXT NOT NULL,
  article_language TEXT NOT NULL,
  article_topic TEXT,
  external_links JSONB DEFAULT '[]'::jsonb,
  internal_links JSONB DEFAULT '[]'::jsonb,
  broken_links_count INTEGER DEFAULT 0,
  language_mismatch_count INTEGER DEFAULT 0,
  irrelevant_links_count INTEGER DEFAULT 0,
  validation_status TEXT DEFAULT 'pending',
  validation_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_link_validations_article_id 
ON link_validations(article_id);

CREATE INDEX idx_link_validations_date 
ON link_validations(validation_date DESC);
```

### Querying Validation History

```sql
-- Get latest validation for each article
SELECT DISTINCT ON (article_id) 
  article_id, 
  article_slug, 
  broken_links_count, 
  validation_date
FROM link_validations
ORDER BY article_id, validation_date DESC;

-- Find articles with broken links
SELECT article_id, article_slug, broken_links_count
FROM link_validations
WHERE validation_date > NOW() - INTERVAL '7 days'
  AND broken_links_count > 0
ORDER BY broken_links_count DESC;
```

---

## API Reference

### validateArticleLinks

```typescript
function validateArticleLinks(
  articleId: string,
  options?: {
    skipPerplexity?: boolean;
    verifyUrls?: boolean;
  }
): Promise<ArticleLinkValidation>
```

### validateMultipleArticles

```typescript
function validateMultipleArticles(
  articleIds: string[],
  options?: ValidationOptions
): Promise<Map<string, ArticleLinkValidation | Error>>
```

### getValidationHistory

```typescript
function getValidationHistory(
  articleId: string,
  limit?: number
): Promise<ArticleLinkValidation[]>
```

### getArticlesNeedingValidation

```typescript
function getArticlesNeedingValidation(
  daysThreshold?: number
): Promise<string[]>
```

### calculateArticleLinkHealth

```typescript
function calculateArticleLinkHealth(
  validation: ArticleLinkValidation
): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  strengths: string[];
}
```

### generateBatchValidationReport

```typescript
function generateBatchValidationReport(
  validations: Map<string, ArticleLinkValidation | Error>
): BatchValidationReport
```

---

## Best Practices

1. **Regular Validation**
   - Validate new articles before publishing
   - Run batch validation weekly
   - Monitor high-traffic articles more frequently

2. **Act on Results**
   - Fix broken links immediately
   - Replace low-quality sources
   - Maintain minimum quality score (70+)

3. **Rate Limiting**
   - Use 1-second delays for batch operations
   - Don't validate more than 100 articles at once
   - Schedule intensive operations during off-hours

4. **Monitoring**
   - Track average scores over time
   - Set up alerts for declining quality
   - Review validation history regularly

5. **Security**
   - Always validate user inputs
   - Use parameterized queries
   - Log errors, not sensitive data
   - Implement proper access controls

---

## Troubleshooting

### "Invalid article ID format"
```typescript
// Fix: Ensure UUID format
const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId);
```

### "Perplexity API rate limited"
```typescript
// Fix: Add delays between requests
await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
```

### "Validation timeout"
```typescript
// Fix: Skip Perplexity for faster validation
await validateArticleLinks(articleId, { skipPerplexity: true });
```

### "Database connection error"
```typescript
// Fix: Check Supabase connection
const { error } = await supabase.from('blog_articles').select('id').limit(1);
if (error) console.error('Database error:', error);
```

---

## Future Enhancements

### Scheduled Automation (Phase 4)
- Cron jobs for automated validation
- Email/Slack notifications
- Auto-fix capabilities
- Trend dashboards

### Advanced Analytics (Phase 5)
- Link quality trends
- Source diversity metrics
- Performance correlation
- SEO impact analysis

---

## Summary

Phase 3 provides:

✅ **Complete Validation Workflow**
- Single & batch article validation
- Comprehensive error handling
- Database storage & history

✅ **Security & Input Validation**
- Zod schema validation
- UUID format checking
- Rate limiting
- Safe database queries

✅ **Health Scoring System**
- A-F grading algorithm
- Detailed issue tracking
- Strength identification
- Actionable insights

✅ **Batch Processing**
- Sequential validation
- Progress tracking
- Aggregate reporting
- Attention flagging

✅ **User Interface**
- BatchLinkValidator component
- Real-time progress
- Detailed results display
- Color-coded metrics

**Result**: Production-ready automated link quality management system that ensures consistent content excellence across your entire blog.
