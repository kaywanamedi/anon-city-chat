"use client";

export default function Loader({ title="Searching…", subtitle="Waking the server if needed." }) {
  return (
    <div className="overlay">
      <div className="overlayCard">
        <div className="spin" />
        <div style={{ fontWeight: 900, fontSize: 16, marginTop: 10 }}>{title}</div>
        <div className="meta" style={{ marginTop: 6 }}>{subtitle}</div>
      </div>
    </div>
  );
}
