export default function TermsPage() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="kicker">Last updated: {new Date().toISOString().slice(0,10)}</p>
      <div className="hr" />
      <p className="kicker">
        This is a starter Terms of Use template. It is not legal advice.
      </p>

      <h2>1) Who can use the service</h2>
      <p className="kicker">
        You must be at least <b>15 years old</b>. Users aged 15–17 are matched only with users aged 15–17.
        Users 18+ are matched only with users 18+.
      </p>

      <h2>2) Anonymous use</h2>
      <p className="kicker">
        This service does not require accounts. You are responsible for what you share. Do not share personal
        information (phone, address, school, social handles), especially if you are 15–17.
      </p>

      <h2>3) Prohibited behavior</h2>
      <ul className="kicker">
        <li>Harassment, threats, hate speech, sexual content involving minors, or illegal content.</li>
        <li>Attempting to identify, locate, or meet users offline.</li>
        <li>Spam, scams, or requests for money.</li>
      </ul>

      <h2>4) Moderation</h2>
      <p className="kicker">
        Users can report and block others. We may remove access for abuse and cooperate with lawful requests where required.
      </p>

      <h2>5) Disclaimer</h2>
      <p className="kicker">
        The service is provided “as is”. Use at your own risk.
      </p>

      <div className="hr" />
      <a className="btn btn2" href="/">Back home</a>
    </>
  );
}
