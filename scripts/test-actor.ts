import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
  token: process.env.APIFY_API_KEY!,
});

const LINKEDIN_COOKIES = [
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

async function testActor() {
  const input = {
    searchUrl:
      'https://www.linkedin.com/jobs/search/?currentJobId=4374254963&f_WT=2&keywords=backend&origin=JOB_SEARCH_PAGE_JOB_FILTER',
    cookies: LINKEDIN_COOKIES,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    proxy: {
      useApifyProxy: true,
      apifyProxyCountry: 'US',
    },
    count: 5,
    scrapeJobDetails: false,
    scrapeSkills: false,
    scrapeCompany: false,
  };

  console.log('Starting actor with correct schema...');
  console.log('Input:', JSON.stringify(input, null, 2));

  const run = await client.actor('curious_coder/linkedin-jobs-search-scraper').call(input);

  console.log(`\nRun ID: ${run.id}`);
  console.log(`Status: ${run.status}`);
  console.log(`Dataset ID: ${run.defaultDatasetId}`);

  if (run.status === 'SUCCEEDED') {
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`\nRetrieved ${items.length} jobs`);
    console.log('\nFirst job:', JSON.stringify(items[0], null, 2));
  }
}

testActor().catch(console.error);
