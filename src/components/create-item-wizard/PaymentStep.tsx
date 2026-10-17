import { useState } from 'react';
import { WalletCards } from 'lucide-react';
import { connectPhantom } from '../../lib/phantom';
import type { Tell } from '../feedback/Toast';
import type { WizardStepProps } from './types';

export function PaymentStep({
  item,
  field,
  tell,
}: Pick<WizardStepProps, 'item' | 'field'> & { tell: Tell }) {
  const [connecting, setConnecting] = useState(false);
  return (
    <>
      <p className="hint">
        Test tokens only. No real CAD payment or currency conversion. The buyer approves payment in
        their wallet after you approve a reservation.
      </p>
      <label>
        Receiving wallet address
        <input
          value={item.wallet}
          onChange={(event) => field('wallet', event.target.value)}
          maxLength={50}
        />
      </label>
      <button
        className="button secondary"
        type="button"
        disabled={connecting}
        onClick={async () => {
          setConnecting(true);
          try {
            field('wallet', await connectPhantom());
          } catch (error: any) {
            tell(error.message, 'error');
          } finally {
            setConnecting(false);
          }
        }}
      >
        <WalletCards size={16} /> {connecting ? 'Opening Phantom…' : 'Use Phantom wallet'}
      </button>
      <label>
        Test SOL per item
        <input
          type="number"
          min="0"
          max="10"
          step="0.000000001"
          value={item.sol_lamports / 1_000_000_000}
          onChange={(event) =>
            field('sol_lamports', Math.round(Number(event.target.value) * 1_000_000_000))
          }
        />
      </label>
    </>
  );
}
