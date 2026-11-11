import { useEffect, useState } from "react";

const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function Die({ value }) {
  return (
    <div className="die" aria-label={String(value)}>
      {Array.from({ length: 9 }, (_, i) =>
        PIPS[value]?.includes(i) ? <span key={i} className={`pip ${value === 1 ? "red" : ""}`} /> : <span key={i} />
      )}
    </div>
  );
}

export default function Dice({ dice, rollId }) {
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!rollId) return;
    setRolling(true);
    const id = setTimeout(() => setRolling(false), 450);
    return () => clearTimeout(id);
  }, [rollId]);

  return (
    <div className={`dice ${rolling ? "rolling" : ""}`}>
      <Die value={dice[0]} />
      <Die value={dice[1]} />
    </div>
  );
}
