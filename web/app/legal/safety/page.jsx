export default function SafetyPage() {
  return (
    <>
      <h1>Safety Notice</h1>
      <p className="kicker">Last updated: {new Date().toISOString().slice(0,10)}</p>
      <div className="hr" />

      <h2>If you are 15–17</h2>
      <ul className="kicker">
        <li>Do not share your phone number, school, address, or social media.</li>
        <li>Never meet someone from this chat in real life.</li>
        <li>Use the <b>Report</b> and <b>Block</b> buttons immediately if anything feels wrong.</li>
      </ul>

      <h2>For everyone</h2>
      <ul className="kicker">
        <li>City-only matching — no distance or exact location is shown.</li>
        <li>Text-only — no images or files.</li>
        <li>Abuse is not allowed. Reports may be reviewed.</li>
      </ul>

      <div className="hr" />
      <a className="btn btn2" href="/">Back home</a>
    </>
  );
}
