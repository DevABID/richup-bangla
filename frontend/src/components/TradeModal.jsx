import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";
import { money, tileName } from "../lib/format";
import { groupHasHouses, ownedBy } from "../lib/rules";
import Modal from "./Modal";

function PropPicker({ ids, selected, onToggle }) {
  const { t, i18n } = useTranslation();
  const board = useGame((s) => s.board);
  if (ids.length === 0) return <span className="muted">{t("trade.noProps")}</span>;
  return ids.map((id) => (
    <label key={id} className="check">
      <input type="checkbox" checked={selected.includes(id)} onChange={() => onToggle(id)} />
      <span className="dot" style={{ "--c": board[id].color ?? "var(--muted)", width: 10, height: 10 }} />
      {tileName(board[id], i18n.language)}
    </label>
  ));
}

export default function TradeModal({ initialTo, onClose }) {
  const { t, i18n } = useTranslation();
  const { game, board, you, act } = useGame();
  const others = game.players.filter((p) => p.id !== you && !p.bankrupt);
  const [to, setTo] = useState(initialTo ?? others[0]?.id);
  const [offer, setOffer] = useState([]);
  const [request, setRequest] = useState([]);
  const [offerMoney, setOfferMoney] = useState("");
  const [requestMoney, setRequestMoney] = useState("");
  const me = game.players.find((p) => p.id === you);
  const partner = game.players.find((p) => p.id === to);

  const tradable = (pid) => ownedBy(game, pid).filter((id) => !groupHasHouses(game, board, board[id].group));
  const toggle = (setter) => (id) => setter((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const propose = () => {
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
    <Modal onClose={onClose}>
      <h2>{t("trade.title")}</h2>
      <label className="field">
        {t("trade.with")}
        <select className="input" value={to} onChange={(e) => { setTo(e.target.value); setRequest([]); }}>
          {others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className="trade-cols">
        <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
          <b>{t("trade.youGive")}</b>
          <input className="input" type="number" min="0" max={me?.money} value={offerMoney}
            placeholder={`${t("trade.money")} (≤ ${money(Math.max(0, me?.money ?? 0), i18n.language)})`}
            onChange={(e) => setOfferMoney(e.target.value)} />
          <PropPicker ids={tradable(you)} selected={offer} onToggle={toggle(setOffer)} />
        </div>
        <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
          <b>{t("trade.youGet")}</b>
          <input className="input" type="number" min="0" max={partner?.money} value={requestMoney}
            placeholder={`${t("trade.money")} (≤ ${money(Math.max(0, partner?.money ?? 0), i18n.language)})`}
            onChange={(e) => setRequestMoney(e.target.value)} />
          {partner && <PropPicker ids={tradable(partner.id)} selected={request} onToggle={toggle(setRequest)} />}
        </div>
      </div>
      <div className="row">
        <button className="btn primary" disabled={!to} onClick={propose}>{t("trade.propose")}</button>
        <button className="btn ghost" onClick={onClose}>{t("trade.cancel")}</button>
      </div>
    </Modal>
  );
}
