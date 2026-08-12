import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { completeProfileOnboarding } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

const splitList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default function ProfileOnboarding({ onComplete }: { onComplete?: () => void }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const account = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('hc_account') || '{}');
    } catch {
      return {};
    }
  }, []);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: account.name || '',
    age: '',
    gender: '',
    bloodGroup: '',
    height: '',
    weight: '',
    emergencyContact: '',
    conditions: '',
    allergies: '',
    medications: '',
    familyHistory: '',
    healthFocus: '',
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const canContinue = step === 0 ? Boolean(form.name.trim() && form.age) : true;
  const finish = () => {
    completeProfileOnboarding({
      demographics: {
        name: form.name.trim(),
        age: form.age,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        height: form.height,
        weight: form.weight,
      },
      allergies: splitList(form.allergies),
      conditions: splitList(form.conditions),
      medications: splitList(form.medications),
      familyHistory: splitList(form.familyHistory),
      healthFocus: form.healthFocus,
    });
    if (onComplete) onComplete();
    else navigate('/app/today');
  };
  const field = (label: string, key: string, options: { placeholder?: string, type?: string } = {}) => (
    <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 750, color: '#334155' }}>
      {label}
      <input
        value={form[key]}
        onChange={(event) => update(key, event.target.value)}
        placeholder={options.placeholder || ''}
        type={options.type || 'text'}
        style={inputStyle}
      />
    </label>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top right, #CCFBF1 0, #F8FAFC 36%, #EEF2FF 100%)',
        padding: isMobile ? '20px 15px' : '32px 20px',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#0F172A',
            fontWeight: 850,
            marginBottom: 28,
          }}
        >
          <Activity size={23} color="#10B981" /> HealthChain
        </div>
        <main
          style={{
            background: 'rgba(255,255,255,.92)',
            border: '1px solid rgba(255,255,255,.8)',
            borderRadius: 28,
            boxShadow: '0 24px 65px rgba(15,23,42,.10)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: isMobile ? '25px 25px 0' : '30px 40px 0',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  color: '#10B981',
                  fontSize: 12,
                  fontWeight: 850,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Personal health setup
              </div>
              <h1 style={{ margin: 0, color: '#0F172A', fontSize: isMobile ? 24 : 30, letterSpacing: '-.7px' }}>
                Make HealthChain yours from day one.
              </h1>
              <p style={{ color: '#64748B', margin: '9px 0 0', lineHeight: 1.55 }}>
                This creates your Medical Profile and gives every case, report, and HealthChain
                conversation the right context.
              </p>
            </div>
            <div
              style={{
                padding: '10px 13px',
                height: 'fit-content',
                borderRadius: 99,
                background: '#ECFDF5',
                color: '#047857',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Premium
              personal record
            </div>
          </div>
          <div
              style={{
                margin: isMobile ? '25px 25px 0' : '28px 40px 0',
                display: isMobile ? 'flex' : 'grid',
                flexDirection: isMobile ? 'column' : 'unset',
                gridTemplateColumns: isMobile ? 'unset' : 'repeat(3,1fr)',
                gap: 8,
              }}
          >
            {['About you', 'Medical snapshot', 'Your focus'].map((label, index) => (
              <div
                key={label}
                style={{
                  padding: '11px 12px',
                  borderRadius: 12,
                  background: index === step ? '#0F172A' : index < step ? '#ECFDF5' : '#F1F5F9',
                  color: index === step ? '#FFF' : index < step ? '#047857' : '#94A3B8',
                  fontSize: 13,
                  fontWeight: 800,
                  textAlign: 'center',
                }}
              >
                {index < step ? (
                  <Check size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                ) : null}
                {label}
              </div>
            ))}
          </div>
          <section style={{ padding: isMobile ? '25px' : '34px 40px 40px' }}>
            {step === 0 && <StepAbout form={form} field={field} update={update} isMobile={isMobile} />}{' '}
            {step === 1 && <StepHealth form={form} update={update} isMobile={isMobile} />}{' '}
            {step === 2 && <StepFocus form={form} update={update} />}
            <div
              style={{
                marginTop: 20,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <button
                onClick={() => (step ? setStep(step - 1) : navigate('/signup'))}
                style={{ ...secondaryButton, visibility: step || true ? 'visible' : 'hidden' }}
              >
                <ArrowLeft size={16} />
                {step ? 'Back' : 'Back to sign up'}
              </button>
              <button
                onClick={() => (step === 2 ? finish() : setStep(step + 1))}
                disabled={!canContinue}
                style={{
                  ...primaryButton,
                  opacity: canContinue ? 1 : 0.45,
                  cursor: canContinue ? 'pointer' : 'not-allowed',
                }}
              >
                {step === 2 ? 'Create my HealthChain profile' : 'Continue'} <ArrowRight size={17} />
              </button>
            </div>
            <p
              style={{
                color: '#94A3B8',
                fontSize: 12,
                lineHeight: 1.5,
                margin: '18px 0 0',
                textAlign: 'center',
              }}
            >
              Only the details you add are used to personalise your health record. You can edit or
              complete anything later.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

function StepAbout({ form, field, update, isMobile }: any) {
  return (
    <>
      <div style={titleStyle}>
        <HeartPulse size={22} color="#10B981" />
        <div>
          <h2>Start with the essentials</h2>
          <p>These details make your Medical Profile immediately useful in every case.</p>
        </div>
      </div>
        <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '1.2fr .5fr .7fr', gap: 16 }}>
        {field('Name *', 'name', { placeholder: 'Your full name' })}
        {field('Age *', 'age', { type: 'number', placeholder: 'e.g. 28' })}
        <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 750, color: '#334155' }}>
          Gender
          <select
            value={form.gender}
            onChange={(event) => update('gender', event.target.value)}
            style={inputStyle}
          >
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
            <option>Other</option>
          </select>
        </label>
      </div>
        <div
          style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : 'repeat(3,1fr)', gap: 16, marginTop: 16 }}
        >
        {field('Blood group', 'bloodGroup', { placeholder: 'e.g. O+' })}
        {field('Height', 'height', { placeholder: 'e.g. 170 cm' })}
        {field('Weight', 'weight', { placeholder: 'e.g. 65 kg' })}
      </div>
      <div style={{ marginTop: 16 }}>
        {field('Emergency contact (optional)', 'emergencyContact', {
          placeholder: 'Name and phone number',
        })}
      </div>
    </>
  );
}
function StepHealth({ form, update }: any) {
  return (
    <>
      <div style={titleStyle}>
        <ClipboardList size={22} color="#10B981" />
        <div>
          <h2>Build your medical snapshot</h2>
          <p>
            What you add here will appear in your Medical Profile and guide future case reviews.
          </p>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 17 }}>
        <TextAreaField
          label="Known conditions or past clinical assessments"
          fieldKey="conditions"
          form={form}
          update={update}
          placeholder="e.g. migraine, thyroid condition, asthma"
        />
        <TextAreaField
          label="Current regular medicines"
          fieldKey="medications"
          form={form}
          update={update}
          placeholder="e.g. metformin 500 mg, vitamin D"
        />
        <TextAreaField
          label="Allergies or serious reactions"
          fieldKey="allergies"
          form={form}
          update={update}
          placeholder="e.g. penicillin, peanuts, contrast dye"
        />
        <TextAreaField
          label="Relevant family history"
          fieldKey="familyHistory"
          form={form}
          update={update}
          placeholder="e.g. diabetes in father, heart disease in mother"
        />
      </div>
      <p style={{ margin: '15px 0 0', color: '#64748B', fontSize: 12 }}>
        Use commas to separate items. Leave anything unknown or not relevant blank.
      </p>
    </>
  );
}
function StepFocus({ form, update }: any) {
  return (
    <>
      <div style={titleStyle}>
        <ShieldCheck size={22} color="#10B981" />
        <div>
          <h2>What would you like HealthChain to help you organise?</h2>
          <p>
            This is not a definitive clinical assessment. It helps us make your first Health Today experience and case
            suggestions relevant.
          </p>
        </div>
      </div>
      <TextAreaField
        label="Your current health focus (optional)"
        fieldKey="healthFocus"
        form={form}
        update={update}
        placeholder="e.g. recurring headaches despite normal tests; managing PCOS; understanding recent blood work"
      />
      <div
        style={{
          marginTop: 22,
          padding: 18,
          borderRadius: 16,
          background: '#F0FDFA',
          border: '1px solid #CCFBF1',
          color: '#115E59',
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        <strong>What happens next:</strong>
        <br />
        Your Medical Profile is created first. From there, you can start Multiple-Specialists, add a
        report, or talk to Ava Health Buddy while everything stays connected.
      </div>
    </>
  );
}
function TextAreaField({ label, fieldKey, form, update, placeholder }: any) {
  return (
    <label style={{ display: 'grid', gap: 7, fontSize: 13, fontWeight: 750, color: '#334155' }}>
      {label}
      <textarea
        value={form[fieldKey] || ''}
        onChange={(event) => update(fieldKey, event.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, minHeight: 74, resize: 'vertical', fontFamily: 'inherit' }}
      />
    </label>
  );
}
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #D9E2EC',
  borderRadius: 11,
  padding: '12px 13px',
  background: '#FFF',
  color: '#0F172A',
  fontSize: 14,
  outline: 'none',
} as any;
const titleStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 25 };
const primaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  borderRadius: 12,
  padding: '13px 18px',
  background: 'linear-gradient(135deg,#059669,#047857)',
  color: '#FFF',
  fontWeight: 800,
  fontSize: 14,
};
const secondaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'transparent',
  color: '#64748B',
  fontWeight: 750,
  cursor: 'pointer',
  padding: 10,
};
