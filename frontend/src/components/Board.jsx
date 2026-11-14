import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { STEP_MS, useGame } from "../lib/store";
import { money, tileName } from "../lib/format";
import { gridPos, tileCenter } from "../lib/layout";
import { describeEvent, HIDDEN_EVENTS } from "../lib/events";
import { play } from "../lib/sound";
import Flag from "./Flag";
import Logo from "./Logo";
import TurnControls from "./TurnControls";

function HouseIcon() {
  return (
    <svg className="house" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2 1.5 9.5H4V18h12V9.5h2.5z" fill="#1fa35a" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="8.2" y="12" width="3.6" height="6" fill="#fff" />
    </svg>
  );
}

function HotelIcon() {
  return (
    <svg className="hotel" viewBox="0 0 28 20" aria-hidden="true">
      <path d="M2 18V6l12-4.5L26 6v12z" fill="#e0262f" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      {[7, 11.5].map((y) => [6, 11, 16, 21].map((x) => <rect key={`${x}-${y}`} x={x - 1} y={y} width="2.2" height="2.6" fill="#fff" />))}
      <rect x="12.4" y="14" width="3.2" height="4" fill="#fff" />
    </svg>
  );
}

// One house icon with a count ("🏠×2"), or a hotel
function Houses({ count }) {
  if (!count) return null;
  if (count === 5) return <HotelIcon />;
  return (
    <span className="house-count">
      <HouseIcon />
      {count > 1 && <b>×{count}</b>}
    </span>
  );
}

// First letter of a name, keeping Bangla letters with their vowel signs whole
function initial(name) {
  const text = (name || "?").trim();
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return seg.segment(text)[Symbol.iterator]().next().value?.segment.toUpperCase() ?? "?";
  } catch {
    return [...text][0]?.toUpperCase() ?? "?";
  }
}

function Tile({ tile, prop, owner, lang, onClick, salary, glow }) {
  const { row, col, side } = gridPos(tile.id);
  const corner = tile.id % 10 === 0;
  const icon = tile.icon; // each map sets its own icons
  const name = tileName(tile, lang);
  const cls = ["tile", `side-${corner ? "bottom" : side}`, corner && "corner", prop?.mortgaged && "mortgaged",
    owner && "owned", glow && "set-glow", tile.flag && tile.type !== "property" && "has-corner-flag"]
    .filter(Boolean)
    .join(" ");
  const ownable = tile.price != null;

  return (
    <button className={cls} style={{ gridRow: row, gridColumn: col, "--owner": owner?.color }} onClick={ownable ? onClick : undefined}
      aria-label={name} title={lang === "bn" ? tile.tagline_bn : tile.tagline_en} tabIndex={ownable ? 0 : -1}>
      {tile.type === "property" && (
        // The strip is plain until someone buys the tile, then turns their colour.
        // Without a flag, a small dot still shows which colour set it belongs to.
        <span className={`band ${owner ? "band-owned" : ""}`}>
          {tile.flag ? <Flag code={tile.flag} round /> : <span className="group-dot" style={{ background: tile.color }} />}
          {prop && <Houses count={prop.houses} />}
        </span>
      )}
      <span className="body">
        {icon && <span className="icon" aria-hidden="true">{icon}</span>}
        {tile.flag && tile.type !== "property" && <Flag code={tile.flag} round className="flag-inline" />}
        <span className="text">
          <span className="name">{name}</span>
          {ownable && !prop && <span className="price">{money(tile.price, lang)}</span>}
          {tile.type === "tax" && <span className="price">{money(tile.amount, lang)}</span>}
          {tile.type === "go" && salary > 0 && <span className="price">+{money(salary, lang)}</span>}
        </span>
      </span>
      {owner && tile.type !== "property" && <span className="owner" />}
    </button>
  );
}

// Tokens sit in the exact centre of their tile. Several tokens on one tile are
// spread evenly around the centre (up to 3 in a row, then a second row).
function Token({ player, slot, count, me }) {
  const [shown, setShown] = useState(player.position);

  // Walk forward one tile at a time; jump for long or backward moves.
  useEffect(() => {
    if (shown === player.position) return;
    const dist = (player.position - shown + 40) % 40;
    if (dist > 12) {
      setShown(player.position);
      return;
    }
    const id = setTimeout(() => setShown((s) => (s + 1) % 40), STEP_MS);
    return () => clearTimeout(id);
  }, [shown, player.position]);

  const { x, y } = tileCenter(shown);
  const perRow = Math.min(count, 3);
  const rows = Math.ceil(count / 3);
  const row = Math.floor(slot / 3);
  const inRow = row === rows - 1 ? count - row * 3 : perRow;
  const ox = (slot % 3) - (inRow - 1) / 2; // in token widths, 0 = centre
  const oy = row - (rows - 1) / 2;
  return (
    <span className={`token ${me ? "me" : ""}`} title={player.name}
      style={{ left: `${x}%`, top: `${y}%`, "--c": player.color, "--ox": ox, "--oy": oy }}>
      {initial(player.name)}
    </span>
  );
}

// When a player completes a colour set, its tiles glow once and a sound plays.
function useSetGlow(game, board) {
  const prev = useRef(null);
  const [glowing, setGlowing] = useState(() => new Set());
  useEffect(() => {
    const groups = {};
    for (const tile of board) if (tile.type === "property") (groups[tile.group] ??= []).push(tile.id);
    const fullSets = {};
    for (const [group, ids] of Object.entries(groups)) {
      const owner = game.properties[ids[0]]?.owner;
      if (owner && ids.every((id) => game.properties[id]?.owner === owner)) fullSets[group] = owner;
    }
    const before = prev.current;
    prev.current = fullSets;
    if (!before) return; // first load: nothing new to celebrate
    const fresh = Object.keys(fullSets).filter((g) => before[g] !== fullSets[g]);
    if (!fresh.length) return;
    play("setComplete");
    setGlowing(new Set(fresh.flatMap((g) => groups[g])));
    const id = setTimeout(() => setGlowing(new Set()), 1800);
    return () => clearTimeout(id);
  }, [game.properties, board]);
  return glowing;
}

// compact: on phones the dice and buttons live in a bar under the board instead
export default function Board({ onTileClick, compact = false }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, cards, you } = useGame();
  const ownerOf = (id) => game.players.find((p) => p.id === game.properties[id]?.owner);

  const glowing = useSetGlow(game, board);
  const visibleLog = game.log.filter((e) => !HIDDEN_EVENTS.has(e.type)).slice(-14).reverse();
  const alive = game.players.filter((p) => !p.bankrupt);

  return (
    <div className="board">
      {board.map((tile) => (
        <Tile key={tile.id} tile={tile} prop={game.properties[tile.id]} owner={ownerOf(tile.id)}
          lang={lang} onClick={() => onTileClick(tile.id)} salary={game.settings.go_salary ?? 200}
          glow={glowing.has(tile.id)} />
      ))}

      <div className={`center ${compact ? "compact" : ""}`}>
        <h1 className="center-logo"><Logo /></h1>
        {!compact && <TurnControls />}
        <div className="center-log" aria-label={t("game.log")}>
          {visibleLog.map((ev, i) => (
            <div key={ev.id} className={[i === 0 && "latest", ev.type === "card" && "card-line"].filter(Boolean).join(" ")}>
              {describeEvent(ev, t, { board, cards, game, lang })}
            </div>
          ))}
        </div>
      </div>

      {alive.map((p) => {
        const sameTile = alive.filter((o) => o.position === p.position);
        return <Token key={p.id} player={p} slot={sameTile.indexOf(p)} count={sameTile.length} me={p.id === you} />;
      })}
    </div>
  );
}
