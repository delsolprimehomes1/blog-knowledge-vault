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

  const generateUrl = (lang: string, slug?: string): string => {
    switch (pageType) {
      case 'home':
        return `${baseUrl}/`;
      case 'faq':
        return `${baseUrl}/faq`;
      case 'about':
        return `${baseUrl}/about`;
      case 'blog-index':
        return `${baseUrl}/blog`;
      case 'blog-article':
        return `${baseUrl}/blog/${slug}`;
      case 'case-studies':
        return `${baseUrl}/case-studies`;
      case 'qa':
        return `${baseUrl}/qa`;
      default:
        return baseUrl;
    }
  };

  if (pageType === 'blog-article' && currentSlug) {
    const currentLangData = languages.find(l => l.language_code === currentLanguage);
    if (currentLangData) {
      links.push({
        lang: currentLangData.hreflang_code,
        url: generateUrl(currentLanguage, currentSlug)
      });
    }

    Object.entries(translations).forEach(([lang, slug]) => {
      const langData = languages.find(l => l.language_code === lang);
      if (langData) {
        links.push({
          lang: langData.hreflang_code,
          url: generateUrl(lang, slug)
        });
      }
    });

    languages.forEach(lang => {
      const hasTranslation = 
        lang.language_code === currentLanguage || 
        translations[lang.language_code];
      
      if (!hasTranslation) {
        missingLanguages.push(lang.language_name);
        warnings.push(`Missing ${lang.language_name} translation`);
      }
    });

    const defaultSlug = currentLanguage === defaultLang.language_code 
      ? currentSlug 
      : translations[defaultLang.language_code];
    
    if (defaultSlug) {
      links.push({
        lang: 'x-default',
        url: generateUrl(defaultLang.language_code, defaultSlug)
      });
    } else {
      warnings.push('x-default URL not available (missing default language translation)');
    }
  } else {
    links.push({
      lang: defaultLang.hreflang_code,
      url: generateUrl(defaultLang.language_code)
    });

    links.push({
      lang: 'x-default',
      url: generateUrl(defaultLang.language_code)
    });

    warnings.push(`Static page (${pageType}) - multilingual versions not yet implemented`);
  }

  const isComplete = missingLanguages.length === 0 && links.length >= 2;

  return {
    links,
    warnings,
    isComplete,
    missingLanguages
  };
}
