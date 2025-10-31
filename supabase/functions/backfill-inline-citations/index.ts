import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExternalCitation {
  text: string;
  url: string;
  source: string;
  year?: number;
}

interface ArticleData {
  id: string;
  slug: string;
  headline: string;
  detailed_content: string;
  external_citations: ExternalCitation[];
}

/**
 * Approved domains list (ported from shared/approvedDomains.ts)
 */
const APPROVED_DOMAINS = [
  'wikipedia.org', 'weather-and-climate.com', 'climasyviajes.com', 'weatherspark.com',
  'aemet.es', 'wmo.int', 'climatestotravel.com', 'ncdc.noaa.gov', 'es.weatherspark.com',
  'boe.es', 'agenciatributaria.es', 'exteriores.gob.es', 'juntadeandalucia.es',
  'gov.uk', 'gov.ie', 'dfa.ie', 'cnmc.es', 'ine.es', 'catastro.gob.es',
  'e-justice.europa.eu', 'extranjeria.administracionespublicas.gob.es', 'mjusticia.gob.es',
  'spain.info', 'andalucia.org', 'visitcostadelsol.com', 'cuevadenerja.es',
  'aqualand.es', 'bioparcfuengirola.es', 'selwomarina.es', 'castillomonumentocolomares.com',
  'mariposariodebenalmadena.com', 'rmcr.org', 'stupabenalmadena.org', 'aena.es',
  'malaga.com', 'turismo.benalmadena.es', 'turismo.estepona.es', 'turismo.fuengirola.es',
  'turismo.malaga.eu', 'blog.visitcostadelsol.com', 'europasur.es', 'guidetomalaga.com',
  'worldtravelguide.net', 'spainvisa.eu', 'malagaturismo.com', 'festivaldemalaga.com',
  'museosdemalaga.com', 'andalucia.com', 'rutasdelsol.es',
  'surinenglish.com', 'euroweeklynews.com', 'theolivepress.es', 'essentialmagazine.com',
  'societymarbella.com', 'homeandlifestyle.es', 'webexpressguide.com', 'thespanisheye.com',
  'andaluciatoday.com', 'thelocal.es', 'spainenglish.com', 'expatica.com',
  'inspain.news', 'eyeonspain.com', 'thinkspain.com', 'lachispa.net',
  'abogadoespanol.com', 'legalservicesinspain.com', 'costaluzlawyers.es', 'spanishsolutions.net',
  'lexidy.com', 'registradores.org', 'notariado.org', 'cec-spain.es',
  'negociosabogados.com', 'nuevoleon.net', 'malagasolicitors.es',
  'sspa.juntadeandalucia.es', 'quironsalud.es', 'vithas.es', 'hospiten.com',
  'helicopterossanitarios.com', 'medimar.com', 'nhs.uk', 'panoramamarbella.com',
  'sanitas.com', 'citizensinformation.ie', 'cofaes.es',
  'nabss.org', 'ibo.org', 'britishcouncil.es', 'alohacollege.com',
  'sis.ac', 'international-schools-database.com', 'uma.es', 'miuc.org',
  'baleario.com', 'udc.es', 'campusdelasol.uma.es', 'eoimalaga.com',
  'ihmarbella.com', 'cit.es', 'escuelaeuropea.es', 'colegioatalaya.com',
  'caminodelrey.info', 'transandalus.com', 'strava.com', 'komoot.com',
  'malagacyclingclub.com', 'coastalpath.net', 'bicicletasdelsol.com', 'cyclespain.net',
  'outdooractive.com', 'diverland.es', 'senderismomalaga.com', 'telefericobenalmadena.com',
  'actividadesmalaga.com', 'duomoturismo.com',
  'tastingspain.es', 'rutasdelvino.es', 'sherry.wine', 'vinomalaga.com',
  'dopronda.es', 'michelin.com', 'alorenademalaga.com', 'atarazanasmarket.es',
  'tasteatlas.com', 'gastronomiamalaga.com', 'lamelonera.com', 'slowfoodmalaga.com',
  'padelfederacion.es', 'marbellaguide.com', 'worldpadeltour.com', 'clubpadelexterio.org',
  'haciendadelalamo.com', 'padelclick.com', 'padelenred.com', 'benahavispadelacademy.com',
  'vivagym.es', 'basic-fit.com', 'synergym.es', 'yogamarbella.com',
  'yogaforlife.es', 'clubelcandado.com', 'puenteromano.com', 'reservadelhigueronresort.com',
  'expatarrivals.com', 'internations.org', 'britoninspain.com', 'spainexpat.com',
  'renewspain.com', 'schengenvisainfo.com',
  'bde.es', 'caa.co.uk', 'fred.stlouisfed.org', 'ecb.europa.eu', 'imf.org', 'numbeo.com',
  'renfe.com', 'alsa.es', 'britishairways.com', 'aerlingus.com',
  'iberia.com', 'ryanair.com', 'easyjet.com', 'jet2.com', 'vueling.com', 'tui.co.uk',
  'movistar.es', 'vodafone.es', 'orange.es', 'masmovil.com',
  'marbella.es', 'fuengirola.es', 'torremolinos.es', 'benalmadena.es',
  'mijas.es', 'estepona.es', 'manilva.es', 'casares.es', 'sanpedroalcantara.es', 'sotogrande.es',
  'miramarcc.com', 'plazamayor.es', 'la-canada.com', 'elcorteingles.es',
  'decathlon.es', 'ikea.com', 'leroymerlin.es',
  'agenciaandaluzadelaenergia.es', 'energy.ec.europa.eu', 'renewableenergyworld.com',
  'wwf.es', 'malaga.eu', 'programmemaBiosfera.es', 'climateportugal.com', 'educasol.org'
];

/**
 * Check if URL is from approved domain
 */
function isApprovedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return APPROVED_DOMAINS.some(domain => {
      const domainLower = domain.toLowerCase();
      const domainBase = domainLower.split('/')[0];
      return hostname === domainLower || 
             hostname.endsWith(`.${domainLower}`) ||
             hostname === domainBase ||
             hostname.endsWith(`.${domainBase}`);
    });
  } catch {
    return false;
  }
}

/**
 * Extract key phrases for citation matching (ported from linkInjection.ts)
 */
function extractKeyPhrases(text: string): string[] {
  if (!text) return [];
  
  const stopWords = ['the', 'and', 'for', 'about', 'with', 'this', 'that', 'from', 'claims', 'support', 'evidence'];
  const words = text.toLowerCase().split(/\s+/);
  
  const keywords = words.filter(w => w.length > 3 && !stopWords.includes(w));
  
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const twoWord = `${words[i]} ${words[i + 1]}`;
    const threeWord = i < words.length - 2 ? `${words[i]} ${words[i + 1]} ${words[i + 2]}` : '';
    if (twoWord.length > 8) phrases.push(twoWord);
    if (threeWord.length > 12) phrases.push(threeWord);
  }
  
  return [...keywords, ...phrases];
}

/**
 * Inject inline citations into content (ported from linkInjection.ts)
 */
function injectInlineCitations(content: string, citations: ExternalCitation[]): string {
  if (!citations || citations.length === 0) {
    console.log('[injectInlineCitations] No citations provided');
    return content;
  }

  console.log(`[injectInlineCitations] Processing ${citations.length} citations`);
  
  // Filter for valid citations from approved domains
  const validCitations = citations.filter(c => {
    const isValid = c?.url && c?.source && isApprovedDomain(c.url);
    if (!isValid) {
      console.warn('[injectInlineCitations] Skipping invalid/unapproved citation:', c?.source);
    }
    return isValid;
  });
  
  if (validCitations.length === 0) {
    console.log('[injectInlineCitations] No valid approved citations');
    return content;
  }
  
  console.log(`[injectInlineCitations] ${validCitations.length} valid citations after filtering`);
  
  let processedContent = content;
  const usedCitations = new Set<string>();
  
  // Split content into paragraphs
  const paragraphPattern = /<p[^>]*>(.*?)<\/p>/gs;
  const paragraphs = [...processedContent.matchAll(paragraphPattern)];
  
  console.log(`[injectInlineCitations] Found ${paragraphs.length} paragraphs`);
  
  // Analyze H2 sections to distribute citations
  const h2Pattern = /<h2[^>]*>(.*?)<\/h2>/gs;
  const h2Sections = [...processedContent.matchAll(h2Pattern)];
  const totalSections = h2Sections.length || 1;
  
  console.log(`[injectInlineCitations] Found ${totalSections} H2 sections`);
  
  // Track which H2 section each paragraph belongs to
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
  
  // Distribute citations across sections
  const sectionsWithCitations = new Set<number>();
  
  // Process each citation
  validCitations.forEach((citation, citationIdx) => {
    console.log(`\n[Citation ${citationIdx + 1}/${validCitations.length}] ${citation.source}`);
    
    const citationYear = citation.year || new Date().getFullYear();
    const citationKeywords = extractKeyPhrases(citation.text || citation.source);
    
    // Find the best paragraph for this citation
    type BestMatchType = { 
      paragraphIndex: number; 
      score: number;
      section: number;
    };
    let bestMatch: BestMatchType | null = null;
    
    paragraphs.forEach((paragraph, idx) => {
      const paragraphContent = paragraph[1];
      const paragraphSection = paragraphSections[idx];
      
      // Skip paragraphs that already have a citation or are too short
      if (usedCitations.has(paragraph[0]) || paragraphContent.length < 100) return;
      
      // Calculate relevance score
      let score = 0;
      citationKeywords.forEach(kw => {
        if (paragraphContent.toLowerCase().includes(kw)) {
          score += kw.split(/\s+/).length;
        }
      });
      
      // Prefer sections that don't have citations yet
      if (!sectionsWithCitations.has(paragraphSection)) {
        score += 10;
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          paragraphIndex: idx,
          score,
          section: paragraphSection
        };
      }
    });
    
    // Inject the citation
    if (bestMatch !== null) {
      const match = bestMatch as BestMatchType;
      console.log(`  ✓ Best match found (score: ${match.score}, section: ${match.section})`);
      
      const paragraph = paragraphs[match.paragraphIndex];
      const paragraphContent = paragraph[1];
      
      // Create the inline citation
      const citationLink = `<a href="${citation.url}" class="inline-citation" target="_blank" rel="noopener nofollow" title="Source: ${citation.source}">${citation.source}</a>`;
      const citationPhrase = `According to ${citationLink} (${citationYear}), `;
      
      // Insert at the beginning of the first sentence
      const updatedParagraph = citationPhrase + paragraphContent;
      processedContent = processedContent.replace(paragraph[0], paragraph[0].replace(paragraph[1], updatedParagraph));
      
      // Mark as used
      usedCitations.add(paragraph[0]);
      sectionsWithCitations.add(match.section);
      
      console.log(`  ✓ Injected successfully`);
    } else {
      console.log(`  ✗ No suitable paragraph found`);
    }
  });
  
  console.log(`\n[injectInlineCitations] Complete. Injected ${usedCitations.size} citations across ${sectionsWithCitations.size} sections`);
  return processedContent;
}

/**
 * Check if content already has inline citations
 */
function hasInlineCitations(content: string): boolean {
  return content.includes('According to') && content.includes('class="inline-citation"');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dryRun = false, articleSlugs = null } = await req.json();

    console.log(`\n🚀 Starting citation backfill (dryRun: ${dryRun})`);
    if (articleSlugs) {
      console.log(`  Targeting specific articles: ${articleSlugs.join(', ')}`);
    }

    // Fetch published articles
    let query = supabase
      .from('blog_articles')
      .select('id, slug, headline, detailed_content, external_citations')
      .eq('status', 'published')
      .not('external_citations', 'is', null);

    if (articleSlugs && articleSlugs.length > 0) {
      query = query.in('slug', articleSlugs);
    }

    const { data: articles, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching articles:', fetchError);
      throw fetchError;
    }

    console.log(`📚 Found ${articles?.length || 0} published articles with citations`);

    const results = {
      totalArticles: articles?.length || 0,
      articlesProcessed: 0,
      alreadyProcessed: 0,
      citationsInjected: 0,
      failed: 0,
      errors: [] as string[],
      sampleResults: [] as any[],
    };

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun,
          message: 'No articles to process',
          ...results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process articles in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(articles.length / BATCH_SIZE)}`);

      for (const article of batch) {
        try {
          console.log(`\n📄 Article: ${article.slug}`);

          // Check if already processed
          if (hasInlineCitations(article.detailed_content)) {
            console.log('  ✓ Already has inline citations, skipping');
            results.alreadyProcessed++;
            continue;
          }

          // Validate prerequisites
          if (!article.external_citations || article.external_citations.length === 0) {
            console.log('  ⚠️ No citations found, skipping');
            continue;
          }

          const citationsWithoutYear = article.external_citations.filter((c: any) => !c.year).length;
          if (citationsWithoutYear > 0) {
            console.warn(`  ⚠️ ${citationsWithoutYear} citations missing year field. Run backfill-citation-years first!`);
          }

          // Inject citations
          console.log(`  📝 Injecting ${article.external_citations.length} citations...`);
          const newContent = injectInlineCitations(article.detailed_content, article.external_citations);

          // Count injected citations
          const citationsBefore = (article.detailed_content.match(/According to/g) || []).length;
          const citationsAfter = (newContent.match(/According to/g) || []).length;
          const citationsAdded = citationsAfter - citationsBefore;

          console.log(`  ✅ Injected ${citationsAdded} citations`);

          // Update database (unless dry run)
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('blog_articles')
              .update({
                detailed_content: newContent,
                date_modified: new Date().toISOString(),
              })
              .eq('id', article.id);

            if (updateError) {
              console.error(`  ❌ Error updating article:`, updateError);
              results.errors.push(`${article.slug}: ${updateError.message}`);
              results.failed++;
              continue;
            }

            // Create revision backup
            await supabase.from('article_revisions').insert({
              article_id: article.id,
              revision_type: 'citation_backfill',
              previous_content: article.detailed_content,
              change_reason: 'Automated inline citation injection',
              previous_citations: article.external_citations,
            });
          }

          results.articlesProcessed++;
          results.citationsInjected += citationsAdded;

          // Add to sample results (first 5)
          if (results.sampleResults.length < 5) {
            results.sampleResults.push({
              slug: article.slug,
              headline: article.headline,
              citationsBefore,
              citationsAfter,
              citationsAdded,
            });
          }

        } catch (error: any) {
          console.error(`  ❌ Error processing article ${article.slug}:`, error);
          results.errors.push(`${article.slug}: ${error.message}`);
          results.failed++;
        }
      }
    }

    const successMessage = dryRun
      ? `Preview: Would inject inline citations into ${results.articlesProcessed} articles`
      : `✅ Successfully injected inline citations into ${results.articlesProcessed} articles`;

    console.log(`\n✅ Backfill complete!`);
    console.log(`  Articles processed: ${results.articlesProcessed}`);
    console.log(`  Already processed: ${results.alreadyProcessed}`);
    console.log(`  Citations injected: ${results.citationsInjected}`);
    console.log(`  Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        message: successMessage,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
