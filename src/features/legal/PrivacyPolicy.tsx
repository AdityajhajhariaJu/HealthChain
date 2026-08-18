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
            HealthChain helps you organize health information and prepare questions for a qualified clinician. We respect the sensitivity of that information and explain below what the app stores, where it may be processed, and the choices available to you. This policy describes the product as it works today; it is not a claim of certification or a substitute for local legal notices.
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
            We use your information to provide the features you choose: account access, case organization, record summaries, AI-assisted health assessment, support, payments, and product security. We do not sell personal health information. HealthChain does not provide diagnoses, prescriptions, or treatment plans; AI output is intended to support preparation and discussion with a qualified clinician.
          </p>

          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>4. Data Security & Storage</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            <strong>Guest mode:</strong> case information is stored in your browser on the device you use. Anyone who can access that browser profile may be able to access it, and clearing browser data can remove it.<br /><br />
            <strong>Signed-in use:</strong> the application may sync account and case information with Supabase to provide account features. Requests to our web application are served through Vercel. When you choose an AI feature, the information required for that request is sent through our server-side AI proxy to Google Gemini. These providers may process data in locations outside your country, subject to their applicable terms and safeguards.
          </p>
          
          <h2 style={{ fontSize: '20px', marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>5. Your Rights & Data Deletion</h2>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            You can export the HealthChain case and profile information stored in this browser from Settings. You can request deletion of a signed-in account from Settings. Browser-stored guest data can also be removed by clearing HealthChain site data or using the app's deletion controls. Do not use a shared device if you want to keep health information private.
          </p>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            <strong>Deletion and retention:</strong> after a successful account-deletion request, HealthChain instructs its application database to delete the account-associated profiles and cases. A limited record may remain where required for payment, fraud prevention, security, or legal obligations. Copies held in service-provider backups may persist for their normal backup cycle. We will update this policy as retention periods and service configuration are finalized.
          </p>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            <strong>Important:</strong> HealthChain is a consumer health-information product, not an emergency service. If you have severe, sudden, or worsening symptoms, contact local emergency services or a qualified clinician immediately. AI outputs can be incomplete or incorrect and should be reviewed with a clinician before acting on them.
          </p>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            <strong>Account Deletion Policy:</strong> When you delete your account, we perform a "Hard Deletion." Your clinical cases, profiles, and associated medical data are permanently wiped from our databases. Your authentication identity (email and password) is instantly scrambled and anonymized, freeing up your original email address for reuse.
          </p>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            <strong>Payment Records:</strong> To comply with tax laws and financial accounting standards, your historical payment transactions are not deleted. However, because your personal profile and email are permanently anonymized during deletion, these orphaned payment receipts can no longer be tied back to your true identity.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
