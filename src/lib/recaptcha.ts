type Grecaptcha = {
  render: (container: HTMLElement, params: Record<string, any>) => number;
  execute: (widgetId: number) => void;
  reset: (widgetId: number) => void;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

let scriptPromise: Promise<void> | null = null;
const widgetByContainer = new WeakMap<HTMLElement, number>();
const pendingByWidget = new Map<number, Promise<string>>();
const resolverByWidget = new Map<number, (token: string) => void>();
const rejecterByWidget = new Map<number, (err: Error) => void>();

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('reCAPTCHA is only available in the browser'));
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-fursalink-recaptcha="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA script')));
      return;
    }

    const s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.dataset.fursalinkRecaptcha = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
    document.head.appendChild(s);
  });

  return scriptPromise;
}

function getOrCreateWidget(container: HTMLElement, siteKey: string) {
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) throw new Error('reCAPTCHA is not available');

  const existing = widgetByContainer.get(container);
  if (typeof existing === 'number') return existing;

  let widgetId = -1;
  widgetId = grecaptcha.render(container, {
    sitekey: siteKey,
    size: 'invisible',
    callback: (token: string) => {
      const resolve = resolverByWidget.get(widgetId);
      if (resolve) resolve(token);
    },
    'error-callback': () => {
      const reject = rejecterByWidget.get(widgetId);
      if (reject) reject(new Error('reCAPTCHA failed. Please try again.'));
    },
    'expired-callback': () => {
      const reject = rejecterByWidget.get(widgetId);
      if (reject) reject(new Error('reCAPTCHA expired. Please try again.'));
    },
  });

  widgetByContainer.set(container, widgetId);
  return widgetId;
}

export async function getRecaptchaTokenV2Invisible(input: { container: HTMLElement; siteKey: string; timeoutMs?: number }) {
  const timeoutMs = typeof input.timeoutMs === 'number' ? input.timeoutMs : 12000;
  if (!input.siteKey) throw new Error('reCAPTCHA site key is missing');
  await loadScript();
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) throw new Error('reCAPTCHA is not available');

  const widgetId = getOrCreateWidget(input.container, input.siteKey);
  const existingPending = pendingByWidget.get(widgetId);
  if (existingPending) return existingPending;

  const p = new Promise<string>((resolve, reject) => {
    const t = window.setTimeout(() => {
      cleanup();
      reject(new Error('reCAPTCHA timed out. Please try again.'));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(t);
      resolverByWidget.delete(widgetId);
      rejecterByWidget.delete(widgetId);
      pendingByWidget.delete(widgetId);
      try {
        grecaptcha.reset(widgetId);
      } catch {
        // ignore
      }
    };

    resolverByWidget.set(widgetId, (token: string) => {
      cleanup();
      resolve(token);
    });
    rejecterByWidget.set(widgetId, (err: Error) => {
      cleanup();
      reject(err);
    });

    try {
      grecaptcha.execute(widgetId);
    } catch (e: any) {
      cleanup();
      reject(new Error(e?.message || 'reCAPTCHA failed to execute'));
    }
  });

  pendingByWidget.set(widgetId, p);
  return p;
}

