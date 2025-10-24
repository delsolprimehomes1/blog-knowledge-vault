/**
 * Approved External Citation Domains
 * 
 * This file contains the authoritative list of domains allowed for external citations.
 * All Perplexity API calls MUST filter to these domains only.
 */

export const APPROVED_DOMAINS = {
  news_media: [
    'surinenglish.com', 'euroweeklynews.com', 'theolivepress.es',
    'essentialmagazine.com', 'societymarbella.com', 'homeandlifestyle.es',
    'webexpressguide.com', 'thespanisheye.com', 'andaluciatoday.com',
    'thelocal.es', 'spainenglish.com', 'expatica.com', 'inspain.news',
    'eyeonspain.com', 'thinkspain.com', 'lachispa.net'
  ],
  government: [
    'boe.es', 'agenciatributaria.es', 'exteriores.gob.es', 'registradores.org',
    'notariado.org', 'juntadeandalucia.es', 'spain.info', 'andalucia.org',
    'visitcostadelsol.com', 'gov.uk', 'dfa.ie', 'gov.ie', 'cnmc.es',
    'ine.es', 'catastro.gob.es', 'e-justice.europa.eu'
  ],
  legal: [
    'abogadoespanol.com', 'legalservicesinspain.com', 'costaluzlawyers.es',
    'spanishsolutions.net', 'lexidy.com'
  ],
  travel_tourism: [
    'tastingspain.es', 'rutasdelvino.es', 'sherry.wine', 'vinomalaga.com',
    'dopronda.es', 'michelin.com', 'guidetomalaga.com', 'worldtravelguide.net',
    'spainvisa.eu', 'malagaturismo.com', 'festivaldemalaga.com',
    'museosdemalaga.com', 'andalucia.com', 'rutasdelsol.es'
  ],
  finance: [
    'bde.es', 'caa.co.uk', 'fred.stlouisfed.org', 'ecb.europa.eu',
    'imf.org', 'numbeo.com'
  ],
  transportation: [
    'aena.es', 'renfe.com', 'alsa.es', 'britishairways.com', 'aerlingus.com',
    'iberia.com', 'ryanair.com', 'easyjet.com', 'jet2.com', 'vueling.com', 'tui.co.uk'
  ],
  education: [
    'nabss.org', 'ibo.org', 'britishcouncil.es', 'alohacollege.com', 'sis.ac'
  ],
  healthcare: [
    'helicopterossanitarios.com', 'quironsalud.es', 'vithas.es', 'hospiten.com'
  ],
  telecom: [
    'movistar.es', 'vodafone.es', 'orange.es', 'masmovil.com'
  ],
  local_govt: [
    'marbella.es', 'fuengirola.es', 'torremolinos.es', 'benalmadena.es',
    'mijas.es', 'estepona.es', 'manilva.es', 'casares.es',
    'sanpedroalcantara.es', 'sotogrande.es'
  ],
  shopping: [
    'miramarcc.com', 'plazamayor.es', 'la-canada.com', 'elcorteingles.es',
    'decathlon.es', 'ikea.com', 'leroymerlin.es'
  ],
  sports_wellness: [
    'vivagym.es', 'basic-fit.com', 'synergym.es', 'yogamarbella.com',
    'yogaforlife.es', 'clubelcandado.com', 'puenteromano.com',
    'reservadelhigueronresort.com'
  ]
};

/**
 * Get all approved domains as a flat array
 */
export function getAllApprovedDomains(): string[] {
  return Object.values(APPROVED_DOMAINS).flat();
}

/**
 * Generate Perplexity site: query string
 * Format: site:domain1.com OR site:domain2.com OR ...
 */
export function generateSiteQuery(): string {
  const allDomains = getAllApprovedDomains();
  return allDomains.map(d => `site:${d}`).join(' OR ');
}

/**
 * Check if a URL is from an approved domain
 * Handles www prefix, HTTPS/HTTP, subdomains, and TLD variations
 */
export function isApprovedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();
    const allDomains = getAllApprovedDomains();
    
    // Check exact match or subdomain match
    return allDomains.some(domain => {
      const domainLower = domain.toLowerCase();
      
      // Exact match
      if (hostname === domainLower) return true;
      
      // Subdomain match (e.g., blog.domain.com matches domain.com)
      if (hostname.endsWith(`.${domainLower}`)) return true;
      
      // Special handling for domains with paths (e.g., ikea.com/es matches ikea.com)
      const domainBase = domainLower.split('/')[0];
      if (hostname === domainBase || hostname.endsWith(`.${domainBase}`)) return true;
      
      // TLD-less match (e.g., basic-fit.com/es matches basic-fit.com)
      if (domainLower.includes('/') && hostname.includes(domainBase)) return true;
      
      return false;
    });
  } catch (error) {
    console.error('Error parsing URL:', url, error);
    return false;
  }
}

/**
 * Get the category for a given URL
 * Returns null if not found in approved domains
 */
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

/**
 * Get domain summary for logging
 */
export function getDomainSummary(): string {
  const categories = Object.entries(APPROVED_DOMAINS);
  const totalDomains = getAllApprovedDomains().length;
  
  return `
📊 Approved Domain Summary:
  Total: ${totalDomains} domains
  ${categories.map(([cat, domains]) => `  - ${cat}: ${domains.length}`).join('\n  ')}
  `;
}
