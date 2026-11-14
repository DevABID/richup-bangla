// Game sounds, synthesised with the Web Audio API: no audio files to download,
// so they play instantly even on slow mobile data. Each player can mute them
// with the 🔊 button; the choice is remembered on their device.

const KEY = "sound";
let ctx = null;

export const soundOn = () => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
};

export function setSoundOn(on) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// Browsers only allow sound after the player has touched the page once.
if (typeof window !== "undefined") {
  const unlock = () => audio();
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });
}

function tone(freq, { at = 0, dur = 0.15, type = "sine", vol = 0.18, to } = {}) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ at = 0, dur = 0.05, vol = 0.12, freq = 2000 } = {}) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  src.buffer = buf;
  filter.type = "bandpass";
  filter.frequency.value = freq;
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

// A low drum hit: a falling sine plus a short burst of noise
function drum(at, { freq = 90, vol = 0.5, dur = 0.35 } = {}) {
  tone(freq, { at, dur, vol, to: freq * 0.45 });
  noise({ at, dur: 0.06, freq: 300, vol: vol * 0.5 });
}

// A brass-like chord: detuned sawtooth voices through a low-pass filter
function brass(freqs, at, dur, vol = 0.05) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, t0);
  filter.frequency.linearRampToValueAtTime(2600, t0 + 0.08);
  filter.frequency.linearRampToValueAtTime(1400, t0 + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.04);
  gain.gain.setValueAtTime(vol, t0 + dur * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  filter.connect(gain).connect(ac.destination);
  for (const f of freqs) {
    for (const detune of [-7, 7]) {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    }
  }
}

const N = { D3: 146.8, E3: 164.8, F3: 174.6, G3: 196, A3: 220, Bb3: 233.1, C4: 261.6, D4: 293.7, F4: 349.2, A4: 440, D5: 587.3 };

const SOUNDS = {
  dice() {
    // a quick, light clatter of two dice
    for (let i = 0; i < 4; i++) noise({ at: i * 0.05 + Math.random() * 0.015, dur: 0.035, vol: 0.09, freq: 2200 + Math.random() * 1500 });
  },
  // Original 5-second "mass entry" stinger for building a house or hotel:
  // war drums, rising brass stabs, then a big held chord over a drum roll.
  buildStinger() {
    drum(0, { freq: 70, vol: 0.6, dur: 0.6 });
    drum(0.45, { freq: 95 }); drum(0.62, { freq: 95 });
    drum(0.9, { freq: 70, vol: 0.6, dur: 0.6 });
    brass([N.D3, N.F3, N.A3], 0.9, 0.3);
    drum(1.35, { freq: 95 }); drum(1.52, { freq: 95 });
    drum(1.8, { freq: 70, vol: 0.6, dur: 0.6 });
    brass([N.E3, N.G3, N.Bb3], 1.8, 0.3);
    drum(2.25, { freq: 95 }); drum(2.42, { freq: 95 });
    drum(2.7, { freq: 70, vol: 0.6, dur: 0.6 });
    brass([N.F3, N.A3, N.C4], 2.7, 0.35);
    for (let i = 0; i < 8; i++) drum(3.05 + i * 0.07, { freq: 120 + i * 6, vol: 0.18 + i * 0.03, dur: 0.12 });
    drum(3.6, { freq: 60, vol: 0.7, dur: 0.9 });
    brass([N.D3, N.A3, N.D4, N.F4, N.A4], 3.6, 1.3, 0.06);
    tone(N.D5, { at: 3.6, dur: 1.3, type: "triangle", vol: 0.05 });
  },
  buy() {
    tone(988, { dur: 0.1, type: "square", vol: 0.07 });
    tone(1319, { at: 0.08, dur: 0.22, type: "square", vol: 0.07 });
  },
  coin() {
    tone(1568, { dur: 0.08, type: "triangle", vol: 0.12 });
    tone(2093, { at: 0.07, dur: 0.2, type: "triangle", vol: 0.12 });
  },
  pay() { tone(420, { dur: 0.25, type: "sawtooth", vol: 0.06, to: 260 }); },
  card() {
    noise({ dur: 0.12, freq: 4000, vol: 0.08 });
    tone(880, { at: 0.08, dur: 0.12, vol: 0.08 });
  },
  jail() {
    tone(392, { dur: 0.18, type: "square", vol: 0.07 });
    tone(330, { at: 0.18, dur: 0.18, type: "square", vol: 0.07 });
    tone(262, { at: 0.36, dur: 0.3, type: "square", vol: 0.07 });
  },
  yourTurn() {
    tone(784, { dur: 0.12, vol: 0.14 });
    tone(1175, { at: 0.11, dur: 0.25, vol: 0.14 });
  },
  bid() { tone(1046, { dur: 0.07, type: "triangle", vol: 0.1 }); },
  tick() { tone(1500, { dur: 0.03, type: "square", vol: 0.04 }); },
  hammer() {
    noise({ dur: 0.08, freq: 700, vol: 0.25 });
    tone(523, { at: 0.05, dur: 0.12, vol: 0.12 });
    tone(784, { at: 0.15, dur: 0.3, vol: 0.12 });
  },
  build() {
    noise({ dur: 0.04, freq: 900, vol: 0.18 });
    noise({ at: 0.12, dur: 0.04, freq: 900, vol: 0.18 });
  },
  offer() {
    tone(659, { dur: 0.12, type: "triangle", vol: 0.12 });
    tone(880, { at: 0.12, dur: 0.12, type: "triangle", vol: 0.12 });
    tone(1319, { at: 0.24, dur: 0.25, type: "triangle", vol: 0.12 });
  },
  chat() { tone(1318, { dur: 0.06, vol: 0.06 }); tone(1760, { at: 0.06, dur: 0.08, vol: 0.06 }); },
  setComplete() {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.3, type: "triangle", vol: 0.11 }));
    tone(2093, { at: 0.3, dur: 0.5, vol: 0.08 });
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, { at: i * 0.12, dur: 0.35, type: "triangle", vol: 0.13 }));
  },
  bankrupt() { tone(330, { dur: 0.6, type: "sawtooth", vol: 0.07, to: 110 }); },
};

// ---------------------------------------------------------------- custom sound files
// Any of these files you add to frontend/public/sounds/ replaces the built-in
// sound of the same name. Only use audio you have the right to use.
const CUSTOM = { buildStinger: "/sounds/build.mp3" };
const MAX_CUSTOM_SECONDS = 5;
const customBuffers = {}; // name -> AudioBuffer | null (null = no file, use built-in)

async function loadCustom(name) {
  if (name in customBuffers) return customBuffers[name];
  customBuffers[name] = null;
  try {
    const res = await fetch(CUSTOM[name]);
    const type = res.headers.get("content-type") || "";
    // a missing file falls through to the game page, which is HTML, not audio
    if (!res.ok || type.includes("text/html")) return null;
    const ac = audio();
    if (!ac) return null;
    customBuffers[name] = await ac.decodeAudioData(await res.arrayBuffer());
  } catch {
    customBuffers[name] = null;
  }
  return customBuffers[name];
}

function playBuffer(buffer) {
  const ac = audio();
  if (!ac) return;
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  const t0 = ac.currentTime;
  const len = Math.min(buffer.duration, MAX_CUSTOM_SECONDS);
  gain.gain.setValueAtTime(0.8, t0);
  gain.gain.setValueAtTime(0.8, t0 + Math.max(0, len - 0.6));
  gain.gain.linearRampToValueAtTime(0.0001, t0 + len);   // short fade-out at the end
  src.buffer = buffer;
  src.connect(gain).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + len + 0.05);
}

// Check for custom files once the player has interacted (browsers need that for audio)
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => Object.keys(CUSTOM).forEach(loadCustom), { once: true, capture: true });
}

export function play(name) {
  if (!soundOn()) return;
  try {
    if (CUSTOM[name] && customBuffers[name]) {
      playBuffer(customBuffers[name]);
      return;
    }
    SOUNDS[name]?.();
  } catch {
    /* sound is optional */
  }
}

// Which sound each game event makes. "me" is the player on this device.
export function soundsForEvents(events, me) {
  const out = [];
  for (const ev of events) {
    switch (ev.type) {
      case "bought": case "unmortgaged": out.push("buy"); break;
      case "auction_won": out.push("hammer"); break;
      case "passed_go": case "pot_collected": out.push(ev.player === me ? "coin" : null); break;
      case "paid_rent": out.push(ev.owner === me ? "coin" : ev.player === me ? "pay" : null); break;
      case "paid": out.push(ev.player === me ? "pay" : null); break;
      case "card": out.push("card"); break;
      case "trade_proposed": out.push(ev.to === me ? "offer" : null); break;
      case "trade_accepted": out.push("buy"); break;
      case "jail": out.push("jail"); break;
      case "bid": out.push("bid"); break;
      case "built": out.push("buildStinger"); break;
      case "sold_house": out.push("build"); break;
      case "turn": out.push(ev.player === me ? "yourTurn" : null); break;
      case "bankrupt": case "timed_out": out.push("bankrupt"); break;
      case "winner": out.push("win"); break;
      default:
    }
  }
  // At most two sounds per update, so a busy turn doesn't become noise
  return [...new Set(out.filter(Boolean))].slice(0, 2);
}
