/**
 * Heading hierarchy validator for SEO/AEO compliance
 * Ensures proper H1 → H2 → H3 structure on all pages
 */

export interface HeadingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  headings: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };
}

/**
 * Validate heading hierarchy in the DOM
 */
export function validateHeadingHierarchy(): HeadingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const headings = {
    h1: 0,
    h2: 0,
    h3: 0,
    h4: 0,
    h5: 0,
    h6: 0,
  };

  // Count headings
  const h1Elements = document.querySelectorAll('h1');
  const h2Elements = document.querySelectorAll('h2');
  const h3Elements = document.querySelectorAll('h3');
  const h4Elements = document.querySelectorAll('h4');
  const h5Elements = document.querySelectorAll('h5');
  const h6Elements = document.querySelectorAll('h6');

  headings.h1 = h1Elements.length;
  headings.h2 = h2Elements.length;
  headings.h3 = h3Elements.length;
  headings.h4 = h4Elements.length;
  headings.h5 = h5Elements.length;
  headings.h6 = h6Elements.length;

  // Validate H1
  if (headings.h1 === 0) {
    errors.push('Missing H1 heading. Every page must have exactly one H1.');
  } else if (headings.h1 > 1) {
    errors.push(`Multiple H1 headings found (${headings.h1}). Pages should have exactly one H1.`);
  }

  // Check if H1 is the first heading
  const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (allHeadings.length > 0 && allHeadings[0].tagName !== 'H1') {
    warnings.push(`First heading is ${allHeadings[0].tagName}, not H1. The H1 should be the first heading on the page.`);
  }

  // Check for skipped levels
  const allHeadingsArray = Array.from(allHeadings);
  for (let i = 1; i < allHeadingsArray.length; i++) {
    const currentLevel = parseInt(allHeadingsArray[i].tagName[1]);
    const previousLevel = parseInt(allHeadingsArray[i - 1].tagName[1]);

    if (currentLevel > previousLevel + 1) {
      warnings.push(
        `Heading hierarchy skipped from H${previousLevel} to H${currentLevel}. ` +
        `Text: "${allHeadingsArray[i].textContent?.slice(0, 50)}..."`
      );
    }
  }

  // Check H1 content
  if (h1Elements.length === 1) {
    const h1Text = h1Elements[0].textContent?.trim() || '';
    if (h1Text.length < 10) {
      warnings.push(`H1 is too short (${h1Text.length} chars). Consider using a more descriptive heading.`);
    }
    if (h1Text.length > 70) {
      warnings.push(`H1 is too long (${h1Text.length} chars). Consider keeping it under 70 characters.`);
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    headings,
  };
}

/**
 * Log heading validation results to console (dev mode only)
 */
export function logHeadingValidation(result: HeadingValidationResult, pageName: string) {
  if (!import.meta.env.DEV) return;

  console.group(`📋 Heading Validation: ${pageName}`);

  console.log('Heading Count:', result.headings);

  if (result.errors.length > 0) {
    console.error('❌ Errors:');
    result.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ Heading hierarchy is valid!');
  }

  console.groupEnd();
}

/**
 * Validate headings on page load
 */
export function validateHeadingsOnLoad(pageName: string) {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    // Wait for DOM to be fully loaded
    setTimeout(() => {
      const result = validateHeadingHierarchy();
      logHeadingValidation(result, pageName);
    }, 500);
  }
}
