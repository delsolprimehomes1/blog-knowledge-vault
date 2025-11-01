import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExternalCitation {
  url: string;
  sourceName: string;
  sourceType?: 'government' | 'news' | 'legal' | 'academic' | 'organization' | 'commercial';
  authorityScore?: number;
  verificationDate?: string;
  year?: number;
  contextInArticle?: string;
  anchorText?: string;
}

const APPROVED_DOMAINS = [
  'costaluzlawyers.es', 'spanishsolutions.net', 'lexidy.com', 'aena.es', 'ryanair.com',
  'easyjet.com', 'britishairways.com', 'gov.uk', 'gov.ie', 'administracion.gob.es',
  'tourspain.es', 'met.ie', 'metoffice.gov.uk', 'aemet.es', 'bbc.com', 'theguardian.com',
  'irishtimes.com', 'elpais.com', 'elmundo.es', 'sur.es', 'malagahoy.es', 'boe.es',
  'juntadeandalucia.es', 'andalucia.org', 'mitma.gob.es', 'economistas.es', 'ine.es',
  'property-registration.es', 'europapress.es', 'elconfidencial.com'
];

function isApprovedDomain(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return APPROVED_DOMAINS.some(approved => domain === approved || domain.endsWith(`.${approved}`));
  } catch {
    return false;
  }
}

function extractKeyPhrases(text: string): string[] {
  const keywords = [
    // Real estate & legal
    'property', 'tax', 'legal', 'purchase', 'investment', 'visa', 'residency',
    'mortgage', 'rental', 'market', 'price', 'regulation', 'law',
    
    // Geographic
    'spain', 'costa del sol', 'andalusia', 'malaga', 'marbella', 'estepona',
    'fuengirola', 'benalmadena', 'nerja', 'torremolinos', 'mijas', 'ronda',
    
    // Climate & environment
    'climate', 'weather', 'temperature', 'sunshine', 'season', 'winter', 'summer',
    'spring', 'autumn', 'energy', 'sustainable', 'eco', 'solar', 'green',
    
    // Lifestyle & culture
    'culture', 'festival', 'beach', 'dining', 'restaurant', 'cuisine', 'food',
    'tourism', 'holiday', 'vacation', 'travel', 'lifestyle', 'luxury', 'villa',
    'experience', 'tradition', 'authentic', 'local', 'activities', 'entertainment'
  ];
  
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerText.includes(lowerKeyword)) {
      found.push(keyword);
    }
  }
  
  return found;
}

interface BestMatch {
  paragraphIndex: number;
  score: number;
  section: number;
}

function injectInlineCitations(content: string, citations: ExternalCitation[]): { content: string; citationMap: Map<string, number> } {
  const citationMap = new Map<string, number>();
  const validCitations = citations.filter(c => c?.url && c?.sourceName);
  
  if (validCitations.length === 0) {
    return { content, citationMap };
  }
  
  let processedContent = content;
  const usedCitations = new Set<string>();
  
  const paragraphPattern = /<p[^>]*>(.*?)<\/p>/gs;
  const paragraphs = [...processedContent.matchAll(paragraphPattern)];
  
  const h2Pattern = /<h2[^>]*>(.*?)<\/h2>/gs;
  const h2Sections = [...processedContent.matchAll(h2Pattern)];
  
  const paragraphSections: number[] = [];
  let currentSection = 0;
  
  paragraphs.forEach((paragraph) => {
    const paragraphStart = processedContent.indexOf(paragraph[0]);
    
    for (let i = currentSection; i < h2Sections.length; i++) {
      const h2Match = h2Sections[i];
      const h2Position = processedContent.indexOf(h2Match[0]);
      
      if (h2Position < paragraphStart) {
        currentSection = i + 1;
      } else {
        break;
      }
    }
    
    paragraphSections.push(currentSection);
  });
  
  const sectionsWithCitations = new Set<number>();
  
    validCitations.forEach((citation) => {
    const citationYear = citation.year || new Date().getFullYear();
    const citationSource = citation.sourceName;
    const citationType = citation.sourceType || 'organization';
    const authorityScore = citation.authorityScore || 75;
    const citationContext = citation.contextInArticle || citation.anchorText || '';
    
    let bestMatch: BestMatch | null = null;
    
    paragraphs.forEach((paragraph, idx) => {
      const paragraphContent = paragraph[1];
      const paragraphSection = paragraphSections[idx];
      
      // Strip HTML tags to measure actual text length
      const textOnly = paragraphContent.replace(/<[^>]*>/g, '').trim();
      
      if (usedCitations.has(paragraph[0]) || textOnly.length < 50) {
        return;
      }
      
      // Check if this paragraph already has a citation for this source
      const alreadyHasCitation = 
        paragraphContent.includes(`According to ${citationSource}`) ||
        paragraphContent.includes(`${citationSource} (${citationYear})`);
      
      if (alreadyHasCitation) {
        console.log(`⏭️  Skipping citation for ${citationSource} - already exists in paragraph`);
        return;
      }
      
      let score = 5;
      
      if (!sectionsWithCitations.has(paragraphSection)) {
        score += 10;
      }
      
      // Extract keywords from citation context and paragraph
      const citationKeywords = extractKeyPhrases(citationContext);
      const paragraphKeywords = extractKeyPhrases(textOnly);
      const matchingKeywords = paragraphKeywords.filter(k => citationKeywords.includes(k));
      score += matchingKeywords.length * 3;
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { paragraphIndex: idx, score, section: paragraphSection };
      }
    });
    
    if (bestMatch !== null) {
      const match: BestMatch = bestMatch;
      const paragraph = paragraphs[match.paragraphIndex];
      
      const citationLink = `<a href="${citation.url}" class="inline-citation" target="_blank" rel="noopener nofollow sponsored" data-citation-source="${citationSource}" data-citation-type="${citationType}" data-authority-score="${authorityScore}" data-tooltip="External source verified — click to read original" title="${citationSource} (${citationYear})">${citationSource}</a>`;
      
      const citationPhrase = `According to ${citationLink} (${citationYear}), `;
      
      const updatedParagraph = citationPhrase + paragraph[1];
      
      processedContent = processedContent.replace(
        paragraph[0],
        paragraph[0].replace(paragraph[1], updatedParagraph)
      );
      
      usedCitations.add(paragraph[0]);
      sectionsWithCitations.add(match.section);
      citationMap.set(citation.url, match.paragraphIndex);
    }
  });
  
  // FALLBACK: If no citations were injected, force at least one
  if (citationMap.size === 0 && validCitations.length > 0) {
    console.log('⚠️  No citations matched naturally — applying fallback injection');
    
    // Find the first suitable paragraph (any paragraph > 50 chars that isn't already used)
    for (let idx = 0; idx < paragraphs.length; idx++) {
      const paragraph = paragraphs[idx];
      const textOnly = paragraph[1].replace(/<[^>]*>/g, '').trim();
      
      if (textOnly.length >= 50 && !usedCitations.has(paragraph[0])) {
        // Inject the first citation as a fallback
        const citation = validCitations[0];
        const citationYear = citation.year || new Date().getFullYear();
        const citationSource = citation.sourceName;
        const citationType = citation.sourceType || 'organization';
        const authorityScore = citation.authorityScore || 75;
        
        const citationLink = `<a href="${citation.url}" class="inline-citation" target="_blank" rel="noopener nofollow sponsored" data-citation-source="${citationSource}" data-citation-type="${citationType}" data-authority-score="${authorityScore}" data-tooltip="External source verified — click to read original" title="${citationSource} (${citationYear})">${citationSource}</a>`;
        
        const citationPhrase = `According to ${citationLink} (${citationYear}), `;
        const updatedParagraph = citationPhrase + paragraph[1];
        
        processedContent = processedContent.replace(
          paragraph[0],
          paragraph[0].replace(paragraph[1], updatedParagraph)
        );
        
        citationMap.set(citation.url, idx);
        console.log(`✓ Fallback injection successful at paragraph ${idx}`);
        break; // Only inject one fallback citation
      }
    }
  }
  
  return { content: processedContent, citationMap };
}

function hasInlineCitations(content: string): boolean {
  // Check for HTML linked citations
  if (content.includes('class="inline-citation"')) {
    return true;
  }
  
  // Check for plain text citation patterns: "According to SourceName (Year)"
  const plainTextPattern = /According to [A-Z][^(]{2,50}\s*\(\d{4}\)/;
  if (plainTextPattern.test(content)) {
    return true;
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { dryRun = false, articleSlugs = [] } = await req.json();
    
    console.log('Starting inline citation backfill...', { dryRun, specificArticles: articleSlugs.length });

    let query = supabaseClient
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, external_citations, date_modified')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (articleSlugs.length > 0) {
      query = query.in('slug', articleSlugs);
    }

    const { data: articles, error: articlesError } = await query;

    if (articlesError) throw articlesError;

    console.log(`Found ${articles?.length || 0} published articles to process`);

    let processedCount = 0;
    let skippedCount = 0;
    let injectedCitationsCount = 0;
    const errors: any[] = [];
    const results: any[] = [];

    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < (articles?.length || 0); i += batchSize) {
      batches.push(articles?.slice(i, i + batchSize) || []);
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}...`);

      for (const article of batch) {
        try {
          if (hasInlineCitations(article.detailed_content)) {
            console.log(`⏭️  Skipping ${article.slug} - already has inline citations`);
            skippedCount++;
            results.push({
              slug: article.slug,
              status: 'skipped',
              reason: 'Already has inline citations'
            });
            continue;
          }

          const citations = (article.external_citations as ExternalCitation[]) || [];
          
          if (citations.length === 0) {
            console.log(`⏭️  Skipping ${article.slug} - no citations to inject`);
            skippedCount++;
            results.push({
              slug: article.slug,
              status: 'skipped',
              reason: 'No external citations available'
            });
            continue;
          }

          console.log(`Processing ${article.slug} with ${citations.length} citations...`);

          const { content: newContent, citationMap } = injectInlineCitations(
            article.detailed_content,
            citations
          );

          if (citationMap.size === 0) {
            console.log(`⚠️  Warning: ${article.slug} - no suitable paragraphs found for citations`);
            results.push({
              slug: article.slug,
              status: 'warning',
              reason: 'No suitable paragraphs found for citation placement'
            });
            continue;
          }

          if (!dryRun) {
            await supabaseClient
              .from('article_revisions')
              .insert({
                article_id: article.id,
                previous_content: article.detailed_content,
                revision_type: 'citation_backfill',
                change_reason: 'Automated inline citation injection',
                can_rollback: true
              });

            await supabaseClient
              .from('blog_articles')
              .update({
                detailed_content: newContent,
                date_modified: new Date().toISOString()
              })
              .eq('id', article.id);

            for (const [citationUrl, paragraphIndex] of citationMap.entries()) {
              await supabaseClient
                .from('citation_usage_tracking')
                .update({
                  context_paragraph_index: paragraphIndex,
                  updated_at: new Date().toISOString()
                })
                .eq('article_id', article.id)
                .eq('citation_url', citationUrl);
            }
          }

          processedCount++;
          injectedCitationsCount += citationMap.size;
          
          console.log(`✓ ${dryRun ? '[DRY RUN] ' : ''}Processed ${article.slug}: ${citationMap.size} citations injected`);
          
          results.push({
            slug: article.slug,
            headline: article.headline,
            status: 'success',
            citationsInjected: citationMap.size,
            paragraphIndices: Array.from(citationMap.values())
          });

        } catch (articleError) {
          console.error(`Error processing ${article.slug}:`, articleError);
          errors.push({
            article: article.slug,
            error: (articleError as Error).message
          });
        }
      }

      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const summary = {
      totalArticles: articles?.length || 0,
      processedArticles: processedCount,
      skippedArticles: skippedCount,
      totalCitationsInjected: injectedCitationsCount,
      errors: errors.length,
      dryRun,
      errorDetails: errors,
      results: results
    };

    console.log('Backfill complete:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        stack: (error as Error).stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
