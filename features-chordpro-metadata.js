(() => {
  const VERSION = '2026-07-15-chordpro-metadata-1';
  const MAX_IMPORT = 512;
  const METER_KEY = 'webseq:meter:v1';

  const $ = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finitePositive = value => Number.isFinite(Number(value)) && Number(value) > 0;
  const formatNumber = value => Number.isInteger(Number(value)) ? String(Number(value)) : String(Math.round(Number(value) * 1000) / 1000);

  function parseMeter(value, fallback = { numerator: 4, denominator: 4 }) {
    const match = String(value || '').trim().match(/^(\d{1,2})\s*\/\s*(1|2|4|8|16|32)$/);
    if (!match) return fallback ? { ...fallback } : null;
    const numerator = clamp(Number(match[1]), 1, 32);
    const denominator = Number(match[2]);
    return { numerator, denominator };
  }

  function meterText(meter) {
    return `${meter.numerator}/${meter.denominator}`;
  }

  function parseTempo(value) {
    const match = String(value || '').replace(/♩|bpm|qpm/gi, ' ').match(/(?:^|\s)(\d{1,3}(?:\.\d+)?)(?:\s|$)/);
    if (!match) return null;
    const tempo = Number(match[1]);
    return tempo >= 20 && tempo <= 400 ? tempo : null;
  }

  function parseBeatValue(value) {
    const source = String(value || '').trim().replace(/\s*(?:beats?|拍)\s*$/i, '');
    const fraction = source.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    const result = fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(source);
    return Number.isFinite(result) && result > 0 && result <= 128 ? result : null;
  }

  function normalizeDirectiveName(name) {
    return String(name || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  }

  function parseDirectiveBody(body) {
    const source = String(body || '').trim();
    const meta = source.match(/^meta\s*:\s*([^\s:]+)\s+(.+)$/i);
    if (meta) return { name: normalizeDirectiveName(meta[1]), value: meta[2].trim(), isMeta: true };
    const direct = source.match(/^([^:]+?)\s*:\s*(.*)$/);
    if (!direct) return null;
    return { name: normalizeDirectiveName(direct[1]), value: direct[2].trim(), isMeta: false };
  }

  function parseInlineDuration(token) {
    let symbol = String(token || '').trim();
    let beats = null;
    const suffix = symbol.match(/(?:@|\*)(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)$/);
    if (suffix) {
      beats = parseBeatValue(suffix[1]);
      symbol = symbol.slice(0, suffix.index).trim();
    }
    return { symbol, beats };
  }

  function cloneChord(chord) {
    return {
      ...chord,
      intervals: Array.isArray(chord?.intervals) ? [...chord.intervals] : chord?.intervals
    };
  }

  function parseChordProDocument(text, parseChord, options = {}) {
    const source = String(text || '');
    const initialMeter = parseMeter(options.timeSignature || meterText(options.meter || { numerator: 4, denominator: 4 }));
    let currentMeter = { ...initialMeter };
    let currentTempo = finitePositive(options.tempo) ? Number(options.tempo) : 100;
    let defaultBeats = finitePositive(options.defaultBeats) ? Number(options.defaultBeats) : null;
    let defaultBars = finitePositive(options.defaultBars) ? Number(options.defaultBars) : null;
    let firstExplicitTempo = null;
    let firstExplicitMeter = null;
    let songDuration = null;
    const explicitTempos = [];
    const explicitMeters = [];
    const chords = [];
    const invalid = [];
    let noChordCount = 0;
    let explicitBeatCount = 0;
    let distributedBeatCount = 0;
    let defaultBeatCount = 0;
    let previousChord = null;

    const applyDirective = directive => {
      if (!directive) return;
      const { name, value } = directive;
      if (name === 'tempo' || name === 'bpm') {
        const tempo = parseTempo(value);
        if (tempo) {
          currentTempo = tempo;
          if (firstExplicitTempo === null) firstExplicitTempo = tempo;
          explicitTempos.push(tempo);
        }
        return;
      }
      if (name === 'time' || name === 'meter' || name === 'metre' || name === 'time-signature' || name === 'timesig') {
        const meter = parseMeter(value, null);
        if (meter) {
          currentMeter = meter;
          if (firstExplicitMeter === null) firstExplicitMeter = { ...meter };
          explicitMeters.push(meterText(meter));
        }
        return;
      }
      if (name === 'chord-beats' || name === 'beats-per-chord' || name === 'chord-duration-beats') {
        const beats = parseBeatValue(value);
        if (beats) {
          defaultBeats = beats;
          defaultBars = null;
        }
        return;
      }
      if (name === 'chord-bars' || name === 'bars-per-chord' || name === 'measures-per-chord') {
        const bars = parseBeatValue(value);
        if (bars) {
          defaultBars = bars;
          defaultBeats = null;
        }
        return;
      }
      if (name === 'duration') songDuration = value;
    };

    const parseToken = (rawToken, recentChord = previousChord) => {
      const duration = parseInlineDuration(rawToken);
      const token = duration.symbol;
      if (token === '%' && recentChord) {
        return { chord: cloneChord(recentChord), explicitBeats: duration.beats, repeated: true };
      }
      const parsed = parseChord(token, { bars: 1 });
      if (parsed?.ok) return { chord: cloneChord(parsed.chord), explicitBeats: duration.beats, repeated: false };
      if (parsed?.noChord) {
        noChordCount += 1;
        return null;
      }
      invalid.push(token);
      return null;
    };

    const appendEntries = (entries, hasBarBoundary) => {
      if (!entries.length) return;
      const explicitSum = entries.reduce((sum, entry) => sum + (entry.explicitBeats || 0), 0);
      const unspecified = entries.filter(entry => !entry.explicitBeats);
      let distributed = null;
      if (hasBarBoundary && !defaultBeats && !defaultBars && unspecified.length) {
        const remaining = currentMeter.numerator - explicitSum;
        distributed = remaining > 0 ? remaining / unspecified.length : currentMeter.numerator / entries.length;
      }

      entries.forEach(entry => {
        const chord = entry.chord;
        let beats;
        if (entry.explicitBeats) {
          beats = entry.explicitBeats;
          explicitBeatCount += 1;
        } else if (defaultBeats) {
          beats = defaultBeats;
          defaultBeatCount += 1;
        } else if (defaultBars) {
          beats = defaultBars * currentMeter.numerator;
          defaultBeatCount += 1;
        } else if (distributed) {
          beats = distributed;
          distributedBeatCount += 1;
        } else {
          beats = currentMeter.numerator;
          defaultBeatCount += 1;
        }

        chord.beats = Math.round(beats * 1000) / 1000;
        chord.bars = chord.beats / currentMeter.numerator;
        chord.tempo = currentTempo;
        chord.meterNumerator = currentMeter.numerator;
        chord.meterDenominator = currentMeter.denominator;
        chords.push(chord);
        previousChord = cloneChord(chord);
      });
    };

    for (const line of source.split(/\r?\n/)) {
      const directives = [...line.matchAll(/\{([^{}]+)\}/g)].map(match => parseDirectiveBody(match[1]));
      directives.forEach(applyDirective);
      const content = line.replace(/\{[^{}]+\}/g, '');
      const hasBars = content.includes('|');
      const segments = hasBars ? content.split('|') : [content];
      for (const segment of segments) {
        if (chords.length >= MAX_IMPORT) break;
        const tokens = [...segment.matchAll(/\[([^\]\r\n]+)\]/g)].map(match => match[1].trim());
        const entries = [];
        let recentChord = previousChord;
        for (const token of tokens) {
          if (entries.length >= MAX_IMPORT - chords.length) break;
          const entry = parseToken(token, recentChord);
          if (!entry) continue;
          entries.push(entry);
          recentChord = entry.chord;
        }
        appendEntries(entries, hasBars);
      }
      if (chords.length >= MAX_IMPORT) break;
    }

    const tempoSet = new Set(chords.map(chord => chord.tempo));
    const meterSet = new Set(chords.map(chord => `${chord.meterNumerator}/${chord.meterDenominator}`));
    const hasTempoChanges = tempoSet.size > 1;
    const hasMeterChanges = meterSet.size > 1;
    if (!hasTempoChanges) chords.forEach(chord => delete chord.tempo);
    if (!hasMeterChanges) chords.forEach(chord => { delete chord.meterNumerator; delete chord.meterDenominator; });

    const firstChordTempo = hasTempoChanges ? Number(chords[0]?.tempo || currentTempo) : firstExplicitTempo;
    const firstChordMeter = hasMeterChanges && chords[0]
      ? { numerator: chords[0].meterNumerator, denominator: chords[0].meterDenominator }
      : firstExplicitMeter;

    return {
      chords,
      invalid: [...new Set(invalid.filter(Boolean))],
      noChordCount,
      truncated: chords.length >= MAX_IMPORT,
      metadata: {
        tempo: firstChordTempo,
        meter: firstChordMeter,
        songDuration,
        tempoChanges: hasTempoChanges,
        meterChanges: hasMeterChanges,
        explicitTempoValues: [...new Set(explicitTempos)],
        explicitMeterValues: [...new Set(explicitMeters)]
      },
      rhythm: { explicitBeatCount, distributedBeatCount, defaultBeatCount }
    };
  }

  function currentMeter() {
    return parseMeter($('timeSignature')?.value || localStorage.getItem(METER_KEY) || '4/4');
  }

  function meterForChord(chord) {
    if (finitePositive(chord?.meterNumerator) && finitePositive(chord?.meterDenominator)) {
      return { numerator: Number(chord.meterNumerator), denominator: Number(chord.meterDenominator) };
    }
    return currentMeter();
  }

  function tempoForChord(chord) {
    return finitePositive(chord?.tempo) ? Number(chord.tempo) : Number($('bpm')?.value || 100);
  }

  function beatsForChord(chord) {
    const meter = meterForChord(chord);
    if (finitePositive(chord?.beats)) return Number(chord.beats);
    return (finitePositive(chord?.bars) ? Number(chord.bars) : 1) * meter.numerator;
  }

  function quarterUnitsForChord(chord) {
    const meter = meterForChord(chord);
    return beatsForChord(chord) * 4 / meter.denominator;
  }

  function secondsForChord(chord) {
    return quarterUnitsForChord(chord) * 60 / tempoForChord(chord);
  }

  function notify(text) {
    try { setStatus(text); } catch {}
    try { if (typeof toast === 'function') toast(text); } catch {}
  }

  function installControls() {
    if (!$('timeSignature')) {
      const bpmLabel = $('bpm')?.closest('label');
      if (bpmLabel) {
        const label = document.createElement('label');
        label.id = 'timeSignatureLabel';
        label.innerHTML = '拍子<input id="timeSignature" inputmode="numeric" autocomplete="off" value="4/4" aria-label="拍子">';
        bpmLabel.after(label);
      }
    }
    const meterInput = $('timeSignature');
    if (meterInput) {
      const saved = localStorage.getItem(METER_KEY);
      if (saved) meterInput.value = meterText(parseMeter(saved));
      meterInput.addEventListener('change', () => {
        const meter = parseMeter(meterInput.value);
        meterInput.value = meterText(meter);
        localStorage.setItem(METER_KEY, meterInput.value);
        const beatsInput = $('chordBeats');
        if (beatsInput?.dataset.autoValue === '1') beatsInput.value = meter.numerator;
        render();
      });
    }

    if (!$('chordBeats')) {
      const meta = $('directChordMeta');
      if (meta) {
        const barsLabel = $('bars')?.closest('label');
        if (barsLabel) barsLabel.hidden = true;
        const label = document.createElement('label');
        label.id = 'chordBeatsLabel';
        label.innerHTML = `<span>長さ（拍）</span><input id="chordBeats" type="number" min="0.125" max="128" step="0.125" value="${currentMeter().numerator}">`;
        meta.append(label);
        const input = $('chordBeats');
        input.dataset.autoValue = '1';
        input.addEventListener('input', () => { input.dataset.autoValue = '0'; });
      }
    }

    if (!$('chordProMetadataStyle')) {
      const style = document.createElement('style');
      style.id = 'chordProMetadataStyle';
      style.textContent = `
        #timeSignature{width:100%;font-variant-numeric:tabular-nums}
        #chordBeats{width:100%;font-variant-numeric:tabular-nums}
        .chordpro-meta-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:3px}
        .chordpro-meta-badges span{padding:3px 7px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:999px;color:var(--muted);font-size:.7rem}
      `;
      document.head.append(style);
    }
  }

  function parserApi() {
    return window.WEBSEQ_CHORD_EXTENDED || window.WEBSEQ_CHORD_INPUT;
  }

  function parseCurrentDocument() {
    const api = parserApi();
    if (!api?.parseChordSymbol) return null;
    return parseChordProDocument($('chordProText')?.value || '', api.parseChordSymbol, {
      tempo: Number($('bpm')?.value || 100),
      timeSignature: meterText(currentMeter()),
      defaultBeats: null
    });
  }

  function updateChordProPreview() {
    const area = $('chordProText');
    const result = $('chordProResult');
    if (!area || !result) return null;
    const parsed = parseCurrentDocument();
    if (!parsed) return null;
    if (!area.value.trim()) {
      result.textContent = 'テンポ・拍子・小節線・コードごとの拍数を読み取ります。';
      result.classList.remove('is-error');
      return parsed;
    }
    if (!parsed.chords.length) {
      result.textContent = 'コードを検出できませんでした。ChordProの [C] 表記を使用してください。';
      result.classList.add('is-error');
      return parsed;
    }

    const notices = [];
    if (parsed.metadata.tempo) notices.push(`${formatNumber(parsed.metadata.tempo)} BPM`);
    if (parsed.metadata.meter) notices.push(meterText(parsed.metadata.meter));
    if (parsed.metadata.tempoChanges) notices.push('途中テンポ変更');
    if (parsed.metadata.meterChanges) notices.push('途中拍子変更');
    if (parsed.rhythm.explicitBeatCount) notices.push(`拍数指定 ${parsed.rhythm.explicitBeatCount}`);
    if (parsed.rhythm.distributedBeatCount) notices.push(`小節内分配 ${parsed.rhythm.distributedBeatCount}`);
    if (parsed.invalid.length) notices.push(`未解釈 ${parsed.invalid.length}種類`);
    if (parsed.noChordCount) notices.push(`N.C. ${parsed.noChordCount}`);
    if (parsed.truncated) notices.push(`最大${MAX_IMPORT}個`);
    const names = parsed.chords.slice(0, 7).map(chord => {
      try { return label(chord); } catch { return chord.root; }
    }).join(' → ');
    result.textContent = `${parsed.chords.length}個：${names}${parsed.chords.length > 7 ? ' …' : ''}${notices.length ? ` ／ ${notices.join('・')}` : ''}`;
    result.classList.remove('is-error');
    return parsed;
  }

  function applyImportedMetadata(parsed) {
    if (parsed.metadata.tempo && $('bpm')) $('bpm').value = formatNumber(parsed.metadata.tempo);
    if (parsed.metadata.meter && $('timeSignature')) {
      $('timeSignature').value = meterText(parsed.metadata.meter);
      localStorage.setItem(METER_KEY, $('timeSignature').value);
      if ($('chordBeats')?.dataset.autoValue === '1') $('chordBeats').value = parsed.metadata.meter.numerator;
    }
    state.chordProMetadata = {
      tempo: parsed.metadata.tempo,
      timeSignature: parsed.metadata.meter ? meterText(parsed.metadata.meter) : null,
      songDuration: parsed.metadata.songDuration,
      tempoChanges: parsed.metadata.tempoChanges,
      meterChanges: parsed.metadata.meterChanges
    };
  }

  function importChordPro(mode) {
    const parsed = updateChordProPreview();
    if (!parsed?.chords.length) return notify('インポートできるコードがありません');
    applyImportedMetadata(parsed);
    const octave = Number($('octave')?.value || 4);
    const list = parsed.chords.map(chord => ({ ...cloneChord(chord), octave }));
    if (mode === 'replace') state.sequence = list;
    else state.sequence.push(...list);
    render();
    notify(`${list.length}個のコードとリズム情報を${mode === 'replace' ? '読み込みました' : '末尾へ追加しました'}`);
  }

  function bindImporter() {
    const oldArea = $('chordProText');
    if (oldArea) {
      const area = oldArea.cloneNode(true);
      oldArea.replaceWith(area);
      area.placeholder = '{tempo: 128}\n{time: 3/4}\n| [C] [G/B] | [Am@1] [F] |\n{chord-beats: 2}\n[Dm7] [G7]';
      area.addEventListener('input', updateChordProPreview);
    }
    if ($('replaceWithChordPro')) $('replaceWithChordPro').onclick = () => importChordPro('replace');
    if ($('appendChordPro')) $('appendChordPro').onclick = () => importChordPro('append');
    const micro = $('chordProImporter')?.querySelector('.micro');
    if (micro) micro.textContent = '{tempo: 120} と {time: 3/4} を反映します。[C@2] は2拍。小節線で囲んだ | [C] [G] | は拍子に合わせて均等配分します。';
  }

  function bindDirectInput() {
    const api = parserApi();
    if (!api?.parseChordSymbol) return;
    const oldInput = $('chordSymbolInput');
    if (oldInput) {
      const input = oldInput.cloneNode(true);
      oldInput.replaceWith(input);
      const preview = () => {
        const parsed = api.parseChordSymbol(input.value, { bars: 1 });
        const result = $('chordSymbolResult');
        if (!result) return parsed;
        result.classList.toggle('is-error', !parsed?.ok && Boolean(input.value.trim()));
        if (!input.value.trim()) result.textContent = '例：C#dim7、G7/B、Bbmaj13(#11)';
        else if (!parsed?.ok) result.textContent = parsed?.reason || 'コード名を解釈できません';
        else result.textContent = `${label(parsed.chord)} ／ ${formatNumber(Number($('chordBeats')?.value || currentMeter().numerator))}拍`;
        return parsed;
      };
      const run = action => {
        const parsed = preview();
        if (!parsed?.ok) return notify(parsed?.reason || 'コード名を確認してください');
        const chord = cloneChord(parsed.chord);
        const beats = Number($('chordBeats')?.value || currentMeter().numerator);
        chord.beats = finitePositive(beats) ? beats : currentMeter().numerator;
        chord.bars = chord.beats / currentMeter().numerator;
        chord.octave = Number($('octave')?.value || 4);
        if (action === 'preview') previewChordWithDuration(chord);
        else {
          state.sequence.push(chord);
          render();
          notify(`${label(chord)}を追加しました`);
        }
        input.focus();
      };
      input.addEventListener('input', preview);
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          run('add');
        }
      });
      if ($('directAddChord')) $('directAddChord').onclick = () => run('add');
      if ($('directPreviewChord')) $('directPreviewChord').onclick = () => run('preview');
      preview();
    }
  }

  function previewChordWithDuration(chord) {
    try {
      const ctx = audio();
      stopAll(false);
      const seconds = Math.min(8, Math.max(0.25, secondsForChord(chord)));
      state.nodes.push(...scheduleChord(ctx, chord, ctx.currentTime + 0.02, seconds));
      renderKeyboard(notes(chord));
      notify(`試聴: ${label(chord)} / ${formatNumber(beatsForChord(chord))}拍`);
      setTimeout(() => renderKeyboard([]), (seconds + 0.35) * 1000);
    } catch {
      preview(chord);
    }
  }

  function patchRender() {
    if (window.__webseqChordProRenderPatched) return;
    window.__webseqChordProRenderPatched = true;
    const originalRender = render;
    render = function (...args) {
      const result = originalRender.apply(this, args);
      [...document.querySelectorAll('.chord-item')].forEach((item, index) => {
        const chord = state.sequence[index];
        const pill = item.querySelector('.pill');
        if (!chord || !pill) return;
        const meter = meterForChord(chord);
        const parts = [`${formatNumber(beatsForChord(chord))}拍`, meterText(meter), `octave ${chord.octave || 4}`];
        if (finitePositive(chord.tempo)) parts.splice(2, 0, `${formatNumber(chord.tempo)} BPM`);
        pill.textContent = parts.join(' / ');
      });
      return result;
    };
  }

  function patchPlayback() {
    duration = function () {
      return state.sequence.reduce((sum, chord) => sum + secondsForChord(chord), 0);
    };
    schedulePass = function () {
      if (!state.isPlaying) return;
      const ctx = audio();
      let t = ctx.currentTime + 0.08;
      state.startedAt = t;
      state.passDuration = duration();
      progress(ctx);
      state.sequence.forEach((chord, index) => {
        const chordDuration = secondsForChord(chord);
        state.nodes.push(...scheduleChord(ctx, chord, t, chordDuration));
        state.timers.push(setTimeout(() => {
          state.active = index;
          render();
          renderKeyboard(notes(chord));
        }, Math.max(0, (t - ctx.currentTime) * 1000)));
        t += chordDuration;
      });
      state.timers.push(setTimeout(() => {
        state.active = -1;
        render();
        renderKeyboard([]);
        if ($('loop').checked && state.isPlaying) {
          notify('ループ再生');
          state.loopTimer = setTimeout(schedulePass, 120);
        } else {
          state.isPlaying = false;
          notify('Ready');
          $('progress').style.width = '0%';
          clearInterval(state.progressTimer);
        }
      }, Math.max(0, (t - ctx.currentTime) * 1000)));
      notify($('loop').checked ? 'ループ再生中' : '再生中');
    };
  }

  function patchMidiExport() {
    exportMidi = function () {
      if (!state.sequence.length) return notify('コードがありません');
      const ppq = 480;
      const events = [];
      let tick = 0;
      let lastTempo = null;
      let lastMeter = null;

      state.sequence.forEach(chord => {
        const tempo = tempoForChord(chord);
        const meter = meterForChord(chord);
        const meterKey = meterText(meter);
        if (tempo !== lastTempo) {
          events.push({ tick, kind: 'tempo', tempo, priority: 1 });
          lastTempo = tempo;
        }
        if (meterKey !== lastMeter) {
          events.push({ tick, kind: 'meter', meter, priority: 1 });
          lastMeter = meterKey;
        }
        const chordTicks = Math.max(1, Math.round(quarterUnitsForChord(chord) * ppq));
        notes(chord).forEach(note => events.push({ tick, kind: 'on', note, priority: 2 }));
        notes(chord).forEach(note => events.push({ tick: tick + chordTicks, kind: 'off', note, priority: 0 }));
        tick += chordTicks;
      });

      events.sort((a, b) => a.tick - b.tick || a.priority - b.priority);
      const track = [];
      let lastTick = 0;
      events.forEach(event => {
        varlen(track, event.tick - lastTick);
        lastTick = event.tick;
        if (event.kind === 'tempo') {
          const microseconds = Math.round(60000000 / event.tempo);
          track.push(0xff, 0x51, 3, (microseconds >> 16) & 255, (microseconds >> 8) & 255, microseconds & 255);
        } else if (event.kind === 'meter') {
          const exponent = Math.round(Math.log2(event.meter.denominator));
          track.push(0xff, 0x58, 4, event.meter.numerator & 255, exponent & 255, 24, 8);
        } else {
          track.push(event.kind === 'on' ? 0x90 : 0x80, event.note, event.kind === 'on' ? Math.round(105 * Number($('velocity').value || 0.76)) : 0);
        }
      });
      varlen(track, 0);
      track.push(0xff, 0x2f, 0);
      const bytes = [
        ...ascii('MThd'), 0, 0, 0, 6, 0, 0, 0, 1, (ppq >> 8) & 255, ppq & 255,
        ...ascii('MTrk'), ...u32(track.length), ...track
      ];
      download(new Blob([new Uint8Array(bytes)], { type: 'audio/midi' }), 'chord-sequence.mid');
      notify('テンポ・拍子付きMIDIを書き出しました');
    };
    if ($('exportMidi')) $('exportMidi').onclick = exportMidi;
  }

  function patchWavExport() {
    exportWav = async function () {
      if (!state.sequence.length) return notify('コードがありません');
      notify('WAVをレンダリング中…');
      const total = duration() + 2.2;
      const sampleRate = 44100;
      const ctx = new OfflineAudioContext(2, Math.ceil(total * sampleRate), sampleRate);
      const master = ctx.createGain();
      master.gain.value = 0.82;
      master.connect(ctx.destination);
      let t = 0.06;
      state.sequence.forEach(chord => {
        const chordDuration = secondsForChord(chord);
        scheduleChord(ctx, chord, t, chordDuration, master);
        t += chordDuration;
      });
      const buffer = await ctx.startRendering();
      download(wav(buffer), 'chord-sequence.wav');
      notify('WAVを書き出しました');
    };
    if ($('exportWav')) $('exportWav').onclick = exportWav;
  }

  function patchProjectIo() {
    saveProject = function () {
      const project = {
        version: 4,
        bpm: $('bpm').value,
        timeSignature: meterText(currentMeter()),
        chordProMetadata: state.chordProMetadata || null,
        instrument: $('instrument').value,
        loop: $('loop').checked,
        attack: $('attack').value,
        release: $('release').value,
        velocity: $('velocity').value,
        humanize: $('humanize').value,
        reverb: $('reverb').value,
        sequence: state.sequence
      };
      download(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), 'chord-sequence.json');
      notify('プロジェクトを保存しました');
    };
    loadProject = async function (event) {
      const file = event.target.files[0];
      if (!file) return;
      const data = JSON.parse(await file.text());
      ['bpm', 'instrument', 'attack', 'release', 'velocity', 'humanize', 'reverb'].forEach(id => {
        if (data[id] !== undefined && $(id)) $(id).value = data[id];
      });
      if (data.timeSignature && $('timeSignature')) {
        $('timeSignature').value = meterText(parseMeter(data.timeSignature));
        localStorage.setItem(METER_KEY, $('timeSignature').value);
      }
      if (typeof data.loop === 'boolean') $('loop').checked = data.loop;
      if (Array.isArray(data.sequence)) state.sequence = data.sequence;
      state.chordProMetadata = data.chordProMetadata || null;
      render();
      notify('プロジェクトを読み込みました');
    };
    if ($('saveProject')) $('saveProject').onclick = saveProject;
    if ($('loadProject')) $('loadProject').onchange = loadProject;
  }

  function install() {
    installControls();
    bindImporter();
    bindDirectInput();
    patchRender();
    patchPlayback();
    patchMidiExport();
    patchWavExport();
    patchProjectIo();
    render();
    updateChordProPreview();
    document.body.dataset.chordProMetadataVersion = VERSION;
    window.WEBSEQ_CHORDPRO_METADATA = {
      version: VERSION,
      parseChordProDocument: text => parseChordProDocument(text, parserApi().parseChordSymbol, {
        tempo: Number($('bpm')?.value || 100),
        timeSignature: meterText(currentMeter())
      }),
      parseMeter,
      secondsForChord,
      beatsForChord
    };
    notify('ChordProのテンポ・拍子・拍数に対応しました');
  }

  function wait() {
    if (typeof window === 'undefined') return;
    if (typeof state === 'undefined' || typeof render !== 'function' || typeof scheduleChord !== 'function' || !parserApi()?.parseChordSymbol || !$('chordProText')) {
      setTimeout(wait, 60);
      return;
    }
    install();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseMeter, parseTempo, parseBeatValue, parseChordProDocument };
  }
  if (typeof window !== 'undefined') wait();
})();
