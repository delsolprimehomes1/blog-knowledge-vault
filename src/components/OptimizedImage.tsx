import { useState, ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  srcSet?: string;
  sizes?: string;
  blurDataURL?: string;
}

export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  srcSet,
  sizes,
  blurDataURL,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div 
      className="relative"
      style={width && height ? { aspectRatio: `${width}/${height}` } : undefined}
    >
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        srcSet={srcSet}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-90'
        } ${className}`}
        {...props}
      />
      {!isLoaded && !blurDataURL && (
        <div className="absolute inset-0 bg-muted">
          <div className="w-full h-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-pulse" />
        </div>
      )}
    </div>
  );
};
