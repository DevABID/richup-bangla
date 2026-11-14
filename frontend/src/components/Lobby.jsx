import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";
import { money, num, tileName } from "../lib/format";
import { placeWords } from "../lib/places";
import Chat from "./Chat";
import VoicePanel from "./VoicePanel";

const TOGGLES = [
  "auction", "free_parking_pot", "no_rent_in_jail", "even_build",
  "double_rent_full_set", "mortgage", "randomize_order",
];

export default function Lobby({ voice }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { game, you, colors, act, spectator, maps, board } = useGame();
  const [copied, setCopied] = useState(false);
  const isHost = game.host === you;
  const me = game.players.find((p) => p.id === you);
  const s = game.settings;
  const lang = i18n.language;

  const copy = async () => {
    await navigator.clipboard?.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const update = (key, value) => act("update_settings", { [key]: value });

  return (
    <div className="lobby">
      <section className="panel" style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <div>
          <div className="muted">{t("lobby.room")}</div>
          <div className="room-code">{game.room}</div>
          <button className="btn small" onClick={copy}>{copied ? t("lobby.copied") : t("lobby.copyLink")}</button>
        </div>

        <div>
          <h3>{t("lobby.players")} ({game.players.length}/{s.max_players})</h3>
          {game.players.map((p) => (
            <div key={p.id} className="player">
              <span className={`dot ${p.online ? "" : "offline"}`} style={{ "--c": p.color }} />
              <span>
                {p.name}
                {p.id === you && <span className="muted"> ({t("lobby.you")})</span>}
                {p.id === game.host && <span className="muted"> · {t("lobby.host")}</span>}
              </span>
              {isHost && p.id !== you && (
                <button className="btn small ghost" onClick={() => act("kick", { player: p.id })}>{t("lobby.kick")}</button>
              )}
            </div>
          ))}
        </div>

        {me && (
          <div>
            <h3>{t("lobby.pickColor")}</h3>
            <div className="swatches">
              {colors.map((c) => {
                const taken = game.players.some((p) => p.color === c && p.id !== you);
                return (
                  <button key={c} className="swatch" style={{ background: c }} aria-label={c}
                    aria-pressed={me.color === c} disabled={taken}
                    onClick={() => act("choose_color", { color: c })} />
                );
              })}
            </div>
          </div>
        )}

        {spectator && <p className="muted">{t("lobby.spectating")}</p>}

        <div className="row">
          {isHost ? (
            <button className="btn hot" disabled={game.players.length < 2} onClick={() => act("start")}>
              {t("lobby.start")}
            </button>
          ) : (
            <span className="muted">{t("lobby.waitingHost")}</span>
          )}
          <button className="btn ghost" onClick={() => { act("leave"); navigate("/"); }}>{t("lobby.leave")}</button>
        </div>
        {isHost && game.players.length < 2 && <span className="muted">{t("lobby.needTwo")}</span>}
      </section>

      <section className="panel">
        <h3>{t("lobby.map")}</h3>
        <div className="map-options" role="radiogroup" aria-label={t("lobby.map")}>
          {Object.values(maps).map((m) => {
            const name = lang === "bn" ? m.name_bn : m.name_en;
            const desc = lang === "bn" ? m.desc_bn : m.desc_en;
            const chosen = s.map === m.id;
            return (
              <button key={m.id} className="map-option" role="radio" aria-checked={chosen}
                disabled={!isHost && !chosen} onClick={() => isHost && !chosen && update("map", m.id)}>
                <span className="map-name">{name}</span>
                <span className="map-desc">{desc}</span>
                <span className="map-range">
                  {t("lobby.mapRange", { from: tileName(m.tiles[1], lang), to: tileName(m.tiles[39], lang) })}
                </span>
              </button>
            );
          })}
        </div>

        <p className="cta-line" style={{ textAlign: "left" }}>
          {t("request.cta")}{" "}
          <a href="/request-map" target="_blank" rel="noopener">{t("request.ctaLink")} ↗</a>
        </p>

        <h3 style={{ marginTop: 18 }}>{t("lobby.settings")}</h3>
        <div className="settings-list">
          <label className="setting">
            {t("lobby.set.max_players")}
            <select disabled={!isHost} value={s.max_players} onChange={(e) => update("max_players", e.target.value)}>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="setting">
            {t("lobby.set.starting_cash")}
            <select disabled={!isHost} value={s.starting_cash} onChange={(e) => update("starting_cash", e.target.value)}>
              {[1000, 1500, 2000, 3000].map((n) => <option key={n} value={n}>{money(n, lang)}</option>)}
            </select>
          </label>
          <label className="setting">
            {t("lobby.set.offline_minutes")}
            <select disabled={!isHost} value={s.offline_minutes ?? 3} onChange={(e) => update("offline_minutes", e.target.value)}>
              {[0, 1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>{n === 0 ? t("lobby.never") : t("lobby.minutes", { n: num(n, lang) })}</option>
              ))}
            </select>
          </label>
          <label className="setting">
            {t("lobby.set.go_salary", placeWords(board, lang))}
            <select disabled={!isHost} value={s.go_salary ?? 200} onChange={(e) => update("go_salary", e.target.value)}>
              {[0, 100, 200, 300, 400, 500].map((n) => <option key={n} value={n}>{money(n, lang)}</option>)}
            </select>
          </label>
          {TOGGLES.map((key) => (
            <label key={key} className="setting">
              {t(`lobby.set.${key}`, placeWords(board, lang))}
              <input type="checkbox" disabled={!isHost} checked={!!s[key]} onChange={(e) => update(key, e.target.checked)} />
            </label>
          ))}
        </div>
      </section>

      <div className="side">
        <VoicePanel voice={voice} />
        <Chat />
      </div>
    </div>
  );
}
