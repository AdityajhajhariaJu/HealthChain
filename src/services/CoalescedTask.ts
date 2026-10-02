/** Collapse event bursts into one scan, plus a fresh scan if changes arrive during it. */
export function createCoalescedTask(work: () => Promise<void>): () => Promise<void> {
  let requested = false;
  let running: Promise<void> | null = null;
  return () => {
    requested = true;
    if (!running) {
      running = Promise.resolve().then(async () => {
        try {
          while (requested) {
            requested = false;
            await work();
          }
        } finally {
          running = null;
        }
      });
    }
    return running;
  };
}
