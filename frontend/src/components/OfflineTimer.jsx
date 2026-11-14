import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";
import { num } from "../lib/format";

// "অফলাইন · ২:১৫" counting down to elimination, in step with the server's clock
export default function OfflineTimer({ player }) {
  const { t, i18n } = useTranslation();
  const minutes = useGame((s) => s.game?.settings?.offline_minutes ?? 0);
  const offset = useGame((s) => s.serverOffset);
  const deadline = player.offline_since != null && minutes ? player.offline_since + minutes * 60 : null;
  const left = () => (deadline == null ? null : Math.max(0, deadline - (Date.now() / 1000 + offset)));
  const [secs, setSecs] = useState(left);
  useEffect(() => {
    setSecs(left());
    if (deadline == null) return;
    const id = setInterval(() => setSecs(left()), 500);
    return () => clearInterval(id);
  }, [deadline, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  if (secs == null) return <>{t("players.offline")}</>;
  const whole = Math.ceil(secs);
  const mm = num(Math.floor(whole / 60), i18n.language);
  const ss = num(whole % 60, i18n.language).padStart(2, i18n.language === "bn" ? "০" : "0");
  return <span className="offline-timer">{t("players.offlineCountdown", { time: `${mm}:${ss}` })}</span>;
}
