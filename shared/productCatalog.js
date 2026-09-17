// Single application catalog for checkout validation and customer-facing plan
// quantities. Database provisioning mirrors these values and is contract-tested.
export const PRODUCT_CATALOG = Object.freeze({
  pro_30_days: {
    amount: 49900, currency: 'INR', description: 'Pro Access (30 Days)', type: 'subscription', days: 30,
    quotas: { quick_consult: 3, deep_collab: 2, jarvis: 1, ava_replies: 30, pharmacy_hub: 60, lab_report: 10 },
  },
  pro_90_days: {
    amount: 89900, currency: 'INR', description: 'Pro Access (90 Days)', type: 'subscription', days: 90,
    quotas: { quick_consult: 10, deep_collab: 8, jarvis: 5, ava_replies: 120, pharmacy_hub: 120, lab_report: 30 },
  },
  topup_ava: { amount: 9900, currency: 'INR', description: 'Ava Health Buddy Top-up', type: 'topup', feature: 'ava_replies', quantity: 10 },
  topup_quick_consult: { amount: 12900, currency: 'INR', description: 'Quick Consult Top-up', type: 'topup', feature: 'quick_consult', quantity: 1 },
  topup_deep_collab: { amount: 14900, currency: 'INR', description: 'Clinical Perspectives Top-up', type: 'topup', feature: 'deep_collab', quantity: 1 },
  topup_jarvis: { amount: 16900, currency: 'INR', description: 'Clinical Review Top-up', type: 'topup', feature: 'jarvis', quantity: 1 },
  topup_pharmacy_hub: { amount: 9900, currency: 'INR', description: 'Pharmacy Hub Top-up', type: 'topup', feature: 'pharmacy_hub', quantity: 30 },
  topup_lab_report: { amount: 9900, currency: 'INR', description: 'Lab Report Analyzer Top-up', type: 'topup', feature: 'lab_report', quantity: 2 },
});
