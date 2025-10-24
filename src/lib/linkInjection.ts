import { ExternalCitation, InternalLink } from "@/types/blog";

/**
 * Injects internal links by replacing [INTERNAL_LINK: ...] placeholders
 */
export const injectInternalLinks = (
  content: string,
  internalLinks: InternalLink[]
): string => {
  if (!internalLinks || internalLinks.length === 0) return content;

  let processedContent = content;

  // Regular expression to find [INTERNAL_LINK: Article Title]
  const linkPattern = /\[INTERNAL_LINK:\s*([^\]]+)\]/g;
  const matches = [...content.matchAll(linkPattern)];

  matches.forEach((match) => {
    const placeholderText = match[1].trim();

    // Find matching internal link by title (fuzzy match)
    const matchingLink = internalLinks.find(link => 
      link.title.toLowerCase().includes(placeholderText.toLowerCase()) ||
      placeholderText.toLowerCase().includes(link.title.toLowerCase())
    );

    if (matchingLink) {
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
 * Adds citation superscript markers throughout the content
 */
export const addCitationMarkers = (
  content: string,
  citations: ExternalCitation[]
): string => {
  if (!citations || citations.length === 0) return content;

  let processedContent = content;

  // Keywords that indicate a claim needing citation
  const claimIndicators = [
    'flights',
    'airlines',
    'prices',
    'routes',
    'frequency',
    'direct',
    'non-stop',
    'terminals',
    'facilities',
    'transport',
    'connections',
    'visa',
    'passport',
    'requirements',
    'regulations',
  ];

  // Split content into sentences
  const sentences = processedContent.split(/\.\s+/);
  let citationIndex = 0;

  const processedSentences = sentences.map((sentence, idx) => {
    // Skip if already has a link or citation
    if (sentence.includes('<a href') || sentence.includes('<sup>')) {
      return sentence;
    }

    // Check if sentence contains claim indicators
    const hasClaim = claimIndicators.some(keyword => 
      sentence.toLowerCase().includes(keyword)
    );

    // Add citation marker to qualifying sentences (but not too many)
    if (hasClaim && citationIndex < citations.length && idx % 3 === 0) {
      citationIndex++;
      return `${sentence}<sup class="citation-marker"><a href="#citation-${citationIndex}">[${citationIndex}]</a></sup>`;
    }

    return sentence;
  });

  return processedSentences.join('. ');
};
