import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";

export default function Chat() {
  const { t } = useTranslation();
  const chat = useGame((s) => s.chat);
  const players = useGame((s) => s.game?.players ?? []);
  const send = useGame((s) => s.send);
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const colorOf = (id) => players.find((p) => p.id === id)?.color ?? "var(--muted)";

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    send({ type: "chat", text });
    setText("");
  };

  return (
    <section className="panel chat">
      <h3>{t("chat.title")}</h3>
      <div className="chat-list" ref={listRef}>
        {chat.length === 0 && <span className="muted">{t("chat.empty")}</span>}
        {chat.map((m) => (
          <div key={m.id} className="chat-msg" style={{ "--c": colorOf(m.player) }}>
            <b>{m.name}:</b> {m.text}
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input className="input" value={text} maxLength={300} placeholder={t("chat.placeholder")}
          onChange={(e) => setText(e.target.value)} />
        <button className="btn primary" type="submit">{t("chat.send")}</button>
      </form>
    </section>
  );
}
