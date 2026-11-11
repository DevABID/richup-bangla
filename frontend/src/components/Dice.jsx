import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function Die({ value }) {
  return (
    <span className="die">
      {Array.from({ length: 9 }, (_, i) =>
        PIPS[value]?.includes(i) ? <span key={i} className={`pip ${value === 1 ? "red" : ""}`} /> : <span key={i} />
      )}
    </span>
  );
}

// When onRoll is given (your turn to roll), the dice become a big button.
export default function Dice({ dice, rollId, onRoll }) {
  const { t } = useTranslation();
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!rollId) return;
    setRolling(true);
    const id = setTimeout(() => setRolling(false), 450);
    return () => clearTimeout(id);
  }, [rollId]);

  const cls = `dice ${rolling ? "rolling" : ""} ${onRoll ? "can-roll" : ""}`;
  const label = `${dice[0]} + ${dice[1]}`;
  if (onRoll) {
    return (
      <button className={cls} onClick={onRoll} aria-label={t("game.roll")} title={t("game.tapDice")}>
        <Die value={dice[0]} />
        <Die value={dice[1]} />
      </button>
    );
  }
  return (
    <div className={cls} role="img" aria-label={label}>
      <Die value={dice[0]} />
      <Die value={dice[1]} />
    </div>
  );
}
