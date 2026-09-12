export interface PublicHolidayItem {
  date: string; // YYYY-MM-DD
  localName: string;
  name: string;
  countryCode: string;
  global: boolean;
  counties?: string[] | null;
  launchYear?: number | null;
  types: string[]; // e.g. ["Public", "Bank", "Observance", "School", "Optional"]
}

export interface PublicHolidayCountry {
  countryCode: string;
  name: string;
  flag?: string;
}

// Curated list of popular countries with flags (India default top)
export const POPULAR_COUNTRIES: PublicHolidayCountry[] = [
  { countryCode: 'IN', name: 'India', flag: '🇮🇳' },
  { countryCode: 'US', name: 'United States', flag: '🇺🇸' },
  { countryCode: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { countryCode: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { countryCode: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { countryCode: 'CA', name: 'Canada', flag: '🇨🇦' },
  { countryCode: 'AU', name: 'Australia', flag: '🇦🇺' },
  { countryCode: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { countryCode: 'DE', name: 'Germany', flag: '🇩🇪' },
  { countryCode: 'FR', name: 'France', flag: '🇫🇷' },
  { countryCode: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { countryCode: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { countryCode: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { countryCode: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { countryCode: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { countryCode: 'TR', name: 'Türkiye', flag: '🇹🇷' },
  { countryCode: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { countryCode: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { countryCode: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { countryCode: 'OM', name: 'Oman', flag: '🇴🇲' },
  { countryCode: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { countryCode: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { countryCode: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { countryCode: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { countryCode: 'IT', name: 'Italy', flag: '🇮🇹' },
  { countryCode: 'ES', name: 'Spain', flag: '🇪🇸' },
  { countryCode: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { countryCode: 'CN', name: 'China', flag: '🇨🇳' },
  { countryCode: 'JP', name: 'Japan', flag: '🇯🇵' },
];

const holidayCache: Record<string, PublicHolidayItem[]> = {};
let countriesCache: PublicHolidayCountry[] | null = null;

export const publicHolidayService = {
  /**
   * Fetch all available countries from Nager.Date API
   */
  async getAvailableCountries(): Promise<PublicHolidayCountry[]> {
    if (countriesCache && countriesCache.length > 0) {
      return countriesCache;
    }
    try {
      const res = await fetch('https://date.nager.at/api/v3/AvailableCountries');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Array<{ countryCode: string; name: string }> = await res.json();
      
      // Merge with flags from POPULAR_COUNTRIES if available
      const flagMap = new Map(POPULAR_COUNTRIES.map((c) => [c.countryCode, c.flag]));
      const list = data.map((c) => ({
        countryCode: c.countryCode,
        name: c.name,
        flag: flagMap.get(c.countryCode) || '🌐',
      }));

      // Sort popular countries to top
      const popularCodes = new Set(POPULAR_COUNTRIES.map((c) => c.countryCode));
      const popular = list.filter((c) => popularCodes.has(c.countryCode));
      const others = list.filter((c) => !popularCodes.has(c.countryCode));

      countriesCache = [...popular, ...others];
      return countriesCache;
    } catch (err) {
      console.warn('Failed to load countries from Nager.Date API, using fallback list', err);
      return POPULAR_COUNTRIES;
    }
  },

  /**
   * Fetch public holidays for a given year and country
   */
  async getHolidaysForYear(year: number, countryCode: string): Promise<PublicHolidayItem[]> {
    const cacheKey = `${year}_${countryCode.toUpperCase()}`;
    if (holidayCache[cacheKey]) {
      return holidayCache[cacheKey];
    }

    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(`HTTP ${res.status}`);
      }
      const data: PublicHolidayItem[] = await res.json();
      holidayCache[cacheKey] = data || [];
      return holidayCache[cacheKey];
    } catch (err) {
      console.warn(`Failed to fetch public holidays for ${countryCode} in ${year}:`, err);
      return [];
    }
  },

  /**
   * Check if a specific date (YYYY-MM-DD) is a public holiday in the given country
   */
  async getHolidayOnDate(dateStr: string, countryCode: string): Promise<PublicHolidayItem | null> {
    if (!dateStr || !countryCode) return null;
    const year = parseInt(dateStr.split('-')[0], 10);
    if (isNaN(year)) return null;

    const holidays = await this.getHolidaysForYear(year, countryCode);
    const match = holidays.find((h) => h.date === dateStr);
    return match || null;
  },

  /**
   * Helper to map a PublicHolidayItem to the app's internal HolidayType
   */
  suggestHolidayType(holiday: PublicHolidayItem): 'NATIONAL' | 'FESTIVAL' | 'GENERAL' {
    const nameLower = (holiday.name + ' ' + holiday.localName).toLowerCase();
    
    // Check for festival / religious keywords
    if (
      nameLower.includes('eid') ||
      nameLower.includes('christmas') ||
      nameLower.includes('easter') ||
      nameLower.includes('diwali') ||
      nameLower.includes('holi') ||
      nameLower.includes('ramadan') ||
      nameLower.includes('ashura') ||
      nameLower.includes('milad') ||
      nameLower.includes('new year') ||
      nameLower.includes('thanksgiving') ||
      nameLower.includes('halloween') ||
      nameLower.includes('good friday') ||
      nameLower.includes('hanukkah') ||
      nameLower.includes('buddha')
    ) {
      return 'FESTIVAL';
    }

    // Check for national / independence / republic keywords
    if (
      nameLower.includes('national') ||
      nameLower.includes('independence') ||
      nameLower.includes('republic') ||
      nameLower.includes('constitution') ||
      nameLower.includes('revolution') ||
      nameLower.includes('liberation') ||
      nameLower.includes('pakistan day') ||
      nameLower.includes('defense day') ||
      nameLower.includes('quaid') ||
      nameLower.includes('allama iqbal') ||
      nameLower.includes('memorial') ||
      nameLower.includes('veterans') ||
      nameLower.includes('labor') ||
      nameLower.includes('labour') ||
      nameLower.includes('presidents') ||
      nameLower.includes('monarchy') ||
      nameLower.includes('king') ||
      nameLower.includes('queen')
    ) {
      return 'NATIONAL';
    }

    return 'GENERAL';
  },
};
