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
    const { content, headline, type } = await req.json();
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY is not configured');
    }

    // Validate content parameter
    if (!content || typeof content !== 'string') {
      throw new Error('Content parameter is required and must be a string');
    }

    const prompt = `Analyze this real estate article and create a ${type} diagram in Mermaid syntax.

Article: "${headline}"
Content: ${content.substring(0, 2000)}

Create a clear, professional ${type} that visualizes the key ${
  type === 'flowchart' ? 'process steps' :
  type === 'timeline' ? 'timeline events' :
  'comparison points'
}.

Return ONLY valid Mermaid code wrapped in \`\`\`mermaid code blocks and a 1-sentence description starting with "Description: ".

Example format:
\`\`\`mermaid
graph TD
  A[Start] --> B[Step 1]
  B --> C[End]
\`\`\`
Description: This diagram shows the process flow.`;

    console.log('Calling Perplexity API for diagram generation...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a diagram expert. Generate valid Mermaid syntax for visualizations. Always wrap Mermaid code in ```mermaid blocks and provide a description.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
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
    
    // Parse out Mermaid code and description
    const mermaidMatch = aiResponse.match(/```mermaid\n([\s\S]*?)\n```/);
    const mermaidCode = mermaidMatch ? mermaidMatch[1].trim() : '';
    
    const descriptionMatch = aiResponse.match(/Description:\s*(.*)/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'Process diagram';

    if (!mermaidCode) {
      console.error('Failed to extract Mermaid code from response');
      throw new Error('Failed to generate valid diagram code');
    }

    return new Response(
      JSON.stringify({ 
        mermaidCode,
        description 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in generate-diagram function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to generate diagram'
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
