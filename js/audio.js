let audioContext = null;
let soundtrackNodes = null;

const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    return audioContext.resume();
  }

  return Promise.resolve();
};

const createLoopingNoise = (destination, volume) => {
  const bufferSize = audioContext.sampleRate * 2;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  source.buffer = buffer;
  source.loop = true;
  filter.type = 'lowpass';
  filter.frequency.value = 260;
  gain.gain.value = volume;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  return source;
};

const startSoundtrack = () => {
  stopSoundtrack(0);

  return initAudio().then(() => {
    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.22, now + 1.8);
    masterGain.connect(audioContext.destination);

    const padFilter = audioContext.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 600;
    padFilter.connect(masterGain);

    const createDrone = (frequency, type, volume) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(volume, now);

      oscillator.connect(gain);
      gain.connect(padFilter);
      oscillator.start(now);

      return oscillator;
    };

    const sources = [
      createDrone(55, 'sine', 0.45),
      createDrone(82.5, 'triangle', 0.3),
      createDrone(110, 'sine', 0.12),
      createLoopingNoise(padFilter, 0.04),
    ];

    soundtrackNodes = { masterGain, sources };
  });
};

const stopSoundtrack = (fadeMs = 1000) => {
  if (!soundtrackNodes || !audioContext) {
    return;
  }

  const { masterGain, sources } = soundtrackNodes;
  const now = audioContext.currentTime;

  if (fadeMs <= 0) {
    sources.forEach((source) => {
      try {
        source.stop();
      } catch (error) {
        // Source may already be stopped.
      }
    });
    soundtrackNodes = null;
    return;
  }

  const fadeSeconds = fadeMs / 1000;

  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0, now + fadeSeconds);

  window.setTimeout(() => {
    sources.forEach((source) => {
      try {
        source.stop();
      } catch (error) {
        // Source may already be stopped.
      }
    });
    soundtrackNodes = null;
  }, fadeMs);
};

const playTone = (frequency, duration, type = 'sine', volume = 0.2) => {
  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
};

const playCubeSound = () => {
  initAudio().then(() => {
    playTone(740, 0.07, 'square', 0.12);
    window.setTimeout(() => playTone(980, 0.09, 'square', 0.1), 60);
  });
};

const playShiftSound = () => {
  initAudio().then(() => {
    playTone(180, 0.14, 'sawtooth', 0.1);
    window.setTimeout(() => playTone(120, 0.18, 'sawtooth', 0.08), 70);
  });
};

const playWinSound = () => {
  initAudio().then(() => {
    [523, 659, 784].forEach((freq, index) => {
      window.setTimeout(() => playTone(freq, 0.18, 'sine', 0.14), index * 120);
    });
  });
};

const playScreamSound = () => {
  initAudio().then(() => {
    const duration = 0.55;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      const fade = 1 - (i / data.length);
      data[i] = (Math.random() * 2 - 1) * fade;
    }

    const noise = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 900;
    noiseGain.gain.value = 0.45;
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noise.start();

    playTone(220, 0.35, 'sawtooth', 0.25);
    window.setTimeout(() => playTone(160, 0.4, 'square', 0.2), 80);
  });
};
