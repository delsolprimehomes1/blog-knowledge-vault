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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, headline } = await req.json();
    
    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

    fal.config({
      credentials: falKey
    });

    // Auto-generate prompt from headline if not provided
    const finalPrompt = prompt || `Professional real estate photography: ${headline}. 
      Luxurious Costa del Sol property, Mediterranean architecture, 
      bright natural lighting, high-end interior design, 
      ultra-realistic, 8k resolution, architectural digest style`;

    console.log('Generating images with prompt:', finalPrompt);

    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: finalPrompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        num_images: 4,
      },
      logs: true,
    }) as FalResult;

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
