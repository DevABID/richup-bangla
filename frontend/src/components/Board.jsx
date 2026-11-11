import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";
import { money, tileName } from "../lib/format";
import { gridPos, tileCenter } from "../lib/layout";
import { describeEvent, HIDDEN_EVENTS } from "../lib/events";
import { placeWords } from "../lib/places";
import ActionPanel from "./ActionPanel";
import Dice from "./Dice";

function Houses({ count }) {
  if (count === 5) return <span className="hotel" />;
  return Array.from({ length: count }, (_, i) => <span key={i} className="house" />);
}

function Tile({ tile, prop, owner, lang, onClick }) {
  const { row, col, side } = gridPos(tile.id);
  const corner = tile.id % 10 === 0;
  const icon = tile.icon; // each map sets its own icons
  const name = tileName(tile, lang);
  const cls = ["tile", `side-${corner ? "bottom" : side}`, corner && "corner", prop?.mortgaged && "mortgaged"]
    .filter(Boolean)
    .join(" ");
  const ownable = tile.price != null;

  return (
    <button className={cls} style={{ gridRow: row, gridColumn: col }} onClick={ownable ? onClick : undefined}
      aria-label={name} title={lang === "bn" ? tile.tagline_bn : tile.tagline_en} tabIndex={ownable ? 0 : -1}>
      {tile.type === "property" && (
        <span className="band" style={{ background: tile.color }}>
          {prop && <Houses count={prop.houses} />}
        </span>
      )}
      <span className="body">
        {icon && <span className="icon" aria-hidden="true">{icon}</span>}
        <span className="name">{name}</span>
        {ownable && !prop && <span className="price">{money(tile.price, lang)}</span>}
        {tile.type === "tax" && <span className="price">{money(tile.amount, lang)}</span>}
      </span>
      {owner && <span className="owner" style={{ "--owner": owner.color }} />}
    </button>
  );
}

function Token({ player, slot, me }) {
  const [shown, setShown] = useState(player.position);

  // Walk forward one tile at a time; jump for long or backward moves.
  useEffect(() => {
    if (shown === player.position) return;
    const dist = (player.position - shown + 40) % 40;
    if (dist > 12) {
      setShown(player.position);
      return;
    }
    const id = setTimeout(() => setShown((s) => (s + 1) % 40), 110);
    return () => clearTimeout(id);
  }, [shown, player.position]);

  const { x, y } = tileCenter(shown);
  const dx = ((slot % 3) - 1) * 2.2;
  const dy = (Math.floor(slot / 3) - 0.5) * 2.2;
  return (
    <span className={`token ${me ? "me" : ""}`} title={player.name}
      style={{ left: `${x + dx}%`, top: `${y + dy}%`, "--c": player.color }} />
  );
}

export default function Board({ onTileClick }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, cards, you } = useGame();
  const ownerOf = (id) => game.players.find((p) => p.id === game.properties[id]?.owner);

  const visibleLog = game.log.filter((e) => !HIDDEN_EVENTS.has(e.type)).slice(-14).reverse();
  const lastRoll = [...game.log].reverse().find((e) => e.type === "rolled");
  const alive = game.players.filter((p) => !p.bankrupt);

  return (
    <div className="board">
      {board.map((tile) => (
        <Tile key={tile.id} tile={tile} prop={game.properties[tile.id]} owner={ownerOf(tile.id)}
          lang={lang} onClick={() => onTileClick(tile.id)} />
      ))}

      <div className="center">
        <h1 className="logo">{t("app.title")}</h1>
        <div style={{ display: "grid", gap: 10, justifyItems: "center", width: "100%" }}>
          <Dice dice={game.dice} rollId={lastRoll?.id} />
          <ActionPanel />
          {game.settings.free_parking_pot && game.pot > 0 && (
            <div className="muted">{t("game.pot", { ...placeWords(board, lang), amount: money(game.pot, lang) })}</div>
          )}
        </div>
        <div className="center-log" aria-label={t("game.log")}>
          {visibleLog.map((ev, i) => (
            <div key={ev.id} className={i === 0 ? "latest" : ""}>
              {describeEvent(ev, t, { board, cards, game, lang })}
            </div>
          ))}
        </div>
      </div>

      {alive.map((p) => {
        const sameTile = alive.filter((o) => o.position === p.position);
        return <Token key={p.id} player={p} slot={sameTile.indexOf(p)} me={p.id === you} />;
      })}
    </div>
  );
}
