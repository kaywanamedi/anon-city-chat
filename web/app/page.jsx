"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "../lib/socket";
import { getCoords, coordsToCity } from "../lib/geo";
import { getOrCreateUserId } from "../lib/session";
import { wakeServer } from "../lib/wake";
import Loader from "./shared/Loader";

const genders = [
  { v: "male", t: "Male" },
  { v: "female", t: "Female" },
  { v: "nonbinary", t: "Non-binary" },
  { v: "prefer_not_say", t: "Prefer not to say" },
];

export default function Home() {
  const router = useRouter();
  const socket = getSocket();
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  const [userId, setUserId] = useState("");

  const [city, setCity] = useState("");
  const [age, setAge] = useState(18);
  const [gender, setGender] = useState("prefer_not_say");

  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(30);
  const [prefGender, setPrefGender] = useState("any");

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setUserId(getOrCreateUserId());
  }, []);

  async function detectCity() {
    setError("");
    setStatus("Detecting your city…");
    try {
      const { lat, lng } = await getCoords();
      setStatus("Confirming city…");
      const c = await coordsToCity(lat, lng);
      setCity(c);
      setStatus(`City detected: ${c}`);
    } catch (e) {
      setStatus("");
      setError(
        `City detection failed: ${e?.message || "Unknown error"}. You can type your city manually.`
      );
    }
  }

  async function startMatch() {
    setError("");
    setStatus("");

    if (!city.trim()) return setError("City is required.");
    const a = Number(age);
    if (!Number.isFinite(a) || a < 15) return setError("Age must be 15+.");
    if (Number(minAge) > Number(maxAge)) return setError("Min age must be ≤ Max age.");

    setBusy(true);
    setSearching(true);

    // Wake backend (helps with free-tier sleep)
    const ok = await wakeServer(baseUrl, 8);
    if (!ok) {
      setBusy(false);
      setSearching(false);
      return setError("Server is taking too long to wake. Try again in 15 seconds.");
    }

    setStatus("Registering…");
    socket.emit("register", { userId, city, age: a, gender }, (res) => {
      if (!res?.ok) {
        setBusy(false);
        setSearching(false);
        setStatus("");
        return setError(res?.error || "Register failed.");
      }

      if (res.age_group === "teen") {
        if (Number(minAge) < 15) setMinAge(15);
        if (Number(maxAge) > 17) setMaxAge(17);
      } else {
        if (Number(minAge) < 18) setMinAge(18);
      }

      setStatus("Searching…");
      socket.emit(
        "find_match",
        { min_age: Number(minAge), max_age: Number(maxAge), preferred_gender: prefGender },
        (m) => {
          if (!m?.ok) {
            setBusy(false);
            setSearching(false);
            setStatus("");
            return setError(m?.error || "Match failed.");
          }
          if (m.status === "waiting") {
            setStatus("Waiting for someone in your city…");
            setBusy(false);     // keep UI usable while waiting
            setSearching(true); // still searching
          }
        }
      );
    });
  }

  useEffect(() => {
    const handler = ({ chat_id, partner_id }) => {
      setSearching(false);
      setBusy(false);
      localStorage.setItem("chat_id", chat_id);
      localStorage.setItem("partner_id", partner_id || "");
      router.push("/chat");
    };
    socket.on("match_found", handler);
    return () => socket.off("match_found", handler);
  }, [router, socket]);

  return (
    <>
      {busy && <Loader title="Starting…" subtitle="Waking the server + searching for a match." />}

      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>Anon City Chat</h1>
            <div className="kicker">Neon • Minimal • Luxury • Gamer • Apple-clean</div>
          </div>
        </div>
        <div className="badge">15+ • No accounts • Text only</div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Get started</h2>
          <div className="kicker">
            We only use your location to detect your <b>city</b>. We never show distance or exact location.
          </div>

          <div className="pillRow">
            <div className="pill pillGlow">City-only matching</div>
            <div className="pill">No images/files</div>
            <div className="pill">Filters</div>
            <div className="pill">Block + Report</div>
          </div>

          <div className="glowLine" />
          <div className="hr" />

          <label>City</label>
          <div className="split">
            <button className="btn" onClick={detectCity}>Detect city</button>
            <button className="btn btn2" onClick={() => setCity("")}>Clear</button>
          </div>

          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Type city (fallback)"
            style={{ marginTop: 10 }}
          />
          <div className="meta">{city ? `Matching inside: ${city}` : "Detect or type your city"}</div>

          <div className="row">
            <div className="col">
              <label>Age (15+)</label>
              <input
                className="input"
                type="number"
                min={15}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
              <div className="meta">15–17 only match 15–17 • 18+ only match 18+</div>
            </div>
            <div className="col">
              <label>Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                {genders.map((g) => (
                  <option key={g.v} value={g.v}>{g.t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="hr" />

          <h2>Filters</h2>
          <div className="row">
            <div className="col">
              <label>Preferred gender</label>
              <select value={prefGender} onChange={(e) => setPrefGender(e.target.value)}>
                <option value="any">Any</option>
                {genders.map((g) => (
                  <option key={g.v} value={g.v}>{g.t}</option>
                ))}
              </select>
            </div>
            <div className="col">
              <label>Min age</label>
              <input
                className="input"
                type="number"
                min={15}
                max={99}
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
              />
            </div>
            <div className="col">
              <label>Max age</label>
              <input
                className="input"
                type="number"
                min={15}
                max={99}
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={startMatch} disabled={!city.trim()}>
              Find someone
            </button>
          </div>

          {searching && (
            <div style={{ marginTop: 10 }}>
              <button
                className="btn btn2"
                onClick={() => {
                  setSearching(false);
                  setStatus("");
                  setError("");
                }}
              >
                Cancel search
              </button>
            </div>
          )}

          {status && <div className="success">{status}</div>}
          {error && <div className="error">{error}</div>}

          <div className="hr" />

          <div className="notice">
            <b>Legal:</b> <a href="/legal/terms">Terms</a> • <a href="/legal/privacy">Privacy</a> •{" "}
            <a href="/legal/safety">Safety</a>
          </div>
        </div>

        <div className="card">
          <h2>Rules that keep it fun</h2>
          <div className="notice" style={{ marginTop: 10 }}>
            <b>Text-only.</b> No images, no files.<br/><br/>
            <b>City-only.</b> No distance, no exact location.<br/><br/>
            <b>Groups.</b> 15–17 match 15–17 • 18+ match 18+.<br/><br/>
            <b>Teen safety.</b> Contact-sharing is blocked for teens.
          </div>

          <div className="hr" />

          <h2>Free publishing</h2>
          <div className="kicker">
            Deploy web on Vercel, backend on Render, database on Neon — all free tiers.
          </div>
        </div>
      </div>
    </>
  );
}
