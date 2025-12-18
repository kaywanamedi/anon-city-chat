import "./globals.css";
import Analytics from "./shared/Analytics";

export const metadata = {
  title: "Anon City Chat",
  description: "Anonymous city-based 1–1 chat (text-only).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
