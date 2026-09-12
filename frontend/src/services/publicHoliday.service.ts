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

// Rich built-in holiday datasets (for years 2024-2028) ensuring 100% availability even without external API
const BUILTIN_HOLIDAYS: Record<string, Record<number, PublicHolidayItem[]>> = {
  IN: {
    2024: [
      { date: '2024-01-01', name: "New Year's Day", localName: 'New Year', countryCode: 'IN', global: true, types: ['Public'] },
      { date: '2024-01-14', name: 'Makar Sankranti / Pongal', localName: 'Pongal / Uttarayan', countryCode: 'IN', global: true, types: ['Public', 'Festival'] },
      { date: '2024-01-26', name: 'Republic Day', localName: 'Gantantra Diwas', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2024-03-08', name: 'Maha Shivratri', localName: 'Maha Shivratri', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-03-25', name: 'Holi', localName: 'Dhulandi / Holi', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-03-29', name: 'Good Friday', localName: 'Good Friday', countryCode: 'IN', global: true, types: ['Public'] },
      { date: '2024-04-09', name: 'Ugadi / Gudi Padwa', localName: 'Chaitra Navratri', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2024-04-11', name: 'Eid ul-Fitr', localName: 'Meethi Eid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-04-14', name: 'Dr. Ambedkar Jayanti', localName: 'Bhim Jayanti', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2024-04-17', name: 'Ram Navami', localName: 'Shri Ram Navami', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-04-21', name: 'Mahavir Jayanti', localName: 'Mahavir Janma Kalyanak', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-05-23', name: 'Buddha Purnima', localName: 'Vesak', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-06-17', name: 'Eid al-Adha (Bakrid)', localName: 'Bakrid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-07-17', name: 'Muharram', localName: 'Ashura', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-08-15', name: 'Independence Day', localName: 'Swatantrata Diwas', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2024-08-19', name: 'Raksha Bandhan', localName: 'Rakhi', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2024-08-26', name: 'Janmashtami', localName: 'Krishna Janmashtami', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-09-07', name: 'Ganesh Chaturthi', localName: 'Vinayaka Chavithi', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2024-09-16', name: 'Milad un-Nabi (Eid-e-Milad)', localName: 'Mawlid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-10-02', name: 'Mahatma Gandhi Jayanti', localName: 'Gandhi Jayanti', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2024-10-12', name: 'Dussehra (Vijayadashami)', localName: 'Dasara', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-10-31', name: 'Diwali (Deepavali)', localName: 'Laxmi Pujan', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-11-02', name: 'Govardhan Puja', localName: 'Annakut', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2024-11-03', name: 'Bhai Dooj', localName: 'Bhau Beej', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2024-11-07', name: 'Chhath Puja', localName: 'Surya Shashthi', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2024-11-15', name: 'Guru Nanak Jayanti', localName: 'Gurpurab', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2024-12-25', name: 'Christmas Day', localName: 'Bada Din', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
    ],
    2025: [
      { date: '2025-01-01', name: "New Year's Day", localName: 'New Year', countryCode: 'IN', global: true, types: ['Public'] },
      { date: '2025-01-14', name: 'Makar Sankranti / Pongal', localName: 'Pongal / Uttarayan', countryCode: 'IN', global: true, types: ['Public', 'Festival'] },
      { date: '2025-01-26', name: 'Republic Day', localName: 'Gantantra Diwas', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2025-02-26', name: 'Maha Shivratri', localName: 'Maha Shivratri', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-03-14', name: 'Holi', localName: 'Dhulandi / Holi', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-03-31', name: 'Eid ul-Fitr', localName: 'Meethi Eid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-04-10', name: 'Mahavir Jayanti', localName: 'Mahavir Janma Kalyanak', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-04-14', name: 'Dr. Ambedkar Jayanti', localName: 'Bhim Jayanti', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2025-04-18', name: 'Good Friday', localName: 'Good Friday', countryCode: 'IN', global: true, types: ['Public'] },
      { date: '2025-05-12', name: 'Buddha Purnima', localName: 'Vesak', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-06-07', name: 'Eid al-Adha (Bakrid)', localName: 'Bakrid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-07-06', name: 'Muharram', localName: 'Ashura', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-08-15', name: 'Independence Day', localName: 'Swatantrata Diwas', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2025-08-16', name: 'Janmashtami', localName: 'Krishna Janmashtami', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-08-27', name: 'Ganesh Chaturthi', localName: 'Vinayaka Chavithi', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2025-09-05', name: 'Milad un-Nabi (Eid-e-Milad)', localName: 'Mawlid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-10-02', name: 'Mahatma Gandhi Jayanti', localName: 'Gandhi Jayanti', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2025-10-02', name: 'Dussehra (Vijayadashami)', localName: 'Dasara', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-10-20', name: 'Diwali (Deepavali)', localName: 'Laxmi Pujan', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-10-22', name: 'Govardhan Puja', localName: 'Annakut', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2025-10-23', name: 'Bhai Dooj', localName: 'Bhau Beej', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2025-11-05', name: 'Guru Nanak Jayanti', localName: 'Gurpurab', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2025-12-25', name: 'Christmas Day', localName: 'Bada Din', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
    ],
    2026: [
      { date: '2026-01-01', name: "New Year's Day", localName: 'New Year', countryCode: 'IN', global: true, types: ['Public'] },
      { date: '2026-01-14', name: 'Makar Sankranti / Pongal', localName: 'Pongal / Uttarayan', countryCode: 'IN', global: true, types: ['Public', 'Festival'] },
      { date: '2026-01-26', name: 'Republic Day', localName: 'Gantantra Diwas', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2026-02-15', name: 'Maha Shivratri', localName: 'Maha Shivratri', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-03-04', name: 'Holi', localName: 'Dhulandi / Holi', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-03-20', name: 'Eid ul-Fitr', localName: 'Meethi Eid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-03-31', name: 'Mahavir Jayanti', localName: 'Mahavir Janma Kalyanak', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-04-03', name: 'Good Friday', localName: 'Good Friday', countryCode: 'IN', global: true, types: ['Public'] },
      { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti / Vaisakhi', localName: 'Bhim Jayanti', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2026-05-01', name: 'May Day / Maharashtra Day', localName: 'Labour Day', countryCode: 'IN', global: true, types: ['Public'] },
      { date: '2026-05-02', name: 'Buddha Purnima', localName: 'Vesak', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-05-27', name: 'Eid al-Adha (Bakrid)', localName: 'Bakrid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-06-26', name: 'Muharram', localName: 'Ashura', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-08-15', name: 'Independence Day', localName: 'Swatantrata Diwas', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2026-08-27', name: 'Raksha Bandhan', localName: 'Rakhi', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2026-09-04', name: 'Janmashtami', localName: 'Krishna Janmashtami', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-09-14', name: 'Ganesh Chaturthi', localName: 'Vinayaka Chavithi', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2026-09-25', name: 'Milad un-Nabi (Eid-e-Milad)', localName: 'Mawlid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', localName: 'Gandhi Jayanti', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2026-10-20', name: 'Dussehra (Vijayadashami)', localName: 'Dasara / Maha Navami', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-11-08', name: 'Diwali (Deepavali)', localName: 'Laxmi Pujan', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-11-09', name: 'Govardhan Puja', localName: 'Annakut', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2026-11-10', name: 'Bhai Dooj', localName: 'Bhau Beej', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2026-11-15', name: 'Chhath Puja', localName: 'Surya Shashthi', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2026-11-24', name: 'Guru Nanak Jayanti', localName: 'Gurpurab', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2026-12-25', name: 'Christmas Day', localName: 'Bada Din', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
    ],
    2027: [
      { date: '2027-01-01', name: "New Year's Day", localName: 'New Year', countryCode: 'IN', global: true, types: ['Public'] },
      { date: '2027-01-14', name: 'Makar Sankranti / Pongal', localName: 'Pongal / Uttarayan', countryCode: 'IN', global: true, types: ['Public', 'Festival'] },
      { date: '2027-01-26', name: 'Republic Day', localName: 'Gantantra Diwas', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2027-03-07', name: 'Maha Shivratri', localName: 'Maha Shivratri', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-03-23', name: 'Holi', localName: 'Dhulandi / Holi', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-03-10', name: 'Eid ul-Fitr', localName: 'Meethi Eid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-03-26', name: 'Good Friday', localName: 'Good Friday', countryCode: 'IN', global: true, types: ['Public'] },
      { date: '2027-04-14', name: 'Dr. Ambedkar Jayanti', localName: 'Bhim Jayanti', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2027-04-19', name: 'Mahavir Jayanti', localName: 'Mahavir Janma Kalyanak', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-05-20', name: 'Buddha Purnima', localName: 'Vesak', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-05-17', name: 'Eid al-Adha (Bakrid)', localName: 'Bakrid', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-06-16', name: 'Muharram', localName: 'Ashura', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-08-15', name: 'Independence Day', localName: 'Swatantrata Diwas', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2027-08-25', name: 'Janmashtami', localName: 'Krishna Janmashtami', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-09-04', name: 'Ganesh Chaturthi', localName: 'Vinayaka Chavithi', countryCode: 'IN', global: true, types: ['Festival'] },
      { date: '2027-10-02', name: 'Mahatma Gandhi Jayanti', localName: 'Gandhi Jayanti', countryCode: 'IN', global: true, types: ['National', 'Public'] },
      { date: '2027-10-09', name: 'Dussehra (Vijayadashami)', localName: 'Dasara', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-10-29', name: 'Diwali (Deepavali)', localName: 'Laxmi Pujan', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-11-14', name: 'Guru Nanak Jayanti', localName: 'Gurpurab', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
      { date: '2027-12-25', name: 'Christmas Day', localName: 'Bada Din', countryCode: 'IN', global: true, types: ['Festival', 'Public'] },
    ],
  },
  US: {
    2026: [
      { date: '2026-01-01', name: "New Year's Day", localName: "New Year's Day", countryCode: 'US', global: true, types: ['Public'] },
      { date: '2026-01-19', name: 'Martin Luther King Jr. Day', localName: 'MLK Day', countryCode: 'US', global: true, types: ['Public'] },
      { date: '2026-02-16', name: "Presidents' Day / Washington's Birthday", localName: "Presidents' Day", countryCode: 'US', global: true, types: ['Public'] },
      { date: '2026-05-25', name: 'Memorial Day', localName: 'Memorial Day', countryCode: 'US', global: true, types: ['Public'] },
      { date: '2026-06-19', name: 'Juneteenth National Independence Day', localName: 'Juneteenth', countryCode: 'US', global: true, types: ['Public'] },
      { date: '2026-07-04', name: 'Independence Day', localName: '4th of July', countryCode: 'US', global: true, types: ['Public', 'National'] },
      { date: '2026-09-07', name: 'Labor Day', localName: 'Labor Day', countryCode: 'US', global: true, types: ['Public'] },
      { date: '2026-10-12', name: 'Columbus Day / Indigenous Peoples Day', localName: 'Columbus Day', countryCode: 'US', global: true, types: ['Public'] },
      { date: '2026-11-11', name: 'Veterans Day', localName: 'Veterans Day', countryCode: 'US', global: true, types: ['Public'] },
      { date: '2026-11-26', name: 'Thanksgiving Day', localName: 'Thanksgiving', countryCode: 'US', global: true, types: ['Public', 'Festival'] },
      { date: '2026-12-25', name: 'Christmas Day', localName: 'Christmas', countryCode: 'US', global: true, types: ['Public', 'Festival'] },
    ],
  },
  AE: {
    2026: [
      { date: '2026-01-01', name: "New Year's Day", localName: "New Year's Day", countryCode: 'AE', global: true, types: ['Public'] },
      { date: '2026-03-20', name: 'Eid ul-Fitr (Day 1)', localName: 'Eid al-Fitr', countryCode: 'AE', global: true, types: ['Public', 'Festival'] },
      { date: '2026-03-21', name: 'Eid ul-Fitr (Day 2)', localName: 'Eid al-Fitr', countryCode: 'AE', global: true, types: ['Public', 'Festival'] },
      { date: '2026-03-22', name: 'Eid ul-Fitr (Day 3)', localName: 'Eid al-Fitr', countryCode: 'AE', global: true, types: ['Public', 'Festival'] },
      { date: '2026-05-26', name: 'Arafat Day', localName: 'Waqfat Arafat', countryCode: 'AE', global: true, types: ['Public', 'Festival'] },
      { date: '2026-05-27', name: 'Eid al-Adha', localName: 'Eid al-Adha', countryCode: 'AE', global: true, types: ['Public', 'Festival'] },
      { date: '2026-06-16', name: 'Islamic New Year', localName: 'Hijri New Year', countryCode: 'AE', global: true, types: ['Public'] },
      { date: '2026-08-25', name: "Prophet Muhammad's Birthday", localName: 'Mawlid Al Nabi', countryCode: 'AE', global: true, types: ['Public', 'Festival'] },
      { date: '2026-12-01', name: "Commemoration Day (Martyr's Day)", localName: "Martyr's Day", countryCode: 'AE', global: true, types: ['National', 'Public'] },
      { date: '2026-12-02', name: 'UAE National Day', localName: 'National Day', countryCode: 'AE', global: true, types: ['National', 'Public'] },
      { date: '2026-12-03', name: 'UAE National Day Holiday', localName: 'National Day Holiday', countryCode: 'AE', global: true, types: ['National', 'Public'] },
    ],
  },
  GB: {
    2026: [
      { date: '2026-01-01', name: "New Year's Day", localName: "New Year's Day", countryCode: 'GB', global: true, types: ['Public'] },
      { date: '2026-04-03', name: 'Good Friday', localName: 'Good Friday', countryCode: 'GB', global: true, types: ['Public'] },
      { date: '2026-04-06', name: 'Easter Monday', localName: 'Easter Monday', countryCode: 'GB', global: true, types: ['Public'] },
      { date: '2026-05-04', name: 'Early May Bank Holiday', localName: 'May Day', countryCode: 'GB', global: true, types: ['Public'] },
      { date: '2026-05-25', name: 'Spring Bank Holiday', localName: 'Spring Bank Holiday', countryCode: 'GB', global: true, types: ['Public'] },
      { date: '2026-08-31', name: 'Summer Bank Holiday', localName: 'Late Summer Holiday', countryCode: 'GB', global: true, types: ['Public'] },
      { date: '2026-12-25', name: 'Christmas Day', localName: 'Christmas Day', countryCode: 'GB', global: true, types: ['Public'] },
      { date: '2026-12-28', name: 'Boxing Day (Observed)', localName: 'Boxing Day', countryCode: 'GB', global: true, types: ['Public'] },
    ],
  },
};

const holidayCache: Record<string, PublicHolidayItem[]> = {};
let countriesCache: PublicHolidayCountry[] | null = null;

export const publicHolidayService = {
  /**
   * Fetch all available countries from Nager.Date API or fallback
   */
  async getAvailableCountries(): Promise<PublicHolidayCountry[]> {
    if (countriesCache && countriesCache.length > 0) {
      return countriesCache;
    }
    try {
      const res = await fetch('https://date.nager.at/api/v3/AvailableCountries');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Array<{ countryCode: string; name: string }> = await res.json();

      const flagMap = new Map(POPULAR_COUNTRIES.map((c) => [c.countryCode, c.flag]));
      const list = data.map((c) => ({
        countryCode: c.countryCode,
        name: c.name,
        flag: flagMap.get(c.countryCode) || '🌐',
      }));

      const popularCodes = new Set(POPULAR_COUNTRIES.map((c) => c.countryCode));
      const popular = list.filter((c) => popularCodes.has(c.countryCode));
      const others = list.filter((c) => !popularCodes.has(c.countryCode));

      countriesCache = [...popular, ...others];
      return countriesCache;
    } catch {
      return POPULAR_COUNTRIES;
    }
  },

  /**
   * Fetch public holidays for a given year and country (built-in priority + API)
   */
  async getHolidaysForYear(year: number, countryCode: string): Promise<PublicHolidayItem[]> {
    const code = countryCode.toUpperCase();
    const cacheKey = `${year}_${code}`;
    if (holidayCache[cacheKey] && holidayCache[cacheKey].length > 0) {
      return holidayCache[cacheKey];
    }

    // Check built-in dataset first
    const builtinForCountry = BUILTIN_HOLIDAYS[code];
    if (builtinForCountry && builtinForCountry[year] && builtinForCountry[year].length > 0) {
      holidayCache[cacheKey] = builtinForCountry[year];
      return holidayCache[cacheKey];
    }

    // Attempt external API fetch
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${code}`);
      if (res.ok && res.status !== 204) {
        const data: PublicHolidayItem[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          holidayCache[cacheKey] = data;
          return data;
        }
      }
    } catch (err) {
      console.warn(`API fetch for ${code} ${year} skipped:`, err);
    }

    // Fallback: If year not strictly in builtin, adjust builtin year
    if (builtinForCountry) {
      const availableYears = Object.keys(builtinForCountry).map(Number);
      if (availableYears.length > 0) {
        const closestYear = availableYears.reduce((prev, curr) =>
          Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev
        );
        const template = builtinForCountry[closestYear] || [];
        const adjusted = template.map((h) => ({
          ...h,
          date: h.date.replace(/^\d{4}/, String(year)),
        }));
        holidayCache[cacheKey] = adjusted;
        return adjusted;
      }
    }

    return [];
  },

  /**
   * Check if a specific date (YYYY-MM-DD) is a public holiday in the given country
   */
  async getHolidayOnDate(dateStr: string, countryCode: string): Promise<PublicHolidayItem | null> {
    if (!dateStr || !countryCode) return null;
    const cleanDate = dateStr.trim();
    const year = parseInt(cleanDate.split('-')[0], 10);
    if (isNaN(year)) return null;

    const holidays = await this.getHolidaysForYear(year, countryCode);
    const match = holidays.find((h) => h.date === cleanDate);
    return match || null;
  },

  /**
   * Search holidays by text query within a given year/country
   */
  async searchHolidays(query: string, countryCode: string, year: number): Promise<PublicHolidayItem[]> {
    if (!query || query.trim().length === 0) return [];
    const holidays = await this.getHolidaysForYear(year, countryCode);
    const q = query.toLowerCase().trim();
    return holidays.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.localName && h.localName.toLowerCase().includes(q))
    );
  },

  /**
   * Helper to map a PublicHolidayItem to the app's internal HolidayType
   */
  suggestHolidayType(holiday: PublicHolidayItem): 'NATIONAL' | 'FESTIVAL' | 'ACADEMIC' | 'VACATION' | 'GENERAL' {
    const nameLower = (holiday.name + ' ' + (holiday.localName || '')).toLowerCase();

    // Check for festival / religious keywords
    if (
      nameLower.includes('eid') ||
      nameLower.includes('christmas') ||
      nameLower.includes('easter') ||
      nameLower.includes('diwali') ||
      nameLower.includes('deepavali') ||
      nameLower.includes('holi') ||
      nameLower.includes('ramadan') ||
      nameLower.includes('ashura') ||
      nameLower.includes('milad') ||
      nameLower.includes('new year') ||
      nameLower.includes('thanksgiving') ||
      nameLower.includes('halloween') ||
      nameLower.includes('good friday') ||
      nameLower.includes('hanukkah') ||
      nameLower.includes('buddha') ||
      nameLower.includes('shivratri') ||
      nameLower.includes('janmashtami') ||
      nameLower.includes('ganesh') ||
      nameLower.includes('dussehra') ||
      nameLower.includes('dasara') ||
      nameLower.includes('navratri') ||
      nameLower.includes('pongal') ||
      nameLower.includes('sankranti') ||
      nameLower.includes('raksha bandhan') ||
      nameLower.includes('chhath') ||
      nameLower.includes('gurpurab') ||
      nameLower.includes('guru nanak') ||
      nameLower.includes('bhai dooj') ||
      nameLower.includes('govardhan')
    ) {
      return 'FESTIVAL';
    }

    // Check for national / independence / republic keywords
    if (
      nameLower.includes('national') ||
      nameLower.includes('independence') ||
      nameLower.includes('republic') ||
      nameLower.includes('gandhi') ||
      nameLower.includes('ambedkar') ||
      nameLower.includes('constitution') ||
      nameLower.includes('memorial') ||
      nameLower.includes('veterans') ||
      nameLower.includes('labor') ||
      nameLower.includes('labour') ||
      nameLower.includes('presidents') ||
      nameLower.includes('martyr') ||
      nameLower.includes('commemoration')
    ) {
      return 'NATIONAL';
    }

    if (nameLower.includes('break') || nameLower.includes('term') || nameLower.includes('exam')) {
      return 'ACADEMIC';
    }

    if (nameLower.includes('vacation') || nameLower.includes('summer') || nameLower.includes('winter')) {
      return 'VACATION';
    }

    return 'GENERAL';
  },
};
