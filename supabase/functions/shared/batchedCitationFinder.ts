import { getAllApprovedDomains } from "./approvedDomains.ts";
import { isCompetitor } from "./competitorBlacklist.ts";
import { calculateAuthorityScore } from "./authorityScoring.ts";
import { getArticleUsedDomains, getUnderutilizedDomains, filterAndPrioritizeDomains } from "./domainRotation.ts";
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { parseArticleContent, formatSentencesForPrompt, type ArticleSentence } from './articleAnalyzer.ts';

export interface BetterCitation {
  url: string;
  source: string;
  description: string;
  relevance: string;
  authorityScore: number;
  language: string;
  suggestedContext?: string;
  verified?: boolean;
  batchTier?: string;
  targetSentence?: string;
  sentenceId?: string;
  suggestedAnchor?: string;
  placementContext?: string;
  confidenceScore?: number;
}

const DOMAIN_BATCHES = {
  tierS: ['boe.es', 'agenciatributaria.es', 'exteriores.gob.es', 'juntadeandalucia.es', 'gov.uk', 'gov.ie', 'spain.info', 'andalucia.org', 'visitcostadelsol.com', 'cnmc.es', 'ine.es', 'catastro.gob.es', 'mjusticia.gob.es', 'extranjeria.administracionespublicas.gob.es'],
  tierA: ['abogadoespanol.com', 'legalservicesinspain.com', 'lexidy.com', 'sspa.juntadeandalucia.es', 'quironsalud.es', 'nhs.uk', 'sanitas.com', 'uma.es', 'britishcouncil.es', 'ibo.org', 'nabss.org', 'aena.es', 'renfe.com', 'registradores.org', 'notariado.org', 'malagasolicitors.es', 'cofaes.es', 'vithas.es', 'hospiten.com'],
  tierB: ['surinenglish.com', 'euroweeklynews.com', 'theolivepress.es', 'thelocal.es', 'expatica.com', 'internations.org', 'expatarrivals.com', 'spainexpat.com', 'britoninspain.com', 'eyeonspain.com', 'essentialmagazine.com', 'thinkspain.com', 'spainenglish.com', 'inspain.news', 'lachispa.net', 'andaluciatoday.com'],
  tierC: ['cuevadenerja.es', 'malaga.com', 'turismo.malaga.eu', 'turismo.benalmadena.es', 'turismo.estepona.es', 'turismo.fuengirola.es', 'blog.visitcostadelsol.com', 'malagaturismo.com', 'festivaldemalaga.com', 'museosdemalaga.com', 'guidetomalaga.com', 'worldtravelguide.net', 'aqualand.es', 'bioparcfuengirola.es', 'selwomarina.es', 'rmcr.org', 'stupabenalmadena.org', 'castillomonumentocolomares.com', 'mariposariodebenalmadena.com'],
  tierD: ['caminodelrey.info', 'transandalus.com', 'outdooractive.com', 'weatherspark.com', 'aemet.es', 'wmo.int', 'weather-and-climate.com', 'climasyviajes.com', 'climatestotravel.com', 'wikipedia.org', 'senderismomalaga.com', 'cyclespain.net', 'malagacyclingclub.com', 'coastalpath.net', 'bicicletasdelsol.com', 'actividadesmalaga.com', 'diverland.es', 'telefericobenalmadena.com', 'duomoturismo.com'],
  tierE: ['padelfederacion.es', 'worldpadeltour.com', 'marbellaguide.com', 'michelin.com', 'tasteatlas.com', 'gastronomiamalaga.com', 'tastingspain.es', 'rutasdelvino.es', 'sherry.wine', 'vinomalaga.com', 'alorenademalaga.com', 'atarazanasmarket.es', 'slowfoodmalaga.com', 'vivagym.es', 'clubelcandado.com', 'puenteromano.com', 'reservadelhigueronresort.com', 'yogamarbella.com'],
  tierF: ['marbella.es', 'fuengirola.es', 'benalmadena.es', 'estepona.es', 'mijas.es', 'torremolinos.es', 'manilva.es', 'casares.es', 'elcorteingles.es', 'miramarcc.com', 'movistar.es', 'vodafone.es', 'agenciaandaluzadelaenergia.es', 'wwf.es', 'renewableenergyworld.com', 'malaga.eu', 'educasol.org', 'energy.ec.europa.eu']
};

async function searchBatch(
  batchDomains: string[],
  articleTopic: string,
  articleContent: string,
  targetCount: number,
  perplexityApiKey: string,
  tier: string,
  citationSentences?: ArticleSentence[],
  prioritizeGovernment = true,
  focusArea?: string
): Promise<BetterCitation[]> {
  if (batchDomains.length === 0) return [];
  
  const domainQuery = batchDomains.map(d => `site:${d}`).join(' OR ');
  const contentSnippet = citationSentences ? articleContent.substring(0, 3000) : articleContent.substring(0, 500);
  const citationOpportunities = citationSentences ? formatSentencesForPrompt(citationSentences.slice(0, 10)) : '';

  const enhancedPrompt = citationSentences ? `Find citations for these claims about "${articleTopic}": ${citationOpportunities}. Use only: ${domainQuery}. Return JSON with supportsSentence, suggestedAnchor, confidenceScore.` : `Find ${targetCount} citations for "${articleTopic}". Use only: ${domainQuery}. Return JSON array.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${perplexityApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{ role: 'system', content: 'Return ONLY valid JSON.' }, { role: 'user', content: enhancedPrompt }],
        max_tokens: 3000,
        temperature: 0.2,
        search_domain_filter: batchDomains
      })
    });

    const data = await response.json();
    let rawText = data.choices?.[0]?.message?.content || '[]';
    rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const results = JSON.parse(rawText);
    const validCitations: BetterCitation[] = [];

    for (const result of results) {
      const url = result.url?.trim();
      if (!url || !url.startsWith('http') || isCompetitor(url)) continue;

      const citation: BetterCitation = {
        url,
        source: result.source || new URL(url).hostname,
        description: result.description || '',
        relevance: result.relevance || '',
        authorityScore: calculateAuthorityScore(url),
        language: 'en',
        batchTier: tier
      };

      if (result.supportsSentence && citationSentences) {
        const idx = result.supportsSentence - 1;
        if (idx >= 0 && idx < citationSentences.length) {
          citation.targetSentence = citationSentences[idx].text;
          citation.suggestedAnchor = result.suggestedAnchor;
          citation.confidenceScore = result.confidenceScore || 85;
          citation.placementContext = result.placementContext;
        }
      }

      validCitations.push(citation);
      if (validCitations.length >= targetCount) break;
    }

    return validCitations;
  } catch (error) {
    console.error(`Batch ${tier} error:`, error);
    return [];
  }
}

export async function findCitationsWithCascade(
  articleTopic: string,
  articleLanguage: string,
  articleContent: string,
  targetCount = 8,
  perplexityApiKey: string,
  focusArea?: string,
  prioritizeGovernment = true,
  minimumGovPercentage = 70,
  articleId?: string,
  supabaseClient?: SupabaseClient,
  enableEnhancedAnalysis = true
): Promise<BetterCitation[]> {
  const citationSentences = enableEnhancedAnalysis ? parseArticleContent(articleContent, 15) : undefined;
  const allCitations: BetterCitation[] = [];
  
  let usedInArticle: string[] = [];
  let underutilized: string[] = [];
  
  if (articleId && supabaseClient) {
    [usedInArticle, underutilized] = await Promise.all([
      getArticleUsedDomains(supabaseClient, articleId),
      getUnderutilizedDomains(supabaseClient, 150)
    ]);
  }

  for (const [tier, domains] of Object.entries(DOMAIN_BATCHES)) {
    if (allCitations.length >= targetCount) break;
    const filteredDomains = articleId && supabaseClient ? filterAndPrioritizeDomains(domains, usedInArticle, underutilized) : domains;
    const batch = await searchBatch(filteredDomains, articleTopic, articleContent, targetCount - allCitations.length, perplexityApiKey, tier, citationSentences, prioritizeGovernment, focusArea);
    allCitations.push(...batch);
  }

  return allCitations.sort((a, b) => b.authorityScore - a.authorityScore).slice(0, targetCount);
}

export async function verifyCitations(citations: BetterCitation[]): Promise<BetterCitation[]> {
  const verified = await Promise.all(
    citations.map(async (c) => {
      try {
        const res = await fetch(c.url, { method: 'HEAD' });
        return { ...c, verified: res.ok, statusCode: res.status };
      } catch {
        return { ...c, verified: false, statusCode: 0 };
      }
    })
  );
  return verified.sort((a, b) => (a.verified && !b.verified ? -1 : !a.verified && b.verified ? 1 : b.authorityScore - a.authorityScore));
}
