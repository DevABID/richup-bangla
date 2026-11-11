import { create } from "zustand";
import { GameSocket } from "./socket";
import { getPid } from "./identity";

let toastId = 0;

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
        set({ game: msg.state, chat: msg.state.chat, board: map?.tiles ?? [], cards: map?.cards ?? {} });
        break;
      }
      case "chat":
        set((s) => (s.chat.some((m) => m.id === msg.msg.id) ? s : { chat: [...s.chat, msg.msg].slice(-100) }));
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
