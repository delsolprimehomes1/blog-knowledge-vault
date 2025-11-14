/**
 * Article Analyzer - Parses article content for citation-worthy sentences
 */

export interface ArticleSentence {
  id: string;
  text: string;
  paragraph: number;
  needsCitation: boolean;
  citationScore: number; // 0-10
  topics: string[];
  context: string;
}

/**
 * Parse article content into sentences and identify citation-worthy claims
 */
export function parseArticleContent(content: string, maxSentences: number = 15): ArticleSentence[] {
  const sentences: ArticleSentence[] = [];
  
  // Remove HTML tags but preserve paragraph structure
  const cleanContent = content.replace(/<[^>]*>/g, ' ');
  
  // Split into paragraphs
  const paragraphs = cleanContent
    .split(/\n\n+/)
    .filter(p => p.trim().length > 20);
  
  let sentenceIndex = 0;
  
  paragraphs.forEach((paragraph, paragraphIndex) => {
    // Split paragraph into sentences (basic approach)
    const paragraphSentences = paragraph
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20); // Minimum sentence length
    
    paragraphSentences.forEach((sentenceText) => {
      const score = calculateCitationScore(sentenceText);
      const needsCitation = score >= 5; // Threshold
      
      sentences.push({
        id: `s${sentenceIndex}`,
        text: sentenceText,
        paragraph: paragraphIndex,
        needsCitation,
        citationScore: score,
        topics: extractTopics(sentenceText),
        context: paragraph.substring(0, 300), // First 300 chars of paragraph
      });
      
      sentenceIndex++;
    });
  });
  
  // Sort by citation score (highest first) and return top N
  return sentences
    .filter(s => s.needsCitation)
    .sort((a, b) => b.citationScore - a.citationScore)
    .slice(0, maxSentences);
}

/**
 * Calculate how much a sentence needs a citation (0-10)
 */
function calculateCitationScore(sentence: string): number {
  let score = 0;
  const lowerSentence = sentence.toLowerCase();
  
  // Statistical indicators
  if (/\d+%|\d+\s*(percent|per cent)/.test(sentence)) score += 3;
  if (/\d{4}|\d+\s*years?/.test(sentence)) score += 2; // Years or numbers
  if (/statistics|data|study|research|report|survey/.test(lowerSentence)) score += 3;
  
  // Authoritative claims
  if (/according to|based on|studies show|experts|research indicates/.test(lowerSentence)) score += 2;
  if (/government|official|law|regulation|ministry|department/.test(lowerSentence)) score += 3;
  
  // Comparative/superlative claims
  if (/best|worst|highest|lowest|most|least|top|bottom/.test(lowerSentence)) score += 2;
  if (/increased|decreased|grew|declined|rose|fell|dropped/.test(lowerSentence)) score += 2;
  
  // Legal/regulatory language
  if (/must|required|mandatory|legal|illegal|prohibited|permitted|allowed/.test(lowerSentence)) score += 2;
  
  // Price/financial claims
  if (/€|£|\$|price|cost|fee|tax|budget|income|salary/.test(lowerSentence)) score += 2;
  
  return Math.min(score, 10);
}

/**
 * Extract key topics from a sentence
 */
function extractTopics(sentence: string): string[] {
  const topics: string[] = [];
  const lowerSentence = sentence.toLowerCase();
  
  // Real estate topics
  if (/property|real estate|housing|apartment|villa|home/.test(lowerSentence)) {
    topics.push('real_estate');
  }
  
  // Legal topics
  if (/law|legal|regulation|permit|license|document/.test(lowerSentence)) {
    topics.push('legal');
  }
  
  // Financial topics
  if (/price|cost|tax|mortgage|investment|finance/.test(lowerSentence)) {
    topics.push('financial');
  }
  
  // Location topics
  if (/spain|spanish|andalusia|costa del sol|malaga|marbella/.test(lowerSentence)) {
    topics.push('location');
  }
  
  return topics;
}

/**
 * Get the top N most citation-worthy sentences with their context
 */
export function getTopCitationOpportunities(
  content: string,
  count: number = 10
): ArticleSentence[] {
  const sentences = parseArticleContent(content, count);
  return sentences;
}

/**
 * Format sentences for Perplexity API prompt
 */
export function formatSentencesForPrompt(sentences: ArticleSentence[]): string {
  return sentences
    .map((s, i) => `${i + 1}. "${s.text}" (Score: ${s.citationScore}/10)`)
    .join('\n');
}
