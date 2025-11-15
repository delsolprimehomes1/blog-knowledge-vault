import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HreflangLink {
  lang: string;
  url: string;
}

interface HreflangResult {
  links: HreflangLink[];
  warnings: string[];
  isComplete: boolean;
  missingLanguages: string[];
}

interface UseHreflangOptions {
  pageType: 'home' | 'faq' | 'about' | 'blog-index' | 'blog-article' | 'case-studies' | 'qa';
  pageIdentifier?: string;
  currentLanguage?: string;
  currentSlug?: string;
  translations?: Record<string, string>;
  baseUrl?: string;
}

export function useHreflang({
  pageType,
  pageIdentifier,
  currentLanguage = 'en',
  currentSlug,
  translations = {},
  baseUrl = 'https://delsolprimehomes.com'
}: UseHreflangOptions): HreflangResult {
  
  const { data: languages } = useQuery({
    queryKey: ['site-languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_languages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  if (!languages) {
    return {
      links: [],
      warnings: ['Language configuration not loaded'],
      isComplete: false,
      missingLanguages: []
    };
  }

  const defaultLang = languages.find(l => l.is_default) || languages[0];
  const warnings: string[] = [];
  const missingLanguages: string[] = [];
  const links: HreflangLink[] = [];

  const generateUrl = (langCode: string, slug?: string): string => {
    // Find language data to get url_prefix
    const langData = languages.find(l => l.language_code === langCode);
    const prefix = langData?.url_prefix || `/${langCode}`;
    
    switch (pageType) {
      case 'home':
        return `${baseUrl}${prefix}`;
      case 'faq':
        return `${baseUrl}${prefix}/faq`;
      case 'about':
        return `${baseUrl}${prefix}/about`;
      case 'blog-index':
        return `${baseUrl}${prefix}/blog`;
      case 'blog-article':
        return `${baseUrl}${prefix}/blog/${slug}`;
      case 'case-studies':
        return `${baseUrl}${prefix}/case-studies`;
      case 'qa':
        return `${baseUrl}${prefix}/qa`;
      default:
        return `${baseUrl}${prefix}`;
    }
  };

  // Generate hreflang cluster ONLY for languages with actual translations
  if (pageType === 'blog-article' && currentSlug) {
    // ========================================
    // BLOG ARTICLES: Output ONLY existing translations
    // ========================================
    
    languages.forEach(lang => {
      const langCode = lang.language_code;
      
      if (langCode === currentLanguage) {
        // Current language - always include
        links.push({
          lang: lang.hreflang_code,
          url: generateUrl(langCode, currentSlug)
        });
      } else if (translations[langCode]) {
        // Translation exists - include it
        links.push({
          lang: lang.hreflang_code,
          url: generateUrl(langCode, translations[langCode])
        });
      } else {
        // No translation - skip this language (don't create 404 placeholder)
        missingLanguages.push(lang.language_name);
      }
    });
    
    // Add x-default only if default language has translation or is current
    if (currentLanguage === defaultLang.language_code) {
      links.push({
        lang: 'x-default',
        url: generateUrl(defaultLang.language_code, currentSlug)
      });
    } else if (translations[defaultLang.language_code]) {
      links.push({
        lang: 'x-default',
        url: generateUrl(defaultLang.language_code, translations[defaultLang.language_code])
      });
    }
    
    // Only show warnings if article is published with incomplete translations
    if (missingLanguages.length > 0) {
      warnings.push(`ℹ️ Missing translations: ${missingLanguages.join(', ')}`);
    }
    
  } else {
    // ========================================
    // STATIC PAGES: Output ALL languages
    // ========================================
    
    languages.forEach(lang => {
      links.push({
        lang: lang.hreflang_code,
        url: generateUrl(lang.language_code)
      });
    });
    
    // ALWAYS add x-default
    links.push({
      lang: 'x-default',
      url: generateUrl(defaultLang.language_code)
    });
    
    // Note for admin: static pages need translation
    if (languages.length > 1) {
      warnings.push(`ℹ️ Static page (${pageType}) - create translated versions at language-prefixed URLs`);
    }
  }

  const isComplete = missingLanguages.length === 0 && links.length >= 2;

  return {
    links,
    warnings,
    isComplete,
    missingLanguages
  };
}
