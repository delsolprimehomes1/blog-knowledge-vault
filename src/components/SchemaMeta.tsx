/**
 * SchemaMeta: Component that combines Helmet meta tags with JSON-LD schemas
 * Simplifies adding complete SEO/AEO metadata to pages
 */

import { Helmet } from 'react-helmet';

interface SchemaMetaProps {
  // Basic SEO
  title: string;
  description: string;
  canonical: string;
  
  // Open Graph
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  
  // Twitter Card
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  
  // Other
  robots?: string;
  language?: string;
  
  // Hreflang (multi-language)
  hreflangLinks?: Array<{ lang: string; url: string }>;
  
  // JSON-LD Schemas
  schemas?: any[];
}

export function SchemaMeta({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage = 'https://delsolprimehomes.com/logo.png',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  twitterTitle,
  twitterDescription,
  twitterImage,
  robots = 'index, follow',
  language = 'en-GB',
  hreflangLinks = [],
  schemas = [],
}: SchemaMetaProps) {
  
  const finalOgTitle = ogTitle || title;
  const finalOgDescription = ogDescription || description;
  const finalTwitterTitle = twitterTitle || title;
  const finalTwitterDescription = twitterDescription || description;
  const finalTwitterImage = twitterImage || ogImage;

  return (
    <Helmet>
      {/* Basic SEO */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={robots} />
      <meta httpEquiv="content-language" content={language} />
      
      {/* Open Graph */}
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="DelSol Prime Homes" />
      <meta property="og:locale" content="en_GB" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={finalTwitterTitle} />
      <meta name="twitter:description" content={finalTwitterDescription} />
      <meta name="twitter:image" content={finalTwitterImage} />
      
      {/* Hreflang tags */}
      {hreflangLinks.map((link) => (
        <link
          key={link.lang}
          rel="alternate"
          hrefLang={link.lang}
          href={link.url}
        />
      ))}
      
      {/* JSON-LD Schemas */}
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
