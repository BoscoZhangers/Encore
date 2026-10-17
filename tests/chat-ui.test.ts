import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

test('chat aligns messages to the viewer and displays participant and item photos', async () => {
  const window = new Window({ url: 'http://localhost:5173/messages/demo' });
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
  const { Chat } = await import('../src/components/messages/Chat.js');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      conversation: {
        seller_id: 'seller',
        buyer_id: 'buyer',
        buyer_name: 'Alex',
        seller_name: 'Maya',
        buyer_avatar_url: '/api/photos/alex',
        seller_avatar_url: '/api/photos/maya',
      },
      listing: {
        id: 'item',
        title: 'Headphones',
        photos: ['headphones'],
        status: 'published',
        available: 1,
        facts: [],
        price: 18000,
      },
      messages: ['buyer', 'seller', 'agent'].map((role) => ({
        id: role,
        role,
        body: `${role} message`,
        created_at: Date.now(),
      })),
      requests: [],
      unreadMessageIds: [],
      agentMode: 'rules',
    });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const render = async (id: string) =>
    act(async () => {
      root.render(
        createElement(
          BrowserRouter,
          null,
          createElement(Chat, { id: 'demo', user: { id }, tell: () => {} }),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
  try {
    await render('seller');
    assert.ok(container.querySelector('.buyer.incoming'));
    assert.ok(container.querySelector('.seller.outgoing'));
    assert.ok(container.querySelector('.agent.outgoing'));
    assert.equal(
      container.querySelector('.chat-item-thumbnail img')?.getAttribute('src'),
      '/api/photos/headphones',
    );
    assert.equal(
      container.querySelector('.buyer .message-sender img')?.getAttribute('src'),
      '/api/photos/alex',
    );
    assert.equal(
      container.querySelector('.seller .message-sender img')?.getAttribute('src'),
      '/api/photos/maya',
    );
    assert.equal(
      container.querySelector('.agent .message-sender img')?.getAttribute('src'),
      '/brand/encore-mark.svg',
    );
    await render('buyer');
    assert.ok(container.querySelector('.buyer.outgoing'));
    assert.ok(container.querySelector('.seller.incoming'));
    assert.ok(container.querySelector('.agent.incoming'));
    await act(async () => {
      container
        .querySelector('.chat-item-thumbnail img')!
        .dispatchEvent(new window.Event('error') as unknown as Event);
    });
    assert.ok(container.querySelector('[aria-label="Item photo unavailable"]'));
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    container.remove();
    await window.happyDOM.abort();
  }
});
