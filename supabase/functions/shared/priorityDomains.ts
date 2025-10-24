/**
 * Top 20 Priority Domains for External Citations
 * 
 * These domains are strategically selected to:
 * 1. Maximize E-E-A-T authority (government, official sources)
 * 2. Avoid linking to competitors in Costa del Sol real estate
 * 3. Provide relevant, helpful information to property buyers
 * 4. Work within Perplexity API's 20-domain limit
 * 
 * Selection criteria:
 * - Spanish government & official sources (highest authority)
 * - Official tourism boards (non-competitive, helpful)
 * - Financial/economic authorities (property buyer needs)
 * - English-language expat news (target audience)
 * - Legal/services (non-competitive, essential info)
 */

export const TOP_20_PRIORITY_DOMAINS = [
  // Tier 1: Spanish Government & Official Sources (7 domains)
  'boe.es',                    // Official Spanish State Gazette - ultimate legal authority
  'agenciatributaria.es',      // Spanish Tax Agency - essential for property taxes
  'juntadeandalucia.es',       // Andalusian Regional Government
  'catastro.gob.es',           // Spanish Land Registry/Cadastre
  'registradores.org',         // College of Property Registrars
  'notariado.org',             // General Council of Spanish Notaries
  'exteriores.gob.es',         // Spanish Ministry of Foreign Affairs
  
  // Tier 2: Official Tourism (4 domains)
  'spain.info',                // Official Spanish Tourism Board
  'andalucia.org',             // Andalusia Tourism Board
  'visitcostadelsol.com',      // Costa del Sol Tourism Board
  'malagaturismo.com',         // Málaga Official Tourism
  
  // Tier 3: Financial & Economic Authority (3 domains)
  'bde.es',                    // Bank of Spain
  'ine.es',                    // Spanish National Statistics Institute
  'ecb.europa.eu',             // European Central Bank
  
  // Tier 4: English-Language Expat News (4 domains)
  'surinenglish.com',          // Sur in English - Costa del Sol news
  'euroweeklynews.com',        // Major English-language expat publication
  'thelocal.es',               // Spanish news in English
  'andaluciatoday.com',        // Regional news in English
  
  // Tier 5: Legal & Services (2 domains)
  'e-justice.europa.eu',       // EU Legal Information Portal
  'gov.uk',                    // UK Government (visa/residency info)
] as const;

/**
 * Documentation for why each domain was selected
 */
export const DOMAIN_SELECTION_REASONING = {
  'boe.es': 'Official Spanish State Gazette - highest legal authority for Spanish law',
  'agenciatributaria.es': 'Spanish Tax Agency - authoritative source for property taxes and fiscal info',
  'juntadeandalucia.es': 'Andalusian Government - regional laws and property regulations',
  'catastro.gob.es': 'Official Land Registry - property valuations and cadastral data',
  'registradores.org': 'Property Registrars - authoritative on property registration',
  'notariado.org': 'Spanish Notaries - essential for property transactions',
  'exteriores.gob.es': 'Foreign Affairs - visa and residency information',
  'spain.info': 'Official tourism - lifestyle and relocation information',
  'andalucia.org': 'Regional tourism - Costa del Sol living information',
  'visitcostadelsol.com': 'Local tourism board - area-specific information',
  'malagaturismo.com': 'Málaga tourism - cultural and lifestyle content',
  'bde.es': 'Bank of Spain - economic data and mortgage information',
  'ine.es': 'National Statistics - demographic and economic data',
  'ecb.europa.eu': 'European Central Bank - monetary policy and economic outlook',
  'surinenglish.com': 'Primary English-language news for Costa del Sol expats',
  'euroweeklynews.com': 'Established expat publication with wide readership',
  'thelocal.es': 'Major English news source covering all of Spain',
  'andaluciatoday.com': 'Regional English news focused on Andalusia',
  'e-justice.europa.eu': 'EU legal portal - cross-border property law',
  'gov.uk': 'UK Government - visa, residency, and Brexit information for British buyers',
} as const;

/**
 * Domain categories for analytics and reporting
 */
export const DOMAIN_CATEGORIES = {
  government: ['boe.es', 'agenciatributaria.es', 'juntadeandalucia.es', 'catastro.gob.es', 'exteriores.gob.es'],
  official_bodies: ['registradores.org', 'notariado.org'],
  tourism: ['spain.info', 'andalucia.org', 'visitcostadelsol.com', 'malagaturismo.com'],
  financial: ['bde.es', 'ine.es', 'ecb.europa.eu'],
  expat_news: ['surinenglish.com', 'euroweeklynews.com', 'thelocal.es', 'andaluciatoday.com'],
  legal: ['e-justice.europa.eu', 'gov.uk'],
} as const;

export type PriorityDomain = typeof TOP_20_PRIORITY_DOMAINS[number];
export type DomainCategory = keyof typeof DOMAIN_CATEGORIES;
