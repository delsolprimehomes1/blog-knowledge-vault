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

    // Auto-generate prompt from headline if not provided
    const finalPrompt = prompt || `Professional real estate photography: ${headline}. 
      Luxurious Costa del Sol property, Mediterranean architecture, 
      bright natural lighting, high-end interior design, 
      ultra-realistic, 8k resolution, architectural digest style`;

    console.log('Editing/generating images with prompt:', finalPrompt);

    const inputConfig: any = {
      prompt: finalPrompt,
      image_size: "landscape_16_9",
      num_images: 4,
      image_urls: imageUrl ? [imageUrl] : []
    };

    if (imageUrl) {
      console.log('Editing existing image:', imageUrl);
    } else {
      console.log('Generating new images from prompt');
    }

    const result = await fal.subscribe("fal-ai/nano-banana/edit", {
      input: inputConfig,
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
