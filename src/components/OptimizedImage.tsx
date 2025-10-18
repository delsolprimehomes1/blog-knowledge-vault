import { useState, ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`transition-all duration-500 ${
          isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm scale-105'
        } ${className}`}
        {...props}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted">
          <div className="w-full h-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-pulse" />
        </div>
      )}
    </div>
  );
};
