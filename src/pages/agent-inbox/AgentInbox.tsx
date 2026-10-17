import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { cad, post } from '../../api';
import { useData } from '../../hooks/useData';
import { Empty, ErrorBox, Spinner } from '../../components/ui';
import type { Tell } from '../../components/feedback/Toast';

export function AgentInbox({ tell }: { tell: Tell }) {
  const { data, error, reload } = useData('/seller/requests', 6000);
  const [filter, setFilter] = useState('pending');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState('');

  async function act(id: string, action: string, body: any = {}) {
    setBusy(id);
    setFailure('');
    try {
      await post(`/requests/${id}/${action}`, body);
      tell(action === 'answer' ? 'Your reply is on its way.' : 'Reservation updated.');
      await reload();
    } catch (e: any) {
      setFailure(e.message);
    } finally {
      setBusy('');
    }
  }

  const requests = data?.requests.filter((r: any) => filter === 'all' || r.status === filter) || [];
  return (
    <div className="page inbox-page">
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={14} /> Human when it matters
          </div>
          <h1>Your agent needs a hand.</h1>
          <p className="muted">A quick answer. A final say. You keep control of the sale.</p>
        </div>
        <Link className="button secondary" to="/selling">
          Your items <ArrowRight size={16} />
        </Link>
      </div>
      <div className="category-tabs">
        {[
          ['pending', 'Needs attention'],
          ['approved', 'Reserved'],
          ['completed', 'Completed'],
          ['all', 'All activity'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? 'active' : ''}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorBox error={error || failure} />
      {!data ? (
        <Spinner />
      ) : requests.length ? (
        <div className="request-list">
          {requests.map((r: any) => (
            <article className="panel request" key={r.id}>
              <div className="request-heading">
                <span className={`request-icon ${r.kind}`}>
                  {r.kind === 'offer' ? <ShoppingBag size={21} /> : <MessageCircle size={21} />}
                </span>
                <div>
                  <span className="eyebrow">
                    {r.kind === 'offer' ? 'Reservation request' : 'A question for you'}
                  </span>
                  <h3>{r.title}</h3>
                  <p>
                    {r.buyer_name} ·{' '}
                    <Link to={`/messages/${r.conversation_id}`}>View conversation</Link>
                  </p>
                </div>
                <span className={`status ${r.status}`}>{r.status}</span>
              </div>
              <blockquote>{r.question}</blockquote>
              {r.kind === 'offer' ? (
                <>
                  <div className="offer-summary">
                    <div>
                      <span>Offer per item</span>
                      <strong>{cad(r.amount)}</strong>
                    </div>
                    <div>
                      <span>Quantity</span>
                      <strong>{r.quantity}</strong>
                    </div>
                    <div>
                      <span>Your private minimum</span>
                      <strong>{cad(r.floor)}</strong>
                    </div>
                  </div>
                  {r.status === 'pending' && (
                    <div className="inline-actions">
                      <button
                        className="button"
                        disabled={busy === r.id}
                        onClick={() => act(r.id, 'approve')}
                      >
                        <Check size={16} /> Approve reservation
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy === r.id}
                        onClick={() => act(r.id, 'decline')}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {r.status === 'approved' && (
                    <div className="inline-actions">
                      <button
                        className="button"
                        disabled={busy === r.id}
                        onClick={() => {
                          if (
                            confirm(
                              'Confirm the exchange is complete? This records seller-reported proceeds.',
                            )
                          )
                            void act(r.id, 'complete');
                        }}
                      >
                        Mark sale complete
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy === r.id}
                        onClick={() => act(r.id, 'cancel')}
                      >
                        Cancel & release stock
                      </button>
                    </div>
                  )}
                  {r.signature && (
                    <p className="hint">
                      Devnet test payment confirmed. The CAD sale must still be completed
                      separately.
                    </p>
                  )}
                </>
              ) : r.status === 'pending' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void act(r.id, 'answer', {
                      answer: f.get('answer'),
                      remember: f.get('remember') === 'on',
                    });
                  }}
                >
                  <label>
                    Your confirmed answer
                    <textarea
                      name="answer"
                      maxLength={800}
                      required
                      placeholder="Share what you know. It’s fine to say something hasn’t been tested."
                    />
                  </label>
                  <label className="check-label">
                    <input type="checkbox" name="remember" /> Let my agent reuse this answer for
                    future buyers
                  </label>
                  <button className="button" disabled={busy === r.id}>
                    Send answer <ArrowUpRight size={16} />
                  </button>
                </form>
              ) : (
                <p className="muted">{r.answer}</p>
              )}
              <div className="request-footer">
                <span>{new Date(Number(r.created_at)).toLocaleString()}</span>
                <button
                  className="text-button"
                  onClick={async () => {
                    if (
                      !confirm(
                        'Block this buyer from sending new messages to your listings? Existing reservations still need to be handled.',
                      )
                    )
                      return;
                    try {
                      await post('/blocks', { buyerId: r.buyer_id });
                      tell('Buyer blocked. Manage blocked buyers in Account.');
                    } catch (e: any) {
                      setFailure(e.message);
                    }
                  }}
                >
                  Block buyer
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="All caught up.">
          <p>Questions and offers will appear here when buyers need you.</p>
        </Empty>
      )}
    </div>
  );
}
