import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions from generate-image
function inferPropertyType(headline: string): string {
  const lower = headline.toLowerCase();
  
  if (lower.includes('villa') || lower.includes('detached')) return 'luxury Mediterranean villa';
  if (lower.includes('apartment') || lower.includes('flat')) return 'modern apartment';
  if (lower.includes('penthouse')) return 'penthouse';
  if (lower.includes('townhouse')) return 'townhouse';
  if (lower.includes('finca') || lower.includes('cortijo')) return 'traditional Andalusian finca';
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
    const { headline, articleContent, diagramType, language = 'en' } = await req.json();

    if (!headline || !diagramType) {
      throw new Error('Missing required parameters: headline and diagramType');
    }

    console.log('Generating diagram with language:', language);

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
    
    // Generate AI-powered metadata for SEO and accessibility
    const location = inferLocation(headline);
    const propertyType = inferPropertyType(headline);
    
    const languageInstruction = language !== 'en' ? ` IN ${language.toUpperCase()} LANGUAGE` : '';
    const metadataPrompt = `Given this article headline: "${headline}"
And this diagram type: "${diagramType}"
And this location context: "${location}"
And this property type: "${propertyType}"

Generate SEO-optimized metadata${languageInstruction} for the diagram image in JSON format:

1. ALT TEXT (50-125 characters): Brief, keyword-rich description for screen readers and SEO
   - Include: diagram type, topic, location
   - Example: "Flowchart showing property buying steps in Marbella Costa del Sol"

2. CAPTION (20-80 characters): Short, engaging user-facing label
   - Example: "Your Step-by-Step Buying Guide"

3. DESCRIPTION (150-250 words): Detailed explanation for AI/LLM understanding and accessibility
   - Explain what the diagram shows in detail
   - Mention key steps/elements
   - Include location and property context
   - Optimize for voice assistants and AI readers
   - Make it comprehensive for vision-impaired users

Return ONLY valid JSON in this exact format:
{
  "altText": "...",
  "caption": "...",
  "description": "..."
}`;

    try {
      const metadataResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
          {
            role: "system",
            content: `You are an SEO and accessibility expert. Generate concise, keyword-rich metadata for real estate diagrams${languageInstruction}. Return valid JSON only, no markdown or extra text.`
          },
            {
              role: "user",
              content: metadataPrompt
            }
          ]
        })
      });

      if (!metadataResponse.ok) {
        console.error('Metadata generation failed:', metadataResponse.status);
        throw new Error('Failed to generate metadata');
      }

      const metadataData = await metadataResponse.json();
      const metadataContent = metadataData.choices[0].message.content;
      
      // Clean up the response - remove markdown code blocks if present
      const cleanedContent = metadataContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const metadata = JSON.parse(cleanedContent);

      console.log('Metadata generated successfully:', metadata);

      return new Response(
        JSON.stringify({
          imageUrl: imageUrl,
          altText: metadata.altText,
          caption: metadata.caption,
          description: metadata.description,
          prompt: prompt
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } catch (metadataError) {
      console.error('Error generating metadata:', metadataError);
      
      // Fallback to basic metadata if AI generation fails
      let fallbackDescription = '';
      switch (diagramType) {
        case 'flowchart':
          fallbackDescription = `Flowchart diagram illustrating the process discussed in this article about ${location} real estate`;
          break;
        case 'timeline':
          fallbackDescription = `Timeline infographic showing the sequence of events related to ${location} property market`;
          break;
        case 'comparison':
          fallbackDescription = `Comparison diagram contrasting different aspects discussed in this ${location} real estate article`;
          break;
        default:
          fallbackDescription = `Infographic diagram for ${headline}`;
      }

      return new Response(
        JSON.stringify({
          imageUrl: imageUrl,
          altText: `${diagramType} diagram for ${location} real estate`,
          caption: `Visual guide for ${location} property`,
          description: fallbackDescription,
          prompt: prompt
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

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
