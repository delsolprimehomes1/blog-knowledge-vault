import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as fal from "npm:@fal-ai/serverless-client";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FalImage {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
}

interface FalResult {
  images: FalImage[];
}

// Location-specific visual markers for authentic photography
const locationVisualMarkers: Record<string, string[]> = {
  'Marbella': [
    'Puerto Banús marina visible in distance',
    'Golden Mile luxury architecture',
    'Sierra Blanca mountains in background',
    'La Concha mountain peak visible',
    'exclusive gated community aesthetic',
    'high-end contemporary design',
    'palm-lined promenade',
    'Marbella Club Hotel style architecture'
  ],
  'Estepona': [
    'traditional whitewashed pueblo architecture',
    'flower-pot lined cobblestone streets',
    'colorful murals on white walls',
    'family-friendly beachfront promenade',
    'charming old town character',
    'Plaza de las Flores atmosphere',
    'traditional Andalusian balconies',
    'coastal walkway with palm trees'
  ],
  'Málaga': [
    'Málaga Cathedral visible in cityscape',
    'historic port and modern marina',
    'urban coastal architecture',
    'Gibralfaro Castle on hilltop',
    'contemporary city center buildings',
    'Plaza de la Merced atmosphere',
    'modern art district vibes',
    'cosmopolitan Mediterranean urban setting'
  ],
  'Mijas': [
    'hillside pueblo blanco architecture',
    'mountain village atmosphere',
    'panoramic coastal views from elevation',
    'traditional whitewashed village streets',
    'Sierra de Mijas mountain backdrop',
    'rural mountain setting with sea views',
    'authentic Andalusian mountain character',
    'terraced hillside development'
  ],
  'Benalmádena': [
    'marina with luxury yachts and boats',
    'modern waterfront architecture',
    'family resort atmosphere',
    'Tivoli World entertainment nearby',
    'Benalmádena Pueblo traditional quarter',
    'cable car to Calamorro mountain visible',
    'beachfront entertainment district',
    'contemporary coastal residential towers'
  ],
  'Costa del Sol': [
    'Mediterranean coastal architecture',
    'Sierra de Mijas mountains in distance',
    'golden beaches with blue flag status',
    'typical Andalusian white architecture',
    'subtropical Mediterranean vegetation',
    'coastal promenade with palm trees',
    'terraced hillside properties',
    'year-round sunshine aesthetic'
  ]
};

// Photorealism enforcement layer
const photoRealismSuffix = `
PHOTOGRAPHIC REQUIREMENTS - MANDATORY:
- Shot on location in Costa del Sol, Spain
- Real architectural photography style, NOT AI-generated render
- Natural lighting from actual Mediterranean sun
- Documentary realism with authentic imperfections
- Actual existing property or location, NOT conceptual visualization
- Professional real estate listing photography quality
- Geographic authenticity: MUST show recognizable Costa del Sol elements
- Camera details: shot with Canon EOS R5, 24-70mm lens, f/4
- NO generic AI-generated features or perfect symmetry
- NO stock photo aesthetic or overly polished renders
- Include subtle environmental details: weathering, lived-in spaces, natural wear
- Authentic Spanish architectural details and local materials`;

// Helper function to infer property type from headline
const inferPropertyType = (headline: string): string => {
  const text = headline.toLowerCase();
  if (text.includes('villa')) return 'luxury Mediterranean villa';
  if (text.includes('apartment') || text.includes('flat')) return 'modern apartment';
  if (text.includes('penthouse')) return 'penthouse with terrace';
  if (text.includes('townhouse')) return 'townhouse';
  return 'luxury property';
};

// Helper function to detect article topic
const detectArticleTopic = (headline: string): string => {
  const text = headline.toLowerCase();
  
  // Eco/Sustainability articles (PRIORITY CHECK FIRST)
  if (text.match(/\b(eco|green|sustainable|sustainability|carbon neutral|solar|renewable|energy efficient|breeam|leed|environmental|climate|duurzaam|zonne|energie|milieu|groen|energie-effici[eë]nt)\b/)) {
    return 'eco-sustainability';
  }
  
  // Market analysis / trends / forecasts
  if (text.match(/\b(market|trends|forecast|outlook|analysis|statistics|data|report|2025|2026|predictions)\b/)) {
    return 'market-analysis';
  }
  
  // Digital nomads / remote work
  if (text.match(/\b(digital nomad|remote work|coworking|work from home|expat tech|freelance)\b/)) {
    return 'digital-nomad';
  }
  
  // Buying guides / how-to
  if (text.match(/\b(guide to|how to|step by step|buying guide|beginner|starter)\b/)) {
    return 'buying-guide';
  }
  
  // Legal/Process articles
  if (text.match(/\b(buy|buying|purchase|process|legal|documents?|nie|tax|fees?|cost|steps?)\b/)) {
    return 'process-legal';
  }
  
  // Comparison articles
  if (text.match(/\b(vs|versus|compare|comparison|best|choose|which|difference|beyond)\b/)) {
    return 'comparison';
  }
  
  // Investment articles
  if (text.match(/\b(invest|investment|roi|rental|yield|return|profit|market|portfolio|strategy)\b/)) {
    return 'investment';
  }
  
  // Lifestyle articles
  if (text.match(/\b(live|living|lifestyle|expat|retire|retirement|community|culture|quality of life)\b/)) {
    return 'lifestyle';
  }
  
  // Area/location guides
  if (text.match(/\b(guide|area|neighborhood|district|zone|where|location|hidden gem|discover)\b/)) {
    return 'location-guide';
  }
  
  // Property management / rental
  if (text.match(/\b(property management|tenant|vacation rental|maintenance|landlord)\b/)) {
    return 'property-management';
  }
  
  // Property type specific
  if (text.match(/\b(villa|apartment|penthouse|townhouse|second home)\b/)) {
    return 'property-showcase';
  }
  
  // Default
  return 'general-property';
};

// Helper function to infer location from headline with specific landmarks
const inferLocation = (headline: string): string => {
  const text = headline.toLowerCase();
  if (text.includes('golden mile')) return 'Marbella'; // Specific Marbella area
  if (text.includes('puerto ban') || text.includes('puerto banus')) return 'Marbella';
  if (text.includes('marbella')) return 'Marbella';
  if (text.includes('old town') && text.includes('estepona')) return 'Estepona';
  if (text.includes('estepona')) return 'Estepona';
  if (text.includes('city center') && (text.includes('malaga') || text.includes('málaga'))) return 'Málaga';
  if (text.includes('malaga') || text.includes('málaga')) return 'Málaga';
  if (text.includes('mijas')) return 'Mijas';
  if (text.includes('benalmádena') || text.includes('benalmadena')) return 'Benalmádena';
  return 'Costa del Sol';
};

// Get location-specific visual markers
const getLocationMarkers = (location: string, seed: number): string => {
  const markers = locationVisualMarkers[location] || locationVisualMarkers['Costa del Sol'];
  // Select 2-3 markers for variety without overwhelming the prompt
  const selectedMarkers = [
    markers[seed % markers.length],
    markers[(seed + 1) % markers.length]
  ];
  return selectedMarkers.join(', ');
};

// Validate headline-to-image matching requirements
const extractHeadlineRequirements = (headline: string): {
  hasSolar: boolean;
  hasEco: boolean;
  propertyType: string | null;
  location: string;
  specificFeature: string | null;
} => {
  const text = headline.toLowerCase();
  
  return {
    hasSolar: text.includes('solar'),
    hasEco: text.match(/\b(eco|green|sustainable|energy-efficient|passive|breeam)\b/) !== null,
    propertyType: text.match(/\b(villa|apartment|penthouse|townhouse)\b/)?.[0] || null,
    location: inferLocation(headline),
    specificFeature: text.match(/\b(rooftop|terrace|facade|panel|garden|certification)\b/)?.[0] || null
  };
};

// Generate contextual image prompt based on article topic with location authenticity
const generateContextualImagePrompt = (
  headline: string,
  topic: string,
  propertyType: string,
  location: string
): string => {
  
  // Extract headline requirements for validation
  const requirements = extractHeadlineRequirements(headline);
  
  // Get location-specific visual markers
  const uniqueSeed = headline.length;
  const locationMarkers = getLocationMarkers(location, uniqueSeed);
  
  // Time variety using photography terminology
  const lightingConditions = [
    'morning golden hour at 8am, soft directional light',
    'midday Mediterranean sun at noon, bright even illumination',
    'late afternoon at 5pm, warm amber tones',
    'blue hour at dusk, twilight ambience'
  ];
  const lighting = lightingConditions[uniqueSeed % lightingConditions.length];
  
  // Architectural style variety with specific regional context
  const archStyles = [
    'modern minimalist with clean lines',
    'traditional Andalusian Mediterranean',
    'contemporary coastal modernist',
    'classic Costa del Sol style'
  ];
  const archStyle = archStyles[uniqueSeed % archStyles.length];
  
  // Eco/Sustainability articles - MUST show actual eco-features
  if (topic === 'eco-sustainability') {
    const ecoOptions = [
      `CLOSE-UP: Solar panels prominently installed on ${propertyType} rooftop in ${location}, Costa del Sol. ${archStyle} architecture beneath, blue photovoltaic array clearly visible with individual cells, ${locationMarkers} visible in background, ${lighting}. Documentary real estate photography showing sustainability features. ${photoRealismSuffix}`,
      
      `ARCHITECTURAL DETAIL: Vertical green wall with lush Mediterranean plants on ${propertyType} facade in ${location}. Living wall system with native species, modern eco-architecture, ${locationMarkers}, ${lighting}. Shot with architectural photography approach, natural climate control visible. ${photoRealismSuffix}`,
      
      `WIDE SHOT: Energy-efficient passive house ${propertyType} in ${location} with floor-to-ceiling south-facing windows. ${archStyle} design with visible thermal mass walls, solar orientation evident, ${locationMarkers}, ${lighting}. Professional energy-efficient home photography. ${photoRealismSuffix}`,
      
      `PROPERTY FEATURE: Electric vehicle charging station at modern sustainable development in ${location}. EV charger with sleek design, solar canopy visible overhead, ${propertyType} in background, ${locationMarkers}, ${lighting}. Real estate listing showing green infrastructure. ${photoRealismSuffix}`,
      
      `CERTIFICATION SHOWCASE: BREEAM certification plaque mounted on ${archStyle} ${propertyType} in ${location}. Official green building certificate clearly visible, contemporary facade, ${locationMarkers}, ${lighting}. Documentary photography of eco-credentials. ${photoRealismSuffix}`,
      
      `INTERIOR TECH: Smart home energy dashboard on wall in ${location} ${propertyType}. Digital display showing real-time solar production graphs, battery storage levels, energy consumption data, ${archStyle} interior, ${lighting}. Home automation photography for sustainability. ${photoRealismSuffix}`
    ];
    
    // If headline specifically mentions solar, ALWAYS use solar image
    if (requirements.hasSolar) {
      return ecoOptions[0]; // Force solar panel image
    }
    
    return ecoOptions[uniqueSeed % ecoOptions.length];
  }
  
  // Market analysis articles - MUST show business/data scenes
  if (topic === 'market-analysis') {
    return `BUSINESS SCENE: Real estate market analysis meeting in modern ${location} office. Professional analysts reviewing market data on large displays, graphs and statistics visible, ${locationMarkers} visible through floor-to-ceiling windows, contemporary workspace with laptops, ${lighting}. Corporate real estate photography, focus on DATA and BUSINESS analysis, NOT properties. Shot in actual Costa del Sol business environment. ${photoRealismSuffix}`;
  }
  
  // Digital nomad articles - MUST show work lifestyle
  if (topic === 'digital-nomad') {
    return `COWORKING LIFESTYLE: Remote workers in bright coworking space in ${location}, Costa del Sol. Young professionals at laptops with coffee, minimalist Scandinavian design, ${locationMarkers} visible from windows, natural plants, collaborative atmosphere, ${lighting}. Documentary photography of digital nomad lifestyle, focus on WORK environment NOT luxury properties. ${photoRealismSuffix}`;
  }
  
  // Lifestyle articles - MUST show people and culture
  if (topic === 'lifestyle') {
    return `LIFESTYLE DOCUMENTARY: International expats enjoying authentic Mediterranean life in ${location}. Outdoor market scene with local vendors, café culture, palm trees, ${locationMarkers}, community interaction, ${lighting}. Candid documentary style photography, focus on PEOPLE and LOCAL CULTURE, NO properties visible. Real Costa del Sol daily life. ${photoRealismSuffix}`;
  }
  
  // Location guide articles - MUST show area overview
  if (topic === 'location-guide') {
    return `AERIAL ESTABLISHING SHOT: Drone photography of ${location}, Costa del Sol from 200 meters elevation. Panoramic view showing town character and layout, ${locationMarkers}, Mediterranean coastline and beaches, Sierra de Mijas mountains in background, urban planning visible, ${lighting}. Wide establishing shot of the AREA, NOT focusing on individual properties. Professional aerial real estate photography. ${photoRealismSuffix}`;
  }
  
  // Comparison articles
  if (topic === 'comparison') {
    return `COMPARISON VISUAL: Split composition contrasting two Costa del Sol locations. ${location} characteristics on one side, ${locationMarkers} visible, beach town atmosphere vs mountain setting, different architectural styles, ${lighting}. Clean comparative photography showing LOCATION differences, NOT interior property details. ${photoRealismSuffix}`;
  }
  
  // Buying guide articles - MUST show viewing process
  if (topic === 'buying-guide') {
    return `PROPERTY VIEWING: Real estate agent conducting property tour in ${location}. International buyers examining ${archStyle} ${propertyType}, viewing interior spaces, ${locationMarkers} visible through windows, professional consultation in progress, ${lighting}. Documentary real estate photography showing REAL viewing experience, NOT perfectly staged interiors. ${photoRealismSuffix}`;
  }
  
  // Legal/process articles - MUST show legal process
  if (topic === 'process-legal') {
    return `LEGAL CONSULTATION: Professional property lawyer meeting with international clients in ${location} law office. Costa del Sol real estate contracts and legal documents on desk, NIE paperwork visible, professional office setting, ${lighting}. Trust and expertise conveyed, focus on LEGAL PROCESS not properties. Corporate legal photography. ${photoRealismSuffix}`;
  }
  
  // Investment articles - MUST show rental potential
  if (topic === 'investment') {
    return `INVESTMENT PROPERTY: High-yield rental ${propertyType} in ${location} showing rental appeal. ${archStyle} design with professional staging, modern furnishings, rental-ready condition, ${locationMarkers} visible, ${lighting}. Real estate investment photography, focus on RENTAL FEATURES like modern kitchen, multiple bedrooms, NOT just infinity pools. ${photoRealismSuffix}`;
  }
  
  // Property management - MUST show service aspect
  if (topic === 'property-management') {
    return `PROPERTY MANAGEMENT: Professional property manager conducting inspection of ${propertyType} in ${location}. Manager with maintenance checklist, examining property condition, ${locationMarkers} visible, ${lighting}. Service-focused photography showing property MANAGEMENT activities, NOT luxury glamour shots. ${photoRealismSuffix}`;
  }
  
  // Property showcase - MUST show interior spaces
  if (topic === 'property-showcase') {
    return `INTERIOR SHOWCASE: ${archStyle} ${propertyType} interior walkthrough in ${location}. Multiple living spaces visible: spacious living room, modern kitchen, master bedroom suite, ${locationMarkers} visible through windows, ${lighting}. Professional interior real estate photography, focus on LIVING SPACES not just exterior pools. ${photoRealismSuffix}`;
  }
  
  // Default: varied general property imagery with location authenticity
  const defaultVariations = [
    `INTERIOR LIVING SPACE: ${archStyle} ${propertyType} living room in ${location}, Costa del Sol. Spacious interior with natural light, contemporary furnishings, high-end finishes, ${locationMarkers} visible through terrace doors, ${lighting}. Professional real estate listing photography, focus on INTERIOR LIVING SPACES. ${photoRealismSuffix}`,
    
    `COASTAL LIFESTYLE: Beach promenade scene in ${location}, Costa del Sol. People walking along palm-lined walkway, ${locationMarkers}, Mediterranean sea, outdoor café culture, ${lighting}. Lifestyle documentary photography, NO luxury properties visible. ${photoRealismSuffix}`,
    
    `TOWN CHARACTER: ${location} town center showing authentic local atmosphere. Charming Mediterranean plaza with traditional architecture, ${locationMarkers}, outdoor dining, local community, ${lighting}. Documentary town photography, NO villa exteriors. ${photoRealismSuffix}`
  ];
  return defaultVariations[uniqueSeed % defaultVariations.length];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, headline, imageUrl } = await req.json();
    
    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

    // Trim and validate FAL_KEY to prevent ByteString errors
    const cleanedFalKey = falKey.trim().replace(/[\r\n]/g, '');
    if (!cleanedFalKey || cleanedFalKey.length < 10) {
      throw new Error('FAL_KEY appears to be invalid or corrupted');
    }

    console.log('============ FAL.ai Configuration ============');
    console.log('FAL_KEY exists:', !!falKey);
    console.log('FAL_KEY length:', cleanedFalKey.length);
    console.log('FAL_KEY first 10 chars:', cleanedFalKey.substring(0, 10) + '...');
    console.log('Prompt provided:', !!prompt);
    console.log('Headline provided:', !!headline);
    console.log('Image URL provided:', !!imageUrl);
    console.log('=============================================');

    fal.config({
      credentials: cleanedFalKey
    });

    // Generate contextual prompt based on headline if custom prompt not provided
    let finalPrompt: string;
    if (prompt) {
      // User provided custom prompt - use it directly
      finalPrompt = prompt;
      console.log('Using custom user prompt');
    } else if (headline) {
      // Generate contextual prompt based on article headline
      const propertyType = inferPropertyType(headline);
      const location = inferLocation(headline);
      const articleTopic = detectArticleTopic(headline);
      
      finalPrompt = generateContextualImagePrompt(
        headline,
        articleTopic,
        propertyType,
        location
      );
      
      console.log('Generated contextual prompt for topic:', articleTopic);
    } else {
      // Fallback if neither prompt nor headline provided
      finalPrompt = `Professional Costa del Sol real estate photography, Mediterranean architecture, bright natural lighting, ultra-realistic, 8k resolution, no text, no watermarks`;
      console.log('Using fallback prompt');
    }

    console.log('Final image prompt:', finalPrompt);

    // Create timeout promise helper
    const timeoutPromise = (ms: number) => new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - FAL.ai took longer than 60 seconds')), ms)
    );

    let result: FalResult;

    if (imageUrl) {
      // Editing mode - use nano-banana/edit with 60-second timeout
      console.log('Editing existing image:', imageUrl);
      result = await Promise.race([
        fal.subscribe("fal-ai/nano-banana/edit", {
          input: {
            prompt: finalPrompt,
            image_size: "landscape_16_9",
            num_images: 1,
            image_urls: [imageUrl]
          },
          logs: true,
        }) as Promise<FalResult>,
        timeoutPromise(60000)
      ]);
    } else {
      // Generation mode - use flux/dev with 60-second timeout
      console.log('Generating new image with contextual prompt');
      result = await Promise.race([
        fal.subscribe("fal-ai/flux/dev", {
          input: {
            prompt: finalPrompt,
            image_size: "landscape_16_9",
            num_inference_steps: 28,
            num_images: 1,
          },
          logs: true,
        }) as Promise<FalResult>,
        timeoutPromise(60000)
      ]);
    }

    return new Response(
      JSON.stringify({ 
        images: result.images,
        prompt: finalPrompt 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error generating images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate images';
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
