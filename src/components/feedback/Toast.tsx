import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';
export type Tell = (message: string, kind?: ToastKind) => void;

export type ToastNotice = {
  id: number;
  message: string;
  kind: ToastKind;
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const labels = {
  success: 'Success',
  error: 'Something needs attention',
  warning: 'Heads up',
  info: 'Encore update',
};

export function Toast({ notice, onDismiss }: { notice: ToastNotice; onDismiss: () => void }) {
  const Icon = icons[notice.kind];
  const urgent = notice.kind === 'error' || notice.kind === 'warning';

  return (
    <div
      className={`toast toast-${notice.kind}`}
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
    >
      <span className="toast-icon" aria-hidden="true">
        <Icon size={19} strokeWidth={2.2} />
      </span>
      <div className="toast-copy">
        <strong>{labels[notice.kind]}</strong>
        <span>{notice.message}</span>
      </div>
      <button type="button" className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
