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
 * Injects inline citations with "According to Source (Year)" format
 * This replaces the old injectInlineCitations function
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
  const usedCitations = new Set<string>();
  
  // Split content into paragraphs
  const paragraphPattern = /<p[^>]*>(.*?)<\/p>/gs;
  const paragraphs = [...processedContent.matchAll(paragraphPattern)];
  
  console.log(`[injectInlineCitations] Found ${paragraphs.length} paragraphs`);
  
  // Analyze H2 sections to distribute citations
  const h2Pattern = /<h2[^>]*>(.*?)<\/h2>/gs;
  const h2Sections = [...processedContent.matchAll(h2Pattern)];
  const totalSections = h2Sections.length || 1;
  
  console.log(`[injectInlineCitations] Found ${totalSections} H2 sections`);
  
  // Track which H2 section each paragraph belongs to
  const paragraphSections: number[] = [];
  let currentSection = 0;
  
  paragraphs.forEach((paragraph) => {
    const paragraphStart = processedContent.indexOf(paragraph[0]);
    
    // Check if there's an H2 before this paragraph
    for (let i = currentSection; i < h2Sections.length; i++) {
      const h2Match = h2Sections[i];
      const h2Position = processedContent.indexOf(h2Match[0]);
      
      if (h2Position < paragraphStart) {
        currentSection = i + 1;
      } else {
        break;
      }
    }
    
    paragraphSections.push(currentSection);
  });
  
  // Distribute citations across sections (aim for 1 per section)
  const sectionsWithCitations = new Set<number>();
  
  // Process each citation
  validCitations.forEach((citation, citationIdx) => {
    console.log(`\n[Citation ${citationIdx + 1}/${validCitations.length}] ${citation.source}`);
    console.log(`  URL: ${citation.url}`);
    console.log(`  Year: ${citation.year || 'not specified'}`);
    
    const citationYear = citation.year || new Date().getFullYear();
    const citationKeywords = extractKeyPhrases(citation.text || citation.source);
    console.log(`  Keywords extracted: ${citationKeywords.slice(0, 5).join(', ')}${citationKeywords.length > 5 ? '...' : ''}`);
    
    // Find the best paragraph for this citation
    let bestMatch: { 
      paragraphIndex: number; 
      score: number;
      section: number;
    } | null = null;
    
    paragraphs.forEach((paragraph, idx) => {
      const paragraphContent = paragraph[1];
      const paragraphSection = paragraphSections[idx];
      
      // Skip paragraphs that already have a citation or are too short
      if (usedCitations.has(paragraph[0]) || paragraphContent.length < 100) return;
      
      // Calculate relevance score
      let score = 0;
      citationKeywords.forEach(kw => {
        if (paragraphContent.toLowerCase().includes(kw)) {
          score += kw.split(/\s+/).length;
        }
      });
      
      // Prefer sections that don't have citations yet
      if (!sectionsWithCitations.has(paragraphSection)) {
        score += 10;
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          paragraphIndex: idx,
          score,
          section: paragraphSection
        };
      }
    });
    
    // Inject the citation in "According to Source (Year)" format
    if (bestMatch) {
      console.log(`  ✓ Best match found (score: ${bestMatch.score}, section: ${bestMatch.section}):`);
      console.log(`    Paragraph ${bestMatch.paragraphIndex + 1}`);
      
      const paragraph = paragraphs[bestMatch.paragraphIndex];
      const paragraphContent = paragraph[1];
      
      // Create the inline citation in the new format
      const citationLink = `<a href="${citation.url}" class="inline-citation" target="_blank" rel="noopener nofollow" title="Source: ${citation.source}">${citation.source}</a>`;
      const citationPhrase = `According to ${citationLink} (${citationYear}), `;
      
      // Insert at the beginning of the first sentence
      const updatedParagraph = citationPhrase + paragraphContent;
      processedContent = processedContent.replace(paragraph[0], paragraph[0].replace(paragraph[1], updatedParagraph));
      
      // Mark as used
      usedCitations.add(paragraph[0]);
      sectionsWithCitations.add(bestMatch.section);
      
      console.log(`  ✓ Injected successfully in "According to" format`);
    } else {
      console.log(`  ✗ No suitable paragraph found`);
    }
  });
  
  console.log(`\n[injectInlineCitations] Complete. Injected ${usedCitations.size} inline citations across ${sectionsWithCitations.size} sections`);
  return processedContent;
};

/**
 * Injects cluster links block between H2 sections after ~500-700 words
 */
export const injectClusterLinksBlock = (
  content: string,
  clusterLinksHtml: string
): string => {
  if (!clusterLinksHtml) return content;
  
  console.log('[injectClusterLinksBlock] Injecting cluster links');
  
  // Find all H2 headings
  const h2Pattern = /<h2[^>]*>.*?<\/h2>/gs;
  const h2Matches = [...content.matchAll(h2Pattern)];
  
  if (h2Matches.length < 2) {
    console.log('[injectClusterLinksBlock] Not enough H2 sections, skipping');
    return content;
  }
  
  // Count words before each H2
  let wordCount = 0;
  let targetH2Index = -1;
  
  for (let i = 0; i < h2Matches.length; i++) {
    const h2Match = h2Matches[i];
    const h2Position = content.indexOf(h2Match[0]);
    
    // Count words in content before this H2
    const contentBefore = content.substring(0, h2Position);
    const textContent = contentBefore.replace(/<[^>]*>/g, ' ');
    wordCount = textContent.trim().split(/\s+/).length;
    
    console.log(`  H2 #${i + 1} at position ${h2Position}, words before: ${wordCount}`);
    
    // Insert after the H2 that comes after 500-700 words
    if (wordCount >= 500 && wordCount <= 700) {
      targetH2Index = i;
      break;
    } else if (wordCount > 700 && targetH2Index === -1) {
      // Fallback: use the first H2 after 500 words
      targetH2Index = Math.max(0, i - 1);
      break;
    }
  }
  
  // Default to after 2nd H2 if no suitable position found
  if (targetH2Index === -1) {
    targetH2Index = 1;
  }
  
  const targetH2 = h2Matches[targetH2Index];
  const insertPosition = content.indexOf(targetH2[0]) + targetH2[0].length;
  
  console.log(`[injectClusterLinksBlock] Inserting after H2 #${targetH2Index + 1} at position ${insertPosition}`);
  
  const updatedContent = 
    content.substring(0, insertPosition) + 
    '\n\n' + clusterLinksHtml + '\n\n' + 
    content.substring(insertPosition);
  
  return updatedContent;
};
