import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

type EditableNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'onBlur'
> & {
  value: number;
  onValueChange: (value: number) => void;
  decimalPlaces?: number;
};

function formatValue(value: number, decimalPlaces?: number) {
  if (!Number.isFinite(value))
    return decimalPlaces === undefined ? '0' : (0).toFixed(decimalPlaces);
  return decimalPlaces === undefined ? String(value) : value.toFixed(decimalPlaces);
}

/**
 * A number field that can stay empty while the user is editing it. The value is
 * normalized only after focus leaves the field, avoiding a leading zero that is
 * difficult to replace on controlled number inputs.
 */
export function EditableNumberInput({
  value,
  onValueChange,
  decimalPlaces,
  onFocus,
  onWheel,
  ...inputProps
}: EditableNumberInputProps) {
  const [display, setDisplay] = useState(() => formatValue(value, decimalPlaces));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDisplay(formatValue(value, decimalPlaces));
  }, [decimalPlaces, value]);

  return (
    <input
      {...inputProps}
      type="number"
      value={display}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDisplay(next);
        if (next === '') return;

        const amount = Number(next);
        if (Number.isFinite(amount)) onValueChange(amount);
      }}
      onBlur={(event) => {
        focused.current = false;
        const amount = event.target.value === '' ? 0 : Number(event.target.value);
        const normalized = Number.isFinite(amount) ? amount : 0;
        onValueChange(normalized);
        setDisplay(formatValue(normalized, decimalPlaces));
      }}
      onWheel={(event) => {
        // Number inputs otherwise change accidentally while the page is scrolling.
        event.currentTarget.blur();
        onWheel?.(event);
      }}
    />
  );
}
