/**
 * HTML Heading Validator
 * Validates heading hierarchy from HTML strings (for server-side validation)
 */

export interface HTMLHeadingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  headings: {
    h1: number;
    h2: number;
    h3: number;
  };
  h1Text: string | null;
}

/**
 * Extract headings from HTML string
 */
function extractHeadings(html: string): { tag: string; text: string; index: number }[] {
  const headings: { tag: string; text: string; index: number }[] = [];
  const headingRegex = /<(h[1-6])[^>]*>(.*?)<\/\1>/gi;
  let match;
  
  while ((match = headingRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const text = match[2].replace(/<[^>]*>/g, '').trim(); // Strip inner HTML tags
    headings.push({ tag, text, index: match.index });
  }
  
  return headings;
}

/**
 * Validate heading hierarchy in HTML string
 */
export function validateHTMLHeadingHierarchy(
  html: string,
  expectedH1?: string
): HTMLHeadingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const headings = { h1: 0, h2: 0, h3: 0 };
  let h1Text: string | null = null;
  
  const extractedHeadings = extractHeadings(html);
  
  // Count headings
  extractedHeadings.forEach(heading => {
    if (heading.tag === 'h1') {
      headings.h1++;
      h1Text = heading.text;
    } else if (heading.tag === 'h2') {
      headings.h2++;
    } else if (heading.tag === 'h3') {
      headings.h3++;
    }
  });
  
  // Validate H1
  if (headings.h1 === 0) {
    errors.push('Missing H1 heading');
  } else if (headings.h1 > 1) {
    errors.push(`Multiple H1 headings found (${headings.h1})`);
  }
  
  // Validate H1 matches expected headline
  if (expectedH1 && h1Text && h1Text !== expectedH1) {
    warnings.push(`H1 "${h1Text}" does not match headline "${expectedH1}"`);
  }
  
  // Check for minimum H2 headings (SEO best practice)
  if (headings.h2 < 3) {
    warnings.push(`Only ${headings.h2} H2 headings found. Recommended minimum: 3 for SEO`);
  }
  
  // Check heading hierarchy (no skipped levels)
  for (let i = 1; i < extractedHeadings.length; i++) {
    const currentLevel = parseInt(extractedHeadings[i].tag[1]);
    const previousLevel = parseInt(extractedHeadings[i - 1].tag[1]);
    
    if (currentLevel > previousLevel + 1) {
      warnings.push(
        `Skipped heading level: H${previousLevel} → H${currentLevel} ("${extractedHeadings[i].text.slice(0, 50)}")`
      );
    }
  }
  
  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    warnings,
    headings,
    h1Text,
  };
}
