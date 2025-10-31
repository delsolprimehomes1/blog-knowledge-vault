import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Approved domains check (inline to avoid import issues)
const APPROVED_DOMAINS = {
  climate_weather: ['wikipedia.org', 'weather-and-climate.com', 'climasyviajes.com', 'weatherspark.com', 'aemet.es', 'wmo.int', 'climatestotravel.com', 'ncdc.noaa.gov', 'es.weatherspark.com'],
  government_official: ['boe.es', 'agenciatributaria.es', 'exteriores.gob.es', 'juntadeandalucia.es', 'gov.uk', 'gov.ie', 'dfa.ie', 'cnmc.es', 'ine.es', 'catastro.gob.es', 'e-justice.europa.eu', 'extranjeria.administracionespublicas.gob.es', 'mjusticia.gob.es'],
  tourism_culture: ['spain.info', 'andalucia.org', 'visitcostadelsol.com', 'cuevadenerja.es', 'aqualand.es', 'bioparcfuengirola.es', 'selwomarina.es', 'castillomonumentocolomares.com', 'mariposariodebenalmadena.com', 'rmcr.org', 'stupabenalmadena.org', 'aena.es', 'malaga.com', 'turismo.benalmadena.es', 'turismo.estepona.es', 'turismo.fuengirola.es', 'turismo.malaga.eu', 'blog.visitcostadelsol.com', 'europasur.es', 'guidetomalaga.com', 'worldtravelguide.net', 'spainvisa.eu', 'malagaturismo.com', 'festivaldemalaga.com', 'museosdemalaga.com', 'andalucia.com', 'rutasdelsol.es'],
  news_media: ['surinenglish.com', 'euroweeklynews.com', 'theolivepress.es', 'essentialmagazine.com', 'societymarbella.com', 'homeandlifestyle.es', 'webexpressguide.com', 'thespanisheye.com', 'andaluciatoday.com', 'thelocal.es', 'spainenglish.com', 'expatica.com', 'inspain.news', 'eyeonspain.com', 'thinkspain.com', 'lachispa.net'],
  legal_professional: ['abogadoespanol.com', 'legalservicesinspain.com', 'costaluzlawyers.es', 'spanishsolutions.net', 'lexidy.com', 'registradores.org', 'notariado.org', 'cec-spain.es', 'negociosabogados.com', 'nuevoleon.net', 'malagasolicitors.es'],
  healthcare: ['sspa.juntadeandalucia.es', 'quironsalud.es', 'vithas.es', 'hospiten.com', 'helicopterossanitarios.com', 'medimar.com', 'nhs.uk', 'panoramamarbella.com', 'sanitas.com', 'citizensinformation.ie', 'juntadeandalucia.es', 'cofaes.es', 'andalucia.com'],
  education: ['nabss.org', 'ibo.org', 'britishcouncil.es', 'alohacollege.com', 'sis.ac', 'international-schools-database.com', 'uma.es', 'miuc.org', 'baleario.com', 'udc.es', 'spain.info', 'campusdelasol.uma.es', 'eoimalaga.com', 'ihmarbella.com', 'cit.es', 'escuelaeuropea.es', 'colegioatalaya.com'],
  nature_outdoor: ['caminodelrey.info', 'transandalus.com', 'strava.com', 'komoot.com', 'malagacyclingclub.com', 'coastalpath.net', 'bicicletasdelsol.com', 'cyclespain.net', 'outdooractive.com', 'diverland.es', 'senderismomalaga.com', 'telefericobenalmadena.com', 'actividadesmalaga.com', 'duomoturismo.com'],
  gastronomy: ['tastingspain.es', 'rutasdelvino.es', 'sherry.wine', 'vinomalaga.com', 'dopronda.es', 'michelin.com', 'alorenademalaga.com', 'atarazanasmarket.es', 'tasteatlas.com', 'gastronomiamalaga.com', 'lamelonera.com', 'slowfoodmalaga.com'],
  sports_recreation: ['padelfederacion.es', 'marbellaguide.com', 'worldpadeltour.com', 'clubpadelexterio.org', 'haciendadelalamo.com', 'padelclick.com', 'padelenred.com', 'benahavispadelacademy.com', 'vivagym.es', 'basic-fit.com', 'synergym.es', 'yogamarbella.com', 'yogaforlife.es', 'clubelcandado.com', 'puenteromano.com', 'reservadelhigueronresort.com'],
  expat_resources: ['expatarrivals.com', 'internations.org', 'britoninspain.com', 'spainexpat.com', 'renewspain.com', 'schengenvisainfo.com'],
  finance: ['bde.es', 'caa.co.uk', 'fred.stlouisfed.org', 'ecb.europa.eu', 'imf.org', 'numbeo.com'],
  transportation: ['aena.es', 'renfe.com', 'alsa.es', 'britishairways.com', 'aerlingus.com', 'iberia.com', 'ryanair.com', 'easyjet.com', 'jet2.com', 'vueling.com', 'tui.co.uk'],
  telecom: ['movistar.es', 'vodafone.es', 'orange.es', 'masmovil.com'],
  local_government: ['marbella.es', 'fuengirola.es', 'torremolinos.es', 'benalmadena.es', 'mijas.es', 'estepona.es', 'manilva.es', 'casares.es', 'sanpedroalcantara.es', 'sotogrande.es'],
  shopping: ['miramarcc.com', 'plazamayor.es', 'la-canada.com', 'elcorteingles.es', 'decathlon.es', 'ikea.com', 'leroymerlin.es'],
  sustainability: ['agenciaandaluzadelaenergia.es', 'energy.ec.europa.eu', 'renewableenergyworld.com', 'wwf.es', 'benalmadena.es', 'malaga.eu', 'programmemaBiosfera.es', 'climateportugal.com', 'educasol.org']
};

function isApprovedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();
    const allDomains = Object.values(APPROVED_DOMAINS).flat();
    
    return allDomains.some(domain => {
      const domainLower = domain.toLowerCase();
      if (hostname === domainLower) return true;
      if (hostname.endsWith(`.${domainLower}`)) return true;
      
      const domainBase = domainLower.split('/')[0];
      if (hostname === domainBase || hostname.endsWith(`.${domainBase}`)) return true;
      if (domainLower.includes('/') && hostname.includes(domainBase)) return true;
      
      return false;
    });
  } catch {
    return false;
  }
}

function extractCitationContext(content: string, citationUrl: string, maxLength: number = 500): string | null {
  try {
    const urlPattern = citationUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const position = content.search(new RegExp(urlPattern, 'i'));
    
    if (position === -1) {
      const domain = new URL(citationUrl).hostname.replace('www.', '');
      const domainPosition = content.indexOf(domain);
      if (domainPosition === -1) return null;
      return extractParagraph(content, domainPosition, maxLength);
    }
    
    return extractParagraph(content, position, maxLength);
  } catch (error) {
    console.warn('Error extracting citation context:', error);
    return null;
  }
}

function extractParagraph(content: string, position: number, maxLength: number): string {
  const paragraphBreaks = /\n\n|<\/p>|<p>|<h[1-6]>|<\/h[1-6]>/gi;
  let match;
  let lastBreak = 0;
  let nextBreak = content.length;
  
  while ((match = paragraphBreaks.exec(content)) !== null) {
    if (match.index < position) {
      lastBreak = match.index + match[0].length;
    } else if (match.index > position && nextBreak === content.length) {
      nextBreak = match.index;
      break;
    }
  }
  
  let paragraph = content.substring(lastBreak, nextBreak).trim();
  
  if (paragraph.length > maxLength) {
    return extractSentence(paragraph, position - lastBreak, maxLength);
  }
  
  return paragraph;
}

function extractSentence(text: string, position: number, maxLength: number): string {
  const sentenceEndings = /[.!?]+\s+/g;
  let match;
  let lastEnding = 0;
  let nextEnding = text.length;
  
  while ((match = sentenceEndings.exec(text)) !== null) {
    const endPos = match.index + match[0].length;
    if (endPos < position) {
      lastEnding = endPos;
    } else if (endPos > position && nextEnding === text.length) {
      nextEnding = endPos;
      break;
    }
  }
  
  let sentence = text.substring(lastEnding, nextEnding).trim();
  
  if (sentence.length > maxLength) {
    const start = Math.max(0, position - lastEnding - Math.floor(maxLength / 2));
    const end = Math.min(sentence.length, start + maxLength);
    sentence = (start > 0 ? '...' : '') + sentence.substring(start, end) + (end < sentence.length ? '...' : '');
  }
  
  return sentence;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit } = await req.json().catch(() => ({}));
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`🔄 Starting batch replacement for non-approved citations${limit ? ` (testing with ${limit} articles)` : ''}...`);

    // Fetch articles with external_citations
    let query = supabaseClient
      .from('blog_articles')
      .select('id, headline, detailed_content, language, external_citations, slug, status');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data: articles, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching articles:', fetchError);
      throw fetchError;
    }

    console.log(`📚 Found ${articles?.length || 0} total articles`);

    const results = {
      processed: 0,
      autoApplied: 0,
      manualReview: 0,
      failed: 0,
      noAlternatives: 0,
      alreadyApproved: 0,
      articlesUpdated: 0,
      citationsProcessed: 0,
      details: [] as any[]
    };

    // Collect all non-approved citations
    const nonApprovedCitations: Array<{
      url: string;
      source: string;
      articleId: string;
      articleHeadline: string;
      articleContent: string;
      articleLanguage: string;
    }> = [];

    for (const article of articles || []) {
      const citations = (article.external_citations as any[]) || [];
      
      for (const citation of citations) {
        if (!isApprovedDomain(citation.url)) {
          nonApprovedCitations.push({
            url: citation.url,
            source: citation.source || 'Unknown',
            articleId: article.id,
            articleHeadline: article.headline,
            articleContent: article.detailed_content || '',
            articleLanguage: article.language || 'en'
          });
        }
      }
    }

    console.log(`🔍 Found ${nonApprovedCitations.length} non-approved citations to process`);

    for (const citation of nonApprovedCitations) {
      try {
        console.log(`\n🔧 Processing: ${citation.url} in "${citation.articleHeadline}"`);
        results.processed++;
        results.citationsProcessed++;

        // Extract citation context for better replacements
        const citationContext = extractCitationContext(citation.articleContent, citation.url);

        // Call discover-better-links to find approved alternatives
        const { data: discoveryData, error: discoveryError } = await supabaseClient.functions.invoke(
          'discover-better-links',
          {
            body: {
              originalUrl: citation.url,
              articleHeadline: citation.articleHeadline,
              articleContent: citation.articleContent,
              citationContext: citationContext,
              articleLanguage: citation.articleLanguage,
              context: 'Batch replacement of non-approved citation',
              mustBeApproved: true
            }
          }
        );

        if (discoveryError || !discoveryData?.suggestions?.length) {
          console.log(`❌ No approved alternatives found for ${citation.url}`);
          results.noAlternatives++;
          results.details.push({
            url: citation.url,
            articleId: citation.articleId,
            status: 'no-alternatives',
            reason: 'No approved domain alternatives found'
          });
          continue;
        }

        const suggestions = discoveryData.suggestions;
        console.log(`💡 Found ${suggestions.length} suggestions for ${citation.url}`);

        // Get best verified match
        const bestMatch = suggestions.find((s: any) => s.verified) || suggestions[0];
        
        if (!bestMatch.verified) {
          console.log(`⚠️  Best suggestion not verified for ${citation.url}`);
          results.failed++;
          results.details.push({
            url: citation.url,
            articleId: citation.articleId,
            status: 'verification-failed',
            reason: 'Suggestions found but could not be verified'
          });
          continue;
        }

        // Normalize URLs to check if they're the same
        const normalizeUrl = (urlString: string) => {
          try {
            const urlObj = new URL(urlString);
            return urlObj.hostname.replace('www.', '') + urlObj.pathname.replace(/\/$/, '');
          } catch {
            return urlString;
          }
        };

        if (normalizeUrl(citation.url) === normalizeUrl(bestMatch.suggestedUrl)) {
          console.log(`✅ Citation already uses approved domain: ${citation.url}`);
          results.alreadyApproved++;
          results.details.push({
            url: citation.url,
            articleId: citation.articleId,
            status: 'already-approved',
            reason: 'URL is already from an approved domain'
          });
          continue;
        }

        // Calculate confidence score
        const relevanceScore = bestMatch.relevanceScore || 75;
        const authorityScore = bestMatch.authorityScore || 7;
        
        let confidenceScore = 0;
        if (relevanceScore >= 90 && authorityScore >= 8) {
          confidenceScore = 9.5;
        } else if (relevanceScore >= 85 && authorityScore >= 8) {
          confidenceScore = 9.0;
        } else if (relevanceScore >= 80 && authorityScore >= 9) {
          confidenceScore = 8.5;
        } else if (relevanceScore >= 80 && authorityScore >= 8) {
          confidenceScore = 8.0;
        } else if (relevanceScore >= 75 && authorityScore >= 7) {
          confidenceScore = 7.5;
        } else if (relevanceScore >= 70 && authorityScore >= 7) {
          confidenceScore = 7.0;
        } else {
          confidenceScore = 6.5;
        }

        // Insert replacement suggestion
        const replacementData = {
          original_url: citation.url,
          original_source: citation.source,
          replacement_url: bestMatch.suggestedUrl,
          replacement_source: bestMatch.sourceName || 'Unknown',
          replacement_reason: bestMatch.reason || 'Better approved source found',
          confidence_score: confidenceScore,
          status: confidenceScore >= 8.0 ? 'approved' : 'suggested',
          suggested_by: 'batch-replace-non-approved'
        };

        const { data: insertedReplacement, error: insertError } = await supabaseClient
          .from('dead_link_replacements')
          .insert(replacementData)
          .select('id')
          .single();

        if (insertError) {
          console.error(`Error inserting replacement for ${citation.url}:`, insertError);
          results.failed++;
          results.details.push({
            url: citation.url,
            articleId: citation.articleId,
            status: 'insert-failed',
            error: insertError.message
          });
          continue;
        }

        // Auto-apply if confidence is high enough
        if (confidenceScore >= 8.0 && insertedReplacement?.id) {
          console.log(`🚀 Auto-applying replacement (confidence: ${confidenceScore}/10)`);

          const { data: applyResult, error: applyError } = await supabaseClient.functions.invoke(
            'apply-citation-replacement',
            {
              body: {
                replacementIds: [insertedReplacement.id],
                preview: false
              }
            }
          );

          if (applyError || !applyResult?.success) {
            console.log(`⚠️  Auto-application failed for ${citation.url}`);
            results.manualReview++;
            results.details.push({
              url: citation.url,
              articleId: citation.articleId,
              status: 'auto-apply-failed',
              score: confidenceScore,
              replacement: bestMatch.suggestedUrl,
              error: applyError?.message || 'Unknown error'
            });
            continue;
          }

          console.log(`✅ Successfully auto-applied replacement for ${citation.url}`);
          results.autoApplied++;
          results.articlesUpdated += applyResult.articlesUpdated || 0;
          results.details.push({
            url: citation.url,
            articleId: citation.articleId,
            status: 'auto-applied',
            score: confidenceScore,
            originalSource: citation.source,
            replacement: bestMatch.suggestedUrl,
            replacementSource: bestMatch.sourceName,
            articlesUpdated: applyResult.articlesUpdated
          });
        } else {
          console.log(`📋 Saved for manual review (score: ${confidenceScore}/10)`);
          results.manualReview++;
          results.details.push({
            url: citation.url,
            articleId: citation.articleId,
            status: 'manual-review',
            score: confidenceScore,
            replacement: bestMatch.suggestedUrl,
            reason: 'Below auto-approval threshold (8.0)'
          });
        }

      } catch (citationError) {
        console.error(`Error processing citation ${citation.url}:`, citationError);
        results.failed++;
        results.details.push({
          url: citation.url,
          articleId: citation.articleId,
          status: 'error',
          error: (citationError as Error).message
        });
      }
    }

    console.log('\n🎉 Batch replacement complete!');
    console.log(`📊 Results:
      - Citations processed: ${results.citationsProcessed}
      - Auto-applied: ${results.autoApplied}
      - Manual review needed: ${results.manualReview}
      - No alternatives found: ${results.noAlternatives}
      - Already approved: ${results.alreadyApproved}
      - Failed: ${results.failed}
      - Articles updated: ${results.articlesUpdated}
    `);

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in batch-replace-non-approved:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
