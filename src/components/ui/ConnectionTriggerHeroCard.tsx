import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { triggerHapticLight, triggerHapticSelection } from '../../services/haptics';
import {
  getConnectionDetectiveReport,
  getFunctionalBiomarkers,
  FunctionalBiomarker,
} from '../../services/ConnectionDetectiveEngine';
import { getSuspectFoodsLeaderboard } from '../../services/TriggerEngine';
import { getProfile } from '../../services/ProfileEngine';

interface ConnectionTriggerHeroCardProps {
  onInvestigate: (tab?: string) => void;
}

export const ConnectionTriggerHeroCard: React.FC<ConnectionTriggerHeroCardProps> = ({ onInvestigate }) => {
  const [report, setReport] = useState(() => getConnectionDetectiveReport());
  const [biomarkers, setBiomarkers] = useState<FunctionalBiomarker[]>(() => getFunctionalBiomarkers());
  const [suspectFoods, setSuspectFoods] = useState(() => getSuspectFoodsLeaderboard());
  const [profile, setProfile] = useState(() => getProfile());

  useEffect(() => {
    const handleUpdate = () => {
      setReport(getConnectionDetectiveReport());
      setBiomarkers(getFunctionalBiomarkers());
      setSuspectFoods(getSuspectFoodsLeaderboard());
      setProfile(getProfile());
    };

    window.addEventListener('hc_biomarkers_updated', handleUpdate);
    window.addEventListener('hc_triggers_updated', handleUpdate);
    window.addEventListener('hc_cases_updated', handleUpdate);
    window.addEventListener('hc_profile_updated', handleUpdate);

    return () => {
      window.removeEventListener('hc_biomarkers_updated', handleUpdate);
      window.removeEventListener('hc_triggers_updated', handleUpdate);
      window.removeEventListener('hc_cases_updated', handleUpdate);
      window.removeEventListener('hc_profile_updated', handleUpdate);
    };
  }, []);

  // Compute dynamic counts & states
  const totalBiomarkersCount = profile?.biomarkers?.length || biomarkers.length;
  const flaggedBiomarkers = biomarkers.filter((b) => b.status !== 'optimal');

  // Top Flagged Lab (Priority to Ferritin if not optimal, or the most abnormal marker)
  const topFlaggedMarker =
    biomarkers.find((b) => b.id === 'ferritin' && b.status !== 'optimal') ||
    biomarkers.find((b) => b.status === 'critical_low' || b.status === 'critical_high') ||
    biomarkers.find((b) => b.status.startsWith('suboptimal')) ||
    biomarkers[0];

  const labDisplayName = topFlaggedMarker ? topFlaggedMarker.name.split('(')[0].trim() : 'Biomarker Status';
  const labDisplayVal = topFlaggedMarker ? `${topFlaggedMarker.userValue} ${topFlaggedMarker.userUnit}` : '--';
  const labStatusLabel =
    !topFlaggedMarker || topFlaggedMarker.status === 'optimal'
      ? 'Optimal longevity'
      : topFlaggedMarker.status === 'critical_low'
      ? 'Pathology deficit'
      : topFlaggedMarker.status === 'suboptimal_low'
      ? 'Suboptimal baseline'
      : topFlaggedMarker.status === 'critical_high'
      ? 'Pathology excess'
      : 'Subclinical surge';

  // Clinic Notes Conduit
  const topMiss = report.clinicalMisses?.[0];
  const notesTitle = topMiss?.overlookedBy ? `${topMiss.overlookedBy.split(' ')[0]} × Vagal` : 'Clinical Synthesis';
  const rawNotesSub = topMiss?.hiddenConnection ? topMiss.hiddenConnection.split('—')[0].trim() : 'Cross-discipline correlation';
  const notesSubtitle = rawNotesSub.toLowerCase().includes('without anemia')
    ? 'Iron deficiency w/o anemia'
    : rawNotesSub.length > 26
    ? `${rawNotesSub.slice(0, 24).trim()}...`
    : rawNotesSub;

  // Vitals Stream Conduit
  const vitalsStream = report.streams.find((s) => s.id === 'vitals');
  const vitalsItem =
    vitalsStream?.items?.find((it) => it.includes('Orthostatic Shift') || it.includes('bpm')) || null;
  const vitalsTitle = vitalsItem
    ? (vitalsItem.includes('Orthostatic Shift:')
      ? vitalsItem.split('(')[0].replace('Orthostatic Shift:', '').trim()
      : vitalsItem.split('(')[0].trim())
    : 'No orthostatic data';
  const vitalsSubtitle = vitalsItem ? 'Orthostatic surge' : 'Awaiting vitals log';

  // Diet Sensitivity Conduit
  const topFood = suspectFoods?.[0];
  const dietTitle = topFood ? `${topFood.name} (+${topFood.correlationPercent}%)` : 'No food triggers';
  const dietSubtitle = topFood?.primarySensitivity || 'Awaiting meal logs';

  // Narrative Synthesis
  const narrative = flaggedBiomarkers.length > 0
    ? `Cross-analyzing your blood labs, cardiology notes, orthostatic vitals, and dietary sensitivities uncovered ${
        topFlaggedMarker?.id === 'ferritin'
          ? 'subclinical ferritin depletion'
          : `${labDisplayName.toLowerCase()} imbalance`
      } impacting ${report.primaryHypothesis ? report.primaryHypothesis.toLowerCase() : 'autonomic equilibrium'}.`
    : 'Log vitals, meals, and symptoms to discover cross-system physiological connections.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDFA 55%, #E6FFFA 100%)',
        borderRadius: '24px',
        padding: '22px 20px',
        color: '#0F172A',
        border: '1.5px solid #99F6E4',
        boxShadow: '0 10px 30px rgba(13, 148, 136, 0.08), 0 2px 8px rgba(0, 0, 0, 0.02)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '20px',
      }}
    >
      {/* Top Badge Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: '999px',
              background: '#CCFBF1',
              border: '1px solid #5EEAD4',
              fontSize: '11px',
              fontWeight: 800,
              color: '#0F766E',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            CLINIC USP ENGINE
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
            4-Stream Multi-Specialist Convergence
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 6px #10B981',
            }}
          />
          <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 700 }}>
            {totalBiomarkersCount} Biomarkers Synced • {flaggedBiomarkers.length} Flags
          </span>
        </div>
      </div>

      {/* Headline */}
      <h3
        style={{
          fontSize: '20px',
          fontWeight: 800,
          margin: '0 0 8px 0',
          lineHeight: 1.25,
          letterSpacing: '-0.3px',
          color: '#0F172A',
        }}
      >
        Connection Detective:{' '}
        <span style={{ color: '#0D9488' }}>
          What 15-Minute Visits Missed
        </span>
      </h3>

      {/* Narrative */}
      <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.5, margin: '0 0 16px 0' }}>
        {narrative}
      </p>

      {/* Primary CTA Button */}
      <button
        type="button"
        onClick={() => {
          triggerHapticSelection();
          onInvestigate('map');
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '13px 18px',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
          color: '#FFFFFF',
          border: 'none',
          fontSize: '14px',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
          marginBottom: '16px',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
      >
        <Globe size={18} />
        <span>Investigate Connections</span>
      </button>

      {/* 4 Interactive Conduit Capsules (2x2 Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {/* Capsule 1: Labs Conduit */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticLight();
            onInvestigate('biomarkers');
          }}
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '16px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0D9488';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#0F766E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            <span>🧪</span> LABS CONDUIT
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {labDisplayName} {labDisplayVal}
          </div>
          <span style={{ fontSize: '11px', color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, display: 'inline-block', border: '1px solid #FDE68A' }}>
            {labStatusLabel}
          </span>
        </div>

        {/* Capsule 2: Clinic Notes */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticLight();
            onInvestigate('misses');
          }}
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '16px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0D9488';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#0F766E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            <span>🩺</span> CLINIC NOTES
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {notesTitle}
          </div>
          <span style={{ fontSize: '11px', color: '#0F766E', background: '#CCFBF1', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, display: 'inline-block', border: '1px solid #99F6E4' }}>
            {notesSubtitle}
          </span>
        </div>

        {/* Capsule 3: Vitals Stream */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticLight();
            onInvestigate('cascade');
          }}
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '16px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0D9488';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#E11D48', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            <span>💓</span> VITALS STREAM
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {vitalsTitle}
          </div>
          <span style={{ fontSize: '11px', color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, display: 'inline-block', border: '1px solid #FDE68A' }}>
            {vitalsSubtitle}
          </span>
        </div>

        {/* Capsule 4: Diet Sensitivity */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticLight();
            onInvestigate('matcher');
          }}
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: '16px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#0D9488';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 148, 136, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#0F766E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            <span>🍎</span> DIET SENSITIVITY
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {dietTitle}
          </div>
          <span style={{ fontSize: '11px', color: '#B91C1C', background: '#FEE2E2', padding: '2px 8px', borderRadius: '999px', fontWeight: 700, display: 'inline-block', border: '1px solid #FECACA' }}>
            {dietSubtitle}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
