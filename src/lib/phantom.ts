type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey?: { toBase58(): string } }>;
};

export function phantomProvider(): PhantomProvider | null {
  const browser = window as typeof window & {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  };
  const provider = browser.phantom?.solana || browser.solana;
  return provider?.isPhantom ? provider : null;
}

export async function connectPhantom() {
  const provider = phantomProvider();
  if (!provider)
    throw new Error('Open Encore in a browser with Phantom installed, then try again.');
  const connection = await provider.connect();
  const publicKey = connection.publicKey || provider.publicKey;
  if (!publicKey) throw new Error('Phantom did not share a wallet address.');
  return publicKey.toBase58();
}
