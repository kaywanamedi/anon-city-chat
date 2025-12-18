export function getOrCreateUserId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("anon_user_id");
  if (!id) {
    id = (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    localStorage.setItem("anon_user_id", id);
  }
  return id;
}
