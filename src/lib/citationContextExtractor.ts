/**
 * Citation Context Extractor
 * Extracts the paragraph or sentence surrounding a citation URL
 */

/**
 * Extract context around where a URL appears in article content
 * Returns the paragraph or sentence containing the citation
 */
export function extractCitationContext(
  content: string,
  citationUrl: string,
  maxLength: number = 500
): string | null {
  if (!content || !citationUrl) return null;

  try {
    // Try to find the URL in the content
    const urlIndex = content.toLowerCase().indexOf(citationUrl.toLowerCase());
    
    if (urlIndex === -1) {
      // URL not found directly, try finding just the domain
      const urlObj = new URL(citationUrl);
      const domain = urlObj.hostname.replace('www.', '');
      const domainIndex = content.toLowerCase().indexOf(domain.toLowerCase());
      
      if (domainIndex === -1) {
        return null;
      }
      
      // Extract paragraph around the domain mention
      return extractParagraph(content, domainIndex, maxLength);
    }

    // Extract paragraph around the URL
    return extractParagraph(content, urlIndex, maxLength);
  } catch (error) {
    console.error('Error extracting citation context:', error);
    return null;
  }
}

/**
 * Extract paragraph or sentence around a specific position
 */
function extractParagraph(
  content: string,
  position: number,
  maxLength: number
): string {
  // Find paragraph boundaries (double newline or HTML tags)
  const beforePosition = content.slice(0, position);
  const afterPosition = content.slice(position);

  // Look for paragraph start (last double newline or <p> tag before position)
  let paragraphStart = Math.max(
    beforePosition.lastIndexOf('\n\n'),
    beforePosition.lastIndexOf('<p>'),
    beforePosition.lastIndexOf('<h2>'),
    beforePosition.lastIndexOf('<h3>')
  );
  
  if (paragraphStart === -1) {
    paragraphStart = 0;
  } else {
    // Move past the delimiter
    paragraphStart += 2;
  }

  // Look for paragraph end (next double newline or closing tag after position)
  let paragraphEnd = Math.min(
    ...[
      afterPosition.indexOf('\n\n'),
      afterPosition.indexOf('</p>'),
      afterPosition.indexOf('</h2>'),
      afterPosition.indexOf('</h3>')
    ].filter(i => i !== -1).map(i => i + position)
  );

  if (paragraphEnd === Infinity || paragraphEnd === -1) {
    paragraphEnd = content.length;
  }

  // Extract the paragraph
  let paragraph = content.slice(paragraphStart, paragraphEnd).trim();

  // Remove HTML tags
  paragraph = paragraph.replace(/<[^>]*>/g, '');
  
  // If paragraph is too long, extract sentence around the citation
  if (paragraph.length > maxLength) {
    const relativePosition = position - paragraphStart;
    paragraph = extractSentence(paragraph, relativePosition, maxLength);
  }

  return paragraph;
}

/**
 * Extract sentence around a position within text
 */
function extractSentence(
  text: string,
  position: number,
  maxLength: number
): string {
  // Find sentence boundaries
  const beforePosition = text.slice(0, position);
  const afterPosition = text.slice(position);

  // Find last sentence start (. ! ?)
  const sentenceStarts = [
    beforePosition.lastIndexOf('. '),
    beforePosition.lastIndexOf('! '),
    beforePosition.lastIndexOf('? ')
  ];
  let sentenceStart = Math.max(...sentenceStarts);
  if (sentenceStart === -1) {
    sentenceStart = 0;
  } else {
    sentenceStart += 2; // Move past delimiter and space
  }

  // Find next sentence end
  const sentenceEnds = [
    afterPosition.indexOf('. '),
    afterPosition.indexOf('! '),
    afterPosition.indexOf('? ')
  ].filter(i => i !== -1);
  
  let sentenceEnd = Math.min(...sentenceEnds);
  if (sentenceEnd === Infinity || sentenceEnd === -1) {
    sentenceEnd = afterPosition.length;
  }
  sentenceEnd += position + 1; // Include the period

  let sentence = text.slice(sentenceStart, sentenceEnd).trim();

  // If still too long, truncate intelligently
  if (sentence.length > maxLength) {
    const halfLength = Math.floor(maxLength / 2);
    const relativePos = position - sentenceStart;
    const start = Math.max(0, relativePos - halfLength);
    const end = Math.min(sentence.length, relativePos + halfLength);
    
    sentence = (start > 0 ? '...' : '') + 
               sentence.slice(start, end).trim() + 
               (end < sentence.length ? '...' : '');
  }

  return sentence;
}

/**
 * Extract multiple citation contexts from article content
 */
export function extractMultipleCitationContexts(
  content: string,
  citationUrls: string[],
  maxLength: number = 500
): Record<string, string | null> {
  const contexts: Record<string, string | null> = {};
  
  for (const url of citationUrls) {
    contexts[url] = extractCitationContext(content, url, maxLength);
  }
  
  return contexts;
}
