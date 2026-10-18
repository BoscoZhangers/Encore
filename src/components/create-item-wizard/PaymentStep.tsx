import { useState } from 'react';
import { WalletCards } from 'lucide-react';
import { connectPhantom } from '../../lib/phantom';
import type { Tell } from '../feedback/Toast';
import { EditableNumberInput } from './EditableNumberInput';
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
        <EditableNumberInput
          min={item.sol_lamports > 0 ? 0.01 : 0}
          max="10"
          step="0.01"
          value={item.sol_lamports / 1_000_000_000}
          decimalPlaces={2}
          onValueChange={(amount) => field('sol_lamports', Math.round(amount * 1_000_000_000))}
        />
      </label>
    </>
  );
}
