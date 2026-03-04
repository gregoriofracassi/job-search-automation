import { KeywordFilterService } from './keyword-filter.service';

describe('KeywordFilterService', () => {
  let service: KeywordFilterService;

  beforeEach(() => {
    service = new KeywordFilterService();
  });

  it('should filter job with exact keyword match (with trailing space)', () => {
    const description = 'We are looking for a Java developer...';
    const result = service.shouldFilter(description, ['java ']);

    expect(result.filtered).toBe(true);
    expect(result.matchedKeywords).toContain('java ');
  });

  it('should NOT filter JavaScript when looking for "java "', () => {
    const description = 'We need a JavaScript expert...';
    const result = service.shouldFilter(description, ['java ']);

    expect(result.filtered).toBe(false);
  });

  it('should filter job with substring match', () => {
    const description = 'Must have PHP experience...';
    const result = service.shouldFilter(description, ['php']);

    expect(result.filtered).toBe(true);
    expect(result.matchedKeywords).toContain('php');
  });

  it('should be case-insensitive', () => {
    const description = 'Python or PYTHON is required';
    const result = service.shouldFilter(description, ['python']);

    expect(result.filtered).toBe(true);
  });

  it('should return all matched keywords', () => {
    const description = 'PHP, Python, and Java required';
    const result = service.shouldFilter(description, ['php', 'python', 'java ']);

    expect(result.filtered).toBe(true);
    expect(result.matchedKeywords).toHaveLength(3);
  });

  it('should not filter when no keywords match', () => {
    const description = 'TypeScript and React position';
    const result = service.shouldFilter(description, ['php', 'python', 'java ']);

    expect(result.filtered).toBe(false);
    expect(result.matchedKeywords).toHaveLength(0);
  });
});
