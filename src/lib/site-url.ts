/** Resolve the canonical public origin used by authentication redirects. */
export function siteOrigin(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    const parsed = new URL(configured);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('NEXT_PUBLIC_SITE_URL must use HTTP or HTTPS.');
    }
    return parsed.origin;
  }

  const request = new URL(requestUrl);
  // Next dev may expose its bind address (0.0.0.0) as request.url even when
  // the browser is using localhost. Keep local auth redirects on localhost.
  if (request.hostname === '0.0.0.0' || request.hostname === '::') {
    return `${request.protocol}//localhost${request.port ? `:${request.port}` : ''}`;
  }
  return request.origin;
}
