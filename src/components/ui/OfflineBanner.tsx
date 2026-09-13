import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network } from '@capacitor/network';
import { flushSyncOutbox } from '../../services/SyncOutbox';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check initial network status
    Network.getStatus().then(status => {
      if (isMounted) setIsOffline(!status.connected);
    }).catch(() => {
      if (isMounted) setIsOffline(!navigator.onLine);
    });

    const handleConnected = () => {
      setIsOffline(false);
      setJustReconnected(true);
      flushSyncOutbox().catch(() => {});
      setTimeout(() => {
        if (isMounted) setJustReconnected(false);
      }, 3000);
    };

    const handleDisconnected = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    // Native Capacitor Network listener
    const networkListenerPromise = Network.addListener('networkStatusChange', status => {
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
      networkListenerPromise.then(handle => handle?.remove?.()).catch(() => {});
      window.removeEventListener('online', handleConnected);
      window.removeEventListener('offline', handleDisconnected);
    };
  }, []);

  return (
    <AnimatePresence>
      {(isOffline || justReconnected) && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
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
            border: isOffline ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            maxWidth: '90vw',
            textAlign: 'center'
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
              <span>Connection restored • Synced ✓</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
