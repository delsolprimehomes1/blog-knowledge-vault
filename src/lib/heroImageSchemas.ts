/**
 * Hero Image Schema Generator
 * Generates JSON-LD ImageObject schemas for homepage hero carousel
 */

const BASE_URL = 'https://delsolprimehomes.com';

export interface HeroImage {
  id: string;
  src: string;
  alt: string;
  caption: string;
  description: string;
  category: 'art' | 'beauty' | 'romance' | 'luxury' | 'unique';
  location: string;
}

export const HERO_IMAGES: HeroImage[] = [
  {
    id: 'art',
    src: '/images/costa-del-sol-art.jpg',
    alt: 'Art and culture in Málaga, Costa del Sol - Picasso Museum showcasing vibrant Mediterranean art scene',
    caption: 'Art & Culture',
    description: 'Discover the vibrant art scene of Costa del Sol through Málaga\'s world-renowned museums, galleries, and cultural landmarks including the iconic Picasso Museum',
    category: 'art',
    location: 'Málaga, Costa del Sol, Spain'
  },
  {
    id: 'beauty',
    src: '/images/costa-del-sol-beauty.jpg',
    alt: 'Natural beauty of Marbella beach at sunset, Costa del Sol - pristine Mediterranean coastline with golden sands',
    caption: 'Natural Beauty',
    description: 'Experience the breathtaking natural beauty of Costa del Sol\'s pristine beaches, turquoise Mediterranean waters, and dramatic sunset vistas along Spain\'s southern coast',
    category: 'beauty',
    location: 'Marbella, Costa del Sol, Spain'
  },
  {
    id: 'romance',
    src: '/images/costa-del-sol-romance.jpg',
    alt: 'Romantic couple walking through cobblestone streets of Marbella Old Town, Costa del Sol - intimate Mediterranean ambiance',
    caption: 'Romance & Charm',
    description: 'Embrace the romantic charm of Costa del Sol\'s historic white-washed villages, intimate cobblestone streets, and enchanting Mediterranean atmosphere perfect for couples',
    category: 'romance',
    location: 'Marbella Old Town, Costa del Sol, Spain'
  },
  {
    id: 'luxury',
    src: '/images/costa-del-sol-luxury.jpg',
    alt: 'Luxury yachts at Puerto Banús marina, Marbella - exclusive Costa del Sol lifestyle and prestigious waterfront living',
    caption: 'Luxury Lifestyle',
    description: 'Indulge in the exclusive luxury lifestyle of Costa del Sol at Puerto Banús, featuring world-class marinas, designer boutiques, upscale dining, and prestigious waterfront properties',
    category: 'luxury',
    location: 'Puerto Banús, Marbella, Costa del Sol, Spain'
  },
  {
    id: 'unique',
    src: '/images/costa-del-sol-unique.jpg',
    alt: 'Traditional white village of Frigiliana, Costa del Sol - unique Andalusian architecture cascading down mountainside',
    caption: 'Unique Heritage',
    description: 'Explore the unique heritage of Costa del Sol\'s traditional white villages with their iconic Andalusian architecture, winding narrow streets, and authentic Spanish charm nestled in the mountains',
    category: 'unique',
    location: 'Frigiliana, Costa del Sol, Spain'
  }
];

export function generateHeroImageSchema(image: HeroImage) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "@id": `${BASE_URL}/#hero-image-${image.id}`,
    "url": `${BASE_URL}${image.src}`,
    "width": 1920,
    "height": 1080,
    "encodingFormat": "image/jpeg",
    "caption": image.caption,
    "description": image.description,
    "name": image.alt,
    "contentLocation": {
      "@type": "Place",
      "name": image.location,
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "ES",
        "addressRegion": "Andalusia"
      }
    },
    "creator": {
      "@type": "Organization",
      "name": "Del Sol Prime Homes",
      "url": BASE_URL
    },
    "keywords": [
      "Costa del Sol",
      image.category,
      "real estate",
      "luxury property",
      "Spain",
      "Mediterranean"
    ],
    "inLanguage": "en-GB"
  };
}

export function generateImageGallerySchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "@id": `${BASE_URL}/#hero-gallery`,
    "name": "Costa del Sol Lifestyle Gallery",
    "description": "Visual showcase of Costa del Sol's art, natural beauty, romance, luxury lifestyle, and unique heritage - the finest real estate destination on Spain's Mediterranean coast",
    "image": HERO_IMAGES.map(img => generateHeroImageSchema(img)),
    "about": {
      "@type": "Place",
      "name": "Costa del Sol, Spain",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "ES",
        "addressRegion": "Andalusia"
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "Del Sol Prime Homes",
      "url": BASE_URL
    }
  };
}

export function getAllHeroImageSchemas() {
  return HERO_IMAGES.map(img => generateHeroImageSchema(img));
}
