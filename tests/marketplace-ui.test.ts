import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
const window = new Window({ url: 'http://localhost:5173/' });
for (const [key, value] of Object.entries({
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
}))
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  });
window.HTMLElement.prototype.scrollIntoView = () => {};
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { BrowserRouter } = await import('react-router-dom');
const { default: App } = await import('../src/App.js');
const { CoraActivity } = await import('../src/components/marketplace/CoraActivity.js');
const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
  window.happyDOM.abort();
});

test('marketplace navigation preserves filters, listing details and the separate seller layouts', async () => {
  const requests: string[] = [];
  const item = {
    id: 'headphones',
    title: 'Wireless headphones',
    price: 18000,
    views: 128,
    category: 'Electronics',
    condition: 'Good',
    available: 2,
    quantity: 2,
    reserved: 0,
    sold: 0,
    status: 'published',
    photos: [],
    facts: [],
    area: 'Campus',
    description: 'Seller-confirmed description.',
    seller_id: 'seller',
    seller_name: 'Maya Chen',
    pickup: 'Campus library',
  };
  const items = [
    item,
    ...Array.from({ length: 27 }, (_, index) => ({
      ...item,
      id: `extra-${index + 1}`,
      title: `Extra listing ${index + 1}`,
      views: index + 1,
    })),
  ];
  globalThis.fetch = async (url) => {
    const path = String(url);
    requests.push(path);
    if (path.endsWith('/auth/me'))
      return Response.json({ user: { id: 'seller', name: 'Maya Chen' } });
    if (path.endsWith('/health')) return Response.json({ agent: 'rules' });
    if (path.endsWith('/notifications'))
      return Response.json({
        notifications: [
          {
            id: 'offer-notification',
            body: 'New offer on Wireless headphones: CAD 160.00 × 1',
            href: '/inbox',
            created_at: Date.now(),
            seen: 0,
          },
          {
            id: 'sale-notification',
            body: 'Sale completed for New Balance sneakers: CAD 55.00 earned.',
            href: '/messages/sold',
            created_at: Date.now() - 1000,
            seen: 1,
          },
          {
            id: 'question-notification',
            body: 'A buyer has a question about Camera.',
            href: '/inbox',
            created_at: Date.now() - 2000,
            seen: 1,
          },
        ],
      });
    if (path.endsWith('/notifications/read')) return Response.json({ ok: true });
    if (path.endsWith('/conversations/unread')) return Response.json({ unread: 4 });
    if (path.endsWith('/account/profile')) return Response.json({ avatar_url: null });
    if (path.endsWith('/blocks')) return Response.json({ blocks: [] });
    if (path.includes('/listings?')) return Response.json({ listings: items });
    if (path.endsWith('/listings/headphones')) return Response.json({ listing: item });
    if (path.endsWith('/seller/listings')) return Response.json({ listings: [item] });
    if (path.endsWith('/seller/metrics')) return Response.json({ proceeds: 0 });
    if (path.includes('/seller/insights'))
      return Response.json({
        totalEarnings: 64500,
        activeListings: 12,
        agentNegotiations: 8,
        rehomedItems: 18,
        changes: {
          totalEarnings: 13000,
          activeListings: 0,
          agentNegotiations: 4,
          rehomedItems: 3,
        },
      });
    if (path.endsWith('/seller/requests')) return Response.json({ requests: [] });
    if (path.endsWith('/photo-drafts/capabilities'))
      return Response.json({ mode: 'guided', aiAvailable: false });
    throw Error(`Unexpected request: ${path}`);
  };
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  async function settle(action: () => void) {
    await act(async () => {
      action();
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
  }
  async function click(selector: string) {
    const link = container.querySelector(selector) as HTMLElement;
    assert.ok(link, selector);
    await settle(() => link.click());
  }
  try {
    await settle(() => root.render(createElement(BrowserRouter, null, createElement(App))));
    assert.ok(container.querySelector('.marketplace-shell'));
    assert.ok(container.querySelector('.market-banner'));
    assert.ok(requests.some((r) => r.includes('scope=mine')));
    assert.match(container.textContent!, /Wireless headphones/);
    assert.equal(
      container.querySelectorAll('.overview-listings-layout .figma-listing-card').length,
      6,
    );
    assert.match(container.querySelector('.listing-pagination')!.textContent!, /Page 1 of 5/);
    await click('.listing-pagination button:last-child');
    assert.equal(
      container.querySelectorAll('.overview-listings-layout .figma-listing-card').length,
      6,
    );
    await click('.listing-pagination button:first-child');
    assert.ok(container.querySelector('.overview-listings-layout .cora-activity'));
    assert.match(container.querySelector('.cora-activity')!.textContent!, /Your updates/);
    assert.equal(container.querySelectorAll('.cora-activity-list li').length, 3);
    assert.match(container.querySelector('.cora-activity')!.textContent!, /CAD 160.00/);
    assert.match(container.querySelector('.cora-activity')!.textContent!, /CAD 55.00 earned/);
    assert.match(container.querySelector('.cora-activity')!.textContent!, /question about Camera/);
    assert.match(container.textContent!, /Your month at a glance/);
    assert.match(container.textContent!, /Total earnings/);
    assert.match(container.textContent!, /\$645/);
    assert.equal(container.querySelectorAll('.insight-card-trend').length, 4);
    assert.equal(container.querySelectorAll('.insight-card.trend-up').length, 3);
    assert.equal(container.querySelectorAll('.insight-card.trend-steady').length, 1);
    assert.equal(
      container.querySelector('.insights-view-link')?.textContent?.includes('View insights'),
      true,
    );
    assert.equal(container.querySelector('.figma-listing-meta span')?.textContent, '128 views');
    assert.ok(container.querySelector('.figma-listing-meta svg.lucide-eye'));
    assert.match(container.textContent!, /Give your things a second life/);
    assert.equal(container.querySelector('.header'), null);
    assert.equal(container.querySelector('.market-message-count')?.textContent, '4');
    assert.equal(
      container.querySelector('a[title="Messages"]')?.getAttribute('aria-label'),
      'Messages, 4 unread',
    );
    await click('.market-help');
    assert.match(
      container.querySelector('.toast-info')?.textContent || '',
      /Need a hand\? Contact hello@encore\.example for demo support\./,
    );
    await click('.market-sidebar a[href="/listings"]');
    assert.equal(window.location.pathname, '/listings');
    assert.equal(container.querySelector('.cora-activity'), null);
    assert.equal(container.querySelector('.figma-listing-heading'), null);
    assert.equal(container.querySelectorAll('.figma-listing-card').length, 26);
    assert.match(container.querySelector('.listing-pagination')!.textContent!, /Page 1 of 2/);
    await click('.listing-pagination button:last-child');
    assert.equal(container.querySelectorAll('.figma-listing-card').length, 2);
    assert.match(container.querySelector('.listing-pagination')!.textContent!, /Page 2 of 2/);
    await click('.listing-pagination button:first-child');
    assert.equal(container.querySelector('.figma-listing-meta span')?.textContent, '128 views');
    assert.equal(container.querySelector('.market-banner'), null);
    await click('.filter-toggle');
    assert.ok(container.querySelector('.filter-panel'));
    const category = container.querySelector('select[aria-label="Category"]') as HTMLSelectElement;
    await settle(() => {
      category.value = 'Electronics';
      category.dispatchEvent(new window.Event('change', { bubbles: true }) as unknown as Event);
    });
    assert.ok(requests.some((r) => r.includes('category=Electronics')));
    const sold = [...container.querySelectorAll('.figma-listing-tabs button')].find(
      (b) => b.textContent === 'Sold',
    ) as HTMLElement;
    await settle(() => sold.click());
    assert.ok(requests.some((r) => r.includes('stage=sold')));
    await click('.figma-listing-card a[href="/items/headphones?from=listings"]');
    assert.ok(container.querySelector('.marketplace-shell .detail-layout'));
    assert.equal(
      container.querySelector('.market-sidebar a[href="/listings"]')?.getAttribute('aria-current'),
      'page',
    );
    assert.equal(
      container.querySelector('.market-sidebar a[href="/discover"]')?.getAttribute('aria-current'),
      null,
    );
    assert.equal(container.querySelector('.back')?.textContent?.trim(), 'Your listings');
    assert.match(
      container.querySelector('.detail-layout aside')!.textContent!,
      /Seller-confirmed description/,
    );
    assert.equal(container.querySelector('.details-copy'), null);
    assert.doesNotMatch(container.textContent!, /Seller-confirmed details/);
    assert.doesNotMatch(container.textContent!, /Meet Cora, their selling assistant/);
    assert.ok(!requests.some((r) => r.endsWith('/views')), 'owner visits are not tracked');
    assert.match(container.textContent!, /2 available/);
    await click('.market-sidebar a[href="/selling"]');
    assert.ok(container.querySelector('.marketplace-shell'));
    assert.equal(container.querySelector('.header'), null);
    assert.equal(
      container.querySelector('.market-breadcrumb strong')?.textContent,
      'My selling space',
    );
    assert.ok(container.querySelector('.workspace-columns'));
    assert.equal(container.querySelectorAll('.market-sidebar').length, 1);
    assert.deepEqual(
      Array.from(container.querySelectorAll('.market-sidebar nav a')).map((link) =>
        link.getAttribute('href'),
      ),
      ['/', '/listings', '/selling', '/insights', '/discover', '/messages'],
    );
    await click('.agent-card a[href="/inbox"]');
    assert.equal(window.location.pathname, '/inbox');
    assert.ok(container.querySelector('.marketplace-shell .inbox-page'));
    assert.equal(container.querySelectorAll('.market-sidebar').length, 1);
    assert.equal(container.querySelectorAll('.header').length, 0);
    assert.equal(
      container.querySelector('.market-breadcrumb strong')?.textContent,
      'Cora requests',
    );
    assert.match(container.textContent!, /Cora needs a hand/);
    await click('.market-sidebar a[href="/selling"]');
    await click('.page-title a[href="/sell"]');
    assert.equal(window.location.pathname, '/sell');
    assert.ok(container.querySelector('.marketplace-shell .listing-wizard'));
    assert.equal(container.querySelectorAll('.market-sidebar').length, 1);
    assert.equal(container.querySelectorAll('.header').length, 0);
    assert.equal(container.querySelector('.market-breadcrumb strong')?.textContent, 'Sell an item');
    assert.ok(container.querySelector('.wizard-progress'));
    assert.match(container.textContent!, /photo/i);
    await click('.market-profile');
    assert.equal(window.location.pathname, '/account');
    assert.ok(container.querySelector('.marketplace-shell .account-panel'));
    assert.equal(container.querySelectorAll('.market-sidebar').length, 1);
    assert.equal(container.querySelectorAll('.header').length, 0);
    assert.equal(
      container.querySelector('.market-breadcrumb strong')?.textContent,
      'Account & privacy',
    );
    assert.match(container.textContent!, /Profile photo/);
    assert.match(container.textContent!, /Blocked buyers/);
    assert.ok(container.querySelector('input[autocomplete="current-password"]'));
    await click('.market-sidebar a[title="Insights"]');
    assert.equal(window.location.pathname, '/insights');
    assert.equal(container.querySelector('.market-breadcrumb strong')?.textContent, 'Insights');
    assert.match(container.textContent!, /Agent negotiations/);
    await click('.insights-period');
    assert.ok(container.querySelector('.insights-period-menu'));
    await click('.insights-period-menu button[data-period="previous-month"]');
    assert.match(container.querySelector('.insights-period')?.textContent || '', /Last month/);
    assert.ok(requests.some((r) => r.includes('/seller/insights?period=previous-month')));
    await click('.market-notifications');
    assert.equal(window.location.pathname, '/activity');
    assert.ok(container.querySelector('.marketplace-shell'));
    assert.equal(container.querySelectorAll('.market-sidebar').length, 1);
    assert.equal(container.querySelector('.header'), null);
    assert.equal(container.querySelector('.market-breadcrumb strong')?.textContent, 'Your updates');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test('Cora activity uses a sleep icon for its quiet state', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/notifications')) return Response.json({ notifications: [] });
    throw Error(`Unexpected request: ${url}`);
  };
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(createElement(BrowserRouter, null, createElement(CoraActivity)));
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    assert.match(container.textContent!, /A quiet moment for Cora/);
    assert.equal(container.querySelector('.cora-quiet-icon')?.textContent, 'Zzz');
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
