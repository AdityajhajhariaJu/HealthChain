import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import FallbackError from './components/ui/FallbackError';
import { ToastProvider } from './components/ui/ToastProvider';
import './index.css';
import { AnalyticsProvider } from './services/AnalyticsProvider';
import { syncStorageFromPreferences } from './services/storage';

const queryClient = new QueryClient();

// Initialize Capacitor storage sync before rendering
syncStorageFromPreferences()
  .catch(() => {})
  .then(() => {
    // Native preferences must be restored before applying the saved theme.
    try {
      document.documentElement.classList.toggle(
        'dark-theme',
        localStorage.getItem('hc_theme') === 'dark'
      );
    } catch {
      console.warn('localStorage access blocked');
    }
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ErrorBoundary
              FallbackComponent={FallbackError}
              onReset={() => window.location.reload()}
            >
              <AnalyticsProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </AnalyticsProvider>
            </ErrorBoundary>
          </BrowserRouter>
        </QueryClientProvider>
      </React.StrictMode>
    );

    // Remove splash screen once app is mounted
    const splash = document.getElementById('hc-splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 500);
    }
  });
