import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { currentPlayerId, playerById, useGame } from "../lib/store";
import { tileCenter } from "../lib/layout";
import Board from "./Board";

const KEY = "boardZoom";
const savedZoom = () => {
  try {
    return localStorage.getItem(KEY) !== "fit";
  } catch {
    return true;
  }
};

// Phones: a 30px-wide tile can't show a name and price clearly, so the board is
// shown at about twice the size in a scrollable frame that follows whoever's
// turn it is. One tap switches to the whole board and back.
export default function BoardViewport({ onTileClick }) {
  const { t } = useTranslation();
  const game = useGame((s) => s.game);
  const [zoomed, setZoomed] = useState(savedZoom);
  const frame = useRef(null);
  const mover = playerById(game, currentPlayerId(game));
  const pos = mover?.position ?? 0;

  const toggle = () => {
    const next = !zoomed;
    setZoomed(next);
    try {
      localStorage.setItem(KEY, next ? "zoom" : "fit");
    } catch {
      /* ignore */
    }
  };

  // keep the current player's token in view (after it has walked there)
  useEffect(() => {
    const el = frame.current;
    if (!zoomed || !el) return;
    const id = setTimeout(() => {
      const board = el.querySelector(".board");
      if (!board) return;
      const { x, y } = tileCenter(pos);
      el.scrollTo({
        left: (x / 100) * board.offsetWidth - el.clientWidth / 2,
        top: (y / 100) * board.offsetHeight - el.clientHeight / 2,
        behavior: "smooth",
      });
    }, 150);
    return () => clearTimeout(id);
  }, [zoomed, pos, game?.turn]);

  return (
    <div className={`board-viewport ${zoomed ? "zoomed" : ""}`}>
      <div className="board-frame" ref={frame}>
        <Board onTileClick={onTileClick} compact />
      </div>
      <button className="btn small zoom-toggle" onClick={toggle}>
        {zoomed ? "🗺️ " + t("game.wholeBoard") : "🔍 " + t("game.zoomBoard")}
      </button>
    </div>
  );
}
