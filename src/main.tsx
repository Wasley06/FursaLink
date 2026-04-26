import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const url = `/sw.js?v=${encodeURIComponent(__APP_VERSION__)}&b=${encodeURIComponent(__BUILD_ID__)}`;
    navigator.serviceWorker.register(url).catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
