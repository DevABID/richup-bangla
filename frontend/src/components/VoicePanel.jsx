import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";
import { browserInfo, watchMicPermission } from "../lib/micHelp";
import MicHelp from "./MicHelp";

export default function VoicePanel({ voice }) {
  const { t } = useTranslation();
  const players = useGame((s) => s.game?.players ?? []);
  const spectator = useGame((s) => s.spectator);
  const inCall = players.filter((p) => p.voice);
  const [permission, setPermission] = useState("unknown");
  const [help, setHelp] = useState(false);

  useEffect(() => {
    let stop = () => {};
    watchMicPermission(setPermission).then((s) => { stop = s; });
    return () => stop();
  }, []);

  // Already allowed: join straight away. Otherwise explain first.
  const onJoin = async () => {
    if (permission === "granted" && !browserInfo().inApp) {
      const ok = await voice.join();
      if (!ok) setHelp(true);
    } else {
      setHelp(true);
    }
  };

  return (
    <section className="panel">
      <h3>🎙️ {t("voice.title")}</h3>
      {inCall.length === 0 ? (
        <div className="muted">{t("voice.empty")}</div>
      ) : (
        <div className="voice-people">
          {inCall.map((p) => (
            <span key={p.id} className={`voice-person ${voice.speaking[p.id] ? "speaking" : ""}`} style={{ "--c": p.color }}>
              <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
              {p.name}
            </span>
          ))}
        </div>
      )}

      {voice.joined && (
        <div className="mic-test" title={t("voice.micTest")}>
          <span aria-hidden="true">{voice.muted ? "🔇" : "🎤"}</span>
          <span className="meter"><span style={{ width: `${voice.muted ? 0 : Math.round(voice.level * 100)}%` }} /></span>
          <span className="muted small-note">{voice.muted ? t("voice.mutedNote") : t("voice.micTest")}</span>
        </div>
      )}

      {!spectator && (
        <div className="row" style={{ marginTop: 8 }}>
          {voice.joined ? (
            <>
              <button className="btn small" onClick={voice.toggleMute}>
                {voice.muted ? "🔇 " + t("voice.unmute") : "🎤 " + t("voice.mute")}
              </button>
              <button className="btn small danger" onClick={voice.leave}>{t("voice.leave")}</button>
            </>
          ) : (
            <button className="btn small primary" onClick={onJoin}>{t("voice.join")}</button>
          )}
        </div>
      )}
      {!voice.joined && permission === "denied" && (
        <button className="link-btn" onClick={() => setHelp(true)}>{t("voice.blockedHint")}</button>
      )}
      {help && !voice.joined && <MicHelp voice={voice} onClose={() => { setHelp(false); voice.clearError(); }} />}
    </section>
  );
}
