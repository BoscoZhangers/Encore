import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react';
import type { PhotoDraftSelection } from './PhotoDraft';
import type { Tell } from '../feedback/Toast';
import { CreateItemStep } from './CreateItemStep';
import { SnapshotStep } from './SnapshotStep';
import { CREATE_ITEM_STEPS } from './steps';
import type { ListingDraft } from './types';

export function CreateItemWizard({
  item,
  setItem,
  busy,
  tell,
  editing,
  onSave,
  onDelete,
}: {
  item: ListingDraft;
  setItem: Dispatch<SetStateAction<ListingDraft>>;
  busy: boolean;
  tell: Tell;
  editing: boolean;
  onSave: (skipPayment: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [photoQuestions, setPhotoQuestions] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [validationVisible, setValidationVisible] = useState(false);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [shaking, setShaking] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalStep = CREATE_ITEM_STEPS.length - 1;
  const field = (name: string, value: any) => setItem((current) => ({ ...current, [name]: value }));

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    },
    [],
  );

  function showValidationError(message: string, missingPhoto = false) {
    setValidationVisible(true);
    setPhotoRequired(missingPhoto);
    tell(message, 'error');
    setShaking(false);
    requestAnimationFrame(() => {
      setShaking(true);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShaking(false), 520);
    });
  }

  function changeStep(next: number) {
    setValidationVisible(false);
    setPhotoRequired(false);
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }

  function selectPhoto(photoId: string) {
    setItem((current) => ({
      ...current,
      photos: [
        photoId,
        ...current.photos.filter((candidate: string) => candidate !== photoId),
      ].slice(0, 5),
    }));
  }

  function applyPhotoDraft(selection: PhotoDraftSelection) {
    const { photoId, questions, ...selected } = selection;
    setItem((current) => ({
      ...current,
      ...selected,
      photos: [
        photoId,
        ...current.photos.filter((candidate: string) => candidate !== photoId),
      ].slice(0, 5),
    }));
    setPhotoQuestions(questions);
    changeStep(1);
  }

  function next() {
    if (photoBusy || busy) return;
    if (step === 0 && !item.photos.length) {
      showValidationError('Take or upload a photo before continuing.', true);
      return;
    }
    if (step === 1 && item.floor > item.price) {
      showValidationError('Your private minimum cannot exceed your posted price.');
      return;
    }
    if (step > 0 && !form.current?.checkValidity()) {
      showValidationError('Complete the highlighted fields before continuing.');
      requestAnimationFrame(() =>
        (form.current?.querySelector(':invalid') as HTMLElement | null)?.focus(),
      );
      return;
    }
    changeStep(Math.min(step + 1, finalStep));
  }

  async function finish(skipPayment: boolean) {
    if (busy) return;
    if (!skipPayment && !form.current?.checkValidity()) {
      showValidationError('Complete the highlighted fields before publishing.');
      requestAnimationFrame(() =>
        (form.current?.querySelector(':invalid') as HTMLElement | null)?.focus(),
      );
      return;
    }
    if (!item.photos.length) {
      changeStep(0);
      requestAnimationFrame(() => showValidationError('Add a photo before saving.', true));
      return;
    }
    await onSave(skipPayment);
  }

  return (
    <section
      className={`photo-draft listing-wizard${validationVisible ? ' validation-visible' : ''}${photoRequired ? ' photo-required' : ''}${shaking ? ' wizard-shake' : ''}`}
      aria-labelledby="wizard-title"
    >
      <div className="wizard-heading">
        <div>
          <p className="eyebrow">
            Step {step + 1} of {CREATE_ITEM_STEPS.length}
            {step === finalStep ? ' · Optional' : ''}
          </p>
          <h2 id="wizard-title" ref={heading} tabIndex={-1}>
            {CREATE_ITEM_STEPS[step].title}
          </h2>
          <p className="muted">{CREATE_ITEM_STEPS[step].description}</p>
        </div>
        <ol className="wizard-progress" aria-label="Listing creation steps">
          {CREATE_ITEM_STEPS.map(({ label }, index) => (
            <li
              key={label}
              className={index === step ? 'current' : index < step ? 'complete' : ''}
              aria-current={index === step ? 'step' : undefined}
            >
              <span>{index < step ? <Check size={14} /> : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </div>
      <SnapshotStep
        active={step === 0}
        item={item}
        field={field}
        busy={busy}
        photoBusy={photoBusy}
        onApply={applyPhotoDraft}
        onPhotoSelected={selectPhoto}
        onBusyChange={setPhotoBusy}
      />
      <form
        ref={form}
        noValidate
        onInvalid={(event) => event.preventDefault()}
        onSubmit={(event) => {
          event.preventDefault();
          if (step === finalStep) void finish(false);
          else next();
        }}
      >
        {step > 0 && (
          <div className="wizard-fields">
            <CreateItemStep
              step={step}
              item={item}
              field={field}
              setItem={setItem}
              photoQuestions={photoQuestions}
              setPhotoQuestions={setPhotoQuestions}
              tell={tell}
            />
            {step === finalStep && (
              <label className="wizard-visibility">
                Listing visibility
                <select
                  value={item.status}
                  onChange={(event) => field('status', event.target.value)}
                >
                  <option value="draft">Draft · only you</option>
                  <option value="published">Published · anyone can browse</option>
                  <option value="paused">Paused · hidden from buyers</option>
                </select>
              </label>
            )}
          </div>
        )}
        <div className="wizard-bottom">
          <div className="wizard-actions">
            <button
              type="button"
              className="button secondary"
              disabled={step === 0 || busy || photoBusy}
              onClick={() => changeStep(step - 1)}
            >
              <ArrowLeft size={16} /> Previous
            </button>
            {step < finalStep ? (
              <button type="submit" className="button" disabled={busy || photoBusy}>
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <div className="wizard-finish">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void finish(true)}
                >
                  Finish without Solana
                </button>
                <button type="submit" className="button" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                  {item.status === 'published' ? 'Publish listing' : 'Save listing'}
                </button>
              </div>
            )}
          </div>
          {editing && (
            <button
              type="button"
              className="text-button danger"
              disabled={busy}
              onClick={() => void onDelete()}
            >
              Delete listing
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
