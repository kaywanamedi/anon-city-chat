export async function wakeServer(baseUrl, attempts = 8) {
  // Exponential-ish backoff: 0.5s, 1s, 2s, 3s, 5s...
  const waits = [500, 1000, 2000, 3000, 5000, 7000, 9000, 12000];
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(`${baseUrl}/health`, { cache: "no-store" });
      if (r.ok) return true;
    } catch {}
    await new Promise((res) => setTimeout(res, waits[Math.min(i, waits.length - 1)]));
  }
  return false;
}
