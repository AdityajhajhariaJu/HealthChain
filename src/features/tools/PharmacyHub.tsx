import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusCircle,
  Camera,
  Pill,
  AlertTriangle,
  ShieldCheck,
  Repeat2,
  BookmarkPlus,
  AlertOctagon,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { fetchMedicineData, checkDrugInteractions } from '../../services/geminiService';
import { addMedication, getProfile } from '../../services/ProfileEngine';
import { getActiveCase, addCaseEvent } from '../../services/CaseEngine';
import { recordHealthMemory } from '../../services/HealthMemory';
import { Sunrise, Sun, Moon, CheckCircle } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getActiveSession } from '../../services/authSession';
import { trackFeatureUsed } from '../../services/analytics';

let cachedPharmacyState: any = null;

export default function PharmacyHub() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const initialQuery = location.state?.searchQuery || cachedPharmacyState?.query || '';

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(cachedPharmacyState?.loading || false);
  const [result, setResult] = useState(cachedPharmacyState?.result || null);
  const [searched, setSearched] = useState(cachedPharmacyState?.searched || false);
  const [showToast, setShowToast] = useState(false);
  const [activeInteractions, setActiveInteractions] = useState<any[]>([]);
  const [isCheckingInteraction, setIsCheckingInteraction] = useState(false);

  useEffect(() => {
    if (location.state?.searchQuery && !searched) {
      handleSearch(new Event('submit'));
    }
  }, [location.state]);

  useEffect(() => {
    return () => {
      cachedPharmacyState = { query, loading: false, result, searched };
    };
  }, [query, loading, result, searched]);

  const handleSearch = async (e?: any) => {
    e?.preventDefault?.();
    if (!(await getActiveSession())) {
      const currentCount = parseInt(localStorage.getItem('hc_guest_pharmacy_count') || '0', 10) || 0;
      if (currentCount >= 5) {
        window.dispatchEvent(new CustomEvent('hc_require_auth', { 
          detail: { 
            title: 'Guest Limit Reached', 
            message: 'You have reached the guest limit of 5 medication searches. Please log in or sign up to access more.' 
          } 
        }));
        return;
      }
      try { localStorage.setItem('hc_guest_pharmacy_count', (currentCount + 1).toString()); } catch(e) {}
    }
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setResult(null);

    const profile = getProfile();
    const data = await fetchMedicineData(query.trim(), profile);

    if (data) {
      setResult(data);
      trackFeatureUsed('pharmacy_drug_searched', { drug: query.trim(), found: true });
      recordHealthMemory({ kind: 'pharmacy', source: 'pharmacy_hub', title: `Medication information: ${data.name || query.trim()}`, occurredAt: new Date().toISOString(), payload: data, dedupeKey: `pharmacy:${query.trim().toLowerCase()}` });
    } else {
      trackFeatureUsed('pharmacy_drug_searched', { drug: query.trim(), found: false });
      setResult({
        name: query.toUpperCase(),
        class: 'Unknown / Error',
        uses: 'Could not fetch data from the AI network at this time.',
        sideEffects: 'Unknown.',
        alternatives: [],
        warnings: 'Please check your connection and try again.',
      });
    }

    setLoading(false);
  };

  const handleAddMedication = async (medicineName) => {
    setIsCheckingInteraction(true);
    const profile = getProfile();
    
    // Optimistically add medication to profile so offline/AI failures don't block core UX
    try {
      addMedication({ name: medicineName }, 'pharmacy_hub');
    } catch (e) {
      console.error('Failed to add medication locally:', e);
    }

    try {
      const interactionCheck = await checkDrugInteractions(medicineName, profile?.medications || []);
      trackFeatureUsed('pharmacy_interaction_checked', { drug: medicineName, hasInteraction: Boolean(interactionCheck?.hasInteraction) });
      
      const activeCase = getActiveCase();
      if (interactionCheck?.hasInteraction) {
        setActiveInteractions(prev => [...prev, interactionCheck]);
        if (activeCase) {
          addCaseEvent(
            activeCase.id,
            `Interaction identified for ${medicineName}: ${interactionCheck.description}`
          );
        }
      }
    } catch (e) {
      console.error('Failed to check interactions:', e);
      // We don't block the user, the medication is already added.
    } finally {
      setIsCheckingInteraction(false);
      setShowToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShowToast(false), 3000);
    }
  };

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const profile = getProfile();
  
  // Dynamically group medications into morning/afternoon/evening 
  // (In a real app, this would use the dosage schedule. Here we loosely group for UI demonstration)
  const dynamicRegimen = [
    { time: 'Morning', icon: Sunrise, color: '#F59E0B', meds: (profile?.medications || []).filter((_: any, i: number) => i % 3 === 0).map((m: any) => m?.name || (typeof m === 'string' ? m : '')).filter(Boolean) },
    { time: 'Afternoon', icon: Sun, color: '#3B82F6', meds: (profile?.medications || []).filter((_: any, i: number) => i % 3 === 1).map((m: any) => m?.name || (typeof m === 'string' ? m : '')).filter(Boolean) },
    { time: 'Evening', icon: Moon, color: '#8B5CF6', meds: (profile?.medications || []).filter((_: any, i: number) => i % 3 === 2).map((m: any) => m?.name || (typeof m === 'string' ? m : '')).filter(Boolean) },
  ].filter(group => group.meds.length > 0);

  return (
    <div style={{ padding: '0 0 40px 0', maxWidth: '1000px', margin: '0 auto', display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '1fr 350px', gap: '20px', position: 'relative' }}>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: '#10B981',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              zIndex: 100
            }}
          >
            <CheckCircle size={18} /> Medication Saved to Profile
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        {/* Main Search Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          padding: isMobile ? '16px' : '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid #F1F5F9',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              background: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}
          >
            <PlusCircle size={24} />
          </div>
          <div>
            <h1
              style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}
            >
              HealthChain Pharmacy Assistant
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              Sourcing clinical drug data from HealthChain Network
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                position: 'absolute',
                left: '16px',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#ECFDF5',
              }}
            >
              <Camera size={16} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicine (e.g., Metformin, PCM)..."
              style={{
                width: '100%',
                padding: '16px 16px 16px 60px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid #E2E8F0',
                background: '#FAFAFA',
                fontSize: '15px',
                outline: 'none',
                color: '#0F172A',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#10B981')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            style={{
              padding: '0 32px',
              borderRadius: 'var(--radius-lg)',
              background: '#059669', // Match the green from the screenshot
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              cursor: !query.trim() || loading ? 'not-allowed' : 'pointer',
              opacity: !query.trim() || loading ? 0.7 : 1,
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '120px',
              height: isMobile ? '48px' : 'auto',
            }}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#FFF',
                  borderRadius: '50%',
                }}
              />
            ) : (
              'Get Data'
            )}
          </button>
        </form>
      </motion.div>

      {/* Results Area */}
      <AnimatePresence mode="wait">
        {!loading && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {(() => {
              const displayData = result;
              return (
                <>
                  {/* Header Info */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 'var(--radius-lg)',
                      padding: isMobile ? '16px' : '24px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '20px',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B',
                        flexShrink: 0,
                      }}
                    >
                      <Pill size={24} />
                    </div>
                    <div>
                      <h2
                        style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: '#0F172A',
                          margin: '0 0 6px 0',
                        }}
                      >
                        {displayData.name}
                      </h2>
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: '#F1F5F9',
                          color: '#475569',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {displayData.class}
                      </div>
                    </div>
                    <div style={{ marginLeft: isMobile ? '0' : 'auto', display: 'flex', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                      <button
                        onClick={() => handleAddMedication(displayData.name)}
                        disabled={isCheckingInteraction}
                        style={{
                          background: '#10B981',
                          color: '#FFF',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        <BookmarkPlus size={16} /> Save to Profile
                      </button>
                    </div>
                  </div>

                  {/* Interactions Warning */}
                  {displayData.interactions && displayData.interactions.length > 0 && (
                    <div
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }}>
                        <AlertOctagon size={24} />
                      </div>
                      <div>
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#991B1B',
                            margin: '0 0 8px 0',
                          }}
                        >
                          Medication question to verify
                        </h3>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: '20px',
                            color: '#B91C1C',
                            fontSize: '14px',
                            lineHeight: 1.6,
                          }}
                        >
                          {displayData.interactions.map((warn, i) => (
                            <li key={i}>{warn}</li>
                          ))}
                        </ul>
                        <p style={{ margin: '10px 0 0', color: '#991B1B', fontSize: '12px', lineHeight: 1.5 }}>Do not start, stop, or change a medicine based on this screen. Confirm it with a pharmacist or prescriber.</p>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                    {/* Uses & Side Effects */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 'var(--radius-lg)',
                        padding: isMobile ? '16px' : '24px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#0F172A',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <ShieldCheck size={18} color="#10B981" /> Primary Uses
                      </h3>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#475569',
                          lineHeight: 1.6,
                          marginBottom: '24px',
                        }}
                      >
                        {displayData.uses}
                      </p>

                      <h3
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#0F172A',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <AlertTriangle size={18} color="#F59E0B" /> Side Effects
                      </h3>
                      <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                        {displayData.sideEffects}
                      </p>
                    </div>

                    {/* Alternatives & Warnings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 'var(--radius-lg)',
                          padding: isMobile ? '16px' : '24px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#0F172A',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <Repeat2 size={18} color="#3B82F6" /> Common Alternatives
                        </h3>
                        {displayData.alternatives.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {displayData.alternatives.map((alt) => (
                              <div
                                key={alt}
                                style={{
                                  padding: '6px 12px',
                                  background: '#EFF6FF',
                                  color: '#2563EB',
                                  borderRadius: '99px',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                }}
                              >
                                {alt}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
                            No known alternatives in database.
                          </p>
                        )}
                      </div>

                      <div
                        style={{
                          background: '#FEF2F2',
                          borderRadius: 'var(--radius-lg)',
                          padding: isMobile ? '16px' : '24px',
                          border: '1px solid #FCA5A5',
                        }}
                      >
                        <h3
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#991B1B',
                            marginBottom: '8px',
                          }}
                        >
                          Important Warnings
                        </h3>
                        <p
                          style={{ fontSize: '14px', color: '#B91C1C', lineHeight: 1.6, margin: 0 }}
                        >
                          {displayData.warnings}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Pill Organizer Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="card" style={{ padding: isMobile ? '16px' : '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pill size={20} color="var(--teal)" /> Daily Regimen
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>
            Active medications for the current case.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {dynamicRegimen.length === 0 && <p style={{fontSize: '14px', color: '#64748B'}}>No medications in profile.</p>}
            {dynamicRegimen.map((schedule, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <schedule.icon size={16} color={schedule.color} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{schedule.time}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '24px', borderLeft: '2px solid #F1F5F9' }}>
                  {schedule.meds.map((med, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', fontSize: '13px', color: '#475569', border: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                      {med}
                      {med.includes('Warfarin') || med.includes('Aspirin') ? (
                         <AlertTriangle size={14} color="#EF4444" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interaction Warnings */}
        {activeInteractions.length > 0 && (
          <div className="card" style={{ padding: isMobile ? '16px' : '24px', borderLeft: '4px solid #EF4444', background: '#FEF2F2' }}>
             <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
               <AlertOctagon size={18} /> Active Interactions
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {activeInteractions.map((interaction, i) => (
                 <p key={i} style={{ fontSize: '13px', color: '#B91C1C', margin: 0, lineHeight: 1.5 }}>
                   <strong>{interaction.severity} Risk:</strong> {interaction.description}
                 </p>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
