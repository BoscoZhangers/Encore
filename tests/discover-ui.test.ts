import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
const window = new Window({ url: 'http://localhost:5173/discover' });
for (const [key, value] of Object.entries({
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
}))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { BrowserRouter } = await import('react-router-dom');
const { default: App } = await import('../src/App.js');
const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
  window.happyDOM.abort();
});
test('Discover has independent buyer filters, location consent and reset behavior', async () => {
  const requests: string[] = [];
  let geoSuccess: any,
    geoFailure: any,
    geoCalls = 0;
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition(success: any, failure: any) {
        geoCalls++;
        geoSuccess = success;
        geoFailure = failure;
      },
    },
  });
  globalThis.fetch = async (url) => {
    const path = String(url);
    requests.push(path);
    if (path.endsWith('/auth/me')) return Response.json({ user: { id: 'buyer', name: 'Alex' } });
    if (path.endsWith('/health')) return Response.json({ agent: 'rules' });
    if (path.endsWith('/notifications')) return Response.json({ notifications: [] });
    if (path.endsWith('/conversations/unread')) return Response.json({ unread: 0 });
    if (path.includes('/recommendations?'))
      return Response.json({
        personalized: true,
        interests: [{ category: 'Furniture', views: 1, chats: 1, purchases: 0, score: 6 }],
        listings: Array.from({ length: 6 }, (_, index) => ({
          id: `recommendation-${index + 1}`,
          title: `Recommendation ${index + 1}`,
          category: 'Furniture',
          condition: 'Good',
          seller_name: 'Encore seller',
          photos: [],
          price: 2000 + index,
          views: index,
          available: 1,
          area: 'Toronto',
        })),
      });
    if (path.includes('/listings?'))
      return Response.json({
        listings: [
          {
            id: 'one',
            title: 'Nearby lamp',
            category: 'Furniture',
            condition: 'New',
            seller_name: 'Maya Chen',
            seller_avatar_url: '/api/photos/seller-avatar',
            photos: [],
            price: 2500,
            views: 1,
            available: 1,
            area: 'Campus',
            distance: 0.2,
          },
        ],
      });
    throw Error(path);
  };
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const settle = async (fn: () => void) => {
    await act(async () => {
      fn();
      await new Promise((r) => setTimeout(r, 35));
    });
  };
  const change = async (selector: string, value: string) => {
    const input = container.querySelector(selector) as HTMLInputElement;
    assert.ok(input);
    await settle(() => {
      Object.getOwnPropertyDescriptor(
        input.tagName === 'SELECT'
          ? window.HTMLSelectElement.prototype
          : window.HTMLInputElement.prototype,
        'value',
      )!.set!.call(input, value);
      input.dispatchEvent(
        new window.Event(input.tagName === 'SELECT' ? 'change' : 'input', {
          bubbles: true,
        }) as unknown as Event,
      );
    });
  };
  try {
    await settle(() => root.render(createElement(BrowserRouter, null, createElement(App))));
    assert.equal(container.querySelector('.market-banner'), null);
    assert.equal(container.querySelector('.market-message-count'), null);
    assert.equal(container.querySelector('.figma-listing-meta span')?.textContent, '1 view');
    assert.ok(container.querySelector('.figma-listing-meta svg.lucide-eye'));
    assert.equal(container.querySelector('.buyer-condition')?.textContent, 'New');
    assert.equal(container.querySelector('.buyer-listing-seller strong')?.textContent, 'Maya Chen');
    const avatar = container.querySelector('.seller-avatar img')!;
    assert.equal(avatar.getAttribute('src'), '/api/photos/seller-avatar');
    await settle(() => avatar.dispatchEvent(new window.Event('error') as unknown as Event));
    assert.equal(container.querySelector('.seller-avatar')?.textContent, 'MC');
    assert.equal(container.querySelector('.figma-listing-tabs'), null);
    assert.match(
      container.querySelector('.recommendation-heading')?.textContent || '',
      /Furniture/,
    );
    assert.equal(container.querySelectorAll('.recommendation-page .figma-listing-card').length, 4);
    assert.match(
      container.querySelector('.recommendation-page')?.textContent || '',
      /Recommendation 1/,
    );
    await settle(() =>
      (container.querySelector('button[aria-label="Next recommendations"]') as HTMLElement).click(),
    );
    assert.equal(container.querySelectorAll('.recommendation-page .figma-listing-card').length, 2);
    assert.match(
      container.querySelector('.recommendation-page')?.textContent || '',
      /Recommendation 5/,
    );
    assert.ok(requests.some((r) => r.includes('scope=others')));
    assert.equal(geoCalls, 0);
    const nav = container.querySelector('a[title="Discover"]')!;
    assert.equal(nav.getAttribute('href'), '/discover');
    assert.match(nav.className, /active/);
    assert.equal(
      container.querySelector('a[title="Overview"]')!.getAttribute('aria-current'),
      null,
    );
    await settle(() => (container.querySelector('.buyer-filter-toggle') as HTMLElement).click());
    await change('.buyer-filter-fields select', 'Furniture');
    await change('input[aria-label="Minimum price"]', '20');
    await change('input[aria-label="Maximum price"]', '30');
    const form = container.querySelector('form.buyer-filters')!;
    await settle(() =>
      form.dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }) as unknown as Event,
      ),
    );
    assert.ok(
      requests.some(
        (r) => r.includes('category=Furniture') && r.includes('min=20') && r.includes('max=30'),
      ),
    );
    await settle(() => (container.querySelector('.buyer-filter-toggle') as HTMLElement).click());
    const locate = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Use my location'),
    )!;
    await settle(() => locate.click());
    assert.equal(geoCalls, 1);
    await settle(() => geoSuccess({ coords: { latitude: 43.78456, longitude: -79.18564 } }));
    assert.ok(
      requests.some(
        (r) => r.includes('sort=closest') && r.includes('lat=43.78') && r.includes('lng=-79.19'),
      ),
    );
    const reset = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Reset')!;
    await settle(() => reset.click());
    assert.ok(requests.at(-1)?.includes('sort=newest'));
    assert.ok(!requests.at(-1)?.includes('lat='));
    await settle(() => locate.click());
    await settle(() => geoFailure({ code: 1 }));
    assert.match(container.textContent!, /couldn’t access your location/);
    assert.equal(
      (container.querySelector('select option[value="closest"]') as HTMLOptionElement).disabled,
      true,
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
