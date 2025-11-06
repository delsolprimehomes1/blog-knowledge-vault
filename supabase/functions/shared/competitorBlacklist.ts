/**
 * Real Estate Competitor Blacklist
 * 
 * These domains directly compete with Del Sol Prime Homes.
 * Citations to these domains are BLOCKED to prevent sending users to competitors.
 */

export const COMPETITOR_DOMAINS = [
  // Major Spanish Property Portals
  'idealista.com',
  'fotocasa.es',
  'pisos.com',
  'habitaclia.com',
  'yaencontre.com',
  'tucasa.com',
  'properati.es',
  'enalquiler.com',
  
  // International Property Portal Networks
  'kyero.com',
  'propertyguides.com',
  'spanishpropertychoice.com',
  'aplaceinthesun.com',
  'spanishpropertyinsight.com',
  'spanishhomes.com',
  'thinkspain.com',
  'propertyshowrooms.com',
  'property-spain.com',
  'spanishvillas.com',
  
  // UK/International Portals
  'rightmove.co.uk',
  'zoopla.co.uk',
  'onthemarket.com',
  'primelocation.com',
  
  // Major International Real Estate Agencies
  're-max.es',
  're-max.com',
  'remax.com',
  'engel-voelkers.com',
  'engelvoelkers.com',
  'sothebysrealty.com',
  'christiesrealestate.com',
  'coldwellbanker.com',
  'century21.es',
  'century21.com',
  'kw.com',
  'kellerwilliams.com',
  
  // Regional Costa del Sol Competitors
  'marbella-hills.com',
  'terra-meridiana.com',
  'gilmar.es',
  'lucas-fox.com',
  'clearhomes.es',
  'viva-sothebys.com',
  'drumelia.com',
  'panorama.es',
  'mpvillareal.com',
  'luxuryrealestate.com',
  'bcpartners.es',
  
  // Other Regional Competitors
  'savills.es',
  'savills.com',
  'knightfrank.es',
  'knightfrank.com',
  'berkshirehathaway.es',
  
  // Additional Banned Competitor Domains (2025 Expansion)
  'spaansedroomhuizen.com',
  'realestate-space.com',
  'spaineasy.com',
  'investinspain.be',
  'youroverseashome.com',
  'amahomespain.com',
  'mdrluxuryhomes.com',
  'immoabroad.com',
  'casaaandecostablanca.nl',
  'wyndhamgrandcostadelsol.com',
  'benoitproperties.com',
  'cire-costadelsol.com',
  'costasunsets.com',
  'uwhuisinspanje.eu',
  'vakantiewoningkopen.nl',
  'mediterraneanhomes.eu',
  'panoramamarbella.com',
  'spanjespecials.com',
  'realista.com',
  'keyrealestates.com',
  'pasku.co',
  'privoimobiliare.com',
  'nardia.es',
  'nl.spotblue.com',
  'avidaestate.com',
  'mikenaumannimmobilien.com',
  'vivi-realestate.com',
  'pineapplehomesmalaga.com',
  'inmoinvestments.com',
  'tekce.com',
  'homerunmarbella.com',
  'c21gibraltar.com',
  'marbella-estates.com',
  'propertiesforsale.es',
  'casalobo.es',
  'hihomes.es',
  'imoinvestcostadelsol.com',
  'theagency-marbella.com',
  'dolanproperty.es',
  'fineandcountry.es',
  'spanskafastigheter.se',
  'realestatemijas.com',
  'higueron-valley.com',
  'portfolio-deluxe.com',
  'purelivingproperties.com',
  'directimo.com',
  'investropa.com',
  'springrealestate.com',
  'verdepropertygroup.com',
  'sunpropertiesmarbella.com',
];

/**
 * Check if a URL belongs to a competitor domain
 */
export function isCompetitor(url: string): boolean {
  const domain = extractDomain(url);
  return COMPETITOR_DOMAINS.some(competitor => 
    domain.includes(competitor) || competitor.includes(domain)
  );
}

/**
 * Extract clean domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Get reason why a URL is blocked as competitor
 */
export function getCompetitorReason(url: string): string {
  const domain = extractDomain(url);
  
  if (domain.includes('idealista') || domain.includes('fotocasa') || domain.includes('pisos.com')) {
    return 'Major property listing portal (direct competitor)';
  }
  if (domain.includes('kyero') || domain.includes('propertyguides')) {
    return 'International property portal (competitor)';
  }
  if (domain.includes('re-max') || domain.includes('remax') || 
      domain.includes('engel-voelkers') || domain.includes('engelvoelkers') ||
      domain.includes('sotheby') || domain.includes('century21')) {
    return 'Real estate agency network (competitor)';
  }
  if (domain.includes('marbella-hills') || domain.includes('gilmar') || 
      domain.includes('lucas-fox') || domain.includes('drumelia')) {
    return 'Regional Costa del Sol competitor';
  }
  
  return 'Real estate competitor';
}
