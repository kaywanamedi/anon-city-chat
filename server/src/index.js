import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fetch from "node-fetch";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";

import { pool } from "./db.js";
import { tryMatchFor } from "./match.js";
import { sanitizeText, violatesTeenSafety, violatesGeneralSafety } from "./safety.js";

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "120kb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", rateLimit({ windowMs: 60_000, limit: 120 }));

app.post("/api/city", async (req, res) => {
  const { lat, lng } = req.body || {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Bad coords" });
  }

  const ua = process.env.NOMINATIM_UA || "anon-city-chat/1.0 (contact: you@example.com)";
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 9000);

  async function tryNominatim() {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=${lat}&lon=${lng}`;
    const r = await fetch(url, {
      headers: { "User-Agent": ua, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!r.ok) throw new Error(`Nominatim ${r.status}`);
    const data = await r.json();
    const addr = data.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.municipality || addr.county || "Unknown";
    return String(city).trim().replace(/\s+/g, " ");
  }

  async function tryBigDataCloud() {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error(`BigDataCloud ${r.status}`);
    const data = await r.json();
    const city = data.city || data.locality || data.principalSubdivision || "Unknown";
    return String(city).trim().replace(/\s+/g, " ");
  }

  try {
    let city;
    try {
      city = await tryNominatim();
    } catch {
      city = await tryBigDataCloud();
    }
    return res.json({ city });
  } catch (e) {
    const msg = e?.name === "AbortError" ? "Timeout" : (e?.message || "Unknown error");
    return res.status(502).json({ error: "Geocode failed", details: msg });
  } finally {
    clearTimeout(t);
  }
});


const io = new Server(httpServer, { cors: { origin: process.env.CORS_ORIGIN, credentials: true } });

const socketUser = new Map();
const userSocket = new Map();

const msgBucket = new Map();
const matchBucket = new Map();

function allow(buckets, userId, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(userId) || { count: 0, reset: now + windowMs };
  if (now > b.reset) { b.count = 0; b.reset = now + windowMs; }
  b.count += 1;
  buckets.set(userId, b);
  return b.count <= max;
}

function ageGroup(age) {
  if (age >= 15 && age <= 17) return "teen";
  if (age >= 18) return "adult";
  return null;
}

io.on("connection", (socket) => {
  socket.on("register", async (payload, cb) => {
    try {
      const { userId, city, age, gender } = payload || {};
      const a = Number(age);
      const g = ageGroup(a);
      if (!g) return cb?.({ ok: false, error: "Age must be 15+." });
      if (!city || typeof city !== "string" || city.trim().length < 2) return cb?.({ ok: false, error: "City is required." });
      if (!gender || typeof gender !== "string") return cb?.({ ok: false, error: "Gender is required." });

      const id = (typeof userId === "string" && userId.length > 10) ? userId : uuid();

      await pool.query(
        `
        INSERT INTO users(id, city, age, age_group, gender)
        VALUES($1,$2,$3,$4,$5)
        ON CONFLICT (id) DO UPDATE SET
          city=EXCLUDED.city,
          age=EXCLUDED.age,
          age_group=EXCLUDED.age_group,
          gender=EXCLUDED.gender,
          last_active=now()
        `,
        [id, city.trim(), a, g, gender]
      );

      socketUser.set(socket.id, id);
      userSocket.set(id, socket.id);
      cb?.({ ok: true, userId: id, age_group: g });
    } catch {
      cb?.({ ok: false, error: "Register failed." });
    }
  });

  socket.on("find_match", async (payload, cb) => {
    const userId = socketUser.get(socket.id);
    if (!userId) return cb?.({ ok: false, error: "Not registered." });
    if (!allow(matchBucket, userId, 10, 20_000)) return cb?.({ ok: false, error: "Too many match requests. Slow down." });

    try {
      const { min_age, max_age, preferred_gender } = payload || {};
      const pref = (preferred_gender || "any").toString();

      const uRes = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
      const me = uRes.rows[0];
      if (!me) return cb?.({ ok: false, error: "User missing." });

      let minA = Number.isFinite(Number(min_age)) ? Number(min_age) : (me.age_group === "teen" ? 15 : 18);
      let maxA = Number.isFinite(Number(max_age)) ? Number(max_age) : (me.age_group === "teen" ? 17 : 99);

      if (me.age_group === "teen") { minA = Math.max(15, minA); maxA = Math.min(17, maxA); }
      else { minA = Math.max(18, minA); maxA = Math.max(minA, maxA); }
      if (minA > maxA) return cb?.({ ok: false, error: "Invalid age range." });

      await pool.query(
        `INSERT INTO match_requests(id, user_id, city, age_group, min_age, max_age, preferred_gender)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [uuid(), userId, me.city, me.age_group, Math.trunc(minA), Math.trunc(maxA), pref]
      );

      const matched = await tryMatchFor(userId);
      if (!matched) return cb?.({ ok: true, status: "waiting" });

      const { chatId, partnerId } = matched;

      socket.join(chatId);
      const partnerSockId = userSocket.get(partnerId);
      const pSock = partnerSockId ? io.sockets.sockets.get(partnerSockId) : null;
      if (pSock) pSock.join(chatId);

      socket.emit("match_found", { chat_id: chatId, partner_id: partnerId });
      pSock?.emit("match_found", { chat_id: chatId, partner_id: userId });

      cb?.({ ok: true, status: "matched", chat_id: chatId });
    } catch {
      cb?.({ ok: false, error: "Match failed." });
    }
  });

  socket.on("send_message", async (payload, cb) => {
    const userId = socketUser.get(socket.id);
    if (!userId) return cb?.({ ok: false, error: "Not registered." });
    if (!allow(msgBucket, userId, 25, 10_000)) return cb?.({ ok: false, error: "You are sending too fast." });

    try {
      const { chat_id, text } = payload || {};
      const clean = sanitizeText(text);
      if (!chat_id || !clean) return cb?.({ ok: false, error: "Empty message." });

      const cRes = await pool.query("SELECT * FROM chats WHERE id=$1 AND ended_at IS NULL", [chat_id]);
      const chat = cRes.rows[0];
      if (!chat) return cb?.({ ok: false, error: "Chat not found." });
      if (chat.user1_id !== userId && chat.user2_id !== userId) return cb?.({ ok: false, error: "Not your chat." });

      const uRes = await pool.query("SELECT age_group FROM users WHERE id=$1", [userId]);
      const isTeen = uRes.rows[0]?.age_group === "teen";

      if (isTeen && violatesTeenSafety(clean)) return cb?.({ ok: false, error: "Message blocked for safety (no contact info)." });
      if (!isTeen && violatesGeneralSafety(clean)) return cb?.({ ok: false, error: "Message blocked (no phone numbers)." });

      await pool.query("INSERT INTO messages(id, chat_id, sender_id, text) VALUES($1,$2,$3,$4)", [uuid(), chat_id, userId, clean]);

      io.to(chat_id).emit("message", { chat_id, sender_id: userId, text: clean, created_at: new Date().toISOString() });
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "Send failed." });
    }
  });

  socket.on("end_chat", async ({ chat_id }, cb) => {
    const userId = socketUser.get(socket.id);
    if (!userId) return cb?.({ ok: false, error: "Not registered." });
    try {
      await pool.query("UPDATE chats SET ended_at=now() WHERE id=$1 AND ended_at IS NULL AND (user1_id=$2 OR user2_id=$2)", [chat_id, userId]);
      io.to(chat_id).emit("chat_ended", { chat_id });
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "Failed to end chat." });
    }
  });

  socket.on("block_user", async ({ blocked_id }, cb) => {
    const userId = socketUser.get(socket.id);
    if (!userId) return cb?.({ ok: false, error: "Not registered." });
    if (!blocked_id) return cb?.({ ok: false, error: "Missing blocked_id." });
    try {
      await pool.query("INSERT INTO blocks(blocker_id, blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [userId, blocked_id]);
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "Failed to block." });
    }
  });

  socket.on("report_user", async ({ reported_id, chat_id, reason }, cb) => {
    const userId = socketUser.get(socket.id);
    if (!userId) return cb?.({ ok: false, error: "Not registered." });
    if (!reported_id) return cb?.({ ok: false, error: "Missing reported_id." });
    try {
      const r = sanitizeText(reason || "No reason");
      await pool.query("INSERT INTO reports(id, reporter_id, reported_id, chat_id, reason) VALUES($1,$2,$3,$4,$5)", [uuid(), userId, reported_id, chat_id || null, r]);
      cb?.({ ok: true });
    } catch {
      cb?.({ ok: false, error: "Failed to report." });
    }
  });

  socket.on("disconnect", async () => {
    const userId = socketUser.get(socket.id);
    socketUser.delete(socket.id);
    if (userId) {
      userSocket.delete(userId);
      await pool.query("UPDATE users SET last_active=now() WHERE id=$1", [userId]).catch(()=>{});
    }
  });
});

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, () => console.log(`Server on http://localhost:${port}`));
