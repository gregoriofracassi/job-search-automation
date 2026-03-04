/**
 * Hardcoded LinkedIn job search URLs.
 * Each URL represents a specific job search query with filters applied.
 *
 * URL Parameters commonly used:
 * - keywords: Search keywords (e.g., "backend", "node.js")
 * - f_WT: Workplace type (2 = Remote, 1 = On-site, 3 = Hybrid)
 * - f_E: Experience level (2 = Entry, 3 = Mid-Senior, 4 = Director, 5 = Executive)
 * - f_JT: Job type (F = Full-time, P = Part-time, C = Contract, T = Temporary, I = Internship)
 * - location: Geographic location
 * - f_TPR: Time posted (r86400 = Past 24 hours, r604800 = Past week, r2592000 = Past month)
 */
export const LINKEDIN_SEARCH_URLS = [
  // Node.js - Remote - Europe (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4376997901&distance=25.0&f_TPR=r604800&f_WT=2&geoId=91000000&keywords=node%20js&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true',

  // Backend - Remote - Europe (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4376997901&distance=25.0&f_TPR=r604800&f_WT=2&geoId=91000000&keywords=backend&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true',

  // Node.js - Remote - United Kingdom (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4355961225&f_TPR=r604800&f_WT=2&geoId=100961908&keywords=node%20js&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true',

  // Node.js - Remote - Germany (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4377682819&f_TPR=r604800&f_WT=2&geoId=101282230&keywords=node%20js&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true',

  // Node.js - Remote - Netherlands (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4379719092&f_TPR=r604800&f_WT=2&geoId=106693272&keywords=node%20js&origin=JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE&refresh=true',

  // Node.js - Remote - Spain (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4375522579&f_TPR=r604800&f_WT=2&geoId=106774002&keywords=node%20js&origin=JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE&refresh=true',

  // Node.js - Remote - France (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4377679882&f_TPR=r604800&f_WT=2&geoId=105015875&keywords=node%20js&origin=JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE&refresh=true',

  // Node.js - Remote - Switzerland (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4378179204&f_TPR=r604800&f_WT=2&geoId=101165590&keywords=node%20js&origin=JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE&refresh=true',

  // Node.js - Remote - Sweden (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4379745861&f_TPR=r604800&f_WT=2&geoId=102890719&keywords=node%20js&origin=JOB_SEARCH_PAGE_LOCATION_AUTOCOMPLETE&refresh=true',

  // Node.js - Remote - Ireland (Past week)
  'https://www.linkedin.com/jobs/search/?currentJobId=4369828641&f_TPR=r604800&f_WT=2&geoId=100565514&keywords=node%20js&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true',
];
