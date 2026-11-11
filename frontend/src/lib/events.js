import { money, num, tileName } from "./format";
import { placeWords } from "./places";

// Event types that are too noisy for the log
export const HIDDEN_EVENTS = new Set(["moved"]);

// Turns a server log event into a translated sentence.
export function describeEvent(ev, t, { board, cards, game, lang }) {
  const nameOf = (id) => game?.players.find((p) => p.id === id)?.name ?? "?";
  const params = {
    ...placeWords(board, lang),
    name: nameOf(ev.player),
    owner: nameOf(ev.owner),
    to: nameOf(ev.to),
    tile: tileName(board[ev.tile], lang),
    amount: ev.amount != null ? money(ev.amount, lang) : "",
  };
  if (ev.dice) {
    params.a = num(ev.dice[0], lang);
    params.b = num(ev.dice[1], lang);
  }
  if (ev.type === "card") params.text = cards[ev.deck]?.[ev.card]?.[lang] ?? "";
  return t(`log.${ev.type}`, params);
}
