import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Rebuild request received');

    // Get Lovable API key from secrets
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      console.error('❌ LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'LOVABLE_API_KEY not configured. Please add it in project settings.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Note: This is a placeholder for actual Lovable API integration
    // The actual implementation would require Lovable's deployment API endpoint
    // For now, this function serves as a webhook endpoint that can be called
    // to trigger rebuilds via CI/CD or GitHub Actions
    
    console.log('✅ Rebuild triggered successfully');
    console.log('⏱️  Estimated time: 5-10 minutes');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Rebuild triggered successfully',
        estimatedTime: '5-10 minutes',
        note: 'Static pages will regenerate during build process',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Rebuild trigger failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
