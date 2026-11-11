// Guest identity kept in localStorage so a refresh reconnects you to your seat.
function makeId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return "g" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getPid() {
  let pid = localStorage.getItem("pid");
  if (!pid) {
    pid = makeId();
    localStorage.setItem("pid", pid);
  }
  return pid;
}

export const getName = () => localStorage.getItem("name") || "";
export const setName = (name) => localStorage.setItem("name", name.trim().slice(0, 20));
