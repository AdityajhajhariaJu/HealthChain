import React, { useState, useEffect } from 'react';
import { Activity, Apple, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';
import { LivingHeartIcon } from './LivingHeartIcon';
import { isHealthSupported, checkHealthPermissions, requestHealthPermissions, syncHealthData } from '../../services/HealthTrackingService';
import { useToast } from './ToastProvider';
import { triggerHapticLight, triggerHapticMedium } from '../../services/haptics';
import { getItemSync, setItemSync } from '../../services/storage';

export function HealthDeviceIntegrations() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => getItemSync('hc_last_health_sync'));
  const { toast, success, error } = useToast();

  useEffect(() => {
    isHealthSupported().then(supported => {
      setIsSupported(supported);
      if (supported) {
        checkHealthPermissions()
          .then(granted => setIsConnected(granted))
          .catch(() => setIsConnected(false));
      }
    }).catch(() => {
      setIsSupported(false);
    });

    const handleSyncComplete = (e: any) => {
      const time = new Date(e.detail.at).toLocaleTimeString();
      setLastSync(time);
      setItemSync('hc_last_health_sync', time);
    };

    window.addEventListener('hc_health_sync_complete', handleSyncComplete);
    return () => window.removeEventListener('hc_health_sync_complete', handleSyncComplete);
  }, []);

  if (!isSupported) return null;

  const handleConnect = async () => {
    triggerHapticMedium();
    const granted = await requestHealthPermissions();
    if (granted) {
      setIsConnected(true);
      success('Connected', 'HealthConnect / Apple Health authorized successfully.');
      handleSync(); // Auto sync on connect
    } else {
      error('Connection Failed', 'Could not access health data. Please check OS permissions.');
    }
  };

  const handleSync = async () => {
    triggerHapticLight();
    setIsSyncing(true);
    try {
      await syncHealthData(7); // Sync last 7 days
      success('Sync Complete', 'Latest health metrics have been securely pulled and synced to HealthChain.');
    } catch (err) {
      error('Sync Error', 'An error occurred while syncing your health data.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)', borderRadius: '20px',
      padding: '20px',
      marginBottom: '32px',}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#10B981', padding: '8px', borderRadius: '12px' }}>
          <Activity size={20} color="white" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Health Devices
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Apple Health & Google Health Connect
          </p>
        </div>
      </div>

      <div style={{ 
        background: 'white', 
        borderRadius: '16px', 
        padding: '16px',
        border: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#F8FAFC', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={20} color="#0F172A" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>Activity Sync</div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>Steps, Heart Rate, Sleep</div>
            </div>
          </div>
          
          {!isConnected ? (
            <button 
              onClick={handleConnect}
              style={{
                background: '#0F172A',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '99px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Connect
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontSize: '14px', fontWeight: 600, padding: '4px 12px', background: '#ECFDF5', borderRadius: '99px' }}>
              <LivingHeartIcon size={16} color="#10B981" /> Connected
            </div>
          )}
        </div>

        {isConnected && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: 0 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Last synced: {lastSync || 'Never'}
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                style={{
                  background: 'transparent',
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                  padding: '6px 16px',
                  borderRadius: '99px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isSyncing ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: isSyncing ? 0.7 : 1
                }}
              >
                <RefreshCw size={14} className={isSyncing ? 'spin-anim' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
              .spin-anim { animation: spin 1s linear infinite; }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}
