// Image transformation utility for Supabase Storage
// Automatically optimizes images for responsive loading

export const transformImage = (url: string, width: number, quality = 80): string => {
  if (!url || !url.includes('supabase.co/storage')) {
    return url;
  }
  
  // Convert storage URL to render URL with WebP format and transformations
  return url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  ) + `?width=${width}&quality=${quality}&resize=contain&format=webp`;
};

export const getResponsiveSrcSet = (url: string): string => {
  if (!url || !url.includes('supabase.co/storage')) {
    return '';
  }
  
  return [
    `${transformImage(url, 400, 80)} 400w`,
    `${transformImage(url, 800, 80)} 800w`,
    `${transformImage(url, 1200, 80)} 1200w`
  ].join(', ');
};

export const getResponsiveSizes = (): string => {
  return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
};
