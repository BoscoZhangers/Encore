import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, LoaderCircle, Package, Send } from 'lucide-react';
import { cad, post } from '../../api';
import { useData } from '../../hooks/useData';
import { useReadConversation } from '../../hooks/useUnreadMessages';
import { ErrorBox, Spinner } from '../ui';
import { SellerAvatar } from '../SellerAvatar';
import { CoraAvatar } from '../agent/CoraAvatar';
import type { Tell } from '../feedback/Toast';

export function Chat({ id, user, tell }: { id: string; user: { id: string }; tell: Tell }) {
  const { data, error, reload } = useData(`/conversations/${id}`, 4000);
  useReadConversation(id, data?.unreadMessageIds);
  const [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [actionError, setError] = useState(''),
    [amount, setAmount] = useState(''),
    [qty, setQty] = useState(1);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const available = data?.listing.status === 'published' ? Math.max(0, data.listing.available) : 0;
  useEffect(() => {
    setQty((current) => (available > 0 ? Math.min(available, Math.max(1, current)) : 0));
  }, [available]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [data?.messages.length]);
  async function send(content: string) {
    if (!content.trim()) return;
    setBusy(true);
    setError('');
    try {
      await post(`/conversations/${id}/messages`, { text: content, key: crypto.randomUUID() });
      setText('');
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function pay(requestId: string) {
    setBusy(true);
    setError('');
    try {
      // Phantom exposes its provider under `window.phantom.solana` in current
      // extensions. Keep the legacy alias as a fallback for older versions.
      const wallet = (window as any).phantom?.solana || (window as any).solana;
      if (!wallet?.isPhantom)
        throw Error('Open this page with a compatible Phantom wallet to try the devnet payment.');
      if (
        !confirm(
          'This sends test SOL on Solana devnet. Switch your wallet to devnet. This does not settle the CAD purchase. Continue?',
        )
      )
        return;
      await wallet.connect();
      const intent = await post(`/requests/${requestId}/payment-intent`, {
        payer: wallet.publicKey.toBase58(),
      });
      const { Transaction } = await import('@solana/web3.js');
      const bytes = Uint8Array.from(atob(intent.transaction), (c) => c.charCodeAt(0));
      const signed = await wallet.signAndSendTransaction(Transaction.from(bytes));
      let verified = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          await post(`/requests/${requestId}/payment-verify`, { signature: signed.signature });
          verified = true;
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      if (!verified)
        throw Error(
          `Payment submitted but confirmation is pending. Keep this signature: ${signed.signature}`,
        );
      tell('Devnet test payment confirmed.');
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Spinner />;
  const seller = data.conversation.seller_id === user.id;
  const photo = data.listing.photos?.[0];
  return (
    <section className="panel chat">
      <div className="chat-header">
        <span className="chat-item-thumbnail">
          {photo && photo !== failedPhoto ? (
            <img
              src={`/api/photos/${photo}`}
              alt={data.listing.title}
              onError={() => setFailedPhoto(photo)}
            />
          ) : (
            <Package size={22} aria-label="Item photo unavailable" />
          )}
        </span>
        <div>
          <h3>{data.listing.title}</h3>
          <span>
            {data.agentMode === 'gemini'
              ? 'Cora · AI selling assistant'
              : 'Cora · Basic assistant · AI not connected'}{' '}
            · Seller approves reservations
          </span>
        </div>
        <Link to={`/items/${data.listing.id}`} aria-label="View listing">
          <ExternalLink size={17} />
        </Link>
      </div>
      <div className="chat-messages" role="log" aria-label="Conversation" aria-live="polite">
        {data.messages.map((m: any) => (
          <div
            key={m.id}
            className={`bubble ${m.role} ${
              (seller ? m.role !== 'buyer' : m.role === 'buyer') ? 'outgoing' : 'incoming'
            }`}
          >
            <div className="message-meta">
              <span className="message-sender">
                {m.role === 'agent' ? (
                  <CoraAvatar />
                ) : (
                  <SellerAvatar
                    name={
                      m.role === 'buyer'
                        ? data.conversation.buyer_name || 'Buyer'
                        : data.conversation.seller_name || 'Seller'
                    }
                    src={
                      m.role === 'buyer'
                        ? data.conversation.buyer_avatar_url
                        : data.conversation.seller_avatar_url
                    }
                  />
                )}
                {m.role === 'buyer'
                  ? `${data.conversation.buyer_name || 'Buyer'} (Buyer)`
                  : m.role === 'seller'
                    ? `${data.conversation.seller_name || 'Seller'} (Seller)`
                    : 'Cora (Assistant)'}
              </span>
              <time
                dateTime={new Date(Number(m.created_at)).toISOString()}
                title={new Date(Number(m.created_at)).toLocaleString(undefined, {
                  timeZoneName: 'short',
                })}
              >
                {new Date(Number(m.created_at)).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </time>
            </div>
            <p>{m.body}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      {data.requests
        .filter(
          (r: any) => r.kind === 'offer' && ['pending', 'approved', 'completed'].includes(r.status),
        )
        .map((r: any) => (
          <div className="reservation-strip" key={r.id}>
            <div>
              <strong>
                {r.quantity} × {cad(r.amount)}
              </strong>
              <span>
                {r.status === 'pending'
                  ? 'Awaiting seller approval'
                  : r.status === 'approved'
                    ? 'Reservation approved'
                    : 'Sale completed'}
                {r.signature ? ' · Devnet payment verified' : ''}
              </span>
            </div>
            {r.status === 'approved' && !seller && (
              <div className="inline-actions">
                {data.paymentEnabled && !r.signature && (
                  <button className="button small" disabled={busy} onClick={() => pay(r.id)}>
                    Pay with test SOL
                  </button>
                )}
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await post(`/requests/${r.id}/cancel`);
                      reload();
                    } catch (e: any) {
                      setError(e.message);
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      <ErrorBox error={actionError} />
      {seller ? (
        <div className="seller-chat-note">
          <p>Reply to questions and review offers in your seller inbox.</p>
          <Link className="button small" to="/inbox">
            Open inbox <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          {Array.isArray(data.listing.facts) && data.listing.facts.length > 0 && (
            <div className="quick-questions">
              {data.listing.facts.slice(0, 2).map((f: any) => (
                <button key={f.id} disabled={busy} onClick={() => send(f.question)}>
                  {f.question}
                </button>
              ))}
            </div>
          )}
          <p id="offer-availability" className="offer-availability" role="status">
            <Package size={14} />
            {available > 0
              ? `${available} available · reserved and sold units excluded`
              : 'Currently unavailable · no units available to reserve'}
          </p>
          <form
            className="offer-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!Number.isInteger(qty) || qty < 1 || qty > available) {
                setError(
                  available > 0
                    ? `Choose between 1 and ${available} available items.`
                    : 'This item is currently unavailable.',
                );
                return;
              }
              void send(`I offer CAD ${Number(amount).toFixed(2)} each for ${qty} items`);
            }}
          >
            <label>
              <span>Offer / item · CAD</span>
              <input
                aria-label="Offer per item in CAD"
                disabled={busy || available === 0}
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder={String(data.listing.price / 100)}
              />
            </label>
            <label className="quantity-input">
              <span>Qty</span>
              <input
                aria-label="Offer quantity"
                aria-describedby="offer-availability"
                type="number"
                min={available > 0 ? 1 : 0}
                max={available}
                step="1"
                disabled={busy || available === 0}
                value={qty}
                onChange={(e) =>
                  setQty(
                    available > 0
                      ? Math.min(available, Math.max(1, Math.floor(Number(e.target.value)) || 1))
                      : 0,
                  )
                }
                required
              />
            </label>
            <button
              className="button secondary small"
              disabled={busy || available === 0 || qty < 1 || qty > available}
            >
              Make offer
            </button>
          </form>
          <form
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <input
              aria-label="Message"
              value={text}
              maxLength={1500}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask a question or make an offer…"
              required
            />
            <button className="button" disabled={busy} aria-label="Send message">
              {busy ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
            </button>
          </form>
          <p className="chat-footnote">
            Unknown answers go to the seller. Your conversation is private to you and this seller.
            Times are shown in your local time zone.
          </p>
        </>
      )}
    </section>
  );
}
