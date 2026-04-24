export {};

declare global {
  interface Window {
    FursaLink?: {
      onUpdateStatus?: (cb: (payload: { status: 'available' | 'none' | 'downloaded' }) => void) => () => void;
    };
  }
}

