import { create } from "zustand";
import { GameSocket } from "./socket";
import { getPid } from "./identity";
import { play, soundsForEvents } from "./sound";

let toastId = 0;

// Tokens walk one tile per STEP_MS. While a token is walking, the rest of the
// update (buy prompt, rent, cards, log, sounds) waits, so results appear only
// once the token has arrived.
export const STEP_MS = 110;
const MAX_WALK = 12; // longer or backward moves jump instead of walking
const ARRIVE_PAUSE = 250;
let pendingTimer = null;

function walkTime(oldGame, newGame) {
  if (!oldGame || oldGame.status !== "playing") return 0;
  let longest = 0;
  for (const p of newGame.players) {
    const before = oldGame.players.find((o) => o.id === p.id);
    if (!before || before.position === p.position) continue;
    const dist = (p.position - before.position + 40) % 40;
    if (dist <= MAX_WALK) longest = Math.max(longest, dist);
  }
  return longest ? longest * STEP_MS + ARRIVE_PAUSE : 0;
}

export const useGame = create((set, get) => ({
  connected: false,
  you: null,
  spectator: false,
  maps: {}, // every map, sent once in "welcome"
  board: [], // tiles of the room's current map
  cards: {},
  colors: [],
  game: null,
  chat: [],
  toasts: [],
  socket: null,
  rtcHandler: null, // set by the voice hook
  serverOffset: 0, // server clock minus this device's clock, in seconds (for countdowns)

  connect(room, name) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const qs = new URLSearchParams({ pid: getPid(), name });
    const url = `${proto}://${location.host}/ws/game/${room}/?${qs}`;
    const socket = new GameSocket(
      url,
      (msg) => get().handle(msg),
      (connected) => set({ connected })
    );
    set({ socket, game: null, chat: [] });
    return () => socket.close();
  },

  handle(msg) {
    switch (msg.type) {
      case "welcome":
        set({ you: msg.you, spectator: msg.spectator, maps: msg.maps, colors: msg.colors });
        break;
      case "state": {
        // The host can switch maps in the lobby, so pick the board on every update
        const maps = get().maps;
        const map = maps[msg.state.settings.map] ?? Object.values(maps)[0];
        const shown = get().game;
        const offset = msg.server_time ? msg.server_time - Date.now() / 1000 : get().serverOffset;
        const apply = () => {
          pendingTimer = null;
          set({ game: msg.state, chat: msg.state.chat, board: map?.tiles ?? [], cards: map?.cards ?? {}, serverOffset: offset });
          if (shown) soundsForEvents(msg.events ?? [], get().you).forEach((name, i) => setTimeout(() => play(name), i * 180));
        };
        // The dice sound plays as soon as the dice roll, before the token walks
        if (shown && (msg.events ?? []).some((e) => e.type === "rolled")) play("dice");
        // A newer update replaces one that is still waiting
        clearTimeout(pendingTimer);
        const wait = walkTime(shown, msg.state);
        if (!wait) {
          apply();
          break;
        }
        // Step 1: only move the tokens and show the dice (and the roll in the log)
        const rolled = (msg.events ?? []).filter((e) => e.type === "rolled");
        set({
          game: {
            ...shown,
            dice: msg.state.dice,
            players: shown.players.map((p) => ({
              ...p,
              position: msg.state.players.find((n) => n.id === p.id)?.position ?? p.position,
            })),
            log: [...shown.log, ...rolled.filter((e) => !shown.log.some((o) => o.id === e.id))],
            walking: true,
          },
          serverOffset: offset,
        });
        // Step 2: once the token has arrived, show everything else
        pendingTimer = setTimeout(apply, wait);
        break;
      }
      case "chat":
        set((s) => (s.chat.some((m) => m.id === msg.msg.id) ? s : { chat: [...s.chat, msg.msg].slice(-100) }));
        if (msg.msg.player !== get().you) play("chat");
        break;
      case "rtc":
        get().rtcHandler?.(msg.from, msg.data);
        break;
      case "error":
        get().toast(`errors.${msg.key}`, msg.params);
        break;
      default:
    }
  },

  send: (msg) => get().socket?.send(msg),
  act: (action, payload = {}) => get().socket?.send({ type: "action", action, payload }),

  toast(key, params = {}) {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, key, params }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
}));

// Convenience selectors
export const playerById = (game, id) => game?.players.find((p) => p.id === id);
export const currentPlayerId = (game) => game?.order?.[game.turn];
