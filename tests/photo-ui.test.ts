import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
const window = new Window({ url: 'http://localhost:5173' });
for (const [key, value] of Object.entries({
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  IS_REACT_ACT_ENVIRONMENT: true,
}))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createElement, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: PhotoDraft } = await import('../src/components/create-item-wizard/PhotoDraft.js');
const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
  window.happyDOM.abort();
});
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};
function button(container: HTMLElement, text: string) {
  const found = [...container.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(text),
  );
  assert.ok(found, `Button: ${text}`);
  return found;
}
async function click(element: any) {
  await act(async () => {
    element.click();
    await flush();
  });
}
async function input(element: any, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    await flush();
  });
}
async function selectPhoto(container: HTMLElement) {
  const element = container.querySelector('input[aria-label="Upload one item photo"]')!;
  Object.defineProperty(element, 'files', {
    configurable: true,
    value: [new File(['fixture'], 'lamp.png', { type: 'image/png' })],
  });
  await act(async () => {
    element.dispatchEvent(new window.Event('change', { bubbles: true }) as unknown as Event);
    await flush();
  });
}
test('starter flow requires review, preserves unchecked fields, and applies just one photo', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const applied: any[] = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/capabilities')) return Response.json({ aiAvailable: false });
    if (String(url).endsWith('/photos')) return Response.json({ id: 'single-photo' });
    const body = JSON.parse(String(options!.body));
    assert.equal(body.mode, 'guided');
    assert.equal(body.name, 'Desk lamp');
    return Response.json({
      draft: {
        mode: 'guided',
        title: 'Desk lamp',
        description: 'Desk lamp available for a new owner.',
        category: null,
        observations: [],
        questions: ['Does it work?'],
      },
    });
  };
  try {
    await act(async () => {
      root.render(
        createElement(PhotoDraft, {
          onApply: (v) => applied.push(v),
          hasDetails: true,
          photoCount: 0,
        }),
      );
      await flush();
    });
    assert.match(container.textContent!, /Photo AI not connected/);
    await selectPhoto(container);
    assert.ok(button(container, 'Create starter draft').disabled);
    const name = container.querySelector('input[placeholder="e.g. adjustable desk lamp"]')!;
    await input(name, 'Desk lamp');
    await click(button(container, 'Create starter draft'));
    assert.equal(applied.length, 0);
    assert.ok(button(container, 'Use selected details').disabled);
    const titleCheckbox = [...container.querySelectorAll('label')]
      .find((l) => l.textContent?.includes('Use this title'))!
      .querySelector('input')!;
    await click(titleCheckbox);
    const consent = container.querySelector('.draft-consent input')!;
    await click(consent);
    await click(button(container, 'Use selected details'));
    assert.equal(applied.length, 1);
    assert.equal(applied[0].photoId, 'single-photo');
    assert.equal(applied[0].title, undefined);
    assert.match(applied[0].description, /Desk lamp/);
    for (const key of ['price', 'floor', 'condition', 'facts', 'status'])
      assert.equal(applied[0][key], undefined);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
test('camera tracks stop when the seller closes the camera', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let stopped = 0;
  const media = new window.MediaStream();
  Object.defineProperty(media, 'getTracks', {
    value: () => [
      {
        stop: () => {
          stopped++;
        },
      },
    ],
  });
  Object.defineProperty(window.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: async () => media,
    },
  });
  window.HTMLVideoElement.prototype.play = async () => {};
  globalThis.fetch = async () => Response.json({ aiAvailable: false });
  try {
    await act(async () => {
      root.render(
        createElement(PhotoDraft, { onApply: () => {}, hasDetails: false, photoCount: 0 }),
      );
      await flush();
    });
    await click(button(container, 'Take a photo'));
    assert.ok(container.querySelector('video'));
    await click(container.querySelector('button[aria-label="Close camera"]'));
    assert.equal(stopped, 1);
    assert.equal(container.querySelector('video'), null);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
