import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Re-enable CSS transitions after the initial render + theme application.
// Double-rAF waits until after the first paint frame so the transition-less
// theme update is fully committed before smooth transitions kick back in.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('no-transition');
  });
});

// Catch unhandled promise rejections that escape React — prevents ErrorBoundary crash
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason);
  event.preventDefault(); // Prevent default browser error behavior
});

// Remove splash screen after first render with a smooth transition
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.4s ease-out';
      setTimeout(() => splash.remove(), 400);
    }
  }, 200);
});
