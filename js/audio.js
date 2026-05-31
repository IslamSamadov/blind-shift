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
  master.gain.linearRampToValueAtTime(0.85, audioContext.currentTime + 1.8);
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
    master.gain.linearRampToValueAtTime(1.2, now + rampUp);      // creep up
    master.gain.linearRampToValueAtTime(1.2, now + rampUp + hold);
    master.gain.linearRampToValueAtTime(0.75, now + rampUp + hold + snapBack); // snap back
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
// Vibe: silent dread chase. You can't hear it as clearly here — but you can
// FEEL it. Sparse hollow pings, rapid high flutter, your own heartbeat
// ringing in your ears, and sudden burst of static like it just shifted with you.

const buildBlueLayer = () => {
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0, audioContext.currentTime);
  master.gain.linearRampToValueAtTime(0.85, audioContext.currentTime + 1.8);
  master.connect(audioContext.destination);

  const sources = [];
  let stopFlag = false;
  const onStop = (fn) => { sources.push({ stop: fn }); };

  // 1. FAST ANXIOUS HEARTBEAT — same pace as red but thinner, echoey, like it's in your head
  const hbGain = audioContext.createGain();
  const hbFilter = audioContext.createBiquadFilter();
  hbFilter.type = 'highpass';
  hbFilter.frequency.value = 120; // thinner sound
  hbGain.gain.value = 0.35;
  hbGain.connect(hbFilter);
  hbFilter.connect(master);

  let hbStopped = false;
  onStop(() => { hbStopped = true; });

  const heartbeat = () => {
    if (hbStopped || !audioContext) return;
    fireThud(hbGain, 75, 0.10);
    setTimeout(() => { if (!hbStopped) fireThud(hbGain, 68, 0.08); }, 150);
    setTimeout(heartbeat, 580 + Math.random() * 100); // slightly faster — more panic
  };
  setTimeout(heartbeat, 300);

  // 2. HIGH FLUTTER — rapid tremolo sine, like a ringing in the ears from adrenaline
  const flutterOsc = audioContext.createOscillator();
  const flutterLfo = audioContext.createOscillator();
  const flutterLfoGain = audioContext.createGain();
  const flutterGain = audioContext.createGain();
  flutterOsc.type = 'sine';
  flutterOsc.frequency.value = 940;
  flutterLfo.type = 'sine';
  flutterLfo.frequency.value = 7.5; // fast tremolo
  flutterLfoGain.gain.value = 0.025;
  flutterGain.gain.value = 0.028;
  flutterLfo.connect(flutterLfoGain);
  flutterLfoGain.connect(flutterGain.gain);
  flutterOsc.connect(flutterGain);
  flutterGain.connect(master);
  flutterOsc.start();
  flutterLfo.start();
  sources.push(flutterOsc, flutterLfo);

  // 3. HOLLOW PINGS — random sparse high pings like sonar, each one closer
  let pingStopped = false;
  onStop(() => { pingStopped = true; });
  let pingInterval = 3800;

  const ping = () => {
    if (pingStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const g = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1400 + Math.random() * 400;
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 1.3);
    // gradually get more frequent — tension escalates
    pingInterval = Math.max(1200, pingInterval - 120);
    setTimeout(ping, pingInterval + Math.random() * 600);
  };
  setTimeout(ping, 1800);

  // 4. ICY STATIC UNDERCURRENT — thin highpass noise, constant low presence
  const staticNoise = createLoopingNoiseNode();
  const staticFilter = audioContext.createBiquadFilter();
  const staticGain = audioContext.createGain();
  staticFilter.type = 'highpass';
  staticFilter.frequency.value = 3500;
  staticGain.gain.value = 0.035;
  staticNoise.connect(staticFilter);
  staticFilter.connect(staticGain);
  staticGain.connect(master);
  staticNoise.start();
  sources.push(staticNoise);

  // 5. SUDDEN STATIC BURST — like it just appeared right next to you
  let burstStopped = false;
  onStop(() => { burstStopped = true; });

  const staticBurst = () => {
    if (burstStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const noise = audioContext.createBufferSource();
    noise.buffer = createNoise(0.15);
    const f = audioContext.createBiquadFilter();
    const g = audioContext.createGain();
    f.type = 'bandpass';
    f.frequency.value = 1800 + Math.random() * 1200;
    f.Q.value = 0.8;
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(f);
    f.connect(g);
    g.connect(master);
    noise.start(now);
    setTimeout(staticBurst, 2800 + Math.random() * 4500);
  };
  setTimeout(staticBurst, 1200);

  // 6. DEEP THROB — low sine pulse every ~2s, like a presence just under the silence
  const throbGain = audioContext.createGain();
  throbGain.gain.value = 0.28;
  throbGain.connect(master);

  let throbStopped = false;
  onStop(() => { throbStopped = true; });

  const throb = () => {
    if (throbStopped || !audioContext) return;
    fireThud(throbGain, 45, 0.25);
    setTimeout(throb, 1900 + Math.random() * 400);
  };
  setTimeout(throb, 600);

  // 7. RISING TENSION SWELL — same as red, keeps escalating feel across dimensions
  let swellStopped = false;
  onStop(() => { swellStopped = true; });

  const tensionSwell = () => {
    if (swellStopped || !audioContext) return;
    const now = audioContext.currentTime;
    const rampUp = 3.5 + Math.random() * 2.5;
    master.gain.cancelScheduledValues(now);
    master.gain.linearRampToValueAtTime(1.15, now + rampUp);
    master.gain.linearRampToValueAtTime(0.7, now + rampUp + 0.4);
    setTimeout(tensionSwell, (rampUp + 2 + Math.random() * 3) * 1000);
  };
  setTimeout(tensionSwell, 3500);

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