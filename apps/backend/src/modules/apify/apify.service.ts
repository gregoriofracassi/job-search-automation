import { Injectable, Logger } from '@nestjs/common';
import { ApifyClient } from 'apify-client';
import { LinkedinJobResponseDto } from './dto/responses/linkedin-job.response.dto';
import { ApifyRunFailedException } from './exceptions/apify-run-failed.exception';

const ACTOR_ID = 'curious_coder/linkedin-jobs-search-scraper';

interface LinkedinCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export interface LinkedinScrapeInput {
  searchUrl: string; // Single LinkedIn search URL (required)
  cookies: LinkedinCookie[]; // LinkedIn auth cookies (required)
  userAgent: string; // User agent string (required)
  proxy: {
    // Proxy configuration (required)
    useApifyProxy: boolean;
    apifyProxyCountry?: string; // Choose country where you're logged into LinkedIn
  };
  count?: number; // Total number of records to scrape (optional, leave empty for all)
  scrapeJobDetails?: boolean; // Scrape benefits, hiring team, company info (slower, default: false)
  scrapeSkills?: boolean; // Scrape skills requirements (slower, default: false)
  scrapeCompany?: boolean; // Scrape company details (slower, default: false)
}

@Injectable()
export class ApifyService {
  private readonly logger = new Logger(ApifyService.name);
  private readonly client: ApifyClient;

  /**
   * LinkedIn cookies (li_at, JSESSIONID, etc.) required for authentication.
   * These should be refreshed periodically as they expire.
   *
   * IMPORTANT: The __cf_bm cookie expires after 30 minutes, so cookies
   * should be exported fresh before each scraping run.
   *
   * To export cookies:
   * 1. Install a cookie export extension (e.g., Cookie-Editor, EditThisCookie)
   * 2. Navigate to https://www.linkedin.com
   * 3. Export cookies as JSON
   * 4. Update this array with the fresh cookies
   */
  private readonly LINKEDIN_COOKIES: LinkedinCookie[] = [
    {
      name: 'li_at',
      value:
        'AQEFARa7LKQEhk_ZAAABlxh-cE0AAAGXPIroTU4AIowDUgNXn8VrBPT2ZJPEgkMUNOcCRZ1Ybz8PLWt7UZBEOWqz1WQbMvNyvElTXoBxPIYtqcWiJRz3ZwBtCKxqkL6KKU-aRPnPWJTW_KcCeNE',
      domain: '.linkedin.com',
      path: '/',
      expires: 1774803896,
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'JSESSIONID',
      value: 'ajax:1254069876929523464',
      domain: '.www.linkedin.com',
      path: '/',
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'bcookie',
      value: '"v=2&91d8f0e1-2e81-4d74-8c07-06f58ce58e82"',
      domain: '.linkedin.com',
      path: '/',
      expires: 1803723893,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'lidc',
      value:
        '"b=VB45:s=V:r=V:a=V:p=V:g=5100:u=1:x=1:i=1740683896:t=1740770296:v=2:sig=AQFjy4Ck2k02XTSl3MmBZIDfBdoMuzKz"',
      domain: '.linkedin.com',
      path: '/',
      expires: 1740770296,
      secure: true,
      sameSite: 'None',
    },
    {
      name: '__cf_bm',
      value:
        'hQpU_JBc5K6qYmfQaMj2iSwwGzrPNhxe5bT7hVMhTmA-1740683896-1.0.1.1-lGG.SWTfINi6vgvx6cCFUjL7sYbXHMjOazlQF9RxB.Gj1oQ3rA9x6FvA6xQDjwfp5dLLXfG1RYq9UHjqaBLMhA',
      domain: '.www.linkedin.com',
      path: '/',
      expires: 1740685696,
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
  ];

  private readonly USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  constructor() {
    this.client = new ApifyClient({
      token: process.env.APIFY_API_KEY,
    });
  }

  /**
   * Starts the LinkedIn scraper actor and waits for it to finish.
   * Intended to be called from a BullMQ processor (not the request cycle).
   * The actor typically takes 60–180 seconds depending on the count parameter.
   *
   * @param searchUrl - Single LinkedIn search URL to scrape
   * @param count - Total number of records to scrape (leave undefined for all results)
   * @param scrapeJobDetails - Scrape benefits, hiring team, company info (slower)
   * @param scrapeSkills - Scrape skills requirements (slower)
   * @param scrapeCompany - Scrape company details (slower)
   */
  async runAndCollect(
    searchUrl: string,
    count?: number,
    scrapeJobDetails = false,
    scrapeSkills = false,
    scrapeCompany = false,
  ): Promise<LinkedinJobResponseDto[]> {
    const input: LinkedinScrapeInput = {
      searchUrl,
      cookies: this.LINKEDIN_COOKIES,
      userAgent: this.USER_AGENT,
      proxy: {
        useApifyProxy: true,
        apifyProxyCountry: 'US',
      },
      count,
      scrapeJobDetails,
      scrapeSkills,
      scrapeCompany,
    };

    this.logger.log(
      `Starting Apify actor for URL: ${searchUrl}, count=${count ?? 'all'}, scrapeJobDetails=${scrapeJobDetails}`,
    );

    const run = await this.client.actor(ACTOR_ID).call(input);

    if (run.status !== 'SUCCEEDED') {
      throw new ApifyRunFailedException(`run ${run.id} finished with status ${run.status}`);
    }

    this.logger.log(`Actor run ${run.id} succeeded — fetching dataset ${run.defaultDatasetId}`);

    const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

    this.logger.log(`Retrieved ${items.length} jobs from dataset`);

    return items as unknown as LinkedinJobResponseDto[];
  }
}
