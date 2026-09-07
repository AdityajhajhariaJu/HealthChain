import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';
import { triggerHapticSelection, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { getEliminationProtocolState, saveEliminationProtocolState } from '../../services/ProfileEngine';
import { ProtocolId } from './EliminationProtocolSuite';

export interface JourneyGoalItem {
  id: ProtocolId;
  name: string;
  emoji: string;
  durationLabel: string;
  description: string;
  badgeBg: string;
  badgeColor: string;
}

export const JOURNEY_GOALS: JourneyGoalItem[] = [
  {
    id: 'bloating_hunt',
    name: 'Bloating Hunt',
    emoji: '🎈',
    durationLabel: '4 weeks',
    description: 'Systematic Monash Low-FODMAP washout of fermentable gas & SIBO triggers',
    badgeBg: '#F3E8FF',
    badgeColor: '#7E22CE',
  },
  {
    id: 'heartburn_hunt',
    name: 'Heartburn Hunt',
    emoji: '🔥',
    durationLabel: '4 weeks',
    description: 'Kaufman Acid Watcher protocol neutralizing nocturnal reflux & LES laxity',
    badgeBg: '#FFE4E6',
    badgeColor: '#E11D48',
  },
  {
    id: 'transit_hunt',
    name: 'Diarrhea / Constipation Hunt',
    emoji: '💩',
    durationLabel: '4 weeks',
    description: 'Soluble fiber & motility pacing normalizing stool transit to Bristol Type 4',
    badgeBg: '#F3E8FF',
    badgeColor: '#7E22CE',
  },
  {
    id: 'vagal_hunt',
    name: 'Stress + IBS Hunt',
    emoji: '😰',
    durationLabel: '4 weeks',
    description: 'Gut-brain axis restoration calming postprandial visceral hypersensitivity',
    badgeBg: '#F3E8FF',
    badgeColor: '#7E22CE',
  },
];

interface PersonalizedJourneyGoalSelectorProps {
  activeGoalId?: ProtocolId;
  onSelectGoal?: (goalId: ProtocolId) => void;
  showBackAction?: boolean;
  onBack?: () => void;
}

export const PersonalizedJourneyGoalSelector: React.FC<PersonalizedJourneyGoalSelectorProps> = ({
  activeGoalId,
  onSelectGoal,
  showBackAction,
  onBack,
}) => {
  const currentState = getEliminationProtocolState();
  const selectedId = activeGoalId || currentState?.activeProtocolId || 'bloating_hunt';

  const handleGoalClick = (goalId: ProtocolId) => {
    triggerHapticSelection();
    saveEliminationProtocolState(goalId, {
      startedAt: new Date().toISOString(),
    });
    awardPoints(15, '🎯 Set Digestive Symptom Hunt Goal', 'lifestyle', `goal_${goalId}`);
    triggerHapticSuccess();
    if (onSelectGoal) {
      onSelectGoal(goalId);
    }
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        padding: '18px 16px 20px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
        border: '1.5px solid #E2E8F0',
        maxWidth: '560px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
          Journey
        </h2>
        {showBackAction && onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        )}
      </div>

      {/* Purple Gradient Hero Banner (Matching media_1788703646266.png) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #3B1C5C 0%, #5B218E 50%, #722AA8 100%)',
          borderRadius: '20px',
          padding: '20px 20px 22px',
          color: '#FFFFFF',
          marginBottom: '16px',
          boxShadow: '0 8px 24px rgba(91, 33, 142, 0.28)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>🎯</span>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.2px' }}>
            We're here to help you
          </h3>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '13.5px',
            color: 'rgba(255, 255, 255, 0.92)',
            lineHeight: 1.45,
            fontWeight: 500,
          }}
        >
          Which bothers you the most? Pick a goal — we'll track it together.
        </p>
      </div>

      {/* 4 Interactive Goal Cards (Matching media_1788703646266.png) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {JOURNEY_GOALS.map((goal) => {
          const isSelected = selectedId === goal.id;

          return (
            <motion.button
              key={goal.id}
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={() => handleGoalClick(goal.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '18px',
                background: isSelected ? '#FAF5FF' : '#FFFFFF',
                border: isSelected ? '2px solid #A855F7' : '1.5px solid #F1F5F9',
                boxShadow: isSelected ? '0 4px 16px rgba(168, 85, 247, 0.14)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Icon Container */}
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#F3E8FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0,
                  }}
                >
                  {goal.emoji}
                </div>

                {/* Text Content */}
                <div>
                  <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                    {goal.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: goal.badgeColor,
                        background: goal.badgeBg,
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      {goal.durationLabel}
                    </span>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#059669',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Check size={12} /> Active Goal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chevron */}
              <div
                style={{
                  color: isSelected ? '#A855F7' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={20} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer Subtext (Matching media_1788703646266.png) */}
      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>
        You can switch anytime.
      </div>
    </div>
  );
};
