let audioContext = null;

const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
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
  initAudio();
  playTone(740, 0.07, 'square', 0.12);
  setTimeout(() => playTone(980, 0.09, 'square', 0.1), 60);
};

const playShiftSound = () => {
  initAudio();
  playTone(180, 0.14, 'sawtooth', 0.1);
  setTimeout(() => playTone(120, 0.18, 'sawtooth', 0.08), 70);
};

const playWinSound = () => {
  initAudio();
  [523, 659, 784].forEach((freq, index) => {
    setTimeout(() => playTone(freq, 0.18, 'sine', 0.14), index * 120);
  });
};

const playScreamSound = () => {
  initAudio();

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
  setTimeout(() => playTone(160, 0.4, 'square', 0.2), 80);
};
