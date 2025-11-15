import { useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function LanguageRouteWrapper() {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: languages } = useQuery({
    queryKey: ['site-languages-validation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_languages')
        .select('language_code')
        .eq('is_active', true);

      if (error) throw error;
      return data.map(l => l.language_code);
    },
  });

  useEffect(() => {
    if (languages && lang && !languages.includes(lang)) {
      // Invalid language code - redirect to English version of same path
      const pathWithoutLang = location.pathname.replace(`/${lang}`, '');
      const newPath = `/en${pathWithoutLang || ''}`;
      toast.error(`Language "${lang}" not available. Showing English version.`);
      navigate(newPath, { replace: true });
    }
  }, [lang, languages, navigate, location]);

  if (!lang) return null;

  return (
    <LanguageProvider initialLanguage={lang}>
      <Outlet />
    </LanguageProvider>
  );
}
