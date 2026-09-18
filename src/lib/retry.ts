export async function withRetry<T>(fn: () => Promise<T>, attempts = 4, baseDelayMs = 1000): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const transient = /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|overloaded|timeout/i.test(message);
      if (!transient || i === attempts - 1) throw error;
      const backoff = baseDelayMs * 2 ** i;
      console.log(`[timing] withRetry.backoff attempt=${i + 1} waitMs=${backoff} reason="${message.slice(0, 80)}"`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError;
}
