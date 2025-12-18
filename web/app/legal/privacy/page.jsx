export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="kicker">Last updated: {new Date().toISOString().slice(0,10)}</p>
      <div className="hr" />
      <p className="kicker">
        This is a starter Privacy Policy template. It is not legal advice.
      </p>

      <h2>What we collect</h2>
      <ul className="kicker">
        <li><b>City</b> (derived from location). We do not show or store exact GPS coordinates.</li>
        <li><b>Age</b> and <b>gender</b> for matching.</li>
        <li>Chat messages (text-only) and basic abuse reports/blocks.</li>
      </ul>

      <h2>How we use data</h2>
      <ul className="kicker">
        <li>To match users within the same city and age group.</li>
        <li>To provide chat and safety features (report/block).</li>
        <li>To keep the service reliable and prevent abuse.</li>
      </ul>

      <h2>Sharing</h2>
      <p className="kicker">
        We do not sell personal data. Data may be shared if required by law or to respond to safety issues.
      </p>

      <h2>Retention</h2>
      <p className="kicker">
        We store chat messages and safety logs for a limited time for abuse handling (implementation-dependent).
      </p>

      <h2>Analytics</h2>
      <p className="kicker">
        Analytics may be enabled using a privacy-friendly configuration (optional). If enabled, it uses aggregated usage stats.
      </p>

      <div className="hr" />
      <a className="btn btn2" href="/">Back home</a>
    </>
  );
}
