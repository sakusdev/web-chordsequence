(() => {
  const VERSION = '2026-07-15-chord-extended-1';
  const MAX_IMPORT = 512;
  const RECENT_KEY = 'webseq:recent-chords:v1';
  const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const NATURAL = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
  const DEGREE = { 2:2,3:4,4:5,5:7,6:9,7:11,9:14,11:17,13:21 };
  let oldLabel, oldNotes, observer;

  const $ = id => typeof document === 'undefined' ? null : document.getElementById(id);
  const mod = n => ((n % 12) + 12) % 12;
  const clean = value => String(value || '').trim()
    .replace(/[♯＃]/g,'#').replace(/[♭ｂ]/g,'b').replace(/𝄪/g,'x').replace(/𝄫/g,'bb')
    .replace(/[△Δ]/g,'maj').replace(/[−–—]/g,'-').replace(/º/g,'°').replace(/\s+/g,'');

  function note(value) {
    const source = clean(value);
    const match = source.match(/^([A-Ga-g])((?:#{1,2}|b{1,2}|x)?)$/);
    if (!match) return null;
    let pitch = NATURAL[match[1].toUpperCase()];
    for (const char of match[2] || '') pitch += char === '#' ? 1 : char === 'b' ? -1 : 2;
    const pc = mod(pitch);
    return { source, pc, canonical:NAMES[pc] };
  }

  function slash(symbol) {
    const match = symbol.match(/\/([A-Ga-g](?:#{1,2}|b{1,2}|x)?)$/);
    if (!match) return { main:symbol,bass:null };
    const bass = note(match[1]);
    return bass ? { main:symbol.slice(0,match.index),bass } : { main:symbol,bass:null };
  }

  function qualitySource(value) {
    return clean(value).replace(/^:/,'')
      .replace(/^7M/i,'maj7').replace(/^7\+$/i,'maj7').replace(/\^/g,'maj')
      .replace(/M(?=\d)/g,'maj').replace(/major/gi,'maj').replace(/minor/gi,'m')
      .replace(/min/gi,'m').replace(/mi(?=\d|maj|add|sus|$)/gi,'m')
      .replace(/^-(?=\d|maj|add|sus|$)/,'m').replace(/half-?dim/gi,'m7b5')
      .replace(/hdim/gi,'m7b5').replace(/ø7?/gi,'m7b5').replace(/^o(?=\d|$)/i,'dim')
      .replace(/^°(?=\d|$)/,'dim').replace(/^\+(?=\d|$)/,'aug').replace(/dom/gi,'')
      .replace(/(.)\+(?=(?:3|5|7|9|11|13))/g,'$1#')
      .replace(/(.)-(?=(?:3|5|7|9|11|13))/g,'$1b')
      .replace(/69/g,'6/9').replace(/sus(?![24])/gi,'sus4');
  }

  function removeDegree(set, degree) {
    const natural = DEGREE[degree];
    if (natural === undefined) return;
    [...set].forEach(interval => {
      if (degree <= 7 ? mod(interval) === mod(natural) : interval === natural) set.delete(interval);
    });
  }

  function extension(source) {
    if (/6\/9/.test(source)) return '6/9';
    const core = source.replace(/add[#b]{0,2}(?:2|3|4|5|6|7|9|11|13)/gi,'')
      .replace(/(?:no|omit)(?:2|3|4|5|6|7|9|11|13)/gi,'')
      .replace(/[#b]{1,2}(?:3|5|7|9|11|13)/g,'').replace(/sus[24]?/gi,'')
      .replace(/alt/gi,'').replace(/[(),]/g,'');
    const match = core.match(/(13|11|9|7|6|5|4|2)(?!.*(?:13|11|9|7|6|5|4|2))/);
    return match?.[1] || null;
  }

  function formula(rawSuffix) {
    const suffix = clean(rawSuffix);
    const source = qualitySource(rawSuffix);
    const lower = source.toLowerCase();
    const half = /^m7b5/.test(lower);
    const dim = !half && /^(?:dim|°)/.test(lower);
    const dimMaj = /^dimmaj/.test(lower);
    const aug = /^(?:aug|\+)/.test(lower);
    const minMaj = /^mmaj/.test(lower) || /^m.*\(maj/.test(lower);
    const majMarked = /^maj/.test(lower) || /maj(?:7|9|11|13)/.test(lower);
    const minor = !half && !minMaj && /^m(?!aj)/.test(lower);
    const sus2 = /sus2/.test(lower), sus4 = /sus4/.test(lower);
    const power = /^5$/.test(lower), alt = /alt/.test(lower), ext = extension(lower);
    const set = new Set([0]);
    let family = 'major';

    if (power) { set.add(7); family='power'; }
    else if (half) { set.add(3);set.add(6);family='half'; }
    else if (dim) { set.add(3);set.add(6);family='dim'; }
    else if (aug) { set.add(4);set.add(8);family='aug'; }
    else if (minor || minMaj) { set.add(3);set.add(7);family=minMaj?'minMaj':'minor'; }
    else { set.add(4);set.add(7); }

    if (sus2 || sus4) { set.delete(3);set.delete(4);set.add(sus2?2:5);family=sus2?'sus2':'sus4'; }
    const add7 = () => set.add(dimMaj ? 11 : dim && !half ? 9 : majMarked || minMaj ? 11 : 10);
    if (ext==='6/9') { set.add(9);set.add(14); }
    else if (ext==='6') set.add(9);
    else if (ext==='7') add7();
    else if (ext==='9') { add7();set.add(14); }
    else if (ext==='11') { add7();set.add(14);set.add(17); }
    else if (ext==='13') { add7();set.add(14);set.add(17);set.add(21); }
    else if (ext==='2') set.add(2);
    else if (ext==='4') { set.delete(3);set.delete(4);set.add(5);family='sus4'; }
    if (half) { set.add(10);family='half'; }
    if (alt) { set.clear();[0,4,10,13,15,18,20].forEach(x=>set.add(x));family='dominant'; }

    let match;
    const adds = /add([#b]{0,2})(2|3|4|5|6|7|9|11|13)/gi;
    while ((match=adds.exec(lower))) {
      const delta=[...(match[1]||'')].reduce((n,c)=>n+(c==='#'?1:-1),0);
      set.add(DEGREE[Number(match[2])]+delta);
    }
    const groups = new Map(), alterations=/([#b]{1,2})(3|5|7|9|11|13)/g;
    while ((match=alterations.exec(lower))) {
      const degree=Number(match[2]), delta=[...match[1]].reduce((n,c)=>n+(c==='#'?1:-1),0);
      if (!groups.has(degree)) groups.set(degree,new Set());
      groups.get(degree).add(delta);
    }
    groups.forEach((deltas,degree)=>{ removeDegree(set,degree);deltas.forEach(d=>set.add(DEGREE[degree]+d)); });
    const omits=/(?:no|omit)(2|3|4|5|6|7|9|11|13)/gi;
    while ((match=omits.exec(lower))) removeDegree(set,Number(match[1]));
    if (/m7b5/.test(lower)) { set.delete(7);set.add(6);set.add(10); }
    if (/dim7/.test(lower)) { set.delete(10);set.delete(11);set.add(9); }

    const unknown = lower.replace(/^(?:m7b5|mmaj|maj|dim|aug|sus2|sus4|m|\+|°|o)/,'')
      .replace(/add[#b]{0,2}(?:2|3|4|5|6|7|9|11|13)/g,'')
      .replace(/[#b]{1,2}(?:3|5|7|9|11|13)/g,'')
      .replace(/(?:no|omit)(?:2|3|4|5|6|7|9|11|13)/g,'')
      .replace(/sus[24]?|alt|maj/g,'').replace(/6\/9|13|11|9|7|6|5|4|2/g,'').replace(/[(),]/g,'');
    if (unknown && !/^[./-]*$/.test(unknown)) return {ok:false,reason:`コードタイプ「${rawSuffix}」を完全には解釈できません`};

    const intervals=[...set].filter(x=>Number.isFinite(x)&&x>=0&&x<=36).sort((a,b)=>a-b).slice(0,9);
    let base='major';
    if (half) base='m7b5'; else if (dim) base='dim'; else if (aug) base='aug'; else if (minMaj) base='mMaj7';
    else if (minor && ['7','9','11','13'].includes(ext)) base='m7';
    else if (majMarked && ['7','9','11','13'].includes(ext)) base='maj7';
    else if (!minor&&!majMarked&&(['7','9','11','13'].includes(ext)||alt)) base='7';
    else if (family==='sus2') base='sus2'; else if (family==='sus4') base='sus4'; else if (minor) base='minor';
    return {ok:true,intervals,base,suffix};
  }

  function parse(symbol, defaults={}) {
    const original=String(symbol||'').trim();
    if (!original) return {ok:false,reason:'コード名を入力してください',source:original};
    const cleaned=clean(original).replace(/^\[|\]$/g,'');
    if (/^(?:N\.?C\.?|N\/C|NOCHORD|X|-)$/i.test(cleaned)) return {ok:false,noChord:true,reason:`「${original}」はコードなし指定です`,source:original};
    const parts=slash(cleaned), match=parts.main.match(/^([A-Ga-g](?:#{1,2}|b{1,2}|x)?)(.*)$/);
    if (!match) return {ok:false,reason:`「${original}」をコードとして解釈できません`,source:original};
    const root=note(match[1]), f=formula(match[2]);
    if (!root) return {ok:false,reason:`「${original}」のルート音に対応していません`,source:original};
    if (!f.ok) return {ok:false,reason:`「${original}」: ${f.reason}`,source:original};
    const octave=Number(defaults.octave??$('octave')?.value??4), bars=Number(defaults.bars??$('bars')?.value??1);
    return {ok:true,source:original,chord:{root:root.canonical,rootLabel:root.source,quality:f.base,intervals:f.intervals,suffix:f.suffix,bass:parts.bass?.canonical||null,bassLabel:parts.bass?.source||null,octave:Number.isFinite(octave)?octave:4,bars:Number.isFinite(bars)&&bars>0?bars:1}};
  }

  const clone = chord => ({...chord,intervals:Array.isArray(chord?.intervals)?[...chord.intervals]:chord?.intervals});
  const name = chord => {
    try { return label(chord); } catch { return `${chord.rootLabel||chord.root}${chord.suffix||''}${chord.bass?`/${chord.bassLabel||chord.bass}`:''}`; }
  };

  function extract(text) {
    const chords=[], invalid=[];let noChord=0,match;const regex=/\[([^\]\r\n]+)\]/g;
    while ((match=regex.exec(String(text||''))) && chords.length<MAX_IMPORT) {
      const token=match[1].trim();
      if (token==='%'&&chords.length) { chords.push(clone(chords.at(-1)));continue; }
      const parsed=parse(token);
      if (parsed.ok) chords.push(parsed.chord); else if (parsed.noChord) noChord++; else invalid.push(token);
    }
    return {chords,invalid:[...new Set(invalid)],noChordCount:noChord,truncated:chords.length>=MAX_IMPORT};
  }

  function installModel() {
    if (window.__webseqExtendedChordModelV2) return;
    window.__webseqExtendedChordModelV2=true;oldLabel=label;oldNotes=notes;
    label=function(chord){
      if (chord&&(Object.hasOwn(chord,'suffix')||chord.bass)) return `${chord.rootLabel||chord.root}${chord.suffix??''}${chord.bass?`/${chord.bassLabel||chord.bass}`:''}`;
      return oldLabel(chord);
    };
    notes=function(chord){
      if (!chord||!Array.isArray(chord.intervals)) return oldNotes(chord);
      const octave=Number(chord.octave||4), root=midiRoot(chord.root,octave), list=chord.intervals.map(i=>root+Number(i||0));
      if (chord.bass) { const index=NAMES.indexOf(chord.bass);if(index>=0){let bass=12*(octave+1)+index;while(bass>=root)bass-=12;list.unshift(bass);} }
      return [...new Set(list)].sort((a,b)=>a-b);
    };
  }

  function notify(text) { try{setStatus(text)}catch{} try{if(typeof toast==='function')toast(text)}catch{} }
  function previewInput() {
    const input=$('chordSymbolInput'), result=$('chordSymbolResult');if(!input||!result)return null;
    const parsed=parse(input.value);result.classList.toggle('is-error',!parsed.ok&&!!input.value.trim());
    result.textContent=!input.value.trim()?'例：C#dim7、F#m7b5、Bbmaj13(#11)、G7alt/B':parsed.ok?`${name(parsed.chord)} ／ 構成音 ${parsed.chord.intervals.length}音${parsed.chord.bass?` ／ ベース ${parsed.chord.bassLabel}`:''}`:parsed.reason;
    return parsed;
  }

  function renderRecent() {
    const box=$('recentChords');if(!box)return;let recent=[];try{recent=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]')}catch{}
    box.innerHTML=recent.length?'':'<span class="micro">最近使ったコードがここに表示されます。</span>';
    recent.forEach(chord=>{const button=document.createElement('button');button.type='button';button.textContent=name(chord);button.onclick=()=>{const copy=clone(chord);state.sequence.push(copy);render();saveRecent(copy);notify(`${name(copy)}を追加しました`)};box.append(button)});
  }
  function saveRecent(chord) {
    try{const recent=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]').filter(c=>name(c)!==name(chord));recent.unshift(clone(chord));localStorage.setItem(RECENT_KEY,JSON.stringify(recent.slice(0,8)));renderRecent()}catch{}
  }
  function direct(action) {
    const parsed=previewInput();if(!parsed?.ok)return notify(parsed?.reason||'コード名を確認してください');const chord=clone(parsed.chord);
    if(action==='preview'){preview(chord);notify(`${name(chord)}を試聴`)}else{state.sequence.push(chord);render();saveRecent(chord);notify(`${name(chord)}を追加しました`)}
    $('chordSymbolInput')?.focus();
  }
  function chordProPreview() {
    const area=$('chordProText'),result=$('chordProResult');if(!area||!result)return null;const parsed=extract(area.value);
    if(!area.value.trim()){result.textContent='角括弧内のコードを出現順に読み込みます。オンコードも保持します。';result.classList.remove('is-error');return parsed}
    if(!parsed.chords.length){result.textContent='コードを検出できませんでした。ChordProの [C] 表記を使用してください。';result.classList.add('is-error');return parsed}
    const notices=[];if(parsed.invalid.length)notices.push(`未解釈 ${parsed.invalid.length}種類`);if(parsed.noChordCount)notices.push(`N.C. ${parsed.noChordCount}個`);if(parsed.truncated)notices.push(`最大${MAX_IMPORT}個`);
    result.textContent=`${parsed.chords.length}個検出：${parsed.chords.slice(0,8).map(name).join(' → ')}${parsed.chords.length>8?' …':''}${notices.length?` ／ ${notices.join('・')}`:''}`;result.classList.remove('is-error');return parsed;
  }
  function importChordPro(mode) {
    const parsed=chordProPreview();if(!parsed?.chords.length)return notify('インポートできるコードがありません');const octave=Number($('octave')?.value||4),bars=Number($('bars')?.value||1),list=parsed.chords.map(c=>({...clone(c),octave,bars}));
    if(mode==='replace')state.sequence=list;else state.sequence.push(...list);render();list.forEach(saveRecent);notify(`${list.length}個のコードを${mode==='replace'?'読み込みました':'末尾へ追加しました'}`);
  }

  function replaceNode(id,bind) { const old=$(id);if(!old)return null;const fresh=old.cloneNode(true);old.replaceWith(fresh);bind(fresh);return fresh; }
  function patchUi() {
    replaceNode('chordSymbolInput',input=>{input.placeholder='C#dim7 / G7alt/B';input.addEventListener('input',previewInput);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();direct('add')}})});
    const examples=$('chordSymbolExamples');if(examples)examples.innerHTML='<option value="C#dim7"><option value="F#m7b5"><option value="Bbmaj13(#11)"><option value="G7alt/B"><option value="AmMaj9"><option value="D13b9"><option value="C6/9">';
    const result=$('chordSymbolResult');if(result){result.textContent='例：C#dim7、F#m7b5、Bbmaj13(#11)、G7alt/B';if(!result.nextElementSibling?.classList.contains('support-hint'))result.insertAdjacentHTML('afterend','<div class="support-hint">maj / m / dim / dim7 / ø / aug / sus / add / 6/9 / 7–13 / altered / omit / オンコード対応</div>')}
    if($('directAddChord'))$('directAddChord').onclick=()=>direct('add');if($('directPreviewChord'))$('directPreviewChord').onclick=()=>direct('preview');
    replaceNode('chordProText',area=>{area.placeholder='{title: Example}\n[Cmaj7]歌詞 [G7/B]オンコード\n[C#dim7]経過和音 [Dm9]次のコード';area.addEventListener('input',chordProPreview)});
    if($('replaceWithChordPro'))$('replaceWithChordPro').onclick=()=>importChordPro('replace');if($('appendChordPro'))$('appendChordPro').onclick=()=>importChordPro('append');
    const micro=$('chordProImporter')?.querySelector('.micro');if(micro)micro.textContent='各コードの長さとオクターブには上の設定を使います。オンコードはベース音を実際に鳴らし、N.C. は読み飛ばします。';
  }

  function transpose(amount) {
    if(!state.sequence.length)return notify('移調するコードがありません');state.sequence=state.sequence.map(chord=>{const r=NAMES.indexOf(chord.root),b=chord.bass?NAMES.indexOf(chord.bass):-1;return{...clone(chord),root:r>=0?NAMES[mod(r+amount)]:chord.root,rootLabel:r>=0?NAMES[mod(r+amount)]:(chord.rootLabel||chord.root),bass:b>=0?NAMES[mod(b+amount)]:chord.bass,bassLabel:b>=0?NAMES[mod(b+amount)]:chord.bassLabel}});render();notify(`${amount>0?'+':''}${amount}半音 移調しました`);
  }
  function bindActions() {
    const bind=()=>{
      const dock=$('dockAdd');if(dock){dock.onclick=()=>$('directAddChord')?.click()}
      const dup=$('duplicateLast');if(dup){dup.onclick=()=>{const last=state.sequence.at(-1);if(!last)return notify('複製するコードがありません');const copy=clone(last);state.sequence.push(copy);render();saveRecent(copy);notify(`${name(copy)}を複製しました`)}}
      if($('transposeDown'))$('transposeDown').onclick=()=>transpose(-1);if($('transposeUp'))$('transposeUp').onclick=()=>transpose(1);
    };bind();observer=new MutationObserver(bind);observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer?.disconnect(),6000);
  }

  function install() {
    installModel();patchUi();bindActions();renderRecent();render();previewInput();
    document.body.dataset.chordExtendedVersion=VERSION;notify('オンコード・dim・テンションコードに対応しました');
    const api={version:VERSION,parseChordSymbol:parse,extractChordPro:extract,buildChordFormula:formula,notesForChord:chord=>notes(chord)};
    window.WEBSEQ_CHORD_INPUT=api;window.WEBSEQ_CHORD_INPUT_PARSER=api;window.WEBSEQ_CHORD_EXTENDED=api;
  }
  function wait(){if(typeof state==='undefined'||typeof render!=='function'||typeof preview!=='function'||typeof label!=='function'||typeof notes!=='function'||!$('chordSymbolInput'))return setTimeout(wait,60);install()}
  if(typeof module!=='undefined'&&module.exports)module.exports={parseChordSymbol:parse,extractChordPro:extract,buildChordFormula:formula,parseNoteName:note};
  if(typeof window!=='undefined')wait();
})();
