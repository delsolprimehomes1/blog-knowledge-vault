import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { filterBannedCitations, getBannedDomainsPrompt } from "../shared/citationFilter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId } = await req.json();
    console.log('Regenerating content for article:', articleId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch article metadata
    const { data: article, error: articleError } = await supabase
      .from('blog_articles')
      .select('headline, meta_description, category, funnel_stage, language, author_id, slug')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      throw new Error(`Article not found: ${articleError?.message}`);
    }

    // Fetch author
    const { data: author } = await supabase
      .from('authors')
      .select('name, experience_years, specializations')
      .eq('id', article.author_id)
      .single();

    // Fetch master prompt
    const { data: settings } = await supabase
      .from('content_settings')
      .select('master_content_prompt')
      .single();

    const masterPrompt = settings?.master_content_prompt || '';

    // Replace variables in master prompt
    const processedPrompt = masterPrompt
      .replace(/\[AUTHOR_NAME\]/g, author?.name || 'Hans Beeckman')
      .replace(/\[EXPERIENCE_YEARS\]/g, String(author?.experience_years || 15))
      .replace(/\[SPECIALIZATIONS\]/g, author?.specializations?.join(', ') || 'Costa del Sol property market')
      .replace(/\[CATEGORY\]/g, article.category || 'Real Estate')
      .replace(/\[FUNNEL_STAGE\]/g, article.funnel_stage || 'MOFU')
      .replace(/\[LANGUAGE\]/g, article.language || 'en');

    // Generate content with improved prompt structure
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are ${author?.name || 'Hans Beeckman'}, a property expert writing article content. Write actual article content, not instructions or acknowledgments.`
          },
          {
            role: 'user',
            content: `Write a complete, detailed article (1,500-2,500 words) for this topic:

HEADLINE: ${article.headline}
META DESCRIPTION: ${article.meta_description}

${processedPrompt}

${getBannedDomainsPrompt()}

CRITICAL INSTRUCTIONS:
- Write the FULL ARTICLE CONTENT immediately
- Start with the first H2 section, not with any meta-commentary
- Do NOT write "I understand" or "I will follow" - write the actual article
- Include multiple H2 sections with detailed paragraphs
- Target 1,500-2,500 words of actual content

FORMATTING REQUIREMENTS (HTML ONLY - NO MARKDOWN):
- Use <h2>, <h3> for headings (NOT ## or ###)
- Use <p> for paragraphs
- Use <ul> and <li> for bullet lists (NOT * or -)
- Use <strong> for bold text (NOT ** or __)
- Use <em> for emphasis (NOT * or _)
- Use <a href="URL"> for links
- DO NOT use any markdown syntax whatsoever

Write the article content now in HTML format:`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;

    // Validate content - check for meta-responses
    const metaIndicators = [
      'I understand',
      'I will adhere',
      'following the instructions',
      'As Hans Beeckman, I',
      'I will write',
      'Here is the article'
    ];
    
    const contentLower = generatedContent.toLowerCase();
    const hasMetaResponse = metaIndicators.some(phrase => 
      contentLower.includes(phrase.toLowerCase())
    );
    
    const wordCount = generatedContent.split(/\s+/).length;
    
    if (hasMetaResponse && wordCount < 800) {
      console.error('AI generated meta-response instead of content');
      throw new Error('AI generated acknowledgment instead of article content. Please try again.');
    }

    if (wordCount < 500) {
      console.error('Generated content too short:', wordCount, 'words');
      throw new Error('Generated content is too short. Please try again.');
    }

    // Filter banned citations from generated content
    const { cleanedContent, removedCitations, violationCount } = filterBannedCitations(generatedContent);

    if (violationCount > 0) {
      console.warn(`⚠️ Removed ${violationCount} banned citations during content generation:`, removedCitations);
    }

    // Update article with new content
    const now = new Date().toISOString();
    const readTime = Math.ceil(wordCount / 200); // Estimate 200 words per minute
    const { error: updateError } = await supabase
      .from('blog_articles')
      .update({
        detailed_content: cleanedContent,
        read_time: readTime,
        date_modified: now,
        updated_at: now
      })
      .eq('id', articleId);

    if (updateError) {
      throw new Error(`Failed to update article: ${updateError.message}`);
    }

    // Track content update
    await supabase.from('content_updates').insert({
      article_id: articleId,
      update_type: 'content',
      updated_fields: ['detailed_content', 'read_time'],
      new_date_modified: now,
      update_notes: `Regenerated article content${violationCount > 0 ? ` (removed ${violationCount} banned citations)` : ''}`
    });

    // Validate citations in real-time
    await supabase.functions.invoke('validate-article-citations', {
      body: { articleId }
    });

    console.log(`Successfully regenerated content: ${wordCount} words`);

    return new Response(
      JSON.stringify({
        success: true,
        content: cleanedContent,
        wordCount,
        removedViolations: violationCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error regenerating content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
