export {};

declare global {
  interface Window {
    FursaLink?: {
      appUrl?: string | null;
      onUpdateStatus?: (cb: (payload: { status: 'available' | 'none' | 'downloaded' }) => void) => () => void;
    };
  }
}
