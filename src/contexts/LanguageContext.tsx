import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Language {
  code: string;
  name: string;
  hreflangCode: string;
  urlPrefix: string;
  isDefault: boolean;
  flag: string;
}

interface LanguageContextType {
  currentLanguage: string;
  availableLanguages: Language[];
  isLoading: boolean;
  switchLanguage: (lang: string) => void;
  getLanguageByCode: (code: string) => Language | undefined;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: string;
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage || 'en');

  const { data: languages, isLoading } = useQuery({
    queryKey: ['site-languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_languages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data.map(lang => ({
        code: lang.language_code,
        name: lang.language_name,
        hreflangCode: lang.hreflang_code,
        urlPrefix: lang.url_prefix || `/${lang.language_code}`,
        isDefault: lang.is_default || false,
        flag: lang.display_flag || '🌐',
      }));
    },
  });

  const availableLanguages = languages || [];

  useEffect(() => {
    if (initialLanguage) {
      setCurrentLanguage(initialLanguage);
      localStorage.setItem('preferred-language', initialLanguage);
    }
  }, [initialLanguage]);

  const switchLanguage = (lang: string) => {
    setCurrentLanguage(lang);
    localStorage.setItem('preferred-language', lang);
  };

  const getLanguageByCode = (code: string) => {
    return availableLanguages.find(lang => lang.code === code);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        availableLanguages,
        isLoading,
        switchLanguage,
        getLanguageByCode,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
