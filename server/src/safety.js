export function sanitizeText(text) {
  return (text ?? "").toString().trim().slice(0, 800);
}

const phoneLike = /(\+?\d[\d\s().-]{7,}\d)/;
const socials = /\b(insta|instagram|snap|snapchat|telegram|whatsapp|tiktok|discord)\b/i;
const meetUp = /\b(meet\s*up|come\s*to|my\s*house|send\s*location|where\s*do\s*you\s*live|address)\b/i;

export function violatesTeenSafety(text) {
  const t = (text || "").toLowerCase();
  return phoneLike.test(t) || socials.test(t) || meetUp.test(t);
}

export function violatesGeneralSafety(text) {
  const t = (text || "").toLowerCase();
  return phoneLike.test(t);
}
