export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);

    if (request.method !== 'GET') return response;
    if (!(url.pathname === '/' || url.pathname.endsWith('/index.html'))) return response;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    let html = await response.text();
    const featureScript = '<script src="/features.js?v=20260705-advanced-1"></script>';
    if (!html.includes('/features.js')) html = html.replace('</body>', `${featureScript}\n</body>`);

    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('cache-control', 'no-store');

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
