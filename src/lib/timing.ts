// Temporary diagnostic instrumentation for the voice-feedback pipeline latency
// investigation. Structured, greppable console output (works in both `npm run
// dev` and Vercel's function logs) — not wired to any APM, deliberately simple
// since this is a one-off profiling pass, not permanent infrastructure.
export async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    console.log(`[timing] ${label} ${Date.now() - start}ms`);
  }
}

export function mark(label: string, extra?: Record<string, unknown>) {
  console.log(`[timing] ${label}${extra ? " " + JSON.stringify(extra) : ""}`);
}
