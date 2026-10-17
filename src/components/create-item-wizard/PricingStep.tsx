import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
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
  const [display, setDisplay] = useState(value ? (value / 100).toFixed(2) : '');
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDisplay(value ? (value / 100).toFixed(2) : '');
  }, [value]);

  return (
    <span className="currency-input">
      <span className="currency-prefix" aria-hidden="true">
        $
      </span>
      <input
        type="number"
        min="1"
        step="0.01"
        value={display}
        aria-invalid={invalid || undefined}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDisplay(next);
          onChange(next === '' ? 0 : Math.round(Number(next) * 100));
        }}
        onBlur={(event) => {
          focused.current = false;
          const amount = Number(event.target.value);
          setDisplay(Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : '');
        }}
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
