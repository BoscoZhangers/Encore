import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  ArrowRight,
  Check,
  X,
  RotateCcw,
  ImagePlus,
  ShieldCheck,
  LoaderCircle,
  PencilLine,
} from 'lucide-react';
import { api, post } from '../../api';

type Draft = {
  mode: 'ai' | 'guided';
  title: string;
  description: string;
  category: string | null;
  observations: string[];
  questions: string[];
};

export type PhotoDraftSelection = {
  photoId: string;
  title?: string;
  description?: string;
  category?: string;
  questions: string[];
};

export default function PhotoDraft({
  onApply,
  hasDetails,
  photoCount,
  embedded = false,
  active = true,
  onPhotoSelected,
  onBusyChange,
}: {
  onApply: (value: PhotoDraftSelection) => void;
  hasDetails: boolean;
  photoCount: number;
  embedded?: boolean;
  active?: boolean;
  onPhotoSelected?: (id: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [photo, setPhoto] = useState('');
  useEffect(() => {
    if (!active) stopCamera();
  }, [active]);
  const [ai, setAi] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState('');
  useEffect(() => {
    onBusyChange?.(!!busy);
  }, [busy, onBusyChange]);
  const [error, setError] = useState('');
  const [camera, setCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [fields, setFields] = useState({ title: true, description: true, category: true });
  const [dragging, setDragging] = useState(false);
  const upload = useRef<HTMLInputElement>(null),
    nativeCamera = useRef<HTMLInputElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null),
    live = useRef(true),
    cameraTicket = useRef(0);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  function stopCamera() {
    cameraTicket.current++;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
    setCameraReady(false);
  }
  useEffect(() => {
    live.current = true;
    api('/photo-drafts/capabilities')
      .then((r) => {
        if (live.current) setAi(r.aiAvailable);
      })
      .catch(() => {
        if (live.current) setAi(false);
      });
    return () => {
      live.current = false;
      cameraTicket.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (camera && video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current
        .play()
        .catch(() => setError('Camera preview could not start. Choose a photo instead.'));
    }
  }, [camera]);
  useEffect(() => {
    if (draft) reviewHeading.current?.focus();
  }, [!!draft]);
  async function openCamera() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      nativeCamera.current?.click();
      return;
    }
    const ticket = ++cameraTicket.current;
    setBusy('Opening camera…');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
        audio: false,
      });
      if (!live.current || ticket !== cameraTicket.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      setCamera(true);
    } catch {
      if (live.current)
        setError('Camera access is unavailable. Use your device camera or upload a photo below.');
    } finally {
      if (live.current) setBusy('');
    }
  }

  async function selectFile(file?: File) {
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(
        'Choose a JPG, PNG, or WebP photo. If your phone uses HEIC, take a snapshot with the camera above.',
      );
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Choose a photo smaller than 8 MB.');
      return;
    }
    stopCamera();
    setBusy('Preparing your photo…');
    setError('');
    try {
      const body = new FormData();
      body.append('photo', file);
      const r = await api('/photos', { method: 'POST', body });
      if (live.current) {
        setPhoto(r.id);
        onPhotoSelected?.(r.id);
        setDraft(null);
        setReviewed(false);
      }
    } catch (e: any) {
      if (live.current) setError(e.message);
    } finally {
      if (live.current) setBusy('');
    }
  }

  async function capture() {
    const v = video.current;
    if (!v?.videoWidth || !cameraReady || busy) return;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    if (blob && live.current)
      await selectFile(new File([blob], 'encore-item.jpg', { type: 'image/jpeg' }));
  }
  async function generate(mode: 'ai' | 'guided') {
    setBusy(mode === 'ai' ? 'Looking at your item…' : 'Preparing your starter draft…');
    setError('');
    try {
      const r = await post('/photo-drafts', { photoId: photo, mode, name, notes });
      if (live.current) {
        setDraft(r.draft);
        setReviewed(false);
        setFields({ title: true, description: true, category: true });
      }
    } catch (e: any) {
      if (live.current) setError(e.message);
    } finally {
      if (live.current) setBusy('');
    }
  }
  function apply() {
    if (!draft || !reviewed || busy) return;
    onApply({
      photoId: photo,
      ...(fields.title ? { title: draft.title } : {}),
      ...(fields.description ? { description: draft.description } : {}),
      ...(fields.category && draft.category ? { category: draft.category } : {}),
      questions: draft.questions,
    });
    setDraft(null);
    setPhoto('');
    setName('');
    setNotes('');
    setReviewed(false);
  }
  const changeDraft = (field: 'title' | 'description' | 'category', value: string) => {
    setDraft((d) => (d ? { ...d, [field]: value } : null));
    setReviewed(false);
  };
  return (
    <section
      className={`photo-draft ${embedded ? 'photo-draft-embedded' : ''} ${draft ? 'is-review' : ''}`}
      aria-labelledby={embedded ? undefined : 'photo-draft-title'}
    >
      {!embedded && (
        <div className="photo-draft-intro">
          <div>
            <h2 id="photo-draft-title">Start with a snapshot.</h2>
          </div>
          <ol className="photo-steps" aria-label="Photo draft steps">
            {['Capture', 'Draft', 'Make it yours'].map((s, i) => {
              const step = draft ? 2 : photo ? 1 : 0;
              return (
                <li
                  key={s}
                  className={i === step ? 'current' : i < step ? 'complete' : ''}
                  aria-current={i === step ? 'step' : undefined}
                >
                  <span>{i < step ? <Check size={14} aria-hidden="true" /> : i + 1}</span>
                  {s}
                </li>
              );
            })}
          </ol>
        </div>
      )}
      <input
        ref={upload}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        disabled={!!busy}
        aria-label="Upload one item photo"
        onChange={(e) => {
          void selectFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={nativeCamera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        disabled={!!busy}
        aria-label="Take one item photo"
        onChange={(e) => {
          void selectFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="photo-draft-body">
        <div
          className={`photo-stage ${dragging ? 'dragging' : ''} ${photo || camera ? 'has-photo' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy && !camera) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (busy || camera) return;
            if (e.dataTransfer.files.length !== 1) {
              setError(
                'Choose one photo of one item. You can add more angles in the editor afterward.',
              );
              return;
            }
            void selectFile(e.dataTransfer.files[0]);
          }}
        >
          {camera ? (
            <>
              <video
                ref={video}
                autoPlay
                muted
                playsInline
                onLoadedData={() => setCameraReady(true)}
                aria-label="Live item camera preview"
              />
              <div className="viewfinder" />
              <span className="camera-hint">Center one item in the frame</span>
              <div className="camera-controls">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="camera-close"
                  aria-label="Close camera"
                >
                  <X size={20} />
                </button>
                <button
                  type="button"
                  className="shutter"
                  disabled={!cameraReady || !!busy}
                  onClick={capture}
                  aria-label="Capture item photo"
                >
                  <span />
                </button>
                <span className="camera-spacer" />
              </div>
            </>
          ) : photo ? (
            <>
              <img src={`/api/photos/${photo}`} alt="Your item, ready for a listing draft" />
              <span className="photo-ready">
                <Check size={13} /> Your photo
              </span>
              <button
                type="button"
                className="photo-retake"
                disabled={!!busy}
                onClick={() => {
                  setPhoto('');
                  setDraft(null);
                  setReviewed(false);
                  setError('');
                }}
              >
                <RotateCcw size={14} /> Change photo
              </button>
            </>
          ) : (
            <div className="photo-empty">
              <div className="snapshot-illustration" aria-hidden="true">
                <span className="snapshot-card back" />
                <span className="snapshot-card front">
                  <Camera size={45} strokeWidth={1.2} />
                  <span className="snapshot-glint">✦</span>
                </span>
              </div>
              <h3>A good photo does the talking.</h3>
              <p>One item. Natural light. A clear view.</p>
              <button type="button" className="button" onClick={openCamera} disabled={!!busy}>
                <Camera size={18} /> Take a photo
              </button>
              <button
                type="button"
                className="photo-upload-link"
                onClick={() => upload.current?.click()}
                disabled={!!busy}
              >
                <Upload size={15} /> Or upload a photo
              </button>
              <span className="photo-file-hint">
                Drop a photo here · JPG, PNG, WebP · up to 8 MB
              </span>
            </div>
          )}
          {busy && (
            <div className="photo-busy" role="status">
              <span className="photo-scanning" />
              <LoaderCircle size={25} className="spin" />
              <strong>{busy}</strong>
              <span>
                {busy.includes('Looking')
                  ? 'Finding visible details. Leaving the unknowns to you.'
                  : 'One good thing, one step closer.'}
              </span>
            </div>
          )}
        </div>
        <div className="photo-draft-content">
          {draft ? (
            <>
              <div className="draft-review-label">
                <Check size={15} />{' '}
                {draft.mode === 'ai'
                  ? 'AI suggestions · review before using'
                  : 'Starter draft · based on your notes'}
              </div>
              <h3 ref={reviewHeading} tabIndex={-1}>
                A first draft. Your final word.
              </h3>
              <p className="photo-support">
                {hasDetails
                  ? 'Selected fields replace the matching details below. Uncheck anything you want to keep.'
                  : 'Edit the wording and choose which details to bring into your listing.'}
              </p>
              <div className="draft-field">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={fields.title}
                    onChange={(e) => {
                      setFields({ ...fields, title: e.target.checked });
                      setReviewed(false);
                    }}
                  />{' '}
                  Use this title
                </label>
                <input
                  aria-label="Suggested item title"
                  value={draft.title}
                  maxLength={100}
                  onChange={(e) => changeDraft('title', e.target.value)}
                />
              </div>
              {draft.category && (
                <div className="draft-field">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={fields.category}
                      onChange={(e) => {
                        setFields({ ...fields, category: e.target.checked });
                        setReviewed(false);
                      }}
                    />{' '}
                    Use this category
                  </label>
                  <select
                    aria-label="Suggested category"
                    value={draft.category}
                    onChange={(e) => changeDraft('category', e.target.value)}
                  >
                    {['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports', 'Other'].map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </select>
                </div>
              )}
              <div className="draft-field">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={fields.description}
                    onChange={(e) => {
                      setFields({ ...fields, description: e.target.checked });
                      setReviewed(false);
                    }}
                  />{' '}
                  Use this description
                </label>
                <textarea
                  aria-label="Suggested description"
                  value={draft.description}
                  maxLength={2000}
                  onChange={(e) => changeDraft('description', e.target.value)}
                />
              </div>
              {!!draft.observations.length && (
                <details className="draft-observations">
                  <summary>Details to double-check</summary>
                  <ul>
                    {draft.observations.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="draft-questions">
                <strong>Only you can fill in the blanks.</strong>
                <ul>
                  {draft.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
              <label className="check-label draft-consent">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />{' '}
                I’ve checked the selected details and will confirm condition, price, and anything
                missing before publishing.
              </label>
              <button
                type="button"
                className="button full"
                disabled={
                  !reviewed ||
                  !!busy ||
                  (fields.title && draft.title.trim().length < 3) ||
                  (fields.description && draft.description.trim().length < 10) ||
                  photoCount >= 5
                }
                onClick={apply}
              >
                Use selected details <ArrowRight size={17} />
              </button>
              {photoCount >= 5 && (
                <p className="photo-support">
                  Remove a listing photo below first; a listing can hold five photos.
                </p>
              )}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setDraft(null);
                  setReviewed(false);
                }}
              >
                Back to photo details
              </button>
            </>
          ) : (
            <>
              <span className="photo-content-icon">
                <PencilLine size={24} />
              </span>
              <h3>
                {photo ? 'A little context goes a long way.' : 'From photo to “ready to sell.”'}
              </h3>
              <p className="photo-support">
                {photo
                  ? 'Add anything a photo can’t tell us. Leave out personal details.'
                  : 'Capture your item, review the suggested words, then set your price and pickup preferences.'}
              </p>
              {photo ? (
                <>
                  <label>
                    What is it? {ai && <span className="muted">(optional)</span>}
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. adjustable desk lamp"
                      disabled={!!busy}
                    />
                  </label>
                  <label>
                    Anything you know? <span className="muted">(optional)</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={1000}
                      placeholder="e.g. Bought last year. Small scratch on the base. Bulb included."
                      disabled={!!busy}
                    />
                  </label>
                  {ai ? (
                    <>
                      <button
                        type="button"
                        className="button full"
                        onClick={() => generate('ai')}
                        disabled={!!busy}
                      >
                        <Sparkles size={17} /> Generate draft from photo
                      </button>
                      <p className="photo-support tiny">
                        This sends your photo and the notes above to Gemini to suggest a draft.
                      </p>
                      <button
                        type="button"
                        className="text-button"
                        disabled={!!busy || name.trim().length < 3}
                        onClick={() => generate('guided')}
                      >
                        Use my notes without AI
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="draft-availability">
                        <span className="tiny-dot" />
                        <div>
                          <strong>
                            {ai === null ? 'Checking photo AI…' : 'Photo AI isn’t connected yet.'}
                          </strong>
                          <p>
                            For now, we can build a starter from the details you type. Your photo
                            won’t be analyzed.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="button full"
                        onClick={() => generate('guided')}
                        disabled={!!busy || name.trim().length < 3 || ai === null}
                      >
                        <PencilLine size={17} /> Create starter draft
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="text-button"
                    disabled={!!busy || photoCount >= 5}
                    onClick={() => {
                      onApply({ photoId: photo, questions: [] });
                      setPhoto('');
                      setName('');
                      setNotes('');
                    }}
                  >
                    Just add the photo; I’ll write the details
                  </button>
                </>
              ) : (
                <>
                  <div className="photo-benefits">
                    <div>
                      <span>01</span>
                      <p>
                        <strong>One item in focus</strong>Give it the frame. Add more angles later.
                      </p>
                    </div>
                    <div>
                      <span>02</span>
                      <p>
                        <strong>A head start on the details</strong>A title, description, and
                        questions to check.
                      </p>
                    </div>
                    <div>
                      <span>03</span>
                      <p>
                        <strong>You stay in charge</strong>Nothing is published without your say.
                      </p>
                    </div>
                  </div>
                  <span className="photo-mode-note">
                    {ai
                      ? 'Photo AI is available'
                      : ai === null
                        ? 'Checking availability…'
                        : 'Starter drafts available · Photo AI not connected'}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="photo-error" role="alert">
          <p>{error}</p>
          {!camera && !photo && (
            <button
              type="button"
              className="text-button"
              disabled={!!busy}
              onClick={() => nativeCamera.current?.click()}
            >
              Use device camera instead
            </button>
          )}
        </div>
      )}
      <div className="photo-draft-footer">
        <ShieldCheck size={16} />
        <span>
          Suggestions become your listing only after review. Condition, prices, and agent knowledge
          stay in your hands.
        </span>
      </div>
    </section>
  );
}
