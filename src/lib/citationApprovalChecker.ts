/**
 * Citation Approval Checker
 * Utilities for checking if citations are from approved domains
 */

import { supabase } from "@/integrations/supabase/client";

// Approved domains list (mirrors supabase/functions/shared/approvedDomains.ts)
const APPROVED_DOMAINS = {
  climate_weather: [
    'aemet.es',
    'andalucia.org/actividades-y-atracciones/playas/costa-del-sol',
    'climasyviajes.com',
    'climatestotravel.com',
    'es.weatherspark.com',
    'juntadeandalucia.es/medioambiente/portal/areas-tematicas/espacios-protegidos/legislacion-autonomica-nacional/parques-naturales/parque-natural-los-alcornocales',
    'juntadeandalucia.es/medioambiente/portal/areas-tematicas/espacios-protegidos/legislacion-autonomica-nacional/parques-naturales/parque-natural-sierra-de-las-nieves',
    'juntadeandalucia.es/medioambiente/portal/landing-page-planificacion',
    'malaga.es/es/laprovincia/localizacion',
    'ncdc.noaa.gov',
    'uma.es/centrointernacionaldeespanol/info/118991/clima-en-malaga',
    'weather-and-climate.com',
    'weatherspark.com',
    'wikipedia.org',
    'wmo.int'
  ],
  government_official: [
    'aeat.es', 'administracion.gob.es', 'agenciatributaria.es', 'boe.es', 'catastro.gob.es', 'cnmc.es', 'datos.gob.es',
    'dfa.ie', 'dgt.es', 'e-justice.europa.eu', 'estadisticasdecriminalidad.ses.mir.es', 'exteriores.gob.es',
    'extranjeria.administracionespublicas.gob.es', 'gov.ie', 'gov.uk', 'gov.uk/guidance/living-in-spain', 'guardiacivil.es',
    'hacienda.gob.es', 'inclusion.gob.es', 'ine.es', 'ine.es/dyngs/Prensa/IPV2T25.htm',
    'interior.gob.es/opencms/es/actividades-y-servicios/estadisticas/balances-e-informes', 'juntadeandalucia.es',
    'juntadeandalucia.es/organismos/saludyfamilias.html',
    'juntadeandalucia.es/organismos/turismoyandaluciaexterior/areas/registro-turismo/establecimientos-servicios/paginas/faq-viviendas-turismo.html',
    'lamoncloa.gob.es', 'miteco.gob.es', 'miteco.gob.es/es/ceneam/recursos/quien-es-quien/quien20.html', 'mitma.gob.es',
    'mjusticia.gob.es', 'mscbs.gob.es', 'policia.es', 'sede.administracion.gob.es', 'seg-social.es', 'turismoandaluz.com'
  ],
  local_government: [
    'benahavis.es', 'benalmadena.es', 'casares.es', 'dipucadiz.es', 'dipucordoba.es', 'dipusevilla.es', 'estepona.es',
    'fuengirola.es', 'malaga.es', 'malaga.eu', 'manilva.es', 'marbella.es', 'mijas.es', 'sanpedroalcantara.es',
    'sotogrande.es', 'torremolinos.es'
  ],
  banking: [
    'abanca.com', 'bancosantander.es', 'bancsabadell.com', 'bankinter.com', 'bbva.es', 'caixabank.es', 'cajarural.com',
    'cnmv.es', 'evobanco.com', 'ibercaja.es', 'ing.es', 'kutxabank.es', 'openbank.es', 'santander.com', 'unicajabanco.es'
  ],
  fintech: ['n26.com', 'revolut.com', 'wise.com', 'xe.com'],
  international_finance: [
    'ahe.es', 'bde.es', 'bolsamadrid.es', 'caa.co.uk', 'ecb.europa.eu', 'enerclub.es/el-sector/directorio-energetico-nacional',
    'euribor-rates.eu', 'finect.com', 'fred.stlouisfed.org', 'imf.org', 'numbeo.com', 'oecd.org/finance', 'rankia.com', 'worldbank.org'
  ],
  insurance: [
    'allianz.es', 'asisa.es', 'axa.es', 'caser.es', 'consorseguros.es', 'dkv.es', 'generali.es', 'libertyseguros.es',
    'lineadirecta.com', 'mapfre.es', 'mutua.es', 'ocaso.es', 'race.es', 'racc.es', 'sanitalucia.es', 'sanitas.es',
    'segurcaixaadeslas.es', 'unespa.es', 'zurich.es'
  ],
  healthcare: [
    'andalucia.com', 'cdc.gov/travel', 'citizensinformation.ie', 'cofaes.es', 'doctoralia.es', 'fundacionmapfre.org',
    'helicopterossanitarios.com', 'hospiten.com', 'juntadeandalucia.es', 'mayoclinic.org', 'medimar.com', 'nhs.uk',
    'panoramamarbella.com', 'quironsalud.es', 'saludsinbulos.com', 'sanitas.com', 'sspa.juntadeandalucia.es', 'vithas.es',
    'webmd.com', 'who.int'
  ],
  tourism_culture: [
    'aena.es', 'airbnb.com', 'amoureux-du-monde.com/en/europe-en/spain/one-week-itinerary-for-a-road-trip-in-andalusia',
    'andalucia.com', 'andalucia.org', 'andalucia.org/en/costa-del-sol', 'andalucia.org/en/provincia-malaga',
    'andalucia.org/en/routes', 'andaluciaexperiencetours.com/blog', 'aqualand.es', 'bbqboy.net/tag/costa-del-sol',
    'bbqboy.net/the-best-places-to-visit-on-spains-costa-del-sol', 'bioparcfuengirola.es',
    'blog.tourtailors.com/off-the-beaten-path-in-costa-del-sol', 'blog.visitcostadelsol.com', 'castillomonumentocolomares.com',
    'charlotteplansatrip.com/en/spain/andalusia', 'clickandgo.com/blog/2023/12/28/the-ultimate-guide-to-costa-del-sol',
    'cntraveler.com/destinations/andalusia', 'cuevadenerja.es', 'dancingtheearth.com/the-ultimate-road-trip-itinerary-in-andalusia',
    'danasdolcevita.com/category/spain', 'danasdolcevita.com/spains-costa-del-sol', 'earthtrekkers.com/andalusia-spain-itinerary',
    'europasur.es', 'expatica.com/es/lifestyle/travel/visiting-andalucia-105451',
    'expatica.com/es/living/location/moving-to-the-costa-del-sol-70909', 'festivaldemalaga.com',
    'gabriellaviola.com/post/best-places-to-visit-in-andalusia-spain', 'goaskalocal.com/blog/travel-guide-to-andalusia-spain',
    'guidetomalaga.com', 'handluggageonly.co.uk/2018/07/01/12-best-places-to-visit-in-andalucia-spain',
    'independent.co.uk/travel/europe/spain/andalusia', 'kimkim.com/d/spain/andalucia', 'lonelyplanet.com/spain/andalusia',
    'malaga.com', 'malagaturismo.com', 'malagatravelguide.net', 'mappingspain.com', 'mariposariodebenalmadena.com',
    'museosdemalaga.com', 'my-luxurytravel.fr/en/blog/what-to-do-in-andalusia',
    'mylittleworldoftravelling.com/costa-del-sol-travel-guide', 'nerja-turismo.com', 'nerjatoday.com',
    'oliverstravels.com/blog/costa-del-sol-guide', 'onthegotours.com/Spain/Andalucia',
    'petitesuitcase.com/southern-spain-itinerary', 'rebeccaandtheworld.com/andalucia-southern-spain-itinerary', 'rmcr.org',
    'rossiwrites.com/spain/costa-del-sol', 'roughguides.com/spain/andalusia',
    'runningtotravel.wordpress.com/2024/08/23/visiting-southern-spain-costa-del-sol-an-overview', 'rutasdelsol.es',
    'selwomarina.es', 'snapsbyfox.com/blog/one-week-in-andalusia-travel-guide', 'spain-holiday.com', 'spain.info',
    'spain.info/en', 'spainmadesimple.com/costa-del-sol', 'spainonfoot.com', 'spaintraveller.com/en/tag/costa-del-sol',
    'spainvisa.eu', 'stupabenalmadena.org', 'telegraph.co.uk/travel/destinations/europe/spain/andalusia',
    'theculturetrip.com/europe/spain/articles/the-best-things-to-do-on-the-costa-del-sol',
    'theplanetd.com/things-to-do-in-andalusia-spain', 'theprofessionalhobo.com/costa-del-sol-spain-better-worse-pictures',
    'thewanderlustwithin.com/things-to-do-in-andalucia', 'tourtailors.com/blog/off-the-beaten-path-in-costa-del-sol',
    'traverse-blog.com/1-week-andalucia-itinerary', 'travelinmad.com/spain-travel-guide',
    'travelynnfamily.com/andalucia-with-kids', 'tripadvisor.com/Tourism-g187435-Andalucia-Vacations.html',
    'turismo.benalmadena.es', 'turismo.estepona.es', 'turismo.fuengirola.es', 'turismo.malaga.eu',
    'vamospanish.com/discover/costa-del-sol-itinerary-for-first-timers-guide', 'visit-andalucia.com', 'visitcostadelsol.com',
    'whereangiewanders.com/things-to-do-in-costa-del-sol-spain', 'whereismyspain.com', 'worldtravelguide.net'
  ],
  travel_booking: [
    'alsa.es', 'blablacar.es', 'busbud.com', 'cabify.com', 'edreams.com', 'expedia.com', 'flixbus.es', 'kayak.com',
    'momondo.com', 'omio.com', 'raileurope.com', 'rome2rio.com', 'seat61.com/Spain.htm', 'skyscanner.net', 'thetrainline.com',
    'uber.com', 'viamichelin.com'
  ],
  transportation: [
    'aena.es', 'aerlingus.com', 'alsa.es', 'andalucia.com/travel/airport/malaga.htm', 'britishairways.com', 'easyjet.com',
    'iberia.com', 'imserso.es', 'jet2.com', 'lufthansa.com', 'malagaairport.eu', 'observatoriomovilidad.es',
    'otle.transportes.gob.es', 'renfe.com', 'ryanair.com', 'spainbycar.es', 'transportes.gob.es', 'tui.co.uk', 'vueling.com'
  ],
  car_rental: [
    'autoeurope.com', 'autoeurope.eu', 'avis.es', 'budget.es', 'cargest.com', 'centauro.net', 'discovercars.com',
    'doyouspain.com', 'economycarrentals.com', 'enterprise.es', 'espacar.com', 'europcar.com/en/stations/spain/malaga-airport',
    'europcar.es', 'fireflycarrental.com', 'goldcar.es', 'hellehollis.com', 'hertz.es', 'kayak.es/cars',
    'malagaairportcarhire.com', 'malagacar.com', 'marbesol.com', 'nizacars.es', 'recordrentacar.com', 'rentalcars.com',
    'sixt.com/car-rental/spain/malaga', 'sixt.es', 'skyscanner.es/alquiler-de-coches', 'solorentacar.com',
    'spain.info/en/transport-in-spain/by-road/car-rental'
  ],
  news_media: [
    '20minutos.es', 'abc.es', 'andalucesdiario.es', 'andaluciainformacion.es', 'andaluciatoday.com',
    'bbc.com/news/world/europe/spain', 'diariosur.es', 'diezminutos.es', 'elconfidencial.com', 'elconfidencialdigital.com',
    'elcorreo.com', 'elespanol.com', 'elfarodevigo.es', 'elmundo.es', 'elmundo.es/andalucia', 'elmundo.es/malaga',
    'elnortedecastilla.es', 'elpais.com', 'elpais.com/ccaa/andalucia', 'elperiodico.com', 'elplural.com',
    'essentialmagazine.com', 'europapress.es', 'euroweeklynews.com', 'europasur.es', 'expansion.com', 'expatica.com',
    'eyeonspain.com', 'homeandlifestyle.es', 'huffingtonpost.es', 'ideal.es', 'inspain.news', 'investigacorrupcion.es',
    'lachispa.net', 'laprovincia.es', 'larioja.com', 'lavanguardia.com', 'lavozdegalicia.es', 'malagahoy.es',
    'nationalgeographic.com/spain', 'reuters.com/world/europe/spain', 'societymarbella.com', 'spainenglish.com',
    'spanishnewsdaily.com', 'spainenglishnewspaper.com', 'surinenglish.com', 'telegraph.co.uk/travel/destinations/europe/spain/andalusia',
    'thelocal.es', 'theolivepress.es', 'thespanisheye.com', 'thinkspain.com', 'typicallyspanish.co.uk', 'webexpressguide.com'
  ],
  legal_professional: [
    'abogacia.es', 'abogadoespanol.com', 'balms.es', 'blacktowerfm.com', 'boe.es', 'cec-spain.es', 'chambers.com', 'coe.int',
    'costaluzlawyers.es', 'curia.europa.eu', 'decuria.es', 'echr.coe.int', 'eur-lex.europa.eu',
    'europa.eu/youreurope/citizens/residence/index_en.htm', 'gvlaw.es', 'hg.org', 'icab.es', 'icamalaga.es', 'icj.org',
    'lawsociety.org.uk', 'legal500.com', 'legalservicesinspain.com', 'lexidy.com', 'lexife.es', 'lexology.com',
    'maelabogados.com', 'malagasolicitors.es', 'martinezechevarria.es', 'negociosabogados.com', 'nolo.com', 'notariado.org',
    'notariado.org/portal/compra-de-vivienda', 'nuevoleon.net', 'poderjudicial.es', 'registradores.org',
    'registradores.org/actualidad/portal-estadistico-registral/estadisticas-de-propiedad', 'spanishsolutions.net',
    'un.org/ruleoflaw', 'white-baos.com'
  ],
  education: [
    'alohacollege.com', 'baleario.com', 'bishopsmove.es/blog/schools-and-education-in-the-costa-del-sol-a-guide-for-expats',
    'britishcouncil.es', 'campusdelasol.uma.es', 'cit.es', 'colegioatalaya.com', 'eoimalaga.com', 'escuelaeuropea.es',
    'gogoespana.com/en/blog/the-spanish-education-system', 'ibo.org', 'ihmarbella.com', 'international-schools-database.com',
    'miuc.org', 'nabss.org', 'sis.ac', 'spaineasy.com/blog/spanish-school-system-expats-guide', 'spain.info',
    'stepsintospain.es/inside-spanish-schools-what-every-expat-parent-should-expect', 'udc.es', 'uma.es'
  ],
  nature_outdoor: [
    'actividadesmalaga.com', 'bicicletasdelsol.com', 'caminodelrey.info', 'coastalpath.net', 'cyclespain.net', 'diverland.es',
    'duomoturismo.com', 'komoot.com', 'malagacyclingclub.com', 'outdooractive.com', 'senderismomalaga.com', 'strava.com',
    'telefericobenalmadena.com', 'transandalus.com'
  ],
  gastronomy: [
    '15bodegas.com/es_en/blog/tempranillo-everything-you-need-to-know-about-spains-most-famous-wines', 'alorenademalaga.com',
    'atarazanasmarket.es', 'designerjourneys.com/blog/guide-best-food-wine-spain', 'devourtours.com/blog/guide-to-spanish-wine',
    'dopronda.es', 'eatandwalkabout.com/en/blog/art-enogastronomy-green-spain-tours', 'estilosdevidasaludable.sanidad.gob.es/en',
    'exclusivespain.es/gastronomy-and-wine', 'foodswinesfromspain.com', 'gastronomiamalaga.com', 'gerrydawesspain.com/2022/01',
    'homeandlifestyle.es/food-and-drink', 'lamelonera.com',
    'mediterraneanhomes.eu/en/blog/wine-in-spain-a-journey-through-history-culture-and-unforgettable-flavours', 'michelin.com',
    'rutasdelvino.es', 'sherry.wine', 'slowfoodmalaga.com', 'spain.info/en/gastronomy-wine-tourism',
    'spaininfo.com/en/top/healthy-food-spain', 'spainismore.com/blog/wine-and-gastronomy/northern-spain-gastronomy/61',
    'tasteatlas.com', 'tastingspain.es', 'vinomalaga.com', 'winetourismspain.com'
  ],
  lifestyle_wellness: [
    'bestschoolsinspain.com/en/well-being-and-lifestyle-in-spain-mediterranean-diet-and-sports',
    'blog.abacoadvisers.com/spanish-lifestyle-habits', 'homeandlifestyle.es/health-wellbeing',
    'investinspain.org/en/doing-business/living-in-spain',
    'mediterraneanhomes.eu/en/blog/embracing-the-mediterranean-lifestyle-living-la-vida-espa%C3%B1ola',
    'movetotraveling.com/living-a-healthy-and-active-lifestyle-on-the-costa-blanca-in-spain',
    'piccavey.com/healthy-living-in-spain', 'showmb.es/es/en/bloggers-healthy_lifestyle-spain',
    'spaineasy.com/blog/mediterranean-diet-spain', 'vanguard-student-housing.com/live-healthy-fun.html',
    'vibrantsoulful.com/post/what-im-learning-about-wellness-and-longevity-in-spain'
  ],
  sports_recreation: [
    'basic-fit.com', 'benahavispadelacademy.com', 'clubelcandado.com', 'clubpadelexterio.org', 'haciendadelalamo.com',
    'marbellaguide.com', 'padelenred.com', 'padelfederacion.es', 'padelclick.com', 'puenteromano.com',
    'reservadelhigueronresort.com', 'synergym.es', 'vivagym.es', 'worldpadeltour.com', 'yogaforlife.es', 'yogamarbella.com'
  ],
  expat_resources: [
    'britoninspain.com', 'expatarrivals.com', 'internations.org', 'renewspain.com', 'schengenvisainfo.com', 'spainexpat.com'
  ],
  telecom: ['masmovil.com', 'movistar.es', 'orange.es', 'vodafone.es'],
  home_furniture: [
    'bauhaus.es', 'becara.com', 'belladesign.es', 'boconcept.com/es-es', 'bricodepot.es', 'casashops.com/es/es',
    'conforama.es', 'decoist.com', 'decoora.com', 'elcorteingles.es/hogar', 'elmueble.com', 'gancedomuebles.es',
    'habitat.net/es', 'houzz.es', 'idealfurniture.es', 'ikea.com', 'kavehome.com/es', 'kettal.com', 'leroymerlin.es',
    'mabrideco.com', 'madaboutfurniture.com', 'maisonsdumonde.com/ES/es', 'micasarevista.com', 'mueblesboom.com',
    'portobellostreet.es', 'revistaad.es', 'roche-bobois.com/en-ES', 'vondom.com', 'westwingnow.es', 'zarahome.com'
  ],
  shopping: ['decathlon.es', 'elcorteingles.es', 'la-canada.com', 'miramarcc.com', 'plazamayor.es'],
  sustainability: [
    'aemer.org', 'agenciaandaluzadelaenergia.es', 'agenciaandaluzadelaenergia.es/encalificacion-energetica-de-edificios',
    'appa.es', 'benalmadena.es', 'climateportugal.com', 'clubdesostenibilidad.es', 'dirse.es', 'educasol.org',
    'energy.ec.europa.eu', 'energias-renovables.com/panorama/asociaciones-detras-de-las-energias-renovables-20160208',
    'es.greenpeace.org/es', 'fundacionrenovables.org', 'guiaongs.org/directorio/medio-ambiente',
    'icaen.gencat.cat/es/energia/renovables/enllacos-dassociacions-denergies-renovables',
    'idae.es/asociaciones-del-sector-de-ahorro-y-eficiencia-energetica', 'institutodesostenibilidad.es', 'malaga.eu',
    'programmemaBiosfera.es', 'reds-sdsn.es', 'renewableenergyworld.com', 'sostenibilidadyprogreso.org',
    'suelosolar.com/directorio/asociacion', 'thenergia.com', 'tierra.org', 'unef.es', 'vidasostenible.org', 'wwf.es'
  ],
  property_real_estate: [
    'administracion.gob.es/pag_Home/atencionCiudadana/compra-vivienda.html', 'boe.es/buscar/act.php?id=BOE-A-1994-26003',
    'boe.es/buscar/doc.php?id=BOE-A-1999-21567', 'breeam.es', 'cgate.es', 'codigotecnico.org',
    'comunidad.madrid/servicios/asuntos-sociales/cohousing',
    'consumoresponde.es/artículos/preguntas_frecuentes_sobre_alquiler_de_viviendas', 'gbce.es', 'jubilares.es'
  ],
  architecture_construction: [
    'archdaily.com/country/spain', 'arquitectura-sostenible.es', 'casadomo.com', 'cscae.com', 'idae.es', 'smartechcluster.org'
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
