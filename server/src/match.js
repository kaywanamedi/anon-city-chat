import { pool } from "./db.js";
import { v4 as uuid } from "uuid";

function genderOk(preferred, userGender) {
  return preferred === "any" || preferred === userGender;
}
function inRange(min, max, age) {
  return age >= min && age <= max;
}

export async function tryMatchFor(userId) {
  const uRes = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
  const me = uRes.rows[0];
  if (!me) throw new Error("User not registered");

  const rRes = await pool.query(
    "SELECT * FROM match_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  const myReq = rRes.rows[0];
  if (!myReq) return null;

  const cRes = await pool.query(
    `
    SELECT mr.*, u.age as u_age, u.gender as u_gender
    FROM match_requests mr
    JOIN users u ON u.id = mr.user_id
    WHERE mr.city=$1 AND mr.age_group=$2 AND mr.user_id<>$3
    ORDER BY mr.created_at ASC
    LIMIT 60
    `,
    [me.city, me.age_group, userId]
  );

  for (const cand of cRes.rows) {
    const bRes = await pool.query(
      `SELECT 1 FROM blocks
       WHERE (blocker_id=$1 AND blocked_id=$2)
          OR (blocker_id=$2 AND blocked_id=$1)
       LIMIT 1`,
      [userId, cand.user_id]
    );
    if (bRes.rows.length) continue;

    const meAccepts =
      inRange(myReq.min_age, myReq.max_age, cand.u_age) &&
      genderOk(myReq.preferred_gender, cand.u_gender);
    if (!meAccepts) continue;

    const candAccepts =
      inRange(cand.min_age, cand.max_age, me.age) &&
      genderOk(cand.preferred_gender, me.gender);
    if (!candAccepts) continue;

    const chatId = uuid();

    await pool.query("BEGIN");
    try {
      const still = await pool.query("SELECT 1 FROM match_requests WHERE id=$1 FOR UPDATE", [cand.id]);
      if (!still.rows.length) {
        await pool.query("ROLLBACK");
        continue;
      }

      await pool.query(
        "INSERT INTO chats(id, user1_id, user2_id) VALUES($1,$2,$3)",
        [chatId, userId, cand.user_id]
      );
      await pool.query("DELETE FROM match_requests WHERE user_id IN ($1,$2)", [userId, cand.user_id]);

      await pool.query("COMMIT");
      return { chatId, partnerId: cand.user_id };
    } catch {
      await pool.query("ROLLBACK");
      continue;
    }
  }

  return null;
}
