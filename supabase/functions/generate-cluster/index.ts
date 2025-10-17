import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to update job progress
async function updateProgress(supabase: any, jobId: string, step: number, message: string, articleNum?: number) {
  await supabase
    .from('cluster_generations')
    .update({
      status: 'generating',
      progress: {
        current_step: step,
        total_steps: 11,
        current_article: articleNum || 0,
        total_articles: 6,
        message
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
}

// Heartbeat function to indicate backend is alive
async function sendHeartbeat(supabase: any, jobId: string) {
  await supabase
    .from('cluster_generations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

// Timeout wrapper for promises
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// Retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`[${operationName}] Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Max retries exceeded for ${operationName}`);
}

// Main generation function (runs in background)
async function generateCluster(jobId: string, topic: string, language: string, targetAudience: string, primaryKeyword: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    console.log(`[Job ${jobId}] Starting generation for:`, { topic, language, targetAudience, primaryKeyword });
    await updateProgress(supabase, jobId, 0, 'Starting generation...');

    // Fetch available authors and categories
    const { data: authors } = await supabase.from('authors').select('*');
    const { data: categories } = await supabase.from('categories').select('*');

    // STEP 1: Generate cluster structure
    await updateProgress(supabase, jobId, 1, 'Generating article structure...');
    console.log(`[Job ${jobId}] Step 1: Generating structure`);

    const structurePrompt = `You are an expert SEO content strategist for a luxury real estate agency in Costa del Sol, Spain.

Create a content cluster structure for the topic: "${topic}"
Language: ${language}
Target audience: ${targetAudience}
Primary keyword: ${primaryKeyword}

Generate 6 article titles following this funnel structure:
- 3 TOFU (Top of Funnel) - Awareness stage, educational, broad topics (e.g., "What is Costa del Sol Like for...")
- 2 MOFU (Middle of Funnel) - Consideration stage, comparison, detailed guides (e.g., "How to Choose...")
- 1 BOFU (Bottom of Funnel) - Decision stage, action-oriented (e.g., "Complete Guide to Buying...")

Each article must include the location "Costa del Sol" in the headline.

Return ONLY valid JSON:
{
  "articles": [
    {
      "funnelStage": "TOFU",
      "headline": "What is Costa del Sol Like for International Buyers?",
      "targetKeyword": "costa del sol for international buyers",
      "searchIntent": "informational",
      "contentAngle": "Overview of Costa del Sol lifestyle, climate, culture for foreign buyers"
    }
  ]
}`;

    // Wrap AI call with timeout and retry
    const structureResponse = await retryWithBackoff(
      () => withTimeout(
        fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are an SEO expert specializing in real estate content strategy. Return only valid JSON.' },
              { role: 'user', content: structurePrompt }
            ],
          }),
        }),
        120000, // 2 minute timeout
        'AI structure generation timed out'
      ),
      3,
      1000,
      'Structure generation'
    );

    if (!structureResponse.ok) throw new Error(`AI gateway error: ${structureResponse.status}`);

    // Send heartbeat after major operation
    await sendHeartbeat(supabase, jobId);

    const structureData = await structureResponse.json();
    const structureText = structureData.choices[0].message.content;

    console.log('Raw AI response:', structureText); // Debug logging

    let articleStructures;
    try {
      const parsed = JSON.parse(structureText.replace(/```json\n?|\n?```/g, ''));
      // Handle both flat and nested responses
      articleStructures = parsed.articles || parsed.contentCluster?.articles || [];
      
      if (!Array.isArray(articleStructures) || articleStructures.length === 0) {
        throw new Error('AI did not return valid article structures');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response text:', structureText);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
      throw new Error(`Invalid AI response format: ${errorMessage}`);
    }

    console.log(`[Job ${jobId}] Generated structure for`, articleStructures.length, 'articles');

    // STEP 2: Generate each article with detailed sections
    const articles = [];

    for (let i = 0; i < articleStructures.length; i++) {
      await updateProgress(supabase, jobId, 2 + i, `Generating article ${i + 1} of ${articleStructures.length}...`, i + 1);
      const plan = articleStructures[i];
      const article: any = {
        funnel_stage: plan.funnelStage,
        language,
        status: 'draft',
      };

      console.log(`[Job ${jobId}] Generating article ${i + 1}/${articleStructures.length}: ${plan.headline}`);

      // 1. HEADLINE
      article.headline = plan.headline;

      // 2. SLUG
      article.slug = plan.headline
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // 3. CATEGORY (AI-based selection from exact database categories)
      const validCategoryNames = (categories || []).map(c => c.name);
      
      const categoryPrompt = `Select the most appropriate category for this article from this EXACT list:
${validCategoryNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Article Details:
- Headline: ${plan.headline}
- Target Keyword: ${plan.targetKeyword}
- Content Angle: ${plan.contentAngle}
- Funnel Stage: ${plan.funnelStage}

Return ONLY the category name exactly as shown above. No explanation, no JSON, just the category name.`;

      let finalCategory;
      
      try {
        const categoryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: categoryPrompt }],
          }),
        });

        const categoryData = await categoryResponse.json();
        const aiSelectedCategory = categoryData.choices[0].message.content.trim();
        
        // Validate AI response against database categories
        const isValidCategory = validCategoryNames.includes(aiSelectedCategory);
        
        if (isValidCategory) {
          finalCategory = aiSelectedCategory;
          console.log(`[Job ${jobId}] ✅ AI selected valid category: "${finalCategory}"`);
        } else {
          console.warn(`[Job ${jobId}] ⚠️ AI returned invalid category: "${aiSelectedCategory}". Using fallback.`);
          
          // Intelligent fallback based on headline keywords
          const headlineLower = plan.headline.toLowerCase();
          
          if (headlineLower.includes('buy') || headlineLower.includes('purchase')) {
            finalCategory = 'Buying Guides';
          } else if (headlineLower.includes('invest') || headlineLower.includes('return')) {
            finalCategory = 'Investment Strategies';
          } else if (headlineLower.includes('market') || headlineLower.includes('price') || headlineLower.includes('trend')) {
            finalCategory = 'Market Analysis';
          } else if (headlineLower.includes('location') || headlineLower.includes('area') || headlineLower.includes('where')) {
            finalCategory = 'Location Insights';
          } else if (headlineLower.includes('legal') || headlineLower.includes('law') || headlineLower.includes('regulation')) {
            finalCategory = 'Legal & Regulations';
          } else if (headlineLower.includes('manage') || headlineLower.includes('maintain')) {
            finalCategory = 'Property Management';
          } else {
            // Ultimate fallback: use most common category for the funnel stage
            finalCategory = plan.funnelStage === 'TOFU' ? 'Market Analysis' : 'Buying Guides';
          }
          
          console.log(`[Job ${jobId}] 🔄 Fallback category assigned: "${finalCategory}"`);
        }
      } catch (error) {
        console.error(`[Job ${jobId}] ❌ Error selecting category:`, error);
        // Error fallback
        finalCategory = categories?.[0]?.name || 'Buying Guides';
        console.log(`[Job ${jobId}] 🔄 Error fallback category: "${finalCategory}"`);
      }
      
      article.category = finalCategory;

      // 4. SEO META TAGS
      const seoPrompt = `Create SEO meta tags for this article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Angle: ${plan.contentAngle}
Language: ${language}

Requirements:
- Meta Title: Include primary keyword, location "Costa del Sol", and year 2025
- Max 60 characters (strict limit)
- Meta Description: Compelling summary with CTA
- Max 160 characters (strict limit)
- Include numbers or specific benefits (e.g., "5 steps", "Complete guide", "Expert tips")

Return ONLY valid JSON:
{
  "title": "Title here (max 60 chars)",
  "description": "Description with benefits and CTA (max 160 chars)"
}`;

      const seoResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: seoPrompt }],
        }),
      });

      const seoData = await seoResponse.json();
      const seoText = seoData.choices[0].message.content;
      const seoMeta = JSON.parse(seoText.replace(/```json\n?|\n?```/g, ''));
      
      article.meta_title = seoMeta.title;
      article.meta_description = seoMeta.description;
      article.canonical_url = null;

      // 5. SPEAKABLE ANSWER (40-60 words)
      const speakablePrompt = `Write a 40-60 word speakable answer for this article:

Question: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Content Focus: ${plan.contentAngle}

Requirements:
- Conversational tone (use "you" and "your")
- Present tense, active voice
- Self-contained (no pronouns referring to previous context)
- Actionable (tell reader what to DO)
- No jargon
- Exactly 40-60 words

Example format:
"To [action], you can [step 1], [step 2], and [step 3]. The process typically takes [timeframe] and [key benefit]. [Additional helpful detail]."

Return ONLY the speakable text, no JSON, no formatting, no quotes.`;

      const speakableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: speakablePrompt }],
        }),
      });

      const speakableData = await speakableResponse.json();
      article.speakable_answer = speakableData.choices[0].message.content.trim();

      // 6. DETAILED CONTENT (1500-2500 words)
      const contentPrompt = `Write a comprehensive 2000-word blog article:

Headline: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Search Intent: ${plan.searchIntent}
Content Angle: ${plan.contentAngle}
Funnel Stage: ${plan.funnelStage}
Target Audience: ${targetAudience}
Language: ${language}

Requirements:
1. Structure with H2 and H3 headings (proper hierarchy)
2. Include specific data points, numbers, timeframes
3. Write for ${plan.funnelStage} stage:
   - TOFU: Educational, broad, establish authority
   - MOFU: Comparative, detailed, build trust
   - BOFU: Action-oriented, conversion-focused, specific CTAs
4. Include real examples from Costa del Sol (Marbella, Estepona, Málaga, Mijas, Benalmádena, etc.)
5. Natural tone, 8th-grade reading level
6. Mark potential external citation points with [CITATION_NEEDED]
7. Mark potential internal link opportunities with [INTERNAL_LINK: topic]

Format as HTML with:
- <h2> for main sections (5-7 sections)
- <h3> for subsections
- <p> for paragraphs
- <ul> and <li> for lists
- <strong> for emphasis
- <table> if comparing data

DO NOT include external links yet - just mark citation points with [CITATION_NEEDED].

Return ONLY the HTML content, no JSON wrapper, no markdown code blocks.`;

      const contentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: contentPrompt }],
        }),
      });

      const contentData = await contentResponse.json();
      article.detailed_content = contentData.choices[0].message.content.trim();

      // 7. FEATURED IMAGE (using existing generate-image function with enhanced prompt)
      const inferPropertyType = (contentAngle: string, headline: string) => {
        const text = (contentAngle + ' ' + headline).toLowerCase();
        if (text.includes('villa')) return 'luxury Spanish villa';
        if (text.includes('apartment') || text.includes('flat')) return 'modern apartment';
        if (text.includes('penthouse')) return 'penthouse with terrace';
        if (text.includes('townhouse')) return 'townhouse';
        return 'luxury property';
      };

      const inferLocation = (headline: string) => {
        const text = headline.toLowerCase();
        if (text.includes('marbella')) return 'Marbella';
        if (text.includes('estepona')) return 'Estepona';
        if (text.includes('malaga') || text.includes('málaga')) return 'Málaga';
        if (text.includes('mijas')) return 'Mijas';
        if (text.includes('benalmádena') || text.includes('benalmadena')) return 'Benalmádena';
        return 'Costa del Sol';
      };

      const propertyType = inferPropertyType(plan.contentAngle, plan.headline);
      const location = inferLocation(plan.headline);

      const imagePrompt = `Professional real estate photography: ${plan.headline}. 
Luxury Costa del Sol property, ${propertyType}, 
Mediterranean architecture, Spanish villa style, bright natural lighting, 
high-end interior design, ${location}, 
ultra-realistic, 8k resolution, architectural digest style, 
blue skies, palm trees, sea view, no text, no watermarks`;

      try {
        console.log(`🎨 Generating image for: ${plan.headline}`);
        
        const imageResponse = await supabase.functions.invoke('generate-image', {
          body: {
            prompt: imagePrompt,
            headline: plan.headline,
          },
        });

        console.log('📸 Image response error:', imageResponse.error);
        console.log('📸 Image response data:', JSON.stringify(imageResponse.data));

        let featuredImageUrl = '';
        let featuredImageAlt = '';

        if (imageResponse.error) {
          console.error('❌ Edge function returned error:', imageResponse.error);
          throw new Error(`Edge function error: ${JSON.stringify(imageResponse.error)}`);
        }

        if (imageResponse.data?.error) {
          console.error('❌ FAL.ai API error:', imageResponse.data.error);
          throw new Error(`FAL.ai error: ${imageResponse.data.error}`);
        }

        if (imageResponse.data?.images?.[0]?.url) {
          featuredImageUrl = imageResponse.data.images[0].url;
          console.log('✅ Image generated successfully:', featuredImageUrl);

          // Generate SEO-optimized alt text
          const altPrompt = `Create SEO-optimized alt text for this image:

Article: ${plan.headline}
Target Keyword: ${plan.targetKeyword}
Image shows: ${imagePrompt}

Requirements:
- Include primary keyword "${plan.targetKeyword}"
- Describe what's visible in the image
- Max 125 characters
- Natural, descriptive (not keyword stuffed)

Return only the alt text, no quotes, no JSON.`;

          const altResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: altPrompt }],
            }),
          });

          const altData = await altResponse.json();
          featuredImageAlt = altData.choices[0].message.content.trim();
        } else {
          console.warn('⚠️ No images in response');
          throw new Error('No images returned from FAL.ai');
        }

        article.featured_image_url = featuredImageUrl;
        article.featured_image_alt = featuredImageAlt;
        article.featured_image_caption = featuredImageUrl ? `${plan.headline} - Luxury real estate in Costa del Sol` : null;
      } catch (error) {
        console.error('❌ IMAGE GENERATION FAILED:', error);
        console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        // Use placeholder image instead of empty string
        article.featured_image_url = 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200';
        article.featured_image_alt = `${plan.headline} - Costa del Sol luxury real estate`;
        article.featured_image_caption = `${plan.headline} - Luxury real estate in Costa del Sol`;
        
        console.log('⚠️ Using placeholder image for:', plan.headline);
      }

      // 8. DIAGRAM (for MOFU/BOFU articles using existing generate-diagram function)
      if (plan.funnelStage !== 'TOFU') {
        try {
          const diagramResponse = await supabase.functions.invoke('generate-diagram', {
            body: {
              articleContent: article.detailed_content,
              headline: plan.headline,
            },
          });

          if (diagramResponse.data?.mermaidCode) {
            article.diagram_url = diagramResponse.data.mermaidCode;
            article.diagram_description = diagramResponse.data.description;
          } else {
            article.diagram_url = null;
            article.diagram_description = null;
          }
        } catch (error) {
          console.error('Diagram generation failed:', error);
          article.diagram_url = null;
          article.diagram_description = null;
        }
      } else {
        article.diagram_url = null;
        article.diagram_description = null;
      }

      // 9. E-E-A-T ATTRIBUTION (AI-powered author matching)
      if (authors && authors.length > 0) {
        try {
          const authorPrompt = `Suggest E-E-A-T attribution for this real estate article:

Headline: ${plan.headline}
Funnel Stage: ${plan.funnelStage}
Target Keyword: ${plan.targetKeyword}
Content Focus: ${article.speakable_answer}

Available Authors:
${authors.map((author: any, idx: number) => 
  `${idx + 1}. ${author.name} - ${author.job_title}, ${author.years_experience} years experience
     Bio: ${author.bio.substring(0, 200)}
     Credentials: ${author.credentials.join(', ')}`
).join('\n\n')}

Requirements:
- Match author expertise to article topic
- Consider funnel stage (${plan.funnelStage}):
  * TOFU: Educational background, broad market knowledge
  * MOFU: Analytical skills, comparison expertise
  * BOFU: Transaction experience, legal knowledge
- Select different person as reviewer (if available)
- Reviewer should complement primary author's expertise

Return ONLY valid JSON:
{
  "primaryAuthorNumber": 1,
  "reviewerNumber": 2,
  "reasoning": "Author 1 is best because [expertise match]. Reviewer 2 complements with [different expertise].",
  "confidence": 90
}`;

          const authorResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [{ role: 'user', content: authorPrompt }],
            }),
          });

          const authorData = await authorResponse.json();
          const authorText = authorData.choices[0].message.content;
          const authorSuggestion = JSON.parse(authorText.replace(/```json\n?|\n?```/g, ''));

          const primaryAuthorIdx = authorSuggestion.primaryAuthorNumber - 1;
          const reviewerIdx = authorSuggestion.reviewerNumber - 1;

          article.author_id = authors[primaryAuthorIdx]?.id || authors[0].id;
          article.reviewer_id = (reviewerIdx >= 0 && reviewerIdx < authors.length && reviewerIdx !== primaryAuthorIdx) 
            ? authors[reviewerIdx]?.id 
            : (authors.length > 1 ? authors.find((a: any) => a.id !== article.author_id)?.id : null);

          console.log(`E-E-A-T: ${authors[primaryAuthorIdx]?.name} (author) + ${authors[reviewerIdx]?.name || 'none'} (reviewer) | Confidence: ${authorSuggestion.confidence}%`);
        } catch (error) {
          console.error('E-E-A-T attribution failed, using fallback:', error);
          // Fallback to first author
          article.author_id = authors[0].id;
          article.reviewer_id = authors.length > 1 ? authors[1].id : null;
        }
      } else {
        article.author_id = null;
        article.reviewer_id = null;
      }

      // 10. EXTERNAL CITATIONS (Perplexity for authoritative sources)
      try {
        console.log(`[Job ${jobId}] Finding external citations for article ${i+1}: "${plan.headline}" (${language})`);
        const citationsResponse = await retryWithBackoff(
          () => supabase.functions.invoke('find-external-links', {
            body: {
              content: article.detailed_content,
              headline: plan.headline,
              language: language,
            },
          }),
          3,
          2000
        );

        if (citationsResponse.data?.citations && citationsResponse.data.citations.length > 0) {
          console.log(`[Job ${jobId}] Found ${citationsResponse.data.citations.length} external citations (${citationsResponse.data.totalVerified || 0} verified)`);
          const citations = citationsResponse.data.citations;
          
          // Insert citations into content
          let updatedContent = article.detailed_content;
          
          for (const citation of citations) {
            if (citation.insertAfterHeading) {
              // Find the heading and insert citation in first paragraph after it
              const headingRegex = new RegExp(
                `<h2[^>]*>\\s*${citation.insertAfterHeading}\\s*</h2>`,
                'i'
              );
              
              const match = updatedContent.match(headingRegex);
              if (match && match.index !== undefined) {
                const headingIndex = match.index + match[0].length;
                const afterHeading = updatedContent.substring(headingIndex);
                const nextParagraphMatch = afterHeading.match(/<p>/);
                
                if (nextParagraphMatch && nextParagraphMatch.index !== undefined) {
                  const insertPoint = headingIndex + nextParagraphMatch.index + 3; // after <p>
                  
                  const citationLink = `According to the <a href="${citation.url}" target="_blank" rel="noopener" title="${citation.sourceName}">${citation.anchorText}</a>, `;
                  
                  updatedContent = updatedContent.substring(0, insertPoint) + 
                                 citationLink + 
                                 updatedContent.substring(insertPoint);
                }
              }
            }
          }
          
          article.detailed_content = updatedContent;
          article.external_citations = citations.map((c: any) => ({
            text: c.anchorText,
            url: c.url,
            source: c.sourceName,
          }));
        } else {
          article.external_citations = [];
        }
      } catch (error) {
        console.error('External citations failed:', error);
        article.external_citations = [];
      }

      // 11. FAQ ENTITIES (for MOFU/BOFU)
      if (plan.funnelStage !== 'TOFU') {
        const faqPrompt = `Generate 3-5 FAQ entities for this article:
Headline: ${plan.headline}
Content: ${article.detailed_content.substring(0, 500)}...

Return ONLY valid JSON:
{
  "faqs": [
    {
      "question": "Question here?",
      "answer": "Concise answer (2-3 sentences)"
    }
  ]
}`;

        const faqResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: faqPrompt }],
          }),
        });

        const faqData = await faqResponse.json();
        const faqText = faqData.choices[0].message.content;
        const faqResult = JSON.parse(faqText.replace(/```json\n?|\n?```/g, ''));
        article.faq_entities = faqResult.faqs;
      } else {
        article.faq_entities = [];
      }


      // 12. Calculate read time
      const wordCount = article.detailed_content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
      article.read_time = Math.ceil(wordCount / 200);

      // Initialize empty arrays for internal links and related articles
      article.internal_links = [];
      article.related_article_ids = [];
      article.cta_article_ids = [];
      article.translations = {};

      articles.push(article);
      console.log(`Article ${i + 1} complete:`, article.headline, `(${wordCount} words)`);
    }

    await updateProgress(supabase, jobId, 8, 'Finding internal links...');
    console.log(`[Job ${jobId}] All articles generated, now finding internal links...`);

    // STEP 3: Find internal links between cluster articles
    
    for (let i = 0; i < articles.length; i++) {
      try {
        const article = articles[i];
        
        // Pass other articles as available articles (excluding current)
        const otherArticles = articles
          .filter((a: any, idx: number) => idx !== i)
          .map((a: any) => ({
            id: `temp-${a.slug}`,
            slug: a.slug,
            headline: a.headline,
            speakable_answer: a.speakable_answer,
            category: a.category,
            funnel_stage: a.funnel_stage,
            language: a.language,
          }));

        console.log(`[Job ${jobId}] Finding internal links for article ${i+1}/${articles.length}: "${article.headline}" (${article.language})`);
        console.log(`[Job ${jobId}] Available articles for linking: ${otherArticles.length} articles, all in ${article.language}`);

        const linksResponse = await supabase.functions.invoke('find-internal-links', {
          body: {
            content: article.detailed_content,
            headline: article.headline,
            currentArticleId: `temp-${article.slug}`,
            language: article.language,
            funnelStage: article.funnel_stage,
            availableArticles: otherArticles,
          },
        });

        if (linksResponse.error) {
          console.error(`[Job ${jobId}] Internal links error for article ${i+1}:`, linksResponse.error);
        }

        if (linksResponse.data?.links && linksResponse.data.links.length > 0) {
          console.log(`[Job ${jobId}] Found ${linksResponse.data.links.length} internal links for "${article.headline}"`);
          if (linksResponse.data.links.length > 0) {
            console.log(`[Job ${jobId}] Sample link: "${linksResponse.data.links[0].text}" -> ${linksResponse.data.links[0].title}`);
          }
          const links = linksResponse.data.links;
          
          // Insert links into content
          let updatedContent = article.detailed_content;
          
          for (const link of links) {
            if (link.insertAfterHeading) {
              const headingRegex = new RegExp(
                `<h2[^>]*>\\s*${link.insertAfterHeading}\\s*</h2>`,
                'i'
              );
              
              const match = updatedContent.match(headingRegex);
              if (match && match.index !== undefined) {
                const headingIndex = match.index + match[0].length;
                const afterHeading = updatedContent.substring(headingIndex);
                const nextParagraphMatch = afterHeading.match(/<p>/);
                
                if (nextParagraphMatch && nextParagraphMatch.index !== undefined) {
                  const insertPoint = headingIndex + nextParagraphMatch.index + 3;
                  
                  const linkHtml = `For more details, check out our guide on <a href="${link.url}" title="${link.title}">${link.text}</a>. `;
                  
                  updatedContent = updatedContent.substring(0, insertPoint) + 
                                 linkHtml + 
                                 updatedContent.substring(insertPoint);
                }
              }
            }
          }
          
          article.detailed_content = updatedContent;
          article.internal_links = links.map((l: any) => ({
            text: l.text,
            url: l.url,
            title: l.title,
          }));
        }
      } catch (error) {
        console.error(`Internal links failed for article ${i + 1}:`, error);
      }
    }

    // STEP 4: Link articles in funnel progression
    const tofuArticles = articles.filter((a: any) => a.funnel_stage === 'TOFU');
    const mofuArticles = articles.filter((a: any) => a.funnel_stage === 'MOFU');
    const bofuArticles = articles.filter((a: any) => a.funnel_stage === 'BOFU');

    console.log('Linking articles in funnel progression...');

    // TOFU articles → link to MOFU articles (awareness to consideration)
    tofuArticles.forEach((tofuArticle: any, idx: number) => {
      // Store slugs temporarily - will be converted to IDs when saved to database
      const otherTofu = tofuArticles.filter((t: any, i: number) => i !== idx);
      
      tofuArticle._temp_cta_slugs = mofuArticles.map((m: any) => m.slug);
      tofuArticle._temp_related_slugs = [
        ...otherTofu.map((t: any) => t.slug),
        ...mofuArticles.slice(0, 2).map((m: any) => m.slug)
      ].slice(0, 7);
      
      // Keep as empty for now - frontend will resolve slugs to IDs when saving
      tofuArticle.cta_article_ids = [];
      tofuArticle.related_article_ids = [];
    });

    // MOFU articles → link to BOFU article (consideration to decision)
    mofuArticles.forEach((mofuArticle: any, idx: number) => {
      const otherMofu = mofuArticles.filter((m: any, i: number) => i !== idx);
      
      mofuArticle._temp_cta_slugs = bofuArticles.map((b: any) => b.slug);
      mofuArticle._temp_related_slugs = [
        ...tofuArticles.slice(0, 3).map((t: any) => t.slug),
        ...otherMofu.map((m: any) => m.slug),
        ...bofuArticles.map((b: any) => b.slug)
      ].slice(0, 7);
      
      mofuArticle.cta_article_ids = [];
      mofuArticle.related_article_ids = [];
    });

    // BOFU article → no CTA (chatbot for conversion), link to supporting content
    bofuArticles.forEach((bofuArticle: any) => {
      bofuArticle._temp_cta_slugs = []; // No CTA - use chatbot instead
      bofuArticle._temp_related_slugs = [
        ...mofuArticles.map((m: any) => m.slug),
        ...tofuArticles.slice(0, 3).map((t: any) => t.slug)
      ].slice(0, 7);
      
      bofuArticle.cta_article_ids = [];
      bofuArticle.related_article_ids = [];
    });

    await updateProgress(supabase, jobId, 10, 'Setting related articles...');
    console.log(`[Job ${jobId}] Funnel linking complete`);

    // STEP 5: Set related articles - Already set in CTA logic above

    await updateProgress(supabase, jobId, 11, 'Completed!');
    console.log(`[Job ${jobId}] Generation complete!`);

    // Save final articles to job record
    await supabase
      .from('cluster_generations')
      .update({
        status: 'completed',
        articles: articles,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`[Job ${jobId}] ✅ Job completed successfully, saved ${articles.length} articles`);

  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Generation failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Update job with structured error
    await supabase
      .from('cluster_generations')
      .update({
        status: 'failed',
        error: JSON.stringify({
          message: errorMessage,
          step: 'unknown',
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined
        }),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language, targetAudience, primaryKeyword } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user ID (if authenticated)
    const authHeader = req.headers.get('authorization');
    let userId = null;
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;
      } catch (e) {
        console.log('Could not get user from auth header:', e);
      }
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('cluster_generations')
      .insert({
        user_id: userId,
        topic,
        language,
        target_audience: targetAudience,
        primary_keyword: primaryKeyword,
        status: 'pending',
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      throw jobError;
    }

    console.log(`✅ Created job ${job.id}, starting background generation`);

    // Start generation in background (non-blocking)
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil(
      generateCluster(job.id, topic, language, targetAudience, primaryKeyword)
    );

    // Return job ID immediately
    return new Response(
      JSON.stringify({ success: true, jobId: job.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-cluster request handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
