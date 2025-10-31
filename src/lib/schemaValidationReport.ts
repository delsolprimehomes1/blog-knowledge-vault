/**
 * Schema Validation Report Generator
 * Validates image schemas and provides enhancement recommendations
 */

interface ImageSchemaIssue {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  currentValue?: any;
  recommendedValue?: any;
}

interface ImageSchemaReport {
  url: string;
  isValid: boolean;
  score: number;
  issues: ImageSchemaIssue[];
  recommendations: string[];
}

export function validateImageSchema(imageSchema: any): ImageSchemaReport {
  const issues: ImageSchemaIssue[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check required properties
  if (!imageSchema['@type'] || imageSchema['@type'] !== 'ImageObject') {
    issues.push({
      field: '@type',
      severity: 'error',
      message: 'Missing or incorrect @type property',
      currentValue: imageSchema['@type'],
      recommendedValue: 'ImageObject'
    });
    score -= 20;
  }

  if (!imageSchema.url) {
    issues.push({
      field: 'url',
      severity: 'error',
      message: 'Missing url property',
      recommendedValue: 'https://delsolprimehomes.com/image.jpg'
    });
    score -= 20;
  }

  // Check recommended properties for AI understanding
  if (!imageSchema.width) {
    issues.push({
      field: 'width',
      severity: 'warning',
      message: 'Missing width property - important for AI multimodal understanding',
      recommendedValue: 1200
    });
    score -= 10;
    recommendations.push('Add width property for better visual indexation');
  }

  if (!imageSchema.height) {
    issues.push({
      field: 'height',
      severity: 'warning',
      message: 'Missing height property - important for AI multimodal understanding',
      recommendedValue: 675
    });
    score -= 10;
    recommendations.push('Add height property for better visual indexation');
  }

  if (!imageSchema.encodingFormat) {
    issues.push({
      field: 'encodingFormat',
      severity: 'warning',
      message: 'Missing encodingFormat property',
      recommendedValue: 'image/jpeg'
    });
    score -= 5;
    recommendations.push('Add encodingFormat to specify image type');
  }

  if (!imageSchema.caption && !imageSchema.description) {
    issues.push({
      field: 'caption/description',
      severity: 'warning',
      message: 'Missing caption and description - reduces AI discoverability',
      recommendedValue: 'Descriptive caption about the image content'
    });
    score -= 10;
    recommendations.push('Add caption or description for AI context');
  }

  // Check optional but beneficial properties
  if (!imageSchema.contentUrl) {
    issues.push({
      field: 'contentUrl',
      severity: 'info',
      message: 'Missing contentUrl property - useful for caching optimization',
      recommendedValue: imageSchema.url
    });
    score -= 5;
    recommendations.push('Add contentUrl for better CDN handling');
  }

  if (imageSchema.representativeOfPage === undefined) {
    issues.push({
      field: 'representativeOfPage',
      severity: 'info',
      message: 'Missing representativeOfPage flag - helps identify primary images',
      recommendedValue: true
    });
    score -= 5;
  }

  // Validate dimensions
  if (imageSchema.width && imageSchema.width < 800) {
    issues.push({
      field: 'width',
      severity: 'warning',
      message: 'Image width below recommended 800px minimum',
      currentValue: imageSchema.width,
      recommendedValue: 1200
    });
    recommendations.push('Use higher resolution images (min 800px width, recommended 1200px)');
  }

  // Check for thumbnail
  if (imageSchema.width > 800 && !imageSchema.thumbnail) {
    issues.push({
      field: 'thumbnail',
      severity: 'info',
      message: 'Large image missing thumbnail property - useful for performance',
      recommendedValue: {
        '@type': 'ImageObject',
        url: imageSchema.url,
        width: 400,
        height: 225
      }
    });
    recommendations.push('Add thumbnail for better loading performance');
  }

  const isValid = !issues.some(issue => issue.severity === 'error');

  return {
    url: imageSchema.url || 'unknown',
    isValid,
    score: Math.max(0, score),
    issues,
    recommendations
  };
}

export function generateSchemaValidationReport(schemas: any[]): {
  overallScore: number;
  totalImages: number;
  validImages: number;
  criticalIssues: number;
  warnings: number;
  recommendations: string[];
  detailedReports: ImageSchemaReport[];
} {
  const detailedReports: ImageSchemaReport[] = [];
  let totalScore = 0;
  let criticalIssues = 0;
  let warnings = 0;
  const allRecommendations = new Set<string>();

  // Extract all ImageObject schemas
  const extractImages = (obj: any): any[] => {
    const images: any[] = [];
    
    if (obj['@type'] === 'ImageObject') {
      images.push(obj);
    }
    
    if (Array.isArray(obj)) {
      obj.forEach(item => images.push(...extractImages(item)));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => images.push(...extractImages(value)));
    }
    
    return images;
  };

  schemas.forEach(schema => {
    const imageSchemas = extractImages(schema);
    imageSchemas.forEach(imageSchema => {
      const report = validateImageSchema(imageSchema);
      detailedReports.push(report);
      totalScore += report.score;
      criticalIssues += report.issues.filter(i => i.severity === 'error').length;
      warnings += report.issues.filter(i => i.severity === 'warning').length;
      report.recommendations.forEach(rec => allRecommendations.add(rec));
    });
  });

  const totalImages = detailedReports.length;
  const validImages = detailedReports.filter(r => r.isValid).length;
  const overallScore = totalImages > 0 ? Math.round(totalScore / totalImages) : 100;

  return {
    overallScore,
    totalImages,
    validImages,
    criticalIssues,
    warnings,
    recommendations: Array.from(allRecommendations),
    detailedReports
  };
}

export function generateReportSummary(report: ReturnType<typeof generateSchemaValidationReport>): string {
  const { overallScore, totalImages, validImages, criticalIssues, warnings, recommendations } = report;
  
  let summary = `\n=== IMAGE SCHEMA VALIDATION REPORT ===\n\n`;
  summary += `Overall Score: ${overallScore}/100\n`;
  summary += `Total Images: ${totalImages}\n`;
  summary += `Valid Images: ${validImages}/${totalImages} (${Math.round((validImages/totalImages)*100)}%)\n`;
  summary += `Critical Issues: ${criticalIssues}\n`;
  summary += `Warnings: ${warnings}\n\n`;
  
  if (recommendations.length > 0) {
    summary += `TOP RECOMMENDATIONS:\n`;
    recommendations.slice(0, 5).forEach((rec, i) => {
      summary += `${i + 1}. ${rec}\n`;
    });
  }
  
  summary += `\n=== END REPORT ===\n`;
  
  return summary;
}
