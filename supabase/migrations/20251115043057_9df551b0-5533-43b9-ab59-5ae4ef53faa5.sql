-- Add url_prefix column to site_languages table and populate with language-specific prefixes
ALTER TABLE site_languages ADD COLUMN IF NOT EXISTS url_prefix text;

-- Update each language with its correct URL prefix
UPDATE site_languages SET url_prefix = '/en' WHERE language_code = 'en';
UPDATE site_languages SET url_prefix = '/de' WHERE language_code = 'de';
UPDATE site_languages SET url_prefix = '/nl' WHERE language_code = 'nl';
UPDATE site_languages SET url_prefix = '/fr' WHERE language_code = 'fr';
UPDATE site_languages SET url_prefix = '/pl' WHERE language_code = 'pl';
UPDATE site_languages SET url_prefix = '/sv' WHERE language_code = 'sv';
UPDATE site_languages SET url_prefix = '/da' WHERE language_code = 'da';
UPDATE site_languages SET url_prefix = '/hu' WHERE language_code = 'hu';