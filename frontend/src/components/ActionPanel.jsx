import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { currentPlayerId, playerById, useGame } from "../lib/store";
import { money, num, tileName } from "../lib/format";
import { play } from "../lib/sound";
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

// Seconds left in the auction, kept in step with the server's clock
function useCountdown(endsAt) {
  const offset = useGame((st) => st.serverOffset);
  const left = () => Math.max(0, endsAt - (Date.now() / 1000 + offset));
  const [secs, setSecs] = useState(left);
  useEffect(() => {
    setSecs(left());
    const id = setInterval(() => setSecs(left()), 100);
    return () => clearInterval(id);
  }, [endsAt, offset]); // eslint-disable-line react-hooks/exhaustive-deps
  return secs;
}

const BID_STEPS = [2, 10, 50, 100];

function Auction() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, you, act, spectator } = useGame();
  const auc = game.auction;
  const me = playerById(game, you);
  const leader = playerById(game, auc.high_bidder);
  const secs = useCountdown(auc.ends_at);
  const total = Math.max(1, auc.ends_at - auc.started_at);
  const urgent = secs <= 3;
  const winning = auc.high_bidder === you;
  const canBid = me && !me.bankrupt && !spectator && secs > 0 && !winning;

  // a soft tick for each of the last three seconds
  const whole = Math.ceil(secs);
  useEffect(() => {
    if (whole > 0 && whole <= 3) play("tick");
  }, [whole]);

  const tile = board[auc.tile];
  return (
    <div className="actions auction">
      <div className="headline">🔨 {t("auction.title", { tile: tileName(tile, lang) })}</div>
      <div className={`auction-bid ${winning ? "mine" : ""}`}>
        {leader ? (
          <>
            <span className="amount">{money(auc.high_bid, lang)}</span>
            <span className="who">
              <span className="dot" style={{ "--c": leader.color, display: "inline-block" }} />{" "}
              {winning ? t("auction.youLead") : leader.name}
            </span>
          </>
        ) : (
          <span className="muted">{t("auction.noBids")}</span>
        )}
      </div>
      <div className={`timer ${urgent ? "urgent" : ""}`} role="timer" aria-label={t("auction.timeLeft", { secs: whole })}>
        <div className="timer-fill" style={{ width: `${Math.min(100, (secs / total) * 100)}%` }} />
        <span className="timer-text">{t("auction.timeLeft", { secs: num(whole, lang) })}</span>
      </div>
      {canBid ? (
        <div className="bid-buttons">
          {BID_STEPS.map((step) => {
            const amount = auc.high_bid + step;
            return (
              <button key={step} className="btn primary" disabled={amount > me.money}
                onClick={() => act("bid", { amount })}>
                +{num(step, lang)}
              </button>
            );
          })}
        </div>
      ) : winning && secs > 0 ? (
        <div className="leading-note">{t("auction.waitOthers")}</div>
      ) : (
        !spectator && me?.bankrupt === false && secs <= 0 && <div className="muted">{t("auction.closing")}</div>
      )}
      {canBid && <div className="muted small-note">{t("auction.yourCash", { amount: money(me.money, lang) })}</div>}
    </div>
  );
}

export default function ActionPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, you, act, spectator } = useGame();

  if (game.status !== "playing") return null;
  if (game.walking) {
    const mover = playerById(game, currentPlayerId(game));
    return (
      <div className="actions">
        <div className="headline">
          <span className="dot" style={{ "--c": mover?.color, display: "inline-block", marginRight: 6 }} />
          {mover?.id === you ? t("game.yourTurn") : t("game.turnOf", { name: mover?.name })}
        </div>
      </div>
    );
  }
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
