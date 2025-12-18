"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "../../lib/socket";
import Loader from "../shared/Loader";
import { wakeServer } from "../../lib/wake";

export default function ChatPage() {
  const router = useRouter();
  const socket = useMemo(() => getSocket(), []);
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const boxRef = useRef(null);

  const [chatId, setChatId] = useState("");
  const [userId, setUserId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const cid = localStorage.getItem("chat_id");
    const uid = localStorage.getItem("anon_user_id");
    const pid = localStorage.getItem("partner_id") || "";
    if (!cid || !uid) return router.push("/");
    setChatId(cid);
    setUserId(uid);
    setPartnerId(pid);
  }, [router]);

  useEffect(() => {
    const onMsg = (m) => {
      if (m.chat_id !== chatId) return;
      setMessages((p) => [...p, m]);
    };
    const onEnded = (p) => {
      if (p?.chat_id !== chatId) return;
      setStatus("Chat ended.");
    };

    socket.on("message", onMsg);
    socket.on("chat_ended", onEnded);
    return () => {
      socket.off("message", onMsg);
      socket.off("chat_ended", onEnded);
    };
  }, [socket, chatId]);

  useEffect(() => {
    if (!boxRef.current) return;
    boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    const msg = text.trim();
    if (!msg) return;

    setBusy(true);
    await wakeServer(baseUrl, 4); // quick check
    socket.emit("send_message", { chat_id: chatId, text: msg }, (res) => {
      setBusy(false);
      if (!res?.ok) setStatus(res?.error || "Send failed.");
      else setStatus("");
    });
    setText("");
  }

  function endChat(goHome = true) {
    socket.emit("end_chat", { chat_id: chatId }, () => {});
    localStorage.removeItem("chat_id");
    localStorage.removeItem("partner_id");
    if (goHome) router.push("/");
  }

  function nextChat() {
    endChat(true);
  }

  function block() {
    if (!partnerId) return;
    socket.emit("block_user", { blocked_id: partnerId }, (res) => {
      if (!res?.ok) setStatus(res?.error || "Block failed.");
      else {
        setStatus("Blocked. You won’t be matched again.");
        nextChat();
      }
    });
  }

  function report() {
    if (!partnerId) return;
    const reason = prompt("Why are you reporting? (short)") || "No reason";
    socket.emit("report_user", { reported_id: partnerId, chat_id: chatId, reason }, (res) => {
      if (!res?.ok) setStatus(res?.error || "Report failed.");
      else setStatus("Reported. Thanks.");
    });
  }

  return (
    <>
      {busy && <Loader title="Sending…" subtitle="Just a moment." />}

      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>Chat</h1>
            <div className="kicker">Text-only • Don’t share personal info</div>
          </div>
        </div>

        <div className="split" style={{ width: 420 }}>
          <button className="btn btn2" onClick={report} disabled={!partnerId}>Report</button>
          <button className="btn btn2" onClick={block} disabled={!partnerId}>Block</button>
          <button className="btn" onClick={nextChat}>Next</button>
        </div>
      </div>

      <div className="card">
        <div ref={boxRef} className="chatBox">
          {messages.length === 0 && <div className="notice">Say hi 👋</div>}

          {messages.map((m, i) => {
            const mine = m.sender_id === userId;
            return (
              <div key={i} className={"bubble " + (mine ? "me" : "them")}>
                {m.text}
                <div className="meta">{mine ? "You" : "Them"}</div>
              </div>
            );
          })}
        </div>

        <div className="row" style={{ marginTop: 12, alignItems: "flex-end" }}>
          <div className="col" style={{ flex: "1 1 520px" }}>
            <label>Your message</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type something…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="meta">Enter = send • Shift+Enter = new line</div>
          </div>
          <div className="col" style={{ flex: "0 0 180px" }}>
            <label>&nbsp;</label>
            <button className="btn" onClick={send} disabled={!chatId}>Send</button>
          </div>
        </div>

        {status && <div className="error">{status}</div>}

        <div className="hr" />

        <div className="notice">
          <b>Legal:</b> <a href="/legal/terms">Terms</a> • <a href="/legal/privacy">Privacy</a> • <a href="/legal/safety">Safety</a>
        </div>

        <div className="hr" />

        <button className="btn btn2" onClick={() => endChat(true)}>End chat & go home</button>
      </div>
    </>
  );
}
