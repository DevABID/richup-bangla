import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { num } from "../lib/format";

let nextId = 0;

// Shows a floating "+15" (green) or "−15" (red) next to a player's money
// every time it changes, then fades away.
export default function MoneyDelta({ amount }) {
  const { i18n } = useTranslation();
  const prev = useRef(amount);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const diff = amount - prev.current;
    prev.current = amount;
    if (!diff) return;
    const id = ++nextId;
    setItems((list) => [...list.slice(-2), { id, diff }]);
    const timer = setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 1800);
    return () => clearTimeout(timer);
  }, [amount]);

  return (
    <span className="money-deltas" aria-hidden="true">
      {items.map(({ id, diff }) => (
        <span key={id} className={`money-delta ${diff > 0 ? "up" : "down"}`}>
          {diff > 0 ? "+" : "−"}{num(Math.abs(diff), i18n.language)}
        </span>
      ))}
    </span>
  );
}
