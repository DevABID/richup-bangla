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

const SOUNDS = {
  dice() {
    for (let i = 0; i < 6; i++) noise({ at: i * 0.055 + Math.random() * 0.02, dur: 0.045, freq: 1800 + Math.random() * 1500 });
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

export function play(name) {
  if (!soundOn()) return;
  try {
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
      case "jail": out.push("jail"); break;
      case "bid": out.push("bid"); break;
      case "built": case "sold_house": out.push("build"); break;
      case "turn": out.push(ev.player === me ? "yourTurn" : null); break;
      case "bankrupt": out.push("bankrupt"); break;
      case "winner": out.push("win"); break;
      default:
    }
  }
  // At most two sounds per update, so a busy turn doesn't become noise
  return [...new Set(out.filter(Boolean))].slice(0, 2);
}
