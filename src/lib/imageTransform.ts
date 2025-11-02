// EMERGENCY FIX: Bypass transformation to use direct Supabase Storage URLs
// Image transformations disabled temporarily - images will load unoptimized but WILL LOAD

export const transformImage = (url: string, width: number, quality = 80): string => {
  // Return original URL directly - bypass broken transformation endpoint
  return url;
};

export const getResponsiveSrcSet = (url: string): string => {
  // Disabled temporarily - return empty string
  return '';
};

export const getResponsiveSizes = (): string => {
  // Disabled temporarily - return empty string
  return '';
};
