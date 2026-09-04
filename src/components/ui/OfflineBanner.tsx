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
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: isOffline ? '#EF4444' : '#10B981',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: 'calc(10px + env(safe-area-inset-top)) 16px 10px',
            fontSize: '13px',
            fontWeight: 650,
            zIndex: 999999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            letterSpacing: '0.2px'
          }}
        >
          {isOffline ? (
            <>
              <WifiOff size={16} />
              <span>Working offline — changes are saved locally & will sync when reconnected.</span>
            </>
          ) : (
            <>
              <Wifi size={16} />
              <span>Connection restored — local changes synced.</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
