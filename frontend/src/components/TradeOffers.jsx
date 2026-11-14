import { useState } from "react";
import { useTranslation } from "react-i18next";
import { playerById, useGame } from "../lib/store";
import { money } from "../lib/format";
import TradeModal, { PropCard } from "./TradeModal";

// Offers sent to you slide in at the corner of the screen, so you can answer
// without hunting for them: accept, decline, or send a counter-offer.
export default function TradeOffers() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, you, act } = useGame();
  const [counter, setCounter] = useState(null);
  const incoming = Object.values(game.trades).filter((tr) => tr.to === you);
  if (!incoming.length && !counter) return null;

  const side = (cash, ids, accent) => (
    <div className="offer-items">
      {cash > 0 && <span className="offer-cash">💵 {money(cash, lang)}</span>}
      {ids.map((id) => <PropCard key={id} id={id} accent={accent} small />)}
      {!cash && !ids.length && <span className="muted">{t("trade.nothing")}</span>}
    </div>
  );

  return (
    <>
      <div className="trade-offers" aria-live="polite">
        {incoming.map((tr) => {
          const from = playerById(game, tr.from);
          const me = playerById(game, you);
          return (
            <div key={tr.id} className="trade-offer" style={{ "--accent": from?.color }}>
              <div className="offer-head">🤝 {t("trade.incoming", { name: from?.name })}</div>
              <div className="offer-sides">
                <div><div className="offer-label">{t("trade.youGet")}</div>{side(tr.offer_money, tr.offer_props, from?.color)}</div>
                <div><div className="offer-label">{t("trade.youGive")}</div>{side(tr.request_money, tr.request_props, me?.color)}</div>
              </div>
              <div className="offer-buttons">
                <button className="btn primary" onClick={() => act("accept_trade", { trade: tr.id })}>✓ {t("trade.accept")}</button>
                <button className="btn" onClick={() => setCounter(tr)}>↺ {t("trade.counter")}</button>
                <button className="btn ghost" onClick={() => act("decline_trade", { trade: tr.id })}>✕ {t("trade.decline")}</button>
              </div>
            </div>
          );
        })}
      </div>
      {counter && (
        <TradeModal
          replaces={counter.id}
          // swap the sides: what they offered is now what you'd ask for, and vice versa
          initial={{
            to: counter.from,
            offer_props: counter.request_props, offer_money: counter.request_money,
            request_props: counter.offer_props, request_money: counter.offer_money,
          }}
          onClose={() => setCounter(null)}
        />
      )}
    </>
  );
}
