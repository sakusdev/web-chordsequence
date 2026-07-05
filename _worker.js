const OLD_PRESETS = `    const PRESETS = [
      ['王道', ['C major','G major','A minor','F major']],
      ['小室', ['A minor','F major','G major','C major']],
      ['丸サ', ['D m7','G 7','C maj7','A minor']],
      ['暗め', ['C minor','G# major','D# major','A# major']],
      ['浮遊', ['F maj7','G major','E m7','A minor']],
      ['Lo-fi', ['C maj7','B 7','E minor','G 7']],
      ['EDM', ['F major','A minor','C major','G major']],
      ['Reset', []]
    ];`;

const NEW_PRESETS = `    const PRESETS = [
      ['王道', ['C major','G major','A minor','F major']],
      ['小室', ['A minor','F major','G major','C major']],
      ['丸サ', ['F maj7','E 7','A m7','C 7']],
      ['コンファメ', ['F maj7','E m7','A 7','D m7','G 7','C maj7','A m7','D 7','G m7','C 7']],
      ['枯葉', ['A m7','D 7','G maj7','C maj7','F# m7b5','B 7','E minor','E 7']],
      ['カノン', ['C major','G major','A minor','E minor','F major','C major','F major','G major']],
      ['王道JPOP', ['F major','G major','E m7','A minor']],
      ['逆循環', ['C maj7','A 7','D m7','G 7']],
      ['Just Two', ['F maj7','E 7','A minor','C 7']],
      ['Neo Soul', ['C maj9','B 7','E m9','A 9','D m9','G 9','C maj9','G 9']],
      ['Andalusian', ['A minor','G major','F major','E 7']],
      ['Blues', ['C 7','F 7','C 7','G 7','F 7','C 7']],
      ['暗め', ['C minor','G# major','D# major','A# major']],
      ['浮遊', ['F maj7','G major','E m7','A minor']],
      ['Lo-fi', ['C maj7','B 7','E minor','G 7']],
      ['EDM', ['F major','A minor','C major','G major']],
      ['Reset', []]
    ];`;

const DIM_LINE = `      'dim': { intervals: [0, 3, 6], label: 'dim', desc: '不安定・緊張' },`;
const DIM_PLUS_HALF_DIM = `      'dim': { intervals: [0, 3, 6], label: 'dim', desc: '不安定・緊張' },
      'm7b5': { intervals: [0, 3, 6, 10], label: 'm7b5', desc: '半減七・ジャズ' },`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);

    if (request.method !== 'GET') return response;
    if (!(url.pathname === '/' || url.pathname.endsWith('/index.html'))) return response;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    let html = await response.text();
    html = html.replace(DIM_LINE, DIM_PLUS_HALF_DIM).replace(OLD_PRESETS, NEW_PRESETS);

    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
