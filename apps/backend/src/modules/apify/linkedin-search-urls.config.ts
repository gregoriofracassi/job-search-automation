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
  // Backend jobs - Remote - Europe
  'https://www.linkedin.com/jobs/search/?currentJobId=4374254963&f_WT=2&keywords=backend&origin=JOB_SEARCH_PAGE_JOB_FILTER',

  // Add more URLs here as needed
  // Example: Node.js remote jobs
  // 'https://www.linkedin.com/jobs/search/?f_WT=2&keywords=node.js%20backend&origin=JOB_SEARCH_PAGE_JOB_FILTER',

  // Example: TypeScript remote jobs
  // 'https://www.linkedin.com/jobs/search/?f_WT=2&keywords=typescript%20backend&origin=JOB_SEARCH_PAGE_JOB_FILTER',
];
