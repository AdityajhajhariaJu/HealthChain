import { Network } from '@capacitor/network';
import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let offline = !navigator.onLine;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const updateStatus = (connected: boolean) => {
      if (!isMounted) return;
      const reconnected = connected && offline;
      offline = !connected;
      setIsOffline(offline);
      if (!connected) {
        clearTimeout(reconnectTimer);
        setJustReconnected(false);
      } else if (reconnected) {
        setJustReconnected(true);
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          if (isMounted) setJustReconnected(false);
        }, 3000);
      }
    };

    // Check initial network status
    Network.getStatus()
      .then((status) => {
        updateStatus(status.connected);
      })
      .catch(() => {
        updateStatus(navigator.onLine);
      });

    const handleConnected = () => {
      updateStatus(true);
    };

    const handleDisconnected = () => {
      updateStatus(false);
    };

    // Native Capacitor Network listener
    const networkListenerPromise = Network.addListener('networkStatusChange', (status) => {
      if (!isMounted) return;
      if (status.connected) {
        handleConnected();
      } else {
        handleDisconnected();
      }
    }).catch(() => null);

    // Browser fallbacks
    window.addEventListener('online', handleConnected);
    window.addEventListener('offline', handleDisconnected);

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      networkListenerPromise.then((handle) => handle?.remove?.()).catch(() => {});
      window.removeEventListener('online', handleConnected);
      window.removeEventListener('offline', handleDisconnected);
    };
  }, []);

  return (
    <>
      {(isOffline || justReconnected) && (
        <div
          className="hc-banner-enter"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 'calc(16px + env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: isOffline ? 'rgba(30, 41, 59, 0.85)' : 'rgba(16, 185, 129, 0.9)',
            color: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 999999,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: isOffline
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          {isOffline ? (
            <>
              <WifiOff size={14} className="opacity-70" />
              <span>Offline • Saving locally to auto-sync later</span>
            </>
          ) : (
            <>
              <Wifi size={14} />
              <span>Connection restored • Syncing resumes</span>
            </>
          )}
        </div>
      )}
    </>
  );
}
