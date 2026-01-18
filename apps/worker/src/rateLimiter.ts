type DomainState = {
  chain: Promise<void>;
  lastTime: number;
};

const states = new Map<string, DomainState>();

export async function rateLimitDomain(domainKey: string, minDelayMs: number, jitterMs = 200) {
  const state = states.get(domainKey) || { chain: Promise.resolve(), lastTime: 0 };

  state.chain = state.chain.then(async () => {
    const wait = Math.max(0, minDelayMs - (Date.now() - state.lastTime));
    if (wait) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    state.lastTime = Date.now();
  });

  states.set(domainKey, state);
  await state.chain;

  if (jitterMs > 0) {
    const jitter = Math.floor(Math.random() * jitterMs);
    if (jitter) {
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }
}
