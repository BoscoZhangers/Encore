import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
const window = new Window({ url: 'http://localhost:5173/messages/buyer-conversation' });
for (const [key, value] of Object.entries({
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
}))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
window.HTMLElement.prototype.scrollIntoView = () => {};
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { BrowserRouter } = await import('react-router-dom');
const { default: App } = await import('../src/App.js');
const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
  window.happyDOM.abort();
});
test('buyer quantity is capped to stock and offers disable after stock runs out', async () => {
  let available = 2;
  let unread = 2;
  let readBody: any;
  globalThis.fetch = async (url, options) => {
    const path = String(url);
    if (path.endsWith('/auth/me')) return Response.json({ user: { id: 'buyer', name: 'Buyer' } });
    if (path.endsWith('/health')) return Response.json({ agent: 'rules' });
    if (path.endsWith('/notifications')) return Response.json({ notifications: [] });
    if (path.endsWith('/conversations/unread')) return Response.json({ unread });
    if (path.endsWith('/conversations/buyer-conversation/read')) {
      readBody = JSON.parse(options!.body as string);
      unread = 0;
      return Response.json({ ok: true });
    }
    if (path.endsWith('/conversations')) return Response.json({ conversations: [] });
    if (path.endsWith('/conversations/buyer-conversation'))
      return Response.json({
        conversation: {
          seller_id: 'seller',
          buyer_id: 'buyer',
          buyer_name: 'Alex Morgan',
          seller_name: 'Maya Chen',
        },
        listing: {
          id: 'item',
          title: 'Test item',
          price: 18000,
          status: 'published',
          available,
          facts: [],
        },
        messages: [
          {
            id: 'b',
            role: 'buyer',
            body: 'Is it available?',
            created_at: Date.parse('2026-10-14T15:04:00Z'),
          },
          {
            id: 's',
            role: 'seller',
            body: 'Yes it is.',
            created_at: Date.parse('2026-10-14T15:05:00Z'),
          },
          {
            id: 'a',
            role: 'agent',
            body: 'How can I help?',
            created_at: Date.parse('2026-10-14T15:06:00Z'),
          },
        ],
        requests: [],
        unreadMessageIds: unread ? ['s', 'a'] : [],
        agentMode: 'rules',
      });
    throw Error(`Unexpected request: ${path}`);
  };
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(createElement(BrowserRouter, null, createElement(App)));
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    const quantity = container.querySelector(
      'input[aria-label="Offer quantity"]',
    ) as HTMLInputElement;
    assert.ok(quantity);
    assert.equal(container.querySelectorAll('.market-sidebar').length, 1);
    assert.equal(container.querySelectorAll('.header').length, 0);
    assert.equal(container.querySelector('.market-breadcrumb strong')?.textContent, 'Messages');
    assert.ok(container.querySelector('.marketplace-shell .messages-layout'));
    assert.equal(
      container.querySelector('a[title="Messages"]')?.getAttribute('aria-current'),
      'page',
    );
    assert.deepEqual(readBody, { messageIds: ['s', 'a'] });
    assert.equal(container.querySelectorAll('.market-message-count').length, 0);
    assert.equal(quantity.max, '2');
    assert.match(container.textContent!, /Alex Morgan \(Buyer\)/);
    assert.match(container.textContent!, /Maya Chen \(Seller\)/);
    assert.match(container.textContent!, /Cora \(Assistant\)/);
    const timestamps = container.querySelectorAll('.message-meta time');
    assert.equal(timestamps.length, 3);
    assert.equal(timestamps[0].getAttribute('datetime'), '2026-10-14T15:04:00.000Z');
    assert.match(timestamps[0].textContent!, /2026/);
    assert.match(timestamps[0].textContent!, /\d+:\d{2}/);
    assert.match(container.textContent!, /2 available/);
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(
        quantity,
        '9',
      );
      quantity.dispatchEvent(new window.Event('input', { bubbles: true }) as unknown as Event);
    });
    assert.equal(quantity.value, '2');
    available = 0;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 4200));
    });
    assert.equal(quantity.value, '0');
    assert.equal(quantity.max, '0');
    assert.ok(quantity.disabled);
    const offer = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Make offer'),
    )!;
    assert.ok(offer.disabled);
    assert.match(container.textContent!, /no units available to reserve/);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
