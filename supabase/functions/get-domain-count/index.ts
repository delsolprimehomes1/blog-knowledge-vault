import { getAllApprovedDomains, APPROVED_DOMAINS } from '../shared/approvedDomains.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const allDomains = getAllApprovedDomains();
    const categories = Object.keys(APPROVED_DOMAINS);
    
    return new Response(
      JSON.stringify({
        count: allDomains.length,
        categories: categories.length,
        categoryBreakdown: Object.entries(APPROVED_DOMAINS).map(([name, domains]) => ({
          name,
          count: domains.length
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error getting domain count:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get domain count' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
