/**
 * Domain Batches - Organized by category and language
 * Max 20 domains per batch for Perplexity API compliance
 */

export type DomainCategory = 'government' | 'news' | 'realEstate' | 'tourism' | 'financial';

export interface DomainBatch {
  category: DomainCategory;
  domains: string[];
  language: string;
  count: number;
}

/**
 * Domain batches organized by language and category (max 20 per batch)
 */
export const DOMAIN_BATCHES: Record<string, Record<DomainCategory, string[]>> = {
  en: {
    government: [
      'boe.es',
      'agenciatributaria.es',
      'exteriores.gob.es',
      'juntadeandalucia.es',
      'gov.uk',
      'gov.ie',
      'dfa.ie',
      'registradores.org',
      'notariado.org',
      'catastro.gob.es',
      'ine.es',
      'cnmc.es',
      'e-justice.europa.eu',
      'spain.info',
      'andalucia.org',
      'visitcostadelsol.com',
      'europa.eu',
      'ecb.europa.eu',
      'imf.org',
      'malagaturismo.com'
    ],
    news: [
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'essentialmagazine.com',
      'societymarbella.com',
      'homeandlifestyle.es',
      'webexpressguide.com',
      'thespanisheye.com',
      'andaluciatoday.com',
      'thelocal.es',
      'spainenglish.com',
      'expatica.com',
      'inspain.news',
      'eyeonspain.com',
      'thinkspain.com',
      'lachispa.net'
    ],
    realEstate: [
      'kyero.com',
      'propertyguides.com',
      'spanishpropertychoice.com',
      'aplaceinthesun.com',
      'spanishpropertyinsight.com',
      'spanishhomes.com',
      'costaluzlawyers.es',
      'abogadoespanol.com',
      'legalservicesinspain.com',
      'spanishsolutions.net',
      'lexidy.com',
      'idealista.com',
      'fotocasa.es',
      'pisos.com'
    ],
    tourism: [
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'spain.info',
      'andalucia.com',
      'tastingspain.es',
      'rutasdelvino.es',
      'guidetomalaga.com',
      'worldtravelguide.net',
      'spainvisa.eu',
      'festivaldemalaga.com',
      'museosdemalaga.com',
      'rutasdelsol.es',
      'marbella.es',
      'fuengirola.es',
      'mijas.es',
      'estepona.es',
      'torremolinos.es',
      'benalmadena.es'
    ],
    financial: [
      'bde.es',
      'ecb.europa.eu',
      'imf.org',
      'numbeo.com',
      'fred.stlouisfed.org',
      'caa.co.uk',
      'ine.es',
      'catastro.gob.es'
    ]
  },
  es: {
    government: [
      'boe.es',
      'agenciatributaria.es',
      'exteriores.gob.es',
      'juntadeandalucia.es',
      'registradores.org',
      'notariado.org',
      'catastro.gob.es',
      'ine.es',
      'cnmc.es',
      'spain.info',
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'e-justice.europa.eu',
      'marbella.es',
      'fuengirola.es',
      'torremolinos.es',
      'benalmadena.es',
      'mijas.es',
      'estepona.es'
    ],
    news: [
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'andaluciatoday.com',
      'thelocal.es',
      'lachispa.net'
    ],
    realEstate: [
      'idealista.com',
      'fotocasa.es',
      'pisos.com',
      'kyero.com',
      'costaluzlawyers.es',
      'abogadoespanol.com',
      'legalservicesinspain.com',
      'spanishsolutions.net',
      'lexidy.com'
    ],
    tourism: [
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'spain.info',
      'andalucia.com',
      'tastingspain.es',
      'rutasdelvino.es',
      'guidetomalaga.com',
      'festivaldemalaga.com',
      'museosdemalaga.com',
      'rutasdelsol.es',
      'marbella.es',
      'fuengirola.es',
      'mijas.es',
      'estepona.es'
    ],
    financial: [
      'bde.es',
      'ecb.europa.eu',
      'imf.org',
      'numbeo.com',
      'ine.es',
      'catastro.gob.es'
    ]
  },
  de: {
    government: [
      'boe.es',
      'agenciatributaria.es',
      'exteriores.gob.es',
      'juntadeandalucia.es',
      'registradores.org',
      'notariado.org',
      'spain.info',
      'andalucia.org',
      'e-justice.europa.eu',
      'europa.eu'
    ],
    news: [
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'andaluciatoday.com'
    ],
    realEstate: [
      'idealista.com',
      'kyero.com',
      'costaluzlawyers.es',
      'legalservicesinspain.com',
      'lexidy.com'
    ],
    tourism: [
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'spain.info',
      'andalucia.com',
      'marbella.es'
    ],
    financial: [
      'bde.es',
      'ecb.europa.eu',
      'numbeo.com',
      'ine.es'
    ]
  },
  nl: {
    government: [
      'boe.es',
      'agenciatributaria.es',
      'exteriores.gob.es',
      'juntadeandalucia.es',
      'registradores.org',
      'notariado.org',
      'spain.info',
      'andalucia.org',
      'e-justice.europa.eu',
      'europa.eu'
    ],
    news: [
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'andaluciatoday.com'
    ],
    realEstate: [
      'idealista.com',
      'kyero.com',
      'costaluzlawyers.es',
      'legalservicesinspain.com',
      'lexidy.com'
    ],
    tourism: [
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'spain.info',
      'andalucia.com',
      'marbella.es'
    ],
    financial: [
      'bde.es',
      'ecb.europa.eu',
      'numbeo.com',
      'ine.es'
    ]
  },
  fr: {
    government: [
      'boe.es',
      'agenciatributaria.es',
      'exteriores.gob.es',
      'juntadeandalucia.es',
      'registradores.org',
      'notariado.org',
      'spain.info',
      'andalucia.org',
      'e-justice.europa.eu',
      'europa.eu'
    ],
    news: [
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'andaluciatoday.com'
    ],
    realEstate: [
      'idealista.com',
      'kyero.com',
      'costaluzlawyers.es',
      'legalservicesinspain.com',
      'lexidy.com'
    ],
    tourism: [
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'spain.info',
      'andalucia.com',
      'marbella.es'
    ],
    financial: [
      'bde.es',
      'ecb.europa.eu',
      'numbeo.com',
      'ine.es'
    ]
  },
  pl: {
    government: [
      'boe.es',
      'agenciatributaria.es',
      'exteriores.gob.es',
      'juntadeandalucia.es',
      'registradores.org',
      'notariado.org',
      'spain.info',
      'andalucia.org',
      'e-justice.europa.eu',
      'europa.eu'
    ],
    news: [
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'andaluciatoday.com'
    ],
    realEstate: [
      'idealista.com',
      'kyero.com',
      'costaluzlawyers.es',
      'legalservicesinspain.com',
      'lexidy.com'
    ],
    tourism: [
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'spain.info',
      'andalucia.com',
      'marbella.es'
    ],
    financial: [
      'bde.es',
      'ecb.europa.eu',
      'numbeo.com',
      'ine.es'
    ]
  },
  sv: {
    government: [
      'boe.es',
      'agenciatributaria.es',
      'exteriores.gob.es',
      'juntadeandalucia.es',
      'registradores.org',
      'notariado.org',
      'spain.info',
      'andalucia.org',
      'e-justice.europa.eu',
      'europa.eu'
    ],
    news: [
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'andaluciatoday.com'
    ],
    realEstate: [
      'idealista.com',
      'kyero.com',
      'costaluzlawyers.es',
      'legalservicesinspain.com',
      'lexidy.com'
    ],
    tourism: [
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'spain.info',
      'andalucia.com',
      'marbella.es'
    ],
    financial: [
      'bde.es',
      'ecb.europa.eu',
      'numbeo.com',
      'ine.es'
    ]
  },
  da: {
    government: [
      'boe.es',
      'agenciatributaria.es',
      'exteriores.gob.es',
      'juntadeandalucia.es',
      'registradores.org',
      'notariado.org',
      'spain.info',
      'andalucia.org',
      'e-justice.europa.eu',
      'europa.eu'
    ],
    news: [
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'andaluciatoday.com'
    ],
    realEstate: [
      'idealista.com',
      'kyero.com',
      'costaluzlawyers.es',
      'legalservicesinspain.com',
      'lexidy.com'
    ],
    tourism: [
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'spain.info',
      'andalucia.com',
      'marbella.es'
    ],
    financial: [
      'bde.es',
      'ecb.europa.eu',
      'numbeo.com',
      'ine.es'
    ]
  },
  hu: {
    government: [
      'boe.es',
      'agenciatributaria.es',
      'exteriores.gob.es',
      'juntadeandalucia.es',
      'registradores.org',
      'notariado.org',
      'spain.info',
      'andalucia.org',
      'e-justice.europa.eu',
      'europa.eu'
    ],
    news: [
      'surinenglish.com',
      'euroweeklynews.com',
      'theolivepress.es',
      'andaluciatoday.com'
    ],
    realEstate: [
      'idealista.com',
      'kyero.com',
      'costaluzlawyers.es',
      'legalservicesinspain.com',
      'lexidy.com'
    ],
    tourism: [
      'andalucia.org',
      'visitcostadelsol.com',
      'malagaturismo.com',
      'spain.info',
      'andalucia.com',
      'marbella.es'
    ],
    financial: [
      'bde.es',
      'ecb.europa.eu',
      'numbeo.com',
      'ine.es'
    ]
  }
};

/**
 * Get batch for a specific language and category
 */
export function getBatchForCategory(
  language: string,
  category: DomainCategory
): DomainBatch {
  const languageBatches = DOMAIN_BATCHES[language] || DOMAIN_BATCHES['es'];
  const domains = languageBatches[category] || [];
  
  return {
    category,
    domains: domains.slice(0, 20), // Enforce max 20
    language,
    count: Math.min(domains.length, 20)
  };
}

/**
 * Generate Perplexity site: query from a batch
 */
export function generateBatchSiteQuery(batch: DomainBatch): string {
  return batch.domains.map(d => `site:${d}`).join(' OR ');
}

/**
 * Validate batch size (must be <= 20 for Perplexity API)
 */
export function validateBatchSize(batch: DomainBatch): boolean {
  return batch.count <= 20;
}

/**
 * Get summary of all batches
 */
export function getBatchSummary(language: string): string {
  const languageBatches = DOMAIN_BATCHES[language] || DOMAIN_BATCHES['es'];
  const categories = Object.keys(languageBatches) as DomainCategory[];
  
  return `
📦 Domain Batches for ${language.toUpperCase()}:
${categories.map(cat => {
  const batch = getBatchForCategory(language, cat);
  return `  - ${cat}: ${batch.count} domains`;
}).join('\n')}
  `;
}
