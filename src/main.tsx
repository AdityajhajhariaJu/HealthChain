import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { syncStorageFromPreferences } from './services/storage';
import { ToastProvider } from './components/ui/ToastProvider';
import { ErrorBoundary } from 'react-error-boundary';
import FallbackError from './components/ui/FallbackError';
import { AnalyticsProvider } from './services/AnalyticsProvider';

const queryClient = new QueryClient();

// Initialize X-Ray Dark Mode if selected
try {
  if (localStorage.getItem('hc_theme') === 'dark') {
    document.documentElement.classList.add('dark-theme');
  }
} catch (e) {
  console.warn('localStorage access blocked');
}

// Initialize Capacitor storage sync before rendering
syncStorageFromPreferences().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ErrorBoundary FallbackComponent={FallbackError} onReset={() => window.location.reload()}>
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
