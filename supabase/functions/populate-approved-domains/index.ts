import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { APPROVED_DOMAINS, getDomainCategory } from '../shared/approvedDomains.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Trust score mapping based on category
const trustScoreMap: Record<string, number> = {
  // Government (Tier 1)
  'government_official': 98,
  'local_government': 95,
  'government_spain': 96,
  'government_netherlands': 96,
  'government_france': 96,
  'government_poland': 96,
  'government_sweden': 96,
  'government_denmark': 96,
  'government_hungary': 96,
  
  // Legal & Professional (Tier 1)
  'legal_professional': 90,
  'notary_associations': 88,
  'real_estate_professional': 85,
  
  // Financial (Tier 1-2)
  'banking': 92,
  'international_finance': 88,
  'mortgage_financial': 85,
  
  // Climate & Environment (Tier 2)
  'climate_weather': 80,
  'environmental': 78,
  
  // News Media (Tier 2-3)
  'news_media': 75,
  'international_news': 72,
  'regional_news_spain': 70,
  'regional_news_netherlands': 70,
  'regional_news_france': 70,
  
  // Education & Research (Tier 2)
  'education': 82,
  'statistical_research': 85,
  
  // Health (Tier 2)
  'health_official': 88,
  
  // Real Estate (Tier 2-3)
  'real_estate_portals': 68,
  'real_estate_data': 72,
  
  // Travel & Tourism (Tier 3)
  'travel_tourism': 65,
  'tourism_official': 75,
  
  // Utilities & Services (Tier 2-3)
  'utilities': 70,
  'transportation': 68,
  
  // Business & Economics (Tier 2)
  'business_economics': 75,
  'chamber_commerce': 78,
  
  // Culture & Lifestyle (Tier 3)
  'culture_lifestyle': 65,
  'expat_community': 62
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting approved domains population...');
    
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const [category, domains] of Object.entries(APPROVED_DOMAINS)) {
      const trustScore = trustScoreMap[category] || 65;
      const tier = trustScore >= 85 ? 'tier_1' : trustScore >= 70 ? 'tier_2' : 'tier_3';
      
      for (const domain of domains) {
        // Check if domain already exists
        const { data: existing } = await supabase
          .from('approved_domains')
          .select('id')
          .eq('domain', domain)
          .single();
        
        if (existing) {
          skippedCount++;
          continue;
        }
        
        const { error } = await supabase.from('approved_domains').insert({
          domain,
          trust_score: trustScore,
          category,
          tier,
          is_allowed: true,
          notes: `Auto-populated from approved domains list`
        });
        
        if (error) {
          console.error(`Error inserting ${domain}:`, error);
        } else {
          insertedCount++;
        }
      }
    }
    
    console.log(`✅ Population complete: ${insertedCount} inserted, ${skippedCount} skipped`);
    
    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        skipped: skippedCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error populating approved domains:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
