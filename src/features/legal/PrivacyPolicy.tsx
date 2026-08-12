import React from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
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
              <Shield size={32} />
            </div>
            <h1 style={{ fontSize: '32px', margin: 0 }}>Privacy Policy</h1>
          </div>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Last Updated: August 2026</p>

          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>1. Introduction</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Welcome to HealthChain. We respect your privacy and are committed to protecting your personal health data. This Privacy Policy outlines how we collect, use, and safeguard your information.
          </p>

          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>2. Data Collection</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            We collect information you provide directly to us, including:
            <ul style={{ paddingLeft: '24px', marginTop: '8px' }}>
              <li>Account information (email, password)</li>
              <li>Medical profile data (demographics, conditions, medications, allergies)</li>
              <li>Clinical case history and interactions with our AI systems</li>
              <li>Uploaded medical records and lab reports</li>
            </ul>
          </p>

          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>3. How We Use Your Data</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Your data is used strictly for providing our clinical AI services. We do not sell your personal health information to third parties. Our AI models process your data to generate differential diagnoses, treatment plans, and medical insights.
          </p>

          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>4. Data Security & Storage</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            All medical data is encrypted in transit and at rest using industry-standard protocols. Your data is securely stored in our cloud infrastructure powered by Supabase. If you use Guest Mode, your data remains locally on your device unless you choose to create an account.
          </p>
          
          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>5. Your Rights</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            You have the right to access, export, or permanently delete your medical data at any time. You can request complete account deletion from the Settings menu.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
