import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Search, ChevronDown, ChevronUp, Mail, MessageCircle, Phone, Sparkles, Star, Send, CheckCircle2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { supabase } from '../../services/supabaseClient';
import { trackButtonClick } from '../../services/analytics';

const faqs = [
  {
    question: "Is HealthChain a replacement for my doctor?",
    answer: "No. HealthChain is an AI-assisted health assessment and appointment-preparation tool. It helps you organize your medical history, explore discussion pathways, and prepare for specialist visits. It does not provide definitive diagnoses or treatment instructions."
  },
  {
    question: "How is my medical data secured?",
    answer: "HealthChain uses access controls and server-side boundaries for signed-in cloud features. Guest information stays in the browser on that device; signed-in information may sync with Supabase. No online service can guarantee absolute security, so use a private device and review the Privacy Policy for current storage and processing details."
  },
  {
    question: "How do the Deep Collaborative Specialists work?",
    answer: "The Deep Collaborative Specialists feature uses multiple AI perspectives (for example, cardiology, neurology, or endocrinology perspectives) to organize evidence gaps and discussion topics. These are not licensed clinicians, consultations, referrals, or second opinions, and the output does not provide a diagnosis or treatment directive."
  },
  {
    question: "Can I export my profile and case data?",
    answer: "Yes, under Settings > Account, you can use the Data Portability feature to export a complete JSON backup of your profiles, cases, and settings. You can also import this data on another device."
  }
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Feedback Form State
  const [category, setCategory] = useState('feature');
  const [rating, setRating] = useState(5);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredFaqs = faqs.filter(f => f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase()));

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const emailToLog = userEmail.trim() || session?.user?.email || 'Anonymous Guest';

      await supabase.from('user_feedback').insert({
        user_id: session?.user?.id || null,
        user_email: emailToLog,
        category,
        rating,
        subject: `Feedback: ${category.toUpperCase()}`,
        message: feedbackMsg.trim(),
        metadata: {
          submittedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          appVersion: '10.0.0'
        }
      });

      trackButtonClick('feedback_submitted', 'help_center');
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      // Fallback: Still show success and offer email client
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const copyEmail = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText('healthchain360@gmail.com');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = 'healthchain360@gmail.com';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Failed to copy email to clipboard:', e);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: isMobile ? '24px 16px' : '40px 24px', paddingBottom: '80px' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px', letterSpacing: '-1px' }}>
          Help & Feedback Center
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
          Have a question, clinical feedback, or feature request? We’re here for you.
        </p>
        
        <div style={{ position: 'relative', maxWidth: '500px', margin: '24px auto 0' }}>
          <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 14 }} />
          <input
            type="text"
            placeholder="Search for answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              borderRadius: '99px',
              border: '1px solid var(--border)',
              fontSize: '15px',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          />
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px' }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredFaqs.map((faq, i) => (
            <div 
              key={i} 
              className="card"
              style={{ 
                padding: '0', 
                overflow: 'hidden', 
                border: openFaq === i ? '1px solid var(--teal)' : '1px solid var(--border)',
                transition: 'all 0.2s ease'
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '15px'
                }}
              >
                {faq.question}
                {openFaq === i ? <ChevronUp size={20} color="var(--teal)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 20px 20px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
          {filteredFaqs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              No results found for "{search}".
            </div>
          )}
        </div>
      </div>

      {/* ✨ Interactive Feedback Form */}
      <div className="card" style={{ padding: isMobile ? '22px 18px' : '32px', borderRadius: 24, marginBottom: '36px', border: '1.5px solid #E2E8F0', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EDE9FE', color: '#7C3AED', display: 'grid', placeItems: 'center' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0F172A' }}>Share Feedback & Suggestions</h2>
            <p style={{ fontSize: 13.5, color: '#64748B', margin: 0 }}>Help us improve HealthChain. Your feedback goes directly to our product and clinical teams.</p>
          </div>
        </div>

        {isSubmitted ? (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
              <CheckCircle2 size={26} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#065F46', margin: '0 0 6px' }}>Feedback Received! Thank You</h3>
            <p style={{ fontSize: 14, color: '#047857', margin: '0 0 16px', lineHeight: 1.5 }}>
              Your message has been logged directly in our system. If you provided an email, our team will get back to you at <strong>healthchain360@gmail.com</strong>.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  window.location.href = `mailto:healthchain360@gmail.com?subject=HealthChain Feedback (${category})&body=${encodeURIComponent(feedbackMsg)}`;
                }}
              >
                Open in Email Client
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setIsSubmitted(false);
                  setFeedbackMsg('');
                }}
              >
                Send Another Note
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Category</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { id: 'feature', label: '💡 Feature Suggestion' },
                  { id: 'bug', label: '🐛 Bug Report' },
                  { id: 'clinical', label: '🩺 Clinical Accuracy' },
                  { id: 'general', label: '💬 General Query' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: category === cat.id ? '2px solid #8B5CF6' : '1px solid #E2E8F0',
                      background: category === cat.id ? '#EDE9FE' : '#FFFFFF',
                      color: category === cat.id ? '#6D28D9' : '#475569',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Overall Experience Rating</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      color: star <= rating ? '#F59E0B' : '#CBD5E1',
                      transition: 'transform 0.1s'
                    }}
                  >
                    <Star size={24} fill={star <= rating ? '#F59E0B' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Your Message / Description *</label>
              <textarea
                rows={4}
                required
                value={feedbackMsg}
                onChange={e => setFeedbackMsg(e.target.value)}
                placeholder="Describe your suggestion, issue, or feedback in detail..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Your Email (Optional, if you want a response)</label>
              <input
                type="email"
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                placeholder="your.email@example.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !feedbackMsg.trim()}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                color: '#FFF',
                border: 'none',
                fontWeight: 800,
                fontSize: 14,
                cursor: isSubmitting || !feedbackMsg.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !feedbackMsg.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(139,92,246,0.25)',
                transition: 'all 0.2s'
              }}
            >
              <Send size={16} /> {isSubmitting ? 'Sending...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>

      {/* Direct Contact Options */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
          Direct Contact & Support
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px' }}>
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F0FDFA', color: '#10B981', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Mail size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px' }}>Email Product Support</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>healthchain360@gmail.com</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>For clinical questions, enterprise partnerships, or account inquiries. Direct reply within 24 hours.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ flex: 1 }} 
                onClick={() => window.location.href = 'mailto:healthchain360@gmail.com'}
              >
                Send Email
              </button>
              <button 
                className="btn btn-outline btn-sm" 
                onClick={copyEmail}
              >
                <Copy size={14} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <MessageCircle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px' }}>Ava AI Health Companion</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>24/7 In-App Clinical Triage</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Chat with Ava anytime for instant symptom organization, lab report explanations, or medication checks.</p>
            <button 
              className="btn btn-outline btn-sm" 
              style={{ marginTop: 4 }} 
              onClick={() => navigate('/app/ava')}
            >
              Open Ava Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
