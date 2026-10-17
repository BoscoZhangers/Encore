import { useState } from 'react';
import { ExternalLink, ShieldCheck, Unplug, WalletCards } from 'lucide-react';
import { api } from '../api';
import { useData } from '../hooks/useData';
import { connectPhantom } from '../lib/phantom';
import { ErrorBox, Spinner } from '../components/ui';
import type { Tell } from '../components/feedback/Toast';

function compact(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export function Wallet({ tell }: { tell: Tell }) {
  const { data, error, reload } = useData('/account/wallet');
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      const wallet = await connectPhantom();
      await api('/account/wallet', {
        method: 'PATCH',
        body: JSON.stringify({ wallet }),
      });
      await reload();
      tell('Phantom wallet saved for new listings.');
    } catch (connectionError: any) {
      tell(connectionError.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page wallet-page">
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <WalletCards size={14} /> Seller payments
          </div>
          <h1>Your Solana wallet</h1>
          <p className="muted">Connect once, then use the address on future listings.</p>
        </div>
      </div>
      <ErrorBox error={error} />
      {!data ? (
        <Spinner />
      ) : (
        <section className="panel wallet-panel">
          <div className="wallet-panel-icon">
            <WalletCards size={28} />
          </div>
          <div className="wallet-panel-copy">
            <span className="eyebrow">Phantom · Solana devnet</span>
            <h2>{data.wallet ? 'Wallet connected' : 'Connect your receiving wallet'}</h2>
            <p>
              Encore saves only your public address. Phantom keeps your keys and asks you to approve
              every wallet action.
            </p>
          </div>
          {data.wallet && (
            <div className="wallet-address">
              <span>Saved address</span>
              <strong title={data.wallet}>{compact(data.wallet)}</strong>
              <button type="button" onClick={() => navigator.clipboard.writeText(data.wallet)}>
                Copy
              </button>
            </div>
          )}
          <div className="wallet-actions">
            <button className="button" type="button" disabled={busy} onClick={() => void connect()}>
              <WalletCards size={17} />{' '}
              {busy ? 'Opening Phantom…' : data.wallet ? 'Change wallet' : 'Connect Phantom'}
            </button>
            {!data.wallet && (
              <a
                className="button secondary"
                href="https://phantom.com/download"
                target="_blank"
                rel="noreferrer"
              >
                Get Phantom <ExternalLink size={16} />
              </a>
            )}
            {data.wallet && (
              <button
                className="button secondary"
                type="button"
                onClick={async () => {
                  await api('/account/wallet', { method: 'DELETE' });
                  await reload();
                  tell('Wallet removed from Encore.', 'info');
                }}
              >
                <Unplug size={16} /> Remove from Encore
              </button>
            )}
          </div>
          <div className="wallet-safety">
            <ShieldCheck size={18} />
            <p>
              Demo payments use test SOL on devnet. Encore will never ask for your password, private
              key, or recovery phrase.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
