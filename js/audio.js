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
// Vibe: panicked chase. Fast erratic heartbeat, heavy stomping footsteps,
// mid-range grinding that cuts through, a rising tension swell, distant growl.
// You feel like it's one corridor behind you and closing fast.

const buildRedLayer = () => {
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0, audioContext.currentTime);
  master.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 1.8);
  master.connect(audioContext.destination);

  const sources = [];
  let stopFlag = false;
  const onStop = (fn) => { sources.push({ stop: fn }); };

  // 1. PANICKED HEARTBEAT — fast double-thump at ~90 BPM, feels like your own pulse
  const hbGain = audioContext.createGain();
  hbGain.gain.value = 0.6;
  hbGain.connect(master);

  let hbStopped = false;
  onStop(() => { hbStopped = true; });

  const heartbeat = () => {
    if (hbStopped || !audioContext) return;
    fireThud(hbGain, 58, 0.12);            // THUMP
    setTimeout(() => {
      if (!hbStopped) fireThud(hbGain, 50, 0.10); // thump (weaker second)
    }, 160);
    setTimeout(heartbeat, 640 + Math.random() * 80); // ~90 BPM with slight human jitter
  };
  setTimeout(heartbeat, 200);

  // 2. HEAVY FOOTSTEPS — low irregular stomps, like something large running
  const stompGain = audioContext.createGain();
  stompGain.gain.value = 0.45;
  const stompFilter = audioContext.createBiquadFilter();
  stompFilter.type = 'lowpass';
  stompFilter.frequency.value = 320;
  stompGain.connect(stompFilter);
  stompFilter.connect(master);

  let stompStopped = false;
  onStop(() => { stompStopped = true; });

  const stomp = () => {
    if (stompStopped || !audioContext) return;
    fireThud(stompGain, 72, 0.18);
    // irregular gait — sometimes a half-step follows
    if (Math.random() > 0.4) {
      setTimeout(() => { if (!stompStopped) fireThud(stompGain, 65, 0.14); }, 280);
    }
    setTimeout(stomp, 500 + Math.random() * 300);
  };
  setTimeout(stomp, 800);

  // 3. MID-RANGE GRINDING DRONE — pushed into mid freqs so it actually cuts through
  const droneGain = audioContext.createGain();
  droneGain.gain.value = 0.22;
  const droneFilter = audioContext.createBiquadFilter();
  droneFilter.type = 'bandpass';
  droneFilter.frequency.value = 420; // mid-range — audible, not buried
  droneFilter.Q.value = 1.2;
  droneGain.connect(droneFilter);
  droneFilter.connect(master);

  [110, 116.5].forEach(freq => {
    const osc = audioContext.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.connect(droneGain);
    osc.start();
    sources.push(osc);
  });

  // 4. RISING TENSION SWELL — master gain slowly ramps up then snaps back
  // Creates the feeling of something getting closer
  let swellStopped = false;
  onStop(() => { swellStopped = true; });

  const tensionSwell = () => {
    if (swellStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const rampUp = 4 + Math.random() * 3;
    const hold = 0.5;
    const snapBack = 0.3;
    master.gain.cancelScheduledValues(now);
    master.gain.linearRampToValueAtTime(0.5, now + rampUp);      // creep up
    master.gain.linearRampToValueAtTime(0.5, now + rampUp + hold);
    master.gain.linearRampToValueAtTime(0.3, now + rampUp + hold + snapBack); // snap back
    setTimeout(tensionSwell, (rampUp + hold + snapBack + 1.5 + Math.random() * 3) * 1000);
  };
  setTimeout(tensionSwell, 4000);

  // 5. RAGGED BREATHING / GROWL — bandpass noise that swells rhythmically
  const breathNoise = createLoopingNoiseNode();
  const breathBand = audioContext.createBiquadFilter();
  const breathGain = audioContext.createGain();
  breathBand.type = 'bandpass';
  breathBand.frequency.value = 280;
  breathBand.Q.value = 3;
  breathGain.gain.value = 0.0;
  breathNoise.connect(breathBand);
  breathBand.connect(breathGain);
  breathGain.connect(master);
  breathNoise.start();
  sources.push(breathNoise);

  let breathStopped = false;
  onStop(() => { breathStopped = true; });

  const breathCycle = () => {
    if (breathStopped || !audioContext) return;
    const now = audioContext.currentTime;
    breathGain.gain.cancelScheduledValues(now);
    breathGain.gain.linearRampToValueAtTime(0.12, now + 0.6);   // inhale
    breathGain.gain.linearRampToValueAtTime(0.04, now + 1.4);   // exhale
    breathGain.gain.linearRampToValueAtTime(0.0, now + 2.0);
    setTimeout(breathCycle, 2200 + Math.random() * 1200);
  };
  setTimeout(breathCycle, 1500);

  // 6. SHARP NOISE STINGS — random sudden crackle, like a footstep right next to you
  let stingStopped = false;
  onStop(() => { stingStopped = true; });

  const noiseSting = () => {
    if (stingStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const noise = audioContext.createBufferSource();
    noise.buffer = createNoise(0.08);
    const f = audioContext.createBiquadFilter();
    const g = audioContext.createGain();
    f.type = 'bandpass';
    f.frequency.value = 600 + Math.random() * 400;
    f.Q.value = 2;
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(f);
    f.connect(g);
    g.connect(master);
    noise.start(now);
    setTimeout(noiseSting, 3000 + Math.random() * 5000);
  };
  setTimeout(noiseSting, 2500);

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
  choirGain.gain.value = 0.12;
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
    choirGain.gain.linearRampToValueAtTime(0.18, now + 4 + Math.random() * 3);
    choirGain.gain.linearRampToValueAtTime(0.06, now + 9 + Math.random() * 4);
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
    g.gain.linearRampToValueAtTime(0.14, now + 1.5);
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
  windGain.gain.value = 0.04;
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
    g.gain.linearRampToValueAtTime(0.18, now + 1.4);  // build up
    g.gain.setValueAtTime(0.0, now + 1.45);            // hard cut
    noise.connect(f);
    f.connect(g);
    g.connect(master);
    noise.start(now);
    setTimeout(reverseWhoosh, 5000 + Math.random() * 7000);
  };
  setTimeout(reverseWhoosh, 4000);

  // 6. HAUNTING PIANO — slow sparse melody in D minor, soft attack/long decay like a real piano key
  // Uses triangle wave (closest to a muted piano tone) with a sharp attack and long tail
  const pianoGain = audioContext.createGain();
  const pianoFilter = audioContext.createBiquadFilter();
  pianoFilter.type = 'lowpass';
  pianoFilter.frequency.value = 1800; // warm, not bright
  pianoFilter.Q.value = 0.5;
  pianoGain.gain.value = 0.9;
  pianoGain.connect(pianoFilter);
  pianoFilter.connect(master);

  // Dm pentatonic melody — haunting but recognisable as a tune
  // Pattern repeats with slight variation, feels like a forgotten lullaby
  const pianoMelody = [
    { freq: 293.66, dur: 2.8 },  // D4
    { freq: 261.63, dur: 2.0 },  // C4
    { freq: 220.00, dur: 3.2 },  // A3
    { freq: 174.61, dur: 2.4 },  // F3
    { freq: 196.00, dur: 1.8 },  // G3
    { freq: 220.00, dur: 2.6 },  // A3
    { freq: 261.63, dur: 3.0 },  // C4
    { freq: 246.94, dur: 2.2 },  // B3
    { freq: 220.00, dur: 4.0 },  // A3 (held)
    { freq: 0,      dur: 1.5 },  // rest
    { freq: 174.61, dur: 2.0 },  // F3
    { freq: 196.00, dur: 2.4 },  // G3
    { freq: 220.00, dur: 3.5 },  // A3
    { freq: 0,      dur: 2.0 },  // rest
  ];
  let pianoIndex = 0;
  let pianoStopped = false;
  onStop(() => { pianoStopped = true; });

  const pianoNote = () => {
    if (pianoStopped || !audioContext) return;
    const note = pianoMelody[pianoIndex % pianoMelody.length];
    pianoIndex += 1;
    const noteDur = note.dur + Math.random() * 0.3; // tiny human timing imperfection

    if (note.freq > 0) {
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const g = audioContext.createGain();

      // Layer a sine + triangle for a richer piano-like tone
      const osc2 = audioContext.createOscillator();
      const g2 = audioContext.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note.freq;
      osc2.type = 'sine';
      osc2.frequency.value = note.freq * 2; // add a subtle overtone
      g2.gain.value = 0.15;

      // Piano envelope: fast attack, quick initial decay, long tail
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.55, now + 0.012);  // hard attack
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.3); // quick decay
      g.gain.exponentialRampToValueAtTime(0.001, now + note.dur + 1.5); // long tail

      osc.connect(g);
      osc2.connect(g2);
      g.connect(pianoGain);
      g2.connect(pianoGain);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + note.dur + 1.8);
      osc2.stop(now + note.dur + 1.8);
    }

    setTimeout(pianoNote, noteDur * 1000);
  };
  // Delay piano entry so choir establishes first
  setTimeout(pianoNote, 5000 + Math.random() * 2000);

  // 7. HIGH GLASS TONE — single sustained very high sine, barely audible, deeply unsettling
  const glassTone = audioContext.createOscillator();
  const glassGain = audioContext.createGain();
  const glassLfo = audioContext.createOscillator();
  const glassLfoGain = audioContext.createGain();
  glassTone.type = 'sine';
  glassTone.frequency.value = 2800;
  glassLfo.type = 'sine';
  glassLfo.frequency.value = 0.03; // almost imperceptibly slow
  glassLfoGain.gain.value = 0.008;
  glassLfo.connect(glassLfoGain);
  glassLfoGain.connect(glassGain.gain);
  glassGain.gain.value = 0.012;
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
    soundtrackNodes = buildRedLayer();
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
      soundtrackNodes = layer === 0 ? buildRedLayer() : buildBlueLayer();
    });
  }, 300);
};

// ─── ONE-SHOT SFX ────────────────────────────────────────────────────────────

const playTone = (frequency, duration, type = 'sine', volume = 0.2) => {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
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