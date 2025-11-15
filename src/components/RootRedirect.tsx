import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function RootRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check localStorage for saved preference
    const savedLanguage = localStorage.getItem('preferred-language');
    
    if (savedLanguage) {
      navigate(`/${savedLanguage}`, { replace: true });
      return;
    }

    // Check browser language
    const browserLang = navigator.language || navigator.languages?.[0];
    const langCode = browserLang?.split('-')[0] || 'en';

    // Map to supported languages (en-GB → en, de-DE → de, etc.)
    const supportedLanguages = ['en', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu'];
    const detectedLang = supportedLanguages.includes(langCode) ? langCode : 'en';

    navigate(`/${detectedLang}`, { replace: true });
  }, [navigate]);

  return null;
}
