import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to update job progress
async function updateProgress(supabase: any, jobId: string, step: number, message: string, articleNum?: number) {
  await supabase
    .from('cluster_generations')
    .update({
      status: 'generating',
      progress: {
        current_step: step,
        total_steps: 11,
        current_article: articleNum || 0,
        total_articles: 6,
        message
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Heartbeat function to indicate backend is alive
async function sendHeartbeat(supabase: any, jobId: string) {
  await supabase
    .from('cluster_generations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

// Timeout wrapper for promises
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
  jobId?: string
): Promise<T> {
  const startTime = Date.now();
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const errorMsg = `${errorMessage} (timed out after ${elapsed}s, limit was ${Math.floor(timeoutMs / 1000)}s)`;
      if (jobId) {
        console.error(`[Job ${jobId}] ⏱️ TIMEOUT: ${errorMsg}`);
      }
      reject(new Error(errorMsg));
    }, timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// Retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`[${operationName}] Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Max retries exceeded for ${operationName}`);
}

// Sanitize JSON response to fix common issues
function sanitizeJsonResponse(text: string): string {
  // Remove any BOM or zero-width characters
  let sanitized = text.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Fix unescaped newlines in strings
  sanitized = sanitized.replace(/([^\\])\n/g, '$1\\n');
  
  // Fix unescaped quotes in strings (basic attempt)
  // This is tricky because we need to distinguish between JSON structure quotes and content quotes
  
  // Remove trailing commas before closing brackets/braces
  sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');
  
  return sanitized;
}

// Safe JSON parsing with detailed error logging
async function safeJsonParse(response: Response, context: string, jobId?: string): Promise<any> {
  try {
    const text = await response.text();
    
    if (!text || text.trim() === '') {
      throw new Error(`Empty response body in ${context}`);
    }
    
    const trimmed = text.trim();
    
    // Validate basic JSON structure
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      console.error(`[${jobId || 'unknown'}] Invalid JSON start in ${context}. First 200 chars:`, trimmed.substring(0, 200));
      throw new Error(`Response doesn't start with { or [ in ${context}`);
    }
    
    if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
      console.error(`[${jobId || 'unknown'}] Invalid JSON end in ${context}. Last 200 chars:`, trimmed.substring(trimmed.length - 200));
      throw new Error(`Response doesn't end with } or ] in ${context} - may be truncated`);
    }
    
    // Try parsing original first
    try {
      return JSON.parse(trimmed);
    } catch (parseError) {
      // Log the problematic JSON
      console.error(`[${jobId || 'unknown'}] JSON parse error in ${context}:`, parseError);
      console.error(`[${jobId || 'unknown'}] First 500 chars of response:`, trimmed.substring(0, 500));
      console.error(`[${jobId || 'unknown'}] Last 200 chars of response:`, trimmed.substring(trimmed.length - 200));
      
      // Try sanitizing and parsing again
      console.log(`[${jobId || 'unknown'}] Attempting to sanitize JSON...`);
      const sanitized = sanitizeJsonResponse(trimmed);
      
      try {
        return JSON.parse(sanitized);
      } catch (sanitizeError) {
        console.error(`[${jobId || 'unknown'}] Sanitization also failed:`, sanitizeError);
        throw parseError; // Throw original error
      }
    }
  } catch (error) {
    console.error(`[${jobId || 'unknown'}] JSON parsing failed in ${context}:`, error);
    throw new Error(`Failed to parse JSON in ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Retry wrapper specifically for API calls with JSON responses
async function retryApiCall<T>(
  apiCallFn: () => Promise<Response>,
  context: string,
  jobId: string,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
        console.log(`[Job ${jobId}] Retry ${attempt}/${maxRetries} for ${context} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const response = await apiCallFn();
      const data = await safeJsonParse(response, context, jobId);
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Job ${jobId}] Attempt ${attempt + 1}/${maxRetries + 1} failed for ${context}:`, lastError.message);
      
      // If it's not a JSON parsing error, don't retry
      if (!lastError.message.includes('JSON') && !lastError.message.includes('parse')) {
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error(`Failed after ${maxRetries + 1} attempts: ${context}`);
}

// Content quality validation - Ensures articles meet minimum standards
function validateContentQuality(article: any, plan: any): {
  isValid: boolean;
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let score = 100;
  
  // Check headline coverage in content
  const headlineWords = plan.headline.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
  const contentLower = article.detailed_content.toLowerCase();
  const mentionedWords = headlineWords.filter((w: string) => contentLower.includes(w)).length;
  
  if (mentionedWords < headlineWords.length * 0.5) {
    issues.push('Content may not fully address headline topic');
    score -= 15;
  }
  
  // Check keyword presence
  if (plan.targetKeyword && !contentLower.includes(plan.targetKeyword.toLowerCase())) {
    issues.push('Target keyword not found in content');
    score -= 10;
  }
  
  // Check for repetitive phrases (indicates poor quality)
  const sentences = article.detailed_content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
  const seenSentences = new Set();
  const duplicates: string[] = [];
  
  sentences.forEach((s: string) => {
    const normalized = s.trim().toLowerCase();
    if (normalized.length > 30) {
      if (seenSentences.has(normalized)) {
        duplicates.push(normalized.substring(0, 50));
      } else {
        seenSentences.add(normalized);
      }
    }
  });
  
  if (duplicates.length > 0) {
    issues.push(`${duplicates.length} duplicate sentences found`);
    score -= 20;
  }
  
  // Check headings structure
  const h2Count = (article.detailed_content.match(/<h2>/gi) || []).length;
  if (h2Count < 4) {
    issues.push('Insufficient content structure (need 4+ H2 headings)');
    score -= 10;
  }
  
  // Check citation markers resolved
  if (article.detailed_content.includes('[CITATION_NEEDED]')) {
    issues.push('Unresolved citation markers present');
    score -= 25;
  }
  
  // Check minimum word count
  const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  if (wordCount < 1200) {
    issues.push(`Content too short (${wordCount} words, minimum 1200)`);
    score -= 15;
  }
  
  return {
    isValid: score >= 60,
    issues,
    score
  };
}

// Heartbeat wrapper - sends periodic updates during long operations
async function withHeartbeat<T>(
  supabase: any,
  jobId: string,
  promise: Promise<T>,
  intervalMs: number = 15000
): Promise<T> {
  const heartbeatInterval = setInterval(async () => {
    console.log(`[Job ${jobId}] 💓 Heartbeat - operation still in progress...`);
    await sendHeartbeat(supabase, jobId);
  }, intervalMs);
  
  try {
    return await promise;
  } finally {
    clearInterval(heartbeatInterval);
  }
}

// Save individual article to database immediately (checkpointing)
async function saveArticleToDatabase(
  supabase: any,
  jobId: string,
  article: any,
  articleIndex: number
): Promise<string> {
  try {
    console.log(`[Job ${jobId}] 💾 Saving article ${articleIndex + 1} to database: ${article.headline}`);
    
    // Check if article already exists
    const { data: existing } = await supabase
      .from('blog_articles')
      .select('id')
      .eq('cluster_id', jobId)
      .eq('slug', article.slug)
      .maybeSingle();
    
    if (existing) {
      console.log(`[Job ${jobId}] ⚠️ Article "${article.headline}" already exists (ID: ${existing.id}), skipping insert`);
      return existing.id;
    }
    
    const { data: inserted, error } = await supabase
      .from('blog_articles')
      .insert({
        ...article,
        cluster_id: jobId,
        status: 'draft',
        cta_article_ids: [],
        related_article_ids: [],
        cluster_number: articleIndex + 1
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`[Job ${jobId}] ❌ Failed to save article ${articleIndex + 1}:`, error);
      throw error;
    }
    
    console.log(`[Job ${jobId}] ✅ Article ${articleIndex + 1} saved successfully (ID: ${inserted.id})`);
    return inserted.id;
  } catch (error) {
    console.error(`[Job ${jobId}] 💥 Error saving article:`, error);
    throw error;
  }
}

// Get already completed articles for resume capability
async function getCompletedArticles(supabase: any, jobId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('blog_articles')
      .select('*')
      .eq('cluster_id', jobId)
      .order('cluster_number', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching completed articles:`, error);
    return [];
  }
}

// Atomically generate unique slug and save article (eliminates race conditions)
async function generateUniqueSlugAndSave(
  supabase: any,
  article: any,
  jobId: string,
  articleIndex: number,
  maxRetries: number = 50
): Promise<string> {
  // Generate base slug from headline with proper accent normalization
  // Use pre-assigned slug if available (from batch deduplication)
  const baseSlug = article.slug || article.headline
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (article.slug) {
    console.log(`[Job ${jobId}] ✅ Using pre-assigned slug: "${article.slug}"`);
  } else {
    console.log(`[Job ${jobId}] ⚠️ No pre-assigned slug found, generating from headline`);
  }
  
  console.log(`[Job ${jobId}] 🔐 Attempting atomic slug reservation for: "${baseSlug}"`);
  
  // Try to insert with base slug first, then with counter suffixes
  for (let counter = 0; counter <= maxRetries; counter++) {
    const candidateSlug = counter === 0 ? baseSlug : `${baseSlug}-${counter}`;
    
    try {
      // Attempt INSERT with this slug (atomic operation)
      const { data: inserted, error } = await supabase
        .from('blog_articles')
        .insert({
          ...article,
          slug: candidateSlug,
          cluster_id: jobId,
          status: 'draft',
          cta_article_ids: [],
          related_article_ids: [],
          cluster_number: articleIndex + 1
        })
        .select('id')
        .single();
      
      if (error) {
        // Check if it's a duplicate slug error (unique constraint violation)
        if (error.code === '23505' && error.message.includes('blog_articles_slug_key')) {
          console.log(`[Job ${jobId}] ⚠️ Slug collision on attempt ${counter + 1}: "${candidateSlug}" - retrying...`);
          
          // Alert if we're hitting many retries (indicates AI isn't following uniqueness instructions)
          if (counter >= 3) {
            console.error(`[Job ${jobId}] 🚨 HIGH RETRY COUNT: Slug "${baseSlug}" required ${counter + 1} attempts. AI may not be following uniqueness guidelines.`);
          }
          
          continue; // Try next counter
        }
        
        // Other error - throw it
        console.error(`[Job ${jobId}] ❌ Database error on slug "${candidateSlug}":`, error);
        throw error;
      }
      
      // Success! Slug was unique and article saved
      console.log(`[Job ${jobId}] ✅ Article saved with slug: "${candidateSlug}" (ID: ${inserted.id})`);
      return inserted.id;
      
    } catch (error) {
      // Re-throw unexpected errors
      console.error(`[Job ${jobId}] 💥 Unexpected error during save:`, error);
      throw error;
    }
  }
  
  // Fallback: All retries exhausted, use timestamp suffix (guaranteed unique)
  const timestampSlug = `${baseSlug}-${Date.now()}`;
  console.warn(`[Job ${jobId}] ⚠️ Max retries exhausted, using timestamp suffix: "${timestampSlug}"`);
  
  const { data: fallbackInserted, error: fallbackError } = await supabase
    .from('blog_articles')
    .insert({
      ...article,
      slug: timestampSlug,
      cluster_id: jobId,
      status: 'draft',
      cta_article_ids: [],
      related_article_ids: [],
      cluster_number: articleIndex + 1
    })
    .select('id')
    .single();
  
  if (fallbackError) {
    console.error(`[Job ${jobId}] ❌ Even timestamp fallback failed:`, fallbackError);
    throw fallbackError;
  }
  
  console.log(`[Job ${jobId}] ✅ Fallback save successful (ID: ${fallbackInserted.id})`);
  return fallbackInserted.id;
}

// Main generation function (runs in background)
async function generateCluster(jobId: string, topic: string, language: string, targetAudience: string, primaryKeyword: string, findInternalLinks: boolean = true) {
  const OVERALL_TIMEOUT = 20 * 60 * 1000; // 20 minutes max for entire generation
  const startTime = Date.now();
  
  const checkTimeout = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > OVERALL_TIMEOUT) {
      throw new Error(`Overall generation timeout after ${Math.floor(elapsed / 1000)}s (max 20 minutes)`);
    }
  };
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    console.log(`[Job ${jobId}] Starting generation for:`, { topic, language, targetAudience, primaryKeyword });
    await updateProgress(supabase, jobId, 0, 'Starting generation...');
    
    checkTimeout(); // Check before starting

    // Validate LOVABLE_API_KEY before starting
    console.log(`[Job ${jobId}] 🔐 Validating LOVABLE_API_KEY...`);
    try {
      const testResponse = await withTimeout(
        fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY!}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }],
          }),
        }),
        10000,
        'API key validation timeout'
      );
      
      if (!testResponse.ok && testResponse.status === 401) {
        throw new Error('LOVABLE_API_KEY is invalid or expired');
      }
      console.log(`[Job ${jobId}] ✅ LOVABLE_API_KEY validated successfully`);
    } catch (error) {
      console.error(`[Job ${jobId}] ❌ API key validation failed:`, error);
      throw new Error(`Lovable AI key validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Fetch master content prompt from database
    console.log(`[Job ${jobId}] Fetching master content prompt...`);
    const { data: masterPromptData, error: promptError } = await supabase
      .from('content_settings')
      .select('setting_value, updated_at')
      .eq('setting_key', 'master_content_prompt')
      .single();

    if (promptError) {
      console.error(`[Job ${jobId}] Error fetching master prompt:`, promptError);
    }

    const masterPrompt = masterPromptData?.setting_value || '';
    const hasCustomPrompt = masterPrompt && masterPrompt.trim().length > 100;

    if (hasCustomPrompt) {
      console.log(`[Job ${jobId}] ✅ Using CUSTOM master prompt (${masterPrompt.length} chars, last updated: ${masterPromptData.updated_at})`);
    } else {
      console.log(`[Job ${jobId}] ⚠️ No custom prompt found, using fallback content generation`);
    }

    // Fetch available authors and categories
    const { data: authors } = await supabase.from('authors').select('*');
    const { data: categories } = await supabase.from('categories').select('*');

    // STEP 1: Generate cluster structure
    await updateProgress(supabase, jobId, 1, 'Generating article structure...');
    console.log(`[Job ${jobId}] Step 1: Generating structure`);

    const structurePrompt = `You are an expert SEO content strategist for a luxury real estate agency in Costa del Sol, Spain.

Create a content cluster structure for the topic: "${topic}"
Language: ${language}
Target audience: ${targetAudience}
Primary keyword: ${primaryKeyword}

Generate 6 article titles following this funnel structure:
- 3 TOFU (Top of Funnel) - Awareness stage, educational, broad topics (e.g., "What is Costa del Sol Like for...")
- 2 MOFU (Middle of Funnel) - Consideration stage, comparison, detailed guides (e.g., "How to Choose...")
- 1 BOFU (Bottom of Funnel) - Decision stage, action-oriented (e.g., "Complete Guide to Buying...")

Each article must include the location "Costa del Sol" in the headline.

**CRITICAL: SLUG UNIQUENESS REQUIREMENT**
Each headline MUST be sufficiently distinct to generate a unique URL slug. To ensure this:
- Vary the leading words (don't start every headline the same way)
- Include differentiating keywords (year, specific location, property type, buyer profile)
- Avoid repetitive phrasing patterns
- Think: "If I lowercase and hyphenate these headlines, will they be clearly different?"

Examples of GOOD variation:
✅ "Costa del Sol Investment Guide 2025: Airport Properties"
✅ "Buying Near Málaga Airport: Complete Location Analysis"
✅ "Airport-Adjacent Real Estate: Costa del Sol ROI Insights"

Examples of BAD variation (too similar):
❌ "Costa del Sol: Investment Guide for Airport Properties"
❌ "Costa del Sol: Best Investments Near Airport"
(Both become: "costa-del-sol-investment-...")

Return ONLY valid JSON:
{
  "articles": [
    {
      "funnelStage": "TOFU",
      "headline": "What is Costa del Sol Like for International Buyers?",
      "targetKeyword": "costa del sol for international buyers",
      "searchIntent": "informational",
      "contentAngle": "Overview of Costa del Sol lifestyle, climate, culture for foreign buyers"
    }
  ]
}`;

    // Wrap AI call with timeout and retry
    const structureResponse = await retryWithBackoff(
      () => withTimeout(
        fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            max_tokens: 4096,
            messages: [
              { role: 'system', content: 'You are an SEO expert specializing in real estate content strategy. Return only valid JSON.' },
              { role: 'user', content: structurePrompt }
            ],
          }),
        }),
        120000, // 2 minute timeout
        'AI structure generation timed out'
      ),
      3,
      1000,
      'Structure generation'
    );

    if (!structureResponse.ok) {
      if (structureResponse.status === 429) {
        throw new Error('Lovable AI rate limit exceeded. Please wait and try again.');
      }
      if (structureResponse.status === 402) {
        throw new Error('Lovable AI credits depleted. Please add credits in workspace settings.');
      }
      const errorText = await structureResponse.text();
      throw new Error(`Lovable AI error (${structureResponse.status}): ${errorText}`);
    }

    // Send heartbeat after major operation
    await sendHeartbeat(supabase, jobId);

    const structureData = await safeJsonParse(structureResponse, 'article structure generation', jobId);
    const structureText = structureData.choices[0].message.content;

    console.log(`[Job ${jobId}] Raw AI response received, parsing structure...`);

    let articleStructures;
    try {
      const parsed = JSON.parse(structureText.replace(/```json\n?|\n?```/g, ''));
      // Handle multiple possible field name variations
      articleStructures = parsed.articles || 
                         parsed.contentCluster?.articles || 
                         parsed.contentClusterArticles || 
                         [];
      
      if (!Array.isArray(articleStructures) || articleStructures.length === 0) {
        console.error(`[Job ${jobId}] No article structures found. Parsed keys:`, Object.keys(parsed));
        throw new Error('AI did not return valid article structures');
      }
    } catch (parseError) {
      console.error(`[Job ${jobId}] Failed to parse AI response:`, parseError);
      console.error(`[Job ${jobId}] Response text:`, structureText);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
      throw new Error(`Invalid AI response format: ${errorMessage}`);
    }

    console.log(`[Job ${jobId}] Generated structure for`, articleStructures.length, 'articles');
    
    // Validate slug uniqueness potential BEFORE generating full articles
    console.log(`[Job ${jobId}] Validating headline uniqueness...`);
    const proposedSlugs = articleStructures.map((a: any) => 
      a.headline
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    );

    const slugSet = new Set(proposedSlugs);
    if (slugSet.size < proposedSlugs.length) {
      const duplicates = proposedSlugs.filter((slug: string, i: number) => 
        proposedSlugs.indexOf(slug) !== i
      );
      console.warn(`[Job ${jobId}] ⚠️ Detected ${duplicates.length} potential slug collisions:`, duplicates);
      console.warn(`[Job ${jobId}] Headlines:`, articleStructures.map((a: any) => a.headline));
      // Don't fail - let the atomic insert handle it - but log for monitoring
    } else {
      console.log(`[Job ${jobId}] ✅ All ${slugSet.size} proposed slugs are unique`);
    }
    
    // ✅ ENHANCED FIX: Check database + deduplicate slugs within batch
    console.log(`[Job ${jobId}] 🔧 Pre-processing slugs with database check...`);

    // Step 1: Fetch ALL existing slugs from database
    const { data: existingSlugsData, error: slugsError } = await supabase
      .from('blog_articles')
      .select('slug');

    if (slugsError) {
      console.error(`[Job ${jobId}] ⚠️ Could not fetch existing slugs:`, slugsError);
    }

    const existingSlugs = new Set<string>(
      (existingSlugsData || []).map(row => row.slug)
    );
    console.log(`[Job ${jobId}] 📊 Found ${existingSlugs.size} existing slugs in database`);

    // Step 2: Build slug map checking BOTH batch + database
    const usedSlugs = new Set<string>(existingSlugs); // Start with DB slugs
    const slugMap = new Map<number, string>();

    for (let i = 0; i < articleStructures.length; i++) {
      const headline = articleStructures[i].headline;
      
      // Normalize headline to base slug
      let baseSlug = headline
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      let finalSlug = baseSlug;
      let counter = 1;
      
      // Check against BOTH in-memory (this batch) AND database
      while (usedSlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
        console.log(`[Job ${jobId}] 🔄 Slug collision detected (batch or DB), trying: "${finalSlug}"`);
      }
      
      usedSlugs.add(finalSlug);
      slugMap.set(i, finalSlug);
      
      if (finalSlug !== baseSlug) {
        console.log(`[Job ${jobId}] ✏️ Modified slug for article ${i + 1}: "${baseSlug}" → "${finalSlug}"`);
      }
    }

    console.log(`[Job ${jobId}] ✅ All ${slugMap.size} slugs pre-assigned and unique (checked against ${existingSlugs.size} existing DB slugs)`);
    
    // Deployment verification log
    console.log(`[Job ${jobId}] 🚀 DEPLOYMENT CHECK: Slug deduplication v2.0 active`);
    console.log(`[Job ${jobId}] 📋 Final slug assignments:`, 
      Array.from(slugMap.entries()).map(([idx, slug]) => `${idx + 1}: ${slug}`)
    );
    
    checkTimeout(); // Check after structure generation

    // Check for already-completed articles (resume capability)
    const existingArticles = await getCompletedArticles(supabase, jobId);
    const startIndex = existingArticles.length;
    
    if (startIndex > 0) {
      console.log(`[Job ${jobId}] 🔄 RESUMING: Found ${startIndex} existing articles, continuing from article ${startIndex + 1}`);
      await updateProgress(supabase, jobId, 2 + startIndex, `Resuming from article ${startIndex + 1}...`, startIndex + 1);
    }

    // STEP 2: Generate each article with detailed sections
    const articles = [...existingArticles]; // Start with existing articles
    const savedArticleIds: string[] = existingArticles.map(a => a.id);

    for (let i = startIndex; i < articleStructures.length; i++) {
      await updateProgress(supabase, jobId, 2 + i, `Generating article ${i + 1} of ${articleStructures.length}...`, i + 1);
      const plan = articleStructures[i];
      const article: any = {
        funnel_stage: plan.funnelStage,
        language,
        status: 'draft',
      };

      console.log(`[Job ${jobId}] Generating article ${i + 1}/${articleStructures.length}: ${plan.headline}`);

      // 1. HEADLINE
      article.headline = plan.headline;

      // 2. SLUG (pre-assigned from batch deduplication)
      article.slug = slugMap.get(i)!; // Use the pre-calculated unique slug
      console.log(`[Job ${jobId}] Article ${i + 1} using pre-assigned slug: "${article.slug}"`);

      // 3. CATEGORY (AI-based selection from exact database categories)
      const validCategoryNames = (categories || []).map(c => c.name);
      
      const categoryPrompt = `Select the most appropriate category for this article from this EXACT list:
${validCategoryNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Article Details:
- Headline: ${plan.headline}
- Target Keyword: ${plan.targetKeyword}
- Content Angle: ${plan.contentAngle}
- Funnel Stage: ${plan.funnelStage}

Return ONLY the category name exactly as shown above. No explanation, no JSON, just the category name.`;

      let finalCategory;
      
      try {
        const categoryData: any = await retryApiCall(
          async () => {
            const response = await withTimeout(
              fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  max_tokens: 256,
                  messages: [{ role: 'user', content: categoryPrompt }],
                }),
              }),
              30000, // 30 seconds - simple classification
              `Category selection timeout for article ${i+1}`,
              jobId
            );
            
            if (!response.ok) {
              if (response.status === 429 || response.status === 402) {
                throw new Error(`Lovable AI error: ${response.status}`);
              }
            }
            
            return response;
          },
          'category selection',
          jobId,
          2
        );
        
        const aiSelectedCategory = categoryData.choices[0].message.content.trim();
        
        // Validate AI response against database categories
        const isValidCategory = validCategoryNames.includes(aiSelectedCategory);
        
        if (isValidCategory) {
          finalCategory = aiSelectedCategory;
          console.log(`[Job ${jobId}] ✅ AI selected valid category: "${finalCategory}"`);
        } else {
          console.warn(`[Job ${jobId}] ⚠️ AI returned invalid category: "${aiSelectedCategory}". Using fallback.`);
          
          // Intelligent fallback based on headline keywords
          const headlineLower = plan.headline.toLowerCase();
          
          if (headlineLower.includes('buy') || headlineLower.includes('purchase')) {
            finalCategory = 'Buying Guides';
          } else if (headlineLower.includes('invest') || headlineLower.includes('return')) {
            finalCategory = 'Investment Strategies';
          } else if (headlineLower.includes('market') || headlineLower.includes('price') || headlineLower.includes('trend')) {
            finalCategory = 'Market Analysis';
          } else if (headlineLower.includes('location') || headlineLower.includes('area') || headlineLower.includes('where')) {
            finalCategory = 'Location Insights';
          } else if (headlineLower.includes('legal') || headlineLower.includes('law') || headlineLower.includes('regulation')) {
            finalCategory = 'Legal & Regulations';
          } else if (headlineLower.includes('manage') || headlineLower.includes('maintain')) {
            finalCategory = 'Property Management';
          } else {
            // Ultimate fallback: use most common category for the funnel stage
            finalCategory = plan.funnelStage === 'TOFU' ? 'Market Analysis' : 'Buying Guides';
          }
          
          console.log(`[Job ${jobId}] 🔄 Fallback category assigned: "${finalCategory}"`);
        }
      } catch (error) {
        console.error(`[Job ${jobId}] ❌ Error selecting category:`, error);
        // Error fallback
        finalCategory = categories?.[0]?.name || 'Buying Guides';
        console.log(`[Job ${jobId}] 🔄 Error fallback category: "${finalCategory}"`);
      }
      
      article.category = finalCategory;

      // 4. SEO META TAGS
      const seoPrompt = `Create SEO meta tags for this article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Angle: ${plan.contentAngle}
Language: ${language}

Requirements:
- Meta Title: Include primary keyword, location "Costa del Sol", and year 2025
- Max 60 characters (strict limit)
- Meta Description: Compelling summary with CTA
- Max 160 characters (strict limit)
- Include numbers or specific benefits (e.g., "5 steps", "Complete guide", "Expert tips")

Return ONLY valid JSON:
{
  "title": "Title here (max 60 chars)",
  "description": "Description with benefits and CTA (max 160 chars)"
}`;

      const seoData: any = await retryApiCall(
        async () => {
          const response = await withTimeout(
            fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                max_tokens: 512,
                messages: [{ role: 'user', content: seoPrompt }],
              }),
            }),
            60000, // 60 seconds
            `SEO meta generation timeout for article ${i+1}`,
            jobId
          );

          if (!response.ok && (response.status === 429 || response.status === 402)) {
            throw new Error(`Lovable AI error: ${response.status}`);
          }
          
          return response;
        },
        'SEO meta generation',
        jobId,
        2
      );
      
      const seoText = seoData.choices[0].message.content;
      const seoMeta = JSON.parse(seoText.replace(/```json\n?|\n?```/g, ''));
      
      article.meta_title = seoMeta.title;
      article.meta_description = seoMeta.description;
      article.canonical_url = null;

      // 5. SPEAKABLE ANSWER (40-60 words)
      const speakablePrompt = `Write a 40-60 word speakable answer for this article in ${language}:

Question: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Focus: ${plan.contentAngle}

Requirements:
- Write ENTIRELY in ${language} language
- Conversational tone (use "you" and "your")
- Present tense, active voice
- Self-contained (no pronouns referring to previous context)
- Actionable (tell reader what to DO)
- No jargon
- Exactly 40-60 words

Example format:
"To [action], you can [step 1], [step 2], and [step 3]. The process typically takes [timeframe] and [key benefit]. [Additional helpful detail]."

Return ONLY the speakable text in ${language}, no JSON, no formatting, no quotes.`;

      const speakableData: any = await retryApiCall(
        async () => {
          const response = await withTimeout(
            fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                max_tokens: 256,
                messages: [{ role: 'user', content: speakablePrompt }],
              }),
            }),
            60000, // 60 seconds
            `Speakable answer generation timeout for article ${i+1}`,
            jobId
          );

          if (!response.ok && (response.status === 429 || response.status === 402)) {
            throw new Error(`Lovable AI error: ${response.status}`);
          }
          
          return response;
        },
        'speakable answer generation',
        jobId,
        2
      );
      
      article.speakable_answer = speakableData.choices[0].message.content.trim();

      // 6. DETAILED CONTENT (1500-2500 words)
      console.log(`[Job ${jobId}] Generating detailed content for article ${i + 1}: "${plan.headline}"`);
      
      // Build content prompt using master prompt if available
      let contentPromptMessages;
      
      if (hasCustomPrompt) {
        // Replace variables in master prompt
        const processedPrompt = masterPrompt
          .replace(/\{\{headline\}\}/g, plan.headline)
          .replace(/\{\{targetKeyword\}\}/g, plan.targetKeyword || primaryKeyword)
          .replace(/\{\{searchIntent\}\}/g, plan.searchIntent || 'informational')
          .replace(/\{\{contentAngle\}\}/g, plan.contentAngle || 'comprehensive guide')
          .replace(/\{\{funnelStage\}\}/g, plan.funnelStage)
          .replace(/\{\{targetAudience\}\}/g, targetAudience)
          .replace(/\{\{language\}\}/g, language);

        console.log(`[Job ${jobId}] ✅ Using master prompt with replaced variables for article ${i + 1}`);

        contentPromptMessages = [
          {
            role: "system",
            content: "You are Hans Beeckman, an expert Costa del Sol property specialist. Follow the master prompt instructions exactly."
          },
          {
            role: "user",
            content: processedPrompt
          }
        ];
      } else {
        // Fallback to original prompt structure
        console.log(`[Job ${jobId}] ⚠️ Using fallback prompt structure for article ${i + 1}`);
        
        const contentPrompt = `Write a comprehensive 2000-word blog article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Search Intent: ${plan.searchIntent}
Content Angle: ${plan.contentAngle}
Funnel Stage: ${plan.funnelStage}
Target Audience: ${targetAudience}
Language: ${language}

Requirements:
1. Structure with H2 and H3 headings (proper hierarchy)
2. Include specific data points, numbers, timeframes
3. Write for ${plan.funnelStage} stage:
   - TOFU: Educational, broad, establish authority
   - MOFU: Comparative, detailed, build trust
   - BOFU: Action-oriented, conversion-focused, specific CTAs
4. Include real examples from Costa del Sol (Marbella, Estepona, Málaga, Mijas, Benalmádena, etc.)
5. Natural tone, 8th-grade reading level
6. Reference claims that need citations naturally, DO NOT use [CITATION_NEEDED] markers
7. Write naturally without placeholder markers - internal links will be added automatically by the system

Format as HTML with:
- <h2> for main sections (5-7 sections)
- <h3> for subsections
- <p> for paragraphs
- <ul> and <li> for lists
- <strong> for emphasis
- <table> if comparing data

External citations will be added automatically by the system.

Return ONLY the HTML content, no JSON wrapper, no markdown code blocks.`;

        contentPromptMessages = [
          { role: 'user', content: contentPrompt }
        ];
      }

      // Build Lovable AI request
      let aiRequestBody: any = {
          model: 'google/gemini-2.5-flash',
        max_tokens: 8192,
        messages: contentPromptMessages,
      };

      console.log(`[Job ${jobId}] 🤖 Starting Lovable AI call for article ${i + 1}:`, {
        headline: plan.headline,
        funnelStage: plan.funnelStage,
        hasCustomPrompt,
        maxTokens: 8192,
        timestamp: new Date().toISOString()
      });

      const contentData: any = await retryApiCall(
        async () => {
          const response = await withHeartbeat(
            supabase,
            jobId,
            withTimeout(
              fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY!}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(aiRequestBody),
              }),
              180000, // 3 minutes - complex content generation
              `Content generation timeout for article ${i + 1}`,
              jobId
            )
          );

          console.log(`[Job ${jobId}] ✅ Lovable AI responded for article ${i + 1}:`, {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            timestamp: new Date().toISOString()
          });

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Lovable AI rate limit exceeded. Please wait and try again.');
            }
            if (response.status === 402) {
              throw new Error('Lovable AI credits depleted. Please add credits in workspace settings.');
            }
            
            const responseClone = response.clone();
            let errorText = 'Unknown error';
            try {
              errorText = await responseClone.text();
            } catch (e) {
              console.error(`[Job ${jobId}] Could not read error response:`, e);
            }
            
            console.error(`[Job ${jobId}] Content generation failed for article ${i + 1}:`, response.status, errorText);
            throw new Error(`Content generation failed: ${response.status} - ${errorText}`);
          }

          return response;
        },
        `content generation for article ${i + 1}`,
        jobId,
        2
      );
      
      if (!contentData.choices?.[0]?.message?.content) {
        console.error(`[Job ${jobId}] Invalid content response for article ${i + 1}:`, contentData);
        throw new Error('Invalid content generation response');
      }

      const detailedContent = contentData.choices[0].message.content.trim();
      article.detailed_content = detailedContent;
      
      console.log(`[Job ${jobId}] ✅ Content parsed successfully for article ${i + 1}:`, {
        contentLength: detailedContent.length,
        wordCount: detailedContent.split(/\s+/).length,
        timestamp: new Date().toISOString()
      });
      
      // Log content quality metrics for monitoring
      const contentWordCount = detailedContent.split(/\s+/).length;
      const hasSpeakableAnswer = detailedContent.includes('speakable-answer');
      const internalLinkCount = (detailedContent.match(/\[INTERNAL_LINK:/g) || []).length;
      const citationCount = (detailedContent.match(/\[CITATION_NEEDED:/g) || []).length;
      const h2Count = (detailedContent.match(/<h2>/g) || []).length;
      
      console.log(`[Job ${jobId}] 📊 Content metrics for article ${i + 1}:`);
      console.log(`[Job ${jobId}]   • Word count: ${contentWordCount}`);
      console.log(`[Job ${jobId}]   • Has speakable answer: ${hasSpeakableAnswer}`);
      console.log(`[Job ${jobId}]   • Internal link markers: ${internalLinkCount}`);
      console.log(`[Job ${jobId}]   • Citation markers: ${citationCount}`);
      console.log(`[Job ${jobId}]   • H2 sections: ${h2Count}`);

      // 7. GENERATE FAQ ENTITIES (for ALL funnel stages) - WITH HEARTBEAT
      let faqEntities = null;
      const shouldGenerateFAQ = true; // Generate FAQs for TOFU, MOFU, and BOFU
      
      if (shouldGenerateFAQ) {
        await updateProgress(supabase, jobId, 7, `Generating FAQ entities for article ${i + 1}...`, i + 1);

        console.log(`[Job ${jobId}] 📝 Generating FAQ entities for ${plan.funnelStage} article...`);

        const contentPreview = detailedContent
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .slice(0, 1000)
          .join(' ');

        const faqPrompt = `Generate 3-5 frequently asked questions and detailed answers for this article:

Headline: ${plan.headline}
Topic: ${topic}
Funnel Stage: ${plan.funnelStage}
Language: ${language}

Content Summary:
${contentPreview}

Requirements:
- Generate EXACTLY 3-5 questions (aim for 4-5 if possible)
- Questions must be directly related to the article's specific topic
- Answers should be 50-100 words each
- Match the article's language (${language})
- Focus on what readers at ${plan.funnelStage} stage would ask:
  * TOFU: General awareness, "What is...", "Why does...", educational questions
  * MOFU: Comparison, process, timing, "How to...", evaluation questions
  * BOFU: Specific, actionable, decision-making, "Where to...", conversion questions
- Use natural, conversational question phrasing
- Ensure answers are accurate and helpful

Return ONLY valid JSON in this format:
{
  "faq_entities": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}`;

        try {
          // CRITICAL: Wrap FAQ generation with heartbeat to prevent timeout detection
          const faqData: any = await withHeartbeat(
            supabase,
            jobId,
            retryApiCall(
              async () => {
                const response = await withTimeout(
                  fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      model: 'google/gemini-2.5-flash',
                      messages: [
                        { role: 'system', content: 'You are an expert FAQ generator. Return only valid JSON with faq_entities array.' },
                        { role: 'user', content: faqPrompt }
                      ],
                      temperature: 0.7,
                      max_tokens: 3000
                    })
                  }),
                  90000, // 90 seconds
                  `FAQ generation timeout for article ${i+1}`,
                  jobId
                );

                if (!response.ok) {
                  console.warn(`[Job ${jobId}] ⚠️ FAQ generation failed with status ${response.status}`);
                  throw new Error(`FAQ API error: ${response.status}`);
                }
                
                return response;
              },
              'FAQ generation',
              jobId,
              2
            ),
            30000 // Send heartbeat every 30 seconds during FAQ generation
          );
          
          const faqText = faqData.choices[0]?.message?.content || '';
          const jsonMatch = faqText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            faqEntities = parsed.faq_entities || [];
            console.log(`[Job ${jobId}] ✅ Generated ${faqEntities.length} FAQ entities`);
          }
        } catch (error) {
          console.warn(`[Job ${jobId}] ⚠️ FAQ generation failed after retries:`, error instanceof Error ? error.message : 'Unknown error');
          console.log(`[Job ${jobId}] 🔄 Continuing without FAQs (graceful degradation)`);
          // GRACEFUL DEGRADATION: Continue without FAQs rather than crashing entire job
          faqEntities = [];
        }
      }

      // Assign FAQ entities to article
      article.faq_entities = faqEntities || [];

      // 8. FEATURED IMAGE (using existing generate-image function with enhanced prompt)
      
      // Location-specific visual markers for authentic photography
      const locationVisualMarkers: Record<string, string[]> = {
        'Marbella': [
          'Puerto Banús marina visible in distance',
          'Golden Mile luxury architecture',
          'Sierra Blanca mountains in background',
          'La Concha mountain peak visible',
          'exclusive gated community aesthetic',
          'high-end contemporary design',
          'palm-lined promenade',
          'Marbella Club Hotel style architecture'
        ],
        'Estepona': [
          'traditional whitewashed pueblo architecture',
          'flower-pot lined cobblestone streets',
          'colorful murals on white walls',
          'family-friendly beachfront promenade',
          'charming old town character',
          'Plaza de las Flores atmosphere',
          'traditional Andalusian balconies',
          'coastal walkway with palm trees'
        ],
        'Málaga': [
          'Málaga Cathedral visible in cityscape',
          'historic port and modern marina',
          'urban coastal architecture',
          'Gibralfaro Castle on hilltop',
          'contemporary city center buildings',
          'Plaza de la Merced atmosphere',
          'modern art district vibes',
          'cosmopolitan Mediterranean urban setting'
        ],
        'Mijas': [
          'hillside pueblo blanco architecture',
          'mountain village atmosphere',
          'panoramic coastal views from elevation',
          'traditional whitewashed village streets',
          'Sierra de Mijas mountain backdrop',
          'rural mountain setting with sea views',
          'authentic Andalusian mountain character',
          'terraced hillside development'
        ],
        'Benalmádena': [
          'marina with luxury yachts and boats',
          'modern waterfront architecture',
          'family resort atmosphere',
          'Tivoli World entertainment nearby',
          'Benalmádena Pueblo traditional quarter',
          'cable car to Calamorro mountain visible',
          'beachfront entertainment district',
          'contemporary coastal residential towers'
        ],
        'Costa del Sol': [
          'Mediterranean coastal architecture',
          'Sierra de Mijas mountains in distance',
          'golden beaches with blue flag status',
          'typical Andalusian white architecture',
          'subtropical Mediterranean vegetation',
          'coastal promenade with palm trees',
          'terraced hillside properties',
          'year-round sunshine aesthetic'
        ]
      };

      // Photorealism enforcement layer
      const photoRealismSuffix = `
PHOTOGRAPHIC REQUIREMENTS - MANDATORY:
- Shot on location in Costa del Sol, Spain
- Real architectural photography style, NOT AI-generated render
- Natural lighting from actual Mediterranean sun
- Documentary realism with authentic imperfections
- Actual existing property or location, NOT conceptual visualization
- Professional real estate listing photography quality
- Geographic authenticity: MUST show recognizable Costa del Sol elements
- Camera details: shot with Canon EOS R5, 24-70mm lens, f/4
- NO generic AI-generated features or perfect symmetry
- NO stock photo aesthetic or overly polished renders
- Include subtle environmental details: weathering, lived-in spaces, natural wear
- Authentic Spanish architectural details and local materials`;

      // Get location-specific visual markers
      const getLocationMarkers = (location: string, seed: number): string => {
        const markers = locationVisualMarkers[location] || locationVisualMarkers['Costa del Sol'];
        // Select 2-3 markers for variety without overwhelming the prompt
        const selectedMarkers = [
          markers[seed % markers.length],
          markers[(seed + 1) % markers.length]
        ];
        return selectedMarkers.join(', ');
      };

      // Validate headline-to-image matching requirements
      const extractHeadlineRequirements = (headline: string): {
        hasSolar: boolean;
        hasEco: boolean;
        propertyType: string | null;
        location: string;
        specificFeature: string | null;
      } => {
        const text = headline.toLowerCase();
        
        return {
          hasSolar: text.includes('solar'),
          hasEco: text.match(/\b(eco|green|sustainable|energy-efficient|passive|breeam)\b/) !== null,
          propertyType: text.match(/\b(villa|apartment|penthouse|townhouse)\b/)?.[0] || null,
          location: text, // Will be processed by inferLocation
          specificFeature: text.match(/\b(rooftop|terrace|facade|panel|garden|certification)\b/)?.[0] || null
        };
      };
      
      const inferPropertyType = (contentAngle: string, headline: string) => {
        const text = (contentAngle + ' ' + headline).toLowerCase();
        if (text.includes('villa')) return 'luxury Mediterranean villa';
        if (text.includes('apartment') || text.includes('flat')) return 'modern apartment';
        if (text.includes('penthouse')) return 'penthouse with terrace';
        if (text.includes('townhouse')) return 'townhouse';
        return 'luxury property';
      };

      // Detect article topic for contextual image generation
      const detectArticleTopic = (headline: string): string => {
        const text = headline.toLowerCase();
        
        // Eco/Sustainability articles (PRIORITY CHECK FIRST)
        if (text.match(/\b(eco|green|sustainable|sustainability|carbon neutral|solar|renewable|energy efficient|breeam|leed|environmental|climate|duurzaam|zonne|energie|milieu|groen|energie-effici[eë]nt)\b/)) {
          return 'eco-sustainability';
        }
        
        // Market analysis / trends / forecasts
        if (text.match(/\b(market|trends|forecast|outlook|analysis|statistics|data|report|2025|2026|predictions)\b/)) {
          return 'market-analysis';
        }
        
        // Digital nomads / remote work
        if (text.match(/\b(digital nomad|remote work|coworking|work from home|expat tech|freelance)\b/)) {
          return 'digital-nomad';
        }
        
        // Buying guides / how-to
        if (text.match(/\b(guide to|how to|step by step|buying guide|beginner|starter)\b/)) {
          return 'buying-guide';
        }
        
        // Legal/Process articles
        if (text.match(/\b(buy|buying|purchase|process|legal|documents?|nie|tax|fees?|cost|steps?)\b/)) {
          return 'process-legal';
        }
        
        // Comparison articles
        if (text.match(/\b(vs|versus|compare|comparison|best|choose|which|difference|beyond)\b/)) {
          return 'comparison';
        }
        
        // Investment articles
        if (text.match(/\b(invest|investment|roi|rental|yield|return|profit|market|portfolio|strategy)\b/)) {
          return 'investment';
        }
        
        // Lifestyle articles
        if (text.match(/\b(live|living|lifestyle|expat|retire|retirement|community|culture|quality of life)\b/)) {
          return 'lifestyle';
        }
        
        // Area/location guides
        if (text.match(/\b(guide|area|neighborhood|district|zone|where|location|hidden gem|discover)\b/)) {
          return 'location-guide';
        }
        
        // Property management / rental
        if (text.match(/\b(property management|tenant|vacation rental|maintenance|landlord)\b/)) {
          return 'property-management';
        }
        
        // Property type specific
        if (text.match(/\b(villa|apartment|penthouse|townhouse|second home)\b/)) {
          return 'property-showcase';
        }
        
        // Default
        return 'general-property';
      };

      // Generate contextual image prompt based on funnel stage and topic
      const generateContextualImagePrompt = (
        headline: string,
        funnelStage: string,
        topic: string,
        propertyType: string,
        location: string,
        articleIndex: number
      ): string => {
        
        // Extract headline requirements for validation
        const requirements = extractHeadlineRequirements(headline);
        
        // Get location-specific visual markers
        const uniqueSeed = headline.length + articleIndex;
        const locationMarkers = getLocationMarkers(location, uniqueSeed);
        
        // UNIQUENESS TRACKING: Vary perspectives based on article index + headline for better randomization
        const perspectives = [
          'wide-angle perspective',
          'intimate close-up details',
          'aerial drone view',
          'interior-focused composition',
          'lifestyle-centered framing',
          'architectural detail focus'
        ];
        const perspective = perspectives[uniqueSeed % perspectives.length];
        
        // Time variety using photography terminology
        const lightingConditions = [
          'morning golden hour at 8am, soft directional light',
          'midday Mediterranean sun at noon, bright even illumination',
          'late afternoon at 5pm, warm amber tones',
          'blue hour at dusk, twilight ambience',
          'sunset glow at 7pm, golden warm tones',
          'early sunrise at 6am, cool blue light'
        ];
        const lighting = lightingConditions[uniqueSeed % lightingConditions.length];
        const timeOfDay = lighting; // Alias for backward compatibility
        const baseQuality = 'ultra-realistic, 8k resolution, professional photography, no text, no watermarks';
        
        // Architectural style variety with specific regional context
        const archStyles = [
          'modern minimalist with clean lines',
          'traditional Andalusian Mediterranean',
          'contemporary coastal modernist',
          'classic Costa del Sol style',
          'sleek luxury modernist'
        ];
        const archStyle = archStyles[uniqueSeed % archStyles.length];
        
        // ========== TOFU (Top of Funnel) - Inspirational & Lifestyle ==========
        if (funnelStage === 'TOFU') {
          
          // Eco/Sustainability articles (INSPIRATIONAL)
          if (topic === 'eco-sustainability') {
            const ecoTofuOptions = [
              `INSPIRATIONAL SHOT: Solar panels prominently visible on ${propertyType} rooftop in ${location}, Costa del Sol. ${archStyle} architecture, sleek photovoltaic array with blue sky, ${locationMarkers}, ${lighting}, ${perspective}. Sustainability features showcase. ${photoRealismSuffix}`,
              
              `ARCHITECTURAL FEATURE: Vertical green wall with lush Mediterranean plants on building facade in ${location}. Living wall system, modern eco-architecture, ${locationMarkers}, ${lighting}, ${perspective}. Urban greening showcase. ${photoRealismSuffix}`,
              
              `LANDSCAPE SHOT: Wind turbines on Costa del Sol hillside near ${location}. Renewable energy farm with sea view, white turbines, ${locationMarkers}, ${lighting}, ${perspective}. Sustainable power generation. ${photoRealismSuffix}`,
              
              `ARCHITECTURAL SHOWCASE: Modern passive house with floor-to-ceiling windows in ${location}. Energy-efficient ${archStyle} home, ${locationMarkers}, ${lighting}, ${perspective}. Sustainable architecture. ${photoRealismSuffix}`,
              
              `COMMUNITY SCENE: Mediterranean garden with raised vegetable beds in ${location}. Neighbors gardening together, ${locationMarkers}, ${lighting}, ${perspective}. Sustainable urban living. ${photoRealismSuffix}`,
              
              `GREEN INFRASTRUCTURE: EV charging station at development in ${location}. Modern charger with solar canopy, ${propertyType} visible, ${locationMarkers}, ${lighting}, ${perspective}. Green transportation. ${photoRealismSuffix}`
            ];
            
            // If headline specifically mentions solar, ALWAYS use solar image
            if (requirements.hasSolar) {
              return ecoTofuOptions[0]; // Force solar panel image
            }
            
            return ecoTofuOptions[uniqueSeed % ecoTofuOptions.length];
          }
          
          // Market analysis articles
          if (topic === 'market-analysis') {
            return `Professional business scene in modern ${location} office: 
              Real estate market analysts reviewing data and trends, 
              large display screens showing graphs and statistics, 
              Costa del Sol skyline visible through office windows, 
              business professionals in meeting, contemporary workspace, 
              laptops and digital presentations, ${timeOfDay}, 
              ${perspective}, focus on DATA and BUSINESS not properties, 
              ${baseQuality}`;
          }
          
          // Digital nomad articles
          if (topic === 'digital-nomad') {
            return `Modern coworking lifestyle in ${location}, Costa del Sol: 
              Young remote workers in bright coworking space, 
              laptops and coffee, minimalist design, 
              Mediterranean views from windows, natural plants, 
              professional yet relaxed atmosphere, diverse professionals, 
              ${timeOfDay}, ${perspective}, NOT luxury villas, focus on WORK lifestyle, 
              ${baseQuality}`;
          }
          
          // Lifestyle articles
          if (topic === 'lifestyle') {
            return `Authentic lifestyle photography in ${location}, Costa del Sol: 
              International expats enjoying local Mediterranean life, 
              outdoor market or plaza scene, palm trees, 
              café culture, community interaction, 
              NO properties visible, focus on PEOPLE and CULTURE, 
              ${timeOfDay}, ${perspective}, documentary style, 
              ${baseQuality}`;
          }
          
          // Location guide articles
          if (topic === 'location-guide') {
            return `Aerial drone photography of ${location}, Costa del Sol: 
              Panoramic town view showing character and layout, 
              Mediterranean coastline and beaches, 
              mountains in background, urban planning visible, 
              ${timeOfDay}, ${perspective}, NOT focusing on specific properties, 
              wide establishing shot of the area, 
              ${baseQuality}`;
          }
          
          // Comparison articles
          if (topic === 'comparison') {
            return `Conceptual split-screen comparison imagery for ${location}: 
              Two distinct Costa del Sol locations side by side, 
              contrasting environments and atmospheres, 
              beach town vs mountain town, or urban vs rural, 
              clean graphic composition, ${timeOfDay}, ${perspective}, 
              NOT property interiors, focus on LOCATION character, 
              ${baseQuality}`;
          }
          
          // Default TOFU: Aspirational but varied
          const tofuVariations = [
            `Coastal lifestyle in ${location}, Costa del Sol: Beach promenade with palm trees, people walking, Mediterranean sea, ${timeOfDay}, ${perspective}, NOT infinity pools, ${baseQuality}`,
            `Mountain view from ${location}, Costa del Sol: Sierra Blanca mountains, hiking trails, nature and outdoor lifestyle, ${timeOfDay}, ${perspective}, NOT luxury properties, ${baseQuality}`,
            `${location} town center: Charming Mediterranean plaza, traditional architecture, outdoor dining, local atmosphere, ${timeOfDay}, ${perspective}, NO villas, ${baseQuality}`
          ];
          return tofuVariations[articleIndex % tofuVariations.length];
        }
        
        // ========== MOFU (Middle of Funnel) - Detailed & Comparative ==========
        if (funnelStage === 'MOFU') {
          
          // Eco/Sustainability articles (DETAILED)
          if (topic === 'eco-sustainability') {
            const ecoMofuOptions = [
              `Cross-section architectural diagram of passive house construction in ${location}: Insulation layers visible, ventilation system with heat recovery, thermal bridge-free design, ${archStyle} exterior, ${timeOfDay}, ${perspective}, technical sustainability features, energy efficiency cutaway, ${baseQuality}`,
              `BREEAM certification plaque on modern sustainable building in ${location}: Official green building certificate mounted on contemporary ${archStyle} facade, professional photography, ${timeOfDay}, ${perspective}, eco-credentials showcase, verified sustainability, ${baseQuality}`,
              `Geothermal heat pump installation for Costa del Sol home in ${location}: Ground-source heating system, underground pipes and manifold, modern mechanical room, ${timeOfDay}, ${perspective}, renewable heating technology, energy-efficient HVAC, ${baseQuality}`,
              `Smart home energy dashboard display in ${location} property: Wall-mounted tablet showing real-time solar production, battery storage levels, energy consumption graphs, ${timeOfDay}, ${perspective}, home automation for sustainability, energy monitoring system, ${baseQuality}`,
              `Rainwater harvesting system in ${location} Mediterranean home: Large collection tanks, filtration system, drip irrigation for garden, ${archStyle} architecture, ${timeOfDay}, ${perspective}, water conservation infrastructure, sustainable water management, ${baseQuality}`,
              `Energy-efficient appliances in modern ${location} kitchen: A+++ rated induction cooktop, efficient refrigerator, LED lighting, sleek contemporary design, ${timeOfDay}, ${perspective}, sustainable home features, eco-conscious interior, ${baseQuality}`
            ];
            return ecoMofuOptions[uniqueSeed % ecoMofuOptions.length];
          }
          
          // Market analysis for MOFU
          if (topic === 'market-analysis') {
            return `Investment analysis scene in ${location} real estate office: 
              Financial charts and property market data on screens, 
              professional investment consultant reviewing portfolios, 
              ROI graphs and statistics visible, modern office interior, 
              ${timeOfDay}, ${perspective}, NOT showing properties, focus on ANALYSIS, 
              ${baseQuality}`;
          }
          
          // Buying guide articles
          if (topic === 'buying-guide') {
            return `Property viewing experience in ${location}: 
              Real estate agent showing ${archStyle} ${propertyType} to international buyers, 
              clients examining property features, viewing interior spaces, 
              professional consultation in progress, ${timeOfDay}, ${perspective}, 
              NOT staged perfection, show REAL viewing experience, 
              ${baseQuality}`;
          }
          
          // Comparison articles
          if (topic === 'comparison') {
            return `Side-by-side property comparison visualization for ${location}: 
              Two different property styles in Costa del Sol, 
              ${archStyle} architecture contrast, 
              interior layout comparison, different price points, 
              ${timeOfDay}, ${perspective}, clean comparative photography, 
              NOT identical properties, show CLEAR differences, 
              ${baseQuality}`;
          }
          
          // Investment articles
          if (topic === 'investment') {
            return `Investment property showcase in ${location}: 
              High-yield rental ${propertyType} with modern appeal, 
              ${archStyle} design, professional staging, 
              rental-ready condition, ${timeOfDay}, ${perspective}, 
              NOT infinity pools, focus on RENTAL potential features, 
              ${baseQuality}`;
          }
          
          // Property showcase
          if (topic === 'property-showcase') {
            return `${archStyle} ${propertyType} detailed tour in ${location}: 
              Multiple rooms and spaces, architectural details, 
              living areas and bedrooms, kitchen and bathrooms, 
              ${timeOfDay} through windows, ${perspective}, 
              NOT only exterior pools, show INTERIOR spaces, 
              ${baseQuality}`;
          }
          
          // Default MOFU: Detailed property features
          return `${archStyle} ${propertyType} interior in ${location}, Costa del Sol: 
            Spacious living room with ${timeOfDay} natural light, 
            contemporary furnishings, high-end finishes, 
            terrace access visible, Mediterranean design elements, ${perspective}, 
            NOT pool-centric, focus on LIVING spaces, 
            ${baseQuality}`;
        }
        
        // ========== BOFU (Bottom of Funnel) - Professional & Process-Oriented ==========
        if (funnelStage === 'BOFU') {
          
          // Eco/Sustainability articles (DECISION-FOCUSED)
          if (topic === 'eco-sustainability') {
            const ecoBofuOptions = [
              `Property signing with energy performance certificates in ${location}: Buyer and agent reviewing EPC documents, A-rated energy certificate visible on desk, professional office setting, ${timeOfDay}, ${perspective}, green property transaction, eco-certification validation, ${baseQuality}`,
              `Property inspector showing green building certifications in ${location}: Professional inspection report with BREEAM/LEED ratings, sustainability checklist, modern ${archStyle} property, ${timeOfDay}, ${perspective}, eco-credentials verification, certification documents, ${baseQuality}`,
              `Solar panel warranty and installation documents in ${location}: Manufacturer guarantees, installation certificates, maintenance schedule, professional desk setup, ${timeOfDay}, ${perspective}, renewable energy investment paperwork, solar system documentation, ${baseQuality}`,
              `Energy audit results and savings projections for ${location} property: Detailed consumption analysis, cost savings graphs, efficiency upgrade recommendations, professional consultation, ${timeOfDay}, ${perspective}, financial benefits of sustainability, energy performance data, ${baseQuality}`,
              `Green mortgage consultation in ${location} bank office: Financial advisor explaining eco-home loan benefits, calculator with energy savings, sustainable property brochures, ${timeOfDay}, ${perspective}, green financing options, eco-mortgage advantages, ${baseQuality}`,
              `House keys next to sustainability certificates in ${location}: New home keys on table with energy rating, eco-building certifications, welcome documents, ${timeOfDay}, ${perspective}, sustainable property ownership, green home completion, ${baseQuality}`
            ];
            return ecoBofuOptions[uniqueSeed % ecoBofuOptions.length];
          }
          
          // Legal/process articles
          if (topic === 'process-legal') {
            return `Professional legal consultation in ${location} law office: 
              International property lawyer meeting with international clients, 
              legal documents for Costa del Sol real estate on desk, 
              professional office setting, contracts and paperwork, 
              ${timeOfDay} office lighting, ${perspective}, trust and expertise conveyed, 
              NOT properties, show LEGAL process, 
              ${baseQuality}`;
          }
          
          // Property management
          if (topic === 'property-management') {
            return `Property management service in ${location}: 
              Professional property manager inspecting ${propertyType}, 
              maintenance checklist, tenant interaction, 
              property care and management activities, 
              ${timeOfDay}, ${perspective}, NOT luxury glamour shots, show SERVICE aspect, 
              ${baseQuality}`;
          }
          
          // Comparison/decision articles
          if (topic === 'comparison') {
            return `Final decision consultation for ${location} property: 
              Serious buyers making final choice, real estate professional presenting options, 
              detailed property information and contracts on table, 
              modern office or property location, ${timeOfDay}, ${perspective}, 
              NOT staged properties, focus on DECISION making, 
              ${baseQuality}`;
          }
          
          // Investment for BOFU
          if (topic === 'investment') {
            return `Investment closing scene in ${location}: 
              Property investment deal finalization, 
              financial documents and keys on desk, 
              professional handshake between investor and agent, 
              modern office setting, ${timeOfDay}, ${perspective}, 
              NOT property exteriors, show TRANSACTION moment, 
              ${baseQuality}`;
          }
          
          // Default BOFU: Move-in ready
          return `Move-in ready ${archStyle} ${propertyType} in ${location}: 
            Pristine condition interior, fully furnished and staged, 
            keys prominently displayed on entrance table, 
            welcoming entrance hall, ${timeOfDay} through doorway, ${perspective}, 
            NOT pools or exteriors, show READY for ownership, 
            ${baseQuality}`;
        }
        
        // ========== Fallback ==========
        return `Professional ${location} Costa del Sol imagery: 
          ${archStyle} architecture, Mediterranean environment, 
          ${timeOfDay}, ${perspective}, diverse perspective, 
          NOT generic villa with pool, 
          ${baseQuality}`;
      };

      const inferLocation = (headline: string) => {
        const text = headline.toLowerCase();
        if (text.includes('marbella')) return 'Marbella';
        if (text.includes('estepona')) return 'Estepona';
        if (text.includes('malaga') || text.includes('málaga')) return 'Málaga';
        if (text.includes('mijas')) return 'Mijas';
        if (text.includes('benalmádena') || text.includes('benalmadena')) return 'Benalmádena';
        return 'Costa del Sol';
      };

      const propertyType = inferPropertyType(plan.contentAngle, plan.headline);
      const location = inferLocation(plan.headline);

      // Detect article topic and generate contextual prompt
      const articleTopic = detectArticleTopic(plan.headline);
      const imagePrompt = generateContextualImagePrompt(
        plan.headline,
        plan.funnelStage,
        articleTopic,
        propertyType,
        location,
        i  // Pass article index for uniqueness tracking
      );

      try {
        console.log(`🎨 Image generation context:
  - Funnel Stage: ${plan.funnelStage}
  - Detected Topic: ${articleTopic}
  - Property Type: ${propertyType}
  - Location: ${location}
  - Prompt: ${imagePrompt.substring(0, 150)}...`);
        
        const imageResponse = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: imagePrompt,
            headline: plan.headline,
          },
        });

        console.log('📸 Image response error:', imageResponse.error);
        console.log('📸 Image response data:', JSON.stringify(imageResponse.data));

        let featuredImageUrl = '';
        let featuredImageAlt = '';

        if (imageResponse.error) {
          console.error('❌ Edge function returned error:', imageResponse.error);
          throw new Error(`Edge function error: ${JSON.stringify(imageResponse.error)}`);
        }

        if (imageResponse.data?.error) {
          console.error('❌ FAL.ai API error:', imageResponse.data.error);
          throw new Error(`FAL.ai error: ${imageResponse.data.error}`);
        }

        if (imageResponse.data?.images?.[0]?.url) {
          const tempImageUrl = imageResponse.data.images[0].url;
          console.log('✅ Image generated successfully from FAL.ai:', tempImageUrl);

          // Download image from FAL.ai and persist to Supabase Storage
          try {
            console.log('📥 Downloading image from FAL.ai...');
            const imageResponse = await fetch(tempImageUrl);
            if (!imageResponse.ok) throw new Error(`Failed to download image: ${imageResponse.status}`);
            
            const imageBlob = await imageResponse.blob();
            const fileName = `cluster-${jobId}-article-${i + 1}.jpg`;
            
            console.log(`📤 Uploading to Supabase Storage: ${fileName}`);
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('article-images')
              .upload(fileName, imageBlob, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (uploadError) {
              console.error('❌ Failed to upload image to storage:', uploadError);
              featuredImageUrl = tempImageUrl; // Fallback to FAL.ai URL
            } else {
              // Get permanent public URL
              const { data: publicUrlData } = supabase.storage
                .from('article-images')
                .getPublicUrl(fileName);
              
              featuredImageUrl = publicUrlData.publicUrl;
              console.log('✅ Image persisted to Supabase Storage:', featuredImageUrl);
            }
          } catch (storageError) {
            console.error('❌ Storage operation failed:', storageError);
            featuredImageUrl = tempImageUrl; // Fallback to FAL.ai URL
          }

          // Generate SEO-optimized alt text
          const funnelIntent = plan.funnelStage === 'TOFU' ? 'awareness/lifestyle' : plan.funnelStage === 'MOFU' ? 'consideration/comparison' : 'decision/action';
          const funnelStyle = plan.funnelStage === 'TOFU' ? 'inspiring lifestyle' : plan.funnelStage === 'MOFU' ? 'detailed comparison' : 'professional consultation';
          
          const altPrompt = `Create SEO-optimized alt text IN ${language.toUpperCase()} LANGUAGE for this image:

Article: ${plan.headline}
Funnel Stage: ${plan.funnelStage} (${funnelIntent})
Article Topic: ${articleTopic}
Target Keyword: ${plan.targetKeyword}
Image shows: ${imagePrompt}

Requirements:
- Include primary keyword "${plan.targetKeyword}"
- Reflect the ${plan.funnelStage} intent (${funnelStyle})
- Describe what's visible in the image accurately
- Max 125 characters
- Natural, descriptive (not keyword stuffed)

Return only the alt text, no quotes, no JSON.`;

          const altData: any = await retryApiCall(
            async () => {
              const response = await withTimeout(
                fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    max_tokens: 256,
                    messages: [{ role: 'user', content: altPrompt }],
                  }),
                }),
                45000, // 45 seconds - simple task
                `Alt text generation timeout for article ${i+1}`,
                jobId
              );

              if (!response.ok && (response.status === 429 || response.status === 402)) {
                throw new Error(`Lovable AI error: ${response.status}`);
              }
              
              return response;
            },
            'alt text generation',
            jobId,
            2
          );
          
          featuredImageAlt = altData.choices[0].message.content.trim();
          
          console.log(`✅ Contextual image generated:
  - Funnel-appropriate style: ${funnelStyle}
  - Topic match: ${articleTopic}
  - Image URL: ${featuredImageUrl}
  - Alt text: ${featuredImageAlt}`);
        } else {
          console.warn('⚠️ No images in response');
          throw new Error('No images returned from FAL.ai');
        }

        article.featured_image_url = featuredImageUrl;
        article.featured_image_alt = featuredImageAlt;
        article.featured_image_caption = featuredImageUrl ? `${plan.headline} - Luxury real estate in Costa del Sol` : null;
      } catch (error) {
        console.error('❌ IMAGE GENERATION FAILED:', error);
        console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        // Use placeholder image instead of empty string
        article.featured_image_url = 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200';
        article.featured_image_alt = `${plan.headline} - Costa del Sol luxury real estate`;
        article.featured_image_caption = `${plan.headline} - Luxury real estate in Costa del Sol`;
        
        console.log('⚠️ Using placeholder image for:', plan.headline);
      }

      // 8. DIAGRAM (for MOFU/BOFU articles using existing generate-diagram function)
      if (plan.funnelStage !== 'TOFU') {
        try {
          const diagramResponse = await withTimeout(
            supabase.functions.invoke('generate-diagram', {
              body: {
                articleContent: article.detailed_content,
                headline: plan.headline,
                language: language,
              },
            }),
            120000, // 2 minutes - complex Mermaid + image generation
            `Diagram generation timeout for article ${i+1}`,
            jobId
          );

          if (diagramResponse.data?.mermaidCode) {
            article.diagram_url = diagramResponse.data.mermaidCode;
            article.diagram_description = diagramResponse.data.description;
          } else {
            article.diagram_url = null;
            article.diagram_description = null;
          }
        } catch (error) {
          console.error('Diagram generation failed:', error);
          article.diagram_url = null;
          article.diagram_description = null;
        }
      } else {
        article.diagram_url = null;
        article.diagram_description = null;
      }

      // 9. E-E-A-T ATTRIBUTION (AI-powered author matching)
      if (authors && authors.length > 0) {
        try {
          const authorPrompt = `Suggest E-E-A-T attribution for this real estate article:

Headline: ${plan.headline}
Funnel Stage: ${plan.funnelStage}
Target Keyword: ${plan.targetKeyword}
Content Focus: ${article.speakable_answer}

Available Authors:
${authors.map((author: any, idx: number) => 
  `${idx + 1}. ${author.name} - ${author.job_title}, ${author.years_experience} years experience
     Bio: ${author.bio.substring(0, 200)}
     Credentials: ${author.credentials.join(', ')}`
).join('\n\n')}

Requirements:
- Match author expertise to article topic
- Consider funnel stage (${plan.funnelStage}):
  * TOFU: Educational background, broad market knowledge
  * MOFU: Analytical skills, comparison expertise
  * BOFU: Transaction experience, legal knowledge
- Select different person as reviewer (if available)
- Reviewer should complement primary author's expertise

Return ONLY valid JSON:
{
  "primaryAuthorNumber": 1,
  "reviewerNumber": 2,
  "reasoning": "Author 1 is best because [expertise match]. Reviewer 2 complements with [different expertise].",
  "confidence": 90
}`;

          const authorData: any = await retryApiCall(
            async () => {
              const response = await withTimeout(
                fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    max_tokens: 512,
                    messages: [{ role: 'user', content: authorPrompt }],
                  }),
                }),
                30000, // 30 seconds - simple classification
                `Author selection timeout for article ${i+1}`,
                jobId
              );

              if (!response.ok && (response.status === 429 || response.status === 402)) {
                throw new Error(`Lovable AI error: ${response.status}`);
              }
              
              return response;
            },
            'author selection',
            jobId,
            2
          );
          
          const authorText = authorData.choices[0].message.content;
          const authorSuggestion = JSON.parse(authorText.replace(/```json\n?|\n?```/g, ''));

          const primaryAuthorIdx = authorSuggestion.primaryAuthorNumber - 1;
          const reviewerIdx = authorSuggestion.reviewerNumber - 1;

          article.author_id = authors[primaryAuthorIdx]?.id || authors[0].id;
          article.reviewer_id = (reviewerIdx >= 0 && reviewerIdx < authors.length && reviewerIdx !== primaryAuthorIdx) 
            ? authors[reviewerIdx]?.id 
            : (authors.length > 1 ? authors.find((a: any) => a.id !== article.author_id)?.id : null);

          console.log(`E-E-A-T: ${authors[primaryAuthorIdx]?.name} (author) + ${authors[reviewerIdx]?.name || 'none'} (reviewer) | Confidence: ${authorSuggestion.confidence}%`);
        } catch (error) {
          console.error('E-E-A-T attribution failed, using fallback:', error);
          // Fallback to first author
          article.author_id = authors[0].id;
          article.reviewer_id = authors.length > 1 ? authors[1].id : null;
        }
      } else {
        article.author_id = null;
        article.reviewer_id = null;
      }

      // 10. EXTERNAL CITATIONS (Perplexity with batch system)
      try {
        console.log(`[Job ${jobId}] Finding external citations for article ${i+1}: "${plan.headline}" (${language}, ${plan.funnelStage})`);
        const citationsResponse = await withTimeout(
          retryWithBackoff(
            () => supabase.functions.invoke('find-external-links', {
              body: {
                content: article.detailed_content,
                headline: plan.headline,
                language: language,
                funnelStage: plan.funnelStage, // ✅ Pass funnel stage
              },
            }),
            3,
            2000
          ),
          150000, // 2.5 minutes - external API call
          `External citations lookup timeout for article ${i+1}`,
          jobId
        );

        if (citationsResponse.data?.citations && citationsResponse.data.citations.length > 0) {
          console.log(`[Job ${jobId}] ✅ Citations found:`);
          console.log(`[Job ${jobId}]   • Count: ${citationsResponse.data.citations.length}`);
          console.log(`[Job ${jobId}]   • Category: ${citationsResponse.data.category || 'unknown'}`);
          console.log(`[Job ${jobId}]   • Batch size: ${citationsResponse.data.batchSize || 'unknown'}`);
          console.log(`[Job ${jobId}]   • Status: ${citationsResponse.data.status || 'unknown'}`);
          const citations = citationsResponse.data.citations;
          
          // Insert citations into content
          let updatedContent = article.detailed_content;
          
          for (const citation of citations) {
            if (citation.insertAfterHeading) {
              // Find the heading and insert citation in first paragraph after it
              const headingRegex = new RegExp(
                `<h2[^>]*>\\s*${citation.insertAfterHeading}\\s*</h2>`,
                'i'
              );
              
              const match = updatedContent.match(headingRegex);
              if (match && match.index !== undefined) {
                const headingIndex = match.index + match[0].length;
                const afterHeading = updatedContent.substring(headingIndex);
                const nextParagraphMatch = afterHeading.match(/<p>/);
                
                if (nextParagraphMatch && nextParagraphMatch.index !== undefined) {
                  const insertPoint = headingIndex + nextParagraphMatch.index + 3; // after <p>
                  
                  const citationLink = `According to the <a href="${citation.url}" target="_blank" rel="noopener" title="${citation.sourceName}">${citation.anchorText}</a>, `;
                  
                  updatedContent = updatedContent.substring(0, insertPoint) + 
                                 citationLink + 
                                 updatedContent.substring(insertPoint);
                }
              }
            }
          }
          
          article.detailed_content = updatedContent;
          article.external_citations = citations.map((c: any) => ({
            text: c.anchorText,
            url: c.url,
            source: c.sourceName,
          }));
        } else {
          article.external_citations = [];
        }
      } catch (error) {
        console.error('External citations failed:', error);
        article.external_citations = [];
      }

      // Post-process: Replace any remaining [CITATION_NEEDED] markers
      const remainingMarkers = (article.detailed_content?.match(/\[CITATION_NEEDED\]/g) || []).length;
      if (remainingMarkers > 0) {
        console.log(`[Job ${jobId}] ⚠️ ${remainingMarkers} [CITATION_NEEDED] markers remaining in article ${i+1}. Attempting to replace...`);
        
        try {
          const replacementResponse = await withTimeout(
            supabase.functions.invoke('replace-citation-markers', {
              body: {
                content: article.detailed_content,
                headline: plan.headline,
                language: language,
                category: plan.category || 'Buying Guides'
              }
            }),
            120000, // 2 minutes - external API call
            `Citation marker replacement timeout for article ${i+1}`,
            jobId
          );

          if (replacementResponse.data?.success && replacementResponse.data.replacedCount > 0) {
            article.detailed_content = replacementResponse.data.updatedContent;
            console.log(`[Job ${jobId}] ✅ Replaced ${replacementResponse.data.replacedCount} citation markers`);
            
            // Merge any new citations found
            const newCitations = replacementResponse.data.citations || [];
            const existingCitations = article.external_citations || [];
            const mergedCitations = [...existingCitations];
            
            newCitations.forEach((newCit: any) => {
              const exists = mergedCitations.some((existing: any) => existing.url === newCit.url);
              if (!exists) {
                mergedCitations.push({
                  text: newCit.sourceName,
                  url: newCit.url,
                  source: newCit.sourceName
                });
              }
            });
            
            article.external_citations = mergedCitations;
          } else {
            console.log(`[Job ${jobId}] ⚠️ Could not replace all citation markers. ${replacementResponse.data?.failedCount || 0} markers failed.`);
          }
        } catch (citError) {
          console.error(`[Job ${jobId}] Citation marker replacement failed:`, citError);
        }
        
        // Clean up any remaining [CITATION_NEEDED: ...] placeholders to prevent them from appearing on the live site
        article.detailed_content = article.detailed_content.replace(
          /\[CITATION_NEEDED:\s*([^\]]+)\]/g,
          '' // Remove entirely - these should never appear to end users
        );
      }

      // 11. FAQ ENTITIES (for MOFU/BOFU)
      if (plan.funnelStage !== 'TOFU') {
        const faqPrompt = `Generate 3-5 FAQ entities for this article:
Headline: ${plan.headline}
Content: ${article.detailed_content.substring(0, 500)}...

Return ONLY valid JSON:
{
  "faqs": [
    {
      "question": "Question here?",
      "answer": "Concise answer (2-3 sentences)"
    }
  ]
}`;

        try {
          const faqData: any = await retryApiCall(
            async () => {
              const response = await withTimeout(
                fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    max_tokens: 2048,
                    messages: [{ role: 'user', content: faqPrompt }],
                  }),
                }),
                90000, // 90 seconds
                `FAQ generation timeout for article ${i+1}`,
                jobId
              );

              if (!response.ok && (response.status === 429 || response.status === 402)) {
                throw new Error(`Lovable AI error: ${response.status}`);
              }
              
              return response;
            },
            'FAQ generation for final articles',
            jobId,
            2
          );
          
          const faqText = faqData.choices[0].message.content;
          const faqResult = JSON.parse(faqText.replace(/```json\n?|\n?```/g, ''));
          article.faq_entities = faqResult.faqs;
        } catch (error) {
          console.error(`[Job ${jobId}] FAQ generation failed for article ${i+1}:`, error);
          article.faq_entities = [];
        }
      } else {
        article.faq_entities = [];
      }


      // 12. Calculate read time
      const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
      article.read_time = Math.ceil(wordCount / 200);

      // ✅ QUALITY VALIDATION - Ensure content meets quality standards
      console.log(`[Job ${jobId}] 🔍 Validating content quality for article ${i+1}...`);
      const qualityCheck = validateContentQuality(article, plan);
      console.log(`[Job ${jobId}] Quality Score: ${qualityCheck.score}/100`);
      
      if (!qualityCheck.isValid) {
        console.warn(`[Job ${jobId}] ⚠️ Quality issues detected for "${article.headline}":`);
        qualityCheck.issues.forEach(issue => console.warn(`  - ${issue}`));
      } else {
        console.log(`[Job ${jobId}] ✅ Content quality validated successfully`);
      }

      // Initialize empty arrays for internal links and related articles
      article.internal_links = [];
      article.related_article_ids = [];
      article.cta_article_ids = [];
      article.translations = {};

      // CHECKPOINT: Atomically save article with unique slug reservation
      try {
        const articleId = await generateUniqueSlugAndSave(supabase, article, jobId, i);
        savedArticleIds.push(articleId);
        article.id = articleId; // Store ID for later reference
        
        // Retrieve the actual slug that was used (in case counter was appended)
        const { data: savedArticle } = await supabase
          .from('blog_articles')
          .select('slug')
          .eq('id', articleId)
          .single();
        
        if (savedArticle) {
          article.slug = savedArticle.slug; // Update local article with final slug
        }
        
        // Update progress with checkpoint data
        await supabase
          .from('cluster_generations')
          .update({
            progress: {
              current_step: 2 + i,
              total_steps: 11,
              current_article: i + 1,
              total_articles: articleStructures.length,
              message: `Article ${i + 1} saved successfully`,
              articles_completed: savedArticleIds,
              last_checkpoint: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        console.log(`[Job ${jobId}] ✅ CHECKPOINT: Article ${i + 1}/${articleStructures.length} saved to database`);
      } catch (saveError) {
        console.error(`[Job ${jobId}] ❌ Failed to save article ${i + 1}, but continuing:`, saveError);
        // Continue generation even if save fails - user can retry saving later
      }

      articles.push(article);
      console.log(`Article ${i + 1} complete:`, article.headline, `(${wordCount} words, quality: ${qualityCheck.score}/100)`);
      
      checkTimeout(); // Check after each article
    }

    checkTimeout(); // Check before internal links
    await updateProgress(supabase, jobId, 8, 'Finding internal links...');
    console.log(`[Job ${jobId}] All articles generated, now finding internal links...`);

    // STEP 3: Find internal links between cluster articles
    
    if (findInternalLinks) {
      console.log(`[Job ${jobId}] --- Step 8: Finding internal links ---`);
      await updateProgress(supabase, jobId, 8, 'Finding internal links...');
      
      for (let i = 0; i < articles.length; i++) {
        try {
          const article = articles[i];
          
          // Pass other articles as available articles (excluding current)
          const otherArticles = articles
            .filter((a: any, idx: number) => idx !== i)
            .map((a: any) => ({
              id: `temp-${a.slug}`,
              slug: a.slug,
              headline: a.headline,
              speakable_answer: a.speakable_answer,
              category: a.category,
              funnel_stage: a.funnel_stage,
              language: a.language,
            }));

          console.log(`[Job ${jobId}] Finding internal links for article ${i+1}/${articles.length}: "${article.headline}" (${article.language})`);
          console.log(`[Job ${jobId}] Available articles for linking: ${otherArticles.length} articles, all in ${article.language}`);

          const linksResponse = await withTimeout(
            supabase.functions.invoke('find-internal-links', {
              body: {
                content: article.detailed_content,
                headline: article.headline,
                currentArticleId: `temp-${article.slug}`,
                language: article.language,
                funnelStage: article.funnel_stage,
                availableArticles: otherArticles,
              },
            }),
            60000,  // 60 seconds timeout
            `Internal links generation timeout for article ${i+1} "${article.headline}"`,
            jobId
          );

          if (linksResponse.error) {
            console.error(`[Job ${jobId}] Internal links error for article ${i+1}:`, linksResponse.error);
          }

          if (linksResponse.data?.links && linksResponse.data.links.length > 0) {
            console.log(`[Job ${jobId}] Found ${linksResponse.data.links.length} internal links for "${article.headline}"`);
            if (linksResponse.data.links.length > 0) {
              console.log(`[Job ${jobId}] Sample link: "${linksResponse.data.links[0].text}" -> ${linksResponse.data.links[0].title}`);
            }
            const links = linksResponse.data.links;
            
            // Insert links into content
            let updatedContent = article.detailed_content;
            
            for (const link of links) {
              if (link.insertAfterHeading) {
                const headingRegex = new RegExp(
                  `<h2[^>]*>\\s*${link.insertAfterHeading}\\s*</h2>`,
                  'i'
                );
                
                const match = updatedContent.match(headingRegex);
                if (match && match.index !== undefined) {
                  const headingIndex = match.index + match[0].length;
                  const afterHeading = updatedContent.substring(headingIndex);
                  const nextParagraphMatch = afterHeading.match(/<p>/);
                  
                  if (nextParagraphMatch && nextParagraphMatch.index !== undefined) {
                    const insertPoint = headingIndex + nextParagraphMatch.index + 3;
                    
                    const linkHtml = `For more details, check out our guide on <a href="${link.url}" title="${link.title}">${link.text}</a>. `;
                    
                    updatedContent = updatedContent.substring(0, insertPoint) + 
                                   linkHtml + 
                                   updatedContent.substring(insertPoint);
                  }
                }
              }
            }
            
            article.detailed_content = updatedContent;
            article.internal_links = links.map((l: any) => ({
              text: l.text,
              url: l.url,
              title: l.title,
            }));
          }
          
          // Clean up any remaining [INTERNAL_LINK: ...] placeholders
          article.detailed_content = article.detailed_content.replace(
            /\[INTERNAL_LINK:\s*([^\]]+)\]/g,
            '$1' // Keep just the text, remove the markup
          );
        } catch (error) {
          console.error(`Internal links failed for article ${i + 1}:`, error);
        }
      }
    } else {
      console.log(`[Job ${jobId}] ⏭️ Skipping internal links (user opted out)`);
      await updateProgress(supabase, jobId, 8, 'Skipping internal links...');
    }


    checkTimeout(); // Check after internal links
    // STEP 4: Link articles in funnel progression
    const tofuArticles = articles.filter((a: any) => a.funnel_stage === 'TOFU');
    const mofuArticles = articles.filter((a: any) => a.funnel_stage === 'MOFU');
    const bofuArticles = articles.filter((a: any) => a.funnel_stage === 'BOFU');

    console.log('Linking articles in funnel progression...');

    // TOFU articles → link to MOFU articles (awareness to consideration)
    tofuArticles.forEach((tofuArticle: any, idx: number) => {
      // Store slugs temporarily - will be converted to IDs when saved to database
      const otherTofu = tofuArticles.filter((t: any, i: number) => i !== idx);
      
      tofuArticle._temp_cta_slugs = mofuArticles.map((m: any) => m.slug);
      tofuArticle._temp_related_slugs = [
        ...otherTofu.map((t: any) => t.slug),
        ...mofuArticles.slice(0, 2).map((m: any) => m.slug)
      ].slice(0, 7);
      
      // Keep as empty for now - frontend will resolve slugs to IDs when saving
      tofuArticle.cta_article_ids = [];
      tofuArticle.related_article_ids = [];
    });

    // MOFU articles → link to BOFU article (consideration to decision)
    mofuArticles.forEach((mofuArticle: any, idx: number) => {
      const otherMofu = mofuArticles.filter((m: any, i: number) => i !== idx);
      
      mofuArticle._temp_cta_slugs = bofuArticles.map((b: any) => b.slug);
      mofuArticle._temp_related_slugs = [
        ...tofuArticles.slice(0, 3).map((t: any) => t.slug),
        ...otherMofu.map((m: any) => m.slug),
        ...bofuArticles.map((b: any) => b.slug)
      ].slice(0, 7);
      
      mofuArticle.cta_article_ids = [];
      mofuArticle.related_article_ids = [];
    });

    // BOFU article → no CTA (chatbot for conversion), link to supporting content
    bofuArticles.forEach((bofuArticle: any) => {
      bofuArticle._temp_cta_slugs = []; // No CTA - use chatbot instead
      bofuArticle._temp_related_slugs = [
        ...mofuArticles.map((m: any) => m.slug),
        ...tofuArticles.slice(0, 3).map((t: any) => t.slug)
      ].slice(0, 7);
      
      bofuArticle.cta_article_ids = [];
      bofuArticle.related_article_ids = [];
    });

    await updateProgress(supabase, jobId, 10, 'Setting related articles...');
    console.log(`[Job ${jobId}] Funnel linking complete`);
    
    checkTimeout(); // Check after funnel linking

    // STEP 5: Set related articles - Already set in CTA logic above

    await updateProgress(supabase, jobId, 11, 'Completed!');
    console.log(`[Job ${jobId}] Generation complete!`);
    
    checkTimeout(); // Final check before save

    // Update job record with completed status
    await supabase
      .from('cluster_generations')
      .update({
        status: 'completed',
        articles: articles,
        progress: {
          current_step: 11,
          total_steps: 11,
          current_article: articles.length,
          total_articles: articles.length,
          message: 'Cluster generation completed!',
          articles_completed: savedArticleIds,
          last_checkpoint: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] ✅ Job completed successfully, saved ${articles.length} articles`);

  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Generation failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Update job with structured error
    await supabase
      .from('cluster_generations')
      .update({
        status: 'failed',
        error: JSON.stringify({
          message: errorMessage,
          step: 'unknown',
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined
        }),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language, targetAudience, primaryKeyword, findInternalLinks = true } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user ID (if authenticated)
    const authHeader = req.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
      } catch (e) {
        console.log('Could not get user from auth header:', e);
      }
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('cluster_generations')
      .insert({
        user_id: userId,
        topic,
        language,
        target_audience: targetAudience,
        primary_keyword: primaryKeyword,
        status: 'pending',
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      throw jobError;
    }

    console.log(`✅ Created job ${job.id}, starting background generation`);

    // Start generation in background (non-blocking) with global error boundary
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          await generateCluster(job.id, topic, language, targetAudience, primaryKeyword, findInternalLinks);
        } catch (error) {
          console.error(`[Job ${job.id}] 🚨 FATAL ERROR - generateCluster crashed:`, {
            errorType: error?.constructor?.name,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          });
          
          // Ensure database is updated even on catastrophic failure
          try {
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );
            
            await supabase
              .from('cluster_generations')
              .update({
                status: 'failed',
                error: JSON.stringify({
                  message: error instanceof Error ? error.message : 'Unknown fatal error',
                  type: 'FATAL_CRASH',
                  timestamp: new Date().toISOString(),
                  stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
                }),
                updated_at: new Date().toISOString()
              })
              .eq('id', job.id);
              
            console.log(`[Job ${job.id}] ✅ Database updated with error status`);
          } catch (dbError) {
            console.error(`[Job ${job.id}] ❌ Failed to update database after crash:`, dbError);
          }
        }
      })()
    );

    // Return job ID immediately
    return new Response(
      JSON.stringify({ success: true, jobId: job.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-cluster request handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
