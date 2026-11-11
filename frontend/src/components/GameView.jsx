import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { playerById, useGame } from "../lib/store";
import { tileName } from "../lib/format";
import { deckTile } from "../lib/places";
import Board from "./Board";
import Chat from "./Chat";
import Modal from "./Modal";
import PlayersPanel from "./PlayersPanel";
import PropertyModal from "./PropertyModal";
import TradeModal from "./TradeModal";
import VoicePanel from "./VoicePanel";

// Shows a drawn Chance/Community card to everyone for a few seconds.
function useCardPopup(game) {
  const seen = useRef(null);
  const [card, setCard] = useState(null);
  useEffect(() => {
    const last = [...game.log].reverse().find((e) => e.type === "card");
    if (seen.current === null) {
      seen.current = last?.id ?? 0; // don't replay old cards after joining
      return;
    }
    if (last && last.id > seen.current) {
      seen.current = last.id;
      setCard(last);
      const id = setTimeout(() => setCard(null), 4500);
      return () => clearTimeout(id);
    }
  }, [game.log]);
  return [card, () => setCard(null)];
}

export default function GameView({ voice }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { game, cards, board } = useGame();
  const [tileModal, setTileModal] = useState(null);
  const [tradeWith, setTradeWith] = useState(undefined);
  const [card, closeCard] = useCardPopup(game);
  const winner = playerById(game, game.winner);

  return (
    <div className="game-layout">
      <div className="side">
        <PlayersPanel onTrade={setTradeWith} onTileClick={setTileModal} />
        <VoicePanel voice={voice} />
      </div>

      <div className="board-wrap">
        <Board onTileClick={setTileModal} />
      </div>

      <div className="side">
        <Chat />
      </div>

      {tileModal !== null && <PropertyModal tileId={tileModal} onClose={() => setTileModal(null)} />}
      {tradeWith !== undefined && <TradeModal initialTo={tradeWith} onClose={() => setTradeWith(undefined)} />}

      {card && (
        <Modal onClose={closeCard} className="game-card">
          <div className="deck">{deckTile(board, card.deck)?.icon} {tileName(deckTile(board, card.deck), i18n.language)}</div>
          <div className="muted">{playerById(game, card.player)?.name}</div>
          <div style={{ fontSize: "1.15rem", fontWeight: 600 }}>{cards[card.deck]?.[card.card]?.[i18n.language]}</div>
          <button className="btn primary" onClick={closeCard}>{t("game.ok")}</button>
        </Modal>
      )}

      {game.status === "finished" && winner && (
        <Modal className="modal winner">
          <h2 className="logo">{t("game.winner", { name: winner.name })}</h2>
          <p>{t("game.winnerSub")}</p>
          <button className="btn hot" onClick={() => navigate("/")}>{t("game.backHome")}</button>
        </Modal>
      )}
    </div>
  );
}
