import { tileName } from "./format";

// Corner names differ per map (e.g. "যানজট" vs "রিটেক"), so UI text that
// mentions them takes these as i18n params instead of hardcoding them.
export const placeWords = (board, lang) => ({
  start: tileName(board[0], lang),
  jail: tileName(board[10], lang),
  parking: tileName(board[20], lang),
});

export const deckTile = (board, deck) => board[deck === "chance" ? 7 : 2];
