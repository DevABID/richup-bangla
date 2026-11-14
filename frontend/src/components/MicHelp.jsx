import { useState } from "react";
import { useTranslation } from "react-i18next";
import { browserInfo } from "../lib/micHelp";
import Modal from "./Modal";

// Guides the player through allowing the microphone:
//  - inside Facebook/Instagram etc.: ask them to open the link in a real browser
//  - blocked: step-by-step instructions for their exact browser, then "try again"
//  - otherwise: a short heads-up before the browser's own permission prompt
export default function MicHelp({ voice, onClose }) {
  const { t } = useTranslation();
  const { kind, inApp } = browserInfo();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const err = voice.error;

  const tryJoin = async () => {
    setBusy(true);
    voice.clearError();
    const ok = await voice.join();
    setBusy(false);
    if (ok) onClose();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
    } catch {
      window.prompt(t("voice.help.copyManual"), location.href);
    }
  };

  let body;
  if (inApp) {
    body = (
      <>
        <div className="mic-emoji" aria-hidden="true">📱➡️🌐</div>
        <h2>{t("voice.help.inAppTitle")}</h2>
        <p>{t(`voice.help.inAppBody.${kind === "ios" ? "ios" : "other"}`)}</p>
        <button className="btn hot" onClick={copyLink}>{copied ? t("voice.help.copied") : t("voice.help.copyLink")}</button>
        <button className="btn ghost" onClick={tryJoin} disabled={busy}>{t("voice.help.tryAnyway")}</button>
      </>
    );
  } else if (err === "denied") {
    const steps = t(`voice.help.steps.${kind}`, { returnObjects: true });
    body = (
      <>
        <div className="mic-emoji" aria-hidden="true">🎙️🚫</div>
        <h2>{t("voice.help.blockedTitle")}</h2>
        <p>{t("voice.help.blockedBody")}</p>
        <ol className="mic-steps">
          {(Array.isArray(steps) ? steps : []).map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        <button className="btn hot" onClick={tryJoin} disabled={busy}>
          {busy ? t("voice.help.waiting") : t("voice.help.retry")}
        </button>
        <p className="muted small-note">{t("voice.help.reloadHint")}</p>
      </>
    );
  } else if (err === "nomic" || err === "busy" || err === "https" || err === "other") {
    body = (
      <>
        <div className="mic-emoji" aria-hidden="true">🎙️❓</div>
        <h2>{t("voice.help.problemTitle")}</h2>
        <p>{t(`voice.help.problem.${err}`)}</p>
        <button className="btn hot" onClick={tryJoin} disabled={busy}>{t("voice.help.retry")}</button>
      </>
    );
  } else {
    body = (
      <>
        <div className="mic-emoji" aria-hidden="true">🎙️</div>
        <h2>{t("voice.help.introTitle")}</h2>
        <p>{t("voice.help.introBody")}</p>
        <div className="fake-prompt" aria-hidden="true">
          <span>🎙️ {t("voice.help.fakePrompt")}</span>
          <span className="fake-buttons"><span>Block</span><b>Allow</b></span>
        </div>
        <button className="btn hot" onClick={tryJoin} disabled={busy}>
          {busy ? t("voice.help.waiting") : t("voice.help.allowAndJoin")}
        </button>
      </>
    );
  }

  return (
    <Modal onClose={onClose} className="modal mic-help">
      {body}
      <button className="btn ghost" onClick={onClose}>{t("property.close")}</button>
    </Modal>
  );
}
