/**
 * Utility functions for company logos
 * Uses Clearbit Logo API (free, no API key required) with fallbacks
 */

// Common company logo mappings (for companies that might not be in Clearbit or for faster loading)
const COMPANY_LOGO_MAP: Record<string, string> = {
  "Google": "https://logo.clearbit.com/google.com",
  "Microsoft": "https://logo.clearbit.com/microsoft.com",
  "Amazon": "https://logo.clearbit.com/amazon.com",
  "Apple": "https://logo.clearbit.com/apple.com",
  "Meta": "https://logo.clearbit.com/meta.com",
  "Facebook": "https://logo.clearbit.com/facebook.com",
  "Netflix": "https://logo.clearbit.com/netflix.com",
  "Twitter": "https://logo.clearbit.com/twitter.com",
  "X": "https://logo.clearbit.com/x.com",
  "LinkedIn": "https://logo.clearbit.com/linkedin.com",
  "Uber": "https://logo.clearbit.com/uber.com",
  "Airbnb": "https://logo.clearbit.com/airbnb.com",
  "Stripe": "https://logo.clearbit.com/stripe.com",
  "Salesforce": "https://logo.clearbit.com/salesforce.com",
  "Oracle": "https://logo.clearbit.com/oracle.com",
  "IBM": "https://logo.clearbit.com/ibm.com",
  "Intel": "https://logo.clearbit.com/intel.com",
  "Nvidia": "https://logo.clearbit.com/nvidia.com",
  "Adobe": "https://logo.clearbit.com/adobe.com",
  "PayPal": "https://logo.clearbit.com/paypal.com",
  "Spotify": "https://logo.clearbit.com/spotify.com",
  "Tesla": "https://logo.clearbit.com/tesla.com",
  "Goldman Sachs": "https://logo.clearbit.com/goldmansachs.com",
  "JPMorgan": "https://logo.clearbit.com/jpmorgan.com",
  "Morgan Stanley": "https://logo.clearbit.com/morganstanley.com",
  "Bloomberg": "https://logo.clearbit.com/bloomberg.com",
  "Goldman": "https://logo.clearbit.com/goldmansachs.com",
  "JP Morgan": "https://logo.clearbit.com/jpmorgan.com",
};

/**
 * Get company logo URL
 * @param companyName - The name of the company
 * @returns Logo URL or null if not found
 */
export const getCompanyLogoUrl = (companyName: string | undefined | null): string | null => {
  if (!companyName) return null;

  const normalizedName = companyName.trim();
  
  // Check direct mapping first
  if (COMPANY_LOGO_MAP[normalizedName]) {
    return COMPANY_LOGO_MAP[normalizedName];
  }

  // Try to construct Clearbit URL from company name
  // Convert company name to domain (e.g., "Google" -> "google.com")
  const domain = normalizedName.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, ''); // Remove special characters
  
  if (domain) {
    return `https://logo.clearbit.com/${domain}.com`;
  }

  return null;
};

/**
 * Get company domain from name (for Clearbit API)
 */
const getCompanyDomain = (companyName: string): string | null => {
  const normalized = companyName.toLowerCase().trim();
  
  // Common mappings for companies with non-standard domains
  const domainMap: Record<string, string> = {
    "meta": "meta.com",
    "facebook": "facebook.com",
    "x": "x.com",
    "twitter": "twitter.com",
    "jp morgan": "jpmorgan.com",
    "jpmorgan": "jpmorgan.com",
    "goldman sachs": "goldmansachs.com",
    "goldman": "goldmansachs.com",
    "morgan stanley": "morganstanley.com",
  };

  if (domainMap[normalized]) {
    return domainMap[normalized];
  }

  // Try to guess domain
  const cleanName = normalized.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  return cleanName ? `${cleanName}.com` : null;
};

