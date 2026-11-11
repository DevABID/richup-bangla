import { useState } from "react";
import { useTranslation } from "react-i18next";
import { currentPlayerId, playerById, useGame } from "../lib/store";
import { money, tileName } from "../lib/format";
import { placeWords } from "../lib/places";

const JAIL_FINE = 50;

function Bankrupt() {
  const { t } = useTranslation();
  const act = useGame((s) => s.act);
  return (
    <button className="btn small danger" onClick={() => window.confirm(t("game.confirmBankrupt")) && act("bankrupt")}>
      {t("game.bankrupt")}
    </button>
  );
}

function Auction() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, you, act } = useGame();
  const [custom, setCustom] = useState("");
  const auc = game.auction;
  const me = playerById(game, you);
  const leader = playerById(game, auc.high_bidder);
  const inAuction = auc.active.includes(you);
  const bid = (amount) => act("bid", { amount });

  return (
    <div className="actions">
      <div className="headline">{t("auction.title", { tile: tileName(board[auc.tile], lang) })}</div>
      <div>
        {leader ? t("auction.highBid", { amount: money(auc.high_bid, lang), name: leader.name }) : t("auction.noBids")}
      </div>
      {inAuction && me ? (
        <>
          <div className="row" style={{ justifyContent: "center" }}>
            {[10, 50, 100].map((inc) => (
              <button key={inc} className="btn primary small" disabled={auc.high_bid + inc > me.money}
                onClick={() => bid(auc.high_bid + inc)}>
                {money(auc.high_bid + inc, lang)}
              </button>
            ))}
          </div>
          <form className="row" style={{ justifyContent: "center", flexWrap: "nowrap" }}
            onSubmit={(e) => { e.preventDefault(); bid(Number(custom)); setCustom(""); }}>
            <input className="input" type="number" min={auc.high_bid + 1} value={custom}
              placeholder={t("auction.custom")} onChange={(e) => setCustom(e.target.value)} style={{ maxWidth: 120 }} />
            <button className="btn small" type="submit" disabled={!custom}>{t("auction.bid")}</button>
            <button type="button" className="btn small ghost" disabled={auc.high_bidder === you}
              onClick={() => act("fold")}>
              {t("auction.fold")}
            </button>
          </form>
        </>
      ) : (
        <div className="muted">{t("auction.out")}</div>
      )}
    </div>
  );
}

export default function ActionPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, you, act, spectator } = useGame();

  if (game.status !== "playing") return null;
  if (game.phase === "auction" && game.auction) return <Auction />;

  const curId = currentPlayerId(game);
  const cur = playerById(game, curId);
  const me = playerById(game, you);
  const myTurn = curId === you;
  const inDebt = me && me.money < 0 && !me.bankrupt;

  const debtNote = inDebt && (
    <>
      <div className="debt">{t("game.inDebt", { amount: money(-me.money, lang) })}</div>
      <Bankrupt />
    </>
  );

  if (!myTurn || !me) {
    return (
      <div className="actions">
        <div className="headline">
          <span className="dot" style={{ "--c": cur?.color, display: "inline-block", marginRight: 6 }} />
          {t("game.turnOf", { name: cur?.name })}
        </div>
        {spectator && <div className="muted">{t("game.spectator")}</div>}
        {debtNote}
      </div>
    );
  }

  let body = null;
  if (game.phase === "roll") {
    body = me.in_jail ? (
      <>
        <div>{t("game.inJail", placeWords(board, lang))}</div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn hot" disabled={inDebt} onClick={() => act("roll")}>{t("game.tryDoubles")}</button>
          <button className="btn" disabled={me.money < JAIL_FINE} onClick={() => act("pay_fine")}>
            {t("game.payFine", { amount: money(JAIL_FINE, lang) })}
          </button>
          {me.jail_cards.length > 0 && (
            <button className="btn" onClick={() => act("use_card")}>{t("game.useCard")}</button>
          )}
        </div>
      </>
    ) : (
      <button className="btn hot" disabled={inDebt} onClick={() => act("roll")}>
        {game.doubles_count > 0 ? t("game.rollAgain") : t("game.roll")}
      </button>
    );
  } else if (game.phase === "buy") {
    const tile = board[game.pending_buy];
    body = (
      <>
        <div>{t("game.buyPrompt", { tile: tileName(tile, lang) })}</div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn primary" disabled={me.money < tile.price} onClick={() => act("buy")}>
            {t("game.buy", { amount: money(tile.price, lang) })}
          </button>
          <button className="btn" onClick={() => act("decline")}>
            {game.settings.auction ? t("game.skipToAuction") : t("game.skip")}
          </button>
        </div>
      </>
    );
  } else if (game.phase === "end") {
    body = (
      <button className="btn primary" disabled={inDebt} onClick={() => act("end_turn")}>{t("game.endTurn")}</button>
    );
  }

  return (
    <div className="actions">
      <div className="headline">{t("game.yourTurn")}</div>
      {body}
      {debtNote}
    </div>
  );
}
