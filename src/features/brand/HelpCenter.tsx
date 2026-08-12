import { useState } from 'react';
import { ArrowLeft, Search, ChevronDown, ChevronUp, Mail, MessageCircle, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';

const faqs = [
  {
    question: "Is HealthChain a replacement for my doctor?",
    answer: "No. HealthChain is an AI-powered diagnostic navigator. It is designed to help you organize your medical history, explore potential diagnostic pathways, and prepare for specialist visits. It does not provide definitive medical diagnoses or treatments."
  },
  {
    question: "How is my medical data secured?",
    answer: "Your privacy is our top priority. HealthChain uses enterprise-grade encryption for all data at rest and in transit. By default, your data is stored locally in your browser unless you explicitly create an account for cloud sync."
  },
  {
    question: "How does the MDT Consensus Hub work?",
    answer: "The Multidisciplinary Team (MDT) Consensus Hub simulates a consultation between multiple AI specialist agents (e.g., Cardiology, Neurology, Endocrinology) who review your case, debate findings, and provide a unified recommendation report."
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

  const filteredFaqs = faqs.filter(f => f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '24px 16px' : '40px 24px', paddingBottom: '80px' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px', letterSpacing: '-1px' }}>
          Help Center
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
          How can we help you today?
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

      <div style={{ marginBottom: '24px' }}>
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

      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px' }}>
          Contact Support
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', display: 'grid', placeItems: 'center', marginBottom: '16px' }}>
              <MessageCircle size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Live Chat</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Available 9 AM - 5 PM EST</p>
            <button className="btn btn-outline" style={{ width: '100%' }}>Start Chat</button>
          </div>
          <div className="card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F0FDFA', color: '#10B981', display: 'grid', placeItems: 'center', marginBottom: '16px' }}>
              <Mail size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Email Us</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Typically replies in 2 hours</p>
            <button className="btn btn-outline" style={{ width: '100%' }}>Send Email</button>
          </div>
          <div className="card" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FFFBEB', color: '#D97706', display: 'grid', placeItems: 'center', marginBottom: '16px' }}>
              <Phone size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Call Us</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>For urgent clinical issues</p>
            <button className="btn btn-outline" style={{ width: '100%' }}>1-800-HLTH</button>
          </div>
        </div>
      </div>
    </div>
  );
}
