import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('Starting batch non-approved citation replacement');

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id;
    }

    // Get limit from request body (for testing)
    const { limit } = await req.json().catch(() => ({ limit: null }));

    // Create job record immediately
    const { data: job, error: jobError } = await supabaseClient
      .from('citation_replacement_jobs')
      .insert({
        status: 'running',
        created_by: userId,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      throw jobError;
    }

    console.log('Created job:', job.id);

    // Return job ID immediately
    const response = new Response(
      JSON.stringify({ jobId: job.id, status: 'running' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

    // Process in background (don't await)
    processReplacements(supabaseClient, job.id, limit).catch(error => {
      console.error('Background processing error:', error);
    });

    return response;

  } catch (error) {
    console.error('Error in batch-replace-non-approved:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Background processing function with timeout handling
async function processReplacements(supabaseClient: any, jobId: string, limit: number | null) {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 540000; // 9 minutes (leave buffer before edge function timeout)
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  let lastHeartbeat = Date.now();

  // Heartbeat function to keep job status updated
  const updateHeartbeat = async () => {
    const now = Date.now();
    if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
      await supabaseClient
        .from('citation_replacement_jobs')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', jobId);
      lastHeartbeat = now;
      console.log(`Heartbeat updated for job ${jobId}`);
    }
  };
  
  try {
    console.log(`Starting batch replacement job ${jobId}`);
    
    // Clean up any stuck jobs first
    await supabaseClient.rpc('check_stuck_citation_jobs');
    // Fetch articles
    let query = supabaseClient
      .from('blog_articles')
      .select('id, headline, detailed_content, language, external_citations, slug, status');
    
    if (limit) query = query.limit(limit);
    
    const { data: articles, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    console.log(`Processing ${articles.length} articles`);

    // Collect non-approved citations
    const nonApprovedCitations: any[] = [];
    for (const article of articles || []) {
      const citations = (article.external_citations as any[]) || [];
      for (const citation of citations) {
        if (!isApprovedDomain(citation.url)) {
          nonApprovedCitations.push({
            url: citation.url,
            source: citation.source || 'Unknown',
            text: citation.text || '',
            articleId: article.id,
            articleHeadline: article.headline,
            articleContent: article.detailed_content || '',
            articleLanguage: article.language || 'en'
          });
        }
      }
    }

    // Update total progress
    await updateJobStatus(supabaseClient, jobId, {
      progress_total: nonApprovedCitations.length,
    });

    console.log(`Found ${nonApprovedCitations.length} non-approved citations`);

    const results = { autoApplied: 0, manualReview: 0, failed: 0 };
    let currentProgress = 0;

    // Process each citation
    for (const citation of nonApprovedCitations) {
      // Update heartbeat
      await updateHeartbeat();
      
      // Check for timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.warn('Approaching timeout limit, stopping processing');
        await updateJobStatus(supabaseClient, jobId, {
          status: 'partial',
          error_message: `Processed ${currentProgress} of ${nonApprovedCitations.length} citations before timeout`,
          completed_at: new Date().toISOString(),
        });
        return;
      }

      try {
        currentProgress++;
        
        // Update progress every 5 citations
        if (currentProgress % 5 === 0) {
          await updateJobStatus(supabaseClient, jobId, { 
            progress_current: currentProgress,
            auto_applied_count: results.autoApplied,
            manual_review_count: results.manualReview,
            failed_count: results.failed
          });
        }

        console.log(`Processing: ${citation.url}`);

        const citationContext = extractCitationContext(citation.articleContent, citation.url);

        const { data: discoveryResult, error: discoveryError } = await supabaseClient.functions.invoke(
          'discover-better-links',
          {
            body: {
              originalUrl: citation.url,
              articleHeadline: citation.articleHeadline,
              articleContent: citation.articleContent,
              citationContext: citationContext,
              articleLanguage: citation.articleLanguage,
              context: 'Batch replacement',
              mustBeApproved: true
            }
          }
        );

        if (discoveryError || !discoveryResult?.suggestions?.length) {
          console.log('No alternatives found');
          results.failed++;
          continue;
        }

        const bestMatch = discoveryResult.suggestions.find((s: any) => s.verified) || discoveryResult.suggestions[0];
        
        if (!bestMatch.verified) {
          results.failed++;
          continue;
        }

        // Calculate confidence (0-10 scale)
        const relevanceScore = bestMatch.relevanceScore || 75;
        const authorityScore = bestMatch.authorityScore || 7;
        
        let confidenceScore = 5.0;
        if (relevanceScore >= 90 && authorityScore >= 8) confidenceScore = 9.5;
        else if (relevanceScore >= 85 && authorityScore >= 8) confidenceScore = 9.0;
        else if (relevanceScore >= 80 && authorityScore >= 9) confidenceScore = 8.5;
        else if (relevanceScore >= 80 && authorityScore >= 8) confidenceScore = 8.0;
        else if (relevanceScore >= 75 && authorityScore >= 7) confidenceScore = 7.5;

        if (confidenceScore >= 8.0) {
          // Auto-apply high confidence replacements
          // First, create a replacement record in dead_link_replacements
          const { data: replacement, error: replError } = await supabaseClient
            .from('dead_link_replacements')
            .insert({
              original_url: citation.url,
              original_source: citation.source,
              replacement_url: bestMatch.suggestedUrl,
              replacement_source: bestMatch.sourceName,
              replacement_reason: `Auto-replacement: ${bestMatch.reason}`,
              confidence_score: confidenceScore,
              status: 'approved',
              suggested_by: 'auto',
            })
            .select()
            .single();

          if (replError) {
            console.error('Failed to create replacement record:', replError);
            results.failed++;
          } else {
            // Now call apply-citation-replacement with the record ID
            const { error: applyError } = await supabaseClient.functions.invoke(
              'apply-citation-replacement',
              {
                body: {
                  replacementIds: [replacement.id],
                  preview: false
                },
              }
            );

            if (applyError) {
              console.error('Failed to apply replacement:', applyError);
              results.failed++;
            } else {
              results.autoApplied++;
            }
          }
        } else {
          results.manualReview++;
        }

        // Update counts
        await updateJobStatus(supabaseClient, jobId, {
          auto_applied_count: results.autoApplied,
          manual_review_count: results.manualReview,
          failed_count: results.failed,
        });

      } catch (citationError) {
        console.error('Error processing citation:', citationError);
        results.failed++;
      }
    }

    // Mark complete
    const executionTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`Job ${jobId} completed in ${executionTime}s:`, results);
    
    await updateJobStatus(supabaseClient, jobId, {
      status: 'completed',
      progress_current: nonApprovedCitations.length,
      auto_applied_count: results.autoApplied,
      manual_review_count: results.manualReview,
      failed_count: results.failed,
      completed_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`Job ${jobId} failed with error:`, error);
    const executionTime = Math.round((Date.now() - startTime) / 1000);
    
    // Always mark job as failed on error
    await updateJobStatus(supabaseClient, jobId, {
      status: 'failed',
      error_message: `${(error as Error).message} (after ${executionTime}s)`,
      completed_at: new Date().toISOString(),
    });
  } finally {
    // Final heartbeat to ensure job status is updated
    await supabaseClient
      .from('citation_replacement_jobs')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', jobId);
    
    console.log(`Job ${jobId} processing finished`);
  }
}

async function updateJobStatus(supabaseClient: any, jobId: string, updates: any) {
  const { error } = await supabaseClient
    .from('citation_replacement_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    console.error('Failed to update job status:', error);
  }
}
