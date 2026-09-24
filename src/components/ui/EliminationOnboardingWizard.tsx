import React, { useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, ClipboardList, ShieldAlert } from 'lucide-react';
import type { TrialIntakeAssessment } from '../../domain/trials/types';

export interface EliminationOnboardingWizardProps {
  onComplete: (protocolId: string, initialSeverity?: number | null, assessment?: TrialIntakeAssessment) => void;
  onBrowseCatalog?: () => void;
  onBrowseProtocols?: () => void;
  onProtocolSelect?: (protocolId: string) => void;
  onCancel?: () => void;
  onOpenGutHealth?: () => void;
  isRetake?: boolean;
  initialSymptoms?: string[];
}

const focusOptions = [
  { id: 'bloating', label: 'Bloating or abdominal discomfort' },
  { id: 'bowel', label: 'Bowel pattern changes' },
  { id: 'reflux', label: 'Heartburn or reflux' },
  { id: 'food', label: 'Symptoms I notice around meals' },
  { id: 'unsure', label: 'I am not sure yet' },
] as const;
const safetyOptions = [
  { id: 'weight_loss', label: 'Unintentional weight loss' },
  { id: 'bleeding', label: 'Blood in stool or unexplained bleeding' },
  { id: 'eating_disorder', label: 'A current or past eating disorder, or fear of eating' },
  { id: 'pregnancy', label: 'Pregnancy or breastfeeding' },
  { id: 'celiac', label: 'Celiac disease is possible and testing has not been completed' },
  { id: 'unsure', label: 'I am unsure about any of these' },
] as const;
const card: React.CSSProperties = { border: '1px solid #F0DFD8', borderRadius: 18, padding: 18, background: 'linear-gradient(150deg,#FFFCFA,#FFF3EF)', color: '#42332F' };
const button: React.CSSProperties = { minHeight: 46, borderRadius: 12, padding: '10px 16px', border: '1px solid #D8A999', background: '#9B675B', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' };

/** Starts with observation. Restrictive protocol selection awaits reviewed eligibility and content. */
export const EliminationOnboardingWizard: React.FC<EliminationOnboardingWizardProps> = ({ onCancel, onOpenGutHealth, onBrowseProtocols, onBrowseCatalog, initialSymptoms = [] }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [focus, setFocus] = useState<string>(() => focusOptions.find((option) => initialSymptoms.includes(option.id))?.id || '');
  const [safety, setSafety] = useState<string[]>([]);
  const [safetyAnswered, setSafetyAnswered] = useState(false);
  const selectedSafety = safety.length > 0;
  const toggleSafety = (id: string) => {
    setSafetyAnswered(true);
    setSafety((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return <div style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(14px,3vw,26px)', display: 'grid', gap: 16, color: '#42332F' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 30% 25%,#FFF,#F7DED4 72%,#ECC3B4)', color: '#9B675B', boxShadow: 'inset 0 1px 2px #FFF,0 5px 14px #C18E7950' }}><Activity size={23} /></span><div><h2 className="serif-heading" style={{ margin: 0, fontSize: 23 }}>Find your starting point</h2><p style={{ margin: '3px 0 0', color: '#78655D', fontSize: 14 }}>A few answers help you choose what to record first.</p></div></div>
    <p style={{ margin: 0, color: '#78655D', fontSize: 13 }}>Step {step} of 3</p>
    {step === 1 && <section style={card}><h3 style={{ marginTop: 0 }}>What would you like to understand?</h3><p style={{ color: '#78655D', lineHeight: 1.5 }}>Choose one. You can change your mind later.</p><div style={{ display: 'grid', gap: 8 }}>{focusOptions.map((option) => <button type="button" key={option.id} aria-pressed={focus === option.id} onClick={() => setFocus(option.id)} style={{ ...button, background: focus === option.id ? '#F7DED4' : '#FFFDFC', color: '#42332F', borderColor: focus === option.id ? '#D8A999' : '#E7D7D0', textAlign: 'left' }}>{option.label}</button>)}</div></section>}
    {step === 2 && <section style={card}><h3 style={{ marginTop: 0 }}>Before changing your diet</h3><p style={{ color: '#78655D', lineHeight: 1.5 }}>Do any of these apply? You can still record symptoms and meals. These answers do not diagnose anything.</p><div style={{ display: 'grid', gap: 9 }}>{safetyOptions.map((option) => <label key={option.id} style={{ display: 'flex', alignItems: 'center', gap: 11, minHeight: 43, cursor: 'pointer' }}><input type="checkbox" checked={safety.includes(option.id)} onChange={() => toggleSafety(option.id)} style={{ width: 18, height: 18 }} />{option.label}</label>)}<label style={{ display: 'flex', alignItems: 'center', gap: 11, minHeight: 43, cursor: 'pointer' }}><input type="checkbox" checked={safetyAnswered && safety.length === 0} onChange={() => { setSafety([]); setSafetyAnswered(true); }} style={{ width: 18, height: 18 }} />None of these apply</label></div></section>}
    {step === 3 && <section style={card}>{selectedSafety ? <><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><ShieldAlert size={22} color="#9B675B" /><h3 style={{ margin: 0 }}>Get the right help first</h3></div><p style={{ color: '#604D45', lineHeight: 1.55 }}>Discuss these symptoms or circumstances with a qualified clinician before starting a restrictive diet. If celiac disease is possible, ask about testing before removing gluten.</p></> : <><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><ClipboardList size={22} color="#9B675B" /><h3 style={{ margin: 0 }}>Start with a clear record</h3></div><p style={{ color: '#604D45', lineHeight: 1.55 }}>Record a meal or one digestion observation when it matters to you. Your history and visit notes can help you discuss a next step. An unreviewed questionnaire cannot choose a safe elimination diet for you.</p></>}{focus === 'unsure' && <p style={{ color: '#604D45', lineHeight: 1.5 }}>It is fine to be unsure. You can begin without guessing a food cause.</p>}</section>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
      <button type="button" onClick={step === 1 ? onCancel : () => setStep(step === 3 ? 2 : 1)} style={{ ...button, background: '#FFFDFC', color: '#604D45', borderColor: '#E7D7D0' }}><ArrowLeft size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />{step === 1 ? 'Close' : 'Back'}</button>
      {step === 1 && <button type="button" disabled={!focus} onClick={() => setStep(2)} style={{ ...button, opacity: focus ? 1 : .5 }}>Continue <ArrowRight size={15} style={{ verticalAlign: 'middle', marginLeft: 5 }} /></button>}
      {step === 2 && <button type="button" disabled={!safetyAnswered} onClick={() => setStep(3)} style={{ ...button, opacity: safetyAnswered ? 1 : .5 }}>See my next step <ArrowRight size={15} style={{ verticalAlign: 'middle', marginLeft: 5 }} /></button>}
      {step === 3 && <button type="button" onClick={onOpenGutHealth || onCancel} style={button}>Open Gut Health <ArrowRight size={15} style={{ verticalAlign: 'middle', marginLeft: 5 }} /></button>}
    </div>
    {(onBrowseProtocols || onBrowseCatalog) && <button type="button" onClick={onBrowseProtocols || onBrowseCatalog} style={{ ...button, background: 'transparent', color: '#78655D', border: 0, textDecoration: 'underline', justifySelf: 'start', paddingLeft: 0 }}>Browse plan information</button>}
  </div>;
};

export default EliminationOnboardingWizard;
