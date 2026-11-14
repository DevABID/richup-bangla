import { useTranslation } from "react-i18next";
import { currentPlayerId, playerById, useGame } from "../lib/store";
import { money, tileName } from "../lib/format";
import { ownedBy } from "../lib/rules";
import MoneyDelta from "./MoneyDelta";
import OfflineTimer from "./OfflineTimer";

// Plain helper (not a component): describes both sides of a trade.
function summarize(trade, board, t, lang) {
  const side = (m, props) => {
    const parts = props.map((id) => tileName(board[id], lang));
    if (m) parts.unshift(money(m, lang));
    return parts.length ? parts.join(", ") : t("trade.nothing");
  };
  return { give: side(trade.offer_money, trade.offer_props), get: side(trade.request_money, trade.request_props) };
}

export default function PlayersPanel({ onTrade, onTileClick }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, you, act } = useGame();
  const cur = currentPlayerId(game);
  const me = playerById(game, you);
  const canTrade = game.status === "playing" && me && !me.bankrupt;
  const ordered = game.order.map((id) => playerById(game, id)).filter(Boolean);
  const trades = Object.values(game.trades).filter((tr) => tr.from === you);

  return (
    <section className="panel">
      <h3>{t("players.title")}</h3>
      {ordered.map((p) => {
        const meta = [
          p.in_jail && `${board[10]?.icon ?? ""} ${tileName(board[10], lang)}`,
          !p.online && !p.bankrupt && <OfflineTimer key="off" player={p} />,
          p.bankrupt && t("players.bankrupt"),
          p.voice && "🎙️",
          p.jail_cards.length > 0 && "🎫".repeat(p.jail_cards.length),
        ].filter(Boolean);
        // join text and the live countdown with " · "
        const metaNodes = meta.flatMap((m, i) => (i ? [" · ", m] : [m]));
        return (
          <div key={p.id} className={`player ${p.id === cur ? "current" : ""} ${p.bankrupt ? "out" : ""}`}>
            <span className={`dot ${p.online ? "" : "offline"}`} style={{ "--c": p.color }} />
            <span>
              {p.name}
              {meta.length > 0 && <div className="meta">{metaNodes}</div>}
            </span>
            <span style={{ textAlign: "right" }}>
              <div className="money money-wrap">
                <MoneyDelta amount={p.money} />
                {money(p.money, lang)}
              </div>
              {canTrade && p.id !== you && !p.bankrupt && (
                <button className="btn small ghost" onClick={() => onTrade(p.id)}>{t("trade.button")}</button>
              )}
            </span>
          </div>
        );
      })}

      {me && (
        <>
          <h3 style={{ marginTop: 14 }}>{t("players.myProps")}</h3>
          <div className="chips">
            {ownedBy(game, you).length === 0 && <span className="muted">{t("players.none")}</span>}
            {ownedBy(game, you).map((id) => (
              <button key={id} className={`chip ${game.properties[id].mortgaged ? "mortgaged" : ""}`}
                style={{ "--c": board[id].color ?? "var(--muted)" }} onClick={() => onTileClick(id)}>
                {tileName(board[id], lang)}
                {game.properties[id].houses > 0 && ` ${game.properties[id].houses === 5 ? "🏨" : game.properties[id].houses > 1 ? `🏠×${game.properties[id].houses}` : "🏠"}`}
              </button>
            ))}
          </div>
        </>
      )}

      {trades.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          {trades.map((tr) => {
            const incoming = tr.to === you;
            const other = playerById(game, incoming ? tr.from : tr.to);
            const s = summarize(tr, board, t, lang);
            return (
              <div key={tr.id} className="trade-card">
                <b>{incoming ? t("trade.incoming", { name: other?.name }) : t("trade.outgoing", { name: other?.name })}</b>
                <div>{incoming ? t("trade.youGet") : t("trade.youGive")}: {s.give}</div>
                <div>{incoming ? t("trade.youGive") : t("trade.youGet")}: {s.get}</div>
                <div className="row">
                  {incoming ? (
                    <>
                      <button className="btn small primary" onClick={() => act("accept_trade", { trade: tr.id })}>{t("trade.accept")}</button>
                      <button className="btn small" onClick={() => act("decline_trade", { trade: tr.id })}>{t("trade.decline")}</button>
                    </>
                  ) : (
                    <button className="btn small" onClick={() => act("cancel_trade", { trade: tr.id })}>{t("trade.cancel")}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {me && !me.bankrupt && game.status === "playing" && me.money >= 0 && (
        <div style={{ marginTop: 14 }}>
          <button className="btn small danger"
            onClick={() => window.confirm(t("game.confirmBankrupt")) && act("bankrupt")}>
            {t("game.bankrupt")}
          </button>
        </div>
      )}
    </section>
  );
}
