type RoseAudioCommand = {
  command?: "set-enabled" | "cue" | "pause" | "resume" | "scene" | "stop";
  enabled?: boolean;
  cue?: string;
  variant?: number | string;
  scene?: ScoreScene;
};

type ScoreScene = "door" | "flight" | "stars" | "memories" | "finale" | "thanks";

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
  __roseDoorAudioContext?: AudioContext;
};

const AUDIO_EVENT = "rose-audio:command";
const AUDIO_READY_EVENT = "rose-audio:ready";
const AUDIO_STATE_EVENT = "rose-audio:state";
const STORAGE_KEY = "rose-door-sound";
const MIN_GAIN = 0.0001;

const NOTES = {
  D2: 73.42,
  A2: 110,
  D3: 146.83,
  F3: 174.61,
  A3: 220,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  A4: 440,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  A5: 880,
  C6: 1046.5,
} as const;

const SCORE: Record<ScoreScene, readonly (readonly number[])[]> = {
  door: [
    [NOTES.D2, NOTES.A2, NOTES.D3, NOTES.F3],
    [65.41, 98, NOTES.D3, 196],
  ],
  flight: [
    [NOTES.D2, NOTES.A2, NOTES.F3, NOTES.A3],
    [65.41, 98, NOTES.D3, 196],
  ],
  stars: [
    [NOTES.D2, NOTES.A2, NOTES.F3, NOTES.C4],
    [58.27, 116.54, NOTES.F3, 233.08],
  ],
  memories: [
    [NOTES.D2, NOTES.A2, NOTES.E4, NOTES.A4],
    [NOTES.F3, NOTES.C4, NOTES.A4, NOTES.C5],
    [NOTES.A2, NOTES.E4, NOTES.C5, NOTES.E5],
    [NOTES.D3, NOTES.A3, NOTES.E4, NOTES.F4],
  ],
  finale: [
    [NOTES.D2, NOTES.A2, NOTES.D3, NOTES.F3, NOTES.A3],
    [NOTES.D2, NOTES.C4, NOTES.F4, NOTES.A4],
  ],
  thanks: [
    [NOTES.D3, NOTES.F3, NOTES.A3, NOTES.E4],
    [NOTES.F3, NOTES.C4, NOTES.A4, NOTES.C5],
  ],
};

function readEnabledPreference() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function emitState(enabled: boolean, unlocked: boolean) {
  window.dispatchEvent(new CustomEvent(AUDIO_STATE_EVENT, { detail: { enabled, unlocked } }));
}

export function mountRoseAudio() {
  const AudioContextClass = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) {
    emitState(false, false);
    window.dispatchEvent(new CustomEvent(AUDIO_READY_EVENT, { detail: { supported: false } }));
    return () => undefined;
  }

  let enabled = readEnabledPreference();
  let unlocked = false;
  let paused = false;
  let destroyed = false;
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let musicBus: GainNode | undefined;
  let sfxBus: GainNode | undefined;
  let reverbInput: GainNode | undefined;
  let noiseBuffer: AudioBuffer | undefined;
  let scoreTimer = 0;
  let scoreStep = 0;
  let nextScoreAt = 0;
  let scene: ScoreScene = "door";
  let chapter = 0;
  const ambientNodes = new Set<AudioNode>();

  function safeGain(value: number) {
    return Math.max(MIN_GAIN, value);
  }

  function createImpulse(audio: AudioContext) {
    const length = Math.floor(audio.sampleRate * 1.65);
    const impulse = audio.createBuffer(2, length, audio.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const envelope = Math.pow(1 - index / length, 2.8);
        data[index] = (Math.random() * 2 - 1) * envelope;
      }
    }
    return impulse;
  }

  function ensureGraph() {
    if (context) return context;
    const primedContext = (window as AudioWindow).__roseDoorAudioContext;
    context = primedContext && primedContext.state !== "closed"
      ? primedContext
      : new AudioContextClass({ latencyHint: "interactive" });
    (window as AudioWindow).__roseDoorAudioContext = context;

    master = context.createGain();
    musicBus = context.createGain();
    sfxBus = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const convolver = context.createConvolver();
    const wet = context.createGain();
    reverbInput = context.createGain();

    master.gain.value = MIN_GAIN;
    musicBus.gain.value = .68;
    sfxBus.gain.value = .82;
    wet.gain.value = .13;
    reverbInput.gain.value = 1;
    compressor.threshold.value = -20;
    compressor.knee.value = 12;
    compressor.ratio.value = 2.5;
    compressor.attack.value = .004;
    compressor.release.value = .28;
    convolver.buffer = createImpulse(context);

    musicBus.connect(master);
    sfxBus.connect(master);
    reverbInput.connect(convolver).connect(wet).connect(master);
    master.connect(compressor).connect(context.destination);

    const noiseLength = Math.floor(context.sampleRate * 2.2);
    noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    return context;
  }

  function connectWithSpace(source: AudioNode, destination: AudioNode, wet = .08, pan = 0) {
    if (!context || !reverbInput) return;
    let output: AudioNode = source;
    if ("createStereoPanner" in context) {
      const panner = context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      output.connect(panner);
      output = panner;
    }
    output.connect(destination);
    if (wet > 0) {
      const send = context.createGain();
      send.gain.value = wet;
      output.connect(send).connect(reverbInput);
    }
  }

  function envelope(gain: AudioParam, start: number, peak: number, duration: number, attack = .018) {
    gain.cancelScheduledValues(start);
    gain.setValueAtTime(MIN_GAIN, start);
    gain.exponentialRampToValueAtTime(safeGain(peak), start + Math.min(attack, duration * .3));
    gain.exponentialRampToValueAtTime(MIN_GAIN, start + duration);
  }

  function oscillatorTone(
    frequency: number,
    duration: number,
    gainValue: number,
    type: OscillatorType = "sine",
    delay = 0,
    slideTo?: number,
    pan = 0,
    wet = .08,
    destination = sfxBus,
  ) {
    if (!context || !destination || context.state !== "running" || !enabled) return;
    const start = context.currentTime + Math.max(0, delay);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
    envelope(gain.gain, start, gainValue, duration);
    oscillator.connect(gain);
    connectWithSpace(gain, destination, wet, pan);
    oscillator.start(start);
    oscillator.stop(start + duration + .04);
  }

  function bell(frequency: number, duration: number, gainValue: number, delay = 0, pan = 0) {
    oscillatorTone(frequency, duration, gainValue, "sine", delay, undefined, pan, .2);
    oscillatorTone(frequency * 2.01, duration * .58, gainValue * .22, "sine", delay, undefined, pan, .24);
    oscillatorTone(frequency * 3.98, duration * .32, gainValue * .06, "sine", delay, undefined, pan, .28);
  }

  function noiseSweep(
    from: number,
    to: number,
    duration: number,
    gainValue: number,
    delay = 0,
    pan = 0,
    mode: BiquadFilterType = "bandpass",
  ) {
    if (!context || !noiseBuffer || !sfxBus || context.state !== "running" || !enabled) return;
    const start = context.currentTime + Math.max(0, delay);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = mode;
    filter.Q.value = mode === "bandpass" ? .72 : .45;
    filter.frequency.setValueAtTime(Math.max(30, from), start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + duration);
    envelope(gain.gain, start, gainValue, duration, .055);
    source.connect(filter).connect(gain);
    connectWithSpace(gain, sfxBus, .12, pan);
    source.start(start);
    source.stop(start + duration + .04);
  }

  function flutter(frequency: number, duration: number, gainValue: number, pan: number, rate: number) {
    if (!context || !noiseBuffer || !sfxBus || context.state !== "running" || !enabled) return;
    const start = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const lfo = context.createOscillator();
    const depth = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = .65;
    gain.gain.value = gainValue * .5;
    lfo.frequency.value = rate;
    depth.gain.value = gainValue * .45;
    lfo.connect(depth).connect(gain.gain);
    source.connect(filter).connect(gain);
    connectWithSpace(gain, sfxBus, .06, pan);
    source.start(start);
    lfo.start(start);
    source.stop(start + duration);
    lfo.stop(start + duration);
  }

  function softChord(notes: readonly number[], duration = 2.8, gainValue = .007, delay = 0) {
    notes.forEach((note, index) => {
      const pan = notes.length < 2 ? 0 : -0.28 + (index / (notes.length - 1)) * .56;
      oscillatorTone(note, duration, gainValue * (1 - index * .09), "sine", delay + index * .035, undefined, pan, .18);
      oscillatorTone(note * 2, duration * .72, gainValue * .1, "triangle", delay + index * .035, undefined, pan, .21);
    });
  }

  function schedulePadChord(at: number) {
    if (!context || !musicBus || context.state !== "running" || !enabled || paused) return;
    const progression = SCORE[scene];
    const notes = progression[(scoreStep + (scene === "memories" ? chapter : 0)) % progression.length];
    const duration = scene === "thanks" ? 7.4 : 6.2;
    notes.forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      const filter = context!.createBiquadFilter();
      oscillator.type = index % 3 === 0 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = (index - notes.length / 2) * 1.8;
      filter.type = "lowpass";
      filter.frequency.value = scene === "flight" ? 920 : 1320;
      filter.Q.value = .25;
      const peak = (scene === "door" ? .008 : .0067) * (1 - index * .08);
      gain.gain.setValueAtTime(MIN_GAIN, at);
      gain.gain.exponentialRampToValueAtTime(safeGain(peak), at + .75);
      gain.gain.setValueAtTime(safeGain(peak * .72), at + duration * .58);
      gain.gain.exponentialRampToValueAtTime(MIN_GAIN, at + duration);
      oscillator.connect(filter).connect(gain);
      connectWithSpace(gain, musicBus!, .22, -.22 + index * .14);
      oscillator.start(at);
      oscillator.stop(at + duration + .05);
    });
    if (scoreStep % 2 === 1 && scene !== "flight") {
      bell(notes[notes.length - 1] * 2, 1.6, .0022, Math.max(0, at - context.currentTime + 1.4), .18);
    }
    scoreStep += 1;
  }

  function scheduleScore() {
    if (!context || context.state !== "running" || !enabled || paused) return;
    const horizon = context.currentTime + 1.25;
    if (!nextScoreAt || nextScoreAt < context.currentTime - .1) nextScoreAt = context.currentTime + .08;
    while (nextScoreAt < horizon) {
      schedulePadChord(nextScoreAt);
      nextScoreAt += scene === "thanks" ? 6.4 : 5.1;
    }
  }

  function startNightAir() {
    if (!context || !noiseBuffer || !musicBus || ambientNodes.size) return;
    const now = context.currentTime;
    const noise = context.createBufferSource();
    const lowpass = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 420;
    lowpass.Q.value = .25;
    noiseGain.gain.value = .0038;
    noise.connect(lowpass).connect(noiseGain).connect(musicBus);
    noise.start(now);
    ambientNodes.add(noise);

    [NOTES.D2, NOTES.A2].forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = index ? .0013 : .0028;
      oscillator.connect(gain).connect(musicBus!);
      oscillator.start(now);
      ambientNodes.add(oscillator);
    });
  }

  function startScore() {
    if (!context || !enabled || context.state !== "running") return;
    startNightAir();
    if (!scoreTimer) scoreTimer = window.setInterval(scheduleScore, 420);
    scheduleScore();
  }

  function setScene(next: ScoreScene, nextChapter = chapter) {
    if (scene === next && chapter === nextChapter) return;
    scene = next;
    chapter = nextChapter;
    scoreStep = 0;
    if (context) {
      nextScoreAt = Math.min(nextScoreAt || context.currentTime, context.currentTime + .7);
      if (musicBus) {
        const now = context.currentTime;
        musicBus.gain.cancelScheduledValues(now);
        musicBus.gain.setValueAtTime(Math.max(MIN_GAIN, musicBus.gain.value), now);
        musicBus.gain.exponentialRampToValueAtTime(next === "thanks" ? .52 : .68, now + .7);
      }
    }
  }

  async function unlock() {
    if (!enabled || destroyed) return false;
    const audio = ensureGraph();
    try {
      if (audio.state === "suspended") await audio.resume();
    } catch {
      emitState(enabled, false);
      return false;
    }
    unlocked = audio.state === "running";
    if (!unlocked) {
      emitState(enabled, false);
      return false;
    }
    const now = audio.currentTime;
    master?.gain.cancelScheduledValues(now);
    master?.gain.setValueAtTime(Math.max(MIN_GAIN, master.gain.value), now);
    master?.gain.exponentialRampToValueAtTime(.62, now + .32);
    startScore();
    emitState(enabled, true);
    return true;
  }

  function playCue(name: string, variant: number | string = 0) {
    if (!enabled || !context || context.state !== "running") return;
    if (name === "knock") {
      const index = Math.max(0, Number(variant || 1) - 1);
      oscillatorTone(86 - index * 4, .14, .04, "triangle", 0, 62 - index * 3, (index - 1) * .05, .05);
      noiseSweep(420, 160, .12, .022, .008, (index - 1) * .05, "lowpass");
      if (index === 2) oscillatorTone(1200, .08, .007, "triangle", .25, 760, .08, .11);
      return;
    }
    if (name === "door-open" || name === "door-close" || name === "door") {
      const closing = name === "door-close";
      noiseSweep(closing ? 740 : 980, 180, 1.3, .025, 0, 0, "lowpass");
      oscillatorTone(closing ? 78 : 92, 1.35, .015, "sawtooth", 0, closing ? 46 : 41, 0, .09);
      oscillatorTone(closing ? 460 : 620, .9, .006, "sine", .12, closing ? 280 : 930, 0, .18);
      return;
    }
    if (name === "ui-click") {
      oscillatorTone(132, .065, .018, "triangle", 0, 88, 0, .02);
      oscillatorTone(860, .095, .006, "sine", .055, 620, 0, .06);
      return;
    }
    if (name === "enabled") {
      bell(NOTES.D5, .65, .008, 0, -.08);
      bell(NOTES.A5, .95, .006, .12, .1);
      return;
    }
    if (name.startsWith("bat-wave")) {
      const wave = Number(name.at(-1)) || 1;
      const frequencies = [1150, 1420, 980];
      const pans = [-.25, .16, 0];
      flutter(frequencies[wave - 1], .36 + wave * .04, .013 + wave * .0015, pans[wave - 1], 7 + wave * 2);
      setScene("flight");
      return;
    }
    if (name === "takeover") {
      noiseSweep(2200, 310, .72, .02, 0, 0);
      oscillatorTone(NOTES.D2, .72, .012, "sine", 0, 36.71, 0, .1);
      return;
    }
    if (name === "bat-veil") {
      noiseSweep(2600, 360, .82, .026, 0, 0);
      return;
    }
    if (name === "petal-vortex") {
      noiseSweep(460, 3200, 1.55, .014, 0, -.12);
      return;
    }
    if (name === "petals-born") {
      [NOTES.D4, NOTES.F4, NOTES.A4, NOTES.C5].forEach((note, index) => bell(note, 1.2, .0048, index * .18, -.2 + index * .13));
      return;
    }
    if (name === "blooms-formed") {
      softChord([NOTES.D3, NOTES.F3, NOTES.A3], 2.5, .0065);
      return;
    }
    if (name === "bloom-to-stars") {
      noiseSweep(780, 5400, 1.35, .0085, 0, .1);
      return;
    }
    if (name === "stars") {
      setScene("stars");
      noiseSweep(1200, 7000, 1.2, .008, 0, 0);
      [NOTES.C5, NOTES.D5, NOTES.A5].forEach((note, index) => bell(note, 1.55, .005, .25 + index * .28, -.14 + index * .14));
      return;
    }
    if (name === "virgo" || name === "capricorn") {
      const notes = name === "virgo" ? [NOTES.D5, NOTES.F5, NOTES.A5] : [NOTES.A4, NOTES.C5, NOTES.E5];
      notes.forEach((note, index) => bell(note, 1.8, .0052 - index * .0005, index * .32, -.16 + index * .16));
      return;
    }
    if (name.startsWith("memory-streak")) {
      const side = Number(name.at(-1)) % 2 ? -.18 : .18;
      noiseSweep(4800, 1400, .5, .0055, 0, side);
      return;
    }
    if (/^memory-[1-4]$/.test(name)) {
      chapter = Number(name.at(-1)) - 1;
      setScene("memories", chapter);
      const chords = [
        [NOTES.D3, NOTES.A3, NOTES.F4],
        [NOTES.F3, NOTES.C4, NOTES.A4],
        [NOTES.A2, NOTES.E4, NOTES.C5],
        [NOTES.D3, NOTES.A3, NOTES.E4],
      ] as const;
      softChord(chords[chapter], 2.7, .0076);
      noiseSweep(900, 2400, .78, .0038, .04, 0);
      return;
    }
    if (name.startsWith("memory-glint")) {
      const index = Math.max(0, Number(name.at(-1)) - 1);
      bell([NOTES.D5, NOTES.F5, NOTES.A5][index] ?? NOTES.D5, .52 + index * .08, .0028, 0, -.15 + index * .15);
      return;
    }
    if (name === "memory-dissolve") {
      setScene("finale");
      noiseSweep(1800, 6200, 2.35, .009, 0, 0, "highpass");
      oscillatorTone(NOTES.D3, 2.8, .006, "sine", 0, NOTES.D2, 0, .16);
      return;
    }
    if (name === "finale") {
      setScene("finale");
      noiseSweep(350, 2800, 1.7, .012, 0, 0);
      [NOTES.D3, NOTES.A3, NOTES.D4, NOTES.F4].forEach((note, index) => bell(note, 2, .0052 - index * .00045, index * .32, -.18 + index * .12));
      return;
    }
    if (name === "rose-settle") {
      oscillatorTone(NOTES.D2, .44, .02, "sine", 0, undefined, 0, .08);
      oscillatorTone(NOTES.D3, .36, .008, "sine", .16, undefined, 0, .1);
      bell(NOTES.A4, 1.8, .0035, .2);
      return;
    }
    if (name === "rose-scatter") {
      noiseSweep(1600, 5800, 1.4, .01, 0, 0);
      [-.28, 0, .28].forEach((pan, index) => noiseSweep(2100, 900, .38, .0038, index * .3, pan));
      return;
    }
    if (name === "thanks") {
      setScene("thanks");
      noiseSweep(2800, 6500, 4.2, .0058, 0, 0);
      [NOTES.D5, NOTES.F5, NOTES.A5, NOTES.C6].forEach((note, index) => bell(note, 2, .0042, index * .62, -.2 + index * .13));
      return;
    }
    if (name === "thanks-formed") {
      setScene("thanks");
      softChord([NOTES.D4, NOTES.F4, NOTES.A4, NOTES.E5], 4.7, .0085);
      return;
    }
    if (name.startsWith("thanks-glint")) {
      const glint = Number(name.at(-1)) || Number(variant) || 1;
      bell(glint === 2 ? 1396.91 : 1174.66, 1.2, .0022, 0, glint === 2 ? .22 : -.22);
      return;
    }
    if (name === "end-tail") {
      if (musicBus) {
        const now = context.currentTime;
        musicBus.gain.cancelScheduledValues(now);
        musicBus.gain.setValueAtTime(Math.max(MIN_GAIN, musicBus.gain.value), now);
        musicBus.gain.exponentialRampToValueAtTime(.2, now + .85);
      }
    }
  }

  async function setEnabled(next: boolean) {
    enabled = next;
    try { window.sessionStorage.setItem(STORAGE_KEY, enabled ? "on" : "off"); } catch { /* storage can be disabled */ }
    if (enabled) {
      const didUnlock = await unlock();
      if (didUnlock) playCue("enabled");
    } else if (context && master) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(MIN_GAIN, master.gain.value), now);
      master.gain.exponentialRampToValueAtTime(MIN_GAIN, now + .09);
      window.setTimeout(() => { if (!enabled && context?.state === "running") void context.suspend(); }, 115);
    }
    emitState(enabled, unlocked && Boolean(context?.state === "running"));
  }

  function pause() {
    paused = true;
    if (context?.state === "running") void context.suspend();
    emitState(enabled, unlocked);
  }

  async function resume() {
    paused = false;
    if (enabled && unlocked && context?.state === "suspended") {
      try { await context.resume(); } catch { return; }
      startScore();
    }
    emitState(enabled, unlocked);
  }

  function onCommand(event: Event) {
    const detail = (event as CustomEvent<RoseAudioCommand>).detail ?? {};
    if (detail.command === "set-enabled") void setEnabled(detail.enabled !== false);
    if (detail.command === "cue" && detail.cue) {
      // Scene state advances even while autoplay is still locked, so a late
      // first interaction starts the score in the chapter currently on screen.
      if (detail.cue === "door" || detail.cue.startsWith("door-")) setScene("door");
      else if (detail.cue.startsWith("bat-") || detail.cue.startsWith("petal") || detail.cue.startsWith("bloom")) setScene("flight");
      else if (["stars", "virgo", "capricorn"].includes(detail.cue)) setScene("stars");
      else if (/^memory-[1-4]$/.test(detail.cue)) setScene("memories", Number(detail.cue.at(-1)) - 1);
      else if (detail.cue.startsWith("memory-") && !detail.cue.startsWith("memory-dissolve")) setScene("memories", chapter);
      else if (["memory-dissolve", "finale", "rose-settle", "rose-scatter"].includes(detail.cue)) setScene("finale");
      else if (detail.cue.startsWith("thanks")) setScene("thanks");
      playCue(detail.cue, detail.variant);
    }
    if (detail.command === "scene" && detail.scene) setScene(detail.scene);
    if (detail.command === "pause") pause();
    if (detail.command === "resume") void resume();
    if (detail.command === "stop" && context && master) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(MIN_GAIN, master.gain.value), now);
      master.gain.exponentialRampToValueAtTime(MIN_GAIN, now + .12);
    }
  }

  function unlockFromInteraction(event: Event) {
    if (!enabled || destroyed) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("#rose-sound")) return;
    if (event instanceof KeyboardEvent && !["Enter", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    void unlock();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener(AUDIO_EVENT, onCommand);
    window.removeEventListener("pointerdown", unlockFromInteraction, true);
    window.removeEventListener("keydown", unlockFromInteraction, true);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onPageShow);
    if (scoreTimer) window.clearInterval(scoreTimer);
    ambientNodes.forEach((node) => {
      try { (node as AudioScheduledSourceNode).stop(); } catch { /* already stopped */ }
      try { node.disconnect(); } catch { /* already disconnected */ }
    });
    ambientNodes.clear();
    if (context && context.state !== "closed") void context.close();
  }

  function onPageHide(event: PageTransitionEvent) {
    if (event.persisted) pause();
    else destroy();
  }

  function onPageShow(event: PageTransitionEvent) {
    if (event.persisted && enabled) void resume();
  }

  window.addEventListener(AUDIO_EVENT, onCommand);
  window.addEventListener("pointerdown", unlockFromInteraction, true);
  window.addEventListener("keydown", unlockFromInteraction, true);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  emitState(enabled, false);
  window.dispatchEvent(new CustomEvent(AUDIO_READY_EVENT, { detail: { supported: true, enabled } }));
  if (enabled && (window as AudioWindow).__roseDoorAudioContext?.state === "running") void unlock();
  return destroy;
}
