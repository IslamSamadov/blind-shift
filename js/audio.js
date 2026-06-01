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

const buildRedLayer = () => {
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0, audioContext.currentTime);
  master.gain.linearRampToValueAtTime(0.18, audioContext.currentTime + 2.5); // lowered from 0.35
  master.connect(audioContext.destination);

  const sources = [];
  let stopFlag = false;
  const onStop = (fn) => { sources.push({ stop: fn }); };

  // 1. CELLO MELODY
  const celloGain = audioContext.createGain();
  const celloFilter = audioContext.createBiquadFilter();
  celloFilter.type = 'lowpass';
  celloFilter.frequency.value = 900;
  celloFilter.Q.value = 1.2;
  celloGain.gain.value = 0.7; // lowered from 1.2
  celloGain.connect(celloFilter);
  celloFilter.connect(master);

  const celloMelody = [
    { freq: 220.00, dur: 2.2 },
    { freq: 196.00, dur: 1.6 },
    { freq: 174.61, dur: 1.4 },
    { freq: 164.81, dur: 2.8 },
    { freq: 0,      dur: 0.8 },
    { freq: 155.56, dur: 1.8 },
    { freq: 164.81, dur: 1.2 },
    { freq: 174.61, dur: 1.6 },
    { freq: 196.00, dur: 3.5 },
    { freq: 0,      dur: 1.2 },
    { freq: 146.83, dur: 1.8 },
    { freq: 130.81, dur: 1.4 },
    { freq: 116.54, dur: 2.0 },
    { freq: 110.00, dur: 4.0 },
    { freq: 0,      dur: 2.5 },
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
    osc2.frequency.value = freq * 1.005;
    g2.gain.value = 0.4;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.5, now + 0.35);
    g.gain.linearRampToValueAtTime(0.38, now + 0.8);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.6);
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

  // 2. BASS CELLO
  const bassCelloGain = audioContext.createGain();
  const bassCelloFilter = audioContext.createBiquadFilter();
  bassCelloFilter.type = 'lowpass';
  bassCelloFilter.frequency.value = 400;
  bassCelloGain.gain.value = 0.7;
  bassCelloGain.connect(bassCelloFilter);
  bassCelloFilter.connect(master);

  const bassLine = [
    { freq: 55.00,  dur: 4.0 },
    { freq: 0,      dur: 1.5 },
    { freq: 49.00,  dur: 3.5 },
    { freq: 0,      dur: 2.0 },
    { freq: 43.65,  dur: 4.5 },
    { freq: 0,      dur: 2.5 },
    { freq: 41.20,  dur: 6.0 },
    { freq: 0,      dur: 3.0 },
  ];

  let bassIndex = 0;
  let bassStopped = false;
  onStop(() => { bassStopped = true; });

  const bassNote = () => {
    if (bassStopped || !audioContext) return;
    const note = bassLine[bassIndex % bassLine.length];
    bassIndex += 1;
    if (note.freq > 0) playCelloNote(note.freq, note.dur);
    setTimeout(bassNote, note.dur * 1000);
  };
  setTimeout(bassNote, 5000);

  // 3. BRASS STABS
  let brassStopped = false;
  onStop(() => { brassStopped = true; });

  const brassStab = () => {
    if (brassStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const freq = [87.31, 73.42, 82.41][Math.floor(Math.random() * 3)];
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
    g.gain.linearRampToValueAtTime(0.12, now + 0.12); // lowered from 0.22
    g.gain.exponentialRampToValueAtTime(0.04, now + 1.2);
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

  // 4. SMOLDERING PAD
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

  // 5. LOW RUMBLE
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

  // 6. SLOW HEARTBEAT
  const hbGain = audioContext.createGain();
  hbGain.gain.value = 0.15; // lowered from 0.3
  hbGain.connect(master);
  let hbStopped = false;
  onStop(() => { hbStopped = true; });

  const heartbeat = () => {
    if (hbStopped || !audioContext) return;
    fireThud(hbGain, 52, 0.2);
    setTimeout(heartbeat, 1800 + Math.random() * 400);
  };
  setTimeout(heartbeat, 3000);

  return { master, sources, _setStop: () => { stopFlag = true; } };
};


// ─── LAYER 1 — BLUE DIMENSION ────────────────────────────────────────────────

const buildBlueLayer = () => {
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0, audioContext.currentTime);
  master.gain.linearRampToValueAtTime(0.18, audioContext.currentTime + 3.0); // lowered from 0.35
  master.connect(audioContext.destination);

  const sources = [];
  let stopFlag = false;
  const onStop = (fn) => { sources.push({ stop: fn }); };

  // 1. GHOST CHOIR
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
    lfo.frequency.value = 0.05 + i * 0.02;
    lfoGain.gain.value = 1.8;
    oscGain.gain.value = 0.25;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(oscGain);
    oscGain.connect(choirGain);
    osc.start();
    lfo.start();
    sources.push(osc, lfo);
  });

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

  // 2. CRYSTALLINE ARPEGGIO
  const arpFreqs = [523.2, 466.2, 440, 392, 349.2, 329.6];
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

  // 3. WHALE MOAN
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

  // 4. COLD WIND
  const windNoise = createLoopingNoiseNode();
  const windFilter = audioContext.createBiquadFilter();
  const windLfo = audioContext.createOscillator();
  const windLfoGain = audioContext.createGain();
  const windGain = audioContext.createGain();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 800;
  windFilter.Q.value = 0.6;
  windLfo.type = 'sine';
  windLfo.frequency.value = 0.08;
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

  // 5. REVERSE WHOOSH
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
    g.gain.setValueAtTime(0.0, now);
    g.gain.linearRampToValueAtTime(0.07, now + 1.4);
    g.gain.setValueAtTime(0.0, now + 1.45);
    noise.connect(f);
    f.connect(g);
    g.connect(master);
    noise.start(now);
    setTimeout(reverseWhoosh, 5000 + Math.random() * 7000);
  };
  setTimeout(reverseWhoosh, 4000);

  // 6. HAUNTING PIANO
  const pianoGain = audioContext.createGain();
  const pianoFilter = audioContext.createBiquadFilter();
  pianoFilter.type = 'lowpass';
  pianoFilter.frequency.value = 2200;
  pianoFilter.Q.value = 0.4;
  pianoGain.gain.value = 0.8; // lowered from 1.4
  pianoGain.connect(pianoFilter);
  pianoFilter.connect(master);

  const pianoMelody = [
    { freq: 293.66, dur: 1.6 },
    { freq: 261.63, dur: 1.2 },
    { freq: 246.94, dur: 0.9 },
    { freq: 220.00, dur: 2.4 },
    { freq: 0,      dur: 0.6 },
    { freq: 196.00, dur: 1.0 },
    { freq: 174.61, dur: 1.4 },
    { freq: 196.00, dur: 0.8 },
    { freq: 220.00, dur: 3.2 },
    { freq: 0,      dur: 1.0 },
    { freq: 261.63, dur: 1.2 },
    { freq: 293.66, dur: 1.0 },
    { freq: 329.63, dur: 1.6 },
    { freq: 311.13, dur: 0.8 },
    { freq: 293.66, dur: 2.0 },
    { freq: 0,      dur: 0.5 },
    { freq: 261.63, dur: 1.0 },
    { freq: 246.94, dur: 1.2 },
    { freq: 220.00, dur: 1.4 },
    { freq: 196.00, dur: 1.0 },
    { freq: 174.61, dur: 4.5 },
    { freq: 0,      dur: 3.5 },
  ];

  const bassNotes = [
    { freq: 73.42,  dur: 3.0 },
    { freq: 0,      dur: 1.8 },
    { freq: 65.41,  dur: 3.2 },
    { freq: 0,      dur: 2.5 },
    { freq: 55.00,  dur: 4.0 },
    { freq: 0,      dur: 2.0 },
    { freq: 49.00,  dur: 3.5 },
    { freq: 0,      dur: 3.0 },
    { freq: 43.65,  dur: 5.0 },
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

  setTimeout(pianoNote, 3000 + Math.random() * 1500);
  setTimeout(bassNote, 6000 + Math.random() * 2000);

  // 7. HIGH GLASS TONE
  const glassTone = audioContext.createOscillator();
  const glassGain = audioContext.createGain();
  const glassLfo = audioContext.createOscillator();
  const glassLfoGain = audioContext.createGain();
  glassTone.type = 'sine';
  glassTone.frequency.value = 440;
  glassLfo.type = 'sine';
  glassLfo.frequency.value = 0.03;
  glassLfoGain.gain.value = 0.008;
  glassLfo.connect(glassLfoGain);
  glassLfoGain.connect(glassGain.gain);
  glassGain.gain.value = 0.006;
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
  stopProximityBeat();
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
let muteGainNode = null;

const ensureMuteNode = () => {
  if (!audioContext || muteGainNode) return;
  muteGainNode = audioContext.createGain();
  muteGainNode.gain.value = isMuted ? 0 : 1;
  muteGainNode.connect(audioContext.destination);
};

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
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = muted ? '🔇' : '🔊';
};

const toggleMute = () => setMute(!isMuted);

// ─── PROXIMITY & LUNGE AUDIO ──────────────────────────────────────────────────

let proximityBeatNode = null;
let proximityBeatStopped = false;
let proximityBeatInterval = null;
let currentProximityBpm = 60;

const PROXIMITY_THRESHOLDS = [
  { dist: 2,  bpm: 160, gain: 0.55 },
  { dist: 4,  bpm: 120, gain: 0.38 },
  { dist: 6,  bpm: 90,  gain: 0.22 },
  { dist: 10, bpm: 68,  gain: 0.10 },
  { dist: 999,bpm: 0,   gain: 0    },
];

const stopProximityBeat = () => {
  proximityBeatStopped = true;
  clearTimeout(proximityBeatInterval);
  proximityBeatNode = null;
};

const startProximityBeat = (bpm, gainVal) => {
  proximityBeatStopped = false;
  currentProximityBpm = bpm;

  const beat = () => {
    if (proximityBeatStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const dest = muteGainNode || audioContext.destination;

    const fire = (freq, delay, vol) => {
      setTimeout(() => {
        if (proximityBeatStopped || !audioContext) return;
        const t = audioContext.currentTime;
        const o = audioContext.createOscillator();
        const g = audioContext.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 0.25, t + 0.15);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g);
        g.connect(dest);
        o.start(t);
        o.stop(t + 0.2);
      }, delay);
    };

    fire(65, 0, gainVal);
    fire(55, 160, gainVal * 0.7);

    const intervalMs = (60 / currentProximityBpm) * 1000;
    proximityBeatInterval = setTimeout(beat, intervalMs);
  };

  beat();
};

const setStalkerProximity = (distance) => {
  if (!audioContext) return;

  const tier = PROXIMITY_THRESHOLDS.find(t => distance <= t.dist);
  if (!tier || tier.bpm === 0) {
    stopProximityBeat();
    return;
  }

  if (Math.abs(tier.bpm - currentProximityBpm) > 5 || proximityBeatStopped) {
    stopProximityBeat();
    startProximityBeat(tier.bpm, tier.gain);
  }
};

const onStalkerLunge = () => {
  initAudio().then(() => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const dest = muteGainNode || audioContext.destination;

    const boom = audioContext.createOscillator();
    const boomG = audioContext.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(80, now);
    boom.frequency.exponentialRampToValueAtTime(25, now + 0.4);
    boomG.gain.setValueAtTime(0.5, now);
    boomG.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    boom.connect(boomG);
    boomG.connect(dest);
    boom.start(now);
    boom.stop(now + 0.55);

    const screech = audioContext.createOscillator();
    const screechG = audioContext.createGain();
    screech.type = 'sawtooth';
    screech.frequency.setValueAtTime(400, now + 0.05);
    screech.frequency.exponentialRampToValueAtTime(120, now + 0.3);
    screechG.gain.setValueAtTime(0.18, now + 0.05);
    screechG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    screech.connect(screechG);
    screechG.connect(dest);
    screech.start(now + 0.05);
    screech.stop(now + 0.4);
  });
};

const onStalkerMemory = () => {
  initAudio().then(() => {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const dest = muteGainNode || audioContext.destination;

    const o = audioContext.createOscillator();
    const g = audioContext.createGain();
    const f = audioContext.createBiquadFilter();
    o.type = 'sine';
    o.frequency.setValueAtTime(220, now);
    o.frequency.linearRampToValueAtTime(440, now + 0.8);
    f.type = 'highpass';
    f.frequency.value = 300;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    o.connect(f);
    f.connect(g);
    g.connect(dest);
    o.start(now);
    o.stop(now + 1.3);
  });
};

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