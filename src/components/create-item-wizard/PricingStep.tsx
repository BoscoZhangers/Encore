import { ShieldCheck } from 'lucide-react';
import { EditableNumberInput } from './EditableNumberInput';
import type { WizardStepProps } from './types';

function CurrencyInput({
  value,
  onChange,
  invalid,
}: {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
}) {
  return (
    <span className="currency-input">
      <span className="currency-prefix" aria-hidden="true">
        $
      </span>
      <EditableNumberInput
        min="1"
        step="1"
        value={value / 100}
        decimalPlaces={2}
        aria-invalid={invalid || undefined}
        onValueChange={(amount) => onChange(Math.round(amount * 100))}
        required
      />
    </span>
  );
}

export function PricingStep({ item, field }: Pick<WizardStepProps, 'item' | 'field'>) {
  return (
    <>
      <div className="two-fields">
        <label>
          Posted price · CAD
          <CurrencyInput value={item.price} onChange={(value) => field('price', value)} />
        </label>
        <label>
          Private minimum · CAD
          <CurrencyInput
            value={item.floor}
            invalid={item.floor > item.price}
            onChange={(value) => field('floor', value)}
          />
        </label>
      </div>
      <div className="info-note">
        <ShieldCheck size={18} />
        <p>
          Your minimum is private. The agent checks offers against it, and you approve each
          reservation.
        </p>
      </div>
    </>
  );
}
