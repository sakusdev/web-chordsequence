(() => {
  const VERSION = '2026-07-05-sf2-preset-1';
  const GEN = {
    startAddrsOffset: 0,
    endAddrsOffset: 1,
    startloopAddrsOffset: 2,
    endloopAddrsOffset: 3,
    startAddrsCoarseOffset: 4,
    modLfoToPitch: 5,
    vibLfoToPitch: 6,
    modEnvToPitch: 7,
    initialFilterFc: 8,
    initialFilterQ: 9,
    pan: 17,
    instrument: 41,
    keyRange: 43,
    velRange: 44,
    initialAttenuation: 48,
    coarseTune: 51,
    fineTune: 52,
    sampleID: 53,
    sampleModes: 54,
    overridingRootKey: 58
  };

  function wait() {
    if (typeof state === 'undefined' || typeof schedulePiano !== 'function' || typeof output !== 'function') {
      setTimeout(wait, 60);
      return;
    }
    installSf2PresetMode();
  }

  function $(id) { return document.getElementById(id); }
  function status(text) { try { setStatus(text); } catch { console.log(text); } }

  function readText(buffer, offset, length) {
    return Array.from(new Uint8Array(buffer, offset, length)).map(c => c ? String.fromCharCode(c) : '').join('');
  }

  function parseChunks(buffer, from, to) {
    const view = new DataView(buffer);
    const chunks = [];
    for (let p = from; p + 8 <= to;) {
      const id = readText(buffer, p, 4);
      const size = view.getUint32(p + 4, true);
      const data = p + 8;
      const type = id === 'LIST' ? readText(buffer, data, 4) : '';
      chunks.push({ id, type, data: id === 'LIST' ? data + 4 : data, size: id === 'LIST' ? size - 4 : size, end: data + size });
      p = data + size + (size & 1);
    }
    return chunks;
  }

  function findChunk(chunks, idOrType) {
    return chunks.find(c => c.id === idOrType || c.type === idOrType) || null;
  }

  function readRangeAmount(view, offset) {
    return { lo: view.getUint8(offset), hi: view.getUint8(offset + 1) };
  }

  function readSignedAmount(view, offset) {
    return view.getInt16(offset, true);
  }

  function zoneGenerators(gens) {
    const out = {};
    gens.forEach(gen => {
      if (gen.oper === GEN.keyRange || gen.oper === GEN.velRange) out[gen.oper] = gen.range;
      else out[gen.oper] = gen.amount;
    });
    return out;
  }

  function mergeGenerators(...sets) {
    const out = {};
    sets.forEach(set => Object.assign(out, set || {}));
    return out;
  }

  function parseSf2PresetAware(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    if (readText(arrayBuffer, 0, 4) !== 'RIFF' || readText(arrayBuffer, 8, 4) !== 'sfbk') throw Error('Not SoundFont 2');
    const top = parseChunks(arrayBuffer, 12, arrayBuffer.byteLength);
    const sdta = findChunk(top, 'sdta');
    const pdta = findChunk(top, 'pdta');
    if (!sdta || !pdta) throw Error('Missing sdta/pdta');
    const sdtaChunks = parseChunks(arrayBuffer, sdta.data, sdta.end);
    const pdtaChunks = parseChunks(arrayBuffer, pdta.data, pdta.end);
    const smpl = findChunk(sdtaChunks, 'smpl');
    const phdr = findChunk(pdtaChunks, 'phdr');
    const pbag = findChunk(pdtaChunks, 'pbag');
    const pgen = findChunk(pdtaChunks, 'pgen');
    const inst = findChunk(pdtaChunks, 'inst');
    const ibag = findChunk(pdtaChunks, 'ibag');
    const igen = findChunk(pdtaChunks, 'igen');
    const shdr = findChunk(pdtaChunks, 'shdr');
    if (!smpl || !phdr || !pbag || !pgen || !inst || !ibag || !igen || !shdr) throw Error('Missing preset/instrument chunks');

    const sampleHeaders = [];
    for (let p = shdr.data; p + 46 <= shdr.end; p += 46) {
      const name = readText(arrayBuffer, p, 20).replace(/\0/g, '').trim();
      if (!name || name === 'EOS') continue;
      const start = view.getUint32(p + 20, true);
      const end = view.getUint32(p + 24, true);
      const loopStart = view.getUint32(p + 28, true);
      const loopEnd = view.getUint32(p + 32, true);
      const sampleRate = view.getUint32(p + 36, true) || 44100;
      const originalPitch = view.getUint8(p + 40) || 60;
      const pitchCorrection = view.getInt8(p + 41) || 0;
      const sampleType = view.getUint16(p + 44, true);
      const frames = Math.max(0, end - start);
      if (!frames || frames > 20000000) { sampleHeaders.push(null); continue; }
      const data = new Float32Array(frames);
      const byteStart = smpl.data + start * 2;
      for (let i = 0; i < frames; i++) data[i] = view.getInt16(byteStart + i * 2, true) / 32768;
      sampleHeaders.push({ name, data, sampleRate, originalPitch, pitchCorrection, loopStart: loopStart - start, loopEnd: loopEnd - start, sampleType });
    }

    const presetHeaders = [];
    for (let p = phdr.data; p + 38 <= phdr.end; p += 38) {
      const name = readText(arrayBuffer, p, 20).replace(/\0/g, '').trim();
      presetHeaders.push({ name, preset: view.getUint16(p + 20, true), bank: view.getUint16(p + 22, true), bagIndex: view.getUint16(p + 24, true) });
    }

    const presetBags = [];
    for (let p = pbag.data; p + 4 <= pbag.end; p += 4) presetBags.push({ genIndex: view.getUint16(p, true) });

    const presetGens = [];
    for (let p = pgen.data; p + 4 <= pgen.end; p += 4) {
      const oper = view.getUint16(p, true);
      presetGens.push({ oper, amount: readSignedAmount(view, p + 2), range: readRangeAmount(view, p + 2) });
    }

    const instruments = [];
    for (let p = inst.data; p + 22 <= inst.end; p += 22) {
      const name = readText(arrayBuffer, p, 20).replace(/\0/g, '').trim();
      instruments.push({ name, bagIndex: view.getUint16(p + 20, true) });
    }

    const instrumentBags = [];
    for (let p = ibag.data; p + 4 <= ibag.end; p += 4) instrumentBags.push({ genIndex: view.getUint16(p, true) });

    const instrumentGens = [];
    for (let p = igen.data; p + 4 <= igen.end; p += 4) {
      const oper = view.getUint16(p, true);
      instrumentGens.push({ oper, amount: readSignedAmount(view, p + 2), range: readRangeAmount(view, p + 2) });
    }

    function gensForBag(bags, gens, bagIndex, nextBagIndex) {
      const start = bags[bagIndex]?.genIndex ?? 0;
      const end = bags[nextBagIndex]?.genIndex ?? gens.length;
      return gens.slice(start, end);
    }

    const presets = [];
    for (let pi = 0; pi < presetHeaders.length - 1; pi++) {
      const ph = presetHeaders[pi];
      const nextPh = presetHeaders[pi + 1];
      if (!ph.name || ph.name === 'EOP') continue;
      const zones = [];
      let globalPreset = {};
      for (let pbi = ph.bagIndex; pbi < nextPh.bagIndex; pbi++) {
        const pgens = gensForBag(presetBags, presetGens, pbi, pbi + 1);
        const pzone = zoneGenerators(pgens);
        const instrumentIndex = pzone[GEN.instrument];
        if (instrumentIndex === undefined) { globalPreset = mergeGenerators(globalPreset, pzone); continue; }
        const ih = instruments[instrumentIndex];
        const nextIh = instruments[instrumentIndex + 1];
        if (!ih || !nextIh) continue;
        let globalInstrument = {};
        for (let ibi = ih.bagIndex; ibi < nextIh.bagIndex; ibi++) {
          const igens = gensForBag(instrumentBags, instrumentGens, ibi, ibi + 1);
          const izone = zoneGenerators(igens);
          const sampleIndex = izone[GEN.sampleID];
          if (sampleIndex === undefined) { globalInstrument = mergeGenerators(globalInstrument, izone); continue; }
          const sample = sampleHeaders[sampleIndex];
          if (!sample) continue;
          const combined = mergeGenerators(globalPreset, pzone, globalInstrument, izone);
          const keyRange = combined[GEN.keyRange] || { lo: 0, hi: 127 };
          const velRange = combined[GEN.velRange] || { lo: 0, hi: 127 };
          zones.push({
            sample,
            keyRange,
            velRange,
            rootKey: combined[GEN.overridingRootKey] >= 0 ? combined[GEN.overridingRootKey] : sample.originalPitch,
            coarseTune: combined[GEN.coarseTune] || 0,
            fineTune: combined[GEN.fineTune] || 0,
            attenuation: combined[GEN.initialAttenuation] || 0,
            pan: combined[GEN.pan] || 0,
            sampleModes: combined[GEN.sampleModes] || 0
          });
        }
      }
      if (zones.length) presets.push({ name: ph.name, bank: ph.bank, preset: ph.preset, zones });
    }

    if (!presets.length) throw Error('No playable SF2 presets found');
    const preferred = presets.find(p => /piano|grand|bright|honky/i.test(p.name)) || presets[0];
    return { version: VERSION, presets, currentPresetIndex: presets.indexOf(preferred) };
  }

  function ensurePresetUi() {
    if (document.getElementById('sf2Preset')) return;
    const sf2File = document.getElementById('sf2File');
    if (!sf2File) return;
    const label = document.createElement('label');
    label.textContent = 'SF2 Preset';
    const select = document.createElement('select');
    select.id = 'sf2Preset';
    select.innerHTML = '<option value="">Load SF2 first</option>';
    select.onchange = () => {
      if (!state.sf2?.presets) return;
      state.sf2.currentPresetIndex = Number(select.value || 0);
      status('SF2 preset: ' + state.sf2.presets[state.sf2.currentPresetIndex]?.name);
    };
    label.append(select);
    sf2File.closest('label')?.after(label);
  }

  function updatePresetUi() {
    ensurePresetUi();
    const select = document.getElementById('sf2Preset');
    if (!select || !state.sf2?.presets) return;
    select.innerHTML = '';
    state.sf2.presets.forEach((preset, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${preset.bank}:${preset.preset} ${preset.name}`;
      select.append(option);
    });
    select.value = String(state.sf2.currentPresetIndex || 0);
  }

  function findSf2Zone(midi, velocity = 100) {
    const preset = state.sf2?.presets?.[state.sf2.currentPresetIndex || 0];
    if (!preset) return null;
    const candidates = preset.zones.filter(zone => midi >= zone.keyRange.lo && midi <= zone.keyRange.hi && velocity >= zone.velRange.lo && velocity <= zone.velRange.hi);
    if (candidates.length) return candidates.sort((a, b) => (a.keyRange.hi - a.keyRange.lo) - (b.keyRange.hi - b.keyRange.lo))[0];
    return preset.zones.reduce((best, zone) => {
      const mid = (zone.keyRange.lo + zone.keyRange.hi) / 2;
      const bestMid = (best.keyRange.lo + best.keyRange.hi) / 2;
      return Math.abs(mid - midi) < Math.abs(bestMid - midi) ? zone : best;
    }, preset.zones[0]);
  }

  window.scheduleSf2Note = function(ctx, midi, start, duration, destination) {
    const velocityValue = Number($('velocity')?.value || .76);
    const velocity = Math.max(1, Math.min(127, Math.round(velocityValue * 127)));
    const zone = findSf2Zone(midi, velocity);
    if (!zone) return schedulePiano(ctx, midi, start, duration, destination);
    const sample = zone.sample;
    const buffer = ctx.createBuffer(1, sample.data.length, sample.sampleRate);
    buffer.copyToChannel(sample.data, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const root = zone.rootKey || sample.originalPitch || 60;
    const cents = (sample.pitchCorrection || 0) + (zone.coarseTune || 0) * 100 + (zone.fineTune || 0);
    source.playbackRate.value = Math.pow(2, (midi - root - cents / 100) / 12);
    if ((zone.sampleModes & 1) && sample.loopEnd > sample.loopStart && sample.loopEnd < sample.data.length) {
      source.loop = true;
      source.loopStart = sample.loopStart / sample.sampleRate;
      source.loopEnd = sample.loopEnd / sample.sampleRate;
    }
    const gain = ctx.createGain();
    const attack = Math.max(.003, Number($('attack')?.value || .01));
    const release = Number($('release')?.value || .82);
    const attenuationGain = Math.pow(10, -(zone.attenuation || 0) / 200);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.34 * velocityValue * attenuationGain, start + attack);
    gain.gain.setValueAtTime(0.30 * velocityValue * attenuationGain, Math.max(start + attack, start + duration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);
    source.connect(gain);
    gain.connect(destination);
    source.start(start);
    source.stop(start + duration + release + .08);
    return [source];
  };

  function installSf2PresetMode() {
    ensurePresetUi();
    const input = document.getElementById('sf2File');
    if (!input) return;
    input.onchange = async event => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        status('Loading SF2 presets...');
        state.sf2 = parseSf2PresetAware(await file.arrayBuffer());
        updatePresetUi();
        const preset = state.sf2.presets[state.sf2.currentPresetIndex];
        const instrument = document.getElementById('instrument');
        if (instrument) instrument.value = 'sf2';
        status(`SF2 loaded: ${preset.name} / ${state.sf2.presets.length} presets`);
      } catch (error) {
        console.error(error);
        state.sf2 = null;
        status('SF2 preset load failed');
        alert('SF2のプリセット読み込みに失敗しました: ' + error.message + '\n通常のSoundFont 2 / 16bit PCM .sf2を試してください。');
      }
    };
    status('SF2 preset mode ready');
  }

  wait();
})();
