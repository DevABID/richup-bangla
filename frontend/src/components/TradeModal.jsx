import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";
import { money, tileName } from "../lib/format";
import { groupHasHouses, ownedBy } from "../lib/rules";
import Flag from "./Flag";
import Modal from "./Modal";

// A property as a small card: colour strip (or flag), name and price
export function PropCard({ id, selected, onToggle, accent, small = false }) {
  const { i18n } = useTranslation();
  const tile = useGame((s) => s.board[id]);
  const prop = useGame((s) => s.game.properties[id]);
  const Tag = onToggle ? "button" : "div";
  return (
    <Tag type={onToggle ? "button" : undefined} className={`prop-card ${selected ? "selected" : ""} ${small ? "small" : ""}`}
      style={{ "--group": tile.color ?? "var(--muted)", "--accent": accent }} onClick={onToggle ? () => onToggle(id) : undefined}
      aria-pressed={onToggle ? !!selected : undefined}>
      <span className="prop-card-strip">{tile.flag && <Flag code={tile.flag} round />}</span>
      <span className="prop-card-name">{tileName(tile, i18n.language)}</span>
      <span className="prop-card-price">{money(tile.price, i18n.language)}{prop?.mortgaged ? " · 🔒" : ""}</span>
      {onToggle && <span className="prop-card-check" aria-hidden="true">{selected ? "✓" : ""}</span>}
    </Tag>
  );
}

const value = (board, ids, cash) => ids.reduce((sum, id) => sum + (board[id]?.price ?? 0), 0) + (Number(cash) || 0);

function Side({ title, player, ids, selected, onToggle, cash, setCash }) {
  const { t, i18n } = useTranslation();
  const max = Math.max(0, player?.money ?? 0);
  return (
    <div className="trade-side" style={{ "--accent": player?.color }}>
      <div className="trade-side-head">
        <span className="dot" style={{ "--c": player?.color }} />
        <b>{title}</b>
        <span className="muted">{player?.name}</span>
      </div>
      <label className="trade-money">
        <span>💵 {t("trade.money")}</span>
        <input type="range" min="0" max={max} step="10" value={Math.min(Number(cash) || 0, max)}
          onChange={(e) => setCash(e.target.value)} disabled={max === 0} />
        <input className="input" type="number" min="0" max={max} value={cash} placeholder="0"
          onChange={(e) => setCash(e.target.value === "" ? "" : String(Math.max(0, Math.min(max, Number(e.target.value)))))} />
        <span className="muted small-note">{t("trade.has", { amount: money(max, i18n.language) })}</span>
      </label>
      <div className="prop-grid">
        {ids.length === 0 && <span className="muted">{t("trade.noProps")}</span>}
        {ids.map((id) => (
          <PropCard key={id} id={id} selected={selected.includes(id)} onToggle={onToggle} accent={player?.color} />
        ))}
      </div>
      <div className="trade-side-total">{t("trade.worth", { amount: money(value(useGame.getState().board, selected, cash), i18n.language) })}</div>
    </div>
  );
}

// initial: a trade to start from (used for counter-offers); replaces: the
// offer being answered, which is declined when the counter-offer is sent.
export default function TradeModal({ initialTo, initial, replaces, onClose }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, you, act } = useGame();
  const others = game.players.filter((p) => p.id !== you && !p.bankrupt);
  const [to, setTo] = useState(initial?.to ?? initialTo ?? others[0]?.id);
  const [offer, setOffer] = useState(initial?.offer_props ?? []);
  const [request, setRequest] = useState(initial?.request_props ?? []);
  const [offerMoney, setOfferMoney] = useState(initial?.offer_money ? String(initial.offer_money) : "");
  const [requestMoney, setRequestMoney] = useState(initial?.request_money ? String(initial.request_money) : "");
  const me = game.players.find((p) => p.id === you);
  const partner = game.players.find((p) => p.id === to);

  const tradable = (pid) => ownedBy(game, pid).filter((id) => !groupHasHouses(game, board, board[id].group));
  const toggle = (setter) => (id) => setter((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const give = value(board, offer, offerMoney);
  const get = value(board, request, requestMoney);
  const empty = !offer.length && !request.length && !Number(offerMoney) && !Number(requestMoney);
  const diff = get - give;

  const propose = () => {
    if (replaces) act("decline_trade", { trade: replaces });
    act("propose_trade", {
      to,
      offer_props: offer,
      request_props: request,
      offer_money: Number(offerMoney) || 0,
      request_money: Number(requestMoney) || 0,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} className="modal trade-modal">
      <h2>🤝 {replaces ? t("trade.counterTitle") : t("trade.title")}</h2>
      {!replaces && (
        <div className="partner-picker" role="radiogroup" aria-label={t("trade.with")}>
          {others.map((p) => (
            <button key={p.id} role="radio" aria-checked={p.id === to} className="partner-chip" style={{ "--c": p.color }}
              onClick={() => { setTo(p.id); setRequest([]); setRequestMoney(""); }}>
              <span className="dot" style={{ "--c": p.color }} /> {p.name}
            </button>
          ))}
        </div>
      )}
      <div className="trade-cols">
        <Side title={t("trade.youGive")} player={me} ids={tradable(you)} selected={offer} onToggle={toggle(setOffer)}
          cash={offerMoney} setCash={setOfferMoney} />
        <div className="trade-swap" aria-hidden="true">⇄</div>
        {partner && (
          <Side title={t("trade.youGet")} player={partner} ids={tradable(partner.id)} selected={request} onToggle={toggle(setRequest)}
            cash={requestMoney} setCash={setRequestMoney} />
        )}
      </div>
      {!empty && (
        <div className={`trade-verdict ${diff > 0 ? "good" : diff < 0 ? "bad" : ""}`}>
          {diff > 0 ? t("trade.inYourFavour", { amount: money(diff, lang) })
            : diff < 0 ? t("trade.inTheirFavour", { amount: money(-diff, lang) })
              : t("trade.even")}
        </div>
      )}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose}>{t("trade.cancel")}</button>
        <button className="btn hot" disabled={!to || empty} onClick={propose}>{t("trade.propose")}</button>
      </div>
    </Modal>
  );
}
