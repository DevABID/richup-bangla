import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { playerById, useGame } from "../lib/store";
import { useMedia } from "../lib/useMedia";
import Board from "./Board";
import BoardViewport from "./BoardViewport";
import Chat from "./Chat";
import Modal from "./Modal";
import PlayersPanel from "./PlayersPanel";
import PropertyModal from "./PropertyModal";
import TradeModal from "./TradeModal";
import TurnControls from "./TurnControls";
import VoicePanel from "./VoicePanel";

export default function GameView({ voice }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { game } = useGame();
  const [tileModal, setTileModal] = useState(null);
  const [tradeWith, setTradeWith] = useState(undefined);
  const winner = playerById(game, game.winner);
  const compact = useMedia("(max-width: 700px)");

  return (
    <div className="game-layout">
      <div className="side">
        <PlayersPanel onTrade={setTradeWith} onTileClick={setTileModal} />
        <VoicePanel voice={voice} />
      </div>

      <div className="board-wrap">
        {compact ? <BoardViewport onTileClick={setTileModal} /> : <Board onTileClick={setTileModal} />}
        {compact && (
          <div className="dock">
            <TurnControls />
          </div>
        )}
      </div>

      <div className="side">
        <Chat />
      </div>

      {tileModal !== null && <PropertyModal tileId={tileModal} onClose={() => setTileModal(null)} />}
      {tradeWith !== undefined && <TradeModal initialTo={tradeWith} onClose={() => setTradeWith(undefined)} />}

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
