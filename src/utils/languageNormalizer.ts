/**
 * Language code normalization utilities for multilingual support.
 * Handles ISO-639-3 to BCP-47 conversion and dialect stripping.
 */

// Comprehensive ISO-639-3 to BCP-47 mapping
const iso3ToBcp47: Record<string, string> = {
  // Major languages
  'eng': 'en',
  'spa': 'es',
  'fra': 'fr',
  'deu': 'de',
  'ita': 'it',
  'por': 'pt',
  'rus': 'ru',
  'jpn': 'ja',
  'kor': 'ko',
  'ara': 'ar',
  'hin': 'hi',
  'ben': 'bn',
  'cmn': 'zh-Hans', // Chinese Mandarin
  'yue': 'zh-Hant', // Chinese Cantonese

  // Additional common languages from franc-min
  'tur': 'tr',  // Turkish
  'ind': 'id',  // Indonesian
  'fas': 'fa',  // Persian
  'pol': 'pl',  // Polish
  'ukr': 'uk',  // Ukrainian
  'ron': 'ro',  // Romanian
  'tha': 'th',  // Thai
  'vie': 'vi',  // Vietnamese
  'heb': 'he',  // Hebrew
  'ell': 'el',  // Greek
  'nld': 'nl',  // Dutch
  'swe': 'sv',  // Swedish
  'ces': 'cs',  // Czech
  'dan': 'da',  // Danish
  'fin': 'fi',  // Finnish
  'hun': 'hu',  // Hungarian
  'nor': 'no',  // Norwegian
  'cat': 'ca',  // Catalan
  'hrv': 'hr',  // Croatian
  'slk': 'sk',  // Slovak
  'bul': 'bg',  // Bulgarian
  'lit': 'lt',  // Lithuanian
  'slv': 'sl',  // Slovenian
  'lav': 'lv',  // Latvian
  'est': 'et',  // Estonian
  'isl': 'is',  // Icelandic
  'gle': 'ga',  // Irish
  'msa': 'ms',  // Malay
  'fil': 'tl',  // Filipino
  'swa': 'sw',  // Swahili
  'afr': 'af',  // Afrikaans
  'zul': 'zu',  // Zulu
  'xho': 'xh',  // Xhosa
  'amh': 'am',  // Amharic
  'kaz': 'kk',  // Kazakh
  'uzb': 'uz',  // Uzbek
  'mon': 'mn',  // Mongolian
  'nep': 'ne',  // Nepali
  'sin': 'si',  // Sinhala
  'tam': 'ta',  // Tamil
  'tel': 'te',  // Telugu
  'mal': 'ml',  // Malayalam
  'kan': 'kn',  // Kannada
  'guj': 'gu',  // Gujarati
  'pan': 'pa',  // Punjabi
  'mar': 'mr',  // Marathi
  'urd': 'ur',  // Urdu
  'pus': 'ps',  // Pashto
  'kur': 'ku',  // Kurdish
  'aze': 'az',  // Azerbaijani
  'kat': 'ka',  // Georgian
  'hye': 'hy',  // Armenian
  'khm': 'km',  // Khmer
  'lao': 'lo',  // Lao
  'mya': 'my',  // Burmese
  'bod': 'bo',  // Tibetan
};

/**
 * Normalize an ISO-639-3 code to BCP-47 format.
 * Also handles already-normalized BCP-47 codes (e.g., 'en', 'en-US').
 *
 * @param code - Language code in any format (ISO-639-3, ISO-639-1, or BCP-47)
 * @returns Normalized BCP-47 code (e.g., 'en', 'zh-Hans')
 *
 * @example
 * normalizeLanguageCode('eng') // 'en'
 * normalizeLanguageCode('en-US') // 'en'
 * normalizeLanguageCode('cmn') // 'zh-Hans'
 * normalizeLanguageCode('tur') // 'tr'
 */
export function normalizeLanguageCode(code: string | undefined): string {
  if (!code) return 'en';

  const normalized = code.toLowerCase().trim();

  // If it's a 3-letter ISO-639-3 code, convert it
  if (iso3ToBcp47[normalized]) {
    return iso3ToBcp47[normalized];
  }

  // If it's already a 2-letter or BCP-47 code, extract base language
  const base = normalized.split('-')[0];
  return base || 'en';
}

/**
 * Normalize language code for AI prompts (strips all dialects).
 * Use this when generating prompts to avoid confusion like "Generate in EN-US".
 *
 * @param code - Language code in any format
 * @returns Base language code without dialect (e.g., 'en', 'zh')
 *
 * @example
 * normalizeForPrompt('en-US') // 'en'
 * normalizeForPrompt('zh-Hans') // 'zh'
 * normalizeForPrompt('fra') // 'fr'
 */
export function normalizeForPrompt(code: string | undefined): string {
  const normalized = normalizeLanguageCode(code);
  // Strip any remaining dialect tags
  return normalized.split('-')[0];
}

/**
 * Convert a base language code to a BCP-47 STT code (for Speech-to-Text).
 * Adds region codes required by Google STT API.
 *
 * @param code - Base language code (e.g., 'en', 'es', 'zh')
 * @returns BCP-47 code with region (e.g., 'en-US', 'es-ES', 'zh-CN')
 *
 * @example
 * toSttCode('en') // 'en-US'
 * toSttCode('es') // 'es-ES'
 * toSttCode('zh') // 'zh-CN'
 */
export function toSttCode(code: string | undefined): string {
  const base = normalizeForPrompt(code);

  // Map base codes to STT-friendly BCP-47 with regions
  const sttMap: Record<string, string> = {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-BR',
    'ru': 'ru-RU',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'zh': 'zh-CN',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'tr': 'tr-TR',
    'id': 'id-ID',
    'fa': 'fa-IR',
    'pl': 'pl-PL',
    'uk': 'uk-UA',
    'ro': 'ro-RO',
    'th': 'th-TH',
    'vi': 'vi-VN',
    'he': 'he-IL',
    'el': 'el-GR',
    'nl': 'nl-NL',
    'sv': 'sv-SE',
    'cs': 'cs-CZ',
    'da': 'da-DK',
    'fi': 'fi-FI',
    'hu': 'hu-HU',
    'no': 'no-NO',
  };

  return sttMap[base] || `${base}-${base.toUpperCase()}`;
}

/**
 * Check if two language codes refer to the same base language.
 * Useful for comparing detected vs. expected languages.
 *
 * @param code1 - First language code
 * @param code2 - Second language code
 * @returns true if both codes refer to the same base language
 *
 * @example
 * isSameLanguage('en', 'en-US') // true
 * isSameLanguage('eng', 'en-GB') // true
 * isSameLanguage('en', 'es') // false
 */
export function isSameLanguage(code1: string | undefined, code2: string | undefined): boolean {
  const base1 = normalizeForPrompt(code1);
  const base2 = normalizeForPrompt(code2);
  return base1 === base2;
}
