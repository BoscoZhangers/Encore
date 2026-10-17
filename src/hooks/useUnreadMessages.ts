import { useEffect, useState } from 'react';
import { api, post } from '../api';

const readEvent = 'encore:messages-read';

export function useUnreadMessages(userId?: string) {
  const [count, setCount] = useState({ userId, unread: 0 });
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let generation = 0;
    const refresh = async () => {
      const request = ++generation;
      try {
        const result = await api('/conversations/unread');
        if (active && request === generation) setCount({ userId, unread: result.unread });
      } catch {
        // Keep the last known count through temporary connection failures.
      }
    };
    void refresh();
    const timer = setInterval(refresh, 7000);
    window.addEventListener(readEvent, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener(readEvent, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [userId]);
  return userId && count.userId === userId ? count.unread : 0;
}

export function useReadConversation(conversationId: string, unreadMessageIds?: string[]) {
  useEffect(() => {
    if (!unreadMessageIds?.length) return;
    let active = true;
    let pending = false;
    const markRead = async () => {
      if (document.visibilityState === 'hidden' || pending) return;
      pending = true;
      try {
        for (let i = 0; i < unreadMessageIds.length && active; i += 500) {
          await post(`/conversations/${conversationId}/read`, {
            messageIds: unreadMessageIds.slice(i, i + 500),
          });
        }
        window.dispatchEvent(new window.Event(readEvent));
      } catch {
        pending = false; // The next conversation refresh can retry.
      }
    };
    void markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', markRead);
    };
  }, [conversationId, unreadMessageIds]);
}
