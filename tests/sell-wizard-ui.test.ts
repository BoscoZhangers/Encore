import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
const window = new Window({ url: 'http://localhost:5173/sell/example' });
for (const [key, value] of Object.entries({
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: (fn: () => void) => setTimeout(fn, 0),
}))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { Sell } = await import('../src/pages/Sell.js');
const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
  window.happyDOM.abort();
});

test('wizard preserves details across steps, validates prices, and can finish without Solana', async () => {
  const item = {
    id: 'example',
    title: 'Headphones',
    description: 'Working wireless headphones.',
    category: 'Electronics',
    condition: 'Good',
    quantity: 1,
    photos: ['photo'],
    price: 18000,
    floor: 15000,
    facts: [],
    area: 'Campus',
    pickup: 'Library evenings',
    latitude: null,
    longitude: null,
    contact: '',
    share_contact: false,
    wallet: '',
    sol_lamports: 0,
    status: 'draft',
  };
  let saved: any;
  let notice = '';
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/seller/listings')) return Response.json({ listings: [item] });
    if (String(url).endsWith('/capabilities')) return Response.json({ aiAvailable: false });
    if (options?.method === 'PATCH') {
      saved = JSON.parse(String(options.body));
      return Response.json({ listing: saved });
    }
    throw Error(`Unexpected request ${url}`);
  };
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const click = async (text: string) => {
    // Happy DOM uses floating-point remainder for step validity, so valid CAD
    // values such as 180 fail step="0.01". Ignore that emulator-only constraint.
    container.querySelectorAll('input[step="0.01"]').forEach((input) => {
      input.setAttribute('step', 'any');
    });
    const button = [...container.querySelectorAll('.wizard-actions button')].find(
      (b) => b.textContent?.trim() === text,
    ) as HTMLButtonElement;
    assert.ok(button, text);
    await act(async () => {
      button.click();
      await flush();
    });
  };
  const input = async (element: HTMLInputElement, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(
        element,
        value,
      );
      element.dispatchEvent(new window.Event('input', { bubbles: true }) as unknown as Event);
      await flush();
    });
  };
  try {
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/sell/example'] },
          createElement(
            Routes,
            null,
            createElement(Route, {
              path: '/sell/:id',
              element: createElement(Sell, {
                tell: (message: string) => {
                  notice = message;
                },
              }),
            }),
            createElement(Route, { path: '/selling', element: createElement('p', null, 'Saved') }),
          ),
        ),
      );
      await flush();
    });
    await click('Next');
    assert.match(container.querySelector('#wizard-title')!.textContent!, /Make it yours/);
    const title = container.querySelector('.wizard-fields input') as HTMLInputElement;
    await input(title, 'Updated headphones');
    const floor = container.querySelectorAll('.wizard-fields input')[3] as HTMLInputElement;
    await input(floor, '200');
    await click('Next');
    assert.match(notice, /cannot exceed/);
    await input(floor, '150');
    await click('Next');
    assert.match(container.querySelector('#wizard-title')!.textContent!, /Give Cora/);
    await click('Previous');
    assert.equal(
      (container.querySelector('.wizard-fields input') as HTMLInputElement).value,
      'Updated headphones',
    );
    await click('Next');
    assert.match(container.querySelector('#wizard-title')!.textContent!, /Give Cora/);
    await click('Next');
    await click('Next');
    assert.match(container.querySelector('#wizard-title')!.textContent!, /optional/);
    await click('Finish without Solana');
    assert.equal(saved.title, 'Updated headphones');
    assert.equal(saved.floor, 15000);
    assert.deepEqual(saved.photos, ['photo']);
    assert.equal(saved.wallet, '');
    assert.equal(saved.sol_lamports, 0);
    assert.match(container.textContent!, /Saved/);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
