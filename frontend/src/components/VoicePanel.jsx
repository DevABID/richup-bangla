import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";

export default function VoicePanel({ voice }) {
  const { t } = useTranslation();
  const players = useGame((s) => s.game?.players ?? []);
  const spectator = useGame((s) => s.spectator);
  const inCall = players.filter((p) => p.voice);

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
            <button className="btn small primary" onClick={voice.join}>{t("voice.join")}</button>
          )}
        </div>
      )}
      {voice.error && <p className="debt" style={{ marginBottom: 0 }}>{t(voice.error)}</p>}
    </section>
  );
}
