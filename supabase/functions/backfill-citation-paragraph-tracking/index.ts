import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExternalCitation {
  url: string;
  source: string;
}

const APPROVED_DOMAINS = [
  'costaluzlawyers.es', 'spanishsolutions.net', 'lexidy.com', 'aena.es', 'ryanair.com',
  'easyjet.com', 'britishairways.com', 'gov.uk', 'gov.ie', 'administracion.gob.es',
  'tourspain.es', 'met.ie', 'metoffice.gov.uk', 'aemet.es', 'bbc.com', 'theguardian.com',
  'irishtimes.com', 'elpais.com', 'elmundo.es', 'sur.es', 'malagahoy.es', 'boe.es'
];

function isApprovedDomain(url: string): boolean {
  try {
    const domain = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return APPROVED_DOMAINS.some(approved => domain === approved || domain.endsWith(`.${approved}`));
  } catch {
    return false;
  }
}

interface BestMatch {
  paragraphIndex: number;
  score: number;
  section: number;
}

function injectInlineCitations(content: string, citations: ExternalCitation[]): { content: string; citationMap: Map<string, number> } {
  const citationMap = new Map<string, number>();
  const validCitations = citations.filter(c => c?.url && c?.source && isApprovedDomain(c.url));
  
  if (validCitations.length === 0) return { content, citationMap };
  
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
      if (h2Position < paragraphStart) currentSection = i + 1;
      else break;
    }
    paragraphSections.push(currentSection);
  });
  
  const sectionsWithCitations = new Set<number>();
  
  validCitations.forEach((citation) => {
    const citationYear = new Date().getFullYear();
    let bestMatch: BestMatch | null = null;
    
    paragraphs.forEach((paragraph, idx) => {
      const paragraphContent = paragraph[1];
      const paragraphSection = paragraphSections[idx];
      if (usedCitations.has(paragraph[0]) || paragraphContent.length < 100) return;
      
      let score = 5;
      if (!sectionsWithCitations.has(paragraphSection)) score += 10;
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { paragraphIndex: idx, score, section: paragraphSection };
      }
    });
    
    if (bestMatch !== null) {
      const match: BestMatch = bestMatch;
      const paragraph = paragraphs[match.paragraphIndex];
      const citationLink = `<a href="${citation.url}" class="inline-citation" target="_blank" rel="noopener nofollow sponsored" data-citation-source="${citation.source}">${citation.source}</a>`;
      const citationPhrase = `According to ${citationLink} (${citationYear}), `;
      const updatedParagraph = citationPhrase + paragraph[1];
      processedContent = processedContent.replace(paragraph[0], paragraph[0].replace(paragraph[1], updatedParagraph));
      usedCitations.add(paragraph[0]);
      sectionsWithCitations.add(match.section);
      citationMap.set(citation.url, match.paragraphIndex);
    }
  });
  
  return { content: processedContent, citationMap };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  try {
    console.log('Starting citation paragraph tracking backfill...');

    const { data: articles, error: articlesError } = await supabaseClient
      .from('blog_articles')
      .select('id, slug, detailed_content, external_citations')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (articlesError) throw articlesError;
    console.log(`Found ${articles?.length || 0} published articles`);

    let processedCount = 0;
    let updatedCitationsCount = 0;
    const errors: any[] = [];

    for (const article of articles || []) {
      try {
        const citations = (article.external_citations as ExternalCitation[]) || [];
        if (citations.length === 0) continue;

        console.log(`Processing ${article.slug} with ${citations.length} citations...`);
        const { content: newContent, citationMap } = injectInlineCitations(article.detailed_content, citations);

        if (citationMap.size > 0) {
          await supabaseClient.from('blog_articles').update({ detailed_content: newContent }).eq('id', article.id);
        }

        for (const [citationUrl, paragraphIndex] of citationMap.entries()) {
          const { error: trackingError } = await supabaseClient
            .from('citation_usage_tracking')
            .update({ context_paragraph_index: paragraphIndex, updated_at: new Date().toISOString() })
            .eq('article_id', article.id)
            .eq('citation_url', citationUrl);

          if (trackingError) errors.push({ article: article.slug, citation: citationUrl, error: trackingError.message });
          else updatedCitationsCount++;
        }

        processedCount++;
        console.log(`✓ Processed ${article.slug}: ${citationMap.size} citations`);
      } catch (articleError) {
        errors.push({ article: article.slug, error: (articleError as Error).message });
      }
    }

    return new Response(JSON.stringify({
      totalArticles: articles?.length || 0,
      processedArticles: processedCount,
      updatedCitations: updatedCitationsCount,
      errors: errors.length,
      errorDetails: errors
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
