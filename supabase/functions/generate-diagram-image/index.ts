import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions from generate-image
function inferPropertyType(headline: string): string {
  const lower = headline.toLowerCase();
  
  if (lower.includes('villa') || lower.includes('detached')) return 'luxury Spanish villa';
  if (lower.includes('apartment') || lower.includes('flat')) return 'modern apartment';
  if (lower.includes('penthouse')) return 'penthouse';
  if (lower.includes('townhouse')) return 'townhouse';
  if (lower.includes('finca') || lower.includes('cortijo')) return 'traditional Spanish finca';
  if (lower.includes('golf')) return 'golf property';
  if (lower.includes('beachfront') || lower.includes('beach')) return 'beachfront property';
  
  return 'Costa del Sol property';
}

function detectArticleTopic(headline: string): string {
  const lower = headline.toLowerCase();
  
  if (lower.includes('market') || lower.includes('price') || lower.includes('trends')) return 'market-analysis';
  if (lower.includes('digital nomad') || lower.includes('remote work')) return 'digital-nomad';
  if (lower.includes('guide') || lower.includes('how to') || lower.includes('step')) return 'buying-guide';
  if (lower.includes('invest') || lower.includes('roi')) return 'investment';
  if (lower.includes('tax') || lower.includes('legal')) return 'legal-finance';
  if (lower.includes('lifestyle') || lower.includes('living')) return 'lifestyle';
  if (lower.includes('vs') || lower.includes('compare')) return 'comparison';
  
  return 'general';
}

function inferLocation(headline: string): string {
  const lower = headline.toLowerCase();
  
  const locations = [
    'Marbella', 'Estepona', 'Málaga', 'Benalmádena', 'Fuengirola',
    'Mijas', 'Torremolinos', 'Nerja', 'Sotogrande', 'Puerto Banús',
    'La Cala', 'Calahonda', 'Manilva', 'Casares'
  ];
  
  for (const location of locations) {
    if (lower.includes(location.toLowerCase())) {
      return location;
    }
  }
  
  return 'Costa del Sol';
}

function generateDiagramPrompt(
  headline: string,
  diagramType: 'flowchart' | 'timeline' | 'comparison'
): string {
  const propertyType = inferPropertyType(headline);
  const location = inferLocation(headline);
  const topic = detectArticleTopic(headline);

  const baseTheme = `Costa del Sol real estate context, professional minimalist design, Mediterranean color palette (navy blue, gold, cream white), 8k ultra high resolution, vector-style infographic, clean modern aesthetic, no text overlays or labels`;

  let specificPrompt = '';

  switch (diagramType) {
    case 'flowchart':
      if (topic === 'buying-guide' || topic === 'legal-finance') {
        specificPrompt = `Professional infographic flowchart illustrating property purchase process steps, clean modern design with elegant icons and directional arrows, step-by-step visual flow for ${propertyType} in ${location}, clear progression indicators, ${baseTheme}`;
      } else if (topic === 'investment') {
        specificPrompt = `Elegant flowchart infographic showing investment decision process for ${propertyType}, modern icons representing financial analysis steps, clear directional flow, ${location} property market, ${baseTheme}`;
      } else {
        specificPrompt = `Professional process flowchart infographic for ${headline.slice(0, 80)}, clean modern design with intuitive icons and arrows, ${location} real estate, ${baseTheme}`;
      }
      break;

    case 'timeline':
      if (topic === 'market-analysis') {
        specificPrompt = `Elegant horizontal timeline infographic showing market evolution for ${propertyType} in ${location}, milestone markers with icons, chronological progression clearly indicated, modern clean design, ${baseTheme}`;
      } else if (topic === 'buying-guide') {
        specificPrompt = `Clean timeline infographic displaying property buying journey phases in ${location}, horizontal layout with milestone markers, ${propertyType} purchase process, modern professional style, ${baseTheme}`;
      } else {
        specificPrompt = `Professional horizontal timeline infographic for ${headline.slice(0, 80)}, milestone markers with elegant icons, ${location}, ${baseTheme}`;
      }
      break;

    case 'comparison':
      if (headline.toLowerCase().includes('vs')) {
        const parts = headline.split(/vs|versus/i);
        specificPrompt = `Clean side-by-side comparison infographic contrasting ${parts[0]?.trim() || 'options'} versus ${parts[1]?.trim() || 'alternatives'}, two-column symmetric layout, clear visual differentiation, modern professional design, ${location} real estate, ${baseTheme}`;
      } else {
        specificPrompt = `Professional comparison infographic showing different aspects of ${propertyType} in ${location}, balanced two-column layout, clear visual contrast, modern design, ${baseTheme}`;
      }
      break;
  }

  return specificPrompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { headline, articleContent, diagramType } = await req.json();

    if (!headline || !diagramType) {
      throw new Error('Missing required parameters: headline and diagramType');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating diagram:', { headline, diagramType });

    const prompt = generateDiagramPrompt(headline, diagramType as 'flowchart' | 'timeline' | 'comparison');
    console.log('Generated prompt:', prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    console.log('Image generated successfully');
    
    // Generate description based on diagram type
    let description = '';
    const location = inferLocation(headline);
    
    switch (diagramType) {
      case 'flowchart':
        description = `Flowchart diagram illustrating the process discussed in this article about ${location} real estate`;
        break;
      case 'timeline':
        description = `Timeline infographic showing the sequence of events related to ${location} property market`;
        break;
      case 'comparison':
        description = `Comparison diagram contrasting different aspects discussed in this ${location} real estate article`;
        break;
      default:
        description = `Infographic diagram for ${headline}`;
    }

    return new Response(
      JSON.stringify({
        imageUrl: imageUrl,
        description: description,
        prompt: prompt
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating diagram:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
