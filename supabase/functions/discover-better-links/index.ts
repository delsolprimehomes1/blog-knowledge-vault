import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isCompetitor, getCompetitorReason } from "../shared/competitorBlacklist.ts";
import { calculateAuthorityScore } from "../shared/authorityScoring.ts";
import { isApprovedDomain, getAllApprovedDomains } from "../shared/approvedDomains.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BetterLinkSuggestion {
  originalUrl: string;
  suggestedUrl: string;
  sourceName: string;
  relevanceScore: number;
  authorityScore: number;
  reason: string;
  language: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      originalUrl, 
      articleHeadline, 
      articleContent, 
      articleLanguage = 'en',
      context,
      citationContext, // NEW: Specific paragraph/sentence where citation appears
      mustBeApproved = false  // New parameter to filter only approved domains
    } = await req.json();

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    console.log(`Finding better alternatives for: ${originalUrl}`);
    if (citationContext) {
      console.log(`Citation context: "${citationContext.slice(0, 150)}..."`);
    }

    // Get ALL approved domains for comprehensive search
    const allApprovedDomains = getAllApprovedDomains();
    console.log(`🔍 Searching across ${allApprovedDomains.length} approved domains`);

    const languageConfig: Record<string, { name: string; domains: string[] }> = {
      en: { name: 'English', domains: ['.gov', '.gov.uk', '.edu'] },
      nl: { name: 'Dutch', domains: ['.nl', '.overheid.nl'] },
      de: { name: 'German', domains: ['.de', '.gov.de'] },
    };

    const config = languageConfig[articleLanguage] || languageConfig.en;

    const prompt = `You are finding HIGH-QUALITY replacement sources that specifically support a claim in an article.

**ARTICLE CONTEXT:**
Article Title: "${articleHeadline}"
Language: ${config.name}
Original URL to Replace: ${originalUrl}

${citationContext ? `
**🎯 SPECIFIC CLAIM THAT NEEDS SUPPORT:**
"${citationContext}"

This is the EXACT text from the article where the citation appears. Your task is to find sources that specifically support THIS CLAIM with evidence, data, or official information.
` : `
**General Context:**
${context || articleContent.substring(0, 800)}
`}

**YOUR TASK:**
Find 3-5 alternative sources that ${citationContext ? 'specifically support the claim above' : 'are highly relevant to the article topic'}.

**SEARCH APPROACH:**
✅ You have access to ${allApprovedDomains.length} approved domains - search across ALL of them
✅ Focus on finding sources that provide SPECIFIC evidence for the claim
✅ If the claim mentions statistics/data, find sources with that exact information
✅ If the claim mentions regulations/laws, find official government sources
✅ Prefer sources from the past 1-2 years (2023-2024)

**QUALITY REQUIREMENTS:**
✅ MUST directly support the specific claim with factual evidence
✅ MUST be from ${config.name} language sources or local domains (${config.domains.join(', ')})
✅ MUST be authoritative (government > official statistics > established news > industry associations)
✅ MUST be accessible and actively maintained
✅ Higher relevance to the specific claim = better

**CRITICAL RULES:**
❌ NEVER suggest property listing portals (Idealista, Kyero, Fotocasa, Pisos.com)
❌ NEVER suggest real estate agencies (RE/MAX, Engel & Völkers, Century21)
❌ NEVER suggest competitor real estate websites
❌ NEVER suggest paywalled or inaccessible content

**PRIORITIZE:**
1. 🏛️ Government/Official sources (.gov, .gob.es, .juntadeandalucia.es, boe.es)
2. 📊 Statistical authorities (ine.es, ecb.europa.eu, numbeo.com)
3. 📰 Established news (surinenglish.com, euroweeklynews.com, theolivepress.es)
4. ⚖️ Legal/Professional (registradores.org, notariado.org, legal services)
5. 🏢 Official tourism/trade organizations

Return ONLY a valid JSON array (no markdown, no explanations):
[
  {
    "suggestedUrl": "https://...",
    "sourceName": "Source Name",
    "relevanceScore": 92,
    "authorityScore": 9,
    "reason": "Specifically supports the claim by providing [exact evidence/data]. This source...",
    "language": "${articleLanguage}"
  }
]`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are an expert research assistant specializing in finding authoritative ${config.name}-language sources that specifically support claims with evidence. Focus on government, official statistics, and established news sources. Return ONLY valid JSON arrays - no markdown, no explanations.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Slightly higher for more creative source discovery
        max_tokens: 2500, // More tokens for deeper analysis
        search_recency_filter: 'year', // Expand to past year for better coverage
        // Note: search_domain_filter removed (max 20 domains) - we filter results after AI search
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Perplexity response:', aiResponse);

    let suggestions: BetterLinkSuggestion[] = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse suggestions:', parseError);
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('No alternative sources found');
    }

    // Filter out competitors
    console.log(`\n🔍 Filtering ${suggestions.length} suggestions for competitors...`);
    let filteredSuggestions = suggestions.filter(suggestion => {
      if (isCompetitor(suggestion.suggestedUrl)) {
        console.log(`❌ BLOCKED (Competitor): ${suggestion.suggestedUrl} - ${getCompetitorReason(suggestion.suggestedUrl)}`);
        return false;
      }
      console.log(`✅ Passed competitor check: ${suggestion.suggestedUrl}`);
      return true;
    });

    if (filteredSuggestions.length === 0) {
      throw new Error('All suggested sources were competitors. Please try different search terms.');
    }

    console.log(`✅ ${filteredSuggestions.length}/${suggestions.length} suggestions passed competitor filter`);

    // Additional filtering for approved domains if requested
    let warnings: string[] = [];
    let approvedCount = filteredSuggestions.length;
    
    if (mustBeApproved) {
      console.log(`\n🔍 Filtering for approved domains only...`);
      const approvedSuggestions = filteredSuggestions.filter(suggestion => {
        const approved = isApprovedDomain(suggestion.suggestedUrl);
        if (!approved) {
          console.log(`❌ Not approved: ${suggestion.suggestedUrl}`);
        } else {
          console.log(`✅ Approved: ${suggestion.suggestedUrl}`);
        }
        return approved;
      });

      if (approvedSuggestions.length === 0) {
        console.warn('⚠️ No approved domain alternatives found, showing all suggestions');
        warnings.push('None of the suggested sources are from your approved domain list. Please review carefully before using.');
      } else {
        console.log(`✅ ${approvedSuggestions.length}/${filteredSuggestions.length} suggestions from approved domains`);
        filteredSuggestions = approvedSuggestions;
        approvedCount = approvedSuggestions.length;
      }
    }

    // Score and sort by authority
    const scoredSuggestions = filteredSuggestions.map(suggestion => {
      const scores = calculateAuthorityScore({
        url: suggestion.suggestedUrl,
        sourceName: suggestion.sourceName,
        description: suggestion.reason,
        isAccessible: true
      });
      
      return {
        ...suggestion,
        authorityScore: scores.totalScore,
        authorityTier: scores.tier,
        authorityBreakdown: scores
      };
    });

    // Sort by authority score (highest first)
    scoredSuggestions.sort((a, b) => b.authorityScore - a.authorityScore);

    console.log(`\n📊 Top Suggestions by Authority:`);
    scoredSuggestions.slice(0, 3).forEach(s => {
      console.log(`   ${s.authorityScore}/100 (${s.authorityTier}) - ${s.sourceName}`);
    });
    console.log('');

    // Check if original URL is a PDF
    const isPdf = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        return urlObj.pathname.toLowerCase().endsWith('.pdf');
      } catch {
        return url.toLowerCase().endsWith('.pdf');
      }
    };

    const originalIsPdf = isPdf(originalUrl);
    
    if (originalIsPdf) {
      console.log('🔍 Original citation is a PDF - skipping verification for PDF suggestions');
    }

    // Verify suggested URLs are accessible with retry logic
    const verifyUrlWithRetry = async (url: string, retries = 2): Promise<{ verified: boolean; statusCode: number | null; verificationStatus: string; skipVerification?: boolean; error?: string }> => {
      // Skip verification for PDFs when original was also a PDF
      if (originalIsPdf && isPdf(url)) {
        console.log(`⏭️ Skipping verification for PDF: ${url}`);
        return {
          verified: false,
          statusCode: null,
          verificationStatus: 'unverified',
          skipVerification: true,
          error: 'PDF source - verification skipped',
        };
      }
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const verifyResponse = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; LinkValidator/1.0)'
            },
            signal: AbortSignal.timeout(15000) // Increased to 15s
          });
          
          const isAccessible = verifyResponse.ok || verifyResponse.status === 403;
          
          return {
            verified: isAccessible,
            statusCode: verifyResponse.status,
            verificationStatus: isAccessible ? 'verified' : 'failed',
          };
        } catch (error) {
          const isLastAttempt = attempt === retries;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // DNS or network errors should not block the suggestion
          if (errorMessage.includes('dns') || errorMessage.includes('DNS')) {
            console.warn(`⚠️ DNS lookup failed for ${url} (attempt ${attempt + 1}/${retries + 1})`);
            if (isLastAttempt) {
              return {
                verified: false,
                statusCode: null,
                verificationStatus: 'unverified',
                error: 'DNS lookup failed - URL may still be valid',
              };
            }
          } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
            console.warn(`⚠️ Timeout verifying ${url} (attempt ${attempt + 1}/${retries + 1})`);
            if (isLastAttempt) {
              return {
                verified: false,
                statusCode: null,
                verificationStatus: 'unverified',
                error: 'Request timeout - URL may be slow or blocked',
              };
            }
          } else {
            console.warn(`⚠️ Verification error for ${url}:`, errorMessage);
            if (isLastAttempt) {
              return {
                verified: false,
                statusCode: null,
                verificationStatus: 'failed',
                error: errorMessage,
              };
            }
          }
          
          // Wait before retry
          if (!isLastAttempt) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      return {
        verified: false,
        statusCode: null,
        verificationStatus: 'failed',
        error: 'All verification attempts failed',
      };
    };

    const verifiedSuggestions = await Promise.all(
      scoredSuggestions.map(async (suggestion) => {
        const verificationResult = await verifyUrlWithRetry(suggestion.suggestedUrl);
        
        return {
          ...suggestion,
          originalUrl,
          ...verificationResult,
        };
      })
    );

    // Sort by verification status, then authority and relevance
    verifiedSuggestions.sort((a, b) => {
      // Prioritize: verified > unverified > failed
      const statusOrder = { verified: 0, unverified: 1, failed: 2 };
      const aOrder = statusOrder[a.verificationStatus as keyof typeof statusOrder] ?? 2;
      const bOrder = statusOrder[b.verificationStatus as keyof typeof statusOrder] ?? 2;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.authorityScore + b.relevanceScore) - (a.authorityScore + a.relevanceScore);
    });

    console.log(`Found ${verifiedSuggestions.length} alternative sources`);
    console.log(`Verified: ${verifiedSuggestions.filter(s => s.verified).length}, Unverified: ${verifiedSuggestions.filter(s => s.verificationStatus === 'unverified').length}, Failed: ${verifiedSuggestions.filter(s => s.verificationStatus === 'failed').length}`);

    return new Response(
      JSON.stringify({
        originalUrl,
        suggestions: verifiedSuggestions,
        totalFound: verifiedSuggestions.length,
        verifiedCount: verifiedSuggestions.filter(s => s.verified).length,
        unverifiedCount: verifiedSuggestions.filter(s => s.verificationStatus === 'unverified').length,
        approvedCount: mustBeApproved ? approvedCount : verifiedSuggestions.length,
        warnings: warnings.length > 0 ? warnings : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in discover-better-links:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
