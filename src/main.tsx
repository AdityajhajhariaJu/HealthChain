import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { syncStorageFromPreferences } from './services/storage';

const updateSW = registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
});

const queryClient = new QueryClient();

// Initialize X-Ray Dark Mode if selected
if (localStorage.getItem('hc_theme') === 'dark') {
  document.documentElement.classList.add('dark-theme');
}

// Initialize Capacitor storage sync before rendering
syncStorageFromPreferences().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
});
