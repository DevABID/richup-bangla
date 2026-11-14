// Works out which browser/device the player is on, so the microphone help
// shows the exact steps for it. Browsers never let a site grant itself the
// microphone, so the best we can do is make the player's one tap easy.

export function browserInfo() {
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  // Facebook, Messenger, Instagram and similar apps open links in their own
  // built-in browser, which often can't use the microphone at all.
  const inApp = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Line\/|MicroMessenger|Snapchat|; wv\)/i.test(ua);
  let kind = "chrome";
  if (ios) kind = "ios";
  else if (/SamsungBrowser/i.test(ua)) kind = "samsung";
  else if (android) kind = "android";
  else if (/Edg\//.test(ua)) kind = "edge";
  else if (/Firefox\//.test(ua)) kind = "firefox";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) kind = "safari";
  return { kind, inApp, ios, android };
}

// "granted" | "denied" | "prompt" | "unknown" (Safari often can't tell)
export async function micPermission() {
  try {
    const status = await navigator.permissions.query({ name: "microphone" });
    return status.state;
  } catch {
    return "unknown";
  }
}

// Calls onChange whenever the player changes the permission in browser settings
export async function watchMicPermission(onChange) {
  try {
    const status = await navigator.permissions.query({ name: "microphone" });
    onChange(status.state);
    status.onchange = () => onChange(status.state);
    return () => { status.onchange = null; };
  } catch {
    onChange("unknown");
    return () => {};
  }
}
