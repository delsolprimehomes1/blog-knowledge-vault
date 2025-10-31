import { ExternalCitation, InternalLink } from "@/types/blog";

/**
 * Injects internal links by replacing [INTERNAL_LINK: ...] placeholders
 */
export const injectInternalLinks = (
  content: string,
  internalLinks: InternalLink[]
): string => {
  // Filter out invalid links with missing title or url
  const validLinks = internalLinks?.filter(link => link?.title && link?.url) || [];
  
  if (validLinks.length === 0) return content;

  let processedContent = content;

  // Regular expression to find [INTERNAL_LINK: Article Title]
  const linkPattern = /\[INTERNAL_LINK:\s*([^\]]+)\]/g;
  const matches = [...content.matchAll(linkPattern)];

  matches.forEach((match) => {
    const placeholderText = match[1].trim();

    // Find matching internal link by title (fuzzy match)
    const matchingLink = validLinks.find(link => {
      // Additional safety check
      if (!link?.title || !link?.url) return false;
      
      return link.title.toLowerCase().includes(placeholderText.toLowerCase()) ||
        placeholderText.toLowerCase().includes(link.title.toLowerCase());
    });

    if (matchingLink && matchingLink.url && matchingLink.title) {
      // Replace placeholder with actual HTML link
      const link = `<a href="${matchingLink.url}" class="internal-link">${matchingLink.title}</a>`;
      processedContent = processedContent.replace(match[0], link);
    } else {
      // No matching link found - just remove the placeholder markup, keep the text
      processedContent = processedContent.replace(match[0], placeholderText);
    }
  });

  return processedContent;
};

/**
 * Injects external links into article content based on entity matching
 */
export const injectExternalLinks = (
  content: string,
  citations: ExternalCitation[]
): string => {
  if (!citations || citations.length === 0) return content;

  let processedContent = content;
  const linkedEntities = new Set<string>();

  // Entity patterns to match (case-insensitive)
  const entityPatterns = [
    // Airlines
    { pattern: /\b(Ryanair)\b/gi, category: 'airline' },
    { pattern: /\b(easyJet)\b/gi, category: 'airline' },
    { pattern: /\b(British Airways)\b/gi, category: 'airline' },
    { pattern: /\b(Aer Lingus)\b/gi, category: 'airline' },
    { pattern: /\b(Jet2)\b/gi, category: 'airline' },
    { pattern: /\b(Vueling)\b/gi, category: 'airline' },
    // Airports
    { pattern: /\b(Málaga Airport|AGP)\b/gi, category: 'airport' },
    { pattern: /\b(Dublin Airport)\b/gi, category: 'airport' },
    { pattern: /\b(Manchester Airport)\b/gi, category: 'airport' },
    { pattern: /\b(Gatwick Airport)\b/gi, category: 'airport' },
    // Government/Official
    { pattern: /\b(UK government|UK Government)\b/gi, category: 'government' },
    { pattern: /\b(Spanish government|Spanish Government)\b/gi, category: 'government' },
  ];

  // Process each citation
  citations.forEach((citation) => {
    // Skip citations without required fields
    if (!citation?.source || !citation?.url) return;
    
    const citationUrl = citation.url;
    const sourceName = citation.source.toLowerCase();

    // Try to match entity patterns with this citation
    entityPatterns.forEach(({ pattern, category }) => {
      const matches = [...processedContent.matchAll(pattern)];

      matches.forEach((match) => {
        const entity = match[0];
        const entityKey = entity.toLowerCase();

        // Only link first occurrence and skip if already linked
        if (linkedEntities.has(entityKey)) return;

        // Check if this citation is relevant to the entity
        const isRelevant =
          sourceName.includes(entity.toLowerCase()) ||
          sourceName.includes(category) ||
          citation.source.toLowerCase().includes(entity.toLowerCase());

        if (isRelevant) {
          // Don't link if already inside a tag
          const beforeMatch = processedContent.substring(0, match.index);
          const lastOpenTag = beforeMatch.lastIndexOf('<');
          const lastCloseTag = beforeMatch.lastIndexOf('>');
          
          if (lastOpenTag > lastCloseTag) return; // Inside a tag

          // Create the link
          const link = `<a href="${citationUrl}" target="_blank" rel="noopener noreferrer" class="external-link">${entity}</a>`;
          
          // Replace first occurrence
          processedContent = processedContent.replace(entity, link);
          linkedEntities.add(entityKey);
        }
      });
    });
  });

  return processedContent;
};

/**
 * Extracts key phrases from citation text for matching
 */
const extractKeyPhrases = (text: string): string[] => {
  if (!text) return [];
  
  const stopWords = ['the', 'and', 'for', 'about', 'with', 'this', 'that', 'from', 'claims', 'support', 'evidence'];
  const words = text.toLowerCase().split(/\s+/);
  
  // Filter out stop words and short words
  const keywords = words.filter(w => w.length > 3 && !stopWords.includes(w));
  
  // Also look for multi-word phrases
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const twoWord = `${words[i]} ${words[i + 1]}`;
    const threeWord = i < words.length - 2 ? `${words[i]} ${words[i + 1]} ${words[i + 2]}` : '';
    if (twoWord.length > 8) phrases.push(twoWord);
    if (threeWord.length > 12) phrases.push(threeWord);
  }
  
  return [...keywords, ...phrases];
};

/**
 * Checks if a URL is from an approved domain
 */
const isApprovedDomain = (url: string): boolean => {
  try {
    const domain = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    
    // Import approved domains list (subset for client-side validation)
    const approvedDomains = [
      'costaluzlawyers.es',
      'spanishsolutions.net',
      'lexidy.com',
      'aena.es',
      'ryanair.com',
      'easyjet.com',
      'britishairways.com',
      'gov.uk',
      'gov.ie',
      'administracion.gob.es',
      'tourspain.es',
      'met.ie',
      'metoffice.gov.uk',
      'aemet.es',
      'bbc.com',
      'theguardian.com',
      'irishtimes.com',
      'elpais.com',
      'elmundo.es',
      'sur.es',
      'malagahoy.es',
    ];
    
    return approvedDomains.some(approved => 
      domain === approved || domain.endsWith(`.${approved}`)
    );
  } catch {
    return false;
  }
};

/**
 * Finds the best anchor text in a paragraph for a citation
 */
const findBestAnchorText = (
  paragraph: string,
  citation: ExternalCitation,
  usedPhrases: Set<string>
): { phrase: string; position: number } | null => {
  if (!citation.text && !citation.source) return null;
  
  // Extract keywords from citation context
  const citationKeywords = extractKeyPhrases(citation.text || citation.source);
  if (citationKeywords.length === 0) return null;
  
  // Remove HTML tags for analysis
  const plainText = paragraph.replace(/<[^>]*>/g, '');
  
  // Find phrases in the paragraph that match citation keywords
  const candidates: Array<{ phrase: string; score: number; position: number }> = [];
  
  citationKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b([^<>]{0,20}${keyword}[^<>]{0,20})\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(plainText)) !== null) {
      const phrase = match[1].trim();
      
      // Skip if too short, too long, or already used
      if (phrase.length < 8 || phrase.length > 60 || usedPhrases.has(phrase.toLowerCase())) {
        continue;
      }
      
      // Calculate relevance score
      let score = 0;
      citationKeywords.forEach(kw => {
        if (phrase.toLowerCase().includes(kw)) score += 1;
      });
      
      candidates.push({ phrase, score, position: match.index });
    }
  });
  
  // Sort by score and return best match
  candidates.sort((a, b) => b.score - a.score);
  
  return candidates.length > 0 
    ? { phrase: candidates[0].phrase, position: candidates[0].position }
    : null;
};

/**
 * Injects inline citations as hyperlinks embedded in relevant phrases
 */
export const injectInlineCitations = (
  content: string,
  citations: ExternalCitation[]
): string => {
  if (!citations || citations.length === 0) {
    console.log('[injectInlineCitations] No citations provided');
    return content;
  }

  console.log(`[injectInlineCitations] Processing ${citations.length} citations`);
  
  // Filter for valid citations from approved domains
  const validCitations = citations.filter(c => {
    const isValid = c?.url && c?.source && isApprovedDomain(c.url);
    if (!isValid) {
      console.warn('[injectInlineCitations] Skipping invalid/unapproved citation:', c?.source);
    }
    return isValid;
  });
  
  if (validCitations.length === 0) {
    console.log('[injectInlineCitations] No valid approved citations');
    return content;
  }
  
  console.log(`[injectInlineCitations] ${validCitations.length} valid citations after filtering`);
  
  let processedContent = content;
  const usedPhrases = new Set<string>();
  const linkedParagraphs = new Set<number>();
  
  // Split content into paragraphs
  const paragraphPattern = /<p[^>]*>(.*?)<\/p>/gs;
  const paragraphs = [...processedContent.matchAll(paragraphPattern)];
  
  console.log(`[injectInlineCitations] Found ${paragraphs.length} paragraphs`);
  
  // Process each citation
  validCitations.forEach((citation, citationIdx) => {
    console.log(`\n[Citation ${citationIdx + 1}/${validCitations.length}] ${citation.source}`);
    console.log(`  URL: ${citation.url}`);
    console.log(`  Text: ${citation.text?.substring(0, 80)}...`);
    
    const citationKeywords = extractKeyPhrases(citation.text || citation.source);
    console.log(`  Keywords extracted: ${citationKeywords.slice(0, 5).join(', ')}${citationKeywords.length > 5 ? '...' : ''}`);
    
    // Find the best paragraph for this citation
    let bestMatch: { 
      paragraphIndex: number; 
      phrase: string; 
      position: number;
      score: number;
    } | null = null;
    
    paragraphs.forEach((paragraph, idx) => {
      // Skip if this paragraph already has a citation
      if (linkedParagraphs.has(idx)) return;
      
      const paragraphContent = paragraph[1];
      
      // Don't skip paragraphs with links - we can add inline citations to them
      // Just skip the specific phrases that are already linked
      
      // Find best anchor text in this paragraph
      const match = findBestAnchorText(paragraphContent, citation, usedPhrases);
      
      if (match) {
        // Calculate relevance score (more lenient threshold)
        let score = 0;
        citationKeywords.forEach(kw => {
          if (paragraphContent.toLowerCase().includes(kw)) {
            // Give higher score for longer keyword matches
            score += kw.split(/\s+/).length;
          }
        });
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            paragraphIndex: idx,
            phrase: match.phrase,
            position: match.position,
            score
          };
        }
      }
    });
    
    // Inject the citation link (lowered threshold from > 0 to >= 0)
    if (bestMatch) {
      console.log(`  ✓ Best match found (score: ${bestMatch.score}):`);
      console.log(`    Paragraph ${bestMatch.paragraphIndex + 1}`);
      console.log(`    Phrase: "${bestMatch.phrase}"`);
      
      const paragraph = paragraphs[bestMatch.paragraphIndex];
      const paragraphContent = paragraph[1];
      
      // Create the inline citation link
      const link = `<a href="${citation.url}" class="inline-citation" target="_blank" rel="noopener noreferrer" title="Source: ${citation.source}">${bestMatch.phrase}</a>`;
      
      // Replace the phrase with the link
      const updatedParagraph = paragraphContent.replace(bestMatch.phrase, link);
      processedContent = processedContent.replace(paragraph[0], paragraph[0].replace(paragraph[1], updatedParagraph));
      
      // Mark as used
      usedPhrases.add(bestMatch.phrase.toLowerCase());
      linkedParagraphs.add(bestMatch.paragraphIndex);
      
      console.log(`  ✓ Injected successfully`);
    } else {
      console.log(`  ✗ No suitable anchor text found`);
    }
  });
  
  console.log(`\n[injectInlineCitations] Complete. Injected ${linkedParagraphs.size} inline citations`);
  return processedContent;
};
