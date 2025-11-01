import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExternalCitation {
  url: string;
  source: string;
  text: string;
  year?: number;
}

const APPROVED_DOMAINS = [
  // Spanish Government
  'gov.uk', 'gov.es', 'agenciatributaria.es', 'boe.es', 'juntadeandalucia.es',
  'mitma.gob.es', 'interior.gob.es',
  
  // Central Banks & Financial Authorities
  'bde.es', // Bank of Spain
  
  // Official Tourism
  'spain.info', 'andalucia.org', 'en.andalucia.org',
  
  // Transport & Infrastructure
  'aena.es', // Spanish Airport Authority
  
  // EU & International
  'eea.europa.eu',
  
  // Statistics & Data
  'ine.es', // National Statistics Institute
  
  // Established Regional News (High Authority)
  'surinenglish.com', 'euroweeklynews.com'
];

function isApprovedDomain(url: string): boolean {
  try {
    const domain = new URL(url).hostname.replace('www.', '').toLowerCase();
    return APPROVED_DOMAINS.some(approved => domain.includes(approved.toLowerCase()));
  } catch {
    return false;
  }
}

function injectInlineCitations(content: string, citations: ExternalCitation[]): { 
  content: string; 
  citationMap: Map<string, number> 
} {
  const approvedCitations = citations.filter(c => isApprovedDomain(c.url));
  if (approvedCitations.length === 0) {
    return { content, citationMap: new Map() };
  }

  const citationMap = new Map<string, number>();
  let modifiedContent = content;
  
  // Split content into H2 sections
  const h2Pattern = /<h2[^>]*>.*?<\/h2>/gi;
  const h2Matches = [...modifiedContent.matchAll(h2Pattern)];
  
  if (h2Matches.length === 0) {
    return { content: modifiedContent, citationMap };
  }

  let citationIndex = 0;
  let paragraphIndex = 0;

  // Process each H2 section
  for (let sectionIdx = 0; sectionIdx < h2Matches.length && citationIndex < approvedCitations.length; sectionIdx++) {
    const currentH2 = h2Matches[sectionIdx];
    const nextH2 = h2Matches[sectionIdx + 1];
    
    const sectionStart = currentH2.index! + currentH2[0].length;
    const sectionEnd = nextH2 ? nextH2.index! : modifiedContent.length;
    const sectionContent = modifiedContent.substring(sectionStart, sectionEnd);
    
    // Find all paragraphs in this section
    const paragraphs = [...sectionContent.matchAll(/<p[^>]*>(.*?)<\/p>/gs)];
    
    if (paragraphs.length === 0) continue;

    // Find best paragraph: prefer ones with keywords
    let bestParagraphIdx = 0;
    let maxRelevance = 0;
    
    const keywords = ['according', 'research', 'study', 'report', 'data', 'statistics', 'analysis'];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const pContent = paragraphs[i][1].toLowerCase();
      const relevance = keywords.filter(kw => pContent.includes(kw)).length;
      if (relevance > maxRelevance) {
        maxRelevance = relevance;
        bestParagraphIdx = i;
      }
    }

    const targetParagraph = paragraphs[bestParagraphIdx];
    const citation = approvedCitations[citationIndex];
    
    if (!targetParagraph || !citation) continue;

    // Build inline citation
    const year = citation.year || new Date().getFullYear();
    const inlineCitation = `According to <a href="${citation.url}" 
      class="inline-citation" 
      data-citation-source="${citation.source}"
      data-tooltip="External source verified — click to read original"
      title="${citation.source} (${year})"
      target="_blank" 
      rel="nofollow noopener">${citation.source}</a> (${year}), `;

    // Calculate absolute paragraph index
    const paragraphsBeforeSection = modifiedContent.substring(0, sectionStart).match(/<p[^>]*>/g)?.length || 0;
    paragraphIndex = paragraphsBeforeSection + bestParagraphIdx;

    // Track this citation's paragraph
    citationMap.set(citation.url, paragraphIndex);

    // Inject citation at the start of paragraph content
    const originalPTag = targetParagraph[0];
    const pTagMatch = originalPTag.match(/<p[^>]*>/);
    if (pTagMatch) {
      const openingTag = pTagMatch[0];
      const innerContent = targetParagraph[1];
      const newParagraph = `${openingTag}${inlineCitation}${innerContent}</p>`;
      
      modifiedContent = modifiedContent.substring(0, sectionStart + targetParagraph.index!) +
                       newParagraph +
                       modifiedContent.substring(sectionStart + targetParagraph.index! + originalPTag.length);
    }

    citationIndex++;
  }

  return { content: modifiedContent, citationMap };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting citation paragraph tracking backfill...');

    // Fetch all published articles
    const { data: articles, error: articlesError } = await supabase
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, external_citations')
      .eq('status', 'published');

    if (articlesError) throw articlesError;

    let totalUpdated = 0;
    let totalProcessed = 0;
    let errors = 0;

    for (const article of articles || []) {
      console.log(`Processing article: ${article.slug}`);
      totalProcessed++;

      try {
        // Inject inline citations and get paragraph mapping
        const { content: newContent, citationMap } = injectInlineCitations(
          article.detailed_content,
          article.external_citations || []
        );

        // Update article with new content if citations were injected
        if (citationMap.size > 0) {
          const { error: contentError } = await supabase
            .from('blog_articles')
            .update({ detailed_content: newContent })
            .eq('id', article.id);

          if (contentError) {
            console.error(`Error updating content for ${article.slug}:`, contentError);
            errors++;
            continue;
          }
        }

        // Update citation tracking with paragraph indices
        for (const [url, paragraphIdx] of citationMap.entries()) {
          const { error: trackingError } = await supabase
            .from('citation_usage_tracking')
            .update({
              context_paragraph_index: paragraphIdx,
              updated_at: new Date().toISOString()
            })
            .eq('article_id', article.id)
            .eq('citation_url', url);

          if (trackingError) {
            console.error(`Error updating tracking for ${url}:`, trackingError);
            errors++;
          } else {
            totalUpdated++;
          }
        }

        console.log(`✓ Processed ${citationMap.size} citations for ${article.slug}`);
      } catch (error) {
        console.error(`Error processing article ${article.slug}:`, error);
        errors++;
      }
    }

    const summary = {
      totalArticles: articles?.length || 0,
      articlesProcessed: totalProcessed,
      citationsUpdated: totalUpdated,
      errors,
      status: 'completed',
      completedAt: new Date().toISOString()
    };

    console.log('Backfill complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, status: 'failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
