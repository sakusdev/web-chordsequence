export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);

    if (request.method !== 'GET') return response;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    let html = await response.text();
    const isStudio = url.pathname === '/' || url.pathname.endsWith('/index.html');
    const scripts = [
      ...(isStudio ? [
        '<script src="/features.js?v=20260705-advanced-1"></script>',
        '<script src="/features-extra.js?v=20260705-extra-1"></script>',
        '<script src="/features-ui.js?v=20260705-ui-1"></script>',
        '<script src="/presets-audit.js?v=20260705-audit-1"></script>',
        '<script src="/sf2-presets.js?v=20260705-sf2-preset-1"></script>',
        '<script src="/sf2-force-preset-route.js?v=20260705-sf2-force-1"></script>'
      ] : []),
      '<script src="/ui-polish.js?v=20260711-ui-polish-1"></script>'
    ].filter(script => !html.includes(script.match(/src="([^"]+)/)?.[1] || ''));

    if (scripts.length) html = html.replace('</body>', `${scripts.join('\n')}\n</body>`);

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
