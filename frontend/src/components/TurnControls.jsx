import { useTranslation } from "react-i18next";
import { currentPlayerId, playerById, useGame } from "../lib/store";
import { money } from "../lib/format";
import { placeWords } from "../lib/places";
import ActionPanel from "./ActionPanel";
import Dice from "./Dice";

// Dice + action buttons. Shown in the board centre on big screens and in a
// control bar under the board on phones.
export default function TurnControls() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, you, act } = useGame();
  const lastRoll = [...game.log].reverse().find((e) => e.type === "rolled");
  const me = playerById(game, you);
  const canRoll = !game.walking && game.status === "playing" && game.phase === "roll"
    && currentPlayerId(game) === you && me && me.money >= 0;

  return (
    <div className="turn-controls">
      <Dice dice={game.dice} rollId={lastRoll?.id} onRoll={canRoll ? () => act("roll") : undefined} />
      <ActionPanel />
      {game.settings.free_parking_pot && game.pot > 0 && (
        <div className="muted">{t("game.pot", { ...placeWords(board, lang), amount: money(game.pot, lang) })}</div>
      )}
    </div>
  );
}
