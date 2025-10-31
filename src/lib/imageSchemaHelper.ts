/**
 * Helper functions for generating enriched ImageObject schemas
 * Supports AI multimodal understanding and better visual indexation
 */

export interface ImageSchemaOptions {
  url: string;
  alt?: string;
  caption?: string;
  description?: string;
  width?: number;
  height?: number;
  encodingFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  representativeOfPage?: boolean;
  contentType?: string;
  position?: number;
}

/**
 * Generate a complete ImageObject schema with all recommended properties
 */
export function generateImageObjectSchema(options: ImageSchemaOptions): any {
  const {
    url,
    alt,
    caption,
    description,
    width = 1200,
    height = 675,
    encodingFormat = 'image/jpeg',
    representativeOfPage = false,
    contentType,
    position
  } = options;

  const schema: any = {
    "@type": "ImageObject",
    "url": url,
    "contentUrl": url,
    "width": width,
    "height": height,
    "encodingFormat": encodingFormat,
  };

  // Add optional properties
  if (alt) schema.alternateName = alt;
  if (caption) schema.caption = caption;
  if (description) schema.description = description;
  if (representativeOfPage !== undefined) schema.representativeOfPage = representativeOfPage;
  if (contentType) schema.contentType = contentType;
  if (position) schema.position = position;

  // Add thumbnail for better multimodal understanding
  if (width > 400 && height > 225) {
    schema.thumbnail = {
      "@type": "ImageObject",
      "url": url,
      "width": 400,
      "height": Math.round((400 / width) * height)
    };
  }

  return schema;
}

/**
 * Generate logo ImageObject schema
 */
export function generateLogoSchema(url: string, width = 250, height = 80): any {
  return {
    "@type": "ImageObject",
    "url": url,
    "width": width,
    "height": height,
    "encodingFormat": "image/png",
    "caption": "Del Sol Prime Homes Logo"
  };
}

/**
 * Generate featured image schema for articles
 */
export function generateFeaturedImageSchema(
  url: string,
  alt: string,
  caption?: string,
  headline?: string
): any {
  return generateImageObjectSchema({
    url,
    alt,
    caption: caption || headline,
    description: alt,
    width: 1200,
    height: 675,
    encodingFormat: 'image/jpeg',
    representativeOfPage: true,
    position: 1
  });
}

/**
 * Generate diagram/infographic schema
 */
export function generateDiagramSchema(
  url: string,
  alt: string,
  caption?: string,
  description?: string
): any {
  return generateImageObjectSchema({
    url,
    alt,
    caption: caption || 'Visual guide',
    description: description || 'Diagram illustrating key concepts',
    width: 1200,
    height: 1200,
    encodingFormat: 'image/png',
    representativeOfPage: false,
    contentType: 'Infographic',
    position: 2
  });
}

/**
 * Generate property/case study image schema
 */
export function generatePropertyImageSchema(
  url: string,
  propertyType: string,
  location: string,
  description?: string
): any {
  return generateImageObjectSchema({
    url,
    caption: `${propertyType} in ${location}`,
    description: description || `Professional photograph of ${propertyType.toLowerCase()} located in ${location}, Costa del Sol`,
    width: 1200,
    height: 800,
    encodingFormat: 'image/jpeg',
    representativeOfPage: false
  });
}

/**
 * Validate image URL and return proper format
 */
export function normalizeImageUrl(url: string, baseUrl: string = 'https://delsolprimehomes.com'): string {
  if (!url) return `${baseUrl}/placeholder.svg`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

/**
 * Extract image dimensions from URL or provide defaults
 */
export function getImageDimensions(url: string): { width: number; height: number } {
  // Check for common size patterns in URL
  const sizeMatch = url.match(/(\d{3,4})x(\d{3,4})/);
  if (sizeMatch) {
    return { width: parseInt(sizeMatch[1]), height: parseInt(sizeMatch[2]) };
  }

  // Default dimensions based on image type
  if (url.includes('logo')) {
    return { width: 250, height: 80 };
  } else if (url.includes('diagram') || url.includes('infographic')) {
    return { width: 1200, height: 1200 };
  }

  // Default featured image dimensions (16:9 aspect ratio)
  return { width: 1200, height: 675 };
}

/**
 * Determine encoding format from URL
 */
export function getEncodingFormat(url: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  const extension = url.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}
