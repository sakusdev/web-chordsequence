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

const INSTRUMENT_SELECT = `              <option value="piano" selected>Piano / browser synth</option>
              <option value="warm">Warm Pad</option>`;
const INSTRUMENT_SELECT_SF2 = `              <option value="piano" selected>Piano / browser synth</option>
              <option value="sf2">SF2 SoundFont / uploaded</option>
              <option value="warm">Warm Pad</option>`;

const REVERB_LABEL = `          <label>Reverb <input id="reverb" type="range" min="0" max="0.55" step="0.01" value="0.18" /></label>`;
const REVERB_PLUS_SF2 = `          <label>Reverb <input id="reverb" type="range" min="0" max="0.55" step="0.01" value="0.18" /></label>
          <label>SF2 File <input id="sf2File" type="file" accept=".sf2,audio/x-soundfont" /></label>`;

const SF2_MICRO_NOTE = `Piano音源はサンプル未使用の軽量シンセです。複数倍音、短いアタック、指数減衰、軽いディチューンでピアノっぽくしています。`;
const SF2_MICRO_NOTE_NEW = `Piano音源はサンプル未使用の軽量シンセです。SF2モードではローカルの.sf2を読み、サンプルヘッダから最寄り音程のPCMサンプルを再生します。`;

const STYLE_END = `  </style>`;
const HIDE_TOP_BADGES_STYLE = `
    .top-badges { display: none !important; }
    header { grid-template-columns: 1fr !important; gap: 0 !important; }
  </style>`;

const INIT_CALL = `    init();`;
const SF2_PATCH = `
    // --- SF2 SoundFont support injected for Cloudflare Pages ---
    function parseSf2SoundFont(arrayBuffer) {
      const view = new DataView(arrayBuffer);
      const text = (offset, len) => Array.from(new Uint8Array(arrayBuffer, offset, len)).map(c => c ? String.fromCharCode(c) : '').join('');
      const u32 = offset => view.getUint32(offset, true);
      const u16 = offset => view.getUint16(offset, true);
      const i8 = offset => view.getInt8(offset);
      const chunk = (target, from = 12, to = arrayBuffer.byteLength) => {
        for (let p = from; p + 8 <= to;) {
          const id = text(p, 4);
          const size = u32(p + 4);
          const data = p + 8;
          if (id === target) return { id, data, size, end: data + size };
          if (id === 'LIST') {
            const type = text(data, 4);
            if (type === target) return { id, data: data + 4, size: size - 4, end: data + size };
          }
          p = data + size + (size & 1);
        }
        return null;
      };
      if (text(0, 4) !== 'RIFF' || text(8, 4) !== 'sfbk') throw new Error('Not a SoundFont 2 RIFF file');
      const sdta = chunk('sdta');
      const pdta = chunk('pdta');
      if (!sdta || !pdta) throw new Error('Missing SoundFont data chunks');
      const smpl = chunk('smpl', sdta.data, sdta.end);
      const shdr = chunk('shdr', pdta.data, pdta.end);
      if (!smpl || !shdr) throw new Error('Missing smpl or shdr chunk');
      const samples = [];
      for (let p = shdr.data; p + 46 <= shdr.end; p += 46) {
        const name = text(p, 20).replace(/\0/g, '').trim();
        if (!name || name === 'EOS') continue;
        const start = u32(p + 20);
        const end = u32(p + 24);
        const loopStart = u32(p + 28);
        const loopEnd = u32(p + 32);
        const sampleRate = u32(p + 36) || 44100;
        const originalPitch = view.getUint8(p + 40) || 60;
        const pitchCorrection = i8(p + 41) || 0;
        const sampleType = u16(p + 44);
        const frames = Math.max(0, end - start);
        if (!frames || frames > 20_000_000) continue;
        const data = new Float32Array(frames);
        const byteStart = smpl.data + start * 2;
        for (let i = 0; i < frames; i++) data[i] = view.getInt16(byteStart + i * 2, true) / 32768;
        samples.push({ name, data, sampleRate, originalPitch, pitchCorrection, loopStart: loopStart - start, loopEnd: loopEnd - start, sampleType });
      }
      if (!samples.length) throw new Error('No usable 16-bit PCM samples found');
      samples.sort((a, b) => a.originalPitch - b.originalPitch);
      return { name: 'Uploaded SF2', samples };
    }

    function findSf2Sample(midi) {
      if (!state.sf2?.samples?.length) return null;
      let best = state.sf2.samples[0];
      let bestScore = Infinity;
      for (const s of state.sf2.samples) {
        const score = Math.abs((s.originalPitch || 60) - midi);
        if (score < bestScore) { best = s; bestScore = score; }
      }
      return best;
    }

    function scheduleSf2Note(ctx, midi, start, duration, destination) {
      const sample = findSf2Sample(midi);
      if (!sample) return schedulePianoNote(ctx, midi, start, duration, destination);
      const buffer = ctx.createBuffer(1, sample.data.length, sample.sampleRate);
      buffer.copyToChannel(sample.data, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const root = sample.originalPitch || 60;
      const cents = sample.pitchCorrection || 0;
      source.playbackRate.value = Math.pow(2, (midi - root - cents / 100) / 12);
      const gain = ctx.createGain();
      const velocity = Number($('velocity').value || .76);
      const attack = Math.max(.003, Number($('attack').value || .01));
      const release = Number($('release').value || .82);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.34 * velocity, start + attack);
      gain.gain.setValueAtTime(0.30 * velocity, Math.max(start + attack, start + duration - release));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);
      source.connect(gain);
      gain.connect(destination);
      source.start(start);
      source.stop(start + duration + release + .08);
      return [source];
    }

    const originalScheduleNote = scheduleNote;
    scheduleNote = function(ctx, midi, start, duration, destination) {
      if ($('instrument').value === 'sf2') return scheduleSf2Note(ctx, midi, start, duration, destination);
      return originalScheduleNote(ctx, midi, start, duration, destination);
    };

    const originalScheduleOfflineNote = scheduleOfflineNote;
    scheduleOfflineNote = function(ctx, midi, start, duration, destination) {
      if ($('instrument').value === 'sf2') return scheduleSf2Note(ctx, midi, start, duration, destination);
      return originalScheduleOfflineNote(ctx, midi, start, duration, destination);
    };

    const originalInit = init;
    init = function() {
      originalInit();
      const sf2File = $('sf2File');
      if (!sf2File) return;
      sf2File.onchange = async event => {
        const file = event.target.files[0];
        if (!file) return;
        try {
          setStatus('Loading SF2...');
          const buffer = await file.arrayBuffer();
          state.sf2 = parseSf2SoundFont(buffer);
          $('instrument').value = 'sf2';
          setStatus('SF2 loaded: ' + file.name + ' / ' + state.sf2.samples.length + ' samples');
        } catch (error) {
          console.error(error);
          state.sf2 = null;
          setStatus('SF2 load failed');
          alert('SF2の読み込みに失敗しました: ' + error.message + '\n16bit PCMの一般的な.sf2を試してください。');
        }
      };
    };

    init();`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);

    if (request.method !== 'GET') return response;
    if (!(url.pathname === '/' || url.pathname.endsWith('/index.html'))) return response;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    let html = await response.text();
    html = html
      .replace(STYLE_END, HIDE_TOP_BADGES_STYLE)
      .replace(DIM_LINE, DIM_PLUS_HALF_DIM)
      .replace(OLD_PRESETS, NEW_PRESETS)
      .replace(INSTRUMENT_SELECT, INSTRUMENT_SELECT_SF2)
      .replace(REVERB_LABEL, REVERB_PLUS_SF2)
      .replace(SF2_MICRO_NOTE, SF2_MICRO_NOTE_NEW)
      .replace(INIT_CALL, SF2_PATCH);

    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
