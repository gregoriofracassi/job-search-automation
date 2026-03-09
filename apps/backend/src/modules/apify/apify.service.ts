import { Injectable, Logger } from '@nestjs/common';
import { ApifyClient } from 'apify-client';
import { readFileSync } from 'fs';
import { join } from 'path';
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
   * LinkedIn cookies loaded from linkedin-cookies.json file.
   *
   * IMPORTANT: The __cf_bm cookie expires after 30 minutes, so cookies
   * should be exported fresh before each scraping run.
   *
   * To update cookies:
   * 1. Install a cookie export extension (e.g., Cookie-Editor, EditThisCookie)
   * 2. Navigate to https://www.linkedin.com
   * 3. Export cookies as JSON
   * 4. Paste the entire JSON array into linkedin-cookies.json
   * 5. Restart the backend server
   */
  private readonly LINKEDIN_COOKIES: LinkedinCookie[] = JSON.parse(
    readFileSync(join(__dirname, '../../..', 'src/modules/apify/linkedin-cookies.json'), 'utf-8'),
  );

  /* Old hardcoded cookies - now loaded from linkedin-cookies.json
  private readonly LINKEDIN_COOKIES_OLD: LinkedinCookie[] = [
    {
      name: '_pxvid',
      value: '5df45f3b-17dc-11f1-8377-a8c0ad2f3f6f',
      domain: 'www.linkedin.com',
      path: '/',
      expires: 1804179825,
      httpOnly: false,
      secure: false,
    },
    {
      name: 'bcookie',
      value: '"v=2&fe793b28-cee4-4a01-84b5-327c37ac7ded"',
      domain: '.linkedin.com',
      path: '/',
      expires: 1804179824,
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    },
    {
      name: '__cf_bm',
      value:
        't7sfTN1JO2UbgSndKQID786xnbfN8n6fn2rSzp2nxOE-1772643819-1.0.1.1-9Arrr8bwhmBjb0PZKBxuAX7bdWmBio_G.AOjigzGN9uZOJREf4qNLGRWATdG6xgDFWVMKYZnlWnAsXglURK5ohYr9xzdwGlQXxOB5m2.v8c',
      domain: '.linkedin.com',
      path: '/',
      expires: 1772645620,
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
    {
      name: '_px3',
      value:
        '009e9730b635db9818482c1c6c1a487463a7b9e156223766800d877f538c69e1:DfVuCc5E4pbCSePfNnULWj/nXwrxZNHV5CgJMP3oAwadJhQS752DJGZe/axveyLy6X2QHBXpMpvfk+885FjT/A==:1000:FKDbj3HfoKwvItM35iPYHMdmHiLrteSe6AE27SmKwrMhsZNAeUGYCOHQnHJ9Pu8JeFlMhCPYGrwQpDX0JiBeAh/4dWQYGhTkexZjoDpdi54dG2eSsFQ2lU1+WcBzDL7Lenur1/gsioCHSte7hMiWp9Rxb2r/F/2CVN97slrwHg8MgCccYjqQPYU9wG9t9vxp6rIzD1+DtM5JMFeOYy8A4ovbYydURGWrTPpmArpf1Q4wBJWSjnvBe0/lX7wWMMeUtCyjUacX9Ffn7lcgw3y6YoPULIwXReimg9UNeLulA8bdk20Bz51zx0yiqFiv+Qlg6V4J1b0+3EO0WFiG5vC0SHOz6cw8FMAJuGM0regu7bVRhLzY+UBO6i5gIcUEcETDOcs50G4txyPJEXyma3cHlsqPWybnHmyxuUFyUZpBb3roGG63HpoX0qtJMD8/GUjohhxtajioPs9oDjX5hhlzDHh6pY4WJgBWDd3Nof/tOqCKMXx2lXQTkk6RFqip7tQ5',
      domain: 'www.linkedin.com',
      path: '/',
      expires: 1772644027,
      httpOnly: false,
      secure: false,
    },
    {
      name: 'g_state',
      value: '{"i_l":0}',
      domain: 'www.linkedin.com',
      path: '/',
      expires: 1788189323,
      httpOnly: false,
      secure: false,
    },
    {
      name: 'li_alerts',
      value: 'e30=',
      domain: 'www.linkedin.com',
      path: '/',
      expires: 1804173320,
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'fptctx2',
      value:
        'taBcrIH61PuCVH7eNCyH0I1otfYAPn9VOPY9aMX8tO3AffAARnooC2W7jOu9LTRhts0tegft2I8OztYOybcJvesUlcGD%252bANVm7YRudJx4J6HOii2NCtJmx9UNQ7YPpvMSD%252ba%252bE4TfJydxEMgzLCFWqBvYzf8o0EhOn%252b1Mpixe8eOP2J9quyGByPNbnoL8fb4uo7Sfnu2xb24J7opjdfihJpWWHqLXJUkktuc1X92z7PakK7D5BY2Mtv24rTE%252f%252fx9akFGF1T3bSq8OMJfdLhZFBN8t5vsfYyEUPXJLz%252bP3tOiX9UiiXwFTe%252fQoiG%252f%252f80zHKrCq5ibGov0RHy0B7HIkiDRU6x04EFcRpQy%252bYwVfPs%253d',
      domain: '.linkedin.com',
      path: '/',
      httpOnly: true,
      secure: true,
    },
    {
      name: 'li_at',
      value:
        'AQEDATVLS80EGp-WAAABnLnOMOUAAAGc3dq05U4AYBm-3feetRnPKkTIyf7DAwQaCYqDP0QJ17yxCKEOSseJZ1g3xI1mSTpOlexA-Y-or4vEr3NYbkZhQX6KRSgs852tAJnghK0cCeogmK532dx_MBc4',
      domain: '.www.linkedin.com',
      path: '/',
      expires: 1804179824,
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'lang',
      value: 'v=2&lang=en-us',
      domain: '.linkedin.com',
      path: '/',
      httpOnly: false,
      secure: true,
    },
    {
      name: 'lidc',
      value:
        '"b=VB53:s=V:r=V:a=V:p=V:g=4094:u=1241:x=1:i=1772637323:t=1772647552:v=2:sig=AQFPF8Rs-71rkHzM4KcGQGk2G_2DrnPy"',
      domain: '.linkedin.com',
      path: '/',
      expires: 1772647552,
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'bscookie',
      value:
        '"v=1&202603041515197a51c802-a588-4e8c-8685-5e5152f15368AQFkHQ9mgiUMY4KHaNsIVoeb8ksqnCzX"',
      domain: '.www.linkedin.com',
      path: '/',
      expires: 1804173323,
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'dfpfpt',
      value: '306b6de62db04468896a54b6868152a8',
      domain: '.linkedin.com',
      path: '/',
      expires: 1804173324,
      httpOnly: true,
      secure: true,
    },
    {
      name: 'JSESSIONID',
      value: '"ajax:7600329476160465746"',
      domain: '.www.linkedin.com',
      path: '/',
      expires: 1780413323,
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'li_gc',
      value: 'MTswOzE3NzI2MzczMTk7MjswMjFu4wAnuQB6xJ44f5UgGUZrQuxssLiD03i3uaZddTIwTw==',
      domain: '.linkedin.com',
      path: '/',
      expires: 1788189319,
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'li_mc',
      value: 'MTsyMTsxNzcyNjM3MzIzOzI7MDIxl7cMWrwCZoWFn5jT0WcHI7aHEWJTCTpe6zEVhBLDFCs=',
      domain: '.linkedin.com',
      path: '/',
      expires: 1788189323,
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'li_theme',
      value: 'light',
      domain: '.www.linkedin.com',
      path: '/',
      expires: 1788185723,
      httpOnly: false,
      secure: true,
    },
    {
      name: 'li_theme_set',
      value: 'app',
      domain: '.www.linkedin.com',
      path: '/',
      expires: 1788185723,
      httpOnly: false,
      secure: true,
    },
    {
      name: 'liap',
      value: 'true',
      domain: '.linkedin.com',
      path: '/',
      expires: 1780413323,
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    },
    {
      name: 'timezone',
      value: 'Europe/Rome',
      domain: '.www.linkedin.com',
      path: '/',
      expires: 1773846923,
      httpOnly: false,
      secure: true,
    },
    {
      name: 'UserMatchHistory',
      value:
        'AQJWVcRYaC_UwAAAAZy5awVw9uvcb32u-EyVW2Ft3CmCZ1TGhPCc9fiz99MsW-U9CTT8r08nFCpBgkCryRZgKPjtb7FWzxmv6WWHZ6CpN6OMvq4L_lK4x9NJtgwkvaPGWfbMV9zojW0PhPvfiNVPWncsSUwJiKCztP2O9S1cu084AuluerVn7UDc1yD-mbSzBi_pCR6pTbg3RYeqTYB-DNM2uto9oQIFnTmaBWcJsrGLvuXw3NJo3AqIUyQbKuPThmj4MdR3KLNqJqCK3BDPzxdDUCRChE1H0ccxiv92hXh2oBm0FlUFhqy5_mx4KzYnoZ3nUQ-T1pG7n4jkTwTE',
      domain: '.linkedin.com',
      path: '/',
      expires: 1775225724,
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    },
  ];
  */

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
