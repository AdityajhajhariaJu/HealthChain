import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Apple, Utensils, Target, CheckCircle2, ChevronRight, ArrowRight } from 'lucide-react';
import { GOALS, ACTIVITY_LEVELS, RESTRICTIONS, MEDICAL_CONDITIONS, CUISINES, MEAL_SCHEDULES } from './Dietician';


export function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    weight: '',
    targetWeight: '',
    targetDays: '',
    height: '',
    age: '',
    gender: 'male',
    goal: 'Lose weight',
    activityLevel: 'moderate',
    restrictions: [] as string[],
    medicalConditions: [] as string[],
    cuisine: '',
    mealSchedule: '',
  } as any);

  const next = () => setStep((s) => s + 1);

  return (
    <div
      style={{
        paddingBottom: '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '32px',
          padding: '48px',
          maxWidth: '540px',
          width: '100%',
          boxShadow: '0 24px 48px rgba(0,0,0,0.04)',
          border: '1px solid #F1F5F9',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Progress Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: '#F1F5F9',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(step / 8) * 100}%`,
              background: 'linear-gradient(90deg, #10B981, #34D399)',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '40px',
            color: '#10B981',
            fontWeight: 800,
            fontSize: '18px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Apple size={20} />
          </div>
          Dietician Setup
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '8px',
                letterSpacing: '-0.5px',
              }}
            >
              Let's set your baseline.
            </h2>
            <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '32px' }}>
              We need a few details to calculate your metabolic targets accurately.
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '8px',
                  }}
                >
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={data.weight}
                  onChange={(e) => setData({ ...data, weight: e.target.value })}
                  placeholder="e.g. 75"
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    background: '#F8FAFC',
                    fontSize: '16px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '8px',
                  }}
                >
                  Target (kg)
                </label>
                <input
                  type="number"
                  value={data.targetWeight}
                  onChange={(e) => setData({ ...data, targetWeight: e.target.value })}
                  placeholder="e.g. 70"
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    background: '#F8FAFC',
                    fontSize: '16px',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '8px',
                  }}
                >
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={data.height}
                  onChange={(e) => setData({ ...data, height: e.target.value })}
                  placeholder="e.g. 175"
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    background: '#F8FAFC',
                    fontSize: '16px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '8px',
                  }}
                >
                  Age
                </label>
                <input
                  type="number"
                  value={data.age}
                  onChange={(e) => setData({ ...data, age: e.target.value })}
                  placeholder="e.g. 30"
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    background: '#F8FAFC',
                    fontSize: '16px',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: '8px',
                }}
              >
                Timeframe to reach target (Days)
              </label>
              <input
                type="number"
                value={data.targetDays}
                onChange={(e) => setData({ ...data, targetDays: e.target.value })}
                placeholder="e.g. 90"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  outline: 'none',
                  background: '#F8FAFC',
                  fontSize: '16px',
                }}
              />
            </div>

            <button
              onClick={next}
              disabled={
                [data.weight, data.targetWeight, data.height, data.age, data.targetDays].some(v => v === '' || v == null)
              }
              style={{
                width: '100%',
                padding: '18px',
                background: '#10B981',
                color: '#FFF',
                border: 'none',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '16px',
                cursor:
                  !data.weight ||
                  !data.targetWeight ||
                  !data.height ||
                  !data.age ||
                  !data.targetDays
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  !data.weight ||
                  !data.targetWeight ||
                  !data.height ||
                  !data.age ||
                  !data.targetDays
                    ? 0.5
                    : 1,
                transition: 'all 0.2s',
              }}
            >
              Continue
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '32px',
                letterSpacing: '-0.5px',
              }}
            >
              What's your primary goal?
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '40px',
              }}
            >
              {GOALS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => {
                    setData({ ...data, goal });
                    setTimeout(next, 150);
                  }}
                  style={{
                    padding: '24px',
                    borderRadius: '20px',
                    border: `2px solid ${data.goal === goal ? '#10B981' : '#F1F5F9'}`,
                    background: data.goal === goal ? '#ECFDF5' : '#F8FAFC',
                    color: data.goal === goal ? '#059669' : '#334155',
                    fontWeight: 800,
                    fontSize: '18px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {goal}
                  {data.goal === goal && <CheckCircle2 size={24} color="#10B981" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '32px',
                letterSpacing: '-0.5px',
              }}
            >
              How active are you?
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '40px',
              }}
            >
              {ACTIVITY_LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => {
                    setData({ ...data, activityLevel: level.id });
                    setTimeout(next, 150);
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '20px',
                    border: `2px solid ${data.activityLevel === level.id ? '#10B981' : '#F1F5F9'}`,
                    background: data.activityLevel === level.id ? '#ECFDF5' : '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '16px',
                      color: data.activityLevel === level.id ? '#059669' : '#1E293B',
                      marginBottom: '6px',
                    }}
                  >
                    {level.label}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: data.activityLevel === level.id ? '#10B981' : '#64748B',
                      lineHeight: 1.4,
                    }}
                  >
                    {level.desc}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '32px',
                letterSpacing: '-0.5px',
              }}
            >
              Any dietary restrictions?
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '40px' }}>
              {RESTRICTIONS.map((r) => {
                const isSelected = data.restrictions.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() => {
                      if (r === 'None') {
                        setData({ ...data, restrictions: ['None'] });
                        setTimeout(next, 150);
                      } else {
                        const newRest = isSelected
                          ? data.restrictions.filter((x) => x !== r)
                          : [...data.restrictions.filter((x) => x !== 'None'), r];
                        setData({ ...data, restrictions: newRest });
                      }
                    }}
                    style={{
                      padding: '16px 24px',
                      borderRadius: '99px',
                      border: `2px solid ${isSelected ? '#10B981' : '#F1F5F9'}`,
                      background: isSelected ? '#10B981' : '#F8FAFC',
                      color: isSelected ? '#FFF' : '#475569',
                      fontWeight: 700,
                      fontSize: '15px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            {!data.restrictions.includes('None') && data.restrictions.length > 0 && (
              <button
                onClick={() => next()}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: '#0F172A',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Continue <ArrowRight size={18} />
              </button>
            )}
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '32px',
                letterSpacing: '-0.5px',
              }}
            >
              Any medical conditions?
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '40px' }}>
              {MEDICAL_CONDITIONS.map((c) => {
                const isSelected = data.medicalConditions.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => {
                      if (c === 'None') {
                        setData({ ...data, medicalConditions: ['None'] });
                        setTimeout(next, 150);
                      } else {
                        const newCond = isSelected
                          ? data.medicalConditions.filter((x) => x !== c)
                          : [...data.medicalConditions.filter((x) => x !== 'None'), c];
                        setData({ ...data, medicalConditions: newCond });
                      }
                    }}
                    style={{
                      padding: '16px 24px',
                      borderRadius: '99px',
                      border: `2px solid ${isSelected ? '#3B82F6' : '#F1F5F9'}`,
                      background: isSelected ? '#3B82F6' : '#F8FAFC',
                      color: isSelected ? '#FFF' : '#475569',
                      fontWeight: 700,
                      fontSize: '15px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {!data.medicalConditions.includes('None') && data.medicalConditions.length > 0 && (
              <button
                onClick={() => next()}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: '#0F172A',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Continue <ArrowRight size={18} />
              </button>
            )}
          </motion.div>
        )}

        {step === 6 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '32px',
                letterSpacing: '-0.5px',
              }}
            >
              Preferred Cuisine?
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '40px' }}>
              {CUISINES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setData({ ...data, cuisine: c });
                    setTimeout(next, 150);
                  }}
                  style={{
                    padding: '16px 24px',
                    borderRadius: '99px',
                    border: `2px solid ${data.cuisine === c ? '#F59E0B' : '#F1F5F9'}`,
                    background: data.cuisine === c ? '#F59E0B' : '#F8FAFC',
                    color: data.cuisine === c ? '#FFF' : '#475569',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 7 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '32px',
                letterSpacing: '-0.5px',
              }}
            >
              Meal Schedule?
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '40px',
              }}
            >
              {MEAL_SCHEDULES.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setData({ ...data, mealSchedule: m });
                    setTimeout(next, 150);
                  }}
                  style={{
                    padding: '24px',
                    borderRadius: '20px',
                    border: `2px solid ${data.mealSchedule === m ? '#6366F1' : '#F1F5F9'}`,
                    background: data.mealSchedule === m ? '#EEF2FF' : '#F8FAFC',
                    color: data.mealSchedule === m ? '#4F46E5' : '#334155',
                    fontWeight: 800,
                    fontSize: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {m}
                  {data.mealSchedule === m && <CheckCircle2 size={24} color="#6366F1" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 8 && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            style={{ textAlign: 'center' }}
          >
            <div
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #34D399)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 32px auto',
                boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 size={48} />
            </div>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '16px',
                letterSpacing: '-1px',
              }}
            >
              Profile Complete!
            </h2>
            <p
              style={{ fontSize: '16px', color: '#64748B', marginBottom: '40px', lineHeight: 1.6 }}
            >
              We've computed your clinical targets based on the Mifflin-St Jeor equation. Your
              personalized AI dashboard is ready.
            </p>
            <button
              onClick={() => onComplete(data)}
              style={{
                width: '100%',
                padding: '20px',
                background: '#0F172A',
                color: '#FFF',
                border: 'none',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '18px',
                cursor: 'pointer',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              Go to Dashboard
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
