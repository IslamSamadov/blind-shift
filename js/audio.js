let audioContext = null;
let soundtrackNodes = null;
let currentThemeLayer = -1;

const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    return audioContext.resume();
  }
  return Promise.resolve();
};

// ─── UTILS ───────────────────────────────────────────────────────────────────

const createNoise = (durationSeconds) => {
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * durationSeconds, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

const createLoopingNoiseNode = () => {
  const source = audioContext.createBufferSource();
  source.buffer = createNoise(2);
  source.loop = true;
  return source;
};

// Fires a single percussive thud hit through gainNode
const fireThud = (gainNode, freq, decay = 0.14) => {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const g = audioContext.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.25, now + decay);
  g.gain.setValueAtTime(1.0, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + decay + 0.04);
  osc.connect(g);
  g.connect(gainNode);
  osc.start(now);
  osc.stop(now + decay + 0.06);
};

// ─── LAYER 0 — RED DIMENSION ─────────────────────────────────────────────────
// Vibe: dark cathedral. Slow cello-like melody in A minor, deep brass stabs,
// a low rumbling pulse, and a smoldering string pad underneath.
// More musical than the blue layer but darker and heavier — like walking
// through a burning church. You feel dread, not panic.

const buildRedLayer = () => {
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0, audioContext.currentTime);
  master.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 2.5);
  master.connect(audioContext.destination);

  const sources = [];
  let stopFlag = false;
  const onStop = (fn) => { sources.push({ stop: fn }); };

  // 1. CELLO MELODY — sawtooth through a warm lowpass, slow Am melody
  // Sawtooth → lowpass ≈ a bowed string instrument
  const celloGain = audioContext.createGain();
  const celloFilter = audioContext.createBiquadFilter();
  celloFilter.type = 'lowpass';
  celloFilter.frequency.value = 900;
  celloFilter.Q.value = 1.2;
  celloGain.gain.value = 1.2;
  celloGain.connect(celloFilter);
  celloFilter.connect(master);

  // Am descending melody — darker mirror of the blue Dm melody
  const celloMelody = [
    { freq: 220.00, dur: 2.2 },  // A3
    { freq: 196.00, dur: 1.6 },  // G3
    { freq: 174.61, dur: 1.4 },  // F3
    { freq: 164.81, dur: 2.8 },  // E3 (held — ominous)
    { freq: 0,      dur: 0.8 },  // rest
    { freq: 155.56, dur: 1.8 },  // Eb3 (dark)
    { freq: 164.81, dur: 1.2 },  // E3
    { freq: 174.61, dur: 1.6 },  // F3
    { freq: 196.00, dur: 3.5 },  // G3 (long)
    { freq: 0,      dur: 1.2 },  // rest
    // phrase B — lower, heavier
    { freq: 146.83, dur: 1.8 },  // D3
    { freq: 130.81, dur: 1.4 },  // C3
    { freq: 116.54, dur: 2.0 },  // Bb2
    { freq: 110.00, dur: 4.0 },  // A2 (tonic, long resolve)
    { freq: 0,      dur: 2.5 },  // long rest before repeat
  ];

  const playCelloNote = (freq, dur) => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const g = audioContext.createGain();
    const g2 = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc2.type = 'sawtooth';
    osc2.frequency.value = freq * 1.005; // slight detune for warmth
    g2.gain.value = 0.4;
    // Bow attack: slow attack, sustained, slow release — like drawing a bow
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.5, now + 0.35);   // slow bow attack
    g.gain.linearRampToValueAtTime(0.38, now + 0.8);   // settle
    g.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.6); // slow release
    osc.connect(g);
    osc2.connect(g2);
    g.connect(celloGain);
    g2.connect(celloGain);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + dur + 1.0);
    osc2.stop(now + dur + 1.0);
  };

  let celloIndex = 0;
  let celloStopped = false;
  onStop(() => { celloStopped = true; });

  const celloNote = () => {
    if (celloStopped || !audioContext) return;
    const note = celloMelody[celloIndex % celloMelody.length];
    celloIndex += 1;
    const dur = note.dur + Math.random() * 0.2;
    if (note.freq > 0) playCelloNote(note.freq, dur);
    setTimeout(celloNote, dur * 1000);
  };
  setTimeout(celloNote, 1500);

  // 2. BASS CELLO — same pattern an octave down, enters later
  const bassCelloGain = audioContext.createGain();
  const bassCelloFilter = audioContext.createBiquadFilter();
  bassCelloFilter.type = 'lowpass';
  bassCelloFilter.frequency.value = 400;
  bassCelloGain.gain.value = 0.7;
  bassCelloGain.connect(bassCelloFilter);
  bassCelloFilter.connect(master);

  const bassLine = [
    { freq: 55.00,  dur: 4.0 },  // A1
    { freq: 0,      dur: 1.5 },
    { freq: 49.00,  dur: 3.5 },  // G1
    { freq: 0,      dur: 2.0 },
    { freq: 43.65,  dur: 4.5 },  // F1
    { freq: 0,      dur: 2.5 },
    { freq: 41.20,  dur: 6.0 },  // E1
    { freq: 0,      dur: 3.0 },
  ];

  let bassIndex = 0;
  let bassStopped = false;
  onStop(() => { bassStopped = true; });

  const bassNote = () => {
    if (bassStopped || !audioContext) return;
    const note = bassLine[bassIndex % bassLine.length];
    bassIndex += 1;
    if (note.freq > 0) playCelloNote(note.freq, note.dur); // reuse same synth, lower freq
    setTimeout(bassNote, note.dur * 1000);
  };
  // Bass enters a few seconds in so cello establishes first
  const bassCelloProxy = { gain: bassCelloGain };
  setTimeout(bassNote, 5000);

  // 3. BRASS STABS — slow deep horn hits every 6–12s, like a war signal
  let brassStopped = false;
  onStop(() => { brassStopped = true; });

  const brassStab = () => {
    if (brassStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const freq = [87.31, 73.42, 82.41][Math.floor(Math.random() * 3)]; // Bb1, D1, E1
    const osc = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const g = audioContext.createGain();
    const f = audioContext.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc2.type = 'square';
    osc2.frequency.value = freq * 2;
    f.type = 'lowpass';
    f.frequency.value = 600;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.12); // punchy attack
    g.gain.exponentialRampToValueAtTime(0.08, now + 1.2);
    g.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    osc.connect(f);
    osc2.connect(f);
    f.connect(g);
    g.connect(master);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 4);
    osc2.stop(now + 4);
    setTimeout(brassStab, 6000 + Math.random() * 6000);
  };
  setTimeout(brassStab, 4000);

  // 4. SMOLDERING PAD — two detuned triangle waves very quietly underneath
  // Gives warmth and keeps silence from feeling empty between cello notes
  const padGain = audioContext.createGain();
  const padFilter = audioContext.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 500;
  padGain.gain.value = 0.08;
  padGain.connect(padFilter);
  padFilter.connect(master);

  [110.0, 164.81, 220.0].forEach(freq => {
    const osc = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoG = audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    lfo.type = 'sine';
    lfo.frequency.value = 0.06 + Math.random() * 0.04;
    lfoG.gain.value = 1.5;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);
    osc.connect(padGain);
    osc.start();
    lfo.start();
    sources.push(osc, lfo);
  });

  // 5. LOW RUMBLE — sub-bass texture, like a distant fire or machinery
  const rumbleNoise = createLoopingNoiseNode();
  const rumbleFilter = audioContext.createBiquadFilter();
  const rumbleGain = audioContext.createGain();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.value = 120;
  rumbleGain.gain.value = 0.06;
  rumbleNoise.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(master);
  rumbleNoise.start();
  sources.push(rumbleNoise);

  // 6. SLOW HEARTBEAT — one single thump every ~2s, not frantic, just inevitable
  const hbGain = audioContext.createGain();
  hbGain.gain.value = 0.3;
  hbGain.connect(master);
  let hbStopped = false;
  onStop(() => { hbStopped = true; });

  const heartbeat = () => {
    if (hbStopped || !audioContext) return;
    fireThud(hbGain, 52, 0.2);
    setTimeout(heartbeat, 1800 + Math.random() * 400);
  };
  setTimeout(heartbeat, 3000); // enters late, after you've settled in

  return { master, sources, _setStop: () => { stopFlag = true; } };
};


// ─── LAYER 1 — BLUE DIMENSION ────────────────────────────────────────────────
// Vibe: ghostly void. Zero percussion — completely different feel from red.
// Eerie detuned choir pads, slow crystalline arpeggios, cold wind, distant
// whale-like moans, and random reversed-whoosh swells. Feels like floating
// in empty space while something watches you from every direction.

const buildBlueLayer = () => {
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0, audioContext.currentTime);
  master.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 3.0); // slower fade in
  master.connect(audioContext.destination);

  const sources = [];
  let stopFlag = false;
  const onStop = (fn) => { sources.push({ stop: fn }); };

  // 1. GHOST CHOIR — four sine voices in a haunted minor cluster, each slowly drifting
  const choirGain = audioContext.createGain();
  choirGain.gain.value = 0.055;
  choirGain.connect(master);

  [220, 261.6, 277.2, 329.6].forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    const oscGain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    lfo.type = 'sine';
    lfo.frequency.value = 0.05 + i * 0.02; // each voice drifts at its own pace
    lfoGain.gain.value = 1.8;               // very subtle vibrato
    oscGain.gain.value = 0.25;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(oscGain);
    oscGain.connect(choirGain);
    osc.start();
    lfo.start();
    sources.push(osc, lfo);
  });

  // Slowly pulse the choir volume — like it's breathing
  let choirStopped = false;
  onStop(() => { choirStopped = true; });
  const choirBreath = () => {
    if (choirStopped || !audioContext) return;
    const now = audioContext.currentTime;
    choirGain.gain.cancelScheduledValues(now);
    choirGain.gain.linearRampToValueAtTime(0.08, now + 4 + Math.random() * 3);
    choirGain.gain.linearRampToValueAtTime(0.03, now + 9 + Math.random() * 4);
    setTimeout(choirBreath, 10000 + Math.random() * 5000);
  };
  setTimeout(choirBreath, 2000);

  // 2. CRYSTALLINE ARPEGGIO — slow descending minor arpeggio, like music from another world
  const arpFreqs = [523.2, 466.2, 440, 392, 349.2, 329.6]; // descending Dm scale
  let arpIndex = 0;
  let arpStopped = false;
  onStop(() => { arpStopped = true; });

  const arpNote = () => {
    if (arpStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const g = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.value = arpFreqs[arpIndex % arpFreqs.length];
    arpIndex += 1;
    g.gain.setValueAtTime(0.0, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 2.4);
    setTimeout(arpNote, 900 + Math.random() * 500);
  };
  setTimeout(arpNote, 1500);

  // 3. WHALE MOAN — long slow rising/falling sine, like something enormous far away
  let whaleStopped = false;
  onStop(() => { whaleStopped = true; });

  const whaleMoan = () => {
    if (whaleStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const g = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    osc.type = 'sine';
    const startFreq = 55 + Math.random() * 30;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(startFreq * 1.6, now + 3);
    osc.frequency.linearRampToValueAtTime(startFreq * 0.8, now + 6);
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.06, now + 1.5);
    g.gain.linearRampToValueAtTime(0, now + 6.5);
    osc.connect(filter);
    filter.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 7);
    setTimeout(whaleMoan, 8000 + Math.random() * 8000);
  };
  setTimeout(whaleMoan, 3000);

  // 4. COLD WIND — bandpass noise swept slowly, completely different texture from red's scrape
  const windNoise = createLoopingNoiseNode();
  const windFilter = audioContext.createBiquadFilter();
  const windLfo = audioContext.createOscillator();
  const windLfoGain = audioContext.createGain();
  const windGain = audioContext.createGain();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 800;
  windFilter.Q.value = 0.6;
  windLfo.type = 'sine';
  windLfo.frequency.value = 0.08; // very slow sweep
  windLfoGain.gain.value = 600;
  windLfo.connect(windLfoGain);
  windLfoGain.connect(windFilter.frequency);
  windGain.gain.value = 0.018;
  windNoise.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(master);
  windNoise.start();
  windLfo.start();
  sources.push(windNoise, windLfo);

  // 5. REVERSE WHOOSH — noise swell that fades IN then cuts, like something rushing at you
  let whooshStopped = false;
  onStop(() => { whooshStopped = true; });

  const reverseWhoosh = () => {
    if (whooshStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const noise = audioContext.createBufferSource();
    noise.buffer = createNoise(1.5);
    const f = audioContext.createBiquadFilter();
    const g = audioContext.createGain();
    f.type = 'bandpass';
    f.frequency.value = 400 + Math.random() * 300;
    f.Q.value = 1.5;
    // reverse envelope: fade IN (the scary part) then instant cut
    g.gain.setValueAtTime(0.0, now);
    g.gain.linearRampToValueAtTime(0.07, now + 1.4);  // build up
    g.gain.setValueAtTime(0.0, now + 1.45);            // hard cut
    noise.connect(f);
    f.connect(g);
    g.connect(master);
    noise.start(now);
    setTimeout(reverseWhoosh, 5000 + Math.random() * 7000);
  };
  setTimeout(reverseWhoosh, 4000);

  // 6. HAUNTING PIANO — full two-phrase melody in D minor with left-hand bass
  // Triangle + sine layered for a warm muted-piano tone
  const pianoGain = audioContext.createGain();
  const pianoFilter = audioContext.createBiquadFilter();
  pianoFilter.type = 'lowpass';
  pianoFilter.frequency.value = 2200;
  pianoFilter.Q.value = 0.4;
  pianoGain.gain.value = 1.4;  // piano is the star — pushed up
  pianoGain.connect(pianoFilter);
  pianoFilter.connect(master);

  // Full melody: two 8-bar phrases that tell a story, then a long rest before repeat
  // Phrase A — searching, descending
  // Phrase B — resolving, a little hopeful, then falling again
  const pianoMelody = [
    // ── Phrase A ──────────────────────────────────────────
    { freq: 293.66, dur: 1.6 },  // D4
    { freq: 261.63, dur: 1.2 },  // C4
    { freq: 246.94, dur: 0.9 },  // B3
    { freq: 220.00, dur: 2.4 },  // A3 (breathe)
    { freq: 0,      dur: 0.6 },  // rest
    { freq: 196.00, dur: 1.0 },  // G3
    { freq: 174.61, dur: 1.4 },  // F3
    { freq: 196.00, dur: 0.8 },  // G3
    { freq: 220.00, dur: 3.2 },  // A3 (long hold)
    { freq: 0,      dur: 1.0 },  // rest

    // ── Phrase B ──────────────────────────────────────────
    { freq: 261.63, dur: 1.2 },  // C4
    { freq: 293.66, dur: 1.0 },  // D4
    { freq: 329.63, dur: 1.6 },  // E4 (rise — moment of hope)
    { freq: 311.13, dur: 0.8 },  // Eb4 (bittersweet)
    { freq: 293.66, dur: 2.0 },  // D4
    { freq: 0,      dur: 0.5 },  // rest
    { freq: 261.63, dur: 1.0 },  // C4
    { freq: 246.94, dur: 1.2 },  // B3
    { freq: 220.00, dur: 1.4 },  // A3
    { freq: 196.00, dur: 1.0 },  // G3
    { freq: 174.61, dur: 4.5 },  // F3 (long, fading out)
    { freq: 0,      dur: 3.5 },  // long silence before repeat
  ];

  // Left-hand bass — sparse low octave notes, plays on held notes only
  const bassNotes = [
    { freq: 73.42,  dur: 3.0 },  // D2
    { freq: 0,      dur: 1.8 },
    { freq: 65.41,  dur: 3.2 },  // C2
    { freq: 0,      dur: 2.5 },
    { freq: 55.00,  dur: 4.0 },  // A2
    { freq: 0,      dur: 2.0 },
    { freq: 49.00,  dur: 3.5 },  // G2
    { freq: 0,      dur: 3.0 },
    { freq: 43.65,  dur: 5.0 },  // F2
    { freq: 0,      dur: 4.0 },
  ];

  const playPianoNote = (freq, dur, gainVal = 0.55) => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const g = audioContext.createGain();
    const g2 = audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    g2.gain.value = 0.18;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    g.gain.exponentialRampToValueAtTime(gainVal * 0.35, now + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur + 1.2);
    osc.connect(g);
    osc2.connect(g2);
    g.connect(pianoGain);
    g2.connect(pianoGain);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + dur + 1.5);
    osc2.stop(now + dur + 1.5);
  };

  let pianoIndex = 0;
  let pianoStopped = false;
  onStop(() => { pianoStopped = true; });

  const pianoNote = () => {
    if (pianoStopped || !audioContext) return;
    const note = pianoMelody[pianoIndex % pianoMelody.length];
    pianoIndex += 1;
    const noteDur = note.dur + Math.random() * 0.15;
    if (note.freq > 0) playPianoNote(note.freq, noteDur);
    setTimeout(pianoNote, noteDur * 1000);
  };

  // Bass runs independently, loops through its own pattern
  let bassIndex = 0;
  let bassStopped = false;
  onStop(() => { bassStopped = true; });

  const bassNote = () => {
    if (bassStopped || !audioContext) return;
    const note = bassNotes[bassIndex % bassNotes.length];
    bassIndex += 1;
    if (note.freq > 0) playPianoNote(note.freq, note.dur, 0.35);
    setTimeout(bassNote, note.dur * 1000);
  };

  // Piano enters first, bass joins a few seconds later
  setTimeout(pianoNote, 3000 + Math.random() * 1500);
  setTimeout(bassNote, 6000 + Math.random() * 2000);

  // 7. HIGH GLASS TONE — single sustained very high sine, barely audible, deeply unsettling
  const glassTone = audioContext.createOscillator();
  const glassGain = audioContext.createGain();
  const glassLfo = audioContext.createOscillator();
  const glassLfoGain = audioContext.createGain();
  glassTone.type = 'sine';
  glassTone.frequency.value = 440; // lowered from 2800 — warm A4 instead of painful high ring
  glassLfo.type = 'sine';
  glassLfo.frequency.value = 0.03;
  glassLfoGain.gain.value = 0.008;
  glassLfo.connect(glassLfoGain);
  glassLfoGain.connect(glassGain.gain);
  glassGain.gain.value = 0.006; // quieter too
  glassTone.connect(glassGain);
  glassGain.connect(master);
  glassTone.start();
  glassLfo.start();
  sources.push(glassTone, glassLfo);

  onStop(() => { stopFlag = true; });

  return { master, sources, _setStop: () => { stopFlag = true; } };
};

// ─── SOUNDTRACK CONTROL ──────────────────────────────────────────────────────

const stopSoundtrack = (fadeMs = 1000) => {
  if (!soundtrackNodes || !audioContext) return;
  const { master, sources } = soundtrackNodes;
  const now = audioContext.currentTime;

  if (soundtrackNodes._setStop) soundtrackNodes._setStop();

  if (fadeMs <= 0) {
    sources.forEach((s) => {
      try { if (s.stop) s.stop(); else if (s.disconnect) s.disconnect(); } catch (_) {}
    });
    try { master.disconnect(); } catch (_) {}
    soundtrackNodes = null;
    currentThemeLayer = -1;
    return;
  }

  const fadeSeconds = fadeMs / 1000;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + fadeSeconds);

  setTimeout(() => {
    sources.forEach((s) => {
      try { if (s.stop) s.stop(); else if (s.disconnect) s.disconnect(); } catch (_) {}
    });
    try { master.disconnect(); } catch (_) {}
    soundtrackNodes = null;
    currentThemeLayer = -1;
  }, fadeMs);
};

const startSoundtrack = () => {
  stopSoundtrack(0);
  return initAudio().then(() => {
    if (!audioContext) return;
    ensureMuteNode();
    soundtrackNodes = buildRedLayer();
    rewireToMuteNode(soundtrackNodes);
    currentThemeLayer = 0;
  });
};

const shiftSoundtrackTheme = (layer) => {
  if (layer === currentThemeLayer) return;
  currentThemeLayer = layer;
  stopSoundtrack(350);
  setTimeout(() => {
    initAudio().then(() => {
      if (!audioContext) return;
      ensureMuteNode();
      soundtrackNodes = layer === 0 ? buildRedLayer() : buildBlueLayer();
      rewireToMuteNode(soundtrackNodes);
    });
  }, 300);
};

// ─── MUTE ────────────────────────────────────────────────────────────────────

let isMuted = false;
let muteGainNode = null; // master mute node connected to destination

const ensureMuteNode = () => {
  if (!audioContext || muteGainNode) return;
  muteGainNode = audioContext.createGain();
  muteGainNode.gain.value = isMuted ? 0 : 1;
  muteGainNode.connect(audioContext.destination);
};

// Re-route soundtrack master through the mute node
const rewireToMuteNode = (nodes) => {
  if (!nodes || !muteGainNode) return;
  try {
    nodes.master.disconnect();
    nodes.master.connect(muteGainNode);
  } catch (_) {}
};

const setMute = (muted) => {
  isMuted = muted;
  if (muteGainNode) {
    muteGainNode.gain.setTargetAtTime(muted ? 0 : 1, audioContext.currentTime, 0.05);
  }
  // update button label if it exists
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
};

const toggleMute = () => setMute(!isMuted);

// ─── ONE-SHOT SFX ────────────────────────────────────────────────────────────

const playTone = (frequency, duration, type = 'sine', volume = 0.2) => {
  if (!audioContext) return;
  ensureMuteNode();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  osc.connect(gain);
  gain.connect(muteGainNode || audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
};

const playCubeSound = () => {
  initAudio().then(() => {
    playTone(1047, 0.06, 'square', 0.1);
    setTimeout(() => playTone(1319, 0.08, 'square', 0.08), 55);
    setTimeout(() => playTone(1568, 0.10, 'sine', 0.07), 110);
  });
};

const playShiftSound = () => {
  initAudio().then(() => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const g = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g);
    g.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.25);

    const noise = audioContext.createBufferSource();
    noise.buffer = createNoise(0.12);
    const noiseFilter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    noiseGain.gain.setValueAtTime(0.12, now + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(now + 0.05);
  });
};

const playWinSound = () => {
  initAudio().then(() => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.5, 'sine', 0.12), i * 100);
    });
  });
};

const playScreamSound = () => {
  initAudio().then(() => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const sampleRate = audioContext.sampleRate;
    const duration = 0.7;
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const fade = 1 - (i / data.length) ** 0.4;
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    const noise = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    const noiseFilter = audioContext.createBiquadFilter();
    noise.buffer = buffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2400;
    noiseFilter.Q.value = 0.5;
    noiseGain.gain.value = 0.5;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start(now);

    const screeOsc = audioContext.createOscillator();
    const screeGain = audioContext.createGain();
    screeOsc.type = 'sawtooth';
    screeOsc.frequency.setValueAtTime(800, now);
    screeOsc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    screeGain.gain.setValueAtTime(0.3, now);
    screeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    screeOsc.connect(screeGain);
    screeGain.connect(audioContext.destination);
    screeOsc.start(now);
    screeOsc.stop(now + 0.7);

    playTone(60, 0.35, 'sine', 0.4);
  });
};