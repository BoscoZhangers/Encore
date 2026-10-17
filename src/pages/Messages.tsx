import { Link, NavLink, useParams } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useData } from '../hooks/useData';
import { Empty, ErrorBox } from '../components/ui';
import { Chat } from '../components/messages/Chat';
import type { Tell } from '../components/feedback/Toast';

export function Messages({ user, tell }: { user: { id: string }; tell: Tell }) {
  const { id } = useParams();
  const list = useData('/conversations', 8000);
  return (
    <div className="page messages-page">
      <div className="page-title">
        <div>
          <div className="eyebrow">
            <MessageCircle size={14} /> Good conversations. Better second chances.
          </div>
          <h1>Your messages</h1>
        </div>
      </div>
      <div className="messages-layout">
        <aside className="conversation-list panel">
          <h3>Conversations</h3>
          <ErrorBox error={list.error} />
          {list.data?.conversations.length ? (
            list.data.conversations.map((c: any) => (
              <NavLink key={c.id} to={`/messages/${c.id}`}>
                <span className="conversation-icon">
                  <MessageCircle size={19} />
                </span>
                <div>
                  <strong>{c.title}</strong>
                  <span>
                    {c.seller_id === user.id
                      ? `Buyer: ${c.buyer_name}`
                      : 'Chat with seller’s agent'}
                  </span>
                </div>
                <ArrowRight size={14} />
              </NavLink>
            ))
          ) : (
            <p className="muted">Your conversations will appear here.</p>
          )}
        </aside>
        {id ? (
          <Chat key={id} id={id} user={user} tell={tell} />
        ) : (
          <div className="panel">
            <Empty title="A good conversation starts here">
              <p>Select a conversation or find an item you love.</p>
              <Link to="/discover" className="button">
                Explore the finds <ArrowRight size={16} />
              </Link>
            </Empty>
          </div>
        )}
      </div>
    </div>
  );
}
