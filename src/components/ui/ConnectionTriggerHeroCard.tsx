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
  const totalBiomarkersCount = Math.max(profile?.biomarkers?.length || 48, biomarkers.length);
  const flaggedBiomarkers = biomarkers.filter((b) => b.status !== 'optimal');

  // Top Flagged Lab (Priority to Ferritin if not optimal, or the most abnormal marker)
  const topFlaggedMarker =
    biomarkers.find((b) => b.id === 'ferritin' && b.status !== 'optimal') ||
    biomarkers.find((b) => b.status === 'critical_low' || b.status === 'critical_high') ||
    biomarkers.find((b) => b.status.startsWith('suboptimal')) ||
    biomarkers[0];

  const labDisplayName = topFlaggedMarker ? topFlaggedMarker.name.split('(')[0].trim() : 'Ferritin';
  const labDisplayVal = topFlaggedMarker ? `${topFlaggedMarker.userValue} ${topFlaggedMarker.userUnit}` : '14 ng/mL';
  const labStatusLabel =
    !topFlaggedMarker || topFlaggedMarker.status === 'optimal'
      ? 'Optimal longevity'
      : topFlaggedMarker.status === 'critical_low'
      ? 'Pathology deficit'
      : topFlaggedMarker.status === 'suboptimal_low'
      ? 'Bone marrow gap'
      : topFlaggedMarker.status === 'critical_high'
      ? 'Pathology excess'
      : 'Subclinical surge';

  // Clinic Notes Conduit
  const topMiss = report.clinicalMisses?.[0];
  const notesTitle = topMiss?.overlookedBy ? `${topMiss.overlookedBy.split(' ')[0]} × Vagal` : 'Cardio × GI Vagal';
  const notesSubtitle = topMiss?.hiddenConnection
    ? topMiss.hiddenConnection.split('—')[0].trim().substring(0, 22)
    : 'Roemheld reflex';

  // Vitals Stream Conduit
  const vitalsStream = report.streams.find((s) => s.id === 'vitals');
  const vitalsItem =
    vitalsStream?.items?.find((it) => it.includes('Orthostatic Shift') || it.includes('bpm')) || '+38 bpm Standing';
  const vitalsTitle = vitalsItem.includes('Orthostatic Shift:')
    ? vitalsItem.split('(')[0].replace('Orthostatic Shift:', '').trim()
    : vitalsItem.includes('+')
    ? vitalsItem.split('(')[0].trim()
    : '+38 bpm Standing';
  const vitalsSubtitle = 'Orthostatic surge';

  // Diet Sensitivity Conduit
  const topFood = suspectFoods?.[0];
  const dietTitle = topFood ? `${topFood.name} (+${topFood.correlationPercent}%)` : 'Histamine / Fructan';
  const dietSubtitle = topFood?.primarySensitivity || 'Mast cell flare';

  // Narrative Synthesis
  const narrative = `Cross-analyzing your blood labs, cardiology notes, orthostatic vitals, and dietary sensitivities uncovered root-cause ${
    topFlaggedMarker?.id === 'ferritin'
      ? 'subclinical ferritin depletion'
      : `${labDisplayName.toLowerCase()} imbalance`
  } mimicking ${report.primaryHypothesis ? report.primaryHypothesis.toLowerCase() : 'refractory dysautonomia'}.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'linear-gradient(145deg, #0B1329 0%, #111D3B 55%, #0F172A 100%)',
        borderRadius: '26px',
        padding: '22px 20px',
        color: '#FFFFFF',
        boxShadow: '0 16px 36px rgba(11, 19, 41, 0.45), 0 0 0 1px rgba(56, 189, 248, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '18px',
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, rgba(14, 165, 233, 0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

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
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              fontSize: '10.5px',
              fontWeight: 800,
              color: '#38BDF8',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            CLINIC USP ENGINE
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
            4-Stream Multi-Specialist Convergence
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 8px #10B981',
            }}
          />
          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
            {totalBiomarkersCount} Biomarkers Synced • {flaggedBiomarkers.length} Flags
          </span>
        </div>
      </div>

      {/* Headline */}
      <h3
        style={{
          fontSize: '21px',
          fontWeight: 800,
          margin: '0 0 8px 0',
          lineHeight: 1.25,
          letterSpacing: '-0.3px',
          color: '#FFFFFF',
        }}
      >
        Connection Detective:{' '}
        <span style={{ color: '#38BDF8', textShadow: '0 0 16px rgba(56, 189, 248, 0.4)' }}>
          What 15-Minute Visits Missed
        </span>
      </h3>

      {/* Narrative */}
      <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.45, margin: '0 0 18px 0' }}>
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
          background: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
          color: '#FFFFFF',
          border: 'none',
          fontSize: '14px',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(2, 132, 199, 0.38)',
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
            background: 'rgba(30, 41, 59, 0.75)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '16px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#38BDF8';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.4)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            <span>🧪</span> LABS CONDUIT
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {labDisplayName} {labDisplayVal}
          </div>
          <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700 }}>
            {labStatusLabel}
          </div>
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
            background: 'rgba(30, 41, 59, 0.75)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '16px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2DD4BF';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.4)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            <span>🩺</span> CLINIC NOTES
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {notesTitle}
          </div>
          <div style={{ fontSize: '11px', color: '#2DD4BF', fontWeight: 700 }}>
            {notesSubtitle}
          </div>
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
            background: 'rgba(30, 41, 59, 0.75)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '16px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#F59E0B';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.4)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            <span>💓</span> VITALS STREAM
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {vitalsTitle}
          </div>
          <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700 }}>
            {vitalsSubtitle}
          </div>
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
            background: 'rgba(30, 41, 59, 0.75)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '16px',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FB7185';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.4)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            <span>🍎</span> DIET SENSITIVITY
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {dietTitle}
          </div>
          <div style={{ fontSize: '11px', color: '#FB7185', fontWeight: 700 }}>
            {dietSubtitle}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
