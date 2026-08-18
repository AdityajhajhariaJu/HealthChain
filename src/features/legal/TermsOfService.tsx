import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', padding: '24px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '12px 0',
            marginBottom: '24px'
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            color: 'var(--text-primary)',
            lineHeight: '1.6'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(20, 184, 166, 0.1)', borderRadius: '16px', color: 'var(--primary-color)' }}>
              <FileText size={32} />
            </div>
            <h1 style={{ fontSize: '32px', margin: 0 }}>Terms of Service</h1>
          </div>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Last Updated: August 2026</p>

          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            By accessing and using HealthChain, you agree to be bound by these Terms of Service. If you do not agree to all of the terms and conditions, you must not use our service.
          </p>

          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>2. Medical Disclaimer (CRITICAL)</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', borderRadius: '4px' }}>
            <strong>HealthChain is an AI-powered health-information and appointment-preparation tool, not a doctor.</strong> Its outputs organize patient-reported information, record highlights, questions, and possibilities for discussion. They are not diagnoses, prescriptions, referrals, treatment plans, or a substitute for professional medical advice. Always seek the advice of your physician or other qualified health provider with questions about a medical condition. <strong>In a medical emergency, call emergency services immediately.</strong>
          </p>

          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>3. User Responsibilities</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            You are responsible for the accuracy of the health data you input into the system. Our AI models rely on the information you provide; inaccurate information may lead to irrelevant or incorrect assessments.
          </p>

          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>4. Limitation of Liability</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            HealthChain and its creators shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to, or use of, the service. This includes any actions taken based on the information provided by our AI systems.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
