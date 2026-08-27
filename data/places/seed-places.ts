/**
 * Curated seed gazetteer — birthplace lookup works offline out of the box.
 *
 * The full dataset is imported from a GeoNames export at build/admin time
 * (`npm run import-places`, see src_geonames attribution in the source
 * manifest). Coordinates are city-center approximations (±0.01° ≈ 1 km),
 * more than sufficient for natal house calculation. Timezones are current
 * IANA ids; historical offset rules come from the runtime tz database.
 */

export interface SeedPlace {
  id: string;
  name: string;
  admin: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  timezone: string;
  population: number;
}

type Row = [string, string, string, string, number, number, string, number];

const ROWS: Row[] = [
  // name, admin/region, countryCode, country, lat, lon, tz, population
  ["New York", "New York", "US", "United States", 40.71, -74.01, "America/New_York", 8804190],
  ["Los Angeles", "California", "US", "United States", 34.05, -118.24, "America/Los_Angeles", 3898747],
  ["Chicago", "Illinois", "US", "United States", 41.88, -87.63, "America/Chicago", 2746388],
  ["Houston", "Texas", "US", "United States", 29.76, -95.37, "America/Chicago", 2304580],
  ["Phoenix", "Arizona", "US", "United States", 33.45, -112.07, "America/Phoenix", 1608139],
  ["Philadelphia", "Pennsylvania", "US", "United States", 39.95, -75.17, "America/New_York", 1603797],
  ["San Antonio", "Texas", "US", "United States", 29.42, -98.49, "America/Chicago", 1434625],
  ["San Diego", "California", "US", "United States", 32.72, -117.16, "America/Los_Angeles", 1386932],
  ["Dallas", "Texas", "US", "United States", 32.78, -96.8, "America/Chicago", 1304379],
  ["Denver", "Colorado", "US", "United States", 39.74, -104.99, "America/Denver", 715522],
  ["Seattle", "Washington", "US", "United States", 47.61, -122.33, "America/Los_Angeles", 737015],
  ["Boston", "Massachusetts", "US", "United States", 42.36, -71.06, "America/New_York", 675647],
  ["Miami", "Florida", "US", "United States", 25.76, -80.19, "America/New_York", 442241],
  ["Atlanta", "Georgia", "US", "United States", 33.75, -84.39, "America/New_York", 498715],
  ["San Francisco", "California", "US", "United States", 37.77, -122.42, "America/Los_Angeles", 873965],
  ["Portland", "Oregon", "US", "United States", 45.52, -122.68, "America/Los_Angeles", 652503],
  ["Minneapolis", "Minnesota", "US", "United States", 44.98, -93.27, "America/Chicago", 429954],
  ["New Orleans", "Louisiana", "US", "United States", 29.95, -90.07, "America/Chicago", 383997],
  ["Honolulu", "Hawaii", "US", "United States", 21.31, -157.86, "Pacific/Honolulu", 350964],
  ["Anchorage", "Alaska", "US", "United States", 61.22, -149.9, "America/Anchorage", 291247],
  ["Washington", "District of Columbia", "US", "United States", 38.9, -77.04, "America/New_York", 689545],
  ["Detroit", "Michigan", "US", "United States", 42.33, -83.05, "America/Detroit", 639111],
  ["St. Louis", "Missouri", "US", "United States", 38.63, -90.2, "America/Chicago", 301578],
  ["Nashville", "Tennessee", "US", "United States", 36.16, -86.78, "America/Chicago", 689447],
  ["Salt Lake City", "Utah", "US", "United States", 40.76, -111.89, "America/Denver", 199723],
  ["Toronto", "Ontario", "CA", "Canada", 43.65, -79.38, "America/Toronto", 2794356],
  ["Montreal", "Quebec", "CA", "Canada", 45.5, -73.57, "America/Toronto", 1762949],
  ["Vancouver", "British Columbia", "CA", "Canada", 49.28, -123.12, "America/Vancouver", 662248],
  ["Calgary", "Alberta", "CA", "Canada", 51.05, -114.07, "America/Edmonton", 1306784],
  ["Winnipeg", "Manitoba", "CA", "Canada", 49.9, -97.14, "America/Winnipeg", 749607],
  ["Halifax", "Nova Scotia", "CA", "Canada", 44.65, -63.57, "America/Halifax", 439819],
  ["Mexico City", "Ciudad de México", "MX", "Mexico", 19.43, -99.13, "America/Mexico_City", 9209944],
  ["Guadalajara", "Jalisco", "MX", "Mexico", 20.67, -103.35, "America/Mexico_City", 1385629],
  ["Havana", "La Habana", "CU", "Cuba", 23.11, -82.37, "America/Havana", 2130081],
  ["San Juan", "Puerto Rico", "PR", "Puerto Rico", 18.47, -66.11, "America/Puerto_Rico", 342259],
  ["Buenos Aires", "Ciudad Autónoma", "AR", "Argentina", -34.6, -58.38, "America/Argentina/Buenos_Aires", 3075646],
  ["São Paulo", "São Paulo", "BR", "Brazil", -23.55, -46.63, "America/Sao_Paulo", 12325232],
  ["Rio de Janeiro", "Rio de Janeiro", "BR", "Brazil", -22.91, -43.17, "America/Sao_Paulo", 6747815],
  ["Lima", "Lima", "PE", "Peru", -12.05, -77.04, "America/Lima", 8852000],
  ["Bogotá", "Bogotá D.C.", "CO", "Colombia", 4.71, -74.07, "America/Bogota", 7412566],
  ["Santiago", "Región Metropolitana", "CL", "Chile", -33.45, -70.67, "America/Santiago", 5614000],
  ["Caracas", "Distrito Capital", "VE", "Venezuela", 10.49, -66.88, "America/Caracas", 2245744],
  ["London", "England", "GB", "United Kingdom", 51.51, -0.13, "Europe/London", 8961989],
  ["Manchester", "England", "GB", "United Kingdom", 53.48, -2.24, "Europe/London", 553230],
  ["Edinburgh", "Scotland", "GB", "United Kingdom", 55.95, -3.19, "Europe/London", 506520],
  ["Dublin", "Leinster", "IE", "Ireland", 53.35, -6.26, "Europe/Dublin", 592713],
  ["Paris", "Île-de-France", "FR", "France", 48.86, 2.35, "Europe/Paris", 2140526],
  ["Berlin", "Berlin", "DE", "Germany", 52.52, 13.41, "Europe/Berlin", 3769495],
  ["Munich", "Bavaria", "DE", "Germany", 48.14, 11.58, "Europe/Berlin", 1471508],
  ["Madrid", "Comunidad de Madrid", "ES", "Spain", 40.42, -3.7, "Europe/Madrid", 3223334],
  ["Barcelona", "Cataluña", "ES", "Spain", 41.39, 2.17, "Europe/Madrid", 1620343],
  ["Rome", "Lazio", "IT", "Italy", 41.89, 12.48, "Europe/Rome", 2872800],
  ["Milan", "Lombardy", "IT", "Italy", 45.46, 9.19, "Europe/Rome", 1396059],
  ["Amsterdam", "North Holland", "NL", "Netherlands", 52.37, 4.9, "Europe/Amsterdam", 872680],
  ["Brussels", "Brussels-Capital", "BE", "Belgium", 50.85, 4.35, "Europe/Brussels", 1208542],
  ["Vienna", "Vienna", "AT", "Austria", 48.21, 16.37, "Europe/Vienna", 1911191],
  ["Zurich", "Zurich", "CH", "Switzerland", 47.37, 8.54, "Europe/Zurich", 421878],
  ["Geneva", "Geneva", "CH", "Switzerland", 46.2, 6.15, "Europe/Zurich", 201818],
  ["Lisbon", "Lisboa", "PT", "Portugal", 38.72, -9.14, "Europe/Lisbon", 504718],
  ["Stockholm", "Stockholm", "SE", "Sweden", 59.33, 18.06, "Europe/Stockholm", 975551],
  ["Oslo", "Oslo", "NO", "Norway", 59.91, 10.75, "Europe/Oslo", 693494],
  ["Copenhagen", "Capital Region", "DK", "Denmark", 55.68, 12.57, "Europe/Copenhagen", 632340],
  ["Helsinki", "Uusimaa", "FI", "Finland", 60.17, 24.94, "Europe/Helsinki", 655281],
  ["Reykjavik", "Capital Region", "IS", "Iceland", 64.15, -21.94, "Atlantic/Reykjavik", 128793],
  ["Warsaw", "Masovian", "PL", "Poland", 52.23, 21.01, "Europe/Warsaw", 1790658],
  ["Prague", "Prague", "CZ", "Czechia", 50.09, 14.42, "Europe/Prague", 1301132],
  ["Budapest", "Budapest", "HU", "Hungary", 47.5, 19.04, "Europe/Budapest", 1752286],
  ["Athens", "Attica", "GR", "Greece", 37.98, 23.73, "Europe/Athens", 664046],
  ["Bucharest", "București", "RO", "Romania", 44.43, 26.1, "Europe/Bucharest", 1883425],
  ["Istanbul", "Istanbul", "TR", "Türkiye", 41.01, 28.98, "Europe/Istanbul", 15462452],
  ["Kyiv", "Kyiv", "UA", "Ukraine", 50.45, 30.52, "Europe/Kyiv", 2952301],
  ["Moscow", "Moscow", "RU", "Russia", 55.76, 37.62, "Europe/Moscow", 12506468],
  ["Cairo", "Cairo", "EG", "Egypt", 30.04, 31.24, "Africa/Cairo", 9539673],
  ["Lagos", "Lagos", "NG", "Nigeria", 6.52, 3.38, "Africa/Lagos", 14862000],
  ["Accra", "Greater Accra", "GH", "Ghana", 5.6, -0.19, "Africa/Accra", 2291352],
  ["Nairobi", "Nairobi", "KE", "Kenya", -1.29, 36.82, "Africa/Nairobi", 4397073],
  ["Addis Ababa", "Addis Ababa", "ET", "Ethiopia", 9.02, 38.75, "Africa/Addis_Ababa", 3352000],
  ["Johannesburg", "Gauteng", "ZA", "South Africa", -26.2, 28.05, "Africa/Johannesburg", 5635127],
  ["Cape Town", "Western Cape", "ZA", "South Africa", -33.92, 18.42, "Africa/Johannesburg", 4618000],
  ["Casablanca", "Casablanca-Settat", "MA", "Morocco", 33.57, -7.59, "Africa/Casablanca", 3359818],
  ["Jerusalem", "Jerusalem", "IL", "Israel", 31.77, 35.21, "Asia/Jerusalem", 936425],
  ["Tel Aviv", "Tel Aviv", "IL", "Israel", 32.08, 34.78, "Asia/Jerusalem", 460613],
  ["Beirut", "Beirut", "LB", "Lebanon", 33.89, 35.5, "Asia/Beirut", 361366],
  ["Baghdad", "Baghdad", "IQ", "Iraq", 33.32, 44.36, "Asia/Baghdad", 7511920],
  ["Riyadh", "Riyadh", "SA", "Saudi Arabia", 24.71, 46.68, "Asia/Riyadh", 7676654],
  ["Dubai", "Dubai", "AE", "United Arab Emirates", 25.2, 55.27, "Asia/Dubai", 3331420],
  ["Tehran", "Tehran", "IR", "Iran", 35.69, 51.39, "Asia/Tehran", 8693706],
  ["Karachi", "Sindh", "PK", "Pakistan", 24.86, 67.01, "Asia/Karachi", 14910352],
  ["Lahore", "Punjab", "PK", "Pakistan", 31.55, 74.34, "Asia/Karachi", 11126285],
  ["Mumbai", "Maharashtra", "IN", "India", 19.08, 72.88, "Asia/Kolkata", 12442373],
  ["Delhi", "Delhi", "IN", "India", 28.61, 77.21, "Asia/Kolkata", 16787941],
  ["Bengaluru", "Karnataka", "IN", "India", 12.97, 77.59, "Asia/Kolkata", 8443675],
  ["Kolkata", "West Bengal", "IN", "India", 22.57, 88.36, "Asia/Kolkata", 4496694],
  ["Dhaka", "Dhaka", "BD", "Bangladesh", 23.81, 90.41, "Asia/Dhaka", 8906039],
  ["Colombo", "Western", "LK", "Sri Lanka", 6.93, 79.85, "Asia/Colombo", 752993],
  ["Kathmandu", "Bagmati", "NP", "Nepal", 27.72, 85.32, "Asia/Kathmandu", 975453],
  ["Bangkok", "Bangkok", "TH", "Thailand", 13.76, 100.5, "Asia/Bangkok", 10539000],
  ["Singapore", "Singapore", "SG", "Singapore", 1.35, 103.82, "Asia/Singapore", 5850342],
  ["Kuala Lumpur", "Kuala Lumpur", "MY", "Malaysia", 3.14, 101.69, "Asia/Kuala_Lumpur", 1808000],
  ["Jakarta", "Jakarta", "ID", "Indonesia", -6.21, 106.85, "Asia/Jakarta", 10562088],
  ["Manila", "Metro Manila", "PH", "Philippines", 14.6, 120.98, "Asia/Manila", 1846513],
  ["Ho Chi Minh City", "Ho Chi Minh", "VN", "Vietnam", 10.82, 106.63, "Asia/Ho_Chi_Minh", 8993082],
  ["Hanoi", "Hanoi", "VN", "Vietnam", 21.03, 105.85, "Asia/Ho_Chi_Minh", 8053663],
  ["Hong Kong", "Hong Kong", "HK", "Hong Kong SAR", 22.32, 114.17, "Asia/Hong_Kong", 7482500],
  ["Taipei", "Taipei", "TW", "Taiwan", 25.03, 121.57, "Asia/Taipei", 2646204],
  ["Shanghai", "Shanghai", "CN", "China", 31.23, 121.47, "Asia/Shanghai", 24870895],
  ["Beijing", "Beijing", "CN", "China", 39.9, 116.41, "Asia/Shanghai", 21893095],
  ["Seoul", "Seoul", "KR", "South Korea", 37.57, 126.98, "Asia/Seoul", 9733509],
  ["Tokyo", "Tokyo", "JP", "Japan", 35.68, 139.69, "Asia/Tokyo", 13960236],
  ["Osaka", "Osaka", "JP", "Japan", 34.69, 135.5, "Asia/Tokyo", 2691185],
  ["Sydney", "New South Wales", "AU", "Australia", -33.87, 151.21, "Australia/Sydney", 5312163],
  ["Melbourne", "Victoria", "AU", "Australia", -37.81, 144.96, "Australia/Melbourne", 5078193],
  ["Brisbane", "Queensland", "AU", "Australia", -27.47, 153.03, "Australia/Brisbane", 2560720],
  ["Perth", "Western Australia", "AU", "Australia", -31.95, 115.86, "Australia/Perth", 2085973],
  ["Adelaide", "South Australia", "AU", "Australia", -34.93, 138.6, "Australia/Adelaide", 1345777],
  ["Auckland", "Auckland", "NZ", "New Zealand", -36.85, 174.76, "Pacific/Auckland", 1657000],
  ["Wellington", "Wellington", "NZ", "New Zealand", -41.29, 174.78, "Pacific/Auckland", 212700],
  ["Longyearbyen", "Svalbard", "SJ", "Svalbard & Jan Mayen", 78.22, 15.64, "Arctic/Longyearbyen", 2368],
];

function slug(name: string, countryCode: string): string {
  return (
    "seed:" +
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") +
    "_" +
    countryCode.toLowerCase()
  );
}

export const SEED_PLACES: SeedPlace[] = ROWS.map(
  ([name, admin, countryCode, country, lat, lon, timezone, population]) => ({
    id: slug(name, countryCode),
    name,
    admin,
    country,
    countryCode,
    lat,
    lon,
    timezone,
    population,
  }),
);
