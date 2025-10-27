/**
 * Citation Approval Checker
 * Utilities for checking if citations are from approved domains
 */

import { supabase } from "@/integrations/supabase/client";

// Approved domains list (mirrors supabase/functions/shared/approvedDomains.ts)
const APPROVED_DOMAINS = {
  climate_weather: [
    'wikipedia.org', 'weather-and-climate.com', 'climasyviajes.com', 
    'weatherspark.com', 'aemet.es', 'wmo.int', 'climatestotravel.com',
    'ncdc.noaa.gov', 'es.weatherspark.com'
  ],
  government_official: [
    'boe.es', 'agenciatributaria.es', 'exteriores.gob.es', 
    'juntadeandalucia.es', 'gov.uk', 'gov.ie', 'cnmc.es', 'ine.es',
    'catastro.gob.es', 'e-justice.europa.eu', 
    'extranjeria.administracionespublicas.gob.es', 'mjusticia.gob.es'
  ],
  tourism_culture: [
    'spain.info', 'andalucia.org', 'visitcostadelsol.com',
    'cuevadenerja.es', 'aqualand.es', 'bioparcfuengirola.es',
    'selwomarina.es', 'castillomonumentocolomares.com',
    'mariposariodebenalmadena.com', 'rmcr.org', 'stupabenalmadena.org',
    'aena.es', 'malaga.com', 'turismo.benalmadena.es', 'turismo.estepona.es',
    'turismo.fuengirola.es', 'turismo.malaga.eu', 'blog.visitcostadelsol.com',
    'europasur.es', 'guidetomalaga.com', 'worldtravelguide.net',
    'spainvisa.eu', 'malagaturismo.com', 'festivaldemalaga.com',
    'museosdemalaga.com', 'andalucia.com', 'rutasdelsol.es'
  ],
  news_media: [
    'surinenglish.com', 'euroweeklynews.com', 'theolivepress.es',
    'essentialmagazine.com', 'societymarbella.com', 'homeandlifestyle.es',
    'webexpressguide.com', 'thespanisheye.com', 'andaluciatoday.com',
    'thelocal.es', 'spainenglish.com', 'expatica.com', 'inspain.news',
    'eyeonspain.com', 'thinkspain.com', 'lachispa.net'
  ],
  legal_professional: [
    'abogadoespanol.com', 'legalservicesinspain.com', 'costaluzlawyers.es',
    'spanishsolutions.net', 'lexidy.com', 'registradores.org',
    'notariado.org', 'cec-spain.es', 'negociosabogados.com',
    'nuevoleon.net', 'malagasolicitors.es'
  ],
  healthcare: [
    'sspa.juntadeandalucia.es', 'quironsalud.es', 'vithas.es',
    'hospiten.com', 'helicopterossanitarios.com', 'medimar.com',
    'nhs.uk', 'panoramamarbella.com', 'sanitas.com',
    'citizensinformation.ie', 'juntadeandalucia.es', 'cofaes.es',
    'andalucia.com'
  ],
  education: [
    'nabss.org', 'ibo.org', 'britishcouncil.es', 'alohacollege.com',
    'sis.ac', 'international-schools-database.com', 'uma.es',
    'miuc.org', 'baleario.com', 'udc.es', 'spain.info',
    'campusdelasol.uma.es', 'eoimalaga.com', 'ihmarbella.com',
    'cit.es', 'escuelaeuropea.es', 'colegioatalaya.com'
  ],
  nature_outdoor: [
    'caminodelrey.info', 'transandalus.com', 'strava.com', 'komoot.com',
    'malagacyclingclub.com', 'coastalpath.net', 'bicicletasdelsol.com',
    'cyclespain.net', 'outdooractive.com', 'diverland.es',
    'senderismomalaga.com', 'telefericobenalmadena.com',
    'actividadesmalaga.com', 'duomoturismo.com'
  ],
  gastronomy: [
    'tastingspain.es', 'rutasdelvino.es', 'sherry.wine', 'vinomalaga.com',
    'dopronda.es', 'michelin.com', 'alorenademalaga.com',
    'atarazanasmarket.es', 'tasteatlas.com', 'gastronomiamalaga.com',
    'lamelonera.com', 'slowfoodmalaga.com'
  ],
  sports_recreation: [
    'padelfederacion.es', 'marbellaguide.com', 'worldpadeltour.com',
    'clubpadelexterio.org', 'haciendadelalamo.com', 'padelclick.com',
    'padelenred.com', 'benahavispadelacademy.com', 'vivagym.es',
    'basic-fit.com', 'synergym.es', 'yogamarbella.com', 'yogaforlife.es',
    'clubelcandado.com', 'puenteromano.com', 'reservadelhigueronresort.com'
  ],
  expat_resources: [
    'expatarrivals.com', 'internations.org', 'britoninspain.com',
    'spainexpat.com', 'renewspain.com', 'schengenvisainfo.com'
  ],
  finance: [
    'bde.es', 'caa.co.uk', 'fred.stlouisfed.org', 'ecb.europa.eu',
    'imf.org', 'numbeo.com'
  ],
  transportation: [
    'aena.es', 'renfe.com', 'alsa.es', 'britishairways.com',
    'aerlingus.com', 'iberia.com', 'ryanair.com', 'easyjet.com',
    'jet2.com', 'vueling.com', 'tui.co.uk'
  ],
  telecom: [
    'movistar.es', 'vodafone.es', 'orange.es', 'masmovil.com'
  ],
  local_government: [
    'marbella.es', 'fuengirola.es', 'torremolinos.es', 'benalmadena.es',
    'mijas.es', 'estepona.es', 'manilva.es', 'casares.es',
    'sanpedroalcantara.es', 'sotogrande.es'
  ],
  shopping: [
    'miramarcc.com', 'plazamayor.es', 'la-canada.com', 'elcorteingles.es',
    'decathlon.es', 'ikea.com', 'leroymerlin.es'
  ],
  sustainability: [
    'agenciaandaluzadelaenergia.es', 'energy.ec.europa.eu',
    'renewableenergyworld.com', 'wwf.es', 'benalmadena.es', 'malaga.eu',
    'programmemaBiosfera.es', 'climateportugal.com', 'educasol.org'
  ]
};

export function getAllApprovedDomains(): string[] {
  return Object.values(APPROVED_DOMAINS).flat();
}

export function isApprovedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();
    const allDomains = getAllApprovedDomains();
    
    return allDomains.some(domain => {
      const domainLower = domain.toLowerCase();
      if (hostname === domainLower) return true;
      if (hostname.endsWith(`.${domainLower}`)) return true;
      
      const domainBase = domainLower.split('/')[0];
      if (hostname === domainBase || hostname.endsWith(`.${domainBase}`)) return true;
      if (domainLower.includes('/') && hostname.includes(domainBase)) return true;
      
      return false;
    });
  } catch (error) {
    console.error('Error parsing URL:', url, error);
    return false;
  }
}

export function getDomainCategory(url: string): string | null {
  if (!isApprovedDomain(url)) return null;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();
    
    for (const [category, domains] of Object.entries(APPROVED_DOMAINS)) {
      if (domains.some(domain => {
        const domainLower = domain.toLowerCase();
        const domainBase = domainLower.split('/')[0];
        return hostname === domainLower || 
               hostname.endsWith(`.${domainLower}`) ||
               hostname === domainBase ||
               hostname.endsWith(`.${domainBase}`);
      })) {
        return category;
      }
    }
  } catch (error) {
    console.error('Error determining category:', url, error);
  }
  
  return null;
}

export interface ArticleWithNonApprovedCitations {
  id: string;
  headline: string;
  slug: string;
  language: string;
  status: string;
  nonApprovedCitations: Array<{
    url: string;
    source: string;
    text?: string;
    isApproved: false;
  }>;
  approvedCitations: number;
  totalCitations: number;
}

export async function getArticlesWithNonApprovedCitations(): Promise<ArticleWithNonApprovedCitations[]> {
  const { data: articles, error } = await supabase
    .from('blog_articles')
    .select('id, headline, slug, language, status, external_citations')
    .not('external_citations', 'is', null);

  if (error) throw error;
  if (!articles) return [];

  const articlesWithIssues: ArticleWithNonApprovedCitations[] = [];

  for (const article of articles) {
    const citations = article.external_citations as any[];
    if (!citations || !Array.isArray(citations) || citations.length === 0) continue;

    const nonApproved = citations.filter(c => c.url && !isApprovedDomain(c.url));
    
    if (nonApproved.length > 0) {
      articlesWithIssues.push({
        id: article.id,
        headline: article.headline,
        slug: article.slug,
        language: article.language,
        status: article.status,
        nonApprovedCitations: nonApproved.map(c => ({
          url: c.url,
          source: c.source || 'Unknown',
          text: c.text,
          isApproved: false as const
        })),
        approvedCitations: citations.length - nonApproved.length,
        totalCitations: citations.length
      });
    }
  }

  return articlesWithIssues;
}
