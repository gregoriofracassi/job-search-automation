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
      name: '_pxvid',
      value: '5df45f3b-17dc-11f1-8377-a8c0ad2f3f6f',
      domain: 'www.linkedin.com',
      path: '/',
      expires: 1804173324,
      httpOnly: false,
      secure: false,
    },
    {
      name: 'bcookie',
      value: '"v=2&10c40869-5494-47a7-8b1c-f16277c24f09"',
      domain: '.linkedin.com',
      path: '/',
      expires: 1804173323,
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    },
    {
      name: '__cf_bm',
      value:
        'MEqYcTsdOZLaeLmB2TMgmA8lm0q9gP5bxFwDsmnTMhU-1772637320-1.0.1.1-dMhFRugR1a93VwarCLf11gbZzWysvMqKFHIHpYmNzQNqztm1uIx9YpZVsE.BNwFC4ERXlYG2tzSBZz34YCB71Ft7u1uMcbuKkDHKFWKEPHA',
      domain: '.linkedin.com',
      path: '/',
      expires: 1772639120,
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
    {
      name: '_px3',
      value:
        'a448779a64e5edb26ebf52b682aba75011c0bcdcb83ac4fcc6f663700fd579a6:65i8NOsz8z1ZdxM2ivQi+Y+wAC+/iYH6gUSO3p9gu8YSnrSG/M9IRWijFw5+H/V7SDAXc7Pj0i1XiTyHPMbA/A==:1000:uf/Yjf9ZfnoPAjfSQGAZ9kM41+BYdLdBhgf4GX6xiEoi4RAM1n3hti/pI1XHNwf5I2kAE5ZLsQJTG1WVld+c9FDxhT8JlH0Xe4Hb6Ot8MOkSt/Eq0MqeSteMl6SBR2h591Tz0E5Wb/qyo4g2lVeqVS/+KEUrqmW2nVQZzoz68Of6/B/WAGds2QyMKR9zW+BMj1nT9xxZ8Mij2PzS8UHql+tf6ubQTElb06gw5OWUZ5fQIha66U/HmputW1zY+CyjjIpDnAtrwDqo7uZMG3pHV5Xp4DgSlXDVVPNiWS1jzOMXskKp1nsd7GtDq7oRQh9+1RqMU22NXinR9QO5yGfWIegTzE0utIUSaPi052gvdQcBwWDiQCuR20UeQc+yThROCMZzApKoTtAhsxhIDe2VQAEntQbyIIDuLGJSIxwBVDKD7HTOmYdiASyIz1x5XcrHdPM5T+nHueuzVwVaLeV5p+TMrV1a7U/P2slJBAmQkGDA9BoLiEuLq57kExwjstKN',
      domain: 'www.linkedin.com',
      path: '/',
      expires: 1772637487,
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
        'AQEDATVLS80Bk11XAAABnLlrAGgAAAGc3XeEaE0AfTXzLkJatX_XTvVgBSvO6fvVviF-z8viOueJPpXSjl_Fw4fum-0qbj3EBihHnMx1fbVHIb-j0ylOTi96zZm41tXLDkmjvLkqAKomIfpAnq5yJpzf',
      domain: '.www.linkedin.com',
      path: '/',
      expires: 1804173323,
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
