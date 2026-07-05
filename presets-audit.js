(() => {
  const AUDITED_PRESETS = [
    ['王道', ['F maj7','G 7','E m7','A minor']],
    ['小室', ['A minor','F major','G major','C major']],
    ['丸サ', ['F maj7','E 7','A m7','C 7']],
    ['コンファメ', ['F maj7','E m7b5','A 7','D m7','G 7','C maj7','A m7','D 7','G m7','C 7']],
    ['枯葉', ['A m7','D 7','G maj7','C maj7','F# m7b5','B 7','E m7','E 7']],
    ['カノン', ['C major','G major','A minor','E minor','F major','C major','F major','G major']],
    ['王道JPOP', ['F major','G major','E minor','A minor']],
    ['逆循環', ['C maj7','A 7','D m7','G 7']],
    ['Just Two', ['F maj7','E 7','A minor','C 7']],
    ['Neo Soul', ['C maj9','A 9','D m9','G 9']],
    ['Andalusian', ['A minor','G major','F major','E 7']],
    ['Blues 12-bar', ['C 7','C 7','C 7','C 7','F 7','F 7','C 7','C 7','G 7','F 7','C 7','G 7']],
    ['暗め', ['C minor','G# major','D# major','A# major']],
    ['浮遊', ['F maj7','G major','E m7','A minor']],
    ['Lo-fi', ['C maj7','B 7','E minor','G 7']],
    ['EDM', ['F major','A minor','C major','G major']],
    ['Royal Road 2', ['D m7','G 7','E m7','A minor']],
    ['Jazz ii-V-I', ['D m7','G 7','C maj7','C maj7']],
    ['Minor ii-V-i', ['F# m7b5','B 7','E minor','E minor']],
    ['City Pop', ['C maj9','A 9','D m9','G 9']],
    ['Future Bass', ['F add9','G add9','A minor','E minor']],
    ['Sad Pop', ['A minor','F maj7','C major','G major']],
    ['Dorian Loop', ['D m7','G 7','D m7','G 7']],
    ['Reset', []]
  ];

  const AUDITED_RANDOM_PROGRESSIONS = [
    ['C major','G major','A minor','F major'],
    ['F major','G major','E minor','A minor'],
    ['A minor','F maj7','C major','G major'],
    ['D m7','G 7','C maj7','A 7'],
    ['F maj7','E 7','A m7','C 7'],
    ['C maj9','A 9','D m9','G 9'],
    ['A minor','G major','F major','E 7'],
    ['F add9','G add9','A minor','E minor']
  ];

  function wait() {
    if (typeof applyPreset !== 'function' || typeof QUALITIES === 'undefined' || typeof NOTE_NAMES === 'undefined') {
      setTimeout(wait, 60);
      return;
    }
    installAuditedPresets();
  }

  function parseChordText(text) {
    const [root, qRaw] = text.split(' ');
    const quality = qRaw === 'm' ? 'minor' : qRaw;
    return { root, quality, octave: 4, bars: 1 };
  }

  function validatePreset(name, chords) {
    return chords.every(text => {
      const chord = parseChordText(text);
      return NOTE_NAMES.includes(chord.root) && Boolean(QUALITIES[chord.quality]);
    });
  }

  function installAuditedPresets() {
    const invalid = AUDITED_PRESETS.filter(([name, chords]) => !validatePreset(name, chords));
    if (invalid.length) {
      console.warn('Invalid audited presets:', invalid);
      try { setStatus('Preset audit failed'); } catch {}
      return;
    }

    const container = document.getElementById('presets');
    if (container) {
      container.innerHTML = '';
      AUDITED_PRESETS.forEach(([name, chords]) => {
        const button = document.createElement('button');
        button.textContent = name;
        button.onclick = () => applyPreset(chords);
        container.append(button);
      });
    }

    const randomButton = document.getElementById('randomProgression');
    if (randomButton) {
      randomButton.onclick = () => {
        const progression = AUDITED_RANDOM_PROGRESSIONS[Math.floor(Math.random() * AUDITED_RANDOM_PROGRESSIONS.length)];
        state.sequence = progression.map(parseChordText);
        render();
        try { setStatus('Audited random progression'); } catch {}
      };
    }

    window.WEBSEQ_AUDITED_PRESETS = AUDITED_PRESETS;
    try { setStatus('Presets audited'); } catch {}
  }

  wait();
})();
