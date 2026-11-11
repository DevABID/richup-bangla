import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";
import { placeWords } from "../lib/places";

export default function Toasts() {
  const { t, i18n } = useTranslation();
  const toasts = useGame((s) => s.toasts);
  const board = useGame((s) => s.board);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className="toast">{t(x.key, { ...placeWords(board, i18n.language), ...x.params, defaultValue: t("errors.bad_request") })}</div>
      ))}
    </div>
  );
}
