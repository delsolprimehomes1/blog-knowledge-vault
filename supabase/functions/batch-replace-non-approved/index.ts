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

// Coordinator function: Split citations into chunks and queue them
async function processReplacements(supabaseClient: any, jobId: string, limit: number | null) {
  try {
    console.log(`Starting batch replacement coordinator for job ${jobId}`);
    
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

    console.log(`Found ${nonApprovedCitations.length} non-approved citations`);

    if (nonApprovedCitations.length === 0) {
      await supabaseClient
        .from('citation_replacement_jobs')
        .update({
          status: 'completed',
          progress_total: 0,
          progress_current: 0,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return;
    }

    // Split into chunks of 25
    const CHUNK_SIZE = 25;
    const chunks = [];
    for (let i = 0; i < nonApprovedCitations.length; i += CHUNK_SIZE) {
      chunks.push({
        chunk_number: Math.floor(i / CHUNK_SIZE) + 1,
        citations: nonApprovedCitations.slice(i, i + CHUNK_SIZE),
        progress_total: Math.min(CHUNK_SIZE, nonApprovedCitations.length - i)
      });
    }

    console.log(`Created ${chunks.length} chunks of ${CHUNK_SIZE} citations each`);

    // Create chunk records in database
    for (const chunk of chunks) {
      const { error: chunkError } = await supabaseClient
        .from('citation_replacement_chunks')
        .insert({
          parent_job_id: jobId,
          chunk_number: chunk.chunk_number,
          chunk_size: chunk.citations.length,
          citations: chunk.citations,
          progress_total: chunk.progress_total,
          status: 'pending'
        });

      if (chunkError) {
        console.error('Failed to create chunk:', chunkError);
        throw chunkError;
      }
    }

    // Update parent job with chunk info
    await supabaseClient
      .from('citation_replacement_jobs')
      .update({
        total_chunks: chunks.length,
        chunk_size: CHUNK_SIZE,
        progress_total: nonApprovedCitations.length,
      })
      .eq('id', jobId);

    console.log(`Job ${jobId} coordinator complete. Triggering first chunk processor.`);

    // Trigger first chunk processor (it will chain to others)
    await supabaseClient.functions.invoke('process-citation-chunk', {
      body: { parentJobId: jobId }
    });

  } catch (error) {
    console.error(`Coordinator for job ${jobId} failed:`, error);
    await supabaseClient
      .from('citation_replacement_jobs')
      .update({
        status: 'failed',
        error_message: `Coordinator failed: ${(error as Error).message}`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
